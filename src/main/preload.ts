/* eslint-disable no-console */
import { contextBridge, ipcRenderer } from 'electron';
import { Channels } from '../constants';
import { LauncherServer, DownloadCallbacks } from '../typings';

function apiCaller(method: LauncherServer.Methods, ...args: any[]): Promise<any>{
  return ipcRenderer.invoke(Channels.APP_API, method, ...args);
}

/**
 * Wrapper around the ipcRenderer to handle the download events
 * Since you can not
 * ss complex object through the IPC Channel this is used
 * to relay the results of downloads happening on the server to the renderer.
 *
 * Every download that is requested by the users will track status on these channels.
 */
class DownloadListener {
     constructor(callbacks: DownloadCallbacks) {

      ipcRenderer.on(Channels.DOWNLOAD_START, (event, args ) => {
        callbacks.start?.({
          totalBytes: args.total,
          remoteFile: args.files
        });
      });

      ipcRenderer.on(Channels.DOWNLOAD_END, (event, args ) => {
        callbacks.end?.(args);
      });

      ipcRenderer.on(Channels.DOWNLOAD_PROGRESS, (event, args ) => {
        callbacks.data?.(args);
      });

      ipcRenderer.on(Channels.DOWNLOAD_BATCH_START, (event, args ) => {
        callbacks.batchStart?.(args);
      });

      ipcRenderer.on(Channels.DOWNLOAD_BATCH_END, (event, args ) => {
        callbacks.batchEnd?.(args);
      });

      ipcRenderer.on(Channels.DOWNLOAD_BATCH_DATA, (event, args ) => {
        callbacks.batchData?.(args);
      });
    }
}

const handleInstall = async (apiMethodName: LauncherServer.Methods, callbacks: DownloadCallbacks) => {
  // this registers callbacks on the object
  const downloadListener = new DownloadListener(callbacks);

  try {
    await apiCaller(apiMethodName);
  } catch (error: any) {
    const msg = `Install Error: getting install details: ${error.message}`;

    return {
      type: 'Install',
      message: msg,
    } as ErrorEvent;
  }
  return null;
};

/**
 * All the API's exposed to the renderer process
 */
const IPCApi: LauncherServer.Api = {
  Launch: () => {
    ipcRenderer.send(Channels.WOW_LAUNCH);
  },

  OnExitApp: (handler) => {
    ipcRenderer.on(Channels.WOW_CLIENT_EXIT, handler);
  },

  OnLaunchError: (handler) => {
    ipcRenderer.on(
      Channels.WOW_LAUNCH_ERROR,
      (event: any, error: ErrorEvent) => {
        console.info(
          `WoW client exited with Error: [${error.type}]: ${error.message}`
        );
        handler(event, error);
        ipcRenderer.removeAllListeners(Channels.WOW_LAUNCH_ERROR);
      }
    );
  },
  GetAppInfo: async () => {

    try {
      const appInfo = await ipcRenderer.invoke(Channels.APP_INFO);
      return appInfo;
    } catch (error: any) {
      const msg = `Error getting app info: ${error}`;
      console.log(error);

      return {
        type: 'Parse',
        message: msg,
      } as ErrorEvent;
    }
  },

  GetInstalledPatches: async (type: string) => {
    try {
      const installDetails = await ipcRenderer.invoke(
        Channels.APP_API,
        { method: 'GetInstalledPatches', type }
      );
      return installDetails;
    } catch (error: any) {
      const msg = `Error getting install details: ${error}`;
      console.error(msg);

      return {
        type: 'Parse',
        message: msg,
      } as ErrorEvent;
    }
  },
  InstallStore: async (callbacks: DownloadCallbacks) => {
    await handleInstall('InstallAIO', callbacks);
  },

  PatchWoW: async () => {
    await handleInstall('PatchWow', {});
  },

  InstallHD: async (callbacks: DownloadCallbacks) => {
    await handleInstall('InstallHD', callbacks);
  },

  InstallMisc: async (callbacks: DownloadCallbacks) => {
    handleInstall('InstallMisc', callbacks);
  },

  InstallUpdates: async (callbacks: DownloadCallbacks) => {
    handleInstall('InstallUpdates', callbacks);
  },

  GetUpdate: async () => {
    ipcRenderer.send(Channels.GET_UPDATE);
  }
};

contextBridge.exposeInMainWorld('api', IPCApi);
