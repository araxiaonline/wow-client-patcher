import { IpcRendererEvent } from 'electron';
import { DownloadEventMap } from 'main/libs/Downloader';

declare global {
  /**
   * Global Window object used to facilitate communication between the
   * renderer and main processes.
   */
  interface Window {
    api: LauncherServer.Api;
    batchCallbacks: DownloadCallbacks
  }
}

type Callbacks<T> = {
  [K in keyof T]?: (params: T[K]) => void;
};

export type DownloadCallbacks = Callbacks<DownloadEventMap>;

declare namespace WowLauncher {
  /*
   * Information about the application.
   */
  interface AppInfo {
    /**
     * The current version of the application. It is pulled from the package.json file.
     */
    AppVersion: string;

    /**
     * Latest App Version from Github releases
     */
    LatestAppVersion: string;

    /**
     * The current version of the application.
     */
    Version: string;

    /**
     * The last time the application was updated.
     */
    LastUpdate: string;
    /**
     * The original path to the executable of the application. This is different
     * than a potentially temporary path where the actual exe runs; this is the directory
     * where the exe is located. This is used to communicate with the external WoW exe
     * and collect information about the installed WoW client.
     */
    ExecPath: string;
    /**
     * Whether or not the HD patch is installed.
     */
    HD: boolean;

    /**
     * Whether or not the Fearure patches are installed
     */
    Misc: boolean;
    /**
     * Whether or not Araxia patches are installed.
     */
    Araxia: boolean;

    /**
     * Whether or not the WoW client is installed.
     */
    WoWInstalled: boolean;

    /**
     * Whether or not the WoW client is patched.
     */
    WoWPatched: boolean;

    /**
     * Whether or not the AIO patch is installed.
     */
    AIOInstalled: boolean;

    /**
     * The latest news about the application.
     */
    LatestNews: string;

    /**
     * The remote version of the client.
     */
    RemoteVersion: string;
  }

  interface PatchFile {
    /**
     * Name of the file
     */
    name: string;
    /**
     * What the file patch contains and what it does to client
     */
    description: string;
  }
}

declare namespace LauncherServer {
  /**
   * Backend API used to handle responses to user interactions with the application.
   */
  interface Api {
    /**
     * Runs the logic to launch the WoW client on the user's machine.
     */
    Launch: () => void;

    /**
     * Called with the WoW Clien fails to load.
     */
    OnLaunchError: (
      errorHandler: (event: IpcRendererEvent, ...args: any[]) => void
    ) => void;

    /**
     * Called when the WoW client exits.
     */
    OnExitApp: (
      exitHandler: (event: IpcRendererEvent, ...args: any[]) => void
    ) => void;

    /**
     * Returns the current version of the WoW client installed on the user's machine.
     * If not detected, the version returned is "3.3.5a-v0" (the base version of the client).
     */
    GetAppInfo: () => Promise<WowLauncher.AppInfo | null>;

    /**
     * Patches the server Wow.exe with the patched version if needed.
     */
    PatchWoW: () => void;

    /**
     * Returns the list of files that are currently installed on the user's machine.
     */
    GetInstalledPatches(type: string): Promise<WowLauncher.PatchFile[] | null>;

    /**
     *
     * @param callbacks Installs addon required to login to the store.
     * @returns
     */
    InstallStore: (callbacks: any) => void;

    /**
     * Install HD patches from server
     * @param callbacks
     * @returns
     */
    InstallHD: (callbacks: any) => void;

    /**
     * Installs Misc patches from server
     * @param callbacks
     * @returns
     */
    InstallMisc: (callbacks: any) => void;

    /**
     * Installs custom content updates from server
     * @param callbacks
     * @returns
     */
    InstallUpdates: (callbacks: any) => void;

    /**
     * Returns the latest version of the client from the remote server.
     * @returns Link to the latest binary of the file
     */
    GetUpdate: () => void;

  }

  /**
   * Error events for IPC communication and remote communication
   */
  interface ErrorEvent {
    /**
     * type used for declaring type of error that occurred.
     * - File: Error occurred while reading or writing to a file.
     * - Request: Error occurred while making a request to the file server.
     * - Parse: Error occurred while parsing a file or assigning an object.
     * - Generic: Error occurred that is not related to a file or request.
     */
    type: 'File' | 'Request' | 'Generic' | 'Parse';
    message: string;
  }

  type Methods =
  'InstallAIO' |
  'GetInstalledPatches' |
  'PatchWow' |
  'InstallHD' |
  'InstallMisc' |
  'GetRemoteVersion' |
  'InstallUpdates';
}

/**
 * List of files and tags showing last time they were changed. Additionally, this
 * is used to determine the current version of the client.
 */
declare interface Manifest {
  /**
   * The version the current client with patching
   */
  Version: string;
  /**
   * List of files currently present on the user's machine that are not part of the vanilla installation.
   */
  Files: Record<string, any>;
  /**
   * Last time the manifest was updated.
   */
  LastUpdate: string;
}

export { LauncherServer, WowLauncher, Manifest };
