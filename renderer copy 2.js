const { ipcRenderer } = require('electron');

const path = require('path');


let activeFilter = 'all';
let currentPage = 1;
const recordsPerPage = 10;
let totalPages = 1;
let currentAudio = null;  // Ensure currentAudio is defined globally

// Event Listeners for Search, Clear, and Filters
document.getElementById('searchButton').addEventListener('click', () => {
  currentPage = 1;
  performSearch();
});

document.getElementById('clearButton').addEventListener('click', () => {
  clearSearch();
  togglePaginationButtons(true);
});

document.querySelectorAll('.filter-btn').forEach(button => {
  button.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active-filter'));
    e.target.classList.add('active-filter');
    activeFilter = e.target.getAttribute('data-filter');
    currentPage = 1;
    performSearch();
  });
});

// Enter key triggers search
document.getElementById('searchBox').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    currentPage = 1;
    performSearch();
  }
});

document.getElementById('dropdownInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    currentPage = 1;
    performSearch();
  }
});

// Perform Search Function
function performSearch() {
  const searchTerm = document.getElementById('searchBox').value.trim();
  const dropdownColumn = document.getElementById('dropdownColumn').value;
  const dropdownValue = document.getElementById('dropdownInput').value.trim();

  ipcRenderer.send('perform-search', {
    searchTerm,
    filter: activeFilter,
    dropdownColumn,
    dropdownValue,
    page: currentPage,
    limit: recordsPerPage
  });
}

// Clear Search Function
function clearSearch() {
  document.getElementById('searchBox').value = '';
  document.getElementById('dropdownInput').value = '';
  document.getElementById('dropdownColumn').selectedIndex = 0;
  activeFilter = 'all';
  currentPage = 1;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active-filter'));
  document.querySelector('[data-filter="all"]').classList.add('active-filter');
  document.getElementById('results').innerHTML = '<p>No results to display. Please enter a search term or select a filter.</p>';
  document.getElementById('totalRecords').innerText = 'Total Records: 0';
  document.getElementById('pageInfo').innerText = 'Page 1 of 1';
}



// Handle Results from Backend
ipcRenderer.on('search-results', (event, { results, total }) => {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '';

  totalPages = Math.ceil(total / recordsPerPage);

  if (results.length === 0) {
    resultsDiv.innerHTML = '<p>No results found.</p>';
  } else {
    results.forEach(track => {
      const albumCoverPath = track.library && track.id
        ? `data/artwork/${track.library}/${track.id.split('_')[0]}.jpg`
        : 'default_album_cover.png';

      const audioPath = track.library && track.filename
        ? `data/audio/mp3s/${track.library}/${track.id.split('_')[0]} ${track.cd_title}/${track.filename}.mp3`
        : '';

      // Base waveform image (static)
      const waveformBasePath = track.library && track.filename
        ? `file://${path.resolve(__dirname, 'data', 'waveforms', track.library, `${track.id.split('_')[0]} ${track.cd_title}`, `${track.filename}.png`).replace(/ /g, '%20').replace(/'/g, '%27')}`
        : `file://${path.resolve(__dirname, 'default_waveform.png')}`;

      // Overlay waveform image (_over.png)
      const waveformOverPath = track.library && track.filename
        ? `file://${path.resolve(__dirname, 'data', 'waveforms', track.library, `${track.id.split('_')[0]} ${track.cd_title}`, `${track.filename}_over.png`).replace(/ /g, '%20').replace(/'/g, '%27')}`
        : `file://${path.resolve(__dirname, 'default_waveform.png')}`;

      console.log(`Generated Waveform Base Path: ${waveformBasePath}`);
      console.log(`Generated Waveform Overlay Path: ${waveformOverPath}`);

      const duration = track.duration && !isNaN(track.duration)
        ? `${Math.floor(track.duration / 60)}:${(track.duration % 60).toString().padStart(2, '0')}`
        : '00:00';

      const description = track.description || 'No description available';
      const trackId = track.id || 'Unknown ID';

      const trackElement = document.createElement('div');
      trackElement.classList.add('result');
      trackElement.innerHTML = `
        <img src="${albumCoverPath}" alt="Album Cover" class="album-cover">
        <div class="track-info">
          <div class="track-title">${trackId} - ${track.title || track.track_title}</div>
          <span class="description">${description}</span>
          <div class="tooltip-box">${description}</div>
          <div class="waveform" data-duration="${track.duration || 0}">
            <img src="${waveformBasePath}" alt="Waveform Base" class="waveform-base">
            <img src="${waveformOverPath}" alt="Waveform Progress" class="waveform-progress">
          </div>
          <div>Duration: ${duration}</div>
          <div class="controls">
            <button class="control-btn play-btn" data-audio="${audioPath}" data-waveform="${waveformOverPath}"><i class="fas fa-play"></i></button>
            <button class="control-btn"><i class="fas fa-plus"></i></button>
            <button class="control-btn"><i class="fas fa-compact-disc"></i></button>
          </div>
        </div>
      `;

      // Error handling for waveform images
      const baseImage = trackElement.querySelector('.waveform-base');
      const overlayImage = trackElement.querySelector('.waveform-progress');

      baseImage.onerror = (e) => {
        console.error(`Failed to load base waveform image at: ${waveformBasePath}`);
        e.target.src = 'default_waveform.png';
      };

      overlayImage.onerror = (e) => {
        console.error(`Failed to load overlay waveform image at: ${waveformOverPath}`);
        e.target.src = 'default_waveform.png';
      };
      // Add click-to-play functionality on waveform
      const waveformContainer = trackElement.querySelector('.waveform');
      waveformContainer.addEventListener('click', (e) => {
        const waveformRect = waveformContainer.getBoundingClientRect();
        const clickPosition = e.clientX - waveformRect.left;
        const totalDuration = parseFloat(waveformContainer.dataset.duration);
        const playButton = trackElement.querySelector('.play-btn i');

        if (!audioPath || isNaN(totalDuration)) {
          console.error('Audio path or duration missing!');
          return;
        }

        if (currentAudio && !currentAudio.paused) {
          currentAudio.pause();
          if (currentPlayButton) {
            currentPlayButton.classList.remove('fa-pause');
            currentPlayButton.classList.add('fa-play');
          }
        }

        currentAudio = new Audio(audioPath);
        currentAudio.currentTime = (clickPosition / waveformRect.width) * totalDuration;
        currentAudio.play();
        currentPlayButton = playButton;

        playButton.classList.remove('fa-play');
        playButton.classList.add('fa-pause');

        // Update the waveform progress
        currentAudio.ontimeupdate = () => {
          const progressPercentage = (currentAudio.currentTime / totalDuration) * 100;
          overlayImage.style.clipPath = `inset(0 ${100 - progressPercentage}% 0 0)`;
        };

        currentAudio.onended = () => {
          overlayImage.style.clipPath = 'inset(0 100% 0 0)';  // Reset overlay on end
          playButton.classList.remove('fa-pause');
          playButton.classList.add('fa-play');
        };
      });

      resultsDiv.appendChild(trackElement);
    });
  }

  document.getElementById('totalRecords').innerText = `Total Records: ${total}`;
  document.getElementById('pageInfo').innerText = `Page ${currentPage} of ${totalPages}`;
  togglePaginationButtons();

  initializePlayButtons();
});


// Initialize Play Button Functionality
function initializePlayButtons() {
  document.querySelectorAll('.play-btn').forEach(button => {
    button.addEventListener('click', (e) => {
      const buttonIcon = e.target.closest('button').querySelector('i');
      const audioPath = e.target.closest('button').getAttribute('data-audio');
      const waveformElement = e.target.closest('.result')?.querySelector('.waveform .progress');
      const totalDuration = parseFloat(e.target.closest('.waveform')?.dataset.duration) || 0;

      if (!audioPath) {
        console.error('Audio path is missing!');
        return;
      }

      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        buttonIcon.classList.remove('fa-pause');
        buttonIcon.classList.add('fa-play');
        return;
      }

      currentAudio = new Audio(audioPath);
      currentAudio.play()
        .then(() => {
          buttonIcon.classList.remove('fa-play');
          buttonIcon.classList.add('fa-pause');

          currentAudio.ontimeupdate = () => {
            if (waveformElement && totalDuration > 0) {
              const progressPercentage = (currentAudio.currentTime / totalDuration) * 100;
              waveformElement.style.clipPath = `inset(0 ${100 - progressPercentage}% 0 0)`;
            }
          };
        })
        .catch(err => console.error('Playback failed:', err));

      currentAudio.addEventListener('ended', () => {
        buttonIcon.classList.remove('fa-pause');
        buttonIcon.classList.add('fa-play');
        if (waveformElement) {
          waveformElement.style.clipPath = 'inset(0 100% 0 0)';
        }
      });

      const waveformContainer = e.target.closest('.result')?.querySelector('.waveform');
      if (waveformContainer) {
        waveformContainer.addEventListener('click', (event) => {
          const waveformRect = waveformContainer.getBoundingClientRect();
          const clickPosition = event.clientX - waveformRect.left;
          const seekTime = (clickPosition / waveformRect.width) * totalDuration;
          currentAudio.currentTime = seekTime;
        });
      }
    });
  });
}

// Pagination Controls
function togglePaginationButtons(disable = false) {
  document.getElementById('firstPage').disabled = disable || currentPage === 1;
  document.getElementById('prevPage').disabled = disable || currentPage === 1;
  document.getElementById('nextPage').disabled = disable || currentPage === totalPages || totalPages === 0;
  document.getElementById('lastPage').disabled = disable || currentPage === totalPages || totalPages === 0;
}

document.getElementById('firstPage').addEventListener('click', () => {
  currentPage = 1;
  performSearch();
});

document.getElementById('prevPage').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    performSearch();
  }
});

document.getElementById('nextPage').addEventListener('click', () => {
  if (currentPage < totalPages) {
    currentPage++;
    performSearch();
  }
});

document.getElementById('lastPage').addEventListener('click', () => {
  currentPage = totalPages;
  performSearch();
});



//////////////////////Playlist Functionality//////////////////////
//////////////////////sidebar playlist load create display delete//////////////////////
// ... other code (search, filtering, etc.) ...

//////////////////////Playlist Functionality//////////////////////

// renderer.js (Playlist Functionality section)

// renderer.js

// ... other code (search, filtering, audio playback, etc.) ...

// DOMContentLoaded wrapper for ALL playlist-related code (IMPORTANT!)
document.addEventListener('DOMContentLoaded', () => {
  let playlists = [];
  let modal = null;  // Modal for playlist creation

  // Function to load playlist tracks (make sure it's in scope!)
  function loadPlaylistTracks(playlistId) {
      console.log("Loading playlist tracks for ID:", playlistId);
      ipcRenderer.send('load-playlist-tracks', playlistId);
  }
  ipcRenderer.on('load-playlist-tracks', (event, tracks) => {
      // Update results div and total records display using the returned `tracks`
      // ...(Add the code to display the playlist tracks in your results div here)...
  });




  // Load playlists on startup
  ipcRenderer.send('load-playlists');
  ipcRenderer.on('playlists-loaded', (event, data) => {
      playlists = data;
      renderPlaylists();
  });

  // Function to render playlists in the sidebar
  function renderPlaylists() {
      const playlistsDiv = document.getElementById('playlists');
      playlistsDiv.innerHTML = ''; // Clear previous playlists

      playlists.forEach(playlist => {
          const playlistButton = document.createElement('button');
          playlistButton.textContent = playlist.name;
          playlistButton.setAttribute('data-playlist-id', playlist.id);

          playlistButton.addEventListener('click', () => {
              console.log("Playlist button clicked:", playlist.id);
              loadPlaylistTracks(playlist.id); // Call with playlist.id
          });

          const deleteIcon = document.createElement('i');
          deleteIcon.className = 'fas fa-trash delete-playlist-icon';
          deleteIcon.setAttribute('data-id', playlist.id);
          deleteIcon.addEventListener('click', (e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this playlist?')) {
                  deletePlaylist(playlist.id);
              }
          });
          playlistButton.appendChild(deleteIcon);
          playlistsDiv.appendChild(playlistButton);
      });
  }


  // Create Playlist Modal Handler
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
createPlaylistBtn.addEventListener('click', () => {
  // Create the modal ONLY ONCE
  if (!modal) {
      modal = document.createElement('div');
      modal.id = 'playlistModal';
      modal.classList.add('modal');
      modal.innerHTML = `
          <div class="modal-content">
              <h3>Create New Playlist</h3>
              <input type="text" id="playlistName" placeholder="Playlist Name">
              <button id="modalConfirm">Create</button>
              <button id="modalCancel">Cancel</button>
          </div>
      `;
      document.body.appendChild(modal);

      // Attach event listeners ONCE
      modal.addEventListener('click', modalClickHandler); // Use a named function for clarity
  }

  // Show the modal (or re-show if already exists)
  modal.style.display = 'block';
  modal.querySelector('#playlistName').focus(); // Set focus to the input field


});

// Modal Event Handler (outside the createPlaylistBtn listener)
function modalClickHandler(event) {

if (event.target.id === 'modalConfirm') {

    const playlistNameInput = document.getElementById("playlistName"); //get input
    const playlistName = playlistNameInput.value;


    if (playlistName.trim() !== '') { //check for empty name
        ipcRenderer.send('create-playlist', playlistName);

        modal.style.display = 'none'; // Hide, do not remove
        playlistNameInput.value = ''; // Clear Input

    }else {
        alert("Playlist name cannot be empty.");
    }





} else if (event.target.id === 'modalCancel') {

  modal.style.display = 'none'; // Hide, do not remove



}
}


  ipcRenderer.on('playlist-created', (event, newPlaylist) => {
      playlists.push(newPlaylist);
      renderPlaylists();
  });





  function deletePlaylist(playlistId) {
      ipcRenderer.send('delete-playlist', playlistId);
  }

  ipcRenderer.on('playlist-deleted', (event, playlistId) => {
      playlists = playlists.filter(playlist => playlist.id !== playlistId);
      renderPlaylists();
  });

}); // End of DOMContentLoaded wrapper