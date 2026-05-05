const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Aquí puedes exponer funciones del sistema a React
  sendMessage: (channel, data) => ipcRenderer.send(channel, data),
  onMessage: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args)),
});