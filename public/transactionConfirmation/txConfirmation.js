const { shell } = require("electron");

const $link = document.querySelector(".link");

$link.addEventListener("click", () => {
    const signature = localStorage.getItem("signature");

    shell.openExternal(`https://solscan.io/tx/${signature}`);
});
