import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { IPCManager } from './core/modules/ipc-handlers.js';

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
let mainWindow;
let services;
app.whenReady().then(() => {
  services = new IPCManager();
  services.registerHandlers();
  mainWindow = new BrowserWindow({ width: 1200, height: 800, webPreferences: {
    preload: path.join(sourceDirectory, 'preload.js'), contextIsolation: true, nodeIntegration: false
  }});
  if (process.env.NODE_ENV === 'development') mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(sourceDirectory, '../dist/renderer/index.html'));
  ipcMain.on('suggestion-config-updated', () => mainWindow.webContents.send('suggestion-config-updated'));
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => services?.db?.close());
