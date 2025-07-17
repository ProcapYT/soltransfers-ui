const { ipcMain, app } = require("electron");
const { sendSOL, sendToken } = require("./transfers.js");
const { decodeJSON } = require("./encrypter.js");
const path = require("node:path");
const fs = require("node:fs/promises");
const { Keypair, PublicKey } = require("@solana/web3.js");
const { default: bs58 } = require("bs58");
const { openNewFile } = require("./messageWindow.js");
const { v4: uuidV4 } = require("uuid");
const { isValidPublicKey } = require("./check-keys.js");
const { getTimezone } = require("./timezoneWindow.js");
const { CronJob } = require("cron");
const { CronExpressionParser } = require("cron-parser");

// Add here any crons: id: cron
const cronJobs = {};

const periodicTransactionsPath = path.join(app.getPath("userData"), "periodic-transactions.json");

/**
 * @returns {Promise<Array>}
 */
async function readTxsFile() {
    const rawFile = await fs.readFile(periodicTransactionsPath, "utf-8");
    const transactions = JSON.parse(rawFile);

    return transactions;
}

/**
 * 
 * @returns {Promise<Keypair>}
 */
async function getWallet() {
    const walletPath = path.join(app.getPath("userData"), "wallet.json");
    const strWallet = await fs.readFile(walletPath, "utf-8");
    const rawWallet = decodeJSON(JSON.parse(strWallet), global.password);
    const wallet = Keypair.fromSecretKey(bs58.decode(rawWallet.privateKey));

    return wallet;
}

/**
 * Set up the transaction cronjob
 * @param {Object} tx 
 * @returns {any}
 */
async function setupTxCronjob(tx) {
    const job = new CronJob(tx.cron, async () => {
        const wallet = await getWallet();

        if (tx.mint == "SOLANA") {
            await sendSOL(wallet, new PublicKey(tx.reciever), tx.amount);
        } else {
            await sendToken(wallet, new PublicKey(tx.reciever), new PublicKey(tx.mint), tx.amount);
        }
    }, null, true, await getTimezone());

    return job;
}

async function startCronjobs() {
    const transactions = await readTxsFile();

    for (const tx of transactions) {
        if (tx.isActive) {
            const job = await setupTxCronjob(tx);
            cronJobs[tx.id] = job;
        }
    }
}

ipcMain.on("oneTimeTransaction", async (event, transactionData) => {
    try {
        const wallet = await getWallet();
    
        const { mint, reciever, amount } = transactionData;
        const tokenMint = new PublicKey(mint);
        const recieverWallet = new PublicKey(reciever);

        if (!isValidPublicKey(recieverWallet)) throw new Error("Invalid reciever address");

        let signature;
    
        if (mint == "SOLANA") {
            signature = await sendSOL(wallet, recieverWallet, amount);
        } else {
            signature = await sendToken(wallet, recieverWallet, tokenMint, amount);
        }

        event.reply("oneTimeTransactionSuccess", signature);
    } catch(err) {
        event.reply("oneTimeTransactionError", err.message);
    }
});

ipcMain.on("periodicTransaction", async (event, transactionData) => {
    try {
        const transactions = await readTxsFile();
    
        const newTx = {
            ...transactionData,
            lastTimestamp: new Date(),
            isActive: true, // By default make the transaction start active
            id: uuidV4(),
        };
    
        transactions.push(newTx);

        if (!isValidPublicKey(transactionData.reciever)) throw new Error("Invalid reciever address");
    
        await fs.writeFile(periodicTransactionsPath, JSON.stringify(transactions, null, 4), "utf-8");

        cronJobs[newTx.id] = await setupTxCronjob(newTx);

        event.reply("periodicTransactionSet");
    } catch(err) {
        event.reply("settingPeriodicTransactionError", err.message);
    }
});

ipcMain.on("openTxConfirmationWindow", () => {
    openNewFile(path.join(__dirname, "..", "public", "transactionConfirmation", "txConfirmation.html"));
});

ipcMain.on("getPeriodicTransactions", async (event) => {
    const transactions = await readTxsFile();

    event.reply("gotPeriodicTransactions", transactions);
});

ipcMain.on("deletePeriodicalTx", async (_, id) => {
    const transactions = await readTxsFile();

    for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        
        if (tx.id == id) {
            transactions.splice(i, 1);
            break;
        }
    }

    if (cronJobs[id]) {
        cronJobs[id].stop();
        delete cronJobs[id];
    }

    await fs.writeFile(periodicTransactionsPath, JSON.stringify(transactions, null, 4), "utf-8");
});

ipcMain.on("editPeriodicTx", async (event, data) => {
    const transactions = await readTxsFile();

    for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];

        if (tx.id == data.id) {
            transactions[i] = {
                ...data,
                id: tx.id,
            };

            cronJobs[data.id].stop();
            delete cronJobs[data.id];
            cronJobs[data.id] = await setupTxCronjob(transactions[i]);

            break;
        }
    }

    if (!isValidPublicKey(data.reciever)) {
        event.reply("editPeriodicTxError", "Invalid reciever address");
        return;
    }

    await fs.writeFile(periodicTransactionsPath, JSON.stringify(transactions, null, 4), "utf-8");

    event.reply("editPeriodicTxSuccess");
});

ipcMain.on("changeTxStatus", async (_, status, id) => {
    const transactions = await readTxsFile();

    for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];

        if (tx.id == id) {
            transactions[i] = {
                ...transactions[i],
                isActive: status,
            };
        }
    }

    if (cronJobs[id]) {
        if (status) cronJobs[id].start();
        else cronJobs[id].stop();
    }

    await fs.writeFile(periodicTransactionsPath, JSON.stringify(transactions, null, 4), "utf-8");
});

ipcMain.on("getPendingTxs", async (event) => {
    const transactions = await readTxsFile();
    const activeTxs = [];

    for (const tx of transactions) {
        if (tx.isActive) {
            const interval = CronExpressionParser.parse(tx.cron, {
                currentDate: tx.lastTimestamp,
                endDate: new Date(),
                tz: await getTimezone(),
            });

            try {
                while (true) {
                    const nextExecution = interval.next().toDate();

                    activeTxs.push({
                        amount: tx.amount,
                        id: tx.id,
                        date: nextExecution,
                        mint: tx.mint,
                        reciever: tx.reciever,
                    });
                }
            } catch(err) {
                continue;
            }
        }
    }

    event.reply("gotPendingTxs", activeTxs);
});

ipcMain.on("skipTx", async (_, id, date) => {
    const transactions = await readTxsFile();

    for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];

        if (tx.id == id) {
            transactions[i].lastTimestamp = date;    
        }
    }

    await fs.writeFile(periodicTransactionsPath, JSON.stringify(transactions, null, 4), "utf-8");
});

ipcMain.on("skipAllTxs", async () => {
    const transactions = await readTxsFile();

    for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];

        if (tx.isActive) {
            transactions[i].lastTimestamp = new Date();
        }
    }

    await fs.writeFile(periodicTransactionsPath, JSON.stringify(transactions, null, 4), "utf-8");
});

ipcMain.on("startCrons", async () => {
    await startCronjobs();
});

module.exports = { setupTxCronjob, startCronjobs, cronJobs };
