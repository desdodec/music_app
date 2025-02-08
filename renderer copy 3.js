const { ipcRenderer } = require('electron');
const path = require('path');

document.addEventListener('DOMContentLoaded', () => {
    let playlists = [];
    let modal = null;
    let currentAudio = null; // Currently playing Audio object
    let currentTrackId = null; // ID of the currently playing track
    let currentPlayButton = null; // The play button of the currently playing track
    let activeFilter = 'all';
    let currentPage = 1;
    const recordsPerPage = 10;
    let totalPages = 1;


    // --- Helper Functions ---
    function loadPlaylistTracks(playlistId) {
        console.log("loadPlaylistTracks called with ID:", playlistId);
        ipcRenderer.send('load-playlist-tracks', playlistId);
    }

    function deletePlaylist(playlistId) {
        console.log("deletePlaylist called with ID:", playlistId);
        ipcRenderer.send('delete-playlist', playlistId);
    }

    function stopCurrentAudio() {
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
            if (currentPlayButton) {
                currentPlayButton.querySelector('i').classList.remove('fa-pause'); //select the i tag
                currentPlayButton.querySelector('i').classList.add('fa-play');    //select the i tag
            }
            // Reset waveform (if any)
            const waveformElement = document.querySelector(`.waveform[data-track-id="${currentTrackId}"] .waveform-progress`);
            if(waveformElement) {
                waveformElement.style.clipPath = 'inset(0 100% 0 0)';
            }
        }
    }

    function updateWaveformProgress(audio, waveformElement) {
        if (waveformElement) {
            const totalDuration = audio.duration;
            const progressPercentage = (audio.currentTime / totalDuration) * 100;
            waveformElement.style.clipPath = `inset(0 ${100 - progressPercentage}% 0 0)`;
        }
    }

        function playAudio(trackId, audioPath, playButton, waveformBasePath, waveformOverPath) {

        const buttonIcon = playButton.querySelector('i');

        // Check if we're clicking on the button of the *currently playing* track
        if (currentTrackId === trackId) {
            if (currentAudio.paused) {
                currentAudio.play();
                buttonIcon.classList.remove('fa-play');
                buttonIcon.classList.add('fa-pause');
            } else {
                currentAudio.pause();
                buttonIcon.classList.remove('fa-pause');
                buttonIcon.classList.add('fa-play');
            }
        } else { // Clicking on a *different* track's button
            stopCurrentAudio(); // Stop any currently playing audio

            currentAudio = new Audio(audioPath);
            currentTrackId = trackId;
            currentPlayButton = playButton;


            currentAudio.play()
                .then(() => {
                   buttonIcon.classList.remove('fa-play');
                    buttonIcon.classList.add('fa-pause');

                    const waveformElement = document.querySelector(`.waveform[data-track-id="${trackId}"] .waveform-progress`);
                    currentAudio.ontimeupdate = () => updateWaveformProgress(currentAudio, waveformElement);

                    currentAudio.onended = () => {
                        if (waveformElement) {
                          waveformElement.style.clipPath = 'inset(0 100% 0 0)';
                        }
                        buttonIcon.classList.remove('fa-pause');
                        buttonIcon.classList.add('fa-play');
                        currentAudio = null;
                        currentTrackId = null;
                        currentPlayButton = null;
                    };


                })
                .catch(err => {
                    console.error('Playback failed:', err);
                    alert('Failed to play audio. Please check the file path.');
                });

                currentAudio.onerror = () => {
                    console.error("Audio error:", currentAudio.error);
                      alert("An error occurred while trying to play the audio.");
                    stopCurrentAudio(); // Stop audio and reset UI on error
                }
        }
    }



    // --- IPC Event Handlers ---
        ipcRenderer.on('playlists-loaded', (event, data) => {
        console.log("playlists-loaded event received:", data);
        playlists = data;
        renderPlaylists();
    });

    ipcRenderer.on('playlist-deleted', (event, playlistId) => {
        console.log("playlist-deleted event received, ID:", playlistId);
        playlists = playlists.filter(playlist => playlist.id !== playlistId);
        renderPlaylists();
    });

    ipcRenderer.on('playlist-created', (event, newPlaylist) => { //receives playlist
        console.log("playlist-created event received:", newPlaylist);
        playlists.push(newPlaylist); // Add the new playlist to the array
        renderPlaylists();        // Re-render the playlist list
    });

       ipcRenderer.on('load-playlist-tracks', (event, tracks) => { //receives tracks
        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = '';
        if (tracks.length === 0) {
            resultsDiv.innerHTML = '<p>No tracks found in this playlist.</p>';
        } else {
            tracks.forEach(track => {
                const trackElement = document.createElement('div');
                trackElement.classList.add('result');
                trackElement.innerHTML = `
                    <div>${track.title}</div>
                    <div>${track.track_id}</div>
                `;
                resultsDiv.appendChild(trackElement);
            });
        }
    });

    // --- Modal Click Handler ---

    function modalClickHandler(event) {
        console.log("modalClickHandler called. Event target:", event.target);

        if (event.target.id === 'modalConfirm') {
            console.log("modalConfirm clicked");
            const playlistNameInput = document.getElementById("playlistName");
            const playlistName = playlistNameInput.value;
            if (playlistName.trim() !== '') {
                console.log("Creating new playlist with name:", playlistName);
                ipcRenderer.send('create-playlist', playlistName);
                modal.style.display = 'none';
                playlistNameInput.value = '';
            } else {
                console.log("Playlist name is empty");
                alert("Playlist name cannot be empty.");
            }
        } else if (event.target.id === 'modalCancel') {
            console.log("modalCancel clicked");
            modal.style.display = 'none';
        }
    }

    // --- Playlist Rendering ---
   function renderPlaylists() {
        console.log("renderPlaylists called. Current playlists:", playlists);
        const playlistsDiv = document.getElementById('playlists');
        playlistsDiv.innerHTML = ''; // Clear existing content

        playlists.forEach(playlist => {
            const playlistItem = document.createElement('div');
            playlistItem.style.display = 'flex';
            playlistItem.style.marginBottom = '5px';

            const playlistButton = document.createElement('button');
            playlistButton.textContent = playlist.name;
            playlistButton.setAttribute('data-playlist-id', playlist.id);
            playlistButton.style.marginRight = '5px';

            playlistButton.addEventListener('click', () => { // Attach event listener
                console.log("Playlist button clicked. Playlist ID:", playlist.id);
                loadPlaylistTracks(playlist.id);
            });

            const deleteIcon = document.createElement('i');
            deleteIcon.className = 'fas fa-trash delete-playlist-icon';
            deleteIcon.setAttribute('data-id', playlist.id);

            deleteIcon.addEventListener('click', (event) => { // Attach event listener
                event.stopPropagation();
                console.log("Delete icon clicked. Playlist ID:", playlist.id);
                if (confirm('Are you sure you want to delete this playlist?')) {
                   const playlistIdToDelete = parseInt(event.target.getAttribute('data-id'), 10);
                    ipcRenderer.send('delete-playlist', playlistIdToDelete); //send to main
                }
            });

            playlistItem.appendChild(playlistButton);
            playlistItem.appendChild(deleteIcon);
            playlistsDiv.appendChild(playlistItem);
        });
        console.log("Playlists rendered");
    }

    // --- Create Playlist Button Handler ---
    const createPlaylistBtn = document.getElementById('createPlaylistBtn');
    createPlaylistBtn.addEventListener('click', () => {
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'playlistModal';
        modal.className = 'modal';
        modal.innerHTML = `
          <div class="modal-content">
            <h3>Create New Playlist</h3>
            <input type="text" id="playlistName" placeholder="Playlist Name">
            <button id="modalConfirm">Create</button>
            <button id="modalCancel">Cancel</button>
          </div>
        `;
        document.body.appendChild(modal);
      }

      modal.style.display = 'block';
      const playlistNameInput = document.getElementById("playlistName");
      playlistNameInput.focus();

      // Remove previous listeners (if any) - CRITICAL for fixing the bug
      const oldModalConfirmBtn = document.getElementById('modalConfirm');
      const oldModalCancelBtn = document.getElementById('modalCancel');

      if(oldModalConfirmBtn) {
            let newModalConfirmBtn = oldModalConfirmBtn.cloneNode(true);
            oldModalConfirmBtn.parentNode.replaceChild(newModalConfirmBtn, oldModalConfirmBtn);
      }

        if(oldModalCancelBtn) {
            let newModalCancelBtn = oldModalCancelBtn.cloneNode(true);
            oldModalCancelBtn.parentNode.replaceChild(newModalCancelBtn, oldModalCancelBtn);
        }

        // Select buttons INSIDE the event listener
        const modalConfirmBtn = modal.querySelector('#modalConfirm');
        const modalCancelBtn = modal.querySelector('#modalCancel');

        // Attach new listeners
        modalConfirmBtn.addEventListener('click', () => {
            const playlistName = playlistNameInput.value;
            if (playlistName.trim() !== '') {
                ipcRenderer.send('create-playlist', playlistName);
                modal.style.display = 'none';
                playlistNameInput.value = ''; // Clear Input
            } else {
                alert("Playlist name cannot be empty.");
            }
        });

        modalCancelBtn.addEventListener('click', () => {
          modal.style.display = 'none';
        });

    });

    // Initial rendering
    ipcRenderer.send('load-playlists'); // Initial load request

    // --- Search and Filtering ---

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
                        <div class="waveform" data-duration="${track.duration || 0}" data-track-id="${trackId}">
                            <img src="${waveformBasePath}" alt="Waveform Base" class="waveform-base">
                            <img src="${waveformOverPath}" alt="Waveform Progress" class="waveform-progress">
                        </div>
                        <div>Duration: ${duration}</div>
                        <div class="controls">
                            <button class="control-btn play-btn" data-audio="${audioPath}" data-track-id="${trackId}"><i class="fas fa-play"></i></button>
                            <button class="control-btn add-to-playlist-btn" data-track-id="${track.id}"><i class="fas fa-plus"></i></button>
                            <button class="control-btn"><i class="fas fa-compact-disc"></i></button>
                        </div>
                    </div>
                `;

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

                const waveformContainer = trackElement.querySelector('.waveform');
                waveformContainer.addEventListener('click', (e) => {
                    const waveformRect = waveformContainer.getBoundingClientRect();
                    const clickPosition = e.clientX - waveformRect.left;
                    const totalDuration = parseFloat(waveformContainer.dataset.duration);
                    const playButton = trackElement.querySelector(`.play-btn[data-track-id="${trackId}"]`);

                    if (!audioPath || isNaN(totalDuration)) {
                        console.error('Audio path or duration missing!');
                        return;
                    }

                      // NEW: Check if audio is already playing
                    if (currentTrackId !== trackId) {
                         // If not playing the current track, start playing it
                        playAudio(trackId, audioPath, playButton);
                    }
                    // Always seek, whether playing or paused
                    currentAudio.currentTime = (clickPosition / waveformRect.width) * totalDuration;

                });

                const playButton = trackElement.querySelector(`.play-btn[data-track-id="${trackId}"]`);
                playButton.addEventListener('click', (e) => {

                     playAudio(trackId, audioPath, playButton); //Simplified logic
                });


                const addToPlaylistBtn = trackElement.querySelector('.add-to-playlist-btn');
                addToPlaylistBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const trackId = e.currentTarget.dataset.trackId;
                    console.log("Add to playlist clicked for track ID:", trackId);
                    alert(`Add track ${trackId} to playlist (implementation coming soon)`);
                });


                resultsDiv.appendChild(trackElement);
            });
        }

        document.getElementById('totalRecords').innerText = `Total Records: ${total}`;
        document.getElementById('pageInfo').innerText = `Page ${currentPage} of ${totalPages}`;
        togglePaginationButtons();
    });


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
}); // End of DOMContentLoaded