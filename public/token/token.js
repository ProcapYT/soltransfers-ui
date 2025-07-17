const strData = sessionStorage.getItem("tokenData");
if (strData == undefined) location.replace("../main/index.html");
const tokenData = JSON.parse(sessionStorage.getItem("tokenData"));

sessionStorage.removeItem("tokenData"); // Empty the token data in memory

document.title = `Soltransfers - ${tokenData.name}`;

// -----------------------------------------------------------------------

const { Chart, registerables } = require("chart.js");
Chart.register(...registerables);

const $chartLoader = document.querySelector(".chartLoader");
const $chartContainer = document.querySelector("#chart");
const $chartTimes = Array.from(document.querySelectorAll(".chartTime"));
const $tokenName = document.querySelector(".tokenName");
const $tokenAmount = document.querySelector(".tokenAmount");
const $tokenPrice = document.querySelector(".tokenPrice");
const $errorContainer = document.querySelector(".errorContainer");
const $sendButton = document.querySelector(".sendButton");
const $swapButton = document.querySelector(".swapButton");
const $backButton = document.querySelector(".backButton");

$tokenName.textContent = tokenData.name;
$tokenAmount.textContent = tokenData.amount;
$tokenPrice.textContent = parseFloat(tokenData.price).toFixed(2) + "$";

let currentChart;

/**
 * 
 * @param {string} coingeckoId 
 * @param {number} days 
 */
async function loadChart(coingeckoId, days) {
    try {
        $chartLoader.classList.remove("hidden");
        $errorContainer.classList.add("hidden");

        if (currentChart) {
            currentChart.destroy();
        }

        const coingeckoRes = await fetch(`https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${days}`);

        if (coingeckoRes.status != 200) throw new Error(`${coingeckoRes.status} ${coingeckoRes.statusText}`);

        const coingeckoJson = await coingeckoRes.json();
        const prices = coingeckoJson.prices;

        const labels = prices.map(p => new Date(p[0]).toLocaleDateString());
        const data = prices.map(p => p[1]);

        const ctx = $chartContainer.getContext("2d");

        let lineColor = "green";

        if (data[0] < data[data.length - 1]) lineColor = "green";
        else lineColor = "red";

        $chartLoader.classList.add("hidden");

        currentChart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: 'USD',
                    data,
                    borderColor: lineColor,
                    backgroundColor: 'rgba(0,0,255,0.1)'
                }],
                tension: 0.4,
                pointRadius: 0,
            },
            options: {
                scales: { x: { display: false }, y: { display: true } },
                elements: {
                    point: {
                        radius: 0,
                        hitRadius: 10,
                    },
                    line: {
                        tension: 0.4,
                    },
                },
                plugins: {
                    legend: { display: false },
                },
            }
        });
    } catch (err) {
        $errorContainer.classList.remove("hidden");
        $chartLoader.classList.add("hidden");

        if (err.message.split(" ").includes("429")) {
            $errorContainer.textContent = "Too many requests, try again in a minute or so";
            return;
        }

        $errorContainer.textContent = err.message;
    }
}

for (const $time of $chartTimes) {
    $time.addEventListener("click", async () => {
        const days = parseInt($time.dataset.days);
        await loadChart(tokenData.coingeckoId, days);
    });
}

// Show 1 day chart by default
loadChart(tokenData.coingeckoId, 1);

$sendButton.addEventListener("click", () => {
    sessionStorage.setItem("tokenData", JSON.stringify(tokenData));

    location.replace("../send/send.html");
});

$backButton.addEventListener("click", () => {
    location.replace("../main/index.html");
});
