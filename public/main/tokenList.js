import { getTokenData } from "../tokenData.js";

const $tokenList = document.querySelector(".tokenList");
const $loader = document.querySelector(".loaderContainer");
const $reloadButton = document.querySelector(".reloadButton");
const $errorContainer = document.querySelector(".errorContainer");

document.title = "Soltransfers";

async function loadTokenList() {
    $tokenList.innerHTML = ""; // Empry the token list before adding more items to it

    const $tokenContainers = [];

    let tokenData;

    try { tokenData = await getTokenData(); }
    catch(err) { 
        $errorContainer.textContent = err.message;
        $errorContainer.classList.remove("hidden");
        return;
    }

    for (const token of tokenData) {
        const $tokenContainer = document.createElement("div");
        const $tokenName = document.createElement("div");
        const $tokenAmount = document.createElement("div");
        const $tokenImage = document.createElement("img");
        const $tokenAmountUSD = document.createElement("div");

        $tokenContainer.classList.add("tokenContainer");
        $tokenName.classList.add("tokenName");
        $tokenAmount.classList.add("tokenAmount");
        $tokenImage.classList.add("tokenImage");
        $tokenAmountUSD.classList.add("tokenAmountUSD");

        $tokenName.textContent = token.name;
        $tokenAmount.textContent = `${token.amount.toFixed(2)} ${token.symbol}`;
        $tokenImage.src = token.logoURI;
        $tokenAmountUSD.textContent = (parseFloat(token.price) * token.amount).toFixed(2) + "$";

        $tokenContainer.append($tokenImage);
        $tokenContainer.append($tokenName);
        $tokenContainer.append($tokenAmount);
        $tokenContainer.append($tokenAmountUSD);

        $tokenContainers.push($tokenContainer);

        $tokenContainer.addEventListener("click", () => {
            sessionStorage.setItem("tokenData", JSON.stringify(token));

            location.replace("../token/token.html");
        });
    }

    // Hide the loader when all the actual work is done
    $loader.classList.add("hidden");

    for (const $container of $tokenContainers) {
        $tokenList.append($container);
    }
}

$reloadButton.addEventListener("click", async () => {
    $loader.classList.remove("hidden");
    $errorContainer.classList.add("hidden");

    await loadTokenList();
});

// Load the token list when the app starts
await loadTokenList();
