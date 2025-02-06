const { Client } = require('pg');

// PostgreSQL client configuration
const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'music_db',
    password: 'b26xxx3',
    port: 5432,
});

// Connect to the database
client.connect();

// Query to fetch audio and waveform path data for a specific track
const query = `
  SELECT 
    id,
    library,
    cd_title,
    filename
  FROM 
    tracks_new
  WHERE 
    id = 'CAR101_01';
`;

client.query(query, (err, res) => {
  if (err) {
    console.error('Error executing query:', err);
  } else {
    if (res.rows.length > 0) {
      const track = res.rows[0];
      
      // Construct the audio path
      const audioPath = `data/audio/mp3s/${track.library}/${track.id.split('_')[0]} ${track.cd_title}/${track.filename}.mp3`;
      
      // Construct the waveform paths
      const waveformPath = `data/waveforms/${track.library}/${track.id.split('_')[0]} ${track.cd_title}/${track.filename}.png`;
      const waveformOverPath = `data/waveforms/${track.library}/${track.id.split('_')[0]} ${track.cd_title}/${track.filename}_over.png`;

      console.log('Audio Path:', audioPath);
      console.log('Waveform Path:', waveformPath);
      console.log('Waveform Over Path:', waveformOverPath);
    } else {
      console.log('No track found with the given ID.');
    }
  }

  // Close the database connection
  client.end();
});
