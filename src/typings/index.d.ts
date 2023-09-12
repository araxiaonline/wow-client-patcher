import { IpcRendererEvent } from 'electron';

declare global {
  /**
   * Global Window object used to facilitate communication between the
   * renderer and main processes.
   */
  interface Window {
    api: LauncherServer.Api;
  }
}

/**
 * Used to delcare file types to TypeScript that are not modules
 */
declare module '*.png';
declare module '*.jpeg';
declare module '*.mp3' {
  const value: any;
  export default value;
}

declare namespace WowLauncher {
  /*
   * Information about the application.
   */
  interface AppInfo {
    /**
     * The current version of the application.
     */
    version: string;
    /**
     * Contributors to the application and their contributions.
     */
    credits: string;
    /**
     * The last time the application was updated.
     */
    lastupdate: string;
    /**
     * The original path to the executable of the application. This is different
     * than a potentially temporary path where the actual exe runs; this is the directory
     * where the exe is located. This is used to communicate with the external WoW exe
     * and collect information about the installed WoW client.
     */
    execpath: string;
    /**
     * Manifest of files on host machine
     */
    manifest: Manifest;

    /**
     * Whether or not the HD patch is installed.
     */
    HD: boolean;
    /**
     * Whether or not the HD Extra patch is installed.
     */
    HDExtra: boolean;
    /**
     * Whether or not the Fearure patches are installed
     */
    Features: boolean;
    /**
     * Whether or not Araxia patches are installed.
     */
    Araxia: boolean;
  }

  interface Manifest {
    /**
     * List of files currently present on the user's machine that are not part of the vanilla installation.
     * from ChromieCraft. <https://www.chromiecraft.com/en/downloads/>
     */
    patchfiles: PatchFile[];
    /**
     * Last time the manifest was updated.
     */
    lastupdate: string;
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
}

declare namespace LauncherUI {
  /**
   * Server response data to server about the latest information about the client patches.
   */
  interface RemoteServer {
    /**
     * Server patch version.
     */
    version: string;
    /**
     * List of changes made in the patch.
     */
    changelog: string[];
    /**
     * Date the patch was released.
     */
    date: string;
    /**
     * Who made the patch.
     */
    updatedby: string;
    /**
     * List of files that were changed in the patch. That need to be downloaded
     * and replaced on the client.
     */
    filelist: string[];
  }
}

export { LauncherServer, LauncherUI, WowLauncher };
