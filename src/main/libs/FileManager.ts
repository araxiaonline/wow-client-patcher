import { WowLauncher, Manifest } from 'typings';

import fs from 'fs-extra';
import path, { join } from 'path';
import * as crypto from 'crypto';
import AdmZip from 'adm-zip';
import  log from 'electron-log';
import { Mutex } from 'async-mutex';

import Downloader from './Downloader';
import { santizeETag } from '../util';

// Confiruation of file management
import config from "../config.json";

/**
 * Groupings of Patchfiles that are from external sources
 */
export const HDPatchList: WowLauncher.PatchFile[] = config.patches.HDContent;
export const MiscPatchList: WowLauncher.PatchFile[] = config.patches.misc;
export const Reserved: WowLauncher.PatchFile[] = config.patches.reserved;
export const Experimental: WowLauncher.PatchFile[] = config.patches.experimental;

/**
 * Addons that can be installed to the client for the user
 */
export const AddOns: WowLauncher.PatchFile[] = config.addOns;

type patchGroup = 'hd' | 'misc' | 'reserved' | 'experimental';

const AIORemotePath = `${config.remotePaths.aio}/AIO_Client.zip`;
const AIOLocalPath = 'Interface/AddOns/AIO_Client.zip';

type VersionDetails = {
  version: string;
  lastupdate: string;
  by: string;
  files: WowLauncher.PatchFile[];
};

type Versions = VersionDetails[];

/**
 * This is the main backend library of the updater that is responsible for
 * remote file reads, local file writes, and application information stored in files.
 *
 * The system is completely managed over a S3 endpoint which can use AWS S3 Cloud service
 * or Garage HQ (if you want to host your own open source SDK compatible Server) for more inforation
 * go here: https://garagehq.deuxfleurs.fr/documentation/quick-start/
 *
 * Everything this class does is built of the config.json at the root of this folder.
 *
 * This class uses many function from Downloader class to manager downloading of files and getting information from
 * the Remote object host. There are 2 ways to reference the Downloader class and use cases are described below:
 * 1. this.downloader - This should be used internally for this class when looking up information or when download
 * events do not need to be handled by the main process.
 * 2. DownloaderInstance - This function will create a new Downloader object that can be exposed by scope. This is used
 * when you expect to export the downloader events for a main process to add event handlers to.
 *
 * @class FileManager
 * @export FileManager
 * @param basePath <string> | path to the root of the game files
 */
export default class FileManager {
  private basePath: string;
  private dataPath: string;
  private addOnsPath: string;
  private extraResources: string;
  private allPatches: WowLauncher.PatchFile[] = [];
  private patchNames: string[] = [];
  private manifestFile: string;
  private downloader: Downloader;
  private remoteVersions: Versions = [];
  private manifestMutex: Mutex = new Mutex();

  constructor(basePath: string) {
    // This sets up all local paths for the file manager
    this.basePath = basePath;
    this.dataPath = path.join(this.basePath, 'Data');
    this.addOnsPath = path.join(this.basePath, 'Interface', 'AddOns');
    this.extraResources = path.join(__dirname, '../../../extraResources');
    this.manifestFile = path.join(this.basePath, 'manifest.json');

    // This sets up all the patches that can be installed
    this.allPatches = [
      ...HDPatchList,
      ...MiscPatchList,
      ...Experimental,
    ];
    this.patchNames = this.allPatches.map((patch) => patch.name);

    this.downloader = new Downloader({
      bucket: config.aws.bucket,
      root: this.basePath,
      s3config: config.aws,
    });
  }

  /**
   * Get an instance of the downloader with base configuration.
   * @returns Downloader
   */
  DownloaderInstance(): Downloader {
    return new Downloader({
      bucket: config.aws.bucket,
      root: this.basePath,
      s3config: config.aws,
    });
  }

  /**
   * Cache folder is a safe place to store files that can be referenced later, but can be deleted.
   * @returns {Promise<string>} The path to the cache folder
   */
  async GetCacheFolder(): Promise<string> {

    if(!fs.existsSync(path.join(this.basePath, 'Cache/WL'))) {
      fs.mkdirSync(path.join(this.basePath, 'Cache/WL'), { recursive: true });
    }

    return 'Cache/WL';
  }

  /**
   * Get remote version information from the server
   * @returns {Promise<Versions>} List of versions from the server
   */
  async GetRemoteVersion(): Promise<Versions> {

    if(this.remoteVersions.length > 0) {
      return this.remoteVersions;
    }

    const cacheFolder = await this.GetCacheFolder();
    const downloader = this.DownloaderInstance();
    const result = await downloader.downloadFile(
      'version.json',
      path.join(cacheFolder,'version.json')
    );
    if (!result) {
      throw new Error('Failed to download version file');
    }

    const jsonfile = await fs.promises.readFile(path.join(this.basePath, cacheFolder, 'version.json'), 'utf8')
    const parsed = JSON.parse(jsonfile);
    this.remoteVersions = parsed.versions as Versions;

    return this.remoteVersions;
  }

  /**
   * Total List of files from updates that need to be installed.
   * @returns {Promise<WowLauncher.PatchFile[]>} List of custom files from versions that need installed
   */
  async GetCustomFiles(): Promise<WowLauncher.PatchFile[]> {
    const remoteVersion = await this.GetRemoteVersion();

    if(remoteVersion.length === 0) {
      throw new Error('No remote version information');
    }

    const customFiles: WowLauncher.PatchFile[] = [];
    const map = new Map();
    remoteVersion.forEach((version: VersionDetails) => {
      for(const file of version.files) {
        if(!map.has(file.name)){
          map.set(file.name, true);    // set any value to Map
          customFiles.push({
            name: file.name,
            description: file.description,
          });
        }
      }
    });

    return customFiles;
  }

  /**
   * Latest news comes in the form of a markdown file.
   * @returns {Promise<string>} The latest news from the server.
   */
  async GetLatestNews(): Promise<string> {

    const cacheFolder = await this.GetCacheFolder();
    const downloader = this.DownloaderInstance();
    const news = await downloader.getLatestNews();

    if(news === undefined) {
      return '';
    }

    fs.writeFile(path.join(this.basePath, cacheFolder, 'news.md'), news);
    return news;
  }

  /**
   * Get the installed version of the client files.
   * @returns {Promise<string>} The local version of the client.
   */
  async GetVersion(): Promise<Manifest> {
    const manifest: Manifest = await this.GetManifest();
    return manifest;
  }

  /**
   * Gets the list of installed patches on the host machine.
   * @returns {Promise<WowLauncher.PatchFile[] | null>} List of all installed patches.
   */
  async GetInstalledPatches(): Promise<WowLauncher.PatchFile[] | null> {
    const filelist = await fs.promises.readdir(this.dataPath);
    const installed = filelist
      .filter((file) => file.endsWith('.MPQ') && this.patchNames.includes(file))
      .map((file) => this.allPatches.find((patch) => patch.name === file)!)
      .filter((patch) => !!patch);

    const patchesToRemove = await Promise.all(
      installed.map(async (patch) => {
        const isPatched = await this.IsPatched(patch.name);
        if (!isPatched) {
          return patch; // Return the patch that needs to be removed
        }
        return null; // Return null for patches that should not be removed
      })
    ).catch((error) => {
      throw new Error(`Failed to check if patches are patched: ${error}`);
    });

    const patchedInstalls = installed.filter(
      (patch) => !patchesToRemove?.includes(patch)
    );

    return patchedInstalls;
  }

  /**
   * This will determine if the patch locally matches the remote patch.
   * @param patch <string> | name of the patch to compare
   * @returns
   */
  async IsPatched(patch: string): Promise<boolean> {
    const manifest = await this.GetManifest();
    const remoteETag = await this.downloader.getETag(`patches/${patch}`);

    if (!manifest.Files[`patches/${patch}`]) {
      return false;
    }

    return manifest.Files[`patches/${patch}`] === santizeETag(remoteETag);
  }

  /**
   * Get list of of which HD patches are installed.
   * @returns {Promise<WowLauncher.PatchFile[] | null>} List of installed HD patches.
   */
  async GetInstalledHDPatches(): Promise<WowLauncher.PatchFile[] | null> {
    const installed = await this.GetInstalledPatches();
    const hdPatches =
      installed?.filter((patch) => HDPatchList.includes(patch)) ?? null;

    return hdPatches;
  }

  /**
   * Custom Content allows for patches and addOns to be uploaded.  This function
   * will handle each type of content. Based on the files requested by versions.
   *
   * @returns {Promise<Downloader | boolean>} Downloader instance if patches need to be installed, false if not.
   */
  async InstallUpdates(): Promise<Downloader | boolean> {
    const files = await this.GetCustomFiles();

    const downloader = this.DownloaderInstance();
    const filemapping: { remotePath: string; localPath: string }[] = [];
    let localPath = 'Data/';

    files.forEach((file) => {

      // custom content can also include addons in the file type
      if(file.name.includes('addOns')) {
        localPath = 'Interface/AddOns/';
      }

      filemapping.push({
        remotePath: `${file.name}`,
        localPath: path.join(localPath, path.basename(file.name)),
      });
    });

    downloader.on('end', async ({ file }) => {
      let baseName = 'custom/';

      if(file.includes('addOns')) {
        setTimeout(() => {
          const zip = new AdmZip(path.join(this.basePath, file));
          zip.extractAllTo(path.join(this.basePath, 'Interface/AddOns'), true);
        }, 200);

        baseName = 'custom/addOns/';

      }
      const remotefile = `${baseName}${path.basename(file)}`;
      const etag = await downloader.getETag(remotefile);

      this.UpdateManifest(remotefile, etag);
    });

    downloader.on('batchEnd', async () => {
      await this.UpdateLocalVersion();
    });

    downloader.downloadFiles(filemapping);
    return downloader;
  }

  /**
   * Install a set of patches that are not installed.
   * @param group: patchGroup
   * @returns {Promise<Downloader | boolean>} Downloader instance if patches need to be installed, false if not.
   */
  async InstallPatches(group: patchGroup): Promise<Downloader | boolean> {
    let patches: WowLauncher.PatchFile[] | null = null;
    switch (group) {
      case 'hd':
        patches = await this.GetMissingHDPatches();
        break;
      case 'misc':
        patches = await this.GetMissingMiscPatches();
        break;
      case 'experimental':
        /** @TODO Future Implementation */
        break;
      default:
        patches = null;
        break;
    }

    if (patches) {
      const downloader = this.DownloaderInstance();

      const filemapping: { remotePath: string; localPath: string }[] = [];
      patches.forEach((patch): void => {
        filemapping.push({
          remotePath: `patches/${patch.name}`,
          localPath: `Data/${patch.name}`,
        });
      });

      downloader.on('end', async ({ file }) => {
        const remotefile = `patches/${path.basename(file)}`;
        const etag = await downloader.getETag(remotefile);
        this.UpdateManifest(remotefile, etag);
      });

      downloader.downloadFiles(filemapping);
      return downloader;
    }
    return false;
  }

  /**
   * Get the list of HD patches that are not installed.
   * @returns {Promise<WowLauncher.PatchFile[] | null>} List of HD patches that are not installed.
   */
  async GetMissingHDPatches(): Promise<WowLauncher.PatchFile[] | null> {
    const installed = await this.GetInstalledPatches();
    const missing =
      HDPatchList.filter((patch) => !installed?.includes(patch)) ?? null;

    return missing;
  }

  /**
   * Get the list of extra HD patches that are installed.
   * @returns {Promise<WowLauncher.PatchFile[] | null>} List of extra HD patches that are installed.
   */
  async GetInstalledMiscPatches(): Promise<WowLauncher.PatchFile[] | null> {
    const installed = await this.GetInstalledPatches();
    const extraPatches =
      installed?.filter((patch) => MiscPatchList.includes(patch)) ?? null;

    return extraPatches;
  }

  /**
   * Get the list of extra HD patches that are not installed.
   * @returns {Promise<WowLauncher.PatchFile[] | null>} List of extra HD patches that are not installed.
   */
  async GetMissingMiscPatches(): Promise<WowLauncher.PatchFile[] | null> {
    const installed = await this.GetInstalledPatches();
    const missing =
      MiscPatchList.filter((patch) => !installed?.includes(patch)) ?? null;
    return missing;
  }

  /**
   * Get the list of reserved custom patches that are installed.
   */
  async GetCustomPatches(): Promise<WowLauncher.PatchFile[] | null> {
    const installed = await this.GetInstalledPatches();
    const remoteVersion = await this.GetRemoteVersion();

    const araxia =
      installed?.filter((patch) => Reserved.includes(patch)) ?? null;
    return araxia;
  }

  /**
   * Get the list of reserved custom patches that are not installed.
   */
  async GetMissingCustomPatches(): Promise<WowLauncher.PatchFile[] | null> {
    const installed = await this.GetInstalledPatches();
    const missing =
      Reserved.filter((patch) => !installed?.includes(patch)) ?? null;
    return missing;
  }

  /**
   * Check if all HD patches are installed.
   * @return {Promise<boolean>} True if all HD patches are installed.
   */
  async IsHDSetup(): Promise<boolean> {
    const missing = await this.GetMissingHDPatches();
    return missing?.length === 0;
  }

  /**
   * Check if all feature patches are installed.
   * @returns {Promise<boolean>} True if all feature patches are installed.
   */
  async IsMiscSetup(): Promise<boolean> {
    const missing = await this.GetMissingMiscPatches();
    return missing?.length === 0;
  }

  /**
   * Check if all custom patches are installed
   * @returns {Promise<boolean>} True if all Araxia patches are installed.
   */
  async IsCustomSetup(): Promise<boolean> {
    const installed = await this.GetInstalledPatches();
    const missing =
      Reserved.filter((patch) => !installed?.includes(patch)) ?? null;
    return missing?.length === 0;
  }

  /**
   * IS Wow.exe installed in the current director
   * @returns {Promise<boolean>} True if Wow.exe is installed.
   */
  async IsWoWInstalled(): Promise<boolean> {
    return fs.existsSync(path.join(this.basePath, 'Wow.exe'));
  }

  /**
   * Is the base game patched to allow custom content and more memory for users?
   * @returns {Promise<boolean>} True if the base game is patched.
   */
  async IsWoWPatched(): Promise<boolean> {
    const wowExe = path.join(this.basePath, 'Wow.exe');
    const content = await fs.promises.readFile(wowExe);
    const hash = crypto.createHash('md5').update(content);

    return config.wowexe.patched_md5 === hash.digest('hex');
  }

  /**
   * Replaces the default logo movie for a TBC movie
   * @returns
   */
  async AddMovieTBC(): Promise<void> {
    const logoMovie800 = path.join(this.dataPath, 'enUS/Interface/Cinematics/Logo_800.avi');
    const logoMovie1024 =  path.join(this.dataPath, 'enUS/Interface/Cinematics/Logo_1024.avi');

    const tbcMovie800 = path.join(this.dataPath, 'enUS/Interface/Cinematics/WOW_Intro_BC_800.avi');
    const tbcMovie1024 = path.join(this.dataPath, 'enUS/Interface/Cinematics/WOW_Intro_BC_1024.avi');

    // if the movies have already been copied exit.
    if(fs.existsSync(`${logoMovie800}.old`)) {
      return;
    }

    fs.moveSync(logoMovie800, `${logoMovie800}.old`);
    fs.moveSync(logoMovie1024, `${logoMovie1024}.old`);
    fs.copySync(tbcMovie800, logoMovie800);
    fs.copySync(tbcMovie1024, logoMovie1024);
  }

  /**
   * This will patch the local wow.exe with a patched version of wow.exe
   */
  async PatchWowExe(): Promise<void> {
    await fs.promises.copyFile(
      path.join(this.basePath, 'Wow.exe'),
      path.join(this.basePath, 'Wow.exe.bak')
    );
    await fs.promises.copyFile(
      path.join(this.extraResources, 'Wow.exe'),
      path.join(this.basePath, 'Wow.exe')
    );
  }

  /**
   * AIO client by rochet2 is required to be installed on the client for the store
   * to be in the client.  This checks the manifest and the local file system
   * @returns {Promise<boolean>} True if the AIO client is installed.
   */
  async IsAIOInstalled(): Promise<boolean> {
    const aioETag = await this.downloader.getETag(AIORemotePath);
    const inManifest = await this.CheckManifest(AIORemotePath, aioETag);
    const aioClient = path.join(this.addOnsPath, 'AIO_Client/AIO_Client.toc');

    const patchS = await this.downloader.getETag('patches/patch-S.MPQ');
    const isPatched = await this.CheckManifest('patches/patch-S.MPQ', patchS);

    if (!inManifest || !fs.existsSync(aioClient) || !isPatched) {
      return false;
    }

    return true;
  }

  /**
   * Get the manifest files that decribes what things have been installed by the
   * client.
   * @returns {Promise<Manifest>} The manifest file.
   */
  async GetManifest(): Promise<Manifest> {
    let manifest: Manifest;

    const release = await this.manifestMutex.acquire();
    try {
      if (!fs.existsSync(this.manifestFile)) {
        manifest = {
          Version: 'v0',
          LastUpdate: new Date().toISOString(),
          Files: {},
        };

        await fs.promises.writeFile(
          this.manifestFile,
          JSON.stringify(manifest, null, 2)
        );
      } else {
        manifest = JSON.parse(
          await fs.promises.readFile(this.manifestFile, 'utf8')
        ) as Manifest;
      }
    } finally {
      release();
    }

    return manifest;
  }

  /**
   * Checks the local manifest file to see if the file has changed.
   * @param filename <string> | name of file to check
   * @param tag <string> | ETag of the file to check to see if it has changed
   */
  async CheckManifest(filename: string, tag: string): Promise<boolean> {
    const manifest = await this.GetManifest();
    return manifest.Files[filename] === santizeETag(tag);
  }

  /**
   * Update the manifest file with the new ETag from the S3 server
   * @param filename <string> | path to the file
   * @param tag < string> | ETag of the file
   */
  async UpdateManifest(filename: string, tag: string): Promise<void> {
    const manifest = await this.GetManifest();

    const release = await this.manifestMutex.acquire();
    try {
      manifest.Files[filename] = santizeETag(tag);
      manifest.LastUpdate = new Date().toISOString();
      await fs.promises.writeFile(
        this.manifestFile,
        JSON.stringify(manifest, null, 2)
      );
    } finally {
      release();
    }

  }

  /**
   * This updates the client version to the latest versin from the server
   */
  async UpdateLocalVersion() {
    const manifest = await this.GetManifest();
    const remoteVersion = await this.GetRemoteVersion();

    const release = await this.manifestMutex.acquire();
    try {
      manifest.Version = remoteVersion[0].version;
      manifest.LastUpdate = new Date().toISOString();
      await fs.promises.writeFile(
        this.manifestFile,
        JSON.stringify(manifest, null, 2)
      );
    } finally {
      release();
    }
  }

  /**
   * Downloads AIO from the client and saves it to the local machine
   */
  async InstallAIO(): Promise<Downloader | boolean> {
    const installed = await this.IsAIOInstalled();
    if (installed) return true;

    // we need a new instances to make sure we pass the correct event handler.
    const downloader = this.DownloaderInstance();
    const aioETag = await this.downloader.getETag(AIORemotePath);

    const downloader2 = this.DownloaderInstance();

    downloader.on('end', () => {
      // update the manifest file with the new install need some more error handling here
      this.UpdateManifest(AIORemotePath, aioETag);

      downloader2.downloadFile('patches/patch-S.MPQ', 'Data/patch-S.MPQ');
      setTimeout(() => {
        const zip = new AdmZip(path.join(this.basePath, AIOLocalPath));
        zip.extractAllTo(path.join(this.basePath, 'Interface/AddOns'), true);
      }, 250);
    });

    downloader2.on('end', async () => {
      const patchSETag = await this.downloader.getETag('patches/patch-S.MPQ');
      this.UpdateManifest('patches/patch-S.MPQ', patchSETag)
    });


    if (!(await downloader.downloadFile(AIORemotePath, AIOLocalPath))) {
      log.error('Failed to download AIO');
    }

    return downloader2;
  }

}
