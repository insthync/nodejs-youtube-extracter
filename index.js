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

const port = Number(process.env.SERVER_PORT || 8000);
const useHttps = Number(process.env.USE_HTTPS || 0) > 0;
const keyFilePath = process.env.HTTPS_KEY_FILE_PATH;
const certFilePath = process.env.HTTPS_CERT_FILE_PATH;
const httpsPort = Number(process.env.HTTPS_SERVER_PORT || 8080);
const useProxy = Number(process.env.USE_PROXY || 0) > 0;
const proxyUrl = process.env.PROXY_URL;
const caches = {};

const Extract = async (id) => {
    const url = 'https://www.youtube.com/watch?v=' + id;
    try {
        const resp = await youtubeDl(url, {
            dumpSingleJson: true,
            noWarnings: true,
            noCheckCertificate: true,
            preferFreeFormats: true,
            youtubeSkipDashManifest: true
        });
        return resp;
    } catch (error) {
        console.log("Error occurring when extracting: " + error);
    }
    return undefined;
};

const GetResponseUrl = function (key) {
    const cachedData = GetFromCache(key);
    const videoUrl = cachedData.url;
    if (useProxy && cachedData.isLive) {
        return `${proxyUrl}/${Buffer.from(videoUrl, 'utf8').toString('base64')}.m3u8`;
    }
    return videoUrl;
}

const Response = function (key, videoUrl, isLive, req, res) {
    StoreToCache(key, videoUrl, isLive);
    res.status(200).send({
        url: GetResponseUrl(key),
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

const StoreToCache = (key, url, isLive) => {
    caches[key] = {
        url,
        isLive,
        time: Date.now(),
    };
}

const GetFromCache = (key) => {
    if (key in caches) {
        // If it were cached 30 second ago, re-extract it
        if (Date.now() - caches[key].time >= 30000) {
            return undefined;
        }
        return caches[key];
    }
    return undefined;
}

const GetAvailableFormats = (formats) => {
    const result = [];
    if (formats) {
        formats.forEach(format => {
            if (format.acodec && format.vcodec &&
                format.acodec.toLowerCase() != "none" &&
                format.vcodec.toLowerCase() != "none")
            {
                result.push(format);
            }
        });
    }
    return result;
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
        res.writeHead(200, { "Content-Type": "application/x-mpegURL" });
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
        if (!ytResp) {
            res.status(500).send({
                "message": "Cannot extract YouTube URL from `" + id + "`",
            });
            return;
        }
        const sortedFormats = GetAvailableFormats(ytResp.formats).sort(FormatsCompareAsc);
        if (sortedFormats.length <= 0) {
            res.status(500).send({
                "message": "Cannot extract YouTube URL from `" + id + "`",
            });
            return;
        }
        Response(key, sortedFormats[0].url, ytResp.is_live, req, res);
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
        if (!ytResp) {
            res.status(500).send({
                "message": "Cannot extract YouTube URL from `" + id + "`",
            });
            return;
        }
        const sortedFormats = GetAvailableFormats(ytResp.formats).sort(FormatsCompareAsc);
        if (sortedFormats.length <= 0) {
            res.status(500).send({
                "message": "Cannot extract YouTube URL from `" + id + "`",
            });
            return;
        }
        sortedFormats.reverse();
        Response(key, sortedFormats[0].url, ytResp.is_live, req, res);
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
        if (!ytResp) {
            res.status(500).send({
                "message": "Cannot extract YouTube URL from `" + id + "`",
            });
            return;
        }
        const sortedFormats = GetAvailableFormats(ytResp.formats).sort(FormatsCompareAsc);
        if (sortedFormats.length <= 0) {
            res.status(500).send({
                "message": "Cannot extract YouTube URL from `" + id + "`",
            });
            return;
        }
        let indexOfData = 0;
        for (let index = 0; index < sortedFormats.length; index++) {
            indexOfData = index;
            if (sortedFormats[index].height >= height) {
                break;
            }
        }
        Response(key, sortedFormats[indexOfData].url, ytResp.is_live, req, res);
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
