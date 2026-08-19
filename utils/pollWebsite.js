// utils/pollWebsite.js
const http = require('http');
const https = require('https');
const { URL } = require('url');

function checkUrlAccessible(url, timeout = 10000) {
  return new Promise((resolve) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        const options = {
            hostname: urlObj.hostname,
            // port: urlObj.port || 443,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search || '/',
            method: 'HEAD',
            timeout: 10000
        };

        const req = protocol.request(options, (res) => {
            console.log('rescode', res.statusCode)
            resolve(res.statusCode >= 200 && res.statusCode < 400);
            res.destroy();
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
        req.end();
    });
}

async function pollUntilAccessible(url, interval = 3000, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    const accessible = await checkUrlAccessible(url);
    if (accessible) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  return false;
}

module.exports = { pollUntilAccessible };