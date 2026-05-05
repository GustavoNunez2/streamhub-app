const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// Configuración básica del actualizador
autoUpdater.autoDownload = true;
autoUpdater.checkForUpdatesAndNotify();

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0A0A0A',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  // --- BLOQUEO DE POPUPS Y VENTANAS EXTERNAS ---
  // Esta es la clave: cualquier intento de abrir una ventana nueva se deniega.
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log(`🚫 Popup bloqueado: ${url}`);
    return { action: 'deny' };
  });

  // Notificar al usuario cuando hay una actualización lista
  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
  });

  // Disfrazamos la app de Chrome para evitar el bloqueo de los canales
  win.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // LÓGICA DE CARGA CORREGIDA
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    win.loadURL('http://localhost:3000');
    // COMENTÁ O BORRÁ LA SIGUIENTE LÍNEA:
    // win.webContents.openDevTools(); 
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});