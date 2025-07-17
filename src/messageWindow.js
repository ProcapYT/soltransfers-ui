const { BrowserWindow } = require("electron");
const path = require("node:path");

/**
 * 
 * @param {string} filePath 
 */
function openNewFile(filePath) {
    const messageWindow = new BrowserWindow({
        width: 500,
        height: 200,
        parent: global.mainWindow,
        icon: path.join(__dirname, "..", "icon", "64x64.png"),
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    messageWindow.setMenu(null);
    messageWindow.loadFile(filePath);

    messageWindow.on("ready-to-show", () => {
        messageWindow.show();
    });
}

module.exports = { openNewFile };
