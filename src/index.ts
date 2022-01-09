import { app, BrowserWindow, session, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { init, translate } from './i18n';

// This allows TypeScript to pick up the magic constant that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const tempDirs: string[] = [];

const createWindow = async (): Promise<void> => {
  await init(app.getLocale());

  const mainWindow = new BrowserWindow({
    height: 800,
    width: 1200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
    }
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  //mainWindow.webContents.openDevTools();
  mainWindow.removeMenu();
  //mainWindow.resizable = false;
  mainWindow.setMinimumSize(1200, 800);

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.send("initI18n", app.getLocale());

    let inputFilesRelative = process.argv.slice(1);
    if (inputFilesRelative[0] === ".") inputFilesRelative = inputFilesRelative.slice(1);
    const inputFiles = inputFilesRelative.map(f => path.resolve(f));
    mainWindow.webContents.send("inputFiles", inputFiles);
  });

  mainWindow.webContents.on("ipc-message", (_event, channel, inputFile: string) => {
    if (channel === "saveDialogTriggered") showSaveDialog(mainWindow, inputFile);
    if (channel === "addDialogTriggered") showAddDialog(mainWindow, inputFile);
    if (channel === "exitAfterSavingTriggered") app.quit();
    if (channel === "addedTempDir") tempDirs.push(inputFile);
  })

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // patch CSP to allow blob: everywhere where data: is allowed, to allow the iframe with blobSrc PDF to render -.-
    let responseHeaders = details.responseHeaders;
    if (responseHeaders["Content-Security-Policy"]) {
      responseHeaders["Content-Security-Policy"][0] = responseHeaders["Content-Security-Policy"][0].replace(/data\:/, "data: blob:");
    }

    callback({ responseHeaders });
  });
};

async function showSaveDialog(window: BrowserWindow, inputFile: string) {
  const newFilename = inputFile + translate("save_dialog_default_suffix") + ".pdf";
  const result = await dialog.showSaveDialog(window, {
    title: translate("save_dialog_title"),
    defaultPath: newFilename,
    filters: [ { name: translate("save_dialog_file_type"), extensions: ["pdf"] } ] 
  });
  if (!result.canceled && result.filePath) {
    window.webContents.send("saveDialogConfirmed", result.filePath);
  }
}

async function showAddDialog(window: BrowserWindow, inputFile: string) {
  const result = await dialog.showOpenDialog(window, {
    title: translate("add_dialog_title"),
    defaultPath: path.dirname(inputFile),
    filters: [ { name: translate("add_dialog_file_type"), extensions: ["jpg", "jpeg", "pdf", "bmp", "png", "tiff"] } ],
    properties: ['openFile', 'multiSelections', 'dontAddToRecent']
  });
  if (!result.canceled && result.filePaths) {
    window.webContents.send("addDialogConfirmed", result.filePaths);
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => 
  // Clean up created temp dirs
  tempDirs.forEach((tempDir) => {
    console.log("Deleting temp dir", tempDir);
    fs.rmSync(tempDir, { recursive: true, force: true });
  })
)

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

