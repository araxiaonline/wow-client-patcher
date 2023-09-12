import fs from 'fs';
import path, { join } from 'path';
import { WowLauncher } from 'typings';

/**
 * List of patches that are required for the client to run.
 */
export const vanillaPatchList: WowLauncher.PatchFile[] = [
  { name: 'common.MPQ', description: 'Base game files' },
  { name: 'common-2.MPQ', description: 'Base game files' },
  { name: 'expansion.MPQ', description: 'TBC expansion files' },
  { name: 'lichking.MPQ', description: 'WotLK expansion files' },
  { name: 'patch.MPQ', description: 'Base game files' },
  { name: 'patch-2.MPQ', description: 'Base game files' },
  { name: 'patch-3.MPQ', description: 'Base game files' },
];

/**
 * List of patches that modify the client heavily to add HD textures
 * to character, environment, creature, and spell effects.
 */
export const HDPatchList: WowLauncher.PatchFile[] = [
  { name: 'patch-9.MPQ', description: 'Added HD music from cataclym expansion'},
  { name: 'patch-B.MPQ', description: 'Player models and armor'},
  { name: 'patch-C.MPQ', description: 'Trees and Flowers'},
  { name: 'patch-E.MPQ', description: 'Creature models'},
  { name: 'patch-F.MPQ', description: 'Creature models'},
  { name: 'patch-G.MPQ', description: 'Spell effects'},
  { name: 'patch-T.MPQ', description: 'Environment textures'},
  { name: 'patch-U.MPQ', description: 'Battlegrounds'},
];

/**
 * These are optional extras that do not change the base game as much
 * as the HDPatch set does.
 */
export const extraHDList: WowLauncher.PatchFile[] = [
  { name: 'patch-D.MPQ', description: 'Goblin models'},
  { name: 'patch-5.MPQ', description: 'Totems'},
  { name: 'patch-J.MPQ', description: 'Druids and updated animal forms'},
  { name: 'patch-S.MPQ', description: 'Liquid textures and sun rays / lighting effects'},
];

/**
 * Additional patches that add features to the game.
 */
export const featuresList: WowLauncher.PatchFile[] = [
  { name: 'patch-A.MPQ', description: 'All Races All Classes'},
  { name: 'patch-4.MPQ', description: 'Adds all races and classes to character creation'},
  { name: 'patch-7.MPQ', description: 'Adds rmember password and HD loading screens'},
  { name: 'patch-L.MPQ', description: 'Adds Blood to the game'},
];

/**
 * These are patches that are reserved for use by Araxia client patcher
 * to update game files over time with new content.
 */
export const reservedAraxiaList: WowLauncher.PatchFile[] = [
  { name: 'patch-Z.MPQ', description: 'Early load patch for pre letter patched content (use rarely)'},
  { name: 'patch-8.MPQ', description: 'Contains custom DBC file updates'},
  { name: 'patch-6.MPQ', description: 'Future Store content'},
];

export default class FileManager {
    basePath: string;
    dataPath: string;
    addOnsPath: string;
    allPatches: WowLauncher.PatchFile[] = [];
    patchNames: string[] = [];

    constructor(basePath:string) {
      this.basePath = basePath;
      this.dataPath = path.join(this.basePath, 'Data');
      this.addOnsPath = path.join(this.basePath, 'Interface', 'AddOns');

      this.allPatches = [...HDPatchList, ...extraHDList, ...featuresList, ...reservedAraxiaList];
      this.patchNames = this.allPatches.map((patch) => patch.name);

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

      return installed;
    }

   /**
    * Get list of of which HD patches are installed.
    * @returns {Promise<WowLauncher.PatchFile[] | null>} List of installed HD patches.
    */
   async GetInstalledHDPatches(): Promise<WowLauncher.PatchFile[] | null> {
      const installed = await this.GetInstalledPatches();
      const hdPatches = installed?.filter((patch) => HDPatchList.includes(patch)) ?? null;
      return hdPatches;
    }

    /**
     * Get the list of HD patches that are not installed.
     * @returns {Promise<WowLauncher.PatchFile[] | null>} List of HD patches that are not installed.
     */
    async GetMissingHDPatches(): Promise<WowLauncher.PatchFile[] | null> {
      const installed = await this.GetInstalledPatches();
      const missing = HDPatchList.filter((patch) => !installed?.includes(patch)) ?? null;
      return missing;
    }

    /**
     * Get the list of extra HD patches that are installed.
     * @returns {Promise<WowLauncher.PatchFile[] | null>} List of extra HD patches that are installed.
     */
    async GetInstalledExtraHDPatches(): Promise<WowLauncher.PatchFile[] | null> {
      const installed = await this.GetInstalledPatches();
      const extraPatches = installed?.filter((patch) => extraHDList.includes(patch)) ?? null;
      return extraPatches;
    }

    /**
     * Get the list of extra HD patches that are not installed.
     * @returns {Promise<WowLauncher.PatchFile[] | null>} List of extra HD patches that are not installed.
     */
    async GetMissingExtraHDPatches(): Promise<WowLauncher.PatchFile[] | null> {
      const installed = await this.GetInstalledPatches();
      const missing = extraHDList.filter((patch) => !installed?.includes(patch)) ?? null;
      return missing;
    }

    /**
     * Get the list of feature patches that are installed.
     * @returns {Promise<WowLauncher.PatchFile[] | null>} List of feature patches that are installed.
     */
    async GetInstalledFeaturePatches(): Promise<WowLauncher.PatchFile[] | null> {
      const installed = await this.GetInstalledPatches();
      const features = installed?.filter((patch) => featuresList.includes(patch)) ?? null;
      return features;
    }

    /**
     * Get the list of feature patches that are not installed.
     * @returns {Promise<WowLauncher.PatchFile[] | null>} List of feature patches that are not installed.
     */
    async GetMissingFeaturePatches(): Promise<WowLauncher.PatchFile[] | null> {
      const installed = await this.GetInstalledPatches();
      const missing = featuresList.filter((patch) => !installed?.includes(patch)) ?? null;
      return missing;
    }

    /**
     * Get the list of reserved Araxia patches that are installed.
     */
    async GetInstalledAraxiaPatches(): Promise<WowLauncher.PatchFile[] | null> {
      const installed = await this.GetInstalledPatches();
      const araxia = installed?.filter((patch) => reservedAraxiaList.includes(patch)) ?? null;
      return araxia;
    }

    /**
     * Get the list of reserved Araxia patches that are not installed.
     */
    async GetMissingAraxiaPatches(): Promise<WowLauncher.PatchFile[] | null> {
      const installed = await this.GetInstalledPatches();
      const missing = reservedAraxiaList.filter((patch) => !installed?.includes(patch)) ?? null;
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
     * Check if all extra HD patches are installed.
     * @returns {Promise<boolean>} True if all extra HD patches are installed.
     */
    async IsHDExtraSetup(): Promise<boolean> {
      const missing = await this.GetMissingExtraHDPatches();
      return missing?.length === 0;
    }

    /**
     * Check if all feature patches are installed.
     * @returns {Promise<boolean>} True if all feature patches are installed.
     */
    async IsFeaturesSetup(): Promise<boolean> {
      const missing = await this.GetMissingFeaturePatches();
      return missing?.length === 0;
    }

    /**
     * Check if all Araxia patches are installed
     * @returns {Promise<boolean>} True if all Araxia patches are installed.
     */
    async IsAraxiaSetup(): Promise<boolean> {
      const installed = await this.GetInstalledPatches();
      const missing = reservedAraxiaList.filter((patch) => !installed?.includes(patch)) ?? null;
      return missing?.length === 0;
    }

    /**
     * Create Araxia patch files if they do not exist. IF the patches do not exist we can just
     * create a blank directory and name it with the correct patch name as a place holder.
     * @returns {Promise<void>} Promise that resolves when all Araxia patches are created.
     */
    async CreateAraxiaPatches(): Promise<void> {
      const installed = await this.IsAraxiaSetup();
      if (installed) return;

      const missing = await this.GetMissingAraxiaPatches();
      if(!missing) return;

      const addPatches = missing.map(patch => {
        return fs.promises.mkdir(path.join(this.dataPath, patch.name));
      });

      await Promise.all(addPatches)
    }
  }
