require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.DB_URI);

const userSchema = new mongoose.Schema({ username: String });
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: String,
  duration: Number,
  date: String
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
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { description, duration, date } = req.body;
    const exerciseDate = date ? new Date(date).toDateString() : new Date().toDateString();

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
      date: exercise.date,
      _id: user._id
    });
  } catch (err) {
    res.status(400).json({ error: 'Could not add exercise' });
  }
});

// Get exercise logs
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let query = { userId: user._id };
    let from = req.query.from ? new Date(req.query.from) : null;
    let to = req.query.to ? new Date(req.query.to) : null;
    let limit = req.query.limit ? parseInt(req.query.limit) : null;
 
    let exercises = await Exercise.find(query);

    if (from) exercises = exercises.filter(e => new Date(e.date) >= from);
    if (to) exercises = exercises.filter(e => new Date(e.date) <= to);
    if (limit) exercises = exercises.slice(0, limit);

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: (new Date(e.date).toString() === "Invalid Date")
          ? e.date
          : new Date(e.date).toDateString()
      }))
    });
  } catch (err) {
    res.status(400).json({ error: 'Could not get logs' });
  }
});

const listener = app.listen(process.env.PORT || 3001, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
