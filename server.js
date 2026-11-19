// Ignition Arena - live VIP coin betting, audience cheering and LED wall control.
// One Node process. State lives in memory and is saved to data/state.json.
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const seed = require('./data/seed');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PIN = String(process.env.ADMIN_PIN || '2026');
const DATA_FILE = path.join(__dirname, 'data', 'state.json');
const UPLOADS = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const uid = () => crypto.randomBytes(4).toString('hex');
const newToken = () => crypto.randomBytes(6).toString('base64url');
const clampInt = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(Number(n) || 0)));

// ---------- state ----------
let S;
const reset = process.argv.includes('--reset');
try {
  if (reset) throw new Error('reset');
  S = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch {
  S = seed();
}
S.feed ||= []; S.cheers ||= {}; S.audience ||= []; S.bets ||= [];

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DATA_FILE, JSON.stringify(S), () => {});
  }, 600);
}
if (reset) { fs.writeFileSync(DATA_FILE, JSON.stringify(S)); console.log('Data reset to demo data.'); }

function lanIP() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const n of list || []) if (n.family === 'IPv4' && !n.internal) return n.address;
  }
  return 'localhost';
}
const baseUrl = () => (S.settings.publicUrl || `http://${lanIP()}:${PORT}`).replace(/\/$/, '');

const team = (id) => S.teams.find((t) => t.id === id);
const vip = (id) => S.vips.find((v) => v.id === id);
const match = (id) => S.matches.find((m) => m.id === id);

function addFeed(type, text) {
  S.feed.unshift({ ts: Date.now(), type, text });
  S.feed.length = Math.min(S.feed.length, 60);
}

function cheerView() {
  const out = {};
  const byId = Object.fromEntries(S.audience.map((a) => [a.id, a]));
  for (const [mid, sides] of Object.entries(S.cheers)) {
    out[mid] = {};
    for (const [tid, people] of Object.entries(sides)) {
      const rows = Object.entries(people)
        .map(([aid, count]) => ({ name: byId[aid]?.name || 'Fan', count }))
        .sort((a, b) => b.count - a.count);
      out[mid][tid] = { total: rows.reduce((s, r) => s + r.count, 0), fans: rows.length, top: rows.slice(0, 5) };
    }
  }
  return out;
}

function publicSnapshot() {
  return {
    settings: { ...S.settings, baseUrl: baseUrl(), cheerUrl: `${baseUrl()}/cheer` },
    led: S.led,
    teams: S.teams,
    vips: S.vips.map(({ token, ...v }) => v),
    matches: S.matches,
    bets: S.bets,
    cheer: cheerView(),
    fans: [...S.audience].sort((a, b) => b.points - a.points).slice(0, 10)
      .map(({ name, teamId, points }) => ({ name, teamId, points })),
    audienceCount: S.audience.length,
    feed: S.feed.slice(0, 20),
    serverTime: Date.now(),
  };
}
function adminSnapshot() {
  return {
    ...publicSnapshot(),
    vips: S.vips.map((v) => ({ ...v, link: `${baseUrl()}/vip?t=${v.token}` })),
    audience: [...S.audience].sort((a, b) => b.points - a.points),
    feed: S.feed,
    admin: true,
  };
}

// ---------- server ----------
const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 6e6 });
app.set('trust proxy', 1);

const SHARE_FILES = {
  '/': 'index.html',
  '/admin': 'admin.html',
  '/led': 'led.html',
  '/vip': 'vip.html',
  '/cheer': 'cheer.html',
};
const escAttr = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function shareOrigin(req) {
  const configured = String(S.settings.publicUrl || '').trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(configured)) return configured;
  return `${req.protocol}://${req.get('host')}`;
}
function shareMeta(pathname) {
  const event = String(S.settings.eventName || 'Ignition Challenge').slice(0, 60);
  const coin = String(S.settings.coinName || 'Sparks').slice(0, 20);
  const pages = {
    '/': ['Ignition Arena', `Live RoboWar board for ${event}. VIPs bet ${coin}, the crowd cheers, and the LED wall follows the fight. No real money.`],
    '/cheer': [`Cheer live — ${event}`, `Pick a team and tap to cheer at ${event}. Your taps show up on the LED wall.`],
    '/vip': [`VIP lounge — ${event}`, `Back a robot with ${coin} at ${event}. Virtual coins only. No real money.`],
    '/admin': ['Admin — Ignition Arena', `Run matches, open betting, call the winner, and control the LED wall for ${event}.`],
    '/led': [`LED wall — ${event}`, `Full-screen live board for ${event}.`],
  };
  const [title, description] = pages[pathname] || pages['/'];
  return { title, description };
}
function shareBlock(req) {
  const { title, description } = shareMeta(req.path);
  const origin = shareOrigin(req);
  const pageUrl = origin + (req.path === '/' ? '' : req.path);
  const image = `${origin}/og.png`;
  const t = escAttr(title);
  const d = escAttr(description);
  const u = escAttr(pageUrl);
  const img = escAttr(image);
  const alt = escAttr('Ignition Arena live RoboWar board');
  const secure = /^https:\/\//i.test(image) ? `\n<meta property="og:image:secure_url" content="${img}">` : '';
  return `<!-- share -->
<meta name="description" content="${d}">
<meta property="og:locale" content="en_US">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Ignition Arena">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${img}">${secure}
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
<meta name="twitter:image:alt" content="${alt}">
<!-- /share -->`;
}
function withShareTags(html, req) {
  const block = shareBlock(req);
  const { title } = shareMeta(req.path);
  let out = html.replace(/\s*<!-- share -->[\s\S]*?<!-- \/share -->/, '');
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escAttr(title)}</title>`);
  const charset = out.match(/<meta\s+charset=["']?[^"'>\s]+["']?\s*\/?>/i);
  if (charset) {
    const i = out.indexOf(charset[0]) + charset[0].length;
    return `${out.slice(0, i)}\n${block}${out.slice(i)}`;
  }
  return out.replace(/<head[^>]*>/i, (m) => `${m}\n${block}`);
}

app.get(Object.keys(SHARE_FILES), (req, res, next) => {
  const file = path.join(__dirname, 'public', SHARE_FILES[req.path]);
  fs.readFile(file, 'utf8', (err, html) => {
    if (err) return next();
    res.type('html').send(withShareTags(html, req));
  });
});

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));
app.get('/qr.svg', async (req, res) => {
  const data = String(req.query.data || `${baseUrl()}/cheer`).slice(0, 500);
  const dark = /^#[0-9a-f]{6}$/i.test(req.query.dark || '') ? req.query.dark : '#07080B';
  const light = /^#[0-9a-f]{6}$/i.test(req.query.light || '') ? req.query.light : '#FFFFFF';
  const svg = await QRCode.toString(data, { type: 'svg', margin: 1, color: { dark, light }, errorCorrectionLevel: 'M' });
  res.type('image/svg+xml').send(svg);
});

// Generated bot artwork used until a team uploads a real photo.
app.get('/art/team/:id.svg', (req, res) => {
  const t = team(req.params.id) || { name: '?', botName: 'NEW BOT', color: '#22E5FF', weapon: '' };
  const c = /^#[0-9a-f]{6}$/i.test(t.color || '') ? t.color : '#22E5FF';
  const w = (t.weapon || '').toLowerCase();
  // Front weapon, drawn above the chassis (front of the bot faces up).
  let weapon = `<path d="M206 152 L394 152 L372 116 L228 116 Z" fill="${c}"/><path d="M228 116 L372 116" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`; // wedge
  if (w.includes('vertical') || w.includes('undercut')) weapon = `<rect x="200" y="112" width="200" height="30" rx="8" fill="${c}"/><path d="M200 112 l-14 -12 v42 l14 -12 M400 112 l14 -12 v42 l-14 -12" fill="${c}"/><rect x="214" y="122" width="172" height="5" fill="#07080B" opacity=".45"/>`;
  if (w.includes('drum')) weapon = `<rect x="214" y="104" width="172" height="44" rx="18" fill="${c}"/>${[240, 275, 310, 345].map((x) => `<rect x="${x}" y="98" width="14" height="56" rx="3" fill="#E9EEF5" opacity=".85"/>`).join('')}`;
  if (w.includes('horizontal') || w.includes('shell')) weapon = `<circle cx="300" cy="240" r="140" fill="none" stroke="${c}" stroke-width="16" stroke-dasharray="70 20"/><circle cx="300" cy="240" r="140" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="3"/>`;
  if (w.includes('flipper') || w.includes('lifter')) weapon = `<path d="M196 156 L404 156 L404 140 L380 96 L220 96 L196 140 Z" fill="${c}"/><path d="M220 96 L380 96" stroke="#fff" stroke-opacity=".55" stroke-width="4"/><rect x="292" y="140" width="16" height="40" fill="#0B0E14" opacity=".6"/>`;
  if (w.includes('hammer') || w.includes('saw')) weapon = `<rect x="289" y="70" width="22" height="150" rx="6" fill="#E9EEF5" opacity=".9"/><rect x="246" y="54" width="108" height="40" rx="8" fill="${c}"/>${w.includes('saw') ? `<circle cx="300" cy="74" r="34" fill="none" stroke="${c}" stroke-width="8" stroke-dasharray="10 6"/>` : ''}`;
  if (w.includes('crusher')) weapon = `<path d="M230 150 C230 90 270 70 300 70 C330 70 370 90 370 150 L346 150 C346 110 330 96 300 96 C270 96 254 110 254 150 Z" fill="${c}"/><circle cx="300" cy="150" r="14" fill="#E9EEF5"/>`;
  if (w.includes('pusher')) weapon = `<rect x="190" y="118" width="220" height="34" rx="6" fill="${c}"/>${[205, 245, 285, 325, 365].map((x) => `<rect x="${x}" y="108" width="24" height="12" rx="2" fill="${c}"/>`).join('')}`;
  const wheel = (x, y) => `<rect x="${x}" y="${y}" width="32" height="66" rx="9" fill="#202634"/>${[10, 22, 34, 46].map((d) => `<rect x="${x + 4}" y="${y + d}" width="24" height="5" rx="2" fill="#2E3648"/>`).join('')}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
<defs><radialGradient id="g" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="${c}" stop-opacity=".32"/><stop offset="1" stop-color="#07080B" stop-opacity="0"/></radialGradient>
<pattern id="p" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#1A2030" stroke-width="1"/></pattern>
<filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8"/></filter></defs>
<rect width="600" height="450" fill="#0A0D13"/><rect width="600" height="450" fill="url(#p)"/><rect width="600" height="450" fill="url(#g)"/>
<ellipse cx="300" cy="350" rx="150" ry="18" fill="#000" opacity=".5"/>
${wheel(166, 176)}${wheel(402, 176)}${wheel(166, 262)}${wheel(402, 262)}
<path d="M222 150 L378 150 L412 186 L412 304 L380 336 L220 336 L188 304 L188 186 Z" fill="#161B27" stroke="${c}" stroke-width="5" stroke-linejoin="round"/>
<path d="M238 172 L362 172 L388 198 L388 292 L364 314 L236 314 L212 292 L212 198 Z" fill="#212838"/>
${[[238, 180], [362, 180], [236, 306], [364, 306]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#3A4458"/>`).join('')}
<rect x="244" y="206" width="112" height="12" rx="6" fill="${c}" filter="url(#b)" opacity=".9"/><rect x="244" y="206" width="112" height="12" rx="6" fill="${c}"/>
${[262, 278, 294].map((y) => `<rect x="262" y="${y}" width="76" height="6" rx="3" fill="#0B0E14"/>`).join('')}
<path d="M300 228 L312 248 L288 248 Z" fill="${c}" opacity=".7"/>
${weapon}
<text x="300" y="412" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="30" font-weight="900" fill="#F2F4F7" letter-spacing="4">${escapeXml((t.botName || '').toUpperCase())}</text>
</svg>`;
  res.type('image/svg+xml').set('Cache-Control', 'no-cache').send(svg);
});
function escapeXml(s) { return String(s).replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch]); }

// ---------- broadcasting ----------
let bTimer = null;
function broadcast() {
  if (bTimer) return;
  bTimer = setTimeout(() => {
    bTimer = null;
    io.to('public').emit('state', publicSnapshot());
    io.to('admin').emit('state', adminSnapshot());
  }, 120);
}
function changed() { save(); broadcast(); }

// ---------- game logic ----------
function placeBet(vipId, { matchId, teamId, amount }) {
  const v = vip(vipId); if (!v) throw new Error('VIP not found');
  const m = match(matchId); if (!m) throw new Error('Match not found');
  if (m.status !== 'open') throw new Error('Betting is closed for this match');
  if (teamId !== m.teamA && teamId !== m.teamB) throw new Error('Pick one of the two teams');
  const amt = clampInt(amount, 0, 1e9);
  if (amt <= 0) throw new Error('Enter an amount');
  if (amt > v.coins) throw new Error(`You only have ${v.coins} ${S.settings.coinName}`);
  const other = S.bets.find((b) => b.matchId === m.id && b.vipId === v.id && b.teamId !== teamId);
  if (other) throw new Error(`You already backed ${team(other.teamId)?.name} in this match`);
  v.coins -= amt;
  S.bets.push({ id: uid(), matchId: m.id, vipId: v.id, teamId, amount: amt, ts: Date.now() });
  addFeed('bet', `${v.name} put ${amt} ${S.settings.coinName} on ${team(teamId)?.name}`);
  return { coins: v.coins };
}

function settle(matchId, winnerId) {
  const m = match(matchId); if (!m) throw new Error('Match not found');
  if (m.status === 'settled') throw new Error('Already settled. Undo the result first.');
  if (winnerId !== m.teamA && winnerId !== m.teamB) throw new Error('Winner must be one of the two teams');
  const bets = S.bets.filter((b) => b.matchId === m.id);
  const winTotal = bets.filter((b) => b.teamId === winnerId).reduce((s, b) => s + b.amount, 0);
  const loseTotal = bets.filter((b) => b.teamId !== winnerId).reduce((s, b) => s + b.amount, 0);
  const stakes = {};
  for (const b of bets.filter((x) => x.teamId === winnerId)) stakes[b.vipId] = (stakes[b.vipId] || 0) + b.amount;
  const payouts = Object.entries(stakes).map(([vipId, stake]) => {
    const payout = stake + Math.floor((loseTotal * stake) / (winTotal || 1));
    const v = vip(vipId); if (v) v.coins += payout;
    return { vipId, stake, payout };
  }).sort((a, b) => b.payout - a.payout);
  m.status = 'settled'; m.winner = winnerId;
  m.result = { winTotal, loseTotal, payouts, at: Date.now() };
  addFeed('result', `${team(winnerId)?.name} won ${m.label}`);
}

function undoResult(matchId) {
  const m = match(matchId); if (!m || m.status !== 'settled') throw new Error('Match is not settled');
  for (const p of m.result?.payouts || []) { const v = vip(p.vipId); if (v) v.coins -= p.payout; }
  m.status = 'locked'; m.winner = null; m.result = null;
  addFeed('system', `Result undone for ${m.label}`);
}

function refundMatch(m) {
  for (const b of S.bets.filter((x) => x.matchId === m.id)) { const v = vip(b.vipId); if (v) v.coins += b.amount; }
  S.bets = S.bets.filter((x) => x.matchId !== m.id);
}

// ---------- sockets ----------
io.on('connection', (sock) => {
  sock.data.bucket = 30; sock.data.last = Date.now();

  sock.on('hello', (p = {}, ack = () => {}) => {
    if (p.role === 'admin') {
      if (String(p.pin) !== ADMIN_PIN) return ack({ ok: false, error: 'Wrong PIN' });
      sock.data.admin = true; sock.join('admin');
      ack({ ok: true }); return sock.emit('state', adminSnapshot());
    }
    sock.join('public');
    if (p.role === 'vip') {
      const v = S.vips.find((x) => x.token === p.token);
      if (!v) return ack({ ok: false, error: 'This VIP link is not valid. Ask the organisers for a new one.' });
      sock.data.vipId = v.id; ack({ ok: true, vipId: v.id });
    } else if (p.role === 'audience') {
      const a = S.audience.find((x) => x.id === p.audId);
      if (a) sock.data.audId = a.id;
      ack({ ok: true, me: a || null });
    } else ack({ ok: true });
    sock.emit('state', publicSnapshot());
  });

  // VIP
  sock.on('vip:bet', (p = {}, ack = () => {}) => {
    try { const r = placeBet(sock.data.vipId, p); changed(); ack({ ok: true, ...r }); } catch (e) { ack({ ok: false, error: e.message }); }
  });

  // Audience
  sock.on('aud:join', (p = {}, ack = () => {}) => {
    const name = String(p.name || '').trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!name) return ack({ ok: false, error: 'Enter your name' });
    if (!team(p.teamId)) return ack({ ok: false, error: 'Pick the team you support' });
    let a = S.audience.find((x) => x.id === p.audId);
    if (a) { a.name = name; a.teamId = p.teamId; } else {
      a = { id: uid(), name, teamId: p.teamId, points: 0, joined: Date.now() };
      S.audience.push(a);
    }
    sock.data.audId = a.id; changed(); ack({ ok: true, me: a });
  });
  sock.on('aud:cheer', (p = {}, ack = () => {}) => {
    const a = S.audience.find((x) => x.id === sock.data.audId);
    if (!a) return ack({ ok: false, error: 'Join first' });
    const m = match(S.settings.liveMatchId);
    if (!m || m.status === 'settled' || m.status === 'cancelled') return ack({ ok: false, error: 'No live fight right now' });
    if (p.teamId !== m.teamA && p.teamId !== m.teamB) return ack({ ok: false, error: 'That team is not fighting now' });
    // token bucket: about 12 taps per second per phone
    const now = Date.now();
    sock.data.bucket = Math.min(40, sock.data.bucket + ((now - sock.data.last) / 1000) * 12); sock.data.last = now;
    const n = Math.min(clampInt(p.n, 0, 60), Math.floor(sock.data.bucket));
    sock.data.bucket -= n;
    if (n > 0) {
      S.cheers[m.id] ||= {}; S.cheers[m.id][p.teamId] ||= {};
      S.cheers[m.id][p.teamId][a.id] = (S.cheers[m.id][p.teamId][a.id] || 0) + n;
      a.points += n; changed();
    }
    const rank = S.audience.filter((x) => x.points > a.points).length + 1;
    ack({ ok: true, points: a.points, rank, inMatch: S.cheers[m.id]?.[p.teamId]?.[a.id] || 0 });
  });

  // Admin
  const admin = (name, fn) => sock.on(name, (p = {}, ack = () => {}) => {
    if (!sock.data.admin) return ack({ ok: false, error: 'Not authorised' });
    try { const r = fn(p) || {}; changed(); ack({ ok: true, ...r }); } catch (e) { ack({ ok: false, error: e.message }); }
  });

  admin('team:save', (p) => {
    let t = team(p.id);
    if (!t) { t = { id: uid(), photo: '', color: '#22E5FF' }; S.teams.push(t); }
    for (const k of ['name', 'botName', 'weapon', 'college', 'weight', 'description', 'color']) if (p[k] !== undefined) t[k] = String(p[k]).slice(0, 600);
    if (!t.name) throw new Error('Team name is required');
    if (p.photoData) {
      const mm = /^data:image\/(png|jpe?g|webp);base64,(.+)$/.exec(p.photoData);
      if (!mm) throw new Error('Photo must be PNG, JPG or WEBP');
      const file = `${t.id}-${Date.now()}.${mm[1] === 'jpeg' ? 'jpg' : mm[1]}`;
      fs.writeFileSync(path.join(UPLOADS, file), Buffer.from(mm[2], 'base64'));
      t.photo = `/uploads/${file}`;
    }
    if (p.removePhoto) t.photo = '';
    return { id: t.id };
  });
  admin('team:delete', ({ id }) => {
    if (S.matches.some((m) => (m.teamA === id || m.teamB === id) && m.status !== 'settled')) throw new Error('This team is in an unfinished match. Remove the match first.');
    S.teams = S.teams.filter((t) => t.id !== id);
  });

  admin('vip:save', (p) => {
    let v = vip(p.id);
    if (!v) { v = { id: uid(), coins: S.settings.startingCoins, token: newToken() }; S.vips.push(v); }
    if (p.name !== undefined) v.name = String(p.name).slice(0, 60);
    if (p.title !== undefined) v.title = String(p.title).slice(0, 60);
    if (p.coins !== undefined) v.coins = clampInt(p.coins, -1e9, 1e9);
    if (!v.name) throw new Error('VIP name is required');
    return { id: v.id };
  });
  admin('vip:delete', ({ id }) => { S.vips = S.vips.filter((v) => v.id !== id); S.bets = S.bets.filter((b) => b.vipId !== id); });
  admin('vip:newlink', ({ id }) => { const v = vip(id); if (v) v.token = newToken(); });
  admin('vip:topup', ({ amount }) => { const a = clampInt(amount, -1e9, 1e9); S.vips.forEach((v) => { v.coins += a; }); addFeed('system', `All VIPs got ${a} ${S.settings.coinName}`); });

  admin('match:save', (p) => {
    let m = match(p.id);
    if (!m) { m = { id: uid(), status: 'upcoming', winner: null, result: null, createdAt: Date.now() }; S.matches.push(m); }
    if (p.teamA && p.teamA === p.teamB) throw new Error('Pick two different teams');
    for (const k of ['label', 'teamA', 'teamB']) if (p[k] !== undefined) m[k] = String(p[k]);
    if (!team(m.teamA) || !team(m.teamB)) throw new Error('Pick both teams');
    if (!m.label) m.label = `Match ${S.matches.length}`;
    return { id: m.id };
  });
  admin('match:delete', ({ id }) => {
    const m = match(id); if (!m) return;
    if (m.status !== 'settled') refundMatch(m);
    S.matches = S.matches.filter((x) => x.id !== id); delete S.cheers[id];
    if (S.settings.liveMatchId === id) S.settings.liveMatchId = null;
  });
  admin('match:status', ({ id, status }) => {
    const m = match(id); if (!m) throw new Error('Match not found');
    if (!['upcoming', 'open', 'locked'].includes(status)) throw new Error('Bad status');
    if (m.status === 'settled') throw new Error('Undo the result first');
    m.status = status;
    addFeed('system', `${m.label}: ${status === 'open' ? 'betting open' : status === 'locked' ? 'betting locked, fight on' : 'set to upcoming'}`);
  });
  admin('match:settle', ({ id, winner }) => settle(id, winner));
  admin('match:undo', ({ id }) => undoResult(id));
  admin('match:cancel', ({ id }) => { const m = match(id); if (!m) throw new Error('Match not found'); if (m.status === 'settled') undoResult(id); refundMatch(m); m.status = 'upcoming'; addFeed('system', `${m.label}: bets refunded`); });
  admin('live:set', ({ id }) => { S.settings.liveMatchId = id || null; const m = match(id); if (m) addFeed('system', `Live match: ${m.label}`); });

  admin('led:set', (p) => {
    const ok = ['idle', 'faceoff', 'bets', 'cheer', 'winner', 'vipboard', 'fanboard', 'lineup', 'message'];
    if (p.template !== undefined) { if (!ok.includes(p.template)) throw new Error('Unknown template'); S.led.template = p.template; }
    if (p.message !== undefined) S.led.message = String(p.message).slice(0, 140);
    if (p.showQR !== undefined) S.led.showQR = !!p.showQR;
  });

  admin('settings:save', (p) => {
    if (p.eventName !== undefined) S.settings.eventName = String(p.eventName).slice(0, 60);
    if (p.coinName !== undefined) S.settings.coinName = String(p.coinName).slice(0, 20) || 'Sparks';
    if (p.startingCoins !== undefined) S.settings.startingCoins = clampInt(p.startingCoins, 0, 1e9);
    if (p.publicUrl !== undefined) S.settings.publicUrl = String(p.publicUrl).trim();
  });
  admin('audience:remove', ({ id }) => {
    S.audience = S.audience.filter((a) => a.id !== id);
    for (const sides of Object.values(S.cheers)) for (const people of Object.values(sides)) delete people[id];
  });
  admin('data:clearPlay', () => {
    // Event-day reset: keep teams, VIPs and matches. Clear bets, cheers, fans, results. Reset coins.
    S.bets = []; S.cheers = {}; S.audience = []; S.feed = [];
    S.vips.forEach((v) => { v.coins = S.settings.startingCoins; });
    S.matches.forEach((m) => { m.status = 'upcoming'; m.winner = null; m.result = null; });
    addFeed('system', 'Bets, cheers and results cleared');
  });
  admin('data:demo', () => { S = seed(); });
});

server.listen(PORT, '0.0.0.0', () => {
  const b = `http://localhost:${PORT}`;
  console.log(`\n  IGNITION ARENA running\n`);
  console.log(`  Admin     ${b}/admin   (PIN ${ADMIN_PIN})`);
  console.log(`  LED wall  ${b}/led`);
  console.log(`  Audience  ${baseUrl()}/cheer`);
  console.log(`  VIP links are in Admin > VIPs\n`);
});
