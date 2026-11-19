const { spawn } = require('node:child_process');
const { once } = require('node:events');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
let serverProcess;
let baseUrl;

async function unusedPort() {
  const probe = net.createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer(url, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server exited early (code ${child.exitCode})`);
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          res.once('end', resolve);
        });
        req.once('error', reject);
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error('Timed out waiting for the application server');
}

function getHtml(pathname) {
  return new Promise((resolve, reject) => {
    http.get(new URL(pathname, baseUrl), (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).once('error', reject);
  });
}

before(async () => {
  const port = await unusedPort();
  baseUrl = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), ADMIN_PIN: 'test-pin' },
    stdio: 'ignore',
  });
  await waitForServer(baseUrl, serverProcess);
});

after(() => {
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill('SIGTERM');
});

test('homepage serves absolute Open Graph and Twitter metadata', async () => {
  const { status, body } = await getHtml('/');
  assert.equal(status, 200);
  assert.match(body, /<meta property="og:type" content="website">/);
  assert.match(body, /<meta property="og:title" content="Ignition Arena">/);
  assert.match(body, /<meta property="og:description" content="[^"]+">/);
  assert.match(body, new RegExp(`<meta property="og:url" content="${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}">`));
  assert.match(body, new RegExp(`<meta property="og:image" content="${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/og\\.png">`));
  assert.match(body, /<meta name="twitter:card" content="summary_large_image">/);
});

test('cheer route serves page-specific social metadata', async () => {
  const { status, body } = await getHtml('/cheer');
  assert.equal(status, 200);
  assert.match(body, /<meta property="og:title" content="Cheer live — [^"]+">/);
  assert.match(body, new RegExp(`<meta property="og:url" content="${baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/cheer">`));
  assert.match(body, /<meta name="twitter:title" content="Cheer live — [^"]+">/);
});
