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
    userId: String,
    description: String,
    duration: Number,
    date: String
});
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', async (req, res) => {
    const username = req.body.username;
    const user = new User({ username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
});

app.post('/api/users/:_id/exercises', async (req, res) => {
    const userId = req.params._id;
    const { description, duration, date } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.json({ error: 'User not found' });
    const exerciseDate = date ? new Date(date).toDateString() : new Date().toDateString();
    const exercise = new Exercise({
        userId,
        description,
        duration: Number(duration),
        date: exerciseDate
    });
    await exercise.save();
    res.json({
        username: user.username,
        description,
        duration: Number(duration),
        date: exerciseDate,
        _id: user._id
    });
});

app.get('/api/users/:_id/logs', async (req, res) => {
    const userId = req.params._id;
    const user = await User.findById(userId);
    if (!user) return res.json({ error: 'User not found' });
    const exercises = await Exercise.find({ userId });
    res.json({
        username: user.username,
        count: exercises.length,
        _id: user._id,
        log: exercises.map(e => ({ description: e.description, duration: e.duration, date: e.date }))
    });
});

app.listen(process.env.PORT || 3001, () => {
    console.log('Exercise Tracker listening');
});

// ...existing code...


app.get('/api/users/:id/logs', (req, res) => {
    const id = req.params.id;
    const dateFrom = new Date(req.query.from);
    const dateTo = new Date(req.query.to);
    const limit = parseInt(req.query.limit);

    User.findOne({ _id: new ObjectId(id) }, (err, data) => {
        if (err) return res.send(ERROR)

        let log = [];

        data.exercises.filter(exercise =>
            new Date(Date.parse(exercise.date)).getTime() > dateFrom
            && new Date(Date.parse(exercise.date)).getTime() < dateTo
        )

        for (const exercise of data.exercises) {
            log.push({
                description: exercise.description,
                duration: exercise.duration,
                date: new Date(exercise.date).toDateString()
            })
        }

        if (limit) log = log.slice(0, limit)

        res.json({
            _id: data._id,
            username: data.username,
            count: log.length,
            log: log
        })
    })
})

app.post('/api/users', (req, res) => {
    const username = req.body.username;
    User.create({ username: username }, (err, data) => {
            if (err) return res.send(ERROR)
            res.json({ _id: data._id, username: data.username })
        }
    )
})

app.post('/api/users/:id/exercises', (req, res) => {
    const id = req.params.id;
    let { description, duration, date } = req.body;

    const newExercise = {
        description: description,
        duration: duration,
        date: date ? new Date(date).toDateString() : new Date().toDateString()
    };

    User.findOne({ _id: new ObjectId(id) }, (err, data) => {
            if (err) return res.send(ERROR)
            data.exercises.push(newExercise);
            data.save((err, data) => {
                const response = {
                    username: data.username,
                    description: data.exercises[data.exercises.length - 1].description,
                    duration: data.exercises[data.exercises.length - 1].duration,
                    date: new Date(data.exercises[data.exercises.length - 1].date).toDateString(),
                    _id: data._id
                };

                res.json(response)
            })
        }
    )
})

const listener = app.listen(process.env.PORT || 3001, () => {
    console.log('Your app is listening on port ' + listener.address().port)
})
