/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

import { app, BrowserWindow, shell, ipcMain, globalShortcut } from 'electron';
// import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
// import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import FileManager from './FileManager';

// Types
import Channels from '../enums';

// class AppUpdater {
//   constructor() {
//     log.transports.file.level = 'info';
//     autoUpdater.logger = log;
//     autoUpdater.checkForUpdatesAndNotify();
//   }
// }

let mainWindow: BrowserWindow | null = null;

/**
 * Server Preload Events to gather information about the environment before the UI launches
 */

// loads the application path where the exe is run, this is needed to lookup information about the installed patches.
let appPath: string;
let fileManager: FileManager;
if (process.platform === 'win32') {
  appPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR || '', 'Wow.exe');
  fileManager = new FileManager(process.env.PORTABLE_EXECUTABLE_DIR || '');
} else {
  appPath = '/System/Applications/Chess.app';
  fileManager = new FileManager(path.join(__dirname, '../../dist/')); // will handle macs even though we will never be building for one.
}

/**
 * This will return all the information of the file system installed in the directory.
 */
 ipcMain.handle(Channels.APP_INFO, async () => {
  return {
    version: '3.3.5 (v1)',
    credits: 'ben-of-codecraft',
    lastupdate: '2023-09-03',
    execpath: process.env.PORTABLE_EXECUTABLE_DIR,
    HD: await fileManager.IsHDSetup(),
    HDExtra: await fileManager.IsHDExtraSetup(),
    Features: await fileManager.IsFeaturesSetup(),
    Araxia: await fileManager.IsAraxiaSetup(),
  };
});


ipcMain.on(Channels.WOW_LAUNCH, (event, arg) => {
  if (!fs.existsSync(appPath)) {
    event.reply(Channels.WOW_LAUNCH_ERROR, {
      type: 'FileError',
      message: `WoW application not found or permissions are not set to readable: ${appPath}`,
    } as ErrorEvent);
  }

  let childProcess;
  if (process.platform === 'darwin') {
    childProcess = spawn('open', [appPath]);
  } else {
    childProcess = spawn(appPath);
  }

  childProcess.on('close', (code) => {
    console.info(`WoW client exited with code: ${code}`);
  });

  childProcess.on('exit', () => {
    console.info('WoW client exited');
  });

  childProcess.on('exit', () => {
    console.info('Child process is launched closing window');
    // event.reply(Channels.WOW_CLIENT_EXIT);
    mainWindow?.close();
  });

  mainWindow?.close();
});


if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

// if (isDebug || true) {
//   require('electron-debug')();
// }

// const installExtensions = async () => {
//   const installer = require('electron-devtools-installer');
//   const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
//   const extensions = ['REACT_DEVELOPER_TOOLS'];

//   return installer
//     .default(
//       extensions.map((name) => installer[name]),
//       forceDownload
//     )
//     .catch(console.log);
// };

const createWindow = async () => {
  if (isDebug) {
    // await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('wothlk.ico'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      nodeIntegration: true,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // const menuBuilder = new MenuBuilder(mainWindow);
  // menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    globalShortcut.register('Alt+D', () => {
      BrowserWindow.getFocusedWindow()?.webContents.openDevTools();
    });

    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
