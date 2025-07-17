const { ipcMain, app } = require("electron");
const { encodeJSON } = require("./encrypter.js");
const { getKeypair } = require("./seedPhraseToPrivateKey.js");
const { isValidPrivateKey, isValidPublicKey } = require("./check-keys.js");
const fs = require("node:fs/promises");
const path = require("node:path");
const { setTemplate } = require("./main.js");

ipcMain.on("login", async (event, loginData) => {
    let encodedJson;

    try {
        if (loginData.mode == "privateKey") {
            if (!isValidPublicKey(loginData.data.publicKey)) throw new Error("Invalid public key"); 
            if (!isValidPrivateKey(loginData.data.privateKey)) throw new Error("Invalid private key"); 

            encodedJson = encodeJSON(loginData.data, global.password);
        } else if (loginData.mode == "seedPhrase") {
            const keypair = await getKeypair(loginData.data.join(" "));
            encodedJson = encodeJSON(keypair, global.password);

            console.log(JSON.stringify(keypair, null, 4));
        }
    } catch (e) {
        event.reply("loginError", e);
        return;
    }

    const walletPath = path.join(app.getPath("userData"), "wallet.json");
    const strWallet = JSON.stringify(encodedJson, null, 4);
    
    await fs.writeFile(walletPath, strWallet, "utf-8");

    event.reply("loginSucceed");
    setTemplate();
});

ipcMain.on("loginPassword", (_, password) => {
    global.password = password;
    global.hasPassword = true;
});
