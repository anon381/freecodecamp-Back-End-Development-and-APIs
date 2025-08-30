require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(process.env.DB_URI);

const userSchema = new mongoose.Schema({ username: String });
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  duration: Number,
  date: Date // <-- change from String to Date
});
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const user = new User({ username: req.body.username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    res.status(400).json({ error: 'Could not create user' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  const users = await User.find({});
  res.json(users.map(u => ({ username: u.username, _id: u._id })));
});

// Add an exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    console.log('POST /api/users/:_id/exercises', req.body); // Add this line
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { description, duration, date } = req.body;
    const exerciseDate = date ? new Date(date) : new Date();

    const exercise = new Exercise({
      userId: user._id,
      description,
      duration: Number(duration),
      date: exerciseDate
    });
    await exercise.save();

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    console.error('Error in POST /api/users/:_id/exercises:', err); // Add this line
    res.status(400).json({ error: 'Could not add exercise' });
  }
});

// Get exercise logs
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

    let exercises = await Exercise.find({ userId: user._id }).select('description duration date');

    // Apply date filters
    if (from) exercises = exercises.filter(e => new Date(e.date) >= from);
    if (to) exercises = exercises.filter(e => new Date(e.date) <= to);

    // Apply limit
    if (Number.isInteger(limit) && limit > 0) {
      exercises = exercises.slice(0, limit);
    }

    // Always return date as toDateString string
    const log = exercises.map(e => ({
      description: e.description,
      duration: Number(e.duration),
      date: new Date(e.date).toDateString()
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log
    });
  } catch (err) {
    res.status(400).json({ error: 'Could not get logs' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
