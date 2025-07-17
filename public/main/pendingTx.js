const { ipcRenderer } = require("electron");

const $blurBackground = document.querySelector(".blurBackground");
const $pendingTxs = document.querySelector(".pendingTxs");
const $txList = document.querySelector(".txList");
const $pendingTxsLoader = document.querySelector(".pendingTxsLoader");
const $skipAllButton = document.querySelector(".skipAllButton");
const $executeAllButton = document.querySelector(".executeAllButton");

async function getPendingTxs() {
    return new Promise((resolve) => {
        ipcRenderer.send("getPendingTxs");
        ipcRenderer.once("gotPendingTxs", (_, txs) => resolve(txs));
    });
}

const txs = await getPendingTxs();

if (txs.length != 0) {
    $blurBackground.classList.remove("hidden");
    $pendingTxs.classList.remove("hidden");
    loadTxs();
}

async function loadTxs() {
    const mints = [];

    for (const tx of txs) {
        if (tx.mint != "SOLANA" && !mints.includes(tx.mint)) {
            mints.push(tx.mint);
        }
    }

    const jupiterRes = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${mints.join(",") + ",So11111111111111111111111111111111111111112"}`);
    const jupiterData = await jupiterRes.json();

    $pendingTxsLoader.classList.add("hidden");

    for (const tx of txs) {
        const $txContainer = document.createElement("div");
        const $txImage = document.createElement("img");
        const $txAmount = document.createElement("div");
        const $reciever = document.createElement("div");
        const $date = document.createElement("div");
        const $executeButton = document.createElement("div");
        const $skipButton = document.createElement("div");

        $txContainer.classList.add("txContainer");
        $txImage.classList.add("txImage");
        $txAmount.classList.add("txAmount");
        $reciever.classList.add("reciever");
        $date.classList.add("txDate");
        $executeButton.classList.add("executeButton");
        $skipButton.classList.add("skipButton");

        let tokenData;

        if (tx.mint == "SOLANA") {
            tokenData = jupiterData.find(tokData => tokData.id == "So11111111111111111111111111111111111111112");
        } else {
            tokenData = jupiterData.find(tokData => tokData.id == tx.mint);
        }

        const options = {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour12: false,
            timeZone: "Etc/UTC",
        };

        const formattedDate = tx.date.toLocaleString('en-GB', options);

        const shorten = (pubkey) =>
            `${pubkey.slice(0, 6)}…${pubkey.slice(-6)}`;

        $txImage.src = tokenData.icon;
        $txAmount.textContent = `${formatAmount(tx.amount / 10 ** tokenData.decimals)} ${tokenData.symbol}`;
        $reciever.textContent = `To: ${shorten(tx.reciever)}`;
        $date.textContent = formattedDate;
        $skipButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        $executeButton.innerHTML = `
            <div class="buttonIcon">
                <i class="fa-solid fa-paper-plane"></i>
            </div>    

            <div class="buttonLoader hidden">
                <div class="loader"></div>
            </div>
        `;

        $skipButton.addEventListener("click", () => {
            ipcRenderer.send("skipTx", tx.id, tx.date);
            $txContainer.remove();
        });

        $executeButton.addEventListener("click", () => {
            if ($executeButton.querySelector(".buttonLoader").classList.contains("hidden")) {
                $executeButton.querySelector(".buttonLoader").classList.remove("hidden");
                $executeButton.querySelector(".buttonIcon").classList.add("hidden");

                ipcRenderer.send("oneTimeTransaction", {
                    mint: tx.mint,
                    reciever: tx.reciever,
                    amount: tx.amount,
                });

                ipcRenderer.once("oneTimeTransactionSuccess", () => {
                    ipcRenderer.send("skipTx", tx.id, tx.date); // This just updates the date so it doesn't apear again
                    $txContainer.remove();
                });
            }
        });

        $txContainer.append($txImage, $txAmount, $reciever, $date, $executeButton, $skipButton);
        $txList.append($txContainer);
    }
}

$skipAllButton.addEventListener("click", () => {
    ipcRenderer.send("skipAllTxs");
    ipcRenderer.send("startCrons");

    $blurBackground.classList.add("hidden");
    $pendingTxs.classList.add("hidden");
});

$executeAllButton.addEventListener("click", async () => {
    if ($executeAllButton.querySelector(".buttonLoader").classList.contains("hidden")) {
        $executeAllButton.querySelector(".buttonLoader").classList.remove("hidden");
        $executeAllButton.querySelector(".mainContent").classList.add("hidden");

        const groupedTxs = [];

        // Group the transactions by id (add the amounts)
        for (const tx of txs) {
            const groupedTx = groupedTxs.find(groupedTx => groupedTx.id == tx.id);

            if (groupedTx != undefined) {
                groupedTxs[groupedTxs.indexOf(groupedTx)].amount += tx.amount;
            } else {
                groupedTxs.push(tx);
            }
        }

        for (const tx of groupedTxs) {
            ipcRenderer.send("oneTimeTransaction", {
                amount: tx.amount,
                mint: tx.mint,
                reciever: tx.reciever,
            });

            await new Promise((resolve) => {
                ipcRenderer.once("oneTimeTransactionSuccess", handleResponse);
                ipcRenderer.once("oneTimeTransactionError", handleResponse);
    
                function handleResponse() {
                    ipcRenderer.removeListener("oneTimeTransactionError", handleResponse);
                    ipcRenderer.removeListener("oneTimeTransactionSuccess", handleResponse);

                    resolve();
                }
            });
        }

        $blurBackground.classList.add("hidden");
        $pendingTxs.classList.add("hidden");

        ipcRenderer.send("skipAllTxs"); // Update al the timestamps
        ipcRenderer.send("startCrons");
    }
});

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
