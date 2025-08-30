require('dotenv').config();

console.log(process.env.MONGO_URI)

const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const dns = require('dns');
const urlModule = require('url');

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
app.get("/api/shorturl/:input", async (req, res) => {
    const input = parseInt(req.params.input);
    console.log("GET /api/shorturl/:input", { input });
    try {
        const data = await Url.findOne({ short: input });
        console.log("Found data:", data);
        if (!data) return res.json({ error: "No short URL found" });
        return res.redirect(302, data.original);
    } catch (err) {
        console.log("Error in GET /api/shorturl/:input:", err);
        return res.json({ error: "Database error" });
    }
});

app.post("/api/shorturl", async (req, res) => {
    const originalUrl = req.body.url;
    console.log("POST /api/shorturl", { body: req.body });
    let urlRegex = /^https?:\/\//i;

    if (!originalUrl || !urlRegex.test(originalUrl)) {
        return res.json({ error: 'invalid url' });
    }

    let hostname;
    try {
        hostname = urlModule.parse(originalUrl).hostname;
    } catch (err) {
        return res.json({ error: 'invalid url' });
    }

    dns.lookup(hostname, async (err) => {
        if (err) {
            return res.json({ error: 'invalid url' });
        }
        try {
            // Check if URL already exists
            const foundUrl = await Url.findOne({ original: originalUrl });
            if (foundUrl) {
                return res.json({ original_url: foundUrl.original, short_url: foundUrl.short });
            } else {
                // Find the highest short value
                const data = await Url.findOne({}).sort({ short: -1 });
                let nextShort = data ? data.short + 1 : 1;
                const newUrl = new Url({ original: originalUrl, short: nextShort });
                const savedUrl = await newUrl.save();
                if (!savedUrl) {
                    return res.json({ error: "Unable to save URL" });
                }
                res.json({ original_url: savedUrl.original, short_url: savedUrl.short });
            }
        } catch (err) {
            return res.json({ error: "Database error" });
        }
    });
});

app.listen(port, function () {
    console.log(`Listening on port ${port}`);
});