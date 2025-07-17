import { showError } from "./login-error.js";

const { ipcRenderer } = require("electron");

const $loginModeChanger = document.querySelector("#loginModeChanger");
const $privateKeyLogin = document.querySelector("#privateKeyLogin");
const $seedPhraseLogin = document.querySelector("#seedPhraseLogin");
const $acceptButtons = Array.from(document.querySelectorAll(".acceptButton"));
const $publicKeyInput = document.querySelector("#publicKeyInput");
const $privateKeyInput = document.querySelector("#privateKeyInput");
const $seedPhraseInputs = Array.from(document.querySelectorAll(".seedPhraseInput"));
const $stepsIndicator = document.querySelector(".stepsIndicator");
const $passwordContainer = document.querySelector(".passwordContainer");
const $mainContainer = document.querySelector(".mainContainer");
const $decodePasswordInput = document.querySelector("#decodePasswordInput");
const $acceptPasswordButton = document.querySelector(".acceptPasswordButton");

document.title = "Soltransfers - Login";

$acceptPasswordButton.addEventListener("click", () => {
    if ($decodePasswordInput.value.trim() == "") {
        showError("Please write a password");
        return;
    }

    if ($decodePasswordInput.value.includes(" ")) {
        showError("Password can not contain spaces");
        return;
    }

    ipcRenderer.send("loginPassword", $decodePasswordInput.value);

    $mainContainer.classList.remove("hidden");
    $passwordContainer.classList.add("hidden");
    $loginModeChanger.classList.remove("hidden");
    $stepsIndicator.textContent = "Step 2 of 2: Log in with solana wallet";
});

$loginModeChanger.addEventListener("click", () => {
    if ($loginModeChanger.dataset.loginMode == "privateKey") {
        $loginModeChanger.dataset.loginMode = "seedPhrase";
        $loginModeChanger.textContent = "Use private key and public key";

        $privateKeyLogin.classList.add("hidden");
        $seedPhraseLogin.classList.remove("hidden");
    } else if ($loginModeChanger.dataset.loginMode == "seedPhrase") {
        $loginModeChanger.dataset.loginMode = "privateKey";
        $loginModeChanger.textContent = "Use seed phrase";
        
        $privateKeyLogin.classList.remove("hidden");
        $seedPhraseLogin.classList.add("hidden");
    }
});

for (const $button of $acceptButtons) {
    $button.addEventListener("click", () => {
        let data;

        if ($loginModeChanger.dataset.loginMode == "privateKey") {
            data = {
                publicKey: $publicKeyInput.value,
                privateKey: $privateKeyInput.value,
            };
        } else if ($loginModeChanger.dataset.loginMode == "seedPhrase") {
            data = [];

            for (const $input of $seedPhraseInputs) {
                data.push($input.value);
            }
        }

        console.log("Sending login data");

        ipcRenderer.send("login", {
            mode: $loginModeChanger.dataset.loginMode,
            data,
        });
    });
}

ipcRenderer.once("loginError", (_, error) => {
    showError(error.message);
});

ipcRenderer.once("loginSucceed", () => {
    location.replace("../main/index.html");
});
