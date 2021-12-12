const youtubeDl = require('youtube-dl-exec');
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const port = Number(process.env.SERVER_PORT || 8000);

app.get('/', (req, res) => {
    res.status(200).send({
        "message": "Try http://url/:quality/:id"
    });
})

app.get('/:quality/:id', async (req, res) => {
    const quality = req.params.quality;
    const id = req.params.id;
    
    const ytResp = await youtubeDl('https://www.youtube.com/watch?v=' + id, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true
    });

    const filteredResp = ytResp.formats.filter(resp => resp.quality == quality);
    if (filteredResp.length > 0) {
        res.status(200).send(filteredResp[0]);
    } else {
        res.status(500);
    }
});

app.listen(port, () => console.log(`Simple YouTube Livestream Url Retriever is listening on port ${port}`));