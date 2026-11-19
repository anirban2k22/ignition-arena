(() => {
  const { esc, fmt, coin, coinSvg, flame, photo, matchView, statusPill, toast, connect } = IA;
  const app = document.getElementById('app');
  const token = new URLSearchParams(location.search).get('t') || localStorage.getItem('ia_vip_token') || '';
  if (token) localStorage.setItem('ia_vip_token', token);

  let S = null, me = null, sig = '';
  const ui = { side: null, amount: 1000, tab: 'teams', busy: false };
  const CHIPS = [500, 1000, 2500, 5000];

  if (!token) { app.innerHTML = gate('This tablet has no VIP link yet.', 'Open the VIP link from the Admin panel on this tablet.'); return; }

  function gate(title, sub) {
    return `<div class="gate"><div>${flame(80)}<h1 class="display" style="font-size:28px;margin:20px 0 8px">${esc(title)}</h1><p class="muted">${esc(sub)}</p></div></div>`;
  }

  const { call } = connect(() => ({ role: 'vip', token }), (state) => {
    S = state;
    me = S.vips.find((v) => v.id === me?.id) || me;
    const s = JSON.stringify([S.matches, S.bets, S.vips, S.teams, S.settings]);
    if (s !== sig) { sig = s; render(); }
  }, (r) => {
    if (!r.ok) { app.innerHTML = gate('VIP link not recognised', r.error || ''); return; }
    me = { id: r.vipId };
  });

  function myBetOn(mid) {
    const bets = S.bets.filter((b) => b.matchId === mid && b.vipId === me.id);
    return bets.length ? { teamId: bets[0].teamId, amount: bets.reduce((s, b) => s + b.amount, 0) } : null;
  }

  function render() {
    if (!S || !me || !me.name) { me = S?.vips.find((v) => v.id === me?.id) || me; if (!me?.name) return; }
    const focusId = document.activeElement?.id;
    const cname = S.settings.coinName;
    const v = matchView(S, S.settings.liveMatchId);
    app.innerHTML = `<div class="wrap">
      <header>
        <div class="brand">${flame(42)}<div><b>${esc(S.settings.eventName.toUpperCase())}</b><span>VIP LOUNGE</span></div></div>
        <div class="me"><div class="who"><b>${esc(me.name)}</b><small>${esc(me.title || 'VIP')}</small></div>
          <div class="bal">${coinSvg(30)}<div><small>${esc(cname.toUpperCase())}</small><div class="n">${fmt(me.coins)}</div></div></div></div>
      </header>
      <div class="layout">
        <section>${v ? liveCard(v, cname) : `<div class="live"><div class="closed"><b>No live match yet.</b><br>The next fight will appear here as soon as the organisers set it.</div></div>`}</section>
        <section>
          <div class="tabs" role="tablist">
            ${[['teams', 'Teams'], ['bets', 'My bets'], ['board', 'Leaderboard'], ['fights', 'Fights']].map(([k, l]) => `<button role="tab" data-tab="${k}" class="${ui.tab === k ? 'on' : ''}">${l}</button>`).join('')}
          </div>
          ${tabBody()}
        </section>
      </div></div>`;
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); if (el.setSelectionRange) { const n = el.value.length; el.setSelectionRange(n, n); } } }
  }

  function liveCard(v, cname) {
    const mine = myBetOn(v.m.id);
    const open = v.m.status === 'open';
    if (mine) ui.side = mine.teamId;
    if (ui.side && ui.side !== v.a.team?.id && ui.side !== v.b.team?.id) ui.side = null;
    const tile = (s, cls, tag) => {
      const dis = mine && mine.teamId !== s.team?.id;
      return `<button class="side ${cls} ${ui.side === s.team?.id ? 'sel' : ''} ${dis ? 'dis' : ''}" data-side="${s.team?.id}" ${!open || dis ? 'aria-disabled="true"' : ''}>
        <span class="tag">${tag}</span>
        <span class="info" data-info="${s.team?.id}" aria-label="Team details"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg></span>
        <img src="${photo(s.team)}" alt="">
        <span class="body"><span class="nm" style="display:block">${esc(s.team?.name)}</span><span class="bot" style="display:block">${esc(s.team?.botName)} · ${esc(s.team?.weapon)}</span>
        <span class="stats">${coin(s.total, 16)}<span class="odds">${s.odds ? 'x' + s.odds.toFixed(2) + ' payout' : 'No backers yet'}</span></span></span>
      </button>`;
    };
    const pct = Math.round(v.a.share * 100);
    let slip;
    if (!open) {
      slip = `<div class="closed">${v.m.status === 'settled'
        ? `<b>Result:</b> ${esc((v.m.winner === v.a.team?.id ? v.a : v.b).team?.name)} won.${mine ? (mine.teamId === v.m.winner ? ` <span class="won">You won ${fmt((v.m.result?.payouts || []).find((p) => p.vipId === me.id)?.payout || 0)} ${esc(cname)}</span>` : ' <span class="lost">Your bet did not come through.</span>') : ''}`
        : v.m.status === 'locked' ? '<b>Betting is locked.</b> The fight is on. Watch the arena.' : '<b>Betting opens soon.</b> Have a look at the teams and pick your side.'}</div>`;
    } else {
      const sel = S.teams.find((t) => t.id === ui.side);
      const amt = Math.max(0, Math.floor(ui.amount || 0));
      const sideV = ui.side === v.a.team?.id ? v.a : ui.side === v.b.team?.id ? v.b : null;
      const other = sideV === v.a ? v.b : v.a;
      const est = sideV && amt ? amt + Math.floor((other.total * amt) / (sideV.total + amt)) : 0;
      slip = `<div class="slip">
        <div class="eyebrow">${mine ? `You backed ${esc(S.teams.find((t) => t.id === mine.teamId)?.name)} with ${fmt(mine.amount)}. Add more?` : sel ? `Backing ${esc(sel.name)}` : 'Tap a team to back it'}</div>
        <div class="chips">${CHIPS.map((c) => `<button class="chip ${amt === c ? 'on' : ''}" data-amt="${c}">${fmt(c)}</button>`).join('')}<button class="chip ${amt === me.coins && amt > 0 ? 'on' : ''}" data-amt="all">ALL IN</button></div>
        <div class="amt-row"><button class="btn" data-step="-500" aria-label="Less">-</button><input id="amt" class="input" inputmode="numeric" value="${amt || ''}" aria-label="Amount"><button class="btn" data-step="500" aria-label="More">+</button></div>
        <button class="btn fire go" id="place" ${!sel || !amt || amt > me.coins || ui.busy ? 'disabled' : ''}>${sel ? `Bet ${fmt(amt)} ${esc(cname)} on ${esc(sel.name)}` : 'Pick a team first'}</button>
        <div class="note">${sideV && amt ? `If ${esc(sel.name)} wins, you get back about <b class="coin">${fmt(est)}</b> at the current pool. Payouts move as other VIPs bet.` : 'Winners share the losing side\'s pool in proportion to their bets.'}</div>
      </div>`;
    }
    return `<div class="live">
      <div class="live-top"><div><div class="eyebrow">Live match</div><h2>${esc(v.m.label)}</h2></div>${statusPill(v.m.status)}</div>
      <div class="sides">${tile(v.a, 'red', 'RED')}<div class="vsx">VS</div>${tile(v.b, 'blue', 'BLUE')}</div>
      <div class="tug"><div style="width:${v.pool ? pct : 50}%"></div><div></div></div>
      <div class="mono muted" style="display:flex;justify-content:space-between;font-size:12px"><span>${v.a.backers.length} VIPs</span><span>POOL ${fmt(v.pool)}</span><span>${v.b.backers.length} VIPs</span></div>
      ${slip}
    </div>`;
  }

  function tabBody() {
    const tn = Object.fromEntries(S.teams.map((t) => [t.id, t]));
    if (ui.tab === 'teams') return `<div class="tgrid">${S.teams.map((t) => `<button class="tcard" data-info="${t.id}"><img src="${photo(t)}" alt=""><div><b>${esc(t.name)}</b><span>${esc(t.botName)}</span></div></button>`).join('')}</div>`;
    if (ui.tab === 'bets') {
      const per = {};
      for (const b of S.bets.filter((x) => x.vipId === me.id)) { per[b.matchId] ||= { teamId: b.teamId, amount: 0 }; per[b.matchId].amount += b.amount; }
      const rows = Object.entries(per).map(([mid, b]) => {
        const m = S.matches.find((x) => x.id === mid); if (!m) return '';
        let res = `<span class="muted mono" style="font-size:12px">${m.status === 'open' ? 'OPEN' : m.status === 'locked' ? 'FIGHT ON' : 'WAITING'}</span>`;
        if (m.status === 'settled') { const p = (m.result?.payouts || []).find((x) => x.vipId === me.id); res = p ? `<span class="won">+${fmt(p.payout)}</span>` : `<span class="lost">-${fmt(b.amount)}</span>`; }
        return `<div class="row"><div class="l"><b>${esc(tn[b.teamId]?.name)}</b><small>${esc(m.label)} · ${fmt(b.amount)} ${esc(S.settings.coinName)}</small></div>${res}</div>`;
      }).join('');
      return rows || '<div class="closed">No bets yet. Back a team in the live match.</div>';
    }
    if (ui.tab === 'board') {
      return [...S.vips].sort((a, b) => b.coins - a.coins).map((x, i) => `<div class="row ${x.id === me.id ? 'meh' : ''}"><div style="display:flex;align-items:center;gap:10px"><span class="pos">${i + 1}</span><div class="l"><b>${esc(x.name)}${x.id === me.id ? ' (you)' : ''}</b><small>${esc(x.title || '')}</small></div></div>${coin(x.coins, 16)}</div>`).join('');
    }
    return S.matches.map((m) => `<div class="row"><div class="l"><b>${esc(tn[m.teamA]?.name)} vs ${esc(tn[m.teamB]?.name)}</b><small>${esc(m.label)}${m.status === 'settled' ? ' · Winner: ' + esc(tn[m.winner]?.name) : ''}</small></div>${statusPill(m.status)}</div>`).join('') || '<div class="closed">No fights scheduled yet.</div>';
  }

  function teamSheet(id) {
    const t = S.teams.find((x) => x.id === id); if (!t) return;
    const back = document.createElement('div'); back.className = 'sheet-back';
    back.innerHTML = `<div class="sheet" role="dialog" aria-label="${esc(t.name)}"><img class="hero" src="${photo(t)}" alt=""><div class="in">
      <div class="eyebrow">${esc(t.college || '')}</div><h2 class="display" style="margin:6px 0 4px;font-size:26px">${esc(t.name)}</h2>
      <div class="mono" style="color:var(--cyan);letter-spacing:.14em">${esc((t.botName || '').toUpperCase())}</div>
      <div class="kv"><div><small>Weapon</small>${esc(t.weapon || '-')}</div><div><small>Weight</small>${esc(t.weight || '-')}</div><div><small>Record</small>${record(t.id)}</div></div>
      <p style="line-height:1.6;color:var(--text2);margin:0 0 18px">${esc(t.description || '')}</p>
      <button class="btn" style="width:100%" data-close>Close</button></div></div>`;
    back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('[data-close]')) back.remove(); });
    document.body.appendChild(back);
  }
  function record(id) {
    const ms = S.matches.filter((m) => m.status === 'settled' && (m.teamA === id || m.teamB === id));
    const w = ms.filter((m) => m.winner === id).length;
    return `${w}W - ${ms.length - w}L`;
  }

  app.addEventListener('click', async (e) => {
    const info = e.target.closest('[data-info]');
    if (info) { e.stopPropagation(); return teamSheet(info.dataset.info); }
    const tab = e.target.closest('[data-tab]'); if (tab) { ui.tab = tab.dataset.tab; return render(); }
    const side = e.target.closest('[data-side]');
    if (side && side.getAttribute('aria-disabled') !== 'true') { ui.side = side.dataset.side; return render(); }
    const chip = e.target.closest('[data-amt]');
    if (chip) { ui.amount = chip.dataset.amt === 'all' ? me.coins : Number(chip.dataset.amt); return render(); }
    const step = e.target.closest('[data-step]');
    if (step) { ui.amount = Math.max(0, Math.min(me.coins, (ui.amount || 0) + Number(step.dataset.step))); return render(); }
    if (e.target.closest('#place')) {
      const v = matchView(S, S.settings.liveMatchId); if (!v) return;
      ui.busy = true; render();
      const r = await call('vip:bet', { matchId: v.m.id, teamId: ui.side, amount: ui.amount });
      ui.busy = false;
      if (r.ok) { toast(`Bet placed. ${fmt(r.coins)} ${S.settings.coinName} left.`, 'ok'); if (navigator.vibrate) navigator.vibrate(30); }
      else toast(r.error, 'err');
      render();
    }
  });
  app.addEventListener('input', (e) => {
    if (e.target.id === 'amt') { ui.amount = Number(e.target.value.replace(/\D/g, '')) || 0; e.target.value = ui.amount || ''; const btn = document.getElementById('place'); render(); }
  });
})();
