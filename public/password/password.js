import { showError } from "./password-error.js";

const { ipcRenderer } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { decodeJSON } = require("../../src/encrypter.js");

const $passwordInput = document.querySelector("#passwordInput");
const $mainContainer = document.querySelector(".mainContainer");

$passwordInput.focus();

$mainContainer.addEventListener("submit", async (e) => {
    e.preventDefault();

    if ($passwordInput.value.trim() == "") {
        showError("Wrong password");
        return;
    }

    if ($passwordInput.value.includes(" ")) {
        showError("Wrong password");
        return;
    }

    const userDataPath = await getUserDataPath();
    const rawJson = await fs.readFile(path.join(userDataPath, "wallet.json"), "utf-8");
    const wallet = JSON.parse(rawJson);

    try {
        decodeJSON(wallet, $passwordInput.value);
    } catch(e) {
        console.error(e);
        showError("Wrong password");
        return;
    }
    
    ipcRenderer.send("gotCorrectPassword", $passwordInput.value);
});

/**
 * 
 * @returns {Promise<string>}
 */
async function getUserDataPath() {
    return new Promise((resolve) => {
        ipcRenderer.send("getUserDataPath");
        ipcRenderer.once("gotUserDataPath", (_, userDataPath) => resolve(userDataPath));
    });
}
