const { BrowserWindow } = require("electron");
const path = require("node:path");

function createModal() {
    global.passwordWindow = new BrowserWindow({
        parent: global.mainWindow,
        modal: true,
        show: false,
        frame: false,
        resizable: false,
        movable: false,
        width: 600,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    global.passwordWindow.loadFile(path.join(__dirname, "..", "public", "password", "password.html"));

    global.passwordWindow.on("ready-to-show", () => {
        global.passwordWindow.show();
    });
}

module.exports = { createModal };
