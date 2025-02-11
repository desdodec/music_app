const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const client = require('./db'); // Assuming PostgreSQL setup

function createWindow() {
    const win = new BrowserWindow({
        width: 1600,
        height: 900,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    });

    win.loadFile('index.html');
}

// --- IPC Event Handlers ---

// Load tracks
ipcMain.on('perform-search', (event, args) => {
  const { searchTerm, filter, dropdownColumn, dropdownValue, page, limit } = args;

  let query;
  let countQuery;
  let whereClauses = [];

  if (searchTerm.trim()) {
    query = `SELECT * FROM search_tracks_sql('${searchTerm}')`;
    countQuery = `SELECT COUNT(*) FROM search_tracks_sql('${searchTerm}')`;
  } else {
    query = `SELECT * FROM tracks_search`;
    countQuery = `SELECT COUNT(*) FROM tracks_search`;
  }

  if (filter === 'vocal') {
    whereClauses.push('vocal = 1');
  } else if (filter === 'solo') {
    whereClauses.push('solo = 1');
  } else if (filter === 'instrumental') {
    whereClauses.push('vocal = 0');
  }

  if (dropdownValue.trim()) {
    whereClauses.push(`${dropdownColumn} ILIKE '%${dropdownValue}%'`);
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
    countQuery += ' WHERE ' + whereClauses.join(' AND ');
  }

  query += ' ORDER BY released_at DESC, id ASC';

  const offset = (page - 1) * limit;
  query += ` LIMIT ${limit} OFFSET ${offset};`;

  Promise.all([
    client.query(query),
    client.query(countQuery)
  ])
  .then(([result, countResult]) => {
    const totalRecords = parseInt(countResult.rows[0].count, 10);
    event.reply('search-results', { results: result.rows, total: totalRecords });
  })
  .catch(err => {
    console.error('Search error:', err.stack);
    event.reply('search-results', { results: [], total: 0 });
  });
});

// Load Playlists
ipcMain.on('load-playlists', (event) => {
    client.query('SELECT * FROM playlists ORDER BY created_at DESC')
        .then(result => event.reply('playlists-loaded', result.rows))
        .catch(err => console.error('Error loading playlists:', err));
});

// Create Playlist
ipcMain.on('create-playlist', (event, playlistName) => {
    client.query('INSERT INTO playlists (name) VALUES ($1) RETURNING *', [playlistName])
        .then(result => {
            // *** IMPORTANT: Send back the created playlist data ***
            event.reply('playlist-created', result.rows[0]);
        })
        .catch(err => console.error('Error creating playlist:', err));
});

// Delete Playlist
ipcMain.on('delete-playlist', (event, playlistId) => {
    client.query('DELETE FROM playlists WHERE id = $1', [playlistId])
        .then(() => {
            // *** IMPORTANT: Send confirmation back to renderer ***
            event.reply('playlist-deleted', playlistId);
        })
        .catch(err => console.error('Error deleting playlist:', err));
});

// Load Tracks in Playlist
ipcMain.on('load-playlist-tracks', (event, playlistId) => {
  client.query('SELECT * FROM playlist_tracks WHERE playlist_id = $1', [playlistId])
    .then(result => event.reply('load-playlist-tracks', result.rows))
    .catch(err => console.error('Error loading playlist tracks:', err));
});

app.whenReady().then(createWindow);