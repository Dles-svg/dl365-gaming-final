const { app, BrowserWindow, ipcMain, desktopCapturer, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, '../public/daylight-logo.jpg'),
    title: 'Daylight ES365 - Gamer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173/#/streaming');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/streaming'
    });
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('set-mode', 'gamer');
  });
}

ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 150, height: 150 }
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null
    }));
  } catch (error) {
    console.error('Error getting sources:', error);
    return [];
  }
});

ipcMain.handle('launch-local-game', async (event, gamePath) => {
  try {
    if (!gamePath) {
      return { success: false, error: 'No game path provided' };
    }

    const gameExists = fs.existsSync(gamePath);

    if (!gameExists) {
      return {
        success: false,
        error: `Game not found at: ${gamePath}. Please install the game first.`
      };
    }

    if (process.platform === 'win32') {
      exec(`start "" "${gamePath}"`, (error) => {
        if (error) {
          console.error('Failed to launch game:', error);
        }
      });
    } else if (process.platform === 'darwin') {
      exec(`open "${gamePath}"`, (error) => {
        if (error) {
          console.error('Failed to launch game:', error);
        }
      });
    } else {
      exec(`xdg-open "${gamePath}"`, (error) => {
        if (error) {
          console.error('Failed to launch game:', error);
        }
      });
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-game-installed', async (event, gamePath) => {
  try {
    if (!gamePath) {
      return { installed: false };
    }

    const exists = fs.existsSync(gamePath);
    return { installed: exists, path: gamePath };
  } catch (error) {
    return { installed: false, error: error.message };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
