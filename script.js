// Spotify integration
const clientId = '1fff9d9421dd4c29a4401f21fa6e02d3'; // Replace with the new Client ID from your dashboard
const redirectUri = 'http://127.0.0.1:5501'; // Change to port 5501

// Initialize Spotify Web Playback SDK
window.onSpotifyWebPlaybackSDKReady = () => {
    console.log('Spotify SDK Ready'); // Add this debug log
    const spotifyConnect = document.getElementById('spotify-connect');
    const playerContainer = document.getElementById('spotify-player');
    
    // Check if we have a token in the URL (after redirect)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    console.log('Hash:', hash);
    console.log('Access Token:', accessToken);

    if (accessToken) {
        console.log('Got access token, initializing player...');
        
        // Create Spotify Player
        const player = new Spotify.Player({
            name: 'Spring Ambience Web Player',
            getOAuthToken: cb => { cb(accessToken); },
            volume: 0.5
        });

        // Connect to the player
        player.connect().then(success => {
            console.log('Player connect result:', success);
            if (success) {
                console.log('Connected to Spotify!');
                spotifyConnect.textContent = 'Connected to Spotify';
                spotifyConnect.disabled = true;

                // Create player controls after successful connection
                const controls = document.createElement('div');
                controls.className = 'spotify-controls';
                controls.innerHTML = `
                    <div class="spotify-now-playing">
                        <div class="album-art">
                            <img src="" alt="Album Art" id="album-art">
                        </div>
                        <div class="track-info">
                            <div class="track-name"></div>
                            <div class="artist-name"></div>
                        </div>
                    </div>
                    <div class="spotify-progress-container">
                        <input type="range" class="spotify-progress" value="0" min="0" max="100">
                        <div class="spotify-time">
                            <span class="time-current">0:00</span>
                            <span class="time-total">0:00</span>
                        </div>
                    </div>
                    <div class="spotify-buttons">
                        <button id="spotify-prev" class="spotify-control-btn">⏮</button>
                        <button id="spotify-play" class="spotify-control-btn">▶</button>
                        <button id="spotify-next" class="spotify-control-btn">⏭</button>
                    </div>
                `;
                playerContainer.appendChild(controls);

                // Add these variables after getting the button elements
                const progressSlider = controls.querySelector('.spotify-progress');
                const timeCurrentSpan = controls.querySelector('.time-current');
                const timeTotalSpan = controls.querySelector('.time-total');

                // Add this function to format time
                function formatTime(ms) {
                    const seconds = Math.floor(ms / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const remainingSeconds = seconds % 60;
                    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
                }

                // Add player controls functionality
                const playButton = document.getElementById('spotify-play');
                const prevButton = document.getElementById('spotify-prev');
                const nextButton = document.getElementById('spotify-next');

                // Ready
                player.addListener('ready', ({ device_id }) => {
                    console.log('Ready with Device ID', device_id);
                    // Transfer playback to our new device
                    fetch('https://api.spotify.com/v1/me/player', {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            device_ids: [device_id],
                            play: false,
                        }),
                    });
                });

                // Not Ready
                player.addListener('not_ready', ({ device_id }) => {
                    console.log('Device ID has gone offline', device_id);
                });

                // Add event listeners to buttons
                playButton.addEventListener('click', () => {
                    player.getCurrentState().then(state => {
                        if (!state) {
                            console.error('User is not playing music through the Web Playback SDK');
                            return;
                        }
                        player.togglePlay();
                    });
                });

                prevButton.addEventListener('click', () => {
                    player.previousTrack();
                });

                nextButton.addEventListener('click', () => {
                    player.nextTrack();
                });

                // Update play button state
                player.addListener('player_state_changed', state => {
                    if (!state) {
                        console.error('User is not playing music through the Web Playback SDK');
                        return;
                    }
                    
                    console.log('Player State:', state);
                    playButton.textContent = state.paused ? '▶' : '⏸';
                    
                    // Update track info
                    const trackName = document.querySelector('.track-name');
                    const artistName = document.querySelector('.artist-name');
                    const albumArt = document.getElementById('album-art');
                    
                    if (state.track_window.current_track) {
                        const track = state.track_window.current_track;
                        trackName.textContent = track.name;
                        artistName.textContent = track.artists.map(artist => artist.name).join(', ');
                        albumArt.src = track.album.images[0].url;
                    }
                    
                    // Update progress bar and time
                    const { position, duration } = state;
                    progressSlider.value = (position / duration) * 100;
                    timeCurrentSpan.textContent = formatTime(position);
                    timeTotalSpan.textContent = formatTime(duration);
                });

                // Add progress slider functionality
                progressSlider.addEventListener('change', () => {
                    player.getCurrentState().then(state => {
                        if (state) {
                            const position = (progressSlider.value / 100) * state.duration;
                            player.seek(position);
                        }
                    });
                });
            }
        }).catch(error => {
            console.error('Player connect error:', error);
            playerContainer.innerHTML = '<p style="color: red;">Error: Make sure you have a Spotify Premium account and an active Spotify session.</p>';
        });

        // Error handling
        player.addListener('initialization_error', ({ message }) => {
            console.error('Failed to initialize:', message);
            playerContainer.innerHTML = `<p style="color: red;">Initialization Error: ${message}</p>`;
        });
        player.addListener('authentication_error', ({ message }) => {
            console.error('Failed to authenticate:', message);
            playerContainer.innerHTML = `<p style="color: red;">Authentication Error: ${message}</p>`;
        });
        player.addListener('account_error', ({ message }) => {
            console.error('Failed to validate Spotify account:', message);
            playerContainer.innerHTML = `<p style="color: red;">Account Error: ${message}. Premium required.</p>`;
        });
        player.addListener('playback_error', ({ message }) => {
            console.error('Failed to perform playback:', message);
            playerContainer.innerHTML = `<p style="color: red;">Playback Error: ${message}</p>`;
        });
    } else {
        console.log('No access token found in URL');
    }

    spotifyConnect.addEventListener('click', () => {
        const scope = 'streaming user-read-email user-read-private user-library-read user-library-modify user-read-playback-state user-modify-playback-state playlist-read-private playlist-modify-public playlist-modify-private';
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&show_dialog=true`;
        console.log('Auth URL:', authUrl);
        window.location.href = authUrl;
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const playPauseButtons = document.querySelectorAll('.play-pause');
    const volumeSliders = document.querySelectorAll('.volume');

    // Function to handle play/pause
    function togglePlay(button, audioId) {
        const audio = document.getElementById(audioId);
        
        if (audio.paused) {
            audio.play()
                .then(() => {
                    button.textContent = 'Pause';
                })
                .catch(error => {
                    console.error('Error playing audio:', error);
                    button.textContent = 'Play';
                });
        } else {
            audio.pause();
            button.textContent = 'Play';
        }
    }

    // Function to handle volume
    function adjustVolume(slider, audioId) {
        const audio = document.getElementById(audioId);
        audio.volume = slider.value / 100;
    }

    // Add event listeners to play/pause buttons
    playPauseButtons.forEach(button => {
        button.addEventListener('click', () => {
            const audioId = button.getAttribute('data-audio');
            togglePlay(button, audioId);
        });
    });

    // Add event listeners to volume sliders
    volumeSliders.forEach(slider => {
        slider.addEventListener('input', () => {
            const audioId = slider.getAttribute('data-audio');
            adjustVolume(slider, audioId);
        });
    });

    // Add ended event listeners to reset button text when audio finishes
    document.querySelectorAll('audio').forEach(audio => {
        audio.addEventListener('ended', () => {
            const button = document.querySelector(`.play-pause[data-audio="${audio.id}"]`);
            button.textContent = 'Play';
        });
    });

    // Timer functionality
    const timerDisplay = document.querySelector('.timer-display');
    const timerControl = document.querySelector('.timer-control');
    const timerPresets = document.querySelectorAll('.timer-preset');
    
    let timeLeft = 25 * 60; // Default 25 minutes in seconds
    let timerId = null;

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function startTimer() {
        if (timerId === null) {
            timerId = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timerId);
                    timerId = null;
                    timerControl.textContent = 'Start';
                    // Optional: Play a sound when timer ends
                    const audio = new Audio('path/to/timer-sound.mp3');
                    audio.play();
                }
            }, 1000);
            timerControl.textContent = 'Pause';
        } else {
            clearInterval(timerId);
            timerId = null;
            timerControl.textContent = 'Start';
        }
    }

    timerPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const minutes = parseInt(preset.dataset.minutes);
            timeLeft = minutes * 60;
            updateTimerDisplay();
            // Reset timer state
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
                timerControl.textContent = 'Start';
            }
        });
    });

    timerControl.addEventListener('click', startTimer);

    // Todo List functionality
    const todoInput = document.querySelector('.todo-input');
    const todoAdd = document.querySelector('.todo-add');
    const todoList = document.querySelector('.todo-list');

    function createTodoItem(text) {
        const todoItem = document.createElement('div');
        todoItem.className = 'todo-item';
        
        const checkbox = document.createElement('div');
        checkbox.className = 'todo-checkbox';
        
        const todoText = document.createElement('span');
        todoText.className = 'todo-text';
        todoText.textContent = text;

        todoItem.appendChild(checkbox);
        todoItem.appendChild(todoText);

        checkbox.addEventListener('click', () => {
            checkbox.classList.toggle('checked');
            todoItem.classList.toggle('completed');
            // Optional: Remove item after a delay when checked
            if (checkbox.classList.contains('checked')) {
                setTimeout(() => {
                    todoItem.style.opacity = '0';
                    setTimeout(() => todoItem.remove(), 300);
                }, 1000);
            }
        });

        return todoItem;
    }

    function addTodo() {
        const text = todoInput.value.trim();
        if (text) {
            todoList.appendChild(createTodoItem(text));
            todoInput.value = '';
        }
    }

    todoAdd.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });

    // Modal functionality
    const infoButton = document.querySelector('.info-button');
    const modal = document.querySelector('.modal');
    const closeButton = document.querySelector('.close-button');

    infoButton.addEventListener('click', () => {
        modal.classList.add('active');
    });

    closeButton.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
    });
}); 