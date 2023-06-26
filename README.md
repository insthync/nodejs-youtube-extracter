# nodejs-simple-youtube-livestream-url-retriever
Get Youtube's livestream information

- `http://url/:id/lowest` - Get lowest quality video
- `http://url/:id/highest` - Get highest quality video
- `http://url/:id/:quality` - Get specific quality video (144, 240, 360, 720, 1080)

## Configs
- `SERVER_PORT` Port for HTTP
- `USE_HTTPS` (default: `0`), Set it to `1` to use HTTPS
- `HTTPS_KEY_FILE_PATH` Location to HTTPS key file (ex: `/etc/letsencrypt/live/www.yourdomain.com/privkey.pem`)
- `HTTPS_CERT_FILE_PATH` Location to HTTPS cert file (ex: `/etc/letsencrypt/live/www.yourdomain.com/fullchain.pem`)
- `HTTPS_SERVER_PORT` Port for HTTPS
- `USE_PROXY` (default: `0`), Set it to `1` to use [HLSProxy](https://github.com/warren-bank/HLS-Proxy)
- `PROXY_URL` URL to connect to HLSProxy, If you run HLSProxy by command: (`pm2 start npm --name "hlsd" -- start hls-proxy/bin/hlsd.js -- --host "www.yourdomain.com" --port 9991 --tls --tls-cert "/etc/letsencrypt/live/www.yourdomain.com/fullchain.pem" --tls-key "/etc/letsencrypt/live/www.yourdomain.com/privkey.pem"`, then you may set this to http://www.yourdomain.com:9991)
