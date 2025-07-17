import { getTokenData } from "../tokenData.js";

const { ipcRenderer } = require("electron");
const { CronExpressionParser } = require("cron-parser");

const $txList = document.querySelector(".txList");
const $loaderContainer = document.querySelector(".loaderContainer");
const $noTxMessage = document.querySelector(".noTxMessage");

async function loadTransactions() {
    $loaderContainer.classList.remove("hidden");

    const transactions = await getTransactions();

    let tokenData;
    try { tokenData = await getTokenData(); }
    catch (err) { throw err.message; }

    $loaderContainer.classList.add("hidden");

    if (transactions.length == 0) $noTxMessage.classList.remove("hidden");

    for await (const tx of transactions) {
        const $txContainer = document.createElement("div");
        const $tokenLogo = document.createElement("img");
        const $tokenAmount = document.createElement("div");
        const $reciever = document.createElement("div");
        const $nextTx = document.createElement("div");
        const $deleteButton = document.createElement("div");
        const $editButton = document.createElement("div");

        $txContainer.classList.add("txContainer");
        $tokenLogo.classList.add("tokenLogo");
        $tokenAmount.classList.add("tokenAmount");
        $reciever.classList.add("reciever");
        $nextTx.classList.add("nextTx");
        $deleteButton.classList.add("deleteButton");
        $editButton.classList.add("editButton");

        const token = tokenData.find(tok => tok.mint === tx.mint);

        // Simple function to shorten a public key (FSeZCk…Ltk2e5)
        const shorten = (pubkey) =>
            `${pubkey.slice(0, 6)}…${pubkey.slice(-6)}`;

        $tokenLogo.src = token.logoURI;
        $tokenAmount.textContent = `${formatAmount(tx.amount / 10 ** token.decimals)} ${token.symbol}`;
        $reciever.textContent = `To: ${shorten(tx.reciever)}`;
        $nextTx.textContent = `Next in: ${formatMs(msUntilNextCron(tx.cron, new Date()))}`;
        $deleteButton.innerHTML = '<i class="fa-solid fa-trash"></i>';
        $editButton.innerHTML = '<i class="fa-solid fa-pencil"></i>';

        // On/off switch
        const $switch = document.createElement("label");
        const $checkbox = document.createElement("input");
        const $slider = document.createElement("span");

        $checkbox.type = "checkbox";
        $checkbox.checked = tx.isActive;

        $switch.classList.add("switch");
        $switch.classList.add("txStatus");
        $slider.classList.add("slider");

        $checkbox.addEventListener("input", () => {
            ipcRenderer.send("changeTxStatus", $checkbox.checked, tx.id);
        });

        $deleteButton.addEventListener("click", () => {
            ipcRenderer.send("deletePeriodicalTx", tx.id);
            $txContainer.remove();
            
            if ($txList.childElementCount == 0) $noTxMessage.classList.remove("hidden");
        });

        $editButton.addEventListener("click", () => {
            sessionStorage.setItem("isEditing", JSON.stringify(tx));
            sessionStorage.setItem("tokenData", JSON.stringify(token));

            location.replace("../send/send.html");
        });

        $switch.append($checkbox, $slider);
        $txContainer.append($tokenAmount, $tokenLogo, $reciever, $nextTx, $switch, $deleteButton, $editButton);
        $txList.append($txContainer);
    }
}

/**
 * 
 * @returns {Promise<Object>}
 */
async function getTransactions() {
    return new Promise((resolve) => {
        ipcRenderer.send("getPeriodicTransactions");
        ipcRenderer.once("gotPeriodicTransactions", (_, transactions) => resolve(transactions));
    });
}

/**
 * 
 * @param {string} cronExpr 
 * @param {Date} fromDate 
 * @returns {number}
 */
function msUntilNextCron(cronExpr, fromDate) {
    const interval = CronExpressionParser.parse(cronExpr, { currentDate: fromDate });
    const nextDate = interval.next().toDate();
    return nextDate.getTime() - fromDate.getTime();
}

/**
 * Transforms 120000 ms into: 2 minutes
 * @param {number} ms 
 * @returns {string}
 */
function formatMs(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const totalYears = Math.floor(totalDays / 365);

    const remainingDays = totalDays % 365;
    const remainingHours = totalHours % 24;
    const remainingMinutes = totalMinutes % 60;

    const parts = [];

    if (totalYears > 0) {
        parts.push(`${totalYears} year${totalYears > 1 ? 's' : ''}`);
        if (remainingDays > 0) {
            parts.push(`${remainingDays} day${remainingDays > 1 ? 's' : ''}`);
        }

        return parts.join(', ');
    }

    if (totalDays > 0) {
        parts.push(`${totalDays} day${totalDays > 1 ? 's' : ''}`);
        if (remainingHours > 0) {
            parts.push(`${remainingHours} hour${remainingHours > 1 ? 's' : ''}`);
        }

        return parts.join(', ');
    }

    if (totalHours > 0) {
        parts.push(`${remainingHours} hour${remainingHours > 1 ? 's' : ''}`);
        if (remainingMinutes > 0) {
            parts.push(`${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`);
        }
        return parts.join(', ');
    }

    if (remainingMinutes > 0) {
        parts.push(`${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`);
        return parts.join(', ');
    }

    return '< 1 minute';
}

/**
 * 
 * @param {number} value 
 * @returns {string}
 */
function formatAmount(value) {
    if (Math.abs(value) >= 0.01) {
        return value.toFixed(2);
    }

    const str = value.toPrecision(15); 
    const match = str.match(/^(-?0\.0*)(\d+)/);

    if (!match) {
        // fallback
        return value.toFixed(2);
    }

    const zeros = match[1].length - 2; 
    const firstNonZero = match[2].length > 0 ? 1 : 0;

    const decimalsNeeded = zeros + firstNonZero;

    return value.toFixed(decimalsNeeded);
}

loadTransactions();
