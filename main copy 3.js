const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const client = require('./db'); // Assuming PostgreSQL setup

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
             webSecurity: false
        }
    });

    win.loadFile('index.html');
}

// Load tracks
ipcMain.on('perform-search', (event, args) => {
  const { searchTerm, filter, dropdownColumn, dropdownValue, page, limit } = args;

  let query;
  let countQuery;
  let whereClauses = [];

  // Constructing the base query
  if (searchTerm.trim()) {
    query = `SELECT * FROM search_tracks_sql('${searchTerm}')`;
    countQuery = `SELECT COUNT(*) FROM search_tracks_sql('${searchTerm}')`;
  } else {
    query = `SELECT * FROM tracks_search`;
    countQuery = `SELECT COUNT(*) FROM tracks_search`;
  }

  // Apply global filters
  if (filter === 'vocal') {
    whereClauses.push('vocal = 1');
  } else if (filter === 'solo') {
    whereClauses.push('solo = 1');
  } else if (filter === 'instrumental') {
    whereClauses.push('vocal = 0');
  }

  // Apply dropdown filter
  if (dropdownValue.trim()) {
    whereClauses.push(`${dropdownColumn} ILIKE '%${dropdownValue}%'`);
  }

  // Combine WHERE clauses if any
  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
    countQuery += ' WHERE ' + whereClauses.join(' AND ');
  }

  // Apply sorting
  query += ' ORDER BY released_at DESC, id ASC';

  // Apply pagination using LIMIT and OFFSET
  const offset = (page - 1) * limit;
  query += ` LIMIT ${limit} OFFSET ${offset};`;

  // Log the query for debugging
  console.log('Executing Query:', query);
  console.log('Count Query:', countQuery);

  // Execute the queries
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
        .then(result => event.reply('playlist-created', result.rows[0]))
        .catch(err => console.error('Error creating playlist:', err));
});

// Delete Playlist
ipcMain.on('delete-playlist', (event, playlistId) => {
    client.query('DELETE FROM playlists WHERE id = $1', [playlistId])
        .then(() => event.reply('playlist-deleted', playlistId))
        .catch(err => console.error('Error deleting playlist:', err));
});

ipcMain.on('load-playlist-tracks', (event, playlistId) => {
  client.query('SELECT * FROM playlist_tracks WHERE playlist_id = $1', [playlistId])
    .then(result => event.reply('load-playlist-tracks', result.rows))
    .catch(err => console.error('Error loading playlist tracks:', err));
});

// Start Electron
app.whenReady().then(createWindow);