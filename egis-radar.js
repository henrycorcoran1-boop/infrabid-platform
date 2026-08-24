/* ============================================================
   Egis Ireland Project Radar.

   Reads the register, the evidence behind it, and the daily
   mention feed from Supabase. Everything here is read-only
   except the user's own digest subscription — the register is
   written by the egis-radar edge function under the service
   role, never from the browser.
   ============================================================ */
(function(){
  "use strict";

  var FN = (window.SUPABASE_URL || '') + '/functions/v1/egis-radar';

  var esc = function(s){ var d=document.createElement('div'); d.textContent = (s==null?'':String(s)); return d.innerHTML; };

  // Values are published inconsistently — some schemes quote capex, some quote
  // a fee. The unit is kept next to the number in value_note so the two are
  // never silently added together.
  function money(n){
    if(n == null || isNaN(n)) return null;
    n = Number(n);
    if(n >= 1e9) return '€' + (n/1e9).toFixed(n >= 1e10 ? 0 : 1) + 'bn';
    if(n >= 1e6) return '€' + (n/1e6).toFixed(n >= 1e7 ? 0 : 1) + 'm';
    if(n >= 1e3) return '€' + Math.round(n/1e3) + 'k';
    return '€' + n.toLocaleString('en-IE');
  }

  var INV_LABEL = { confirmed:'Egis engaged', market_map:'Market map', opportunity:'Pipeline' };

  var state = { projects:[], feed:[], inv:'all', mode:'all', q:'', sort:'rank', sub:null, status:null };
  var sb = null;

  var $ = function(id){ return document.getElementById(id); };

  /* ------------------------------------------------------------- loading */

  async function load(){
    sb = window.InfraBidAuth.getClient();

    var pr = await sb.from('egis_projects')
      .select('*, egis_project_sources(*)')
      .eq('is_live', true)
      .order('sort_rank', { ascending:true })
      .order('name', { ascending:true });
    if(pr.error){ console.error('Egis radar: projects', pr.error); }
    state.projects = pr.data || [];

    var fd = await sb.from('egis_feed_items')
      .select('title,url,publisher,source_type,published_on,ireland_related,summary')
      .eq('mentions_egis', true)
      .order('ireland_related', { ascending:false })
      .order('published_on', { ascending:false, nullsFirst:false })
      .limit(40);
    if(fd.error){ console.error('Egis radar: feed', fd.error); }
    state.feed = fd.data || [];

    var sess = await window.InfraBidAuth.getSession();
    if(sess && sess.user && sess.user.id){
      var sub = await sb.from('egis_watch_subscriptions').select('*').eq('user_id', sess.user.id).maybeSingle();
      state.sub = sub.data || null;
    }

    await loadStatus();
    buildModeFilter();
    renderAll();
  }

  async function callFn(mode){
    var sess = await window.InfraBidAuth.getSession();
    if(!sess) return { error:'Not signed in' };
    var res = await fetch(FN, {
      method:'POST',
      headers:{
        'content-type':'application/json',
        'authorization':'Bearer ' + sess.access_token,
        'apikey': window.SUPABASE_ANON_KEY || ''
      },
      body: JSON.stringify({ mode: mode })
    });
    return await res.json().catch(function(){ return { error:'Bad response' }; });
  }

  async function loadStatus(){
    try{ state.status = await callFn('status'); }
    catch(e){ state.status = { error:String(e) }; }
  }

  /* ------------------------------------------------------------ rendering */

  function renderStatus(){
    var s = state.status || {};
    var facts = $('rs-facts');
    if(s.error){ facts.innerHTML = '<span class="rs-fact">Radar status unavailable.</span>'; return; }

    var on = !!s.emailConfigured;
    var subscribed = state.sub && state.sub.active;
    var last = s.lastRun && s.lastRun.ran_at
      ? new Date(s.lastRun.ran_at).toLocaleString('en-IE',{ day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })
      : 'not yet run';

    facts.innerHTML =
      '<span class="rs-fact"><span class="rs-dot ' + (on?'on':'off') + '"></span>' +
        (on ? 'Email delivery live' : 'Email delivery off') + '</span>' +
      '<span class="rs-fact">Daily brief: <b>' + (subscribed ? '07:00 Dublin' : 'off') + '</b></span>' +
      '<span class="rs-fact">Last sweep: <b>' + esc(last) + '</b></span>' +
      '<span class="rs-fact">Queued: <b>' + (s.unsentMentions || 0) + '</b></span>';

    $('btn-subscribe').textContent = subscribed ? 'Turn brief off' : 'Turn brief on';
  }

  function renderKpis(){
    var confirmed = state.projects.filter(function(p){ return p.involvement === 'confirmed'; });
    $('kpi-confirmed').textContent = confirmed.length;
    $('kpi-tracked').textContent = state.projects.length;

    var total = state.projects.reduce(function(a,p){ return a + (Number(p.value_eur) || 0); }, 0);
    $('kpi-value').textContent = total > 0 ? money(total) : '—';

    var cutoff = new Date(Date.now() - 30*24*3600*1000).toISOString().slice(0,10);
    var recent = state.feed.filter(function(f){ return f.ireland_related && f.published_on && f.published_on >= cutoff; });
    $('kpi-mentions').textContent = recent.length;
  }

  function buildModeFilter(){
    var sel = $('mode-filter');
    var modes = {};
    state.projects.forEach(function(p){ if(p.mode) modes[p.mode] = 1; });
    Object.keys(modes).sort().forEach(function(m){
      var o = document.createElement('option');
      o.value = m; o.textContent = m;
      sel.appendChild(o);
    });
  }

  function visible(){
    var q = state.q.trim().toLowerCase();
    var list = state.projects.filter(function(p){
      if(state.inv !== 'all' && p.involvement !== state.inv) return false;
      if(state.mode !== 'all' && p.mode !== state.mode) return false;
      if(!q) return true;
      var hay = [p.name,p.client,p.county,p.region,p.status,p.egis_role,p.egis_entity,p.partners,p.mode,p.why_it_matters]
        .filter(Boolean).join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    });

    list.sort(function(a,b){
      if(state.sort === 'value') return (Number(b.value_eur)||0) - (Number(a.value_eur)||0);
      if(state.sort === 'name')  return String(a.name).localeCompare(String(b.name));
      if(state.sort === 'verified') return String(b.last_verified||'').localeCompare(String(a.last_verified||''));
      // Relevance: Egis-engaged first, then confidence, then the curated rank.
      var order = { confirmed:0, market_map:1, opportunity:2 };
      var d = (order[a.involvement]||9) - (order[b.involvement]||9);
      if(d) return d;
      var conf = { HIGH:0, MEDIUM:1, LOW:2 };
      d = (conf[a.confidence]||9) - (conf[b.confidence]||9);
      if(d) return d;
      return (a.sort_rank||100) - (b.sort_rank||100);
    });
    return list;
  }

  function card(p){
    var srcs = p.egis_project_sources || [];
    var val = money(p.value_eur);
    return '<button class="proj-card" data-slug="' + esc(p.slug) + '" type="button">' +
      '<div class="pc-top">' +
        '<h3>' + esc(p.name) + '</h3>' +
        '<span class="inv-badge inv-' + esc(p.involvement) + '">' + esc(INV_LABEL[p.involvement] || p.involvement) + '</span>' +
      '</div>' +
      '<div class="pc-client">' + esc(p.client || 'Client not stated') + (p.county ? ' · ' + esc(p.county) : '') + '</div>' +
      (p.egis_role ? '<div class="pc-role">' + esc(p.egis_role) + '</div>' : '') +
      (p.status ? '<div class="pc-client">' + esc(p.status) + '</div>' : '') +
      '<div class="pc-meta">' +
        (p.mode ? '<span class="pc-tag">' + esc(p.mode) + '</span>' : '') +
        (val ? '<span class="pc-tag val">' + val + '</span>' : '') +
        '<span class="conf-badge conf-' + esc(p.confidence) + '">' + esc(p.confidence) + '</span>' +
        '<span class="pc-srccount">' + srcs.length + ' source' + (srcs.length === 1 ? '' : 's') + '</span>' +
      '</div>' +
    '</button>';
  }

  function renderGrid(){
    var list = visible();
    var grid = $('proj-grid'), empty = $('proj-empty');
    $('radar-count').textContent = list.length + ' of ' + state.projects.length + ' schemes';

    if(!state.projects.length){
      grid.innerHTML = '';
      empty.style.display = 'block';
      empty.textContent = 'The register is empty. The daily sweep is running — verified schemes appear here once seeded.';
      return;
    }
    if(!list.length){
      grid.innerHTML = '';
      empty.style.display = 'block';
      empty.textContent = 'No schemes match those filters.';
      return;
    }
    empty.style.display = 'none';
    grid.innerHTML = list.map(card).join('');
    grid.querySelectorAll('.proj-card').forEach(function(el){
      el.addEventListener('click', function(){ openDrawer(el.getAttribute('data-slug')); });
    });
  }

  function row(label, value){
    if(!value) return '';
    return '<div class="d-row"><dt>' + esc(label) + '</dt><dd>' + esc(value) + '</dd></div>';
  }

  function openDrawer(slug){
    var p = state.projects.filter(function(x){ return x.slug === slug; })[0];
    if(!p) return;
    var srcs = (p.egis_project_sources || []).slice().sort(function(a,b){
      return (b.is_primary ? 1:0) - (a.is_primary ? 1:0);
    });

    var html =
      '<span class="inv-badge inv-' + esc(p.involvement) + '">' + esc(INV_LABEL[p.involvement] || p.involvement) + '</span>' +
      '<h2 id="drawer-title">' + esc(p.name) + '</h2>' +
      '<div class="d-client">' + esc(p.client || 'Client not stated') + '</div>' +
      '<div class="d-badges">' +
        '<span class="conf-badge conf-' + esc(p.confidence) + '">Confidence: ' + esc(p.confidence) + '</span>' +
        (p.mode ? '<span class="pc-tag">' + esc(p.mode) + '</span>' : '') +
        (money(p.value_eur) ? '<span class="pc-tag val">' + money(p.value_eur) + '</span>' : '') +
      '</div>' +
      '<dl style="margin:0">' +
        row('Egis role', p.egis_role) +
        row('Egis entity', p.egis_entity) +
        row('Status', p.status) +
        row('Phase', p.scheme_phase) +
        row('Location', [p.county, p.region].filter(Boolean).join(' · ')) +
        row('Value', money(p.value_eur) ? (money(p.value_eur) + (p.value_note ? ' — ' + p.value_note : '')) : p.value_note) +
        row('Partners', p.partners) +
        row('Key dates', p.key_dates) +
        row('Why it matters', p.why_it_matters) +
        row('Last verified', p.last_verified) +
      '</dl>';

    if(p.verbatim_quote){
      html += '<div class="d-quote">“' + esc(p.verbatim_quote) + '”<span>Quoted from the source below.</span></div>';
    }

    html += '<div class="d-sources"><h4>Evidence · ' + srcs.length + '</h4>';
    if(!srcs.length){
      html += '<p style="font-size:13.5px;color:var(--muted)">No source recorded yet. Treat this entry as unverified.</p>';
    } else {
      html += srcs.map(function(s){
        return '<a class="src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' +
          '<div class="sl-title">' +
            '<span class="src-type ' + esc(s.source_type) + '">' + esc(s.source_type) + '</span>' +
            esc(s.title || s.url) +
          '</div>' +
          '<div class="sl-meta">' + esc([s.publisher, s.published_on].filter(Boolean).join(' · ')) + '<br>' + esc(s.url) + '</div>' +
        '</a>';
      }).join('');
    }
    html += '</div>';

    $('drawer-body').innerHTML = html;
    $('drawer').classList.add('open');
    $('drawer-veil').classList.add('open');
    $('drawer').focus();
  }

  function closeDrawer(){
    $('drawer').classList.remove('open');
    $('drawer-veil').classList.remove('open');
  }

  function renderFeed(){
    var list = $('feed-list');
    if(!state.feed.length){
      list.innerHTML = '<p style="color:var(--text-sub);padding:16px 0">No mentions harvested yet.</p>';
      return;
    }
    list.innerHTML = state.feed.map(function(f){
      return '<a class="feed-item" href="' + esc(f.url) + '" target="_blank" rel="noopener noreferrer">' +
        '<div class="fi-title">' + esc(f.title) + '</div>' +
        '<div class="fi-meta">' +
          '<span class="fi-pill ' + esc(f.source_type) + '">' + esc(f.source_type) + '</span>' +
          (f.ireland_related ? '<span class="fi-pill ie">Ireland</span>' : '') +
          (f.publisher ? '<span>' + esc(f.publisher) + '</span>' : '') +
          (f.published_on ? '<span>' + esc(f.published_on) + '</span>' : '') +
        '</div>' +
      '</a>';
    }).join('');
  }

  function renderAll(){ renderStatus(); renderKpis(); renderGrid(); renderFeed(); }

  /* --------------------------------------------------------------- events */

  function wire(){
    $('inv-chips').addEventListener('click', function(e){
      var b = e.target.closest('.fchip'); if(!b) return;
      $('inv-chips').querySelectorAll('.fchip').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      state.inv = b.getAttribute('data-inv');
      renderGrid();
    });

    $('radar-search').addEventListener('input', function(e){ state.q = e.target.value; renderGrid(); });
    $('mode-filter').addEventListener('change', function(e){ state.mode = e.target.value; renderGrid(); });
    $('sort-by').addEventListener('change', function(e){ state.sort = e.target.value; renderGrid(); });

    $('drawer-close').addEventListener('click', closeDrawer);
    $('drawer-veil').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeDrawer(); });

    $('btn-subscribe').addEventListener('click', async function(){
      var btn = this; btn.disabled = true;
      try{
        var sess = await window.InfraBidAuth.getSession();
        if(!sess) return;
        var next = !(state.sub && state.sub.active);
        var payload = {
          user_id: sess.user.id,
          email: sess.user.email,
          active: next,
          include_egis_mentions: true,
          send_hour_dublin: 7
        };
        var res = await sb.from('egis_watch_subscriptions').upsert(payload, { onConflict:'user_id' }).select().maybeSingle();
        if(res.error){ alert('Could not save that: ' + res.error.message); return; }
        state.sub = res.data || payload;
        renderStatus();
      } finally { btn.disabled = false; }
    });

    $('btn-sendnow').addEventListener('click', async function(){
      var btn = this, label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Sending…';
      try{
        var r = await callFn('test');
        if(r && r.error) alert(r.error);
        else if(r && r.sent) alert('Sent ' + r.items + ' item' + (r.items===1?'':'s') + ' to your inbox.');
        else alert(r && r.note ? r.note : 'Nothing new to send — the queue is empty.');
        await loadStatus(); renderStatus();
      } finally { btn.disabled = false; btn.textContent = label; }
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    if(!$('proj-grid')) return;
    window.InfraBidAuth.requireAuth().then(function(session){
      if(!session) return;
      wire();
      load().catch(function(e){ console.error('Egis radar: load failed', e); });
    });
  });
})();
