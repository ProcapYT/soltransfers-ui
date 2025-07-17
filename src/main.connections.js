const { ipcMain, app } = require("electron");
const path = require("node:path");
const { setTemplate } = require("./main.js");

// Test event, just for debuging
ipcMain.on("connectionTest", (_, data) => {
    console.log(`Test: ${data}`);
});

ipcMain.on("getUserDataPath", (event) => {
    event.reply("gotUserDataPath", app.getPath("userData"));
});

ipcMain.on("gotPassword?", (event) => {
    // global.hasPassword is a boolean but in some cases it is null, so we return false
    event.reply("passwordStatus", global.hasPassword ?? false);
});

ipcMain.on("gotCorrectPassword", (_, password) => {
    global.hasPassword = true;
    global.password = password;
    
    global.passwordWindow.close();
    global.passwordWindow = null;

    // If the main window has the login loaded, load the main HTML file instead
    const mainWindowURL = global.mainWindow.webContents.getURL();

    if (mainWindowURL.endsWith("login/login.html")) {
        global.mainWindow.loadFile(path.join(__dirname, "..", "public", "main", "index.html"));
        setTemplate();
    }
});
