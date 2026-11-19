(() => {
  const { esc, fmt, $, coin, flame, photo, matchView, statusPill, toast, connect } = IA;
  const app = $('#app');
  let S = null, conn = null, authed = false, built = '', rTimer = null, lastRender = 0;
  let pin = sessionStorage.getItem('ia_pin') || '';
  let sec = localStorage.getItem('ia_admin_sec') || 'live';
  const sigs = {};

  // ---------- auth ----------
  function gate(err) {
    built = '';
    app.innerHTML = `<div class="gate"><form class="card" id="pinf">${flame(64)}
      <h1 class="display" style="font-size:22px;margin:18px 0 6px">Admin control</h1><p class="muted" style="margin:0 0 18px">Enter the admin PIN to run the arena.</p>
      <input id="pin" class="input pin" inputmode="numeric" type="password" autocomplete="off" aria-label="Admin PIN" autofocus>
      ${err ? `<p style="color:#FF8A96;margin:10px 0 0">${esc(err)}</p>` : ''}
      <button class="btn primary" style="width:100%;margin-top:16px">Unlock</button></form></div>`;
    $('#pinf').addEventListener('submit', (e) => {
      e.preventDefault(); pin = $('#pin').value.trim();
      if (!conn) start(); else conn.sock.emit('hello', { role: 'admin', pin }, onHello);
    });
  }
  function onHello(r) {
    if (!r.ok) { authed = false; sessionStorage.removeItem('ia_pin'); return gate(r.error); }
    authed = true; sessionStorage.setItem('ia_pin', pin); schedule(true);
  }
  function start() {
    conn = connect(() => ({ role: 'admin', pin }), (st) => { if (st.admin) { S = st; schedule(); } }, onHello);
  }
  if (pin) start(); else gate();
  const call = (ev, p) => conn.call(ev, p).then((r) => { if (!r.ok) toast(r.error || 'Something went wrong', 'err'); return r; });

  function schedule(now) {
    if (!authed || !S) return;
    clearTimeout(rTimer);
    const wait = now ? 0 : Math.max(0, 200 - (Date.now() - lastRender));
    rTimer = setTimeout(() => { lastRender = Date.now(); render(); }, wait);
  }

  // ---------- layout ----------
  const NAV = [
    ['live', 'Live control', '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4"/><circle cx="12" cy="12" r="3"/>'],
    ['matches', 'Matches', '<path d="M4 6h16M4 12h16M4 18h10"/>'],
    ['teams', 'Teams', '<rect x="4" y="7" width="16" height="11" rx="2"/><path d="M8 7V4h8v3M8 13h.01M16 13h.01"/>'],
    ['vips', 'VIPs', '<path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z"/>'],
    ['fans', 'Audience', '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a3 3 0 1 0 0-6M21 20c0-2.6-1.7-4.8-4-5.6"/>'],
    ['settings', 'Settings', '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'],
  ];
  const icon = (p) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;

  function render() {
    if (built !== sec) {
      built = sec; Object.keys(sigs).forEach((k) => delete sigs[k]);
      app.innerHTML = `<div class="shell"><aside class="side">
        <div class="brand">${flame(36)}<div><b>IGNITION<br>ARENA</b><span>ADMIN</span></div></div>
        <nav>${NAV.map(([k, l, p]) => `<button data-nav="${k}" class="${sec === k ? 'on' : ''}">${icon(p)}${l}</button>`).join('')}</nav>
        <div class="foot"><a href="/led" target="_blank" rel="noopener">LED wall ↗</a><a href="/cheer" target="_blank" rel="noopener">Audience page ↗</a><a href="#" id="logout">Lock admin</a></div>
      </aside><main id="main">${SECTIONS[sec].shell()}</main></div>`;
      SECTIONS[sec].mount?.();
    }
    SECTIONS[sec].update();
  }
  const changed = (key, val) => { const s = JSON.stringify(val); if (sigs[key] === s) return false; sigs[key] = s; return true; };
  const notFocused = (el) => el && document.activeElement !== el;
  const teamOpts = (sel) => S.teams.map((t) => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
  const tn = () => Object.fromEntries(S.teams.map((t) => [t.id, t]));
  const ago = (ts) => new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  // ---------- sections ----------
  const TEMPLATES = [
    ['idle', 'Brand / idle', 'Event logo, between fights'],
    ['faceoff', 'Face-off', 'Red vs Blue team intro'],
    ['bets', 'VIP bets', 'Team A vs B with VIP backers'],
    ['cheer', 'Cheer meter', 'Big QR and fan counts'],
    ['winner', 'Winner', 'Winner card and VIP payouts'],
    ['vipboard', 'VIP leaderboard', 'Top 10 VIPs by coins'],
    ['fanboard', 'Top fans', 'Top 10 cheering fans'],
    ['lineup', 'Team lineup', 'All teams with bots'],
    ['message', 'Message', 'Your own text, big'],
  ];

  const SECTIONS = {
    live: {
      shell: () => `<div class="ph"><div><h1>Live control</h1><p>Run the fight, the bets and the LED wall from one screen.</p></div>
        <div class="btnrow"><a class="btn" href="/led" target="_blank" rel="noopener">Open LED wall ↗</a></div></div>
        <div class="g2"><div style="display:flex;flex-direction:column;gap:18px;min-width:0">
          <div class="box"><h3>LIVE MATCH <select id="lmsel" class="input" style="max-width:300px;min-height:38px;padding:6px 10px" aria-label="Live match"></select></h3><div id="lm"></div></div>
          <div class="box"><h3>LED WALL <span class="muted" style="letter-spacing:.08em">TAP A TEMPLATE TO PUT IT ON AIR</span></h3>
            <div class="tpls" id="tpls"></div>
            <div class="step">MESSAGE TEXT</div>
            <div style="display:flex;gap:8px"><input id="msg" class="input" maxlength="140" placeholder="e.g. Quarterfinal 2 starts in 5 minutes"><button class="btn" id="sendmsg">Show</button></div>
            <label class="toggle"><input type="checkbox" id="qr"> Show the "scan to cheer" QR on the LED wall</label>
          </div></div>
        <div style="display:flex;flex-direction:column;gap:18px;min-width:0">
          <div class="box"><h3><span style="display:flex;align-items:center;gap:10px">LED PREVIEW <span class="onair" style="position:static"><i></i>ON AIR</span></span><a class="btn sm" href="/led" target="_blank" rel="noopener">Full screen ↗</a></h3><div class="preview"><iframe src="/led" title="LED wall preview"></iframe></div></div>
          <div class="box"><h3>BETS ON THIS MATCH</h3><div id="lmbets"></div></div>
          <div class="box"><h3>LIVE FEED</h3><div id="feed" class="feed"></div></div>
        </div></div>`,
      mount() { $('#msg').value = S.led.message || ''; },
      update() {
        const sel = $('#lmsel');
        if (changed('lmsel', [S.matches.map((m) => [m.id, m.label, m.status]), S.settings.liveMatchId]) && notFocused(sel)) {
          sel.innerHTML = `<option value="">No live match</option>` + S.matches.map((m) => `<option value="${m.id}" ${m.id === S.settings.liveMatchId ? 'selected' : ''}>${esc(m.label)} · ${esc(tn()[m.teamA]?.name)} vs ${esc(tn()[m.teamB]?.name)}</option>`).join('');
        }
        const v = matchView(S, S.settings.liveMatchId);
        $('#lm').innerHTML = !v ? `<p class="muted">Pick a match above. It shows on the VIP tablets, the audience phones and the LED wall.</p>` : `
          <div class="lm-teams"><div class="lm-t red"><img src="${photo(v.a.team)}" alt=""><div><b>${esc(v.a.team?.name)}</b><small>RED · ${esc(v.a.team?.botName)}</small></div></div><span class="vs">VS</span>
          <div class="lm-t blue"><img src="${photo(v.b.team)}" alt=""><div><b>${esc(v.b.team?.name)}</b><small>BLUE · ${esc(v.b.team?.botName)}</small></div></div></div>
          <div class="kpis"><div class="kpi"><small>STATUS</small>${statusPill(v.m.status)}</div><div class="kpi"><small>POOL</small><b>${coin(v.pool, 16)}</b></div>
          <div class="kpi"><small>VIP BETS</small><b>${v.a.backers.length + v.b.backers.length}</b></div><div class="kpi"><small>CHEERS</small><b>${fmt(v.cheerTotal)}</b></div></div>
          <div class="step">1. BETTING</div>
          <div class="btnrow">
            <button class="btn ${v.m.status === 'open' ? 'lime' : ''}" data-status="open" ${v.m.status === 'settled' ? 'disabled' : ''}>Open betting</button>
            <button class="btn ${v.m.status === 'locked' ? 'fire' : ''}" data-status="locked" ${v.m.status === 'settled' ? 'disabled' : ''}>Lock betting · fight on</button>
            <button class="btn ghost" data-status="upcoming" ${v.m.status === 'settled' ? 'disabled' : ''}>Back to upcoming</button>
          </div>
          <div class="step">2. RESULT</div>
          ${v.m.status === 'settled'
            ? `<div class="btnrow" style="align-items:center"><span style="font-weight:700;color:var(--gold)">Winner: ${esc(tn()[v.m.winner]?.name)}</span><button class="btn sm" data-undo>Undo result</button></div>`
            : `<div class="btnrow"><button class="btn red winbtn" data-win="${v.a.team?.id}">${esc(v.a.team?.name)} wins</button><button class="btn blue winbtn" data-win="${v.b.team?.id}">${esc(v.b.team?.name)} wins</button></div>`}
          <div class="btnrow" style="margin-top:10px"><button class="btn sm danger" data-refund>Cancel match and refund bets</button></div>`;
        if (changed('tpls', [S.led.template])) $('#tpls').innerHTML = TEMPLATES.map(([k, l, d]) => `<button class="tpl ${S.led.template === k ? 'on' : ''}" data-tpl="${k}"><span class="live">ON AIR</span><b>${l}</b><span>${d}</span></button>`).join('');
        const qr = $('#qr'); if (notFocused(qr)) qr.checked = !!S.led.showQR;
        $('#lmbets').innerHTML = !v ? '<p class="muted">No live match.</p>' : (() => {
          const rows = [...v.a.backers.map((b) => ({ ...b, team: v.a.team, c: 'var(--red)' })), ...v.b.backers.map((b) => ({ ...b, team: v.b.team, c: 'var(--blue)' }))].sort((x, y) => y.amount - x.amount);
          return rows.length ? `<div class="tw"><table><thead><tr><th>VIP</th><th>Backing</th><th class="num">Coins</th></tr></thead><tbody>${rows.map((r) => `<tr><td><b>${esc(r.name)}</b> <span class="muted" style="font-size:12px">${esc(r.title)}</span></td><td style="color:${r.c};font-weight:600">${esc(r.team?.name)}</td><td class="num">${fmt(r.amount)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No bets yet.</p>';
        })();
        if (changed('feed', S.feed.slice(0, 40))) $('#feed').innerHTML = S.feed.slice(0, 40).map((f) => `<div class="fi ${f.type}"><time>${ago(f.ts)}</time><span>${esc(f.text)}</span></div>`).join('') || '<p class="muted">Nothing yet.</p>';
      },
    },

    matches: {
      shell: () => `<div class="ph"><div><h1>Matches</h1><p>Create the fight card. The live match is picked in Live control or here.</p></div></div>
        <div class="box" style="margin-bottom:18px"><h3>NEW MATCH</h3>
          <div class="form" style="grid-template-columns:1.2fr 1fr 1fr auto;align-items:end">
            <label class="field">Label<input id="nm-label" class="input" placeholder="Quarterfinal 1"></label>
            <label class="field"><span style="color:var(--red)">Red corner</span><select id="nm-a" class="input"></select></label>
            <label class="field"><span style="color:var(--blue)">Blue corner</span><select id="nm-b" class="input"></select></label>
            <button class="btn primary" id="nm-go">Add match</button></div></div>
        <div class="box"><h3>FIGHT CARD</h3><div id="mlist"></div></div>`,
      update() {
        if (changed('mteams', S.teams.map((t) => [t.id, t.name]))) {
          const a = $('#nm-a'), b = $('#nm-b');
          if (notFocused(a)) a.innerHTML = teamOpts(a.value || S.teams[0]?.id);
          if (notFocused(b)) b.innerHTML = teamOpts(b.value || S.teams[1]?.id);
        }
        if (!changed('mlist', [S.matches, S.settings.liveMatchId, S.bets.length, S.teams])) return;
        const T = tn();
        $('#mlist').innerHTML = S.matches.length ? `<div class="tw"><table><thead><tr><th>Match</th><th>Red</th><th>Blue</th><th>Status</th><th class="num">Pool</th><th></th></tr></thead><tbody>${S.matches.map((m) => {
          const pool = S.bets.filter((b) => b.matchId === m.id).reduce((s, b) => s + b.amount, 0);
          const live = m.id === S.settings.liveMatchId;
          return `<tr><td><b>${esc(m.label)}</b>${live ? ' <span class="pill open" style="margin-left:6px"><span class="dot"></span>LIVE</span>' : ''}</td>
          <td style="${m.winner === m.teamA ? 'color:var(--gold);font-weight:700' : ''}">${esc(T[m.teamA]?.name)}</td><td style="${m.winner === m.teamB ? 'color:var(--gold);font-weight:700' : ''}">${esc(T[m.teamB]?.name)}</td>
          <td>${statusPill(m.status)}</td><td class="num">${fmt(pool)}</td>
          <td><div class="btnrow" style="justify-content:flex-end">${live ? '' : `<button class="btn sm" data-live="${m.id}">Set live</button>`}<button class="btn sm" data-medit="${m.id}">Edit</button><button class="btn sm danger" data-mdel="${m.id}">Delete</button></div></td></tr>`;
        }).join('')}</tbody></table></div>` : '<p class="muted">No matches yet. Add the first one above.</p>';
      },
    },

    teams: {
      shell: () => `<div class="ph"><div><h1>Teams</h1><p>Name, bot photo and a short description. VIPs and fans see these.</p></div><button class="btn primary" id="t-add">Add team</button></div><div class="tg" id="tgrid"></div>`,
      update() {
        if (!changed('teams', S.teams)) return;
        $('#tgrid').innerHTML = S.teams.map((t) => `<div class="tc"><img src="${photo(t)}" alt=""><div class="in"><b><span class="sw" style="background:${esc(t.color)}"></span>${esc(t.name)}</b><span class="bot">${esc(t.botName)} · ${esc(t.weapon)}</span>
          <p class="muted" style="font-size:13px;line-height:1.45;margin:8px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(t.description)}</p>
          <div class="acts"><button class="btn sm" data-tedit="${t.id}">Edit</button><button class="btn sm danger" data-tdel="${t.id}">Delete</button></div></div></div>`).join('');
      },
    },

    vips: {
      shell: () => `<div class="ph"><div><h1>VIPs</h1><p>Each VIP gets a private tablet link. Open it on their tablet once and it remembers them.</p></div>
        <div class="btnrow"><button class="btn" id="v-topup">Give coins to all</button><button class="btn primary" id="v-add">Add VIP</button></div></div>
        <div class="box"><div class="tw" id="vlist"></div></div>`,
      update() {
        if (!changed('vips', [S.vips, S.bets.length, S.settings.coinName])) return;
        $('#vlist').innerHTML = `<table><thead><tr><th>VIP</th><th class="num">${esc(S.settings.coinName)}</th><th class="num">Bets</th><th>Tablet link</th><th></th></tr></thead><tbody>${
          [...S.vips].sort((a, b) => b.coins - a.coins).map((v) => `<tr><td><b>${esc(v.name)}</b><br><span class="muted" style="font-size:12px">${esc(v.title)}</span></td>
          <td class="num">${coin(v.coins, 14)}</td><td class="num">${S.bets.filter((b) => b.vipId === v.id).length}</td>
          <td><div class="linkcell"><code>${esc(v.link)}</code><button class="btn sm" data-copy="${esc(v.link)}">Copy</button><button class="btn sm" data-vqr="${v.id}">QR</button><a class="btn sm" href="${esc(v.link)}" target="_blank" rel="noopener">Open</a></div></td>
          <td><div class="btnrow" style="justify-content:flex-end"><button class="btn sm" data-vedit="${v.id}">Edit</button><button class="btn sm" data-vnew="${v.id}" title="Old link stops working">New link</button><button class="btn sm danger" data-vdel="${v.id}">Delete</button></div></td></tr>`).join('')}</tbody></table>`;
      },
    },

    fans: {
      shell: () => `<div class="ph"><div><h1>Audience</h1><p id="fcount"></p></div><button class="btn" id="f-qr">Show cheer QR</button></div><div class="box"><div class="tw" id="flist"></div></div>`,
      update() {
        if (!changed('fans', [S.audience, S.teams.length])) return;
        const T = tn();
        $('#fcount').textContent = `${S.audience.length} fans joined. Points are cheer taps.`;
        $('#flist').innerHTML = S.audience.length ? `<table><thead><tr><th>#</th><th>Name</th><th>Supports</th><th class="num">Points</th><th></th></tr></thead><tbody>${S.audience.map((a, i) => `<tr><td class="mono">${i + 1}</td><td><b>${esc(a.name)}</b></td><td>${esc(T[a.teamId]?.name || '-')}</td><td class="num">${fmt(a.points)}</td><td style="text-align:right"><button class="btn sm danger" data-fdel="${a.id}" title="Remove, e.g. for a rude name">Remove</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted">No fans yet. Put the cheer QR on the LED wall.</p>';
      },
    },

    settings: {
      shell: () => `<div class="ph"><div><h1>Settings</h1><p>Names, coins and the address phones use to reach this laptop.</p></div></div>
        <div class="g2"><div class="box"><h3>EVENT</h3><div class="form">
          <label class="field">Event name<input id="s-ev" class="input"></label>
          <label class="field">Coin name<input id="s-coin" class="input" maxlength="20"></label>
          <label class="field">Starting coins per VIP<input id="s-start" class="input" inputmode="numeric"></label>
          <label class="field">Public address (optional)<input id="s-url" class="input" placeholder="http://192.168.1.20:3000"></label>
          <p class="full muted" style="margin:0;font-size:13px;line-height:1.5">Phones and tablets must reach this address. Leave it empty to use this laptop's Wi-Fi address automatically. If you host the app online, put that URL here.</p>
          <div class="full"><button class="btn primary" id="s-save">Save settings</button></div></div></div>
          <div class="box"><h3>AUDIENCE QR</h3><div class="qrbig"><img id="s-qr" alt="Cheer page QR code"></div><p class="mono" style="text-align:center;margin:12px 0 0;font-size:13px" id="s-cheer"></p></div>
        </div>
        <div class="box danger" style="margin-top:18px"><h3 style="color:#FF8A96">RESET</h3>
          <p class="muted" style="margin:0 0 12px;line-height:1.5">Before the event: clear the demo bets and cheers but keep your teams, VIPs and matches. Every VIP goes back to the starting coins.</p>
          <div class="btnrow"><button class="btn danger" id="s-clear">Clear bets, cheers and results</button><button class="btn danger" id="s-demo">Reload demo data</button></div></div>`,
      mount() {
        $('#s-ev').value = S.settings.eventName; $('#s-coin').value = S.settings.coinName;
        $('#s-start').value = S.settings.startingCoins; $('#s-url').value = S.settings.publicUrl || '';
      },
      update() {
        if (!changed('sq', S.settings.cheerUrl)) return;
        $('#s-qr').src = `/qr.svg?data=${encodeURIComponent(S.settings.cheerUrl)}`; $('#s-cheer').textContent = S.settings.cheerUrl;
      },
    },
  };

  // ---------- modals ----------
  function modal(html) {
    const back = document.createElement('div'); back.className = 'sheet-back';
    back.innerHTML = `<div class="sheet modal" role="dialog">${html}</div>`;
    const close = () => back.remove();
    back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) close(); });
    document.body.appendChild(back);
    return { el: back, close };
  }
  function confirmBox(text, okLabel = 'Confirm') {
    return new Promise((res) => {
      const m = modal(`<h2>Are you sure?</h2><p style="color:var(--text2);line-height:1.5">${esc(text)}</p><div class="btnrow" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-close>Cancel</button><button class="btn fire" id="cf-ok">${esc(okLabel)}</button></div>`);
      m.el.querySelector('#cf-ok').onclick = () => { m.close(); res(true); };
      m.el.addEventListener('click', (e) => { if (e.target.closest('[data-close]') || e.target === m.el) res(false); });
    });
  }
  function resizeImage(file) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => { const img = new Image(); img.onload = () => {
        const max = 1200, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.85));
      }; img.onerror = rej; img.src = fr.result; };
      fr.onerror = rej; fr.readAsDataURL(file);
    });
  }
  function teamModal(id) {
    const t = S.teams.find((x) => x.id === id) || { name: '', botName: '', weapon: '', college: '', weight: '15 kg', description: '', color: '#22E5FF' };
    let photoData = null, removePhoto = false;
    const m = modal(`<h2>${id ? 'Edit team' : 'Add team'}</h2><div class="form">
      <label class="field">Team name<input id="f-name" class="input" value="${esc(t.name)}"></label>
      <label class="field">Bot name<input id="f-bot" class="input" value="${esc(t.botName)}"></label>
      <label class="field">Weapon type<input id="f-weapon" class="input" value="${esc(t.weapon)}" placeholder="Vertical spinner"></label>
      <label class="field">College<input id="f-college" class="input" value="${esc(t.college)}"></label>
      <label class="field">Weight class<input id="f-weight" class="input" value="${esc(t.weight)}"></label>
      <label class="field">Team colour<input id="f-color" class="input" type="color" value="${esc(t.color || '#22E5FF')}" style="padding:4px;height:44px"></label>
      <label class="field full">Short description<textarea id="f-desc" class="input" rows="3">${esc(t.description)}</textarea></label>
      <div class="field full"><span>Bot photo</span><div class="phprev"><img id="f-prev" src="${id ? photo(t) : '/art/team/new.svg'}" alt=""><div class="btnrow"><label class="btn sm">Upload photo<input id="f-file" type="file" accept="image/*" hidden></label>${t.photo ? '<button class="btn sm ghost" id="f-rm">Use generated art</button>' : ''}</div></div></div>
    </div><div class="btnrow" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-close>Cancel</button><button class="btn primary" id="f-save">Save team</button></div>`);
    const q = (s) => m.el.querySelector(s);
    q('#f-file').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; photoData = await resizeImage(f); q('#f-prev').src = photoData; removePhoto = false; };
    if (q('#f-rm')) q('#f-rm').onclick = () => { removePhoto = true; photoData = null; q('#f-prev').src = `/art/team/${t.id}.svg?x=${Date.now()}`; };
    q('#f-save').onclick = async () => {
      const r = await call('team:save', { id, name: q('#f-name').value.trim(), botName: q('#f-bot').value.trim(), weapon: q('#f-weapon').value.trim(), college: q('#f-college').value.trim(), weight: q('#f-weight').value.trim(), color: q('#f-color').value, description: q('#f-desc').value.trim(), photoData, removePhoto });
      if (r.ok) { m.close(); toast('Team saved', 'ok'); }
    };
  }
  function vipModal(id) {
    const v = S.vips.find((x) => x.id === id) || { name: '', title: '', coins: S.settings.startingCoins };
    const m = modal(`<h2>${id ? 'Edit VIP' : 'Add VIP'}</h2><div class="form">
      <label class="field">Name<input id="v-name" class="input" value="${esc(v.name)}"></label>
      <label class="field">Title<input id="v-title" class="input" value="${esc(v.title)}" placeholder="Chief Guest"></label>
      <label class="field">${esc(S.settings.coinName)} balance<input id="v-coins" class="input" inputmode="numeric" value="${v.coins}"></label></div>
      <div class="btnrow" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-close>Cancel</button><button class="btn primary" id="v-save">Save VIP</button></div>`);
    const q = (s) => m.el.querySelector(s);
    q('#v-save').onclick = async () => { const r = await call('vip:save', { id, name: q('#v-name').value.trim(), title: q('#v-title').value.trim(), coins: q('#v-coins').value }); if (r.ok) { m.close(); toast('VIP saved', 'ok'); } };
  }
  function matchModal(id) {
    const mm = S.matches.find((x) => x.id === id); if (!mm) return;
    const m = modal(`<h2>Edit match</h2><div class="form">
      <label class="field full">Label<input id="e-label" class="input" value="${esc(mm.label)}"></label>
      <label class="field"><span style="color:var(--red)">Red corner</span><select id="e-a" class="input">${teamOpts(mm.teamA)}</select></label>
      <label class="field"><span style="color:var(--blue)">Blue corner</span><select id="e-b" class="input">${teamOpts(mm.teamB)}</select></label></div>
      <div class="btnrow" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-close>Cancel</button><button class="btn primary" id="e-save">Save</button></div>`);
    const q = (s) => m.el.querySelector(s);
    q('#e-save').onclick = async () => { const r = await call('match:save', { id, label: q('#e-label').value.trim(), teamA: q('#e-a').value, teamB: q('#e-b').value }); if (r.ok) m.close(); };
  }
  function qrModal(title, url) {
    modal(`<h2>${esc(title)}</h2><div class="qrbig"><img src="/qr.svg?data=${encodeURIComponent(url)}" alt="QR code"></div><p class="mono" style="text-align:center;word-break:break-all;font-size:12px;color:var(--text2)">${esc(url)}</p><div class="btnrow" style="justify-content:flex-end"><button class="btn" data-close>Close</button></div>`);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); } catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast('Link copied', 'ok');
  }

  // ---------- events ----------
  app.addEventListener('click', async (e) => {
    if (!S || !authed) return;
    const t = (sel) => e.target.closest(sel);
    let el;
    if ((el = t('[data-nav]'))) { sec = el.dataset.nav; localStorage.setItem('ia_admin_sec', sec); return schedule(true); }
    if (t('#logout')) { e.preventDefault(); sessionStorage.removeItem('ia_pin'); location.reload(); return; }
    const live = S.settings.liveMatchId;
    if ((el = t('[data-status]'))) return call('match:status', { id: live, status: el.dataset.status });
    if ((el = t('[data-win]'))) { const name = S.teams.find((x) => x.id === el.dataset.win)?.name; if (await confirmBox(`Declare ${name} the winner? VIP coins are paid out right away.`, 'Declare winner')) { const r = await call('match:settle', { id: live, winner: el.dataset.win }); if (r.ok) { call('led:set', { template: 'winner' }); toast('Result in. Winner card is on the LED wall.', 'ok'); } } return; }
    if (t('[data-undo]')) { if (await confirmBox('Undo this result? Payouts are taken back from the winners.', 'Undo')) call('match:undo', { id: live }); return; }
    if (t('[data-refund]')) { if (await confirmBox('Cancel this match? Every VIP bet on it is refunded.', 'Refund bets')) call('match:cancel', { id: live }); return; }
    if ((el = t('[data-tpl]'))) return call('led:set', { template: el.dataset.tpl });
    if (t('#sendmsg')) { await call('led:set', { message: $('#msg').value, template: 'message' }); return; }
    if (t('#nm-go')) { const r = await call('match:save', { label: $('#nm-label').value.trim(), teamA: $('#nm-a').value, teamB: $('#nm-b').value }); if (r.ok) { $('#nm-label').value = ''; toast('Match added', 'ok'); } return; }
    if ((el = t('[data-live]'))) return call('live:set', { id: el.dataset.live });
    if ((el = t('[data-medit]'))) return matchModal(el.dataset.medit);
    if ((el = t('[data-mdel]'))) { if (await confirmBox('Delete this match? Unsettled bets are refunded.', 'Delete')) call('match:delete', { id: el.dataset.mdel }); return; }
    if (t('#t-add')) return teamModal(null);
    if ((el = t('[data-tedit]'))) return teamModal(el.dataset.tedit);
    if ((el = t('[data-tdel]'))) { if (await confirmBox('Delete this team?', 'Delete')) call('team:delete', { id: el.dataset.tdel }); return; }
    if (t('#v-add')) return vipModal(null);
    if ((el = t('[data-vedit]'))) return vipModal(el.dataset.vedit);
    if ((el = t('[data-vdel]'))) { if (await confirmBox('Delete this VIP and their bets?', 'Delete')) call('vip:delete', { id: el.dataset.vdel }); return; }
    if ((el = t('[data-vnew]'))) { if (await confirmBox('Make a new link? The old link on the tablet stops working.', 'New link')) call('vip:newlink', { id: el.dataset.vnew }); return; }
    if ((el = t('[data-vqr]'))) { const v = S.vips.find((x) => x.id === el.dataset.vqr); return qrModal(`Tablet link for ${v.name}`, v.link); }
    if ((el = t('[data-copy]'))) return copy(el.dataset.copy);
    if (t('#v-topup')) {
      const m = modal(`<h2>Give coins to every VIP</h2><label class="field">Amount<input id="tp" class="input" inputmode="numeric" value="5000"></label><div class="btnrow" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-close>Cancel</button><button class="btn primary" id="tp-go">Give</button></div>`);
      m.el.querySelector('#tp-go').onclick = async () => { const r = await call('vip:topup', { amount: m.el.querySelector('#tp').value }); if (r.ok) { m.close(); toast('Coins added', 'ok'); } };
      return;
    }
    if ((el = t('[data-fdel]'))) return call('audience:remove', { id: el.dataset.fdel });
    if (t('#f-qr')) return qrModal('Audience cheer page', S.settings.cheerUrl);
    if (t('#s-save')) { const r = await call('settings:save', { eventName: $('#s-ev').value, coinName: $('#s-coin').value, startingCoins: $('#s-start').value, publicUrl: $('#s-url').value }); if (r.ok) toast('Settings saved', 'ok'); return; }
    if (t('#s-clear')) { if (await confirmBox('Clear all bets, cheers, fans and results? Teams, VIPs and matches stay. VIP coins reset.', 'Clear')) { const r = await call('data:clearPlay'); if (r.ok) toast('Cleared', 'ok'); } return; }
    if (t('#s-demo')) { if (await confirmBox('Replace everything with the demo data? Your teams and VIPs are lost.', 'Load demo')) { const r = await call('data:demo'); if (r.ok) { built = ''; toast('Demo data loaded', 'ok'); } } }
  });
  app.addEventListener('change', (e) => {
    if (e.target.id === 'lmsel') call('live:set', { id: e.target.value });
    if (e.target.id === 'qr') call('led:set', { showQR: e.target.checked });
  });
  app.addEventListener('keydown', (e) => { if (e.target.id === 'msg' && e.key === 'Enter') $('#sendmsg').click(); });
})();
