const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("api", {
  hello: () => "Hello from Electron 👋",
});