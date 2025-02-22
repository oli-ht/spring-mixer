// Spotify integration
const clientId = '1fff9d9421dd4c29a4401f21fa6e02d3';
const redirectUri = 'http://127.0.0.1:5501';

// Initialize Spotify Web Playback SDK
window.onSpotifyWebPlaybackSDKReady = () => {
    const spotifyConnect = document.getElementById('spotify-connect');
    const playerContainer = document.getElementById('spotify-player');
    
    // Check if we have a token in the URL (after redirect)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');

    if (accessToken) {
        // Create Spotify Player
        const player = new Spotify.Player({
            name: 'Spring Ambience Web Player',
            getOAuthToken: cb => { cb(accessToken); },
            volume: 0.5
        });

        // Connect to the player
        player.connect().then(success => {
            if (success) {
                spotifyConnect.textContent = 'Connected to Spotify';
                spotifyConnect.disabled = true;

                // Create player controls
                const controls = document.createElement('div');
                controls.className = 'spotify-controls';
                controls.innerHTML = `
                    <div class="spotify-now-playing">
                        <div class="album-art-container">
                            <div class="vinyl-disc"></div>
                            <div class="album-art">
                                <img src="" alt="Album Art" id="album-art">
                            </div>
                        </div>
                        <div class="track-info">
                            <div class="track-name"></div>
                            <div class="artist-name"></div>
                        </div>
                    </div>
                    <div class="audio-visualizer">
                        ${Array(16).fill('').map((_, i) => `<div class="bar" style="--i: ${i}"></div>`).join('')}
                    </div>
                    <div class="spotify-progress-container">
                        <input type="range" class="spotify-progress" value="0" min="0" max="100">
                        <div class="spotify-time">
                            <span class="time-current">0:00</span>
                            <span class="time-total">0:00</span>
                        </div>
                    </div>
                    <div class="spotify-controls-row">
                        <div class="spotify-buttons">
                            <button id="spotify-prev" class="spotify-control-btn">⏮</button>
                            <button id="spotify-play" class="spotify-control-btn">▶</button>
                            <button id="spotify-next" class="spotify-control-btn">⏭</button>
                        </div>
                        <div class="spotify-volume-container">
                            <svg class="volume-icon" viewBox="0 0 24 24">
                                <path d="M12,4L9,7H5V17H9l3,3V4z M18.5,12c0-1.77-1.02-3.29-2.5-4.03v8.05C17.48,15.29,18.5,13.77,18.5,12z"/>
                            </svg>
                            <input type="range" class="spotify-volume" value="50" min="0" max="100" orient="vertical">
                        </div>
                    </div>
                `;
                playerContainer.appendChild(controls);

                // Add these variables after getting the button elements
                const progressSlider = controls.querySelector('.spotify-progress');
                const timeCurrentSpan = controls.querySelector('.time-current');
                const timeTotalSpan = controls.querySelector('.time-total');

                // Add after the other control variables
                const volumeSlider = controls.querySelector('.spotify-volume');

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

                // Add this variable at the top of your success block
                let progressInterval;

                // Ready
                player.addListener('ready', ({ device_id }) => {
                    console.log('Ready with Device ID', device_id);
                    
                    // Transfer playback
                    fetch('https://api.spotify.com/v1/me/player', {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            device_ids: [device_id],
                            play: false
                        })
                    }).catch(error => {
                        console.error('Transfer playback error:', error);
                        // Show instructions
                        playerContainer.innerHTML = `
                            <div style="text-align: center; padding: 2rem;">
                                <p style="color: #2c4a3d; margin-bottom: 1rem; font-size: 1.1rem;">
                                    To use the player:
                                    <br><br>
                                    1. Open Spotify on your phone or computer
                                    <br>
                                    2. Play any song
                                    <br>
                                    3. Click the button below to try again
                                </p>
                                <button class="spotify-button" onclick="location.reload()">
                                    Try Again
                                </button>
                            </div>
                        `;
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
                    
                    // Clear any existing interval
                    if (progressInterval) {
                        clearInterval(progressInterval);
                    }

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
                    
                    // Initial progress update
                    const { position, duration } = state;
                    progressSlider.value = (position / duration) * 100;
                    timeCurrentSpan.textContent = formatTime(position);
                    timeTotalSpan.textContent = formatTime(duration);

                    // Set up continuous progress updates if not paused
                    if (!state.paused) {
                        let currentPosition = position;
                        progressInterval = setInterval(() => {
                            currentPosition += 1000; // Add 1 second
                            if (currentPosition <= duration) {
                                progressSlider.value = (currentPosition / duration) * 100;
                                timeCurrentSpan.textContent = formatTime(currentPosition);
                            } else {
                                clearInterval(progressInterval);
                            }
                        }, 1000);
                    }

                    // Update visualizer animation state
                    const visualizer = document.querySelector('.audio-visualizer');
                    if (state.paused) {
                        visualizer.classList.remove('playing');
                    } else {
                        visualizer.classList.add('playing');
                    }

                    // Update album art spinning
                    const albumArtDiv = document.querySelector('.album-art');
                    if (state.paused) {
                        albumArtDiv.classList.remove('spinning');
                    } else {
                        albumArtDiv.classList.add('spinning');
                    }
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

                // Add volume control functionality
                volumeSlider.addEventListener('input', () => {
                    const volume = volumeSlider.value / 100;
                    player.setVolume(volume);
                    
                    const volumeContainer = controls.querySelector('.spotify-volume-container');
                    if (volume === 0) {
                        volumeContainer.setAttribute('data-level', 'mute');
                    } else if (volume < 0.3) {
                        volumeContainer.setAttribute('data-level', 'low');
                    } else if (volume < 0.7) {
                        volumeContainer.setAttribute('data-level', 'medium');
                    } else {
                        volumeContainer.setAttribute('data-level', 'high');
                    }
                });

                // Update volume icon based on level
                volumeSlider.addEventListener('change', () => {
                    const volume = volumeSlider.value / 100;
                    const volumeIcon = controls.querySelector('.volume-icon');
                    if (volume === 0) {
                        volumeIcon.classList.remove('high');
                        volumeIcon.classList.add('low');
                    } else if (volume < 0.3) {
                        volumeIcon.classList.remove('high');
                        volumeIcon.classList.add('medium');
                    } else if (volume < 0.7) {
                        volumeIcon.classList.remove('low');
                        volumeIcon.classList.add('medium');
                    } else {
                        volumeIcon.classList.remove('low');
                        volumeIcon.classList.add('high');
                    }
                });

                // Clean up interval when component unmounts or on errors
                player.addListener('initialization_error', () => clearInterval(progressInterval));
                player.addListener('authentication_error', () => clearInterval(progressInterval));
                player.addListener('account_error', () => clearInterval(progressInterval));
                player.addListener('playback_error', () => clearInterval(progressInterval));
            }
        }).catch(error => {
            console.error('Player connect error:', error);
            playerContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <p style="color: #2c4a3d; margin-bottom: 1rem; font-size: 1.1rem;">
                        To use the player:
                        <br><br>
                        1. Make sure you have Spotify Premium
                        <br>
                        2. Open Spotify on another device
                        <br>
                        3. Play any song
                        <br>
                        4. Click the button below
                    </p>
                    <button class="spotify-button" onclick="location.reload()">
                        Try Again
                    </button>
                </div>
            `;
        });
    } else {
        console.log('No access token found in URL');
    }

    spotifyConnect.addEventListener('click', () => {
        const scope = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state';
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
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
            const audio = document.getElementById(audioId);
            if (audio) {
                // Add error checking for the audio file
                if (audio.error) {
                    console.error(`Error with audio ${audioId}:`, audio.error);
                    return;
                }

                audio.volume = slider.value / 100;
                
                // If audio hasn't started playing yet, start it
                if (audio.paused) {
                    audio.play()
                        .then(() => {
                            const button = document.querySelector(`.play-pause[data-audio="${audioId}"]`);
                            if (button) button.textContent = 'Pause';
                            console.log(`Playing ${audioId}`); // Debug log
                        })
                        .catch(error => {
                            console.error(`Error playing ${audioId}:`, error);
                            const button = document.querySelector(`.play-pause[data-audio="${audioId}"]`);
                            if (button) button.textContent = 'Play';
                        });
                }
            } else {
                console.error(`Audio element not found: ${audioId}`);
            }
        });

        // Prevent drag behavior
        slider.addEventListener('dragstart', (e) => {
            e.preventDefault();
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

    // Boost volume for quiet audio files
    const breezeAudio = document.getElementById('breeze');
    const peopleAudio = document.getElementById('people');
    
    if (breezeAudio) {
        breezeAudio.addEventListener('loadeddata', () => {
            breezeAudio.volume = 2.0; // Boost volume
        });
    }
    
    if (peopleAudio) {
        peopleAudio.addEventListener('loadeddata', () => {
            peopleAudio.volume = 2.0; // Boost volume
        });
    }
}); 