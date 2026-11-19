(() => {
  const { esc, fmt, flame, photo, matchView, statusPill, toast, connect } = IA;
  const app = document.getElementById('app');
  let S = null, me = null, view = 'join', structKey = '';
  let pick = null, side = null, pending = 0, myPoints = 0, myRank = null, inMatch = 0, sending = false;
  const audId = () => localStorage.getItem('ia_aud_id') || '';

  const { call } = connect(() => ({ role: 'audience', audId: audId() }), (state) => {
    S = state; draw();
  }, (r) => {
    if (r.ok && r.me) { me = r.me; myPoints = me.points; view = 'cheer'; pick = me.teamId; }
    draw(true);
  });

  const brand = `<div class="brand">${flame(34)}<div><b>IGNITION CHALLENGE</b><span>FAN ZONE</span></div></div>`;
  const infoIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';

  function draw(force) {
    if (!S) return;
    if (view === 'join') return drawJoin(force);
    const v = matchView(S, S.settings.liveMatchId);
    const live = v && !['settled'].includes(v.m.status) ? v : null;
    if (live && side !== live.m.teamA && side !== live.m.teamB) side = [live.m.teamA, live.m.teamB].includes(me.teamId) ? me.teamId : live.m.teamA;
    const key = `cheer|${live?.m.id}|${live?.m.status}|${side}|${S.teams.length}|${me?.name}|${me?.teamId}|${v?.m.status}`;
    if (force || key !== structKey) { structKey = key; drawCheer(live, v); }
    update(live);
  }

  function drawJoin(force) {
    const key = `join|${S.teams.map((t) => t.id + t.photo + t.name).join()}|${pick}`;
    if (!force && key === structKey) return;
    structKey = key;
    const name = document.getElementById('nm')?.value ?? me?.name ?? '';
    app.innerHTML = `<div class="top">${brand}</div>
      <h1>PICK YOUR <span>TEAM.</span><br>MAKE SOME NOISE.</h1>
      <p class="lead">Tap the cheer button during the fights. The loudest fans get their name on the LED wall.</p>
      <label class="field">Your name<input id="nm" class="input" maxlength="24" placeholder="Name shown on the LED wall" value="${esc(name)}" autocomplete="given-name"></label>
      <div class="eyebrow" style="margin-top:20px">The team you support</div>
      <div class="tlist">${S.teams.map((t) => `<button class="tpick ${pick === t.id ? 'on' : ''}" data-pick="${t.id}">
        <span class="check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#160700" stroke-width="3"><path d="M5 12l5 5L20 7"/></svg></span>
        <span class="i" data-info="${t.id}" aria-label="About ${esc(t.name)}">${infoIcon}</span>
        <img src="${photo(t)}" alt=""><div><b>${esc(t.name)}</b><small>${esc(t.botName)}</small></div></button>`).join('')}</div>
      <div class="stick"><button class="btn fire big" id="join">${me ? 'Save' : 'Start cheering'}</button></div>`;
  }

  function drawCheer(live, v) {
    const tn = Object.fromEntries(S.teams.map((t) => [t.id, t]));
    const myTeam = tn[me.teamId];
    let body;
    if (!live) {
      body = `<div class="wait">${v && v.m.status === 'settled' ? `<b>${esc(tn[v.m.winner]?.name)}</b> won ${esc(v.m.label)}.<br>` : ''}Waiting for the next fight.<br>Keep this page open. The cheer button appears as soon as the fight is live.</div>`;
    } else {
      const s = (t, cls, tag) => `<button class="dside ${cls} ${side === t.id ? 'on' : ''}" data-side="${t.id}">
        <span class="tag">${tag}</span>${t.id === me.teamId ? '<span class="yours">YOUR TEAM</span>' : ''}
        <img src="${photo(t)}" alt=""><span class="b" style="display:block"><b>${esc(t.name)}</b><span class="cnt" id="c-${t.id}" style="display:block">0</span><span class="mono muted" style="display:block;font-size:10px;letter-spacing:.18em">CHEERS</span><span class="tf" id="f-${t.id}" style="display:block">&nbsp;</span></span></button>`;
      const st = tn[side];
      body = `<div class="match"><div class="mhead"><div><div class="eyebrow">Live now</div><b>${esc(live.m.label)}</b></div>${statusPill(live.m.status)}</div>
        <div class="duo">${s(tn[live.m.teamA], 'red', 'RED')}${s(tn[live.m.teamB], 'blue', 'BLUE')}</div>
        <div class="meter"><div id="meter" style="width:50%"></div><div></div></div>
        <div class="mono muted" style="font-size:11px;text-align:center;margin-top:6px">TAP A TEAM TO SWITCH WHO YOU CHEER FOR</div></div>
        <div class="pad" id="pad"><button class="cheerbtn ${side === live.m.teamA ? 'red' : 'blue'}" id="cheer"><b>CHEER</b><small>${esc(st?.name || '')}</small></button></div>
        <div class="mine"><div class="stat"><b id="my-in">0</b><small>THIS FIGHT</small></div><div class="stat"><b id="my-pts">0</b><small>TOTAL</small></div><div class="stat"><b id="my-rank">-</b><small>RANK</small></div></div>
        <p class="hint">The more you tap, the higher you climb. <b>Top fans get their name on the LED wall.</b></p>`;
    }
    app.innerHTML = `<div class="top">${brand}<div class="stats"><div class="stat"><b id="my-pts2">${fmt(myPoints)}</b><small>POINTS</small></div></div></div>
      <div class="eyebrow" style="margin-bottom:10px">Hi ${esc(me.name)} · supporting <span style="color:var(--orange)">${esc(myTeam?.name || '')}</span> <button class="linkbtn" id="edit">CHANGE</button></div>
      ${body}
      <div class="sec"><h3>TOP FANS</h3><div id="fans"></div></div>`;
  }

  function update(live) {
    if (view !== 'cheer') return;
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    if (live) {
      const v = matchView(S, live.m.id);
      for (const s of [v.a, v.b]) {
        set(`c-${s.team.id}`, fmt(s.cheer.total));
        const t = s.cheer.top[0]; set(`f-${s.team.id}`, t ? `Top fan: ${t.name}` : 'No cheers yet');
      }
      const m = document.getElementById('meter'); if (m) m.style.width = `${Math.round(v.a.cheerShare * 100)}%`;
    }
    set('my-in', fmt(inMatch + pending)); set('my-pts', fmt(myPoints + pending)); set('my-pts2', fmt(myPoints + pending)); set('my-rank', myRank ? `#${myRank}` : '-');
    const tn = Object.fromEntries(S.teams.map((t) => [t.id, t.name]));
    const f = document.getElementById('fans');
    if (f) f.innerHTML = S.fans.slice(0, 5).map((x, i) => `<div class="frow ${x.name === me.name ? 'me' : ''}"><span>${i + 1}. ${esc(x.name)} <span class="muted" style="font-weight:400;font-size:13px">· ${esc(tn[x.teamId] || '')}</span></span><b>${fmt(x.points)}</b></div>`).join('') || '<div class="wait">No cheers yet. Be the first.</div>';
  }

  async function flush() {
    if (sending || pending <= 0) return;
    sending = true;
    const n = pending; pending = 0;
    const r = await call('aud:cheer', { teamId: side, n });
    sending = false;
    if (r.ok) { myPoints = r.points; myRank = r.rank; inMatch = r.inMatch; }
    else if (r.error) toast(r.error, 'err');
    update(matchView(S, S.settings.liveMatchId));
  }
  setInterval(flush, 400);

  function tap(btn, e) {
    pending++;
    btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 70);
    if (navigator.vibrate) navigator.vibrate(8);
    const pad = document.getElementById('pad');
    const p = document.createElement('span'); p.className = 'plus'; p.textContent = '+1';
    const r = pad.getBoundingClientRect();
    const x = (e.touches?.[0]?.clientX ?? e.clientX ?? r.left + r.width / 2) - r.left;
    p.style.left = `${x - 12 + (Math.random() * 30 - 15)}px`; p.style.top = `${(r.height / 2) - 30}px`;
    pad.appendChild(p); setTimeout(() => p.remove(), 800);
    const ring = document.createElement('span'); ring.className = 'ring'; pad.appendChild(ring); setTimeout(() => ring.remove(), 500);
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    set('my-in', fmt(inMatch + pending)); set('my-pts', fmt(myPoints + pending)); set('my-pts2', fmt(myPoints + pending));
  }

  function teamSheet(id) {
    const t = S.teams.find((x) => x.id === id); if (!t) return;
    const back = document.createElement('div'); back.className = 'sheet-back';
    back.innerHTML = `<div class="sheet" role="dialog" aria-label="${esc(t.name)}"><img class="hero" src="${photo(t)}" alt=""><div class="in">
      <div class="eyebrow">${esc(t.college || '')}</div><h2 class="display" style="margin:6px 0 4px;font-size:24px">${esc(t.name)}</h2>
      <div class="mono" style="color:var(--cyan);letter-spacing:.14em;font-size:13px">${esc((t.botName || '').toUpperCase())} · ${esc(t.weapon || '')} · ${esc(t.weight || '')}</div>
      <p style="line-height:1.6;color:var(--text2)">${esc(t.description || '')}</p>
      <button class="btn" style="width:100%" data-close>Close</button></div></div>`;
    back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) back.remove(); });
    document.body.appendChild(back);
  }

  // Pointer handling: fast taps on the cheer button, everything else by click.
  app.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('#cheer'); if (b) { e.preventDefault(); tap(b, e); }
  });
  app.addEventListener('click', async (e) => {
    const info = e.target.closest('[data-info]'); if (info) { e.stopPropagation(); return teamSheet(info.dataset.info); }
    const p = e.target.closest('[data-pick]'); if (p) { pick = p.dataset.pick; return draw(); }
    const sd = e.target.closest('[data-side]'); if (sd) { await flush(); side = sd.dataset.side; return draw(true); }
    if (e.target.closest('#edit')) { view = 'join'; structKey = ''; return draw(true); }
    if (e.target.closest('#join')) {
      const name = document.getElementById('nm').value.trim();
      if (!name) return toast('Enter your name', 'err');
      if (!pick) return toast('Pick the team you support', 'err');
      const r = await call('aud:join', { name, teamId: pick, audId: audId() });
      if (!r.ok) return toast(r.error, 'err');
      me = r.me; myPoints = me.points; localStorage.setItem('ia_aud_id', me.id);
      view = 'cheer'; side = null; draw(true);
    }
  });
})();
