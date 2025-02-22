const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Models
const Todo = mongoose.model('Todo', {
    text: String,
    completed: Boolean,
    createdAt: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', {
    date: String,
    title: String,
    color: String,
    createdAt: { type: Date, default: Date.now }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/todos', async (req, res) => {
    try {
        const todos = await Todo.find().sort({ createdAt: -1 });
        res.json(todos);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching todos' });
    }
});

app.post('/api/todos', async (req, res) => {
    try {
        const todo = new Todo({
            text: req.body.text,
            completed: false
        });
        await todo.save();
        res.json(todo);
    } catch (error) {
        res.status(500).json({ error: 'Error creating todo' });
    }
});

app.delete('/api/todos/:id', async (req, res) => {
    try {
        await Todo.findByIdAndDelete(req.params.id);
        res.json({ message: 'Todo deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting todo' });
    }
});

app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching events' });
    }
});

app.post('/api/events', async (req, res) => {
    try {
        const event = new Event({
            date: req.body.date,
            title: req.body.title,
            color: req.body.color
        });
        await event.save();
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Error creating event' });
    }
});

app.delete('/api/events/:id', async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.json({ message: 'Event deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting event' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 