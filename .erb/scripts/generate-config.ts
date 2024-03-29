import { program } from 'commander';
import inquirer from 'inquirer';
import fs from 'fs-extra';

program
  .name("json-generator")
  .description("CLI to generate a specific JSON structure")
  .version("0.1.0");

program.command("generate")
  .description("Generates the JSON file")
  .action(async () => {
    const answers = await inquirer.prompt([
      { name: "endpoint", message: "Enter AWS endpoint:", type: "input" },
      { name: "accessKeyId", message: "Enter AWS Access Key ID:", type: "input" },
      { name: "secretAccessKey", message: "Enter AWS Secret Access Key:", type: "password" },
      { name: "region", message: "Enter AWS region:", type: "input" },
    ]);

    const jsonData = {
      "patches": {
        "HDContent": [
          { "name": "patch-8.MPQ", "description": "Items and armor sets" },
          { "name": "patch-B.MPQ", "description": "Battleground environments" },
          { "name": "patch-C.MPQ", "description": "Trees and Flowers" },
          { "name": "patch-F.MPQ", "description": "Creature Models" },
          { "name": "patch-G.MPQ", "description": "Spell animation and effects" },
          { "name": "patch-H.MPQ", "description": "Character Models"},
          { "name": "patch-T.MPQ", "description": "Tilesets and Environments" }
        ],
        "misc": [{}],
        "reserved": [
          { "name": "patch-U.MPQ", "description": "Custom Changes dbc file change to add custom content." },
          { "name": "patch-Y.MPQ", "description": "Changes to textures, art, login, music..etc" }
        ]
      },
      "addOns": [
        { "name": "AIO", "description": "AIO-Store Interface" }
      ],
      "wowexe": {
        "patched_md5": "bbdb43e3ca0946e6b13a0cd960a9a2e7"
      },
      "aws": {
        "endpoint": answers.endpoint,
        "accessKeyId": answers.accessKeyId,
        "secretAccessKey": answers.secretAccessKey,
        "region": answers.region
      },
      "remotePaths": {
        "base": "base",
        "aio": "addOns",
        "patches": "patches",
        "custom": "custom",
        "news": "news",
        "version": "./version.json"
      },
      "clientText": {
        "newsTitle": "Latest News!"
      }
    };

    await fs.writeJson('./output.json', jsonData, { spaces: 2 });
    console.log("JSON file has been generated!");
  });

program.parse(process.argv);
