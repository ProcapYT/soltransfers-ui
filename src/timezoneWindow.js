const { BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

/**
 * 
 * @returns {Promise<string>}
 */
async function getTimezone() {
    const timezoneWindow = new BrowserWindow({
        width: 1,
        height: 1,
        show: false,
        frame: false,
        parent: global.mainWindow,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    
    
    timezoneWindow.loadFile(path.join(__dirname, "..", "public", "timezone", "timezone.html"));

    return new Promise((resolve) => {
        ipcMain.once("timezone", (_, timezone) => resolve(timezone));
    });
}

module.exports = { getTimezone };
