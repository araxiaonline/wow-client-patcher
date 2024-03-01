import {
  app,
  Menu,
  shell,
  BrowserWindow,
  dialog
} from 'electron';

import path from 'path';
import packageJson from '../../package.json';

export default class MenuBuilder {
  mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
  }

  buildMenu(): Menu {
    if (
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_PROD === 'true'
    ) {
      this.setupDevelopmentEnvironment();
    }

    const template = this.buildDefaultTemplate();
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    return menu;
  }

  setupDevelopmentEnvironment(): void {
    this.mainWindow.webContents.on('context-menu', (_, props) => {
      const { x, y } = props;

      Menu.buildFromTemplate([
        {
          label: 'Inspect element',
          click: () => {
            this.mainWindow.webContents.inspectElement(x, y);
          },
        },
      ]).popup({ window: this.mainWindow });
    });
  }

  buildDefaultTemplate() {
    const templateDefault = [
      {
        label: '&File',
        submenu: [
          {
            label: '&Close',
            accelerator: 'Ctrl+W',
            click: () => {
              this.mainWindow.close();
            },
          },
        ],
      },
      {
        label: '&Actions',
        submenu: [
          {
            label: 'Install HD Client',
            click: async () => {
              const result = await this.mainWindow.webContents.executeJavaScript(`
                window.api.InstallHD(window.batchCallbacks);
              `);
            }
          },
          {
            label: 'Patch WoW Exe',
            click: async () => {
              const result = await this.mainWindow.webContents.executeJavaScript(`
                window.api.PatchWoW(window.batchCallbacks);
              `);
            }
          }
        ]

      },
      {
        label: '&View',
        submenu: [
          {
            label: '&Reload',
            accelerator: 'Ctrl+R',
            click: () => {
              this.mainWindow.webContents.reload();
            },
          },
          {
            label: 'Toggle &Developer Tools',
            accelerator: 'Alt+Ctrl+I',
            click: () => {
              this.mainWindow.webContents.toggleDevTools();
            },
          },
        ],
      },
      {
        label: 'About',
        submenu: [
          {
            label: 'Araxia Client Patcher',
            click() {
             dialog.showMessageBox({
                title: 'About',
                message: `Araxia Client Patcher v${packageJson.version}`,
                detail: "Credits:\nProgramming and Design: Ben Carter @ben-of-codecraft \nPatch Master: Eric Gates @manmadedrummer\nInfrastructure: Chris Turley @wonderboy",
                buttons: ['OK'],
                icon: path.join(__dirname, '../../assets', 'wow-icon.png')
             })
            },
          },
          {
            label: 'GitHub',
            click() {
              shell.openExternal(
                'https://github.com/araxiaonline'
              );
            },
          },
        ],
      },
    ];

    return templateDefault;
  }
}
