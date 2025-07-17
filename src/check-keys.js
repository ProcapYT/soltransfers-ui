const { PublicKey, Keypair } = require('@solana/web3.js');
const { default: bs58 } = require("bs58");

/**
 * 
 * @param {string} pubkeyStr 
 * @returns {boolean}
 */
function isValidPublicKey(pubkeyStr) {
    try {
        const pubkey = new PublicKey(pubkeyStr);
        return PublicKey.isOnCurve(pubkey);
    } catch {
        return false;
    }
}

/**
 * 
 * @param {string} privateKeyBs58 
 * @returns {boolean}
 */
function isValidPrivateKey(privateKeyBs58) {
    try {
        const decoded = bs58.decode(privateKeyBs58);
        if (decoded.length !== 64) return false;

        Keypair.fromSecretKey(decoded);
        return true;
    } catch {
        return false;
    }
}

module.exports = { isValidPublicKey, isValidPrivateKey };
