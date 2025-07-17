import bip39 from "bip39";
import ed25519 from "ed25519-hd-key";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import sc from "samcolors";

/**
 * 
 * @param {string} seedPhrase // Twelve words separated by spaces
 * @returns {Promise<Keypair>}
 */
export async function getKeypair(seedPhrase) {
    const derivationPath = "m/44'/501'/0'/0'";  // Phantom uses this
    console.log("Using derivation path", sc.yellow(derivationPath));

    const seed = await bip39.mnemonicToSeed(seedPhrase);
    const derivedSeed = ed25519.derivePath(derivationPath, seed.toString("hex")).key;
    const keypair = Keypair.fromSeed(derivedSeed);

    return {
        publicKey: keypair.publicKey.toBase58(),
        privateKey: bs58.encode(keypair.secretKey),
    };
}