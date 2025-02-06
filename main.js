const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const client = require('./db');



function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,    webSecurity: false  // Disable security to allow local file access
    }
  });

  win.loadFile('index.html');
}

// Handle search requests from the renderer process
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

//--------=Playlist Functions---------------------------
ipcMain.on('load-playlists', (event) => {
  client.query('SELECT * FROM playlists ORDER BY created_at DESC')
    .then(result => event.reply('playlists-loaded', result.rows))
    .catch(err => console.error('Error loading playlists:', err));
});

ipcMain.on('create-playlist', (event, playlistName) => {
  client.query('INSERT INTO playlists (name) VALUES ($1) RETURNING *', [playlistName])
    .then(result => {
      event.reply('playlist-created', result.rows[0]); // Send back the created playlist data
    })
    .catch(err => {
      console.error('Error creating playlist:', err);
      // Consider sending an error back to the renderer process for user feedback.
      // For example: event.reply('playlist-creation-failed', err.message);
    });
});

ipcMain.on('delete-playlist', (event, playlistId) => {
  client.query('DELETE FROM playlists WHERE id = $1', [playlistId])
    .then(() => event.reply('playlist-deleted', playlistId))
    .catch(err => console.error('Error deleting playlist:', err));
});

ipcMain.on('add-to-playlist', (event, { playlistId, track }) => {
  const { id, title, library, cd_title, filename, duration } = track;
  client.query(
    'INSERT INTO playlist_tracks (playlist_id, track_id, title, library, cd_title, filename, duration) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING',
    [playlistId, id, title, library, cd_title, filename, duration]
  )
    .then(() => event.reply('track-added', { playlistId, trackId: id }))
    .catch(err => console.error('Error adding track to playlist:', err));
});

ipcMain.on('load-playlist-tracks', (event, playlistId) => {
  client.query('SELECT * FROM playlist_tracks WHERE playlist_id = $1', [playlistId])
    .then(result => event.reply('playlist-tracks-loaded', result.rows))
    .catch(err => console.error('Error loading playlist tracks:', err));
});


//-----------------------------------------------------
app.whenReady().then(createWindow);
