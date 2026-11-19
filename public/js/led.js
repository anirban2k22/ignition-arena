(() => {
  const { esc, fmt, coin, coinSvg, flame, photo, matchView, statusPill, connect } = IA;
  const stage = document.getElementById('stage');
  const content = document.getElementById('content');
  const flashLayer = document.getElementById('flashLayer');
  const fxLayer = document.getElementById('fxLayer');
  let lastHtml = '';
  let S = null, lastKey = '', lastKey2 = '', lastBetCount = null, lastResultKey = '';

  // Scale the 1920x1080 stage to whatever screen or iframe it is shown on.
  function fit() {
    const s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit); fit();

  const hud = '<div class="hud"><i></i><i></i><i></i><i></i></div>';
  const brand = () => `<div class="brand">${flame(58)}<div><div class="t1">ULTIMATE TECH LEAGUE</div><div class="t2">${esc(S.settings.eventName).toUpperCase()}</div></div></div>`;
  const qrSrc = () => `/qr.svg?data=${encodeURIComponent(S.settings.cheerUrl)}`;
  const qrCorner = () => `<div class="qr-corner"><div class="t"><small>SCAN TO</small>CHEER FOR<br>YOUR TEAM</div><img src="${qrSrc()}" alt="QR code to the cheer page"></div>`;
  const top = (v) => `<div class="topbar">${brand()}<div style="display:flex;align-items:center;gap:22px">${v ? `<span class="match-label">${esc(v.m.label)}</span>${statusPill(v.m.status)}` : ''}</div></div>`;

  function noMatch() {
    return `${top(null)}<div class="center"><div class="msg anim rise">No live match selected</div><div class="idle-sub">PICK ONE IN THE ADMIN PANEL</div></div>`;
  }

  const T = {
    idle() {
      stage.classList.add('neutral');
      return `<div class="center">
        <div class="anim rise">${flame(150)}</div>
        <div class="idle-sub anim rise">ULTIMATE TECH LEAGUE PRESENTS</div>
        <div class="idle-title anim rise">${esc(S.settings.eventName.split(' ')[0] || '').toUpperCase()}<span>${esc(S.settings.eventName.split(' ').slice(1).join(' ')).toUpperCase()}</span></div>
        <div class="idle-sub anim rise" style="color:var(--text2)">ROBOWAR · FPV DRONE RACING</div>
      </div>${S.led.showQR ? qrCorner() : ''}`;
    },
    message() {
      stage.classList.add('neutral');
      return `${top(null)}<div class="center"><div class="msg anim rise">${esc(S.led.message || '')}</div></div>${S.led.showQR ? qrCorner() : ''}`;
    },
    faceoff(v) {
      const side = (s, cls, tag) => `<div class="fo-side ${cls}">
        <img class="fo-img anim" src="${photo(s.team)}" alt="">
        <div class="anim"><div class="corner-tag">${tag}</div><div class="tname">${esc(s.team?.name)}</div><div class="tbot" style="margin-top:12px">${esc(s.team?.botName)} · ${esc(s.team?.weapon)}</div></div>
      </div>`;
      return `${top(v)}<div class="faceoff">${side(v.a, 'red', 'Red corner')}<div class="vsbig anim">VS</div>${side(v.b, 'blue', 'Blue corner')}</div>${S.led.showQR ? qrCorner() : ''}`;
    },
    bets(v) {
      const head = (s, cls, tag) => `<div class="b-team ${cls}"><img src="${photo(s.team)}" alt="">
        <div class="b-total"><div class="corner-tag">${tag}</div><div class="tname">${esc(s.team?.name)}</div>
        <div class="big">${coinSvg(40)}${fmt(s.total)}</div></div></div>`;
      const list = (s, cls) => `<div class="backers ${cls}"><h4>VIP BACKERS · ${s.backers.length}</h4>${
        s.backers.length ? s.backers.slice(0, 5).map((b, i) => cls === 'red'
          ? `<div class="brow anim" style="animation-delay:${i * 60}ms"><span class="rk">#${i + 1}</span><span class="nm">${esc(b.name)}<small>${esc(b.title)}</small></span><span class="amt">${coinSvg(26)}${fmt(b.amount)}</span></div>`
          : `<div class="brow anim" style="animation-delay:${i * 60}ms"><span class="amt">${coinSvg(26)}${fmt(b.amount)}</span><span class="nm"><small>${esc(b.title)}</small>${esc(b.name)}</span><span class="rk">#${i + 1}</span></div>`).join('')
          + (s.backers.length > 5 ? `<div class="muted" style="font-size:22px;padding:0 22px">+ ${s.backers.length - 5} more</div>` : '')
        : `<div class="empty">No VIP has backed ${esc(s.team?.name)} yet</div>`}</div>`;
      const fan = (s, cls) => { const t = s.cheer.top[0]; return `<div class="fan ${cls}"><span class="lbl">TOP FAN</span><span class="who">${t ? esc(t.name) : 'Scan and cheer'}</span><span class="cnt">${t ? `${fmt(t.count)} cheers` : ''}</span></div>`; };
      const pct = Math.round(v.a.share * 100);
      return `${top(v)}<div class="bets">
        <div class="b-head">${head(v.a, 'red', 'Red corner')}<div class="b-mid"><div class="vs">VS</div><div class="mono muted" style="font-size:18px;margin-top:6px">POOL ${fmt(v.pool)}</div></div>${head(v.b, 'blue', 'Blue corner')}</div>
        <div class="tug"><div class="l" style="width:${Math.max(8, Math.min(92, pct))}%">${v.pool ? pct + '%' : ''}</div><div class="r">${v.pool ? 100 - pct + '%' : ''}</div><div class="spark" style="left:${Math.max(8, Math.min(92, pct))}%"></div></div>
        <div class="b-lists">${list(v.a, 'red')}${list(v.b, 'blue')}</div>
        <div class="b-foot" style="${S.led.showQR ? 'padding-right:330px' : ''}">${fan(v.a, 'red')}${fan(v.b, 'blue')}</div>
      </div>${S.led.showQR ? qrCorner() : ''}`;
    },
    cheer(v) {
      const side = (s, cls, tag) => `<div class="ch-side ${cls}">
        <div class="corner-tag">${tag}</div><div class="tname">${esc(s.team?.name)}</div>
        <div class="ch-count">${fmt(s.cheer.total)}</div><div class="mono muted" style="font-size:20px;letter-spacing:.2em">CHEERS FROM ${fmt(s.cheer.fans)} FANS</div>
        <div class="ch-meter"><div style="width:${Math.round(s === v.a ? v.a.cheerShare * 100 : v.b.cheerShare * 100)}%"></div></div>
        <div class="topfans">${s.cheer.top.slice(0, 5).map((f, i) => `<div class="tf"><span>${i + 1}. ${esc(f.name)}</span><b>${fmt(f.count)}</b></div>`).join('') || '<div class="empty">Be the first to cheer</div>'}</div>
      </div>`;
      return `${top(v)}<div class="cheer">${side(v.a, 'red', 'Red corner')}
        <div class="ch-qr"><div class="qrbox anim rise"><img src="${qrSrc()}" alt="QR code"></div><div class="cta">SCAN.<br>TAP. <span style="color:var(--orange)">CHEER.</span></div><div class="url">${esc(S.settings.cheerUrl.replace(/^https?:\/\//, ''))}</div><div class="mono muted" style="font-size:16px;letter-spacing:.14em">TOP FANS GET THEIR NAME ON THIS WALL</div></div>
        ${side(v.b, 'blue', 'Blue corner')}</div>`;
    },
    winner(v) {
      if (v.m.status !== 'settled') return `${top(v)}<div class="center"><div class="msg anim rise">Result coming up</div><div class="idle-sub">${esc(v.a.team?.name)} vs ${esc(v.b.team?.name)}</div></div>`;
      const w = v.m.winner === v.a.team?.id ? v.a : v.b;
      const vipById = Object.fromEntries(S.vips.map((x) => [x.id, x]));
      const pays = (v.m.result?.payouts || []).slice(0, 4);
      const colors = ['#FFD60A', '#FF4D1A', '#22E5FF', '#C6FF3D', '#FF3B4E', '#2E8BFF'];
      const conf = Array.from({ length: 70 }, (_, i) => `<i style="left:${(i * 137) % 100}%;background:${colors[i % 6]};animation-duration:${3 + (i % 5) * 0.7}s;animation-delay:${(i % 10) * 0.35}s"></i>`).join('');
      if (!fxLayer.dataset.on) { fxLayer.innerHTML = `<div class="confetti">${conf}</div>`; fxLayer.dataset.on = '1'; }
      return `${top(v)}<div class="winner">
        <img class="anim" src="${photo(w.team)}" alt="">
        <div><div class="w-tag anim">WINNER</div><div class="tname" style="font-size:84px;margin-top:20px">${esc(w.team?.name)}</div>
        <div class="tbot" style="margin-top:14px">${esc(w.team?.botName)} · ${esc(v.m.label)}</div>
        <div class="payouts">${pays.length ? '<div class="mono muted" style="font-size:18px;letter-spacing:.2em;margin-top:10px">VIP PAYOUTS</div>' + pays.map((p) => `<div class="po"><span>${esc(vipById[p.vipId]?.name || 'VIP')}</span><span class="amt">+${fmt(p.payout)} ${esc(S.settings.coinName)}</span></div>`).join('') : '<div class="mono muted" style="font-size:20px">No VIP backed this team</div>'}</div></div>
      </div>`;
    },
    vipboard() {
      stage.classList.add('neutral');
      const rows = [...S.vips].sort((a, b) => b.coins - a.coins).slice(0, 10);
      return `${top(null)}<div class="board"><h2>VIP <span>LEADERBOARD</span></h2><div class="lb">${rows.map((v, i) => `<div class="lbr anim" style="animation-delay:${i * 50}ms"><span class="pos">${i + 1}</span><span class="nm">${esc(v.name)}<small>${esc(v.title)}</small></span><span class="val">${coinSvg(30)}${fmt(v.coins)}</span></div>`).join('')}</div></div>${S.led.showQR ? qrCorner() : ''}`;
    },
    fanboard() {
      stage.classList.add('neutral');
      const tn = Object.fromEntries(S.teams.map((t) => [t.id, t.name]));
      const rows = S.fans.slice(0, 10);
      return `${top(null)}<div class="board"><h2>TOP <span style="color:var(--orange)">FANS</span></h2><div class="lb">${rows.map((f, i) => `<div class="lbr anim" style="animation-delay:${i * 50}ms"><span class="pos">${i + 1}</span><span class="nm">${esc(f.name)}<small>${esc(tn[f.teamId] || '')}</small></span><span class="val" style="color:var(--cyan)">${fmt(f.points)}</span></div>`).join('') || '<div class="empty">No fans yet. Scan the code to start cheering.</div>'}</div></div>${S.led.showQR ? qrCorner() : ''}`;
    },
    lineup() {
      stage.classList.add('neutral');
      return `${top(null)}<div class="board"><h2>THE <span style="color:var(--cyan)">CONTENDERS</span></h2><div class="lineup">${S.teams.slice(0, 15).map((t, i) => `<div class="lu anim" style="animation-delay:${i * 40}ms"><img src="${photo(t)}" alt=""><div><b>${esc(t.name)}</b><span>${esc(t.botName)}</span></div></div>`).join('')}</div></div>`;
    },
  };

  function render() {
    if (!S) return;
    const tpl = S.led.template;
    const v = matchView(S, S.settings.liveMatchId);
    const needsMatch = ['faceoff', 'bets', 'cheer', 'winner'].includes(tpl);
    const key = `${tpl}|${S.settings.liveMatchId}|${v?.m.status}|${v?.m.winner}|${S.led.message}`;
    stage.classList.remove('neutral');
    stage.classList.toggle('still', key === lastKey);
    if (key !== lastKey) { fxLayer.innerHTML = ''; delete fxLayer.dataset.on; }
    lastKey = key;
    const html = needsMatch ? (v ? T[tpl](v) : noMatch()) : (T[tpl] || T.idle)();
    const full = hud + html;
    if (full !== lastHtml) { content.innerHTML = full; lastHtml = full; }
  }

  // A short banner whenever a VIP places a new bet.
  function checkFlash() {
    if (lastBetCount === null) { lastBetCount = S.bets.length; return; }
    if (S.bets.length > lastBetCount) {
      const b = S.bets[S.bets.length - 1];
      const v = S.vips.find((x) => x.id === b.vipId), t = S.teams.find((x) => x.id === b.teamId);
      flashLayer.innerHTML = `<div class="flash"><span class="tagx">NEW BET</span>${esc(v?.name)} backs ${esc(t?.name)} ${coin(b.amount, 30)}</div>`;
    }
    lastBetCount = S.bets.length;
  }

  connect({ role: 'led' }, (state) => { S = state; checkFlash(); render(); });
})();
