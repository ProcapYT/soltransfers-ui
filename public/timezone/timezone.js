const { ipcRenderer } = require("electron");

ipcRenderer.send("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
