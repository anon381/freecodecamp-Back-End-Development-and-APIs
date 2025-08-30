require('dotenv').config();

console.log(process.env.MONGO_URI)

const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose')
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

// Basic Configuration
try {
    mongoose.connect(process.env.MONGO_URI);
} catch (err) {
    console.log(err)
}

const port = process.env.PORT || 3000;

// Model
const schema = new mongoose.Schema(
    {
        original: { type: String, required: true },
        short: { type: Number, required: true }
    }
);
const Url = mongoose.model('Url', schema);

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get("/api/shorturl/:input", (req, res) => {
    const input = parseInt(req.params.input);
    Url.findOne({ short: input }, function (err, data) {
        if (err || data === null) return res.json({ error: "No short URL found" });
        return res.redirect(302, data.original);
    });
});

app.post("/api/shorturl", async (req, res) => {
    const originalUrl = req.body.url;
    let urlRegex = new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/);

    if (!originalUrl || !originalUrl.match(urlRegex)) {
        return res.json({ error: "Invalid URL" });
    }

    // Check if URL already exists
    Url.findOne({ original: originalUrl }, (err, foundUrl) => {
        if (err) return res.json({ error: "Database error" });
        if (foundUrl) {
            return res.json({ original_url: foundUrl.original, short_url: foundUrl.short });
        } else {
            // Find the highest short value
            Url.findOne({}).sort({ short: -1 }).exec((err, data) => {
                if (err) return res.json({ error: "Database error" });
                let nextShort = data ? data.short + 1 : 1;
                const newUrl = new Url({ original: originalUrl, short: nextShort });
                newUrl.save((err, savedUrl) => {
                    if (err || !savedUrl) {
                        return res.json({ error: "Unable to save URL" });
                    }
                    res.json({ original_url: savedUrl.original, short_url: savedUrl.short });
                });
            });
        }
    });
});

app.listen(port, function () {
    console.log(`Listening on port ${port}`);
});