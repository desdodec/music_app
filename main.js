const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const client = require('./db'); // Assuming PostgreSQL setup

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.loadFile('index.html');
}

// 🚀 Load Playlists
ipcMain.on('load-playlists', (event) => {
    client.query('SELECT * FROM playlists ORDER BY created_at DESC')
        .then(result => event.reply('playlists-loaded', result.rows))
        .catch(err => console.error('Error loading playlists:', err));
});

// 🚀 Create Playlist
ipcMain.on('create-playlist', (event, playlistName) => {
    client.query('INSERT INTO playlists (name) VALUES ($1) RETURNING *', [playlistName])
        .then(result => event.reply('playlist-created', result.rows[0]))
        .catch(err => console.error('Error creating playlist:', err));
});

// 🚀 Delete Playlist
ipcMain.on('delete-playlist', (event, playlistId) => {
    client.query('DELETE FROM playlists WHERE id = $1', [playlistId])
        .then(() => event.reply('playlist-deleted', playlistId))
        .catch(err => console.error('Error deleting playlist:', err));
});

// 🚀 Start Electron
app.whenReady().then(createWindow);
