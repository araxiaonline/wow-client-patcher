/* eslint-disable prefer-destructuring */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable-next-line prefer-destructuring */
import path from 'path';
import fs from 'fs/promises';
import FileManager, {
  HDPatchList,
  extraHDList,
  featuresList,
  reservedAraxiaList
} from '../libs/FileManager';

describe('FileManager', () => {
  const testDirectories = [
    'testdata/patched',
    'testdata/full-install',
    'testdata/unpatched',
    'testdata/partial-patch',
  ];

  let basePath:string;
  let fileManager:FileManager;
  describe('Test A HD Patched client', () => {

    beforeAll(() => {
      basePath = testDirectories[0]; // get the HD patched directory
      fileManager = new FileManager(basePath);
    });

    afterEach(async () => {
      for(const patch of reservedAraxiaList) {
         const patchPath = path.join(__dirname, basePath, 'Data', patch.name);

         try {
          await fs.rmdir(patchPath);
          // console.log('removed file: ',patchPath);
         } catch(err) {
           // DO NOTHING
         }

      }
    });

    it('should return installed patches', async () => {
      const result = await fileManager.GetInstalledHDPatches();
      expect(result).toStrictEqual(HDPatchList);
    });

    it('should have no missing patches', async () => {
      const result = await fileManager.GetMissingHDPatches();
      expect(result).toHaveLength(0);
    });

    it('should be missing extra HD patches', async () => {
      const result = await fileManager.GetMissingExtraHDPatches();
      expect(result).toStrictEqual(extraHDList);
    });

    it('should show HD patches are installed', async () => {
      const result = await fileManager.IsHDSetup();
      expect(result).toBeTruthy();
    });

    it('should show HDExtra patches are not installed', async () => {
      const result = await fileManager.IsHDExtraSetup();
      expect(result).toBeFalsy();
    });

    it('should show Feature patches are not installed', async () => {
      const result = await fileManager.IsFeaturesSetup();
      expect(result).toBeFalsy();
    });

    it('should be missing feature patches', async () => {
      const result = await fileManager.GetMissingFeaturePatches();
      expect(result).toStrictEqual(featuresList);
    });

    it('should not have araxia installed', async () => {
      let result = await fileManager.GetInstalledAraxiaPatches();
      expect(result).toHaveLength(0);
      result = await fileManager.GetMissingAraxiaPatches();
      expect(result).toStrictEqual(reservedAraxiaList);
      const installed = await fileManager.IsAraxiaSetup();
      expect(installed).toBeFalsy();
    });

    it('should install araxia', async () => {
      await fileManager.CreateAraxiaPatches();
      const installed = await fileManager.IsAraxiaSetup();
      expect(installed).toBeTruthy();
    });
  }); // end describe('Test an HD Patched client')

  describe('Test Fully Patched client', () => {

    beforeAll(() => {
      basePath = testDirectories[1]; // get the HD patched directory
      fileManager = new FileManager(basePath);
    });

    it('should return installed patches', async () => {
      const result = await fileManager.GetInstalledHDPatches();
      expect(result).toEqual(HDPatchList);
    });

    it('should have no missing patches', async () => {
      const result = await fileManager.GetMissingHDPatches();
      expect(result).toHaveLength(0);
    });


    it('should show HD patches are installed', async () => {
      const result = await fileManager.IsHDSetup();
      expect(result).toBeTruthy();
    });

    it('should show HDExtra patches are installed', async () => {
      const result = await fileManager.IsHDExtraSetup();
      expect(result).toBeTruthy();
    });

    it('should show Feature patches are installed', async () => {
      const result = await fileManager.IsFeaturesSetup();
      expect(result).toBeTruthy();
    });

    it('should be missing feature patches', async () => {
      const result = await fileManager.GetMissingFeaturePatches();
      expect(result).toStrictEqual([]);
    });

    it('should have araxia installed', async () => {
      const installed = await fileManager.IsAraxiaSetup();
      expect(installed).toBeTruthy();
    });
  }); // end describe('Fully Patched client')
});
