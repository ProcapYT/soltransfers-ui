const strData = sessionStorage.getItem("tokenData");
if (strData == undefined) location.replace("../main/index.html");
const tokenData = JSON.parse(sessionStorage.getItem("tokenData"));

sessionStorage.removeItem("tokenData"); // Empty the token data in memory

document.title = `Soltransfers - Send ${tokenData.name}`;

// Same page but instead of adding a token we edit it
let isInEditMode = false;
let editData;
const strEditData = sessionStorage.getItem("isEditing");

if (strEditData != undefined) {
    isInEditMode = true;
    sessionStorage.removeItem("isEditing");
    editData = JSON.parse(strEditData);
}

// ----------------------------------------------------------------

const { ipcRenderer } = require("electron");
const { isValidCron } = require("cron-validator");
const cronstrue = require("cronstrue");

const $sendAmountToken = document.querySelector("#sendAmountToken");
const $sendAmountUSD = document.querySelector("#sendAmountUSD");
const $symbol = document.querySelector(".symbol");
const $tokenName = document.querySelector(".tokenName");
const $backButton = document.querySelector(".backButton");
const $sendButton = document.querySelector(".sendButton");
const $recieverKey = document.querySelector("#recieverKey");
const $errorContainer = document.querySelector(".errorContainer");
const $buttonMainContent = document.querySelector(".sendButton .mainContent");
const $buttonLoader = document.querySelector(".sendButton .buttonLoader");
const $cronInputUi = document.querySelector(".cronInputUi");
const $cronInputContainer = document.querySelector(".cronInputContainer");
const $toggleGroup = document.querySelector(".toggleGroup");
const $editButton = document.querySelector(".editButton");
const $editButtonMainContent = document.querySelector(".editButton .mainContent");
const $editButtonLoader = document.querySelector(".editButton .buttonLoader");

// cron-expression-input library does not have a .value by default
let cronInputValue = "* * * * *";

$cronInputUi.addEventListener("input", (e) => {
    cronInputValue = e.detail.value;
});

// Detect the change of the radio inputs
const $radios = Array.from(document.querySelectorAll('input[name="transacctionType"]'));

$radios.forEach(radio => {
    radio.addEventListener('change', () => {
        const value = document.querySelector('input[name="transacctionType"]:checked').value;

        if (value == "periodic") $cronInputContainer.classList.remove("hidden");
        else $cronInputContainer.classList.add("hidden");
    });
});

if (isInEditMode) {
    const uiAmount = editData.amount / 10 ** tokenData.decimals;
    $sendAmountToken.value = uiAmount;
    $sendAmountUSD.value = uiAmount * tokenData.price;
    $recieverKey.value = editData.reciever;

    // Update the cron input
    $cronInputUi.querySelector(".cronInsideInput").value = editData.cron;
    $cronInputUi.querySelector(".cronButton").dispatchEvent(new Event("click", { bubbles: true, }));
    $cronInputUi.querySelector(".cronClose").dispatchEvent(new Event("click", { bubbles: true, }));

    $toggleGroup.classList.add("hidden");
    $cronInputContainer.classList.remove("hidden");

    $sendButton.classList.add("hidden");
    $editButton.classList.remove("hidden");
} else {
    $sendAmountToken.value = "0";
    $sendAmountUSD.value = "0";
}

$symbol.textContent = tokenData.symbol;
$tokenName.textContent = tokenData.name;

$sendAmountToken.addEventListener("input", () => {
    $sendAmountUSD.value = parseFloat($sendAmountToken.value) * parseFloat(tokenData.price);
});

$sendAmountUSD.addEventListener("input", () => {
    $sendAmountToken.value = parseFloat($sendAmountUSD.value) / parseFloat(tokenData.price);
});

$backButton.addEventListener("click", () => {
    sessionStorage.setItem("tokenData", JSON.stringify(tokenData));

    location.replace("../token/token.html");
});

$sendButton.addEventListener("click", async () => {
    if ($buttonLoader.classList.contains("hidden")) {
        $errorContainer.classList.add("hidden");
        $buttonMainContent.classList.add("hidden");
        $buttonLoader.classList.remove("hidden");

        const transactionType = document.querySelector('input[name="transacctionType"]:checked').value;
        if (transactionType == "oneTime") {
            ipcRenderer.send("oneTimeTransaction", {
                mint: tokenData.mint,
                reciever: $recieverKey.value,
                amount: parseFloat($sendAmountToken.value) * 10 ** tokenData.decimals,
            });

            ipcRenderer.once("oneTimeTransactionError", handleError);
            ipcRenderer.once("oneTimeTransactionSuccess", handleSuccess);

            function handleError(_, errorMessage) {
                ipcRenderer.removeListener("oneTimeTransactionSuccess", handleSuccess);

                $errorContainer.classList.remove("hidden");
                $errorContainer.textContent = errorMessage;

                $buttonLoader.classList.add("hidden");
                $buttonMainContent.classList.remove("hidden");
            }

            function handleSuccess(_, signature) {
                ipcRenderer.removeListener("oneTimeTransactionError", handleError);
                localStorage.setItem("signature", signature);
                ipcRenderer.send("openTxConfirmationWindow");
                location.replace("../main/index.html");
            }
        } else {
            if (!validateCron(cronInputValue)) return;

            ipcRenderer.send("periodicTransaction", {
                mint: tokenData.mint,
                reciever: $recieverKey.value,
                amount: parseFloat($sendAmountToken.value) * 10 ** tokenData.decimals,
                cron: cronInputValue,
                cronDescription: cronstrue.toString(cronInputValue),
            });

            ipcRenderer.once("periodicTransactionSet", handleSuccess);
            ipcRenderer.once("settingPeriodicTransactionError", handleError);

            function handleError(_, errorMessage) {
                ipcRenderer.removeListener("periodicTransactionSet", handleSuccess);

                $errorContainer.classList.remove("hidden");
                $errorContainer.textContent = errorMessage;

                $buttonLoader.classList.add("hidden");
                $buttonMainContent.classList.remove("hidden");
            }

            function handleSuccess() {
                ipcRenderer.removeListener("settingPeriodicTransactionError", handleError);
                location.replace("../main/index.html");
            }
        }
    }
});

$editButton.addEventListener("click", () => {
    if (!validateCron(cronInputValue)) return;

    $editButtonLoader.classList.remove("hidden");
    $editButtonMainContent.classList.add("hidden");

    ipcRenderer.send("editPeriodicTx", {
        mint: tokenData.mint,
        amount: parseFloat($sendAmountToken.value) * 10 ** tokenData.decimals,
        reciever: $recieverKey.value,
        cron: cronInputValue,
        cronDescription: cronstrue.toString(cronInputValue),
        isActive: editData.isActive,
        id: editData.id,
    });

    ipcRenderer.once("editPeriodicTxSuccess", handleSuccess);
    ipcRenderer.once("editPeriodicTxError", handleError);

    function handleError(_, errorMessage) {
        $editButtonLoader.classList.add("hidden");
        $editButtonMainContent.classList.remove("hidden");

        $errorContainer.classList.remove("hidden");
        $errorContainer.textContent = errorMessage;

        ipcRenderer.removeListener("editPeriodicTxSuccess", handleSuccess);
    }

    function handleSuccess() {
        ipcRenderer.removeListener("editPeriodicTxError", handleError);

        location.replace("../periodicTx/periodicTx.html");
    }
});

/**
 * 
 * @param {string} cron 
 * @returns {boolean}
 */
function validateCron(cron) {
    if (!isValidCron(cron)) {
        $buttonLoader.classList.add("hidden");
        $buttonMainContent.classList.remove("hidden");

        $errorContainer.classList.remove("hidden");
        $errorContainer.textContent = "Invalid cron expression, check the cron again.";

        return false;
    }

    return true;
}
