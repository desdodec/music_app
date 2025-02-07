const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const createPlaylistBtn = document.getElementById('createPlaylistBtn');
    const modal = document.getElementById('playlistModal');
    const modalConfirm = document.getElementById('modalConfirm');
    const modalCancel = document.getElementById('modalCancel');
    const playlistsDiv = document.getElementById('playlists');

    let playlistNameInput = null; // Placeholder for dynamically created input

    // 🚀 Show Modal
    function showModal() {
        console.log("🟢 Opening modal...");
    
        modal.classList.remove('hidden');
    
        // ✅ Check if input already exists, if not, create a new one
        playlistNameInput = document.getElementById("playlistName");
    
        if (!playlistNameInput) {
            console.log("🆕 Creating new input field for playlist name...");
            const parent = document.querySelector('.modal-content');
            playlistNameInput = document.createElement("input");
            playlistNameInput.type = "text";
            playlistNameInput.id = "playlistName";
            playlistNameInput.placeholder = "Enter playlist name";
            playlistNameInput.style.width = "100%";
            playlistNameInput.style.padding = "8px";
            playlistNameInput.style.marginBottom = "10px";
            parent.insertBefore(playlistNameInput, modalConfirm);
        }
    
        // ✅ Reset input value & ensure it gets focus
        playlistNameInput.value = "";
        setTimeout(() => {
            playlistNameInput.focus();
        }, 50);
    }
    

    // 🚀 Hide Modal
    function hideModal() {
        console.log("🔴 Closing modal...");
        modal.classList.add('hidden');
    }

    // 🚀 Create Playlist
    function createPlaylist() {
        const playlistName = playlistNameInput.value.trim();

        if (!playlistName) {
            alert("Playlist name cannot be empty.");
            return;
        }

        console.log("🎵 Creating new playlist:", playlistName);
        ipcRenderer.send('create-playlist', playlistName);
        hideModal();
    }

    // 🚀 Delete Playlist
    function deletePlaylist(playlistId) {
        console.log("🗑 Deleting playlist ID:", playlistId);
        ipcRenderer.send('delete-playlist', playlistId);
    }

    // 🚀 Render Playlists
    function renderPlaylists(playlists) {
        console.log("🎶 Rendering playlists:", playlists);
        playlistsDiv.innerHTML = '';

        playlists.forEach(playlist => {
            const div = document.createElement('div');
            div.textContent = playlist.name;
            div.style.display = "flex";
            div.style.justifyContent = "space-between";
            div.style.marginBottom = "10px";

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = "❌";
            deleteBtn.addEventListener('click', () => deletePlaylist(playlist.id));

            div.appendChild(deleteBtn);
            playlistsDiv.appendChild(div);
        });
    }

    // 🚀 Event Listeners
    createPlaylistBtn.addEventListener('click', showModal);
    modalConfirm.addEventListener('click', createPlaylist);
    modalCancel.addEventListener('click', hideModal);

    // 🚀 Handle IPC Responses
    ipcRenderer.on('playlists-loaded', (event, playlists) => renderPlaylists(playlists));
    ipcRenderer.on('playlist-created', (event, newPlaylist) => {
        console.log("✅ Playlist Created:", newPlaylist);
        ipcRenderer.send('load-playlists'); // Refresh the list
    });

    ipcRenderer.on('playlist-deleted', (event, playlistId) => {
        console.log("✅ Playlist Deleted:", playlistId);
        ipcRenderer.send('load-playlists'); // Refresh the list
    });

    // 🚀 Initial Load
    ipcRenderer.send('load-playlists');
});
