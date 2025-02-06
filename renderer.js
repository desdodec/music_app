document.addEventListener('DOMContentLoaded', () => {
  let playlists = [{ id: 1, name: "Test Playlist 1" }, { id: 2, name: "Test Playlist 2" }]; // Initial playlists
  let modal = null; // Modal element

  // Function to load playlist tracks
  function loadPlaylistTracks(playlistId) {
      console.log("loadPlaylistTracks called with ID:", playlistId);
      // (Add code here to send track loading request to main process)
  }

  // Function to delete a playlist
  function deletePlaylist(playlistId) {
      playlists = playlists.filter(playlist => playlist.id !== playlistId);
      renderPlaylists();
  }


  // Event Listener for Playlists Div
  const playlistsDiv = document.getElementById('playlists');
  playlistsDiv.addEventListener('click', function(event) {
      console.log("playlistsDiv Clicked element", event.target);

      //Playlist Delegation
      if (event.target.tagName === 'BUTTON' && event.target.hasAttribute('data-playlist-id')) {
          const playlistId = parseInt(event.target.getAttribute('data-playlist-id'), 10);
          console.log("Playlist button clicked (delegated)", playlistId)
          loadPlaylistTracks(playlistId);

      //Delection Delegation

      }  else if (event.target.classList.contains('delete-playlist-icon')) {
          event.stopPropagation(); // Stop event from propagating to playlist button

          console.log("is delete ICON" )
          const playlistIdToDelete = parseInt(event.target.getAttribute('data-id'), 10);

           console.log("playlistID", playlistIdToDelete)
          if (confirm('Are you sure you want to delete this playlist?')) {
              deletePlaylist(playlistIdToDelete);
          }
      }



  });

  // Function to render playlists in the sidebar
  function renderPlaylists() {
      console.log("renderPlaylists is fired")
      playlistsDiv.innerHTML = ''; // Clear existing playlists

      playlists.forEach(playlist => {
          const playlistItem = document.createElement('div'); // Container for button and delete icon
          playlistItem.style.display = 'flex' //<= allows the delete icon to be placed to the right
          playlistItem.style.marginBottom = '5px' //<= creates spacing between the playlist name buttons

          const playlistButton = document.createElement('button');
          playlistButton.textContent = playlist.name;
          playlistButton.setAttribute('data-playlist-id', playlist.id);
           playlistButton.style.marginRight = '5px'; //<= adds spacing betwwen playlist name and delete button


          const deleteIcon = document.createElement('i');
          deleteIcon.className = 'fas fa-trash delete-playlist-icon'; // Add class for styling and identification
          deleteIcon.setAttribute('data-id', playlist.id); // Store playlist ID in data-id attribute

           playlistItem.appendChild(playlistButton);
          playlistItem.appendChild(deleteIcon);
          playlistsDiv.appendChild(playlistItem);
      });
  }

  function modalClickHandler(event) {

      if (event.target.id === 'modalConfirm') {

          const playlistNameInput = document.getElementById("playlistName");

          const playlistName = playlistNameInput.value;
          if (playlistName.trim() !== '') {
              const newPlaylist = { id: playlists.length + 1, name: playlistName }; //<= use inputted playlist name
              playlists.push(newPlaylist);
              renderPlaylists(); //<= render list view after creating playlist

              modal.style.display = 'none'; // Hide, do not remove

              playlistNameInput.value = ''; // Clear Input

          } else {
              alert("Playlist name cannot be empty.");
          }

      } else if (event.target.id === 'modalCancel') {

          modal.style.display = 'none'; // Hide, do not remove

      }
  }


  // Event Listener for Modal button
  // Create Playlist Modal
  const createPlaylistBtn = document.getElementById('createPlaylistBtn');
  createPlaylistBtn.addEventListener('click', () => {
      console.log("createPlaylistBtn event fired")
      if (!modal) { //<= is modal has already been created

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

          // Attach the click handler to the single Modal element
          modal.addEventListener('click', modalClickHandler);


      }

      // Show the modal (or re-show if already exists)
      modal.style.display = 'block';

      const playlistNameInput = document.getElementById("playlistName")
      playlistNameInput.focus();

  });


  renderPlaylists(); // Initial rendering
});