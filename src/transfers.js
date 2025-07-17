const {
    Connection,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    clusterApiUrl,
    Keypair,
    PublicKey,
} = require("@solana/web3.js");

const {
    getOrCreateAssociatedTokenAccount,
    createTransferInstruction,
    TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");

const sc = require("samcolors");

/**
 * 
 * @param {Keypair} senderKeypair 
 * @param {PublicKey} receiverWallet 
 * @param {PublicKey} TOKEN_MINT 
 * @param {number} amount 
 * @returns {Promise<string>}
 */
async function sendToken(senderKeypair, receiverWallet, TOKEN_MINT, amount) {
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({ commitment: "processed" });

    // token account of the sender
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair,
        TOKEN_MINT,
        senderKeypair.publicKey
    );

    console.log(`Got sender associated token account (${sc.yellow(senderKeypair.publicKey)})`);

    // token account of the receiver
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair,
        TOKEN_MINT,
        receiverWallet
    );

    console.log(`Got receiver associated token account (${sc.yellow(receiverWallet)})`);

    const transferIx = createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        senderKeypair.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
    );

    console.log("Created transfer instructions");

    const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: senderKeypair.publicKey,
    }).add(transferIx);

    transaction.sign(senderKeypair);

    let signature;

    try {
        signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [senderKeypair],
            {
                commitment: "processed",
                preflightCommitment: "processed",
                skipPreflight: false,
                maxRetries: 3,
                blockhash,
                lastValidBlockHeight,
            }
        );
    } catch (err) {
        handleTransactionErrors(err);
        throw err;
    }

    console.log(sc.bold(sc.green("COMPLETED: ")) + "Transaction successfully made!");

    return signature;
}

/**
 * 
 * @param {Keypair} senderKeypair 
 * @param {PublicKey} receiverWallet 
 * @param {number} amount 
 * @returns {Promise<string>}
 */
async function sendSOL(senderKeypair, receiverWallet, amount) {
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const transferIx = SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: receiverWallet,
        lamports: amount,
    });

    console.log("Created transfer instructions");

    const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: senderKeypair.publicKey,
    }).add(transferIx);

    transaction.sign(senderKeypair);

    let signature;

    try {
        signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [senderKeypair],
            {
                blockhash,
                lastValidBlockHeight
            }
        );
    } catch (err) {
        handleTransactionErrors(err);
        throw err;
    }

    console.log(sc.bold(sc.green("COMPLETED: ")) + "Transaction successfully made!");

    return signature;
}

function handleTransactionErrors(err) {
    const fullError = err.stack ?? err.toString();

    if (fullError.includes("TransactionExpiredBlockheightExceededError"))
        console.warn(`${sc.yellow("WARN:")} Blockhash expired before the transaction was confirmed`);

    else if (fullError.includes("BlockhashNotFound"))
        console.error(`${sc.red("ERROR:")} Blockhash not found`);

    else if (fullError.includes("custom program error"))
        console.error(`${sc.red("ERROR:")} The program had an error in the execution`);

    else if (fullError.includes("Transaction signature verification failure"))
        console.error(`${sc.red("ERROR:")} Problem in the verification of the signature`);

    else if (fullError.includes("Missing signature for fee payer"))
        console.warn(`${sc.yellow("WARN:")} No fee payer found in the list`);

    else if (fullError.includes("429") || fullError.includes("Too many requests"))
        console.error(`${sc.red("ERROR:")} You are making to many requests to the RPC`);

    else {
        console.error("Unknown error");
        console.error(err.message);
    }
}

module.exports = { sendToken, sendSOL };
