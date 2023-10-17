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
import log from 'electron-log';
import { app, BrowserWindow, shell, ipcMain, globalShortcut } from 'electron';

// Typings, Interfaces, and Constants
import { LauncherServer } from 'typings';
import Downloader from './libs/Downloader';
import { Channels } from '../constants';

// import { autoUpdater } from 'electron-updater';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import FileManager from './libs/FileManager';
import AutoUpdate from './libs/AutoUpdate';

const showdown = require('showdown');

let mainWindow: BrowserWindow | null = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug = process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

const createWindow = async () => {

let RESOURCES_PATH: string;
if(app.isPackaged) {
  RESOURCES_PATH = path.join(process.resourcesPath, 'assets');
} else {
  RESOURCES_PATH = path.join(__dirname, '../../assets');
}

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    icon: getAssetPath('wothlk.ico'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
        nodeIntegration: false,
        sandbox: false
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


  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

};

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

  /** ************************************************
   * Event Management for IPC
   ************************************************* */
// loads the application path where the exe is run, this is needed to lookup information about the installed patches.
let appPath: string;
let fileManager: FileManager;
const autoUpdater = new AutoUpdate();

if (process.platform === 'win32') {
  if(process.env.PORTABLE_EXECUTABLE_DIR) {
    appPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'Wow.exe')
    fileManager = new FileManager(process.env.PORTABLE_EXECUTABLE_DIR || '')
  } else {
    appPath = path.join(__dirname, '../../mockGame','Wow.exe');
    fileManager = new FileManager(path.join(__dirname, '../../mockGame'));
  }

} else {
  appPath = '/System/Applications/Chess.app';
  fileManager = new FileManager(path.join(__dirname, '../../dist/')); // will handle macs even though we will never be building for one.
}


/**
 * This will return all the information of the file system installed in the directory.
 */
 ipcMain.handle(Channels.APP_INFO, async () => {
  const version = await fileManager.GetVersion();

  // Get the news and convert it to html
  const news = await fileManager.GetLatestNews();
  const converter = new showdown.Converter();
  const newHtml = converter.makeHtml(news);
  const remoteInfo = await fileManager.GetRemoteVersion();
  const localInfo = await fileManager.GetVersion();
  const latestAppVersion = await autoUpdater.getLatestVersion();

  let versionFile:string;
  if(app.isPackaged) {
    versionFile = fs.readFileSync(path.join(__dirname,'./RELEASE.json'), 'utf8');
  } else {
    versionFile = fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8');
  }

  // move the bc movie over
  await fileManager.AddMovieTBC();

  const versionjson = JSON.parse(versionFile.toString());
  const VERSION = versionjson.release;

  const appInfo = {
    AppVersion: `v${VERSION}`,
    LatestAppVersion: latestAppVersion,
    Version: localInfo.Version,
    LastUpdate: localInfo.LastUpdate,
    ExecPath: process.env.PORTABLE_EXECUTABLE_DIR,
    HD: await fileManager.IsHDSetup(),
    Misc: await fileManager.IsMiscSetup(),
    WoWInstalled: await fileManager.IsWoWInstalled(),
    WoWPatched: await fileManager.IsWoWPatched(),
    AIOInstalled: await fileManager.IsAIOInstalled(),
    LatestNews: newHtml,
    RemoteVersion: remoteInfo[0]?.version,
  };

  console.log(appInfo);
  return appInfo;
});

(async () => {

  // const remoteInfo = await fileManager.GetRemoteVersion();
  // const custom = await fileManager.GetCustomFiles();
  // console.log(custom);

})();

ipcMain.on(Channels.GET_UPDATE, async (event, arg) => {
  const latestAppVersion = await autoUpdater.getLatestVersion();
  shell.openExternal(`https://github.com/araxiaonline/wow-client-patcher/releases/tag/${latestAppVersion}`);
});

/**
 * We have to redirect events from the main process to the render process as they are fired this allows the
 * frontend to attach the backend event listeners, complex objects can not be handled by ipcRenderer.
 * @param downloader
 */
function passthrough(downloader: Downloader) {

  downloader.on('start', (event) => {
    try {
      mainWindow?.webContents.send(Channels.DOWNLOAD_START, {
        totalBytes: event.totalBytes,
        remoteFile: event.remoteFile
      });
    } catch (error: any) {
      console.log(error.message);
    }

  });
  downloader.on('data', (event) => {
    mainWindow?.webContents.send(Channels.DOWNLOAD_PROGRESS, event);
  });
  downloader.on('end', (event) => {
    mainWindow?.webContents.send(Channels.DOWNLOAD_END, event);
  });
  downloader.on('batchStart', (event) => {
    mainWindow?.webContents.send(Channels.DOWNLOAD_BATCH_START, event);
  });
  downloader.on('batchData', (event) => {
      mainWindow?.webContents.send(Channels.DOWNLOAD_BATCH_DATA, event);
  });
  downloader.on('batchEnd', (event) => {
    mainWindow?.webContents.send(Channels.DOWNLOAD_BATCH_END, event);
  });
}

/**
 * Main Calls to backend Filemanager
 */
ipcMain.handle(Channels.APP_API, async (event, method: LauncherServer.Methods, ...args)  => {

  switch (method) {
    case 'GetInstalledPatches': {
      // return await fileManager.GetInstalledPatches(args[0]);
      break;
    }
    case 'InstallAIO': {
      const result = await fileManager.InstallAIO();

      if(result instanceof Downloader) {
         passthrough(result);
      }
      break;
    }
    case 'PatchWow': {
      const result = await fileManager.PatchWowExe();
      return true;
    }

    case 'InstallHD': {
      const result = await fileManager.InstallPatches('hd');

      if(result instanceof Downloader) {
        passthrough(result);
      }
      break;
    }
    case 'InstallMisc': {
      const result = await fileManager.InstallPatches('misc');

      if(result instanceof Downloader) {
        passthrough(result);
      }
      break;
    }
    case 'InstallUpdates': {
      const result = await fileManager.InstallUpdates();

      if(result instanceof Downloader) {
        passthrough(result);
      }
      break;
    }
    default:
      log.error(`Unknown method: ${method}`);
      break;

  }

  return null;
});


ipcMain.on(Channels.WOW_LAUNCH, (event, arg) => {
  if (!fs.existsSync(appPath)) {
    event.reply(Channels.WOW_LAUNCH_ERROR, {
      type: 'FileError',
      message: `WoW application not found or permissions are not set to readable: ${appPath}`,
    } as ErrorEvent);
    console.error(`WoW application not found or permissions are not set to readable: ${appPath}`);
  }

  if(!app.isPackaged) {
    // appPath = "C:\\Users\\benca\\Desktop\\WoW\\WorldOfWarcraft_3.3.5a-unpatched\\Wow.exe";
  }

  console.log(`Launching WoW client: ${appPath}`);
  const childProcess = spawn(appPath, {
    detached: true
  });

  childProcess.on('close', (code) => {
    console.info(`WoW client exited with code: ${code}`);
  });

  childProcess.on('error', (err) => {
    console.log(err);
  });

  setTimeout(() => {
    mainWindow?.close();
  }, 1000);

});


