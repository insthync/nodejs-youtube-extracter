const youtubeDl = require('youtube-dl-exec');
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const port = Number(process.env.SERVER_PORT || 8000);

app.get('/', (req, res) => {
    res.status(200).send({
        "message": "Try http://url/:id/:height"
    });
})

app.get('/:id/:height', async (req, res) => {
    const id = req.params.id;
    const height = req.params.height;
    const ytResp = await youtubeDl('https://www.youtube.com/watch?v=' + id, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true
    });
    const filteredResp = ytResp.formats.filter(o => o.height == height);
    if (filteredResp.length > 0) {
        res.status(200).send({
            "url": filteredResp[0].url,
        });
    } else {
        res.status(500).send({
            "message": "Cannot retreive the livestream's URL",
        });
    }
});

app.listen(port, () => console.log(`Simple YouTube Livestream Url Retriever is listening on port ${port}`));