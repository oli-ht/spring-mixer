// API URL for local development
const API_URL = 'http://localhost:3000/api';

// Spotify integration
const clientId = config.SPOTIFY_CLIENT_ID;
console.log('Config Object:', config);
console.log('Client ID:', clientId);
const redirectUri = 'http://localhost:5501';

// Add this code near the top of your script.js file, right after your other constants
let spotifyToken = null;
let spotifyPlayer = null;

// Calendar functionality - Move this to the top
const calendar = {
    currentDate: new Date(),
    events: {},
    init() {
        const prevMonth = document.getElementById('prevMonth');
        const nextMonth = document.getElementById('nextMonth');
        const saveEvent = document.getElementById('saveEvent');
        const cancelEvent = document.getElementById('cancelEvent');
        const calendarGrid = document.querySelector('.calendar-grid');

        if (prevMonth) {
            prevMonth.addEventListener('click', debounce(() => this.changeMonth(-1), 300));
        }
        if (nextMonth) {
            nextMonth.addEventListener('click', debounce(() => this.changeMonth(1), 300));
        }
        if (saveEvent) {
            saveEvent.addEventListener('click', () => this.saveEvent());
        }
        if (cancelEvent) {
            cancelEvent.addEventListener('click', () => this.closeModal());
        }
        if (calendarGrid) {
            calendarGrid.addEventListener('click', (e) => {
                const dayElement = e.target.closest('.day:not(.empty)');
                if (dayElement) {
                    this.openModal(dayElement.dataset.date);
                }
            });
        }

        this.render();
    },
    render() {
        const monthDisplay = document.getElementById('currentMonth');
        const calendarGrid = document.querySelector('.calendar-grid');
        
        // Clear existing days (except weekday headers)
        const days = calendarGrid.querySelectorAll('.day');
        days.forEach(day => day.remove());

        // Set month display
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'];
        monthDisplay.textContent = `${monthNames[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;

        // Add days
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);

        // Add empty cells for days before the first of the month
        for (let i = 0; i < firstDay.getDay(); i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'day empty';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let date = 1; date <= lastDay.getDate(); date++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            
            // Create date number as a separate element for better positioning
            const dateNumber = document.createElement('span');
            dateNumber.className = 'day-number';
            dateNumber.textContent = date;
            dayElement.appendChild(dateNumber);
            
            // Add date data attribute
            const dateString = `${this.currentDate.getFullYear()}-${(this.currentDate.getMonth() + 1).toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
            dayElement.dataset.date = dateString;

            // Create events container (add it always for consistent layout)
            const eventsPreviewContainer = document.createElement('div');
            eventsPreviewContainer.className = 'event-previews';
            dayElement.appendChild(eventsPreviewContainer);

            // Check for events on this date
            if (this.events[dateString]) {
                // Sort events by color for a nicer display
                const sortedEvents = [...this.events[dateString]].sort((a, b) => {
                    return a.color.localeCompare(b.color);
                });
                
                // Add each event as a preview, limit to 3 visible events
                const maxVisibleEvents = 3;
                const hasMoreEvents = sortedEvents.length > maxVisibleEvents;
                
                sortedEvents.slice(0, maxVisibleEvents).forEach(event => {
                    const eventPreview = document.createElement('div');
                    eventPreview.className = 'event-preview';
                    eventPreview.style.backgroundColor = event.color;
                    eventPreview.title = event.title; // Show title on hover
                    
                    // Add a short preview of the title
                    const shortTitle = event.title.length > 10 ? 
                                      event.title.substring(0, 8) + '...' : 
                                      event.title;
                    eventPreview.textContent = shortTitle;
                    
                    eventsPreviewContainer.appendChild(eventPreview);
                });
                
                // If there are more events than we can show, add a "+X more" indicator
                if (hasMoreEvents) {
                    const moreEventsIndicator = document.createElement('div');
                    moreEventsIndicator.className = 'event-preview more-events';
                    moreEventsIndicator.textContent = `+${sortedEvents.length - maxVisibleEvents} more`;
                    moreEventsIndicator.style.backgroundColor = '#888';
                    eventsPreviewContainer.appendChild(moreEventsIndicator);
                }
            }
            
            calendarGrid.appendChild(dayElement);
        }
    },
    changeMonth(delta) {
        this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
        this.render();
    },
    openModal(dateString) {
        const eventModal = document.getElementById('eventModal');
        const modalDate = document.getElementById('modalDate');
        const modalEventsContainer = document.querySelector('.modal-events-container');
        
        // Clear previous events
        modalEventsContainer.innerHTML = '';
        
        // Set the date
        modalDate.textContent = dateString;
        
        // Add existing events
        if (this.events[dateString]) {
            this.events[dateString].forEach(event => {
                const eventElement = document.createElement('div');
                eventElement.className = 'modal-event';
                eventElement.innerHTML = `
                    <div class="event-color" style="background-color: ${event.color}"></div>
                    <div class="event-title">${event.title}</div>
                    <button class="delete-event" data-id="${event._id}">×</button>
                `;
                modalEventsContainer.appendChild(eventElement);
                
                // Add event listener to delete button
                const deleteButton = eventElement.querySelector('.delete-event');
                deleteButton.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await this.deleteEvent(event._id);
                    modalEventsContainer.removeChild(eventElement);
                });
            });
        }
        
        // Show the modal
        eventModal.classList.add('active');
    },
    closeModal() {
        const eventModal = document.getElementById('eventModal');
        eventModal.classList.remove('active');
    },
    async saveEvent() {
        const date = document.getElementById('modalDate').textContent;
        const title = document.getElementById('eventTitle').value;
        const color = document.getElementById('eventColor').value;

        if (title.trim()) {
            try {
                const response = await fetch(`${API_URL}/events`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ date, title, color })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                await loadEvents();
                document.getElementById('eventTitle').value = '';
                this.closeModal();
            } catch (error) {
                console.error('Error saving event:', error);
            }
        }
    },
    async deleteEvent(id) {
        try {
            const response = await fetch(`${API_URL}/events/${id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // Remove from events array
            for (const date in this.events) {
                this.events[date] = this.events[date].filter(e => e._id !== id);
            }
            
            // Re-render calendar if no events left
            if (this.events[date].length === 0) {
                delete this.events[date];
                this.render();
            }
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    }
};

// Update the loadEvents function to ensure it's working properly
async function loadEvents() {
    try {
        console.log('Loading events from API...');
        const response = await fetch(`${API_URL}/events`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const events = await response.json();
        console.log('Received events:', events); // Add logging
        
        // Clear existing events
        calendar.events = {};
        
        // Process and add events
        events.forEach(event => {
            if (!calendar.events[event.date]) {
                calendar.events[event.date] = [];
            }
            calendar.events[event.date].push({
                title: event.title,
                color: event.color,
                _id: event._id
            });
        });
        
        console.log('Processed events:', calendar.events); // Add logging
        calendar.render();
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

// Add this function to handle the access token
function handleSpotifyCallback() {
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        spotifyToken = params.get('access_token');
        
        if (spotifyToken) {
            console.log('Spotify token received!');
            
            // Remove the access token from the URL
            window.history.replaceState({}, document.title, '/');
            
            // Initialize Spotify player
            initializeSpotifyPlayer(spotifyToken);
            
            // Update UI to show connected state
            const spotifyConnect = document.getElementById('spotify-connect');
            if (spotifyConnect) {
                spotifyConnect.textContent = 'Connected to Spotify';
                spotifyConnect.style.backgroundColor = '#1DB954'; // Spotify green
            }
        }
    }
}

// Add this function to initialize the Spotify Web Playback SDK
function initializeSpotifyPlayer(token) {
    // Load the Spotify Web Playback SDK script
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
        spotifyPlayer = new Spotify.Player({
            name: 'Spring Ambience Player',
            getOAuthToken: cb => { cb(token); },
            volume: 0.5
        });

        // Error handling
        spotifyPlayer.addListener('initialization_error', ({ message }) => {
            console.error('Failed to initialize Spotify player:', message);
        });

        spotifyPlayer.addListener('authentication_error', ({ message }) => {
            console.error('Failed to authenticate with Spotify:', message);
        });

        spotifyPlayer.addListener('account_error', ({ message }) => {
            console.error('Spotify account error:', message);
        });

        spotifyPlayer.addListener('playback_error', ({ message }) => {
            console.error('Spotify playback error:', message);
        });

        // When the player is ready, add the vinyl player UI
        spotifyPlayer.addListener('ready', ({ device_id }) => {
            console.log('Spotify player ready with device ID:', device_id);
            
            // Create vinyl player UI with album cover and progress bar
            const spotifyVinyl = document.createElement('div');
            spotifyVinyl.className = 'spotify-vinyl-player';
            spotifyVinyl.innerHTML = `
                <div class="vinyl-container">
                    <div class="record-outer">
                        <div class="album-cover"></div>
                        <div class="record-inner">
                            <div class="record-center"></div>
                        </div>
                    </div>
                    <div class="album-info">
                        <div class="now-playing-title">Not Playing</div>
                        <div class="now-playing-artist">Connect to Spotify</div>
                    </div>
                    <div class="progress-container">
                        <span class="current-time">0:00</span>
                        <input type="range" class="progress-slider" min="0" max="100" value="0">
                        <span class="total-time">0:00</span>
                    </div>
                    <div class="vinyl-controls">
                        <button id="vinyl-prev" class="vinyl-button"><i class="fas fa-step-backward"></i></button>
                        <button id="vinyl-play" class="vinyl-button"><i class="fas fa-play"></i></button>
                        <button id="vinyl-next" class="vinyl-button"><i class="fas fa-step-forward"></i></button>
                    </div>
                </div>
            `;
            
            // Insert vinyl player after the connect button
            const spotifyConnect = document.getElementById('spotify-connect');
            if (spotifyConnect && spotifyConnect.parentNode) {
                spotifyConnect.parentNode.insertBefore(spotifyVinyl, spotifyConnect.nextSibling);
            } else {
                // Fallback to the audio players container
                const spotifyContainer = document.querySelector('.spotify-container') || document.querySelector('.audio-players');
                if (spotifyContainer) {
                    spotifyContainer.appendChild(spotifyVinyl);
                }
            }
            
            // Add event listeners
            document.getElementById('vinyl-play').addEventListener('click', () => {
                const playButton = document.getElementById('vinyl-play');
                const recordOuter = document.querySelector('.record-outer');
                
                // Toggle play/pause
                if (playButton.querySelector('i').classList.contains('fa-play')) {
                    // Resume playback if already started before
                    spotifyPlayer.getCurrentState().then(state => {
                        if (state) {
                            // If there's a state, resume playback
                            spotifyPlayer.resume();
                        } else {
                            // If no state (first time), start playback
                            startPlayback(token, device_id);
                        }
                    });
                    
                    playButton.querySelector('i').classList.replace('fa-play', 'fa-pause');
                    recordOuter.classList.add('spinning');
                } else {
                    // Pause playback
                    spotifyPlayer.pause();
                    playButton.querySelector('i').classList.replace('fa-pause', 'fa-play');
                    recordOuter.classList.remove('spinning');
                }
            });
            
            document.getElementById('vinyl-prev').addEventListener('click', () => {
                spotifyPlayer.previousTrack();
            });
            
            document.getElementById('vinyl-next').addEventListener('click', () => {
                spotifyPlayer.nextTrack();
            });
            
            // Add progress slider functionality
            const progressSlider = document.querySelector('.progress-slider');
            if (progressSlider) {
                progressSlider.addEventListener('input', () => {
                    // Update time display while sliding
                    const currentTimeElement = document.querySelector('.current-time');
                    if (currentTimeElement) {
                        const position = (progressSlider.value / 100) * trackDuration;
                        currentTimeElement.textContent = formatTime(position);
                    }
                });
                
                progressSlider.addEventListener('change', () => {
                    // Seek to position when slider is released
                    spotifyPlayer.getCurrentState().then(state => {
                        if (state) {
                            const position = Math.floor((progressSlider.value / 100) * state.duration);
                            spotifyPlayer.seek(position);
                        }
                    });
                });
            }
            
            // Start playback when ready
            setTimeout(() => {
                startPlayback(token, device_id);
            }, 1000);
        });

        // Track variables to store duration and update progress
        let trackDuration = 0;
        let progressInterval = null;
        
        // Update player state when changed
        spotifyPlayer.addListener('player_state_changed', state => {
            if (!state) return;
            
            const currentTrack = state.track_window.current_track;
            updateNowPlaying(currentTrack);
            
            // Update track duration
            trackDuration = state.duration;
            
            // Update progress display
            updateProgressDisplay(state);
            
            // Setup/clear interval for progress updates
            clearInterval(progressInterval);
            if (!state.paused) {
                progressInterval = setInterval(() => {
                    spotifyPlayer.getCurrentState().then(state => {
                        if (state && !state.paused) {
                            updateProgressDisplay(state);
                        }
                    });
                }, 3000);
            }
            
            const playButton = document.getElementById('vinyl-play');
            const recordOuter = document.querySelector('.record-outer');
            
            if (state.paused) {
                playButton.querySelector('i').classList.replace('fa-pause', 'fa-play');
                recordOuter.classList.remove('spinning');
            } else {
                playButton.querySelector('i').classList.replace('fa-play', 'fa-pause');
                recordOuter.classList.add('spinning');
            }
        });

        // Connect to Spotify
        spotifyPlayer.connect();
    };
}

// Helper function to update progress display
function updateProgressDisplay(state) {
    const progressSlider = document.querySelector('.progress-slider');
    const currentTimeElement = document.querySelector('.current-time');
    const totalTimeElement = document.querySelector('.total-time');
    
    if (progressSlider && currentTimeElement && totalTimeElement) {
        // Update slider position
        const progress = (state.position / state.duration) * 100;
        progressSlider.value = progress;
        
        // Update time displays
        currentTimeElement.textContent = formatTime(state.position);
        totalTimeElement.textContent = formatTime(state.duration);
    }
}

// Helper function to format time from milliseconds to MM:SS
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to start playback
async function startPlayback(token, device_id) {
    try {
        // Get user's saved tracks or playlists
        const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                // Create a playlist of URIs from saved tracks
                const uris = data.items.map(item => item.track.uri);
                
                // Start playback with the first track
                await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${device_id}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        uris: uris
                    })
                });
            }
        }
    } catch (error) {
        console.error('Error starting playback:', error);
    }
}

// Update the updateNowPlaying function to remove lyrics-related code
function updateNowPlaying(track) {
    const titleElement = document.querySelector('.now-playing-title');
    const artistElement = document.querySelector('.now-playing-artist');
    const albumCover = document.querySelector('.album-cover');
    
    if (titleElement && artistElement && track) {
        titleElement.textContent = track.name;
        const artists = track.artists.map(artist => artist.name).join(', ');
        artistElement.textContent = artists;
        
        // Update album artwork
        if (albumCover && track.album && track.album.images && track.album.images.length > 0) {
            const artworkUrl = track.album.images[0].url;
            albumCover.style.backgroundImage = `url(${artworkUrl})`;
        }
    }
}

// Add this function to lazily load audio
function setupLazyAudio() {
    const audioElements = document.querySelectorAll('audio');
    
    audioElements.forEach(audio => {
        // Remove preload attribute and set it programmatically
        audio.removeAttribute('preload');
        
        // Only set src when play is clicked
        const button = document.querySelector(`.play-pause[data-audio="${audio.id}"]`);
        if (button) {
            const originalSrc = audio.src;
            audio.removeAttribute('src');
            
            button.addEventListener('click', () => {
                if (!audio.src) {
                    audio.src = originalSrc;
                }
                // Rest of your existing play logic
            });
        }
    });
}

// Add this debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add this function to help debug by creating test events
async function createTestEvents() {
    // Only run if no events exist
    const checkResponse = await fetch(`${API_URL}/events`);
    const existingEvents = await checkResponse.json();
    
    if (existingEvents.length === 0) {
        console.log('Creating test events...');
        
        // Get today's date
        const today = new Date();
        const formatDate = (date) => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        };
        
        // Create sample events for today and upcoming days
        const testEvents = [
            { 
                date: formatDate(today), 
                title: 'Test Event 1', 
                color: '#FF5733' 
            },
            { 
                date: formatDate(new Date(today.getTime() + 86400000)), // Tomorrow
                title: 'Test Event 2', 
                color: '#33FF57' 
            },
            { 
                date: formatDate(new Date(today.getTime() + 172800000)), // Day after tomorrow
                title: 'Test Event 3', 
                color: '#3357FF' 
            }
        ];
        
        // Add test events
        for (const event of testEvents) {
            await fetch(`${API_URL}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event)
            });
        }
        
        console.log('Test events created');
        await loadEvents();
    }
}

// Call this in development if needed
// Uncomment the line below to create test events automatically
// createTestEvents();

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize all elements first
    const todoInput = document.querySelector('.todo-input');
    const todoAdd = document.querySelector('.todo-add');
    const todoList = document.querySelector('.todo-list');
    const playPauseButtons = document.querySelectorAll('.play-pause');
    const volumeSliders = document.querySelectorAll('.volume');
    const timerDisplay = document.querySelector('.timer-display');
    const timerControl = document.querySelector('.timer-control');
    const timerPresets = document.querySelectorAll('.timer-preset');
    const spotifyConnect = document.getElementById('spotify-connect');

    spotifyConnect.addEventListener('click', () => {
        console.log('Connect button clicked');
        const scope = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state user-library-read';
        
        if (!clientId) {
            console.error('Client ID is undefined. Please check your configuration.');
            return;
        }
        
        // IMPORTANT: This must match EXACTLY what's in your Spotify Developer Dashboard
        const redirectUri = window.location.origin; // Use the current origin
        
        const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
        console.log('Auth URL:', authUrl);
        
        // Direct navigation instead of opening a new window
        window.location.href = authUrl;
    });
    // Audio player functionality
    playPauseButtons.forEach(button => {
        button.addEventListener('click', () => {
            console.log('Play/Pause clicked'); // Debug log
            const audioId = button.getAttribute('data-audio');
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
        });
    });

    // Volume slider functionality
    volumeSliders.forEach(slider => {
        slider.addEventListener('input', () => {
            console.log('Volume changed'); // Debug log
            const audioId = slider.getAttribute('data-audio');
            const audio = document.getElementById(audioId);
            audio.volume = slider.value / 100;
        });
    });

    // Timer functionality
    let timeLeft = 25 * 60;
    let timerId = null;

    timerControl.addEventListener('click', () => {
        console.log('Timer clicked'); // Debug log
        if (timerId === null) {
            timerId = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timerId);
                    timerId = null;
                    timerControl.textContent = 'Start';
                }
            }, 1000);
            timerControl.textContent = 'Pause';
        } else {
            clearInterval(timerId);
            timerId = null;
            timerControl.textContent = 'Start';
        }
    });

    // Todo functionality
    todoAdd.addEventListener('click', () => {
        console.log('Add todo clicked'); // Debug log
        addTodo();
    });

    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Enter pressed in todo input'); // Debug log
            addTodo();
        }
    });

    // Initialize data
    try {
        await Promise.all([loadTodos(), loadEvents()]);
        calendar.init();
    } catch (error) {
        console.error('Error during initialization:', error);
    }

    // Timer functionality
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Todo List functionality
    async function loadTodos() {
        try {
            console.log('Loading todos...'); // Debug log
            const response = await fetch(`${API_URL}/todos`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const todos = await response.json();
            console.log('Loaded todos:', todos); // Debug log
            
            // Clear the list
            todoList.innerHTML = '';
            
            // Add each todo
            todos.forEach(todo => {
                const todoItem = createTodoItem(todo.text, todo._id);
                todoList.appendChild(todoItem);
            });
        } catch (error) {
            console.error('Error loading todos:', error);
        }
    }

    async function addTodo() {
        const text = todoInput.value.trim();
        console.log('Adding todo:', text); // Debug log
        
        if (text) {
            try {
                const response = await fetch(`${API_URL}/todos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: text })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
                }
                
                const todo = await response.json();
                console.log('Todo created:', todo); // Debug log
                
                // Refresh the entire todo list instead of just appending
                await loadTodos();
                todoInput.value = '';
            } catch (error) {
                console.error('Error saving todo:', error);
            }
        }
    }

    async function deleteTodo(id) {
        try {
            await fetch(`${API_URL}/todos/${id}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    }

    // Update createTodoItem to handle MongoDB IDs
    function createTodoItem(text, id) {
        const todoItem = document.createElement('div');
        todoItem.className = 'todo-item';
        
        const checkbox = document.createElement('div');
        checkbox.className = 'todo-checkbox';
        
        const todoText = document.createElement('span');
        todoText.className = 'todo-text';
        todoText.textContent = text;

        todoItem.appendChild(checkbox);
        todoItem.appendChild(todoText);

        checkbox.addEventListener('click', async () => {
            checkbox.classList.toggle('checked');
            todoItem.classList.toggle('completed');
            if (checkbox.classList.contains('checked')) {
                setTimeout(async () => {
                    todoItem.style.opacity = '0';
                    await deleteTodo(id);
                    setTimeout(() => todoItem.remove(), 300);
                }, 1000);
            }
        });

        return todoItem;
    }

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
            breezeAudio.volume = Math.min(2.0, 1.0); // Ensure volume is capped at 1.0
        });
    }
    
    if (peopleAudio) {
        peopleAudio.addEventListener('loadeddata', () => {
            peopleAudio.volume = Math.min(2.0, 1.0); // Ensure volume is capped at 1.0
        });
    }

    // Add this to your DOMContentLoaded event listener
    const eventTitle = document.getElementById('eventTitle');
    const eventColor = document.getElementById('eventColor');
    const previewTitle = document.getElementById('previewTitle');
    const previewColor = document.getElementById('previewColor');

    // Update preview when typing
    eventTitle.addEventListener('input', () => {
        previewTitle.textContent = eventTitle.value || 'New Event';
    });

    // Update preview color when changed
    eventColor.addEventListener('input', () => {
        previewColor.style.backgroundColor = eventColor.value;
    });

    // Initialize preview color
    previewColor.style.backgroundColor = eventColor.value;

    // Check for Spotify callback when the page loads
    handleSpotifyCallback();

    // Add cleanup for any open intervals when the page unloads
    window.addEventListener('beforeunload', () => {
        clearInterval(progressInterval);
    });

    // Add this line
    setupLazyAudio();
}); 