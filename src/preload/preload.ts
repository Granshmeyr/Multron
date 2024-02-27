import { contextBridge, ipcMain, ipcRenderer } from 'electron';
import * as listener from './listeners';

console.log('preloader ran');

ipcMain.on('show-split-menu', (event) => { listener.onShowSplitMenu(event); });
contextBridge.exposeInMainWorld('electron', {
  showSplitMenu: () => ipcRenderer.send('show-split-menu')
});