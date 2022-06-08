const youtubeDl = require('youtube-dl-exec');
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const fs = require('fs');
const m3u8stream = require('m3u8stream');

require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());
//app.use('/media', express.static('media'))

const port = Number(process.env.SERVER_PORT || 8000);
const useHttps = Number(process.env.USE_HTTPS || 0) > 0;
const keyFilePath = process.env.HTTPS_KEY_FILE_PATH;
const certFilePath = process.env.HTTPS_CERT_FILE_PATH;
const httpsPort = Number(process.env.HTTPS_SERVER_PORT || 8080);
const caches = {};

const Extract = async (id) => {
    const url = 'https://www.youtube.com/watch?v=' + id;
    const resp = await youtubeDl(url, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificate: true,
        preferFreeFormats: true,
        youtubeSkipDashManifest: true
    });
    return resp;
};

const GetResponseUrl = function (key, req) {
    const serveUrl = (useHttps ? "https://" : "http://") + req.subdomains.join('.') + req.hostname + ":" + (useHttps ? httpsPort : port);
    return `${serveUrl}/${key}`;
}

const Response = function (id, key, extractedData, req, res) {
    /*
    var file = fs.createWriteStream(`./media/${key}.m3u8`);
    https.get(extractedData.url, function (response) {
        response.pipe(file);
        file.on('finish', function () {
            file.close(() => {
                StoreToCache(key, extractedData);
                res.status(200).send({
                    url: GetResponseUrl(key, req),
                });
            });
        });
    }).on('error', function (err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        res.status(500).send({
            "message": "Cannot extract YouTube URL from `" + id + "`, File error: `" + err.message + "`",
        });
    });
    */
    StoreToCache(key, extractedData);
    res.status(200).send({
        url: GetResponseUrl(key, req),
    });
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

const StoreToCache = (key, url) => {
    caches[key] = {
        url,
        time: Date.now(),
    };
}

const GetFromCache = (key) => {
    if (key in caches) {
        // If it were cached 10 second ago, re-extract it
        if (Date.now() - caches[key].time >= 10000) {
            return undefined;
        }
        return caches[key].url;
    }
    return undefined;
}

app.get('/', (req, res) => {
    res.status(200).send({
        "message": "Try `http://url/:id/:height`"
    });
})

app.get('/:key', async (req, res) => {
    const key = req.params.key;
    const cacheData = GetFromCache(key);
    if (cacheData === undefined) {
        res.status(500).send({
            "message": "Cannot load file with key: `" + key + "`",
        });
        return;
    }
    console.log(cacheData.url);
    https.get(cacheData.url, function (response) {
        res.writeHead(200, { "Content-Type": "application/vnd.apple.mpegurl" });
        response.pipe(res);
    }).on('error', function (err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        res.status(500).send({
            "message": "Cannot extract YouTube URL from `" + id + "`, File error: `" + err.message + "`",
        });
    });
});

app.get('/:id/lowest', async (req, res) => {
    const id = req.params.id;
    const key = id + "_lowest";
    const cacheData = GetFromCache(key);
    if (cacheData !== undefined) {
        res.status(200).send({
            url: GetResponseUrl(key, req),
        });
    } else {
        const ytResp = await Extract(id);
        const filteredResp = ytResp.formats.sort(FormatsCompareAsc);
        if (filteredResp.length <= 0) {
            res.status(500).send({
                "message": "Cannot extract YouTube URL from `" + id + "`",
            });
            return;
        }
        Response(id, key, filteredResp[0], req, res);
    }
});

app.get('/:id/highest', async (req, res) => {
    const id = req.params.id;
    const key = id + "_highest";
    const cacheData = GetFromCache(key);
    if (cacheData !== undefined) {
        res.status(200).send({
            url: GetResponseUrl(key, req),
        });
    } else {
        const ytResp = await Extract(id);
        const filteredResp = ytResp.formats.sort(FormatsCompareAsc);
        if (filteredResp.length <= 0) {
            res.status(500).send({
                "message": "Cannot extract YouTube URL from `" + id + "`",
            });
            return;
        }
        filteredResp.reverse();
        Response(id, key, filteredResp[0], req, res);
    }
});

app.get('/:id/:height', async (req, res) => {
    const id = req.params.id;
    const height = req.params.height;
    const key = id + "_" + height;
    const cacheData = GetFromCache(key);
    if (cacheData !== undefined) {
        res.status(200).send({
            url: GetResponseUrl(key, req),
        });
    } else {
        const ytResp = await Extract(id);
        const filteredResp = ytResp.formats.sort(FormatsCompareAsc);
        if (filteredResp.length <= 0) {
            res.status(500).send({
                "message": "Cannot extract YouTube URL from `" + id + "`",
            });
            return;
        }
        let indexOfData = 0;
        for (let index = 0; index < filteredResp.length; index++) {
            indexOfData = index;
            if (filteredResp[index].height >= height) {
                break;
            }
        }
        Response(id, key, filteredResp[indexOfData], req, res);
    }
});

const httpServer = http.createServer(app);
httpServer.listen(port, () => {
    console.log(`YouTube video extracter is listening on port ${port}`);
});

if (useHttps) {
    const httpsServer = https.createServer({
        key: fs.readFileSync(keyFilePath),
        cert: fs.readFileSync(certFilePath),
    }, app);
    httpsServer.listen(httpsPort, () => {
        console.log(`YouTube video extracter is listening on port ${httpsPort}`);
    });
}