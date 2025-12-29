// utils/pollWebsite.js
const http = require('http');
const https = require('https');
const { URL } = require('url');

function checkUrlAccessible(url, timeout = 5000) {
  return new Promise((resolve) => {
    let protocol;
    try {
      const parsed = new URL(url);
      protocol = parsed.protocol === 'https:' ? https : http;
    } catch {
      return resolve(false);
    }

    const req = protocol.request(
      url,
      { method: 'HEAD', timeout },
      (res) => {
        // 只要收到响应头，就认为可达（包括 4xx/5xx）
        // const accessible = res.statusCode >= 200 && res.statusCode < 300;
        resolve(true);
      }
    );

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

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