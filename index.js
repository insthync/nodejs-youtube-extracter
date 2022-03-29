const youtubeDl = require('youtube-dl-exec');
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const fs = require('fs');

require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

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
        const filteredResp = ytResp.formats.sort(FormatsCompareAsc);
        if (filteredResp.length > 0) {
            let indexOfData = -1;
            for (let index = 0; index < filteredResp.length; index++) {
                indexOfData = index;
                if (filteredResp[index].height >= height) {
                    break;
                }
            }
            if (indexOfData >= 0) {
                caches[key] = filteredResp[indexOfData];
                res.status(200).send(filteredResp[indexOfData]);
            } else {
                res.status(500).send({
                    "message": "Cannot retreive the livestream's URL",
                });
            }
        } else {
            res.status(500).send({
                "message": "Cannot retreive the livestream's URL",
            });
        }
    }
});

const port = Number(process.env.SERVER_PORT || 8000);
const useHttps = Number(process.env.USE_HTTPS || 0) > 0;
const keyFilePath = process.env.HTTPS_KEY_FILE_PATH;
const certFilePath = process.env.HTTPS_CERT_FILE_PATH;
const httpsPort = Number(process.env.HTTPS_SERVER_PORT || 8080);

const httpServer = http.createServer(app);
httpServer.listen(port, () => {
    console.log(`Simple YouTube Livestream Url Retriever is listening on port ${port}`);
});

if (useHttps) {
    const httpsServer = https.createServer({
        key: fs.readFileSync(keyFilePath),
        cert: fs.readFileSync(certFilePath),
    }, app);
    httpsServer.listen(httpsPort, () => {
        console.log(`Simple YouTube Livestream Url Retriever is listening on port ${httpsPort}`);
    });
}