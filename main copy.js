const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const client = require('./db');



function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 600,
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







app.whenReady().then(createWindow);
