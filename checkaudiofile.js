// const fs = require('fs');
// const path = require('path');

// // Relative path to the file
// const filePath = path.join(__dirname, ' data/waveforms/CPM/CAR101 The Christmas Album/CAR101_47_Auld Lang Syne_AltMixv1_over.png'
// );

// // Check if file exists
// fs.access(filePath, fs.constants.F_OK, (err) => {
//   if (err) {
//     console.log('File does NOT exist.');
//   } else {
//     console.log('File exists!');
//   }
// });

const fs = require('fs');

/**
 * Checks if a file exists asynchronously.
 * @param {string} filePath - The path to the file.
 * @returns {Promise<boolean>} A promise that resolves to true if the file exists, false otherwise.
 */
async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}


// Example usage:
async function checkFile() {
  const filePath = 'data/waveforms/CPM/CAR101 The Christmas Album/CAR101_47_Auld Lang Syne_AltMixv1_over.png';
  const exists = await fileExists(filePath);

  if (exists) {
    console.log(`${filePath} exists.`);
  } else {
    console.log(`${filePath} does not exist.`);
  }
}

checkFile();

