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