// Shared helpers for every panel.
window.IA = (() => {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const coinSvg = (size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8 21 7v10l-9 5.2L3 17V7z" fill="#FFD60A"/><path d="M12 4.2 18.9 8.2v7.6L12 19.8 5.1 15.8V8.2z" fill="#E0A800"/><path d="M13.2 6.5 8.6 13h3.1l-1 4.5 4.7-6.6h-3.2z" fill="#FFF6C2"/></svg>`;
  const coin = (n, size) => `<span class="coin">${coinSvg(size)}${fmt(n)}</span>`;

  const flame = (size = 40) => `<svg width="${size}" height="${Math.round(size * 1.1)}" viewBox="0 0 100 110" aria-hidden="true"><path d="M50 3 L93 27.5 L93 82.5 L50 107 L7 82.5 L7 27.5 Z" fill="none" stroke="#22E5FF" stroke-width="6" stroke-linejoin="round"/><path d="M50 3 L93 27.5" stroke="#C6FF3D" stroke-width="6" stroke-linecap="round"/><path d="M52 15 L67 37 L74 58 L71 79 L60 92 L40 92 L29 79 L26 61 L34 42 L41 55 L45 35 Z" fill="#FF4D1A"/><path d="M50 52 L60 67 L62 80 L56 90 L44 90 L38 80 L40 69 L46 62 L48 70 Z" fill="#FFD60A"/></svg>`;

  const photo = (t) => (t && t.photo) ? t.photo : `/art/team/${t ? t.id : 'x'}.svg?c=${encodeURIComponent(t?.color || '')}${encodeURIComponent(t?.botName || '')}`;

  function toast(msg, kind = '') {
    let w = $('.toast-wrap');
    if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; document.body.appendChild(w); }
    const t = document.createElement('div'); t.className = `toast ${kind}`; t.textContent = msg; w.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  // Derived view of a match: pools, backers, odds, cheers.
  function matchView(S, matchId) {
    const m = S.matches.find((x) => x.id === matchId);
    if (!m) return null;
    const A = S.teams.find((t) => t.id === m.teamA), B = S.teams.find((t) => t.id === m.teamB);
    const vipName = Object.fromEntries(S.vips.map((v) => [v.id, v]));
    const side = (teamId) => {
      const per = {};
      for (const b of S.bets.filter((x) => x.matchId === m.id && x.teamId === teamId)) per[b.vipId] = (per[b.vipId] || 0) + b.amount;
      const backers = Object.entries(per).map(([vipId, amount]) => ({ vipId, amount, name: vipName[vipId]?.name || 'VIP', title: vipName[vipId]?.title || '' })).sort((a, b) => b.amount - a.amount);
      const total = backers.reduce((s, b) => s + b.amount, 0);
      const ch = S.cheer?.[m.id]?.[teamId] || { total: 0, fans: 0, top: [] };
      return { team: teamId === m.teamA ? A : B, backers, total, cheer: ch };
    };
    const a = side(m.teamA), b = side(m.teamB);
    const pool = a.total + b.total;
    a.share = pool ? a.total / pool : 0.5; b.share = pool ? b.total / pool : 0.5;
    a.odds = a.total ? 1 + b.total / a.total : null; b.odds = b.total ? 1 + a.total / b.total : null;
    const cheerTotal = a.cheer.total + b.cheer.total;
    a.cheerShare = cheerTotal ? a.cheer.total / cheerTotal : 0.5; b.cheerShare = cheerTotal ? b.cheer.total / cheerTotal : 0.5;
    return { m, a, b, pool, cheerTotal };
  }

  const statusLabel = { upcoming: 'Upcoming', open: 'Betting open', locked: 'Fight on', settled: 'Result in' };
  const statusPill = (s) => `<span class="pill ${s}"><span class="dot"></span>${statusLabel[s] || s}</span>`;

  function connect(hello, onState, onHello) {
    const sock = io({ transports: ['websocket', 'polling'] });
    let badge = document.createElement('div'); badge.className = 'conn'; badge.textContent = 'RECONNECTING'; document.body.appendChild(badge);
    sock.on('connect', () => { badge.classList.remove('show'); sock.emit('hello', typeof hello === 'function' ? hello() : hello, (r) => onHello && onHello(r)); });
    sock.on('disconnect', () => badge.classList.add('show'));
    sock.on('state', onState);
    const call = (ev, payload) => new Promise((res) => sock.emit(ev, payload, (r) => res(r || { ok: false, error: 'No response' })));
    return { sock, call };
  }

  return { esc, fmt, $, $$, coin, coinSvg, flame, photo, toast, matchView, statusPill, statusLabel, connect };
})();
