const { Client } = require('pg');

const client = new Client({
  user: 'postgres',
  host: 'localhost',
  database: 'music_db', 
  password: 'b26xxx3',
  port: 5432,
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Connection error', err.stack));


  client.on('error', (err) => {
    console.error('Database client error:', err.stack);
  });
  

module.exports = client;
