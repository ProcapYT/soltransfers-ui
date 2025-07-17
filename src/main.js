const { BrowserWindow, app, Menu, Tray } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { createModal } = require("./passwordWindow.js");
const { cronJobs } = require("./transfer.connection.js");
const windowStateKeeper = require("electron-window-state");
const AutoLaunch = require("auto-launch");

// Used to see if you need to hide the main window or close it
let isQuiting = false;

// Timer to lock the app when it is an x amount of minutes without focusing
let blurTimer = null;

// Start on startup
if (app.isPackaged) {
    const appLauncher = new AutoLaunch({
        name: "Soltransfers",
        path: process.execPath,
    });
    
    appLauncher.enable();
}

function createMainWindow() {
    // So the state of the main window persists (width and height)
    let mainWindowState = windowStateKeeper({
        defaultHeight: 600,
        defaultWidth: 800,
    });

    // Main window config
    global.mainWindow = new BrowserWindow({
        width: mainWindowState.width,
        height: mainWindowState.height,
        icon: path.join(__dirname, "..", "icon", "64x64.png"), // preferably 16x16 or 32x32
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    global.mainWindow.setTitle("Soltransfers");
    global.mainWindow.setMenu(null);
    
    if (mainWindowState.isMaximized) {
        global.mainWindow.maximize();
    }

    // Always start in the login and the login will redirect the user to the rest of the app
    global.mainWindow.loadFile(path.join(__dirname, "..", "public", "login", "login.html"));

    mainWindowState.manage(global.mainWindow);

    // Open dev tools if the app is not exported
    if (!app.isPackaged) {
        global.mainWindow.openDevTools();
    }

    // Hide the main window instead of closing it
    global.mainWindow.on("close", (event) => {
        if (!isQuiting) {
            global.hasPassword = false;
            event.preventDefault();
            global.mainWindow.hide();
        }
    });

    global.mainWindow.on("show", () => {
        openPasswordWindow();
    });

    // Ask for the password after a period of time if the app is not on focus
    global.mainWindow.on("blur", () => {
        blurTimer = setTimeout(() => {
            if (global.hasPassword) {
                global.hasPassword = false;
                openPasswordWindow();
                blurTimer = null;
            }
        }, 600000);
    });

    global.mainWindow.on("focus", () => {
        if (blurTimer != null) clearTimeout(blurTimer);
    });
}

app.on("ready", () => {
    createMainWindow(); // Create the main window when the app is configured
    openPasswordWindow(); // Opens the password window if the app doesn't have the password and there is a wallet

    // Create the tray (background app)
    global.tray = new Tray(path.join(__dirname, "..", "icon", "16x16.png"));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Open Soltransfers", click: () => {
                global.mainWindow.show();
            }
        },
        {
            label: "Exit", click: () => {
                isQuiting = true;
                app.quit();
            }
        }
    ]);

    global.tray.setToolTip("Sol Transfers Background");
    global.tray.setContextMenu(contextMenu);

    global.tray.on("double-click", () => {
        global.mainWindow.show();
    });

    // Create the user data folder if it doesn't exist (e.g. %appdata%/soltransfers)
    if (!fs.existsSync(app.getPath("userData"))) {
        fs.mkdirSync(app.getPath("userData"));
    }

    // Periodic transactions file (soltransvers/periodic-transactions.json)
    const periodicTransactionsPath = path.join(app.getPath("userData"), "periodic-transactions.json");
    if (!fs.existsSync(periodicTransactionsPath)) {
        fs.writeFileSync(periodicTransactionsPath, "[]", "utf-8");
    }
});

app.on("window-all-closed", () => {
    // On macOS it is common not closing the full app
    if (process.platform != "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    // Check if the main window exists
    if (global.mainWindow == null) {
        createMainWindow();
    } else {
        global.mainWindow.show();
    }
});

function openPasswordWindow() {
    if (!global.hasPassword && fs.existsSync(path.join(app.getPath("userData"), "wallet.json")) && !global.passwordWindow) {
        createModal();
    }
}

function setTemplate() {
    const template = Menu.buildFromTemplate([
        {
            label: "Home", click: () => {
                global.mainWindow.loadFile(path.join(__dirname, "..", "public", "main", "index.html"));
            }
        },
        {
            label: "Periodic TX", click: () => {
                global.mainWindow.loadFile(path.join(__dirname, "..", "public", "periodicTx", "periodicTx.html"));
            }
        },
        {
            label: "Settings", 
            submenu: [
                {
                    label: "Change wallet", click: async () => {
                        await fs.promises.unlink(path.join(app.getPath("userData"), "wallet.json")); // Remove the wallet.json
                        await fs.promises.writeFile(path.join(app.getPath("userData"), "periodic-transactions.json"), "[]", "utf-8"); // Remove all the periodic transactions

                        global.passwordWindow?.close(); // Just in case the password window is open
                        global.mainWindow.loadFile(path.join(__dirname, "..", "public", "login", "login.html"));

                        // Stop all the crons
                        for (const [_, cron] of Object.entries(cronJobs)) {
                            cron.stop();
                        }
                    }
                }
            ]
        }
    ]);

    global.mainWindow.setMenu(template);
}

module.exports = { setTemplate };

require("./login.connections.js");
require("./main.connections.js");
require("./token.connections.js");
