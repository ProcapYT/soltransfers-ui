const { ipcRenderer } = require("electron");

/**
 * 
 * @returns {Promise<Object[]>} 
 */
export async function getTokenData() {
    let localTokenList;

    try { localTokenList = await getLocalTokenList(); }
    catch (err) { throw new Error(err.message); }

    const mints = [];
    for (const token of localTokenList) {
        mints.push(token.mint);
    }

    const res = await fetch('https://api.coingecko.com/api/v3/coins/list?include_platform=true');
    const coingeckoList = await res.json();

    let hasSolana = false;

    if (mints.includes("SOLANA")) {
        hasSolana = true;
        mints.splice(mints.indexOf("SOLANA"), 1);
    }

    const mintsStr = hasSolana ? mints.join(",") + ",So11111111111111111111111111111111111111112" : mints.join(",");

    const jupResponse = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${mintsStr}`);
    const jupiterData = await jupResponse.json();

    const fullData = [];

    for (let i = 0; i < mints.length; i++) {
        const token = jupiterData[i];
        const localToken = localTokenList.find(tok => tok.mint === mints[i]);

        const coingeckoId = coingeckoList.find(tok => tok.platforms.solana?.toLowerCase() === mints[i].toLowerCase());

        fullData.push({
            mint: mints[i],
            price: token.usdPrice,
            decimals: token.decimals,
            name: token.name,
            symbol: token.symbol,
            logoURI: token.icon,
            coingeckoId: coingeckoId.id,
            amount: localToken.amount,
        });
    }

    if (hasSolana) {
        const solanaData = jupiterData[jupiterData.length - 1];
        const solAmount = localTokenList.find(tok => tok.mint === "SOLANA").amount;

        fullData.push({
            mint: "SOLANA",
            price: solanaData.usdPrice,
            decimals: 9,
            name: "Solana",
            symbol: "SOL",
            logoURI: solanaData.icon,
            coingeckoId: "solana",
            amount: solAmount,
        });
    }

    return fullData;
}

/**
 * 
 * @returns {Promise<Array | Error>}
 */
export async function getLocalTokenList() {
    return new Promise((resolve, reject) => {
        ipcRenderer.send("getLocalTokenList");
        ipcRenderer.once("gotLocalTokenList", handleTokenList);
        ipcRenderer.once("localTokenListError", handleError);

        function handleTokenList(_, tokenList) {
            ipcRenderer.removeListener("localTokenListError", handleError);
            resolve(tokenList);
        }

        function handleError(_, error) {
            ipcRenderer.removeListener("gotLocalTokenList", handleTokenList);
            reject(error);
        }
    });
}
