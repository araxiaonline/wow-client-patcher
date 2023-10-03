const fs = require('fs');
const path = require('path');

// Define the list of patch files
/**
 * List of patches that modify the client heavily to add HD textures
 * to character, environment, creature, and spell effects.
 */
 const HDPatchList = [
  { name: 'patch-9.MPQ', description: 'Added HD music from cataclym expansion'},
  { name: 'patch-A.MPQ', description: 'Character models and armor'},
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
const extraHDList = [
  { name: 'patch-D.MPQ', description: 'Goblin models'},
  { name: 'patch-5.MPQ', description: 'Totems'},
  { name: 'patch-J.MPQ', description: 'Druids and updated animal forms'},
  { name: 'patch-S.MPQ', description: 'Liquid textures and sun rays / lighting effects'},
];

/**
 * Additional patches that add features to the game.
 */
const featuresList = [
  { name: 'patch-A.MPQ', description: 'All Races All Classes'},
  { name: 'patch-4.MPQ', description: 'Adds all races and classes to character creation'},
  { name: 'patch-7.MPQ', description: 'Adds rmember password and HD loading screens'},
  { name: 'patch-L.MPQ', description: 'Adds Blood to the game'},
];

/**
 * These are patches that are reserved for use by Araxia client patcher
 * to update game files over time with new content.
 */
const reservedAraxiaList = [
  { name: 'patch-Z.MPQ', description: 'Early load patch for pre letter patched content (use rarely)'},
  { name: 'patch-8.MPQ', description: 'Contains custom DBC file updates'},
  { name: 'patch-6.MPQ', description: 'Future Store content'},
];

// Define the base directory where the files should be created (current directory)
const baseDirectory = process.cwd();

// Check if the -random argument is passed
const excludeRandomFile = process.argv.includes('-random');
const allFiles = process.argv.includes('-all');

if (excludeRandomFile) {
  // Generate a random index to exclude a file
  const randomIndex = Math.floor(Math.random() * HDPatchList.length);
  const excludedFile = HDPatchList[randomIndex];
  console.log(`Excluding random file: ${excludedFile.name}`);

  // Create empty files for each patch file except the excluded one
  HDPatchList.forEach((patch) => {
    if (patch !== excludedFile) {
      const filePath = path.join(baseDirectory, patch.name);
      fs.writeFileSync(filePath, ''); // Create an empty file
      console.log(`Created empty file: ${filePath}`);
    }
  });
} else if(allFiles) {
  // Create empty files for each patch file in the list
  HDPatchList.forEach((patch) => {
    const filePath = path.join(baseDirectory, patch.name);
    fs.writeFileSync(filePath, ''); // Create an empty file
    console.log(`Created empty file: ${filePath}`);
  });

  extraHDList.forEach((patch) => {
    const filePath = path.join(baseDirectory, patch.name);
    fs.writeFileSync(filePath, ''); // Create an empty file
    console.log(`Created empty file: ${filePath}`);
  });

  featuresList.forEach((patch) => {
    const filePath = path.join(baseDirectory, patch.name);
    fs.writeFileSync(filePath, ''); // Create an empty file
    console.log(`Created empty file: ${filePath}`);
  });

  reservedAraxiaList.forEach((patch) => {
    const filePath = path.join(baseDirectory, patch.name);
    fs.writeFileSync(filePath, ''); // Create an empty file
    console.log(`Created empty file: ${filePath}`);
  });


} else {
  // Create empty files for each patch file in the list
  HDPatchList.forEach((patch) => {
    const filePath = path.join(baseDirectory, patch.name);
    fs.writeFileSync(filePath, ''); // Create an empty file
    console.log(`Created empty file: ${filePath}`);
  });
}

console.log('Empty files creation completed.')
