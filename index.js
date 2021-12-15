const youtubeDl = require('youtube-dl-exec');
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

const port = Number(process.env.SERVER_PORT || 8000);
const caches = [];

const Retrive = async (id) => {
    const resp = await youtubeDl('https://www.youtube.com/watch?v=' + id, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true
    });
    return resp;
};

const FormatsCompareAsc = async (a, b) => {
    if (a.height < b.height) {
        return -1;
    }
    if (a.height > b.height) {
        return 1;
    }
    return 0;
}

app.get('/', (req, res) => {
    res.status(200).send({
        "message": "Try http://url/:id/:height"
    });
})

app.get('/:id/lowest', async (req, res) => {
    const id = req.params.id;
    const key = id + "_lowest";
    if (key in caches) {
        res.status(200).send(caches[key]);
    } else {
        const ytResp = await Retrive(id);
        const filteredResp = ytResp.formats.sort(FormatsCompareAsc);
        if (filteredResp.length > 0) {
            caches[key] = filteredResp[0];
            res.status(200).send(filteredResp[0]);
        } else {
            res.status(500).send({
                "message": "Cannot retreive the livestream's URL",
            });
        }
    }
});

app.get('/:id/highest', async (req, res) => {
    const id = req.params.id;
    const key = id + "_highest";
    if (key in caches) {
        res.status(200).send(caches[key]);
    } else {
        const ytResp = await Retrive(id);
        const filteredResp = ytResp.formats.sort(FormatsCompareAsc);
        filteredResp.reverse();
        if (filteredResp.length > 0) {
            caches[key] = filteredResp[0];
            res.status(200).send(filteredResp[0]);
        } else {
            res.status(500).send({
                "message": "Cannot retreive the livestream's URL",
            });
        }
    }
});

app.get('/:id/:height', async (req, res) => {
    const id = req.params.id;
    const height = req.params.height;
    const key = id + "_" + height;
    if (key in caches) {
        res.status(200).send(caches[key]);
    } else {
        const ytResp = await Retrive(id);
        const filteredResp = ytResp.formats.filter(o => o.height == height);
        if (filteredResp.length > 0) {
            caches[key] = filteredResp[0];
            res.status(200).send(filteredResp[0]);
        } else {
            res.status(500).send({
                "message": "Cannot retreive the livestream's URL",
            });
        }
    }
});

app.listen(port, () => console.log(`Simple YouTube Livestream Url Retriever is listening on port ${port}`));