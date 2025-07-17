const { ipcMain, app } = require("electron");
const { Connection, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const { decodeJSON } = require("./encrypter.js");
const path = require("node:path");
const fs = require("node:fs/promises");

/**
 * Returns an object with all the data of a public key
 * @param {string} publicKey 
 * @returns {Promise<Object>}
 */
async function getTokenList(publicKey) {
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const owner = new PublicKey(publicKey);

    const resp = await connection.getParsedTokenAccountsByOwner(owner, {
        programId: TOKEN_PROGRAM_ID,
    });

    // SPL token won't give the solana amount
    const lamports = await connection.getBalance(owner, "confirmed");
    const solAmount = lamports / 1e9;

    const list = resp.value.map(token => {
        const info = token.account.data.parsed.info;
        const amount = parseInt(info.tokenAmount.amount);
        const decimals = info.tokenAmount.decimals;
        return {
            pubkey: token.pubkey.toBase58(),
            mint: info.mint,
            amount: amount / Math.pow(10, decimals),
            decimals,
        }
    });

    let solDetails;

    if (solAmount > 0) {
        solDetails = { 
            pubkey: null, 
            mint: "SOLANA", // Solana doesn't have a mint because it isn't a spl token
            amount: solAmount, 
            decimals: 9
        }
    }

    return [
        ...(solDetails ? [solDetails] : []),
        ...(list.filter(t => t.amount > 0)),
    ];
}

ipcMain.on("getLocalTokenList", async (event) => {
    // Check if the program has the password
    if (global.password == null || global.password == "") return;

    const walletJsonPath = path.join(app.getPath("userData"), "wallet.json");
    const rawJson = await fs.readFile(walletJsonPath, "utf-8");
    const encodedWallet = JSON.parse(rawJson);
    const wallet = decodeJSON(encodedWallet, global.password);

    let tokenList;

    // Retry 3 times just in case it fails (will stop when it doesn't fail)
    const retries = 3;
    for (let i = 0; i < retries; i++) {
        try {
            tokenList = await getTokenList(wallet.publicKey);
            break; // Stop the loop
        } catch(err) {
            console.error(err.message);

            await waitForMiliseconds(5000); // Use 5 second delay to not get a 429

            // End the function if all retries gave errors
            if (i == retries - 1) {
                event.reply("localTokenListError", err.message);
                return;
            }
        }
    }

    event.reply("gotLocalTokenList", tokenList);
});

/**
 * 
 * @param {number} ms 
 */
async function waitForMiliseconds(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
