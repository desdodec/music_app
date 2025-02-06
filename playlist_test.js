const client = require('./db');  // Reusing existing database connection

// ========================== TEST FUNCTIONS ==========================

// 1. Add a new playlist
async function addPlaylist(name) {
  try {
    const res = await client.query(
      'INSERT INTO playlists (name) VALUES ($1) RETURNING *;',
      [name]
    );
    console.log('New Playlist Created:', res.rows[0]);
    return res.rows[0].id;
  } catch (err) {
    console.error('Error adding playlist:', err);
  }
}

// 2. Add track to playlist
async function addTrackToPlaylist(playlistId, track) {
  try {
    const res = await client.query(
      `INSERT INTO playlist_tracks (playlist_id, track_id, title, library, cd_title, filename, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (playlist_id, track_id) DO NOTHING
       RETURNING *;`,
      [playlistId, track.id, track.title, track.library, track.cd_title, track.filename, track.duration]
    );
    console.log('Track Added:', res.rows[0]);
  } catch (err) {
    console.error('Error adding track:', err);
  }
}

// 3. Fetch playlist with tracks
async function fetchPlaylist(playlistId) {
  try {
    const res = await client.query(
      `SELECT p.name AS playlist_name, pt.* 
       FROM playlists p 
       JOIN playlist_tracks pt ON p.id = pt.playlist_id 
       WHERE p.id = $1;`,
      [playlistId]
    );
    console.log(`Playlist Tracks for Playlist ID ${playlistId}:`, res.rows);
  } catch (err) {
    console.error('Error fetching playlist:', err);
  }
}

// 4. Delete a track from playlist
async function deleteTrackFromPlaylist(playlistId, trackId) {
  try {
    await client.query(
      'DELETE FROM playlist_tracks WHERE playlist_id = $1 AND track_id = $2;',
      [playlistId, trackId]
    );
    console.log(`Track ${trackId} deleted from Playlist ${playlistId}`);
  } catch (err) {
    console.error('Error deleting track:', err);
  }
}

// 5. Edit playlist name
async function editPlaylistName(playlistId, newName) {
  try {
    const res = await client.query(
      'UPDATE playlists SET name = $1 WHERE id = $2 RETURNING *;',
      [newName, playlistId]
    );
    console.log('Updated Playlist:', res.rows[0]);
  } catch (err) {
    console.error('Error editing playlist name:', err);
  }
}

// 6. Delete entire playlist
async function deletePlaylist(playlistId) {
  try {
    await client.query('DELETE FROM playlists WHERE id = $1;', [playlistId]);
    console.log(`Playlist ${playlistId} deleted`);
  } catch (err) {
    console.error('Error deleting playlist:', err);
  }
}

// ========================== COMMAND-LINE HANDLER ==========================

const [,, action, ...args] = process.argv;

(async () => {
  switch (action) {
    case '0': // Create Playlist
      const playlistName = args[0] || 'New Playlist';
      await addPlaylist(playlistName);
      break;

    case '1': // Add Track to Playlist
      const playlistIdAdd = args[0];
      const sampleTrack = {
        id: args[1] || 'CAR101_01',
        title: args[2] || 'Season\'s Greetings',
        library: args[3] || 'CPM',
        cd_title: args[4] || 'The Christmas Album',
        filename: args[5] || 'CAR101_01_Seasons_Greetings',
        duration: parseInt(args[6]) || 120
      };
      await addTrackToPlaylist(playlistIdAdd, sampleTrack);
      break;

    case '2': // Fetch Playlist
      const playlistIdFetch = args[0];
      await fetchPlaylist(playlistIdFetch);
      break;

    case '3': // Delete Track from Playlist
      const playlistIdDel = args[0];
      const trackIdDel = args[1];
      await deleteTrackFromPlaylist(playlistIdDel, trackIdDel);
      break;

    case '4': // Edit Playlist Name
      const playlistIdEdit = args[0];
      const newName = args[1];
      await editPlaylistName(playlistIdEdit, newName);
      break;

    case '5': // Delete Entire Playlist
      const playlistIdRemove = args[0];
      await deletePlaylist(playlistIdRemove);
      break;

    default:
      console.log('Usage:\n' +
        ' 0 [playlist_name]                - Create a new playlist\n' +
        ' 1 [playlist_id] [track_id] [title] [library] [cd_title] [filename] [duration] - Add a track to playlist\n' +
        ' 2 [playlist_id]                  - Fetch a playlist\n' +
        ' 3 [playlist_id] [track_id]       - Delete a track from playlist\n' +
        ' 4 [playlist_id] [new_name]       - Edit playlist name\n' +
        ' 5 [playlist_id]                  - Delete entire playlist'
      );
  }

  await client.end();
})();
