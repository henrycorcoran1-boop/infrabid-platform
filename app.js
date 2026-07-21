(function(){
  "use strict";
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var euro = function(n){ return '€' + n.toLocaleString('en-IE',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var euro0 = function(n){ return '€' + Math.round(n).toLocaleString('en-IE'); };
  var escHtml = function(s){ var d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; };

  var nav = document.getElementById('nav'), prog = document.getElementById('progress'), totop = document.getElementById('totop');
  function onScroll(){
    var st = window.pageYOffset, h = document.documentElement.scrollHeight - window.innerHeight;
    prog.style.width = (h>0 ? (st/h*100):0) + '%';
    nav.classList.toggle('scrolled', st > 40);
    totop.classList.toggle('show', st > 600);
  }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
  totop.addEventListener('click', function(){ window.scrollTo({top:0,behavior:reduce?'auto':'smooth'}); });

  var mb = document.getElementById('menu-btn'), mm = document.getElementById('mobile-menu');
  mb.addEventListener('click', function(){
    var open = mm.style.display === 'block';
    mm.style.display = open ? 'none' : 'block';
    mb.setAttribute('aria-expanded', String(!open));
  });
  mm.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ mm.style.display='none'; mb.setAttribute('aria-expanded','false'); }); });

  (function(){ var path=(location.pathname.split('/').pop()||'index.html');
    document.querySelectorAll('.nav-links a, #mobile-menu a').forEach(function(a){
      if(a.getAttribute('href')===path) a.classList.add('active'); }); })();

  var revs = document.querySelectorAll('.reveal');
  if(reduce || !('IntersectionObserver' in window)){ revs.forEach(function(r){r.classList.add('in');}); }
  else {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){
        var sibs = Array.prototype.slice.call(e.target.parentNode.children).filter(function(c){return c.classList.contains('reveal');});
        var i = sibs.indexOf(e.target);
        e.target.style.transitionDelay = (i>0 ? Math.min(i,5)*90 : 0) + 'ms';
        e.target.classList.add('in'); io.unobserve(e.target);
        if(e.target.querySelector('.track i')) e.target.querySelectorAll('.track i').forEach(function(b){ b.style.width=b.getAttribute('data-w'); });
      }});
    },{threshold:.14, rootMargin:'0px 0px -40px 0px'});
    revs.forEach(function(r){ io.observe(r); });
  }
  if(reduce){ document.querySelectorAll('.track i').forEach(function(i){ i.style.width=i.getAttribute('data-w'); }); }

  /* ---------- scroll-linked progressive text reveal ---------- */
  (function(){
    var blocks = document.querySelectorAll('.scroll-reveal-text');
    if(!blocks.length) return;
    var words = [];
    blocks.forEach(function(el){
      var text = el.textContent, parts = text.split(/(\s+)/);
      el.innerHTML = parts.map(function(p){
        return /\S/.test(p) ? '<span class="wrd">'+p+'</span>' : p;
      }).join('');
      words = words.concat(Array.prototype.slice.call(el.querySelectorAll('.wrd')));
    });
    if(reduce){ words.forEach(function(w){ w.classList.add('on'); }); return; }

    var ticking = false;
    function update(){
      ticking = false;
      var line = window.innerHeight*0.78;
      words.forEach(function(w){
        var top = w.getBoundingClientRect().top;
        w.classList.toggle('on', top < line);
      });
    }
    function onScroll(){ if(!ticking){ requestAnimationFrame(update); ticking = true; } }
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll, {passive:true});
    update();
  })();

  var cio = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ countUp(e.target); cio.unobserve(e.target); } });
  },{threshold:.5});
  document.querySelectorAll('[data-count]').forEach(function(c){ cio.observe(c); });
  function countUp(el){
    var target = parseFloat(el.getAttribute('data-count')),
        dec = parseInt(el.getAttribute('data-dec')||'0',10),
        pre = el.getAttribute('data-prefix')||'', suf = el.getAttribute('data-suffix')||'';
    var fmt = function(v){ return pre + (dec? v.toFixed(dec) : Math.round(v).toLocaleString('en-IE')) + suf; };
    if(reduce){ el.textContent = fmt(target); return; }
    var dur=1500, t0=null;
    requestAnimationFrame(function step(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/dur,1), e=1-Math.pow(1-p,3);
      el.textContent = fmt(target*e); if(p<1) requestAnimationFrame(step); else el.textContent = fmt(target); });
  }

  (function(){
    var wrap = document.getElementById('hero-bars');
    if(wrap){ [42,68,55,80,48,72,60,88,52,76,64,92].forEach(function(h,i){
      var b=document.createElement('div'); b.className='bar'; b.style.height=h+'%';
      b.style.animationDelay=(i*70)+'ms'; wrap.appendChild(b); }); }
    var total = document.getElementById('hero-total'), base = 17750;
    if(total){
      if(reduce){ total.textContent = euro0(base); }
      else {
        var t0=null;
        requestAnimationFrame(function run(ts){ if(!t0)t0=ts; var p=Math.min((ts-t0)/1700,1), e=1-Math.pow(1-p,3);
          total.textContent = euro0(base*e);
          if(p<1) requestAnimationFrame(run);
          else { total.textContent = euro0(base);
            setInterval(function(){ total.textContent = euro0(base + Math.round((Math.random()-.5)*120)); }, 2600); }
        });
      }
    }
  })();

  (function(){
    var items = [['Readymix C30','€124.50/m³'],['C24 Timber 4.8m','€18.40'],['Rebar T12','€0.96/kg'],
      ['Block 100mm','€1.18'],['OSB3 18mm','€27.90'],['Insulation PIR','€34.10'],
      ['Plasterboard','€9.85'],['Cement 25kg','€7.40'],['Aggregate','€32.00/t'],['Excavator/day','€195.00']];
    var track = document.getElementById('ticker'); if(!track) return;
    var html='';
    for(var r=0;r<2;r++){ items.forEach(function(it){ var up=Math.random()>.5;
      html += '<span class="tick"><span class="nm">'+it[0]+'</span><span class="pr">'+it[1]+'</span>'+
              '<span class="'+(up?'up':'dn')+'">'+(up?'▲':'▼')+' '+(Math.random()*1.8).toFixed(1)+'%</span></span>'; }); }
    track.innerHTML = html;
    if(reduce) track.style.animation='none';
  })();

  (function(){
    var data = [
      ['Chadwicks',"Ireland's premier builder's merchant network supplying structural materials nationwide.",'https://www.chadwicks.ie'],
      ['Brooks Timber','High-specification structural timber distribution chains and building accessories.','https://www.brooks.ie'],
      ['Heiton Buckley','Commercial supplies, plumbing systems, and civil infrastructure lines.','https://www.heitonbuckley.ie'],
      ['Murdock’s','Regional supplier of architectural roofing arrays and foundation products.','https://murdockbuildersmerchants.com'],
      ['Roadstone','National producer of aggregates, readymix concrete and asphalt.','https://www.roadstone.ie'],
      ['Dakota','Specialist distributor of insulation and dry-lining systems.','https://www.dakota.ie']
    ];
    var track = document.getElementById('supp-track'); if(!track) return;
    function card(d){ return '<a class="supp" href="'+d[2]+'" target="_blank" rel="noopener noreferrer">'+
      '<div class="h"><span class="nm">'+d[0]+'</span><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></div>'+
      '<p>'+d[1]+'</p></a>'; }
    var html=''; for(var k=0;k<2;k++){ data.forEach(function(d){ html+=card(d); }); }
    track.innerHTML = html;
    if(reduce) track.style.animation='none';
  })();

  if(!reduce && window.matchMedia('(pointer:fine)').matches){
    document.querySelectorAll('.card, .panel[data-tilt]').forEach(function(c){
      var spot = c.querySelector('.spot');
      c.addEventListener('pointermove', function(e){
        var r = c.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
        if(spot){ spot.style.setProperty('--mx', x+'px'); spot.style.setProperty('--my', y+'px'); }
        var rx = ((y/r.height)-.5)*-5, ry = ((x/r.width)-.5)*5;
        c.style.transform = 'perspective(900px) rotateX('+rx+'deg) rotateY('+ry+'deg)';
      });
      c.addEventListener('pointerleave', function(){ c.style.transform=''; });
    });
    document.querySelectorAll('[data-magnetic]').forEach(function(b){
      b.addEventListener('pointermove', function(e){ var r=b.getBoundingClientRect();
        b.style.transform='translate('+((e.clientX-r.left-r.width/2)*.22)+'px,'+((e.clientY-r.top-r.height/2)*.32)+'px)'; });
      b.addEventListener('pointerleave', function(){ b.style.transform=''; });
    });
  }

  var REGION_MULT = {leinster:1.00, munster:0.96, connacht:0.90, ulster:0.93};
  var REGION_LABEL = {leinster:'Leinster', munster:'Munster', connacht:'Connacht', ulster:'Ulster (ROI)'};
  var STRUCT_LABEL = {timber:'Timber Frame', masonry:'Masonry Cavity', steel:'Steel Frame', rc:'RC Frame'};
  var STRUCT_TIMBER_FACTOR = {timber:0.065, masonry:0.022, steel:0.018, rc:0.015};
  var STRUCT_CARPENTRY_HRS_M2 = {timber:1.4, masonry:0.6, steel:0.55, rc:0.5};
  var lastLedger = null;
  var cecaExtraItems = []; // line items added from the CECA-style rate library (valuation.html)

  function processValuation(){
    var $ = function(id){ return document.getElementById(id); };
    var standby=$('panel-standby'), loading=$('panel-loading'), results=$('panel-results'),
        footer=$('panel-footer'), badge=$('status-badge'), loadText=$('loading-text'), btn=$('calc-btn');
    standby.style.display='none'; results.style.display='none'; footer.style.display='none';
    loading.style.display='block'; btn.disabled=true;
    badge.textContent='Computing'; badge.style.color='var(--navy)';
    var v=function(id){ return parseFloat($(id).value)||0; };
    var sv=function(id){ return $(id).value; };
    var compute=function(){
      var gia=Math.max(v('spec-area'),1), storeys=Math.max(v('spec-storeys'),1),
          structure=sv('spec-structure'), region=sv('spec-region'),
          footprint=gia/storeys, mult=REGION_MULT[region]||1;

      var concreteVol=footprint*0.20,
          concreteCost=concreteVol*v('rate-concrete')*mult;

      var timberVol=gia*(STRUCT_TIMBER_FACTOR[structure]||0.02),
          timberCost=timberVol*v('rate-timber')*mult;

      var carpentryHrs=gia*(STRUCT_CARPENTRY_HRS_M2[structure]||0.6),
          generalHrs=gia*1.2,
          labor=(carpentryHrs*v('rate-carpenter'))+(generalHrs*v('rate-labourer'));

      var diggerDays=Math.max(Math.ceil(footprint/110),2),
          skipUnits=Math.max(Math.ceil(gia/140),2),
          plant=(diggerDays*v('rate-digger'))+(skipUnits*v('rate-skip'));

      var extraRows=cecaExtraItems.map(function(it){
        return [it.description, it.qty+' '+it.unit+' @ '+euro(it.rate), it.qty*it.rate];
      });
      var extraTotal=cecaExtraItems.reduce(function(a,it){ return a+(it.qty*it.rate); },0);

      var sub=concreteCost+timberCost+labor+plant+extraTotal,
          total=sub*(1+((v('rate-markup')+v('rate-contingency'))/100)),
          margin=total-sub;

      $('ledger-title').textContent=(REGION_LABEL[region]||region)+' Quantity Matrix';
      $('val-sub-desc').textContent=concreteVol.toFixed(1)+'m³ Readymix Volume';
      $('val-timber-desc').textContent=timberVol.toFixed(1)+'m³ '+(STRUCT_LABEL[structure]||'')+' · C24 Sawn';
      $('val-labor-desc').textContent=(carpentryHrs+generalHrs).toFixed(0)+' labour hrs · Aggregated Allocation';
      $('val-plant-desc').textContent=diggerDays+' Excavator days · '+skipUnits+' Skip units';
      $('val-sub').textContent=euro(concreteCost); $('val-timber').textContent=euro(timberCost);
      $('val-labor').textContent=euro(labor); $('val-plant').textContent=euro(plant);
      $('val-total').textContent=euro(total); $('val-margin-calc').textContent=euro(margin);

      var extraRowsEl=$('val-ceca-extra-rows');
      if(extraRowsEl){
        extraRowsEl.innerHTML=cecaExtraItems.map(function(it){
          return '<div class="lrow"><div class="d"><b>'+escHtml(it.description)+'</b><span>'+it.qty+' '+escHtml(it.unit)+' @ '+euro(it.rate)+'</span></div><span class="v">'+euro(it.qty*it.rate)+'</span></div>';
        }).join('');
      }

      lastLedger={
        region:REGION_LABEL[region]||region, structure:STRUCT_LABEL[structure]||structure,
        gia:gia, storeys:storeys,
        rows:[
          ['Concrete Substructure', concreteVol.toFixed(1)+'m³ Readymix Volume', concreteCost],
          ['Roof Framing Timber', timberVol.toFixed(1)+'m³ C24 Certified Sawn', timberCost],
          ['Site Production Labour', (carpentryHrs+generalHrs).toFixed(0)+' labour hrs', labor],
          ['Support Logistics', diggerDays+' excavator days, '+skipUnits+' skip units', plant]
        ].concat(extraRows),
        subtotal:sub, markupPct:v('rate-markup'), contingencyPct:v('rate-contingency'),
        total:total, margin:margin
      };

      loading.style.display='none'; results.style.display='block'; footer.style.display='block';
      btn.disabled=false; badge.textContent='Verified'; badge.style.color='var(--navy)';
    };
    if(reduce){ compute(); return; }
    setTimeout(function(){ loadText.textContent='Cross-referencing '+(REGION_LABEL[sv('spec-region')]||'regional')+' trade indexes…'; }, 950);
    setTimeout(compute, 2100);
  }
  var _cb=document.getElementById('calc-btn'); if(_cb) _cb.addEventListener('click', processValuation);

  function downloadBlob(filename, content, type){
    var blob=new Blob([content], {type:type}), url=URL.createObjectURL(blob),
        a=document.createElement('a');
    a.href=url; a.download=filename; document.body.appendChild(a); a.click();
    document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }

  var _exp=document.getElementById('export-btn');
  if(_exp) _exp.addEventListener('click', function(){
    if(!lastLedger){ return; }
    var L=lastLedger, lines=['Item,Description,Cost (EUR)'];
    L.rows.forEach(function(r){ lines.push('"'+r[0]+'","'+r[1]+'",'+r[2].toFixed(2)); });
    lines.push('Subtotal,,'+L.subtotal.toFixed(2));
    lines.push('Markup %,,'+L.markupPct);
    lines.push('Contingency %,,'+L.contingencyPct);
    lines.push('Definitive Tender Estimate,,'+L.total.toFixed(2));
    lines.push('Margin Pool,,'+L.margin.toFixed(2));
    downloadBlob('InfraBid_Ledger_'+L.region.replace(/\s+/g,'')+'.csv', lines.join('\n'), 'text/csv;charset=utf-8');
  });

  var _dos=document.getElementById('dossier-btn');
  if(_dos) _dos.addEventListener('click', function(){
    if(!lastLedger){ return; }
    var L=lastLedger, rowsHtml=L.rows.map(function(r){
      return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td class="num">'+euro(r[2])+'</td></tr>';
    }).join('');
    var w=window.open('', '_blank');
    w.document.write('<!doctype html><html><head><title>InfraBid Dossier — '+L.region+'</title><meta charset="utf-8">'+
      '<style>body{font-family:Arial,Helvetica,sans-serif;color:#0A0A0A;padding:48px;max-width:760px;margin:0 auto}'+
      'h1{font-size:22px;margin-bottom:4px}p.sub{color:#5C5652;margin-bottom:28px}'+
      'table{width:100%;border-collapse:collapse;margin-bottom:24px}'+
      'th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #DCD5D2;font-size:13px}'+
      'th{color:#8A8380;text-transform:uppercase;font-size:10px;letter-spacing:.08em}'+
      'td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}'+
      '.totals td{font-weight:700;border-top:2px solid #0A0A0A;border-bottom:none}'+
      '</style></head><body>'+
      '<h1>InfraBid — Definitive Tender Dossier</h1>'+
      '<p class="sub">'+L.region+' Quantity Matrix · '+L.structure+' · '+L.gia+'m² GIA · '+L.storeys+' storey(s)</p>'+
      '<table><thead><tr><th>Item</th><th>Description</th><th class="num">Cost</th></tr></thead><tbody>'+
      rowsHtml+
      '<tr><td>Subtotal</td><td></td><td class="num">'+euro(L.subtotal)+'</td></tr>'+
      '<tr><td>Markup + Contingency</td><td>'+L.markupPct+'% + '+L.contingencyPct+'%</td><td class="num"></td></tr>'+
      '<tr class="totals"><td>Definitive Tender Estimate</td><td></td><td class="num">'+euro(L.total)+'</td></tr>'+
      '<tr class="totals"><td>Margin Pool</td><td></td><td class="num">'+euro(L.margin)+'</td></tr>'+
      '</tbody></table>'+
      '<p style="color:#8A8380;font-size:11px">Generated by InfraBid · '+new Date().toLocaleString('en-IE')+'</p>'+
      '</body></html>');
    w.document.close();
    w.focus();
    setTimeout(function(){ w.print(); }, 350);
  });

  /* ---------- persist valuations to Supabase (valuation.html) ---------- */
  (function(){
    var saveBtn = document.getElementById('save-valuation-btn');
    var listBody = document.getElementById('saved-valuations-body');
    if(!saveBtn || !listBody) return;
    var $=function(id){ return document.getElementById(id); };
    var v=function(id){ return parseFloat($(id).value)||0; };
    var sb=null;

    function euroFull(n){ return '€'+Math.round(n||0).toLocaleString('en-IE'); }
    function esc(s){ var d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

    function currentInputs(){
      return {
        area: v('spec-area'), storeys: v('spec-storeys'),
        structure: $('spec-structure').value, region: $('spec-region').value,
        rateConcrete: v('rate-concrete'), rateTimber: v('rate-timber'),
        rateCarpenter: v('rate-carpenter'), rateLabourer: v('rate-labourer'),
        rateDigger: v('rate-digger'), rateSkip: v('rate-skip'),
        rateMarkup: v('rate-markup'), rateContingency: v('rate-contingency')
      };
    }

    function applyInputs(inputs){
      $('spec-area').value=inputs.area; $('spec-storeys').value=inputs.storeys;
      $('spec-structure').value=inputs.structure; $('spec-region').value=inputs.region;
      $('rate-concrete').value=inputs.rateConcrete; $('rate-timber').value=inputs.rateTimber;
      $('rate-carpenter').value=inputs.rateCarpenter; $('rate-labourer').value=inputs.rateLabourer;
      $('rate-digger').value=inputs.rateDigger; $('rate-skip').value=inputs.rateSkip;
      $('rate-markup').value=inputs.rateMarkup; $('rate-contingency').value=inputs.rateContingency;
    }

    async function renderSavedList(){
      var res = await sb.from('valuations').select('*').order('created_at', { ascending:false }).limit(20);
      if(res.error){ console.error('InfraBid: failed to load valuations', res.error); return; }
      var rows = res.data || [];
      listBody.innerHTML = rows.length ? rows.map(function(r){
        return '<div class="board-row">'+
          '<div class="tname">'+esc(r.name)+'</div>'+
          '<div class="tval">'+euroFull(r.total)+'</div>'+
          '<div class="tval">'+euroFull(r.margin)+'</div>'+
          '<div class="tdeadline">'+new Date(r.created_at).toLocaleDateString('en-IE')+'</div>'+
          '<div class="board-actions">'+
            '<button class="icon-btn" data-load="'+r.id+'" aria-label="Load valuation"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>'+
            '<button class="icon-btn del" data-del="'+r.id+'" aria-label="Delete valuation"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg></button>'+
          '</div></div>';
      }).join('') : '<div style="padding:24px 22px;text-align:center;color:var(--muted);font-size:13px">No saved valuations yet.</div>';
      currentRows = rows;
    }

    var currentRows = [];

    saveBtn.addEventListener('click', async function(){
      if(!lastLedger){ window.alert('Run Calculate Valuation first, then save the result.'); return; }
      if(!sb) return;
      var name = (REGION_LABEL[$('spec-region').value]||$('spec-region').value)+' · '+(STRUCT_LABEL[$('spec-structure').value]||$('spec-structure').value)+' · '+euroFull(lastLedger.total);
      var row = { name: name, inputs: currentInputs(), total: lastLedger.total, margin: lastLedger.margin };
      var res = await sb.from('valuations').insert(row);
      if(res.error){ window.alert('Could not save valuation: '+res.error.message); return; }
      var origText = saveBtn.textContent;
      saveBtn.textContent = 'Saved ✓';
      setTimeout(function(){ saveBtn.textContent = origText; }, 1600);
      renderSavedList();
    });

    listBody.addEventListener('click', async function(e){
      var loadBtn=e.target.closest('[data-load]'), delBtn=e.target.closest('[data-del]');
      if(loadBtn){
        var row = currentRows.find(function(r){ return String(r.id)===loadBtn.dataset.load; });
        if(!row) return;
        applyInputs(row.inputs);
        processValuation();
      } else if(delBtn){
        if(window.confirm('Delete this saved valuation? This cannot be undone.')){
          var res = await sb.from('valuations').delete().eq('id', delBtn.dataset.del);
          if(res.error){ window.alert('Could not delete valuation: '+res.error.message); return; }
          renderSavedList();
        }
      }
    });

    /* ---- CECA-style rate library: dropdown to add line items to a valuation ---- */
    // Illustrative placeholder rates only. These are NOT verified figures from the
    // real CECA Dayworks Schedule — replace with your actual schedule via the
    // "+ Add New Rate to Library" form before relying on this for a real tender.
    var DEFAULT_RATE_ITEMS=[
      {category:'Labour', description:'General Operative', unit:'per hr', rate:26.50},
      {category:'Labour', description:'Skilled Operative / Ganger', unit:'per hr', rate:34.00},
      {category:'Plant', description:'13T Excavator', unit:'per hr', rate:65.00},
      {category:'Plant', description:'6T Dumper', unit:'per hr', rate:38.00},
      {category:'Output Rate', description:'Lay 150mm dia. pipe', unit:'per m', rate:28.00},
      {category:'Output Rate', description:'Lay 300mm dia. pipe', unit:'per m', rate:42.00},
      {category:'Output Rate', description:'Excavate & backfill trench', unit:'per m³', rate:18.50},
      {category:'Materials', description:'300mm dia. pipe (supply)', unit:'per m', rate:55.00}
    ];
    var itemSelect=$('ceca-item-select'), itemQty=$('ceca-item-qty'), addBtn=$('ceca-add-btn');
    var itemsWrap=$('ceca-items-wrap'), itemsBody=$('ceca-items-body');
    var newRateToggle=$('ceca-newrate-toggle'), newRateForm=$('ceca-newrate-form'), newRateActions=$('ceca-newrate-actions'), newRateSave=$('ceca-newrate-save');
    var libraryItems=DEFAULT_RATE_ITEMS.slice();

    function renderDropdown(){
      if(!itemSelect) return;
      var byCat={};
      libraryItems.forEach(function(it,i){ (byCat[it.category]=byCat[it.category]||[]).push(i); });
      itemSelect.innerHTML=Object.keys(byCat).map(function(cat){
        return '<optgroup label="'+escHtml(cat)+'">'+byCat[cat].map(function(i){
          var it=libraryItems[i];
          return '<option value="'+i+'">'+escHtml(it.description)+' — '+euro(it.rate)+' '+escHtml(it.unit)+'</option>';
        }).join('')+'</optgroup>';
      }).join('');
    }

    function renderExtraItemsList(){
      if(!itemsBody) return;
      itemsWrap.style.display=cecaExtraItems.length?'block':'none';
      itemsBody.innerHTML=cecaExtraItems.map(function(it,i){
        return '<div class="elem-row"><span>'+escHtml(it.description)+'</span><span>'+it.qty+' '+escHtml(it.unit)+'</span><span>'+euro(it.rate)+'</span>'+
          '<span style="display:flex;align-items:center;gap:8px;justify-content:space-between">'+euro(it.qty*it.rate)+
          '<button class="icon-btn del" data-remove-extra="'+i+'" aria-label="Remove item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6L6 18M6 6l12 12"/></svg></button></span></div>';
      }).join('');
    }

    if(addBtn) addBtn.addEventListener('click', function(){
      if(!itemSelect.value) return;
      var it=libraryItems[parseInt(itemSelect.value,10)];
      var qty=parseFloat(itemQty.value)||0;
      if(!it || qty<=0) return;
      cecaExtraItems.push({ category:it.category, description:it.description, unit:it.unit, rate:it.rate, qty:qty });
      renderExtraItemsList();
    });

    if(itemsBody) itemsBody.addEventListener('click', function(e){
      var rmBtn=e.target.closest('[data-remove-extra]');
      if(!rmBtn) return;
      cecaExtraItems.splice(parseInt(rmBtn.dataset.removeExtra,10), 1);
      renderExtraItemsList();
    });

    if(newRateToggle) newRateToggle.addEventListener('click', function(){
      var showing=newRateForm.style.display==='grid'||newRateForm.style.display==='block';
      newRateForm.style.display=showing?'none':'grid';
      newRateActions.style.display=showing?'none':'flex';
    });

    if(newRateSave) newRateSave.addEventListener('click', async function(){
      if(!sb) return;
      var category=$('ceca-new-category').value, description=$('ceca-new-desc').value.trim(),
          unit=$('ceca-new-unit').value.trim()||'ea', rate=parseFloat($('ceca-new-rate').value)||0;
      if(!description || rate<=0){ window.alert('Enter a description and a rate greater than zero.'); return; }
      var res = await sb.from('rate_items').insert({ category:category, description:description, unit:unit, rate:rate });
      if(res.error){ window.alert('Could not save rate: '+res.error.message); return; }
      await loadRateLibrary();
      $('ceca-new-desc').value=''; $('ceca-new-unit').value=''; $('ceca-new-rate').value='';
      newRateForm.style.display='none'; newRateActions.style.display='none';
    });

    async function loadRateLibrary(){
      if(!sb) return;
      var res = await sb.from('rate_items').select('*').order('created_at', { ascending:true });
      var custom = (res.error || !res.data) ? [] : res.data;
      libraryItems=DEFAULT_RATE_ITEMS.concat(custom);
      renderDropdown();
    }

    InfraBidAuth.getSession().then(function(session){
      if(!session) return; // auth.js guard is redirecting away
      sb = InfraBidAuth.getClient();
      renderSavedList();
      renderDropdown();
      loadRateLibrary();
    });
  })();

  /* background particle constellation (tuned for white bg) */
  if(!reduce){
    var cv = document.getElementById('bg-canvas'), ctx = cv.getContext('2d');
    var W,H,pts,mouse={x:-9999,y:-9999}, DPR=Math.min(window.devicePixelRatio||1,2);
    function resize(){ W=cv.width=innerWidth*DPR; H=cv.height=innerHeight*DPR;
      cv.style.width=innerWidth+'px'; cv.style.height=innerHeight+'px';
      var n=Math.min(Math.round(innerWidth*innerHeight/16000), innerWidth<700?34:96);
      pts=[]; for(var i=0;i<n;i++){ pts.push({x:Math.random()*W,y:Math.random()*H,
        vx:(Math.random()-.5)*.22*DPR, vy:(Math.random()-.5)*.22*DPR}); } }
    window.addEventListener('resize', resize); resize();
    window.addEventListener('pointermove', function(e){ mouse.x=e.clientX*DPR; mouse.y=e.clientY*DPR; }, {passive:true});
    window.addEventListener('pointerleave', function(){ mouse.x=mouse.y=-9999; });
    var LINK=140*DPR, MO=170*DPR;
    var DOT_COLORS=['19,49,152','14,165,233','71,109,207'];
    (function frame(){
      ctx.clearRect(0,0,W,H);
      for(var i=0;i<pts.length;i++){ var p=pts[i]; p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1;
        var dc=DOT_COLORS[i%DOT_COLORS.length];
        ctx.beginPath(); ctx.arc(p.x,p.y,1.5*DPR,0,6.2832); ctx.fillStyle='rgba('+dc+',.4)'; ctx.fill();
        for(var j=i+1;j<pts.length;j++){ var q=pts[j], dx=p.x-q.x, dy=p.y-q.y, d=Math.sqrt(dx*dx+dy*dy);
          if(d<LINK){ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
            ctx.strokeStyle='rgba(19,49,152,'+(.08*(1-d/LINK))+')'; ctx.lineWidth=DPR*.6; ctx.stroke(); } }
        var mdx=p.x-mouse.x, mdy=p.y-mouse.y, md=Math.sqrt(mdx*mdx+mdy*mdy);
        if(md<MO){ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(mouse.x,mouse.y);
          ctx.strokeStyle='rgba(14,165,233,'+(.35*(1-md/MO))+')'; ctx.lineWidth=DPR*.8; ctx.stroke(); } }
      requestAnimationFrame(frame);
    })();
  }

  /* ---------- enquiry form (contact.html) ---------- */
  (function(){
    var form = document.getElementById('enquiry-form');
    if(!form) return;
    var $=function(id){ return document.getElementById(id); };
    var badge=$('enq-badge'), standby=$('enq-standby'), success=$('enq-success'),
        refEl=$('enq-ref'), summaryEl=$('enq-summary'), submitBtn=$('submit-btn');
    var lastMailto=null;

    function readEnquiries(){ try{ return JSON.parse(localStorage.getItem('infrabid_enquiries')||'[]'); }catch(e){ return []; } }
    function saveEnquiry(e){ var list=readEnquiries(); list.push(e); try{ localStorage.setItem('infrabid_enquiries', JSON.stringify(list)); }catch(err){} }

    function validate(){
      var ok=true;
      [['f-name',function(v){return v.trim().length>0;}],
       ['f-email',function(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());}],
       ['f-message',function(v){return v.trim().length>0;}]
      ].forEach(function(pair){
        var el=$(pair[0]), fld=el.closest('.fld'), valid=pair[1](el.value);
        fld.classList.toggle('invalid', !valid);
        if(!valid) ok=false;
      });
      return ok;
    }

    form.addEventListener('submit', function(ev){
      ev.preventDefault();
      if(!validate()) return;

      var data={
        name:$('f-name').value.trim(), email:$('f-email').value.trim(), phone:$('f-phone').value.trim(),
        company:$('f-company').value.trim(), projectType:$('f-type').value, value:$('f-value').value,
        timeline:$('f-timeline').value, message:$('f-message').value.trim(),
        submittedAt:new Date().toISOString()
      };
      var ref='IB-'+Date.now().toString(36).toUpperCase();
      data.ref=ref;
      saveEnquiry(data);

      var subject='InfraBid Enquiry '+ref+' — '+(data.company||data.name);
      var bodyLines=[
        'Reference: '+ref, 'Name: '+data.name, 'Company: '+(data.company||'—'),
        'Email: '+data.email, 'Phone: '+(data.phone||'—'),
        'Project Type: '+data.projectType, 'Estimated Value: '+(data.value?('€'+data.value):'—'),
        'Target Start: '+(data.timeline||'—'), '', 'Project Details:', data.message
      ];
      lastMailto='mailto:info@infrabid.ie?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(bodyLines.join('\n'));

      badge.textContent='Verified'; badge.style.color='var(--navy)';
      standby.style.display='none'; success.style.display='block';
      refEl.textContent=ref;
      summaryEl.innerHTML='Enquiry from <b>'+(data.name||'you')+'</b> logged locally. An email draft to <b>info@infrabid.ie</b> is opening now.';
      window.location.href=lastMailto;
    });

    var resend=$('enq-resend');
    if(resend) resend.addEventListener('click', function(){ if(lastMailto) window.location.href=lastMailto; });

    var again=$('enq-new');
    if(again) again.addEventListener('click', function(){
      form.reset();
      form.querySelectorAll('.fld.invalid').forEach(function(f){ f.classList.remove('invalid'); });
      badge.textContent='Standby'; badge.style.color='var(--muted)';
      success.style.display='none'; standby.style.display='block';
    });
  })();

  /* ---------- tender dashboard (dashboard.html) ---------- */
  (async function(){
    var boardBody = document.getElementById('board-body');
    if(!boardBody) return;
    var $=function(id){ return document.getElementById(id); };

    // Gating/redirect for logged-out visitors is handled centrally by auth.js.
    // If there's no session here, that redirect is already in flight — bail out.
    var session = await InfraBidAuth.getSession();
    if(!session) return;
    var sb = InfraBidAuth.getClient();

    var tenders=[], statusFilter='all', searchTerm='', editingId=null;

    async function load(){
      var res = await sb.from('tenders').select('*').order('deadline', { ascending:true });
      if(res.error){ console.error('InfraBid: failed to load tenders', res.error); tenders=[]; return; }
      tenders = res.data || [];
    }

    function euroFull(n){ return '€'+Math.round(n||0).toLocaleString('en-IE'); }
    function daysUntil(dateStr){ if(!dateStr) return 999; var d=new Date(dateStr+'T00:00:00'), t=new Date(); t.setHours(0,0,0,0); return Math.round((d-t)/86400000); }
    function esc(s){ var d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

    function renderKPIs(){
      var open=tenders.filter(function(t){ return t.status==='Draft'||t.status==='Submitted'; });
      var decided=tenders.filter(function(t){ return t.status==='Won'||t.status==='Lost'; });
      var won=tenders.filter(function(t){ return t.status==='Won'; });
      $('kpi-active').textContent=open.length;
      $('kpi-value').textContent=euroFull(open.reduce(function(a,t){ return a+(+t.value||0); },0));
      $('kpi-winrate').textContent=decided.length? Math.round(won.length/decided.length*100)+'%' : '—';
      $('kpi-winrate-sub').textContent=decided.length? 'of '+decided.length+' decided' : 'no decided tenders yet';
      $('kpi-duesoon').textContent=open.filter(function(t){ var d=daysUntil(t.deadline); return d>=0&&d<=7; }).length;
    }

    function render(){
      var term=searchTerm;
      var list=tenders.filter(function(t){
        if(statusFilter!=='all' && t.status!==statusFilter) return false;
        if(term && !((t.name||'').toLowerCase().indexOf(term)>-1 || (t.client||'').toLowerCase().indexOf(term)>-1)) return false;
        return true;
      }).sort(function(a,b){ return new Date(a.deadline)-new Date(b.deadline); });

      boardBody.innerHTML = list.length ? list.map(function(t){
        var d=daysUntil(t.deadline), urg = d<=7? 'urgent' : d<=30? 'soon' : '';
        var dLabel = d<0 ? Math.abs(d)+'d overdue' : d===0 ? 'Due today' : d+'d left';
        return '<div class="board-row">'+
          '<div><div class="tname">'+esc(t.name)+'</div><div class="tclient">'+esc(t.client)+'</div></div>'+
          '<div class="tval">'+euroFull(t.value)+'</div>'+
          '<div class="tdeadline '+urg+'">'+dLabel+'</div>'+
          '<div><span class="status-pill '+t.status.toLowerCase()+'">'+t.status+'</span></div>'+
          '<div class="board-actions">'+
            '<button class="icon-btn" data-edit="'+t.id+'" aria-label="Edit tender"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg></button>'+
            '<button class="icon-btn del" data-del="'+t.id+'" aria-label="Delete tender"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg></button>'+
          '</div></div>';
      }).join('') : '<div style="padding:44px 22px;text-align:center;color:var(--muted);font-size:13px">No tenders match this view.</div>';

      renderKPIs();
    }

    document.querySelectorAll('#status-chips .fchip').forEach(function(chip){
      chip.addEventListener('click', function(){
        document.querySelectorAll('#status-chips .fchip').forEach(function(c){ c.classList.remove('active'); });
        chip.classList.add('active');
        statusFilter=chip.dataset.status;
        render();
      });
    });

    var searchInput=$('tender-search');
    if(searchInput) searchInput.addEventListener('input', function(){ searchTerm=this.value.trim().toLowerCase(); render(); });

    var formWrap=$('tender-form-wrap');
    function resetInvalid(){ ['t-name','t-client'].forEach(function(id){ $(id).closest('.fld').classList.remove('invalid'); }); }

    $('new-tender-btn').addEventListener('click', function(){
      editingId=null; resetInvalid();
      $('form-title').textContent='New Tender';
      $('form-hint').textContent='Saved to your account.';
      $('t-name').value=''; $('t-client').value=''; $('t-value').value=''; $('t-deadline').value='';
      $('t-status').value='Draft';
      formWrap.style.display='block';
      formWrap.scrollIntoView({behavior: reduce?'auto':'smooth', block:'center'});
    });

    $('tender-cancel-btn').addEventListener('click', function(){ formWrap.style.display='none'; });

    $('tender-save-btn').addEventListener('click', async function(){
      resetInvalid();
      var name=$('t-name').value.trim(), client=$('t-client').value.trim(), ok=true;
      if(!name){ $('t-name').closest('.fld').classList.add('invalid'); ok=false; }
      if(!client){ $('t-client').closest('.fld').classList.add('invalid'); ok=false; }
      if(!ok) return;

      var data={ name:name, client:client, value:parseFloat($('t-value').value)||0,
        deadline:$('t-deadline').value || null, status:$('t-status').value };

      var res = editingId
        ? await sb.from('tenders').update(data).eq('id', editingId)
        : await sb.from('tenders').insert(data);
      if(res.error){ window.alert('Could not save tender: '+res.error.message); return; }

      await load(); formWrap.style.display='none'; render();
    });

    boardBody.addEventListener('click', async function(e){
      var editBtn=e.target.closest('[data-edit]'), delBtn=e.target.closest('[data-del]');
      if(editBtn){
        var id=editBtn.dataset.edit, t=tenders.find(function(x){ return String(x.id)===id; });
        if(!t) return;
        editingId=t.id; resetInvalid();
        $('form-title').textContent='Edit Tender';
        $('form-hint').textContent='Updating an existing tender.';
        $('t-name').value=t.name; $('t-client').value=t.client; $('t-value').value=t.value;
        $('t-deadline').value=t.deadline||''; $('t-status').value=t.status;
        formWrap.style.display='block';
        formWrap.scrollIntoView({behavior: reduce?'auto':'smooth', block:'center'});
      } else if(delBtn){
        var did=delBtn.dataset.del;
        if(window.confirm('Delete this tender? This cannot be undone.')){
          var res = await sb.from('tenders').delete().eq('id', did);
          if(res.error){ window.alert('Could not delete tender: '+res.error.message); return; }
          await load(); render();
        }
      }
    });

    await load();
    render();
  })();

  /* ---------- AI takeoff (takeoff.html) : real calibrated measurement ---------- */
  (function(){
    var zone=document.getElementById('upload-zone');
    if(!zone) return;
    var $=function(id){ return document.getElementById(id); };
    var fileInput=$('takeoff-file-input'), fileInfo=$('upload-file-info'), clearBtn=$('upload-clear-btn');

    if(window.pdfjsLib){
      pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    var UNIT_TO_M={mm:0.001, cm:0.01, m:1, ft:0.3048, in:0.0254};

    var currentFile=null, fileKind=null, pdfDoc=null, baseImage=null;
    var pageNum=1, pageCount=1, calibrations={};
    var contentCanvas=null, overlayCanvas=null, octx=null;
    var tool='calibrate', points=[], pendingCommit=null;
    var schedule=[], scheduleIdSeed=1;
    var sb=null, savedTakeoffs=[];

    function bytesToSize(b){
      if(b<1024) return b+' B';
      if(b<1048576) return (b/1024).toFixed(1)+' KB';
      return (b/1048576).toFixed(2)+' MB';
    }
    function esc(s){ var d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }
    function dist(a,b){ return Math.hypot(b.x-a.x, b.y-a.y); }
    function polylineLength(pts){ var s=0; for(var i=1;i<pts.length;i++) s+=dist(pts[i-1],pts[i]); return s; }
    function polygonAreaPx(pts){
      var s=0;
      for(var i=0;i<pts.length;i++){ var a=pts[i], b=pts[(i+1)%pts.length]; s+=a.x*b.y-b.x*a.y; }
      return Math.abs(s)/2;
    }
    function countByType(t){ return schedule.filter(function(r){ return r.type===t; }).length; }

    function showLoadError(msg){
      $('tk-workspace').style.display='block';
      $('tk-canvas-wrap').innerHTML='<div class="tk-empty">'+esc(msg)+'</div>';
    }

    function resetWorkspace(){
      pdfDoc=null; baseImage=null; fileKind=null; pageNum=1; pageCount=1;
      calibrations={}; schedule=[]; tool='calibrate'; points=[]; pendingCommit=null;
      contentCanvas=null; overlayCanvas=null; octx=null;
      $('tk-workspace').style.display='none';
      $('tk-schedule-wrap').style.display='none';
      $('tk-actions').style.display='none';
      $('tk-pagenav').style.display='none';
      hideCalibPanel(); hideLabelPanel();
      renderSchedule();
    }

    function loadFile(file){
      currentFile=file;
      fileInfo.style.display='flex';
      $('upload-file-name').textContent=file.name;
      $('upload-file-meta').textContent=bytesToSize(file.size)+' · '+(file.type||'unknown type');
      resetWorkspace();
      var ext=file.name.split('.').pop().toLowerCase();
      if(ext==='pdf'){ fileKind='pdf'; loadPdf(file); }
      else if(['png','jpg','jpeg'].indexOf(ext)!==-1){ fileKind='image'; loadImage(file); }
      else { showLoadError('Unsupported file type. Please upload a PDF, PNG, or JPG to measure directly — other formats can\'t be rendered and measured pixel-for-pixel in the browser.'); }
    }

    function loadImage(file){
      var url=URL.createObjectURL(file);
      var img=new Image();
      img.onload=function(){
        baseImage=img; pageCount=1; pageNum=1;
        $('tk-pagenav').style.display='none';
        renderCurrentPage();
        URL.revokeObjectURL(url);
      };
      img.onerror=function(){ showLoadError('Could not read this image file.'); URL.revokeObjectURL(url); };
      img.src=url;
    }

    async function loadPdf(file){
      if(!window.pdfjsLib){ showLoadError('PDF engine failed to load. Check your connection and try again.'); return; }
      try{
        var buf=await file.arrayBuffer();
        var doc=await pdfjsLib.getDocument({data:buf}).promise;
        pdfDoc=doc; pageCount=doc.numPages; pageNum=1;
        $('tk-pagenav').style.display=pageCount>1 ? 'flex' : 'none';
        updatePageLabel();
        await renderCurrentPage();
      }catch(e){
        showLoadError('Could not read this PDF. It may be corrupted or password-protected.');
      }
    }

    function updatePageLabel(){ $('tk-page-label').textContent='Page '+pageNum+' of '+pageCount; }

    async function renderCurrentPage(){
      $('tk-workspace').style.display='block';
      $('tk-schedule-wrap').style.display='block';
      $('tk-actions').style.display='flex';

      var wrap=$('tk-canvas-wrap');
      wrap.innerHTML='';
      var stage=document.createElement('div'); stage.className='stage';
      contentCanvas=document.createElement('canvas');
      overlayCanvas=document.createElement('canvas'); overlayCanvas.className='ov';
      stage.appendChild(contentCanvas); stage.appendChild(overlayCanvas);
      wrap.appendChild(stage);
      var ctx=contentCanvas.getContext('2d');
      var targetW=Math.min(1100, wrap.clientWidth || 900);

      if(fileKind==='pdf'){
        var page=await pdfDoc.getPage(pageNum);
        var baseViewport=page.getViewport({scale:1});
        var scale=targetW/baseViewport.width;
        var viewport=page.getViewport({scale:scale});
        contentCanvas.width=viewport.width; contentCanvas.height=viewport.height;
        overlayCanvas.width=viewport.width; overlayCanvas.height=viewport.height;
        await page.render({canvasContext:ctx, viewport:viewport}).promise;
      } else {
        var s=targetW/baseImage.width, w=baseImage.width*s, h=baseImage.height*s;
        contentCanvas.width=w; contentCanvas.height=h;
        overlayCanvas.width=w; overlayCanvas.height=h;
        ctx.drawImage(baseImage,0,0,w,h);
      }

      octx=overlayCanvas.getContext('2d');
      tool='calibrate'; points=[];
      overlayCanvas.addEventListener('click', onCanvasClick);
      updateToolAvailability();
      updateScaleReadout();
      updateToolButtonsUI();
      redrawOverlay();
    }

    function onCanvasClick(e){
      if(!tool) return;
      if(tool==='calibrate' && points.length>=2) return;
      var rect=overlayCanvas.getBoundingClientRect();
      var x=(e.clientX-rect.left)*(overlayCanvas.width/rect.width);
      var y=(e.clientY-rect.top)*(overlayCanvas.height/rect.height);
      points.push({x:x,y:y});
      updateToolButtonsUI();
      redrawOverlay();
    }

    function drawGeometry(type, pts, strokeColor, fillColor){
      if(!pts.length) return;
      octx.strokeStyle=strokeColor; octx.fillStyle=fillColor; octx.lineWidth=2.4;
      if(type==='Area'){
        octx.beginPath();
        pts.forEach(function(p,i){ i===0?octx.moveTo(p.x,p.y):octx.lineTo(p.x,p.y); });
        if(pts.length>2){ octx.closePath(); octx.fill(); }
        octx.stroke();
      } else if(type!=='Count'){
        octx.beginPath();
        pts.forEach(function(p,i){ i===0?octx.moveTo(p.x,p.y):octx.lineTo(p.x,p.y); });
        octx.stroke();
      }
      pts.forEach(function(p,i){
        octx.beginPath(); octx.arc(p.x,p.y,4,0,Math.PI*2); octx.fillStyle=strokeColor; octx.fill();
        if(type==='Count'){
          octx.fillStyle='#fff'; octx.font='10px sans-serif'; octx.textAlign='center'; octx.fillText(String(i+1), p.x, p.y-8);
        }
      });
    }

    function redrawOverlay(){
      if(!octx) return;
      octx.clearRect(0,0,overlayCanvas.width, overlayCanvas.height);
      schedule.filter(function(r){ return r.page===pageNum; }).forEach(function(r){
        drawGeometry(r.type, r.points, 'rgba(19,49,152,.85)', 'rgba(71,109,207,.16)');
      });
      if(points.length){
        var inProgType = tool==='calibrate' ? 'Length' : (tool==='area' ? 'Area' : (tool==='count' ? 'Count' : 'Length'));
        var color = tool==='calibrate' ? 'rgba(183,121,31,.95)' : 'rgba(230,126,34,.95)';
        drawGeometry(inProgType, points, color, 'rgba(230,126,34,.16)');
      }
    }

    function updateToolAvailability(){
      var calibrated=!!calibrations[pageNum];
      ['length','area','count'].forEach(function(t){ $('tk-tool-'+t).disabled=!calibrated; });
    }

    function updateScaleReadout(){
      var el=$('tk-scale-readout'), px=calibrations[pageNum];
      if(px){ el.textContent=(1000/px).toFixed(2)+' mm per pixel (calibrated)'; el.className='scale-ok'; }
      else { el.textContent='Not calibrated — draw a line with Set Scale'; el.className='scale-bad'; }
    }

    function updateToolButtonsUI(){
      $('tk-undo-btn').disabled = points.length===0;
      $('tk-cancel-btn').disabled = points.length===0;
      var canFinish=false;
      if(tool==='calibrate') canFinish = points.length===2;
      else if(tool==='length') canFinish = points.length>=2;
      else if(tool==='area') canFinish = points.length>=3;
      else if(tool==='count') canFinish = points.length>=1;
      $('tk-finish-btn').disabled = !canFinish;
      ['calibrate','length','area','count'].forEach(function(t){ $('tk-tool-'+t).classList.toggle('active', tool===t); });
    }

    ['calibrate','length','area','count'].forEach(function(t){
      $('tk-tool-'+t).addEventListener('click', function(){
        if(this.disabled) return;
        if(tool!==t){ tool=t; points=[]; }
        updateToolButtonsUI(); redrawOverlay();
      });
    });

    $('tk-undo-btn').addEventListener('click', function(){ points.pop(); updateToolButtonsUI(); redrawOverlay(); });
    $('tk-cancel-btn').addEventListener('click', function(){ points=[]; updateToolButtonsUI(); redrawOverlay(); });

    function showCalibPanel(){ $('tk-calib-panel').style.display='flex'; $('tk-calib-length').focus(); }
    function hideCalibPanel(){ $('tk-calib-panel').style.display='none'; $('tk-calib-length').value=''; }
    function openLabelPanel(defaultLabel, previewText){
      $('tk-label-title').textContent='Label this measurement — '+previewText;
      var input=$('tk-label-input'); input.value=defaultLabel;
      $('tk-label-panel').style.display='flex'; input.focus();
    }
    function hideLabelPanel(){ $('tk-label-panel').style.display='none'; }

    $('tk-finish-btn').addEventListener('click', function(){
      if(tool==='calibrate'){
        if(points.length!==2) return;
        showCalibPanel();
        return;
      }
      if(!calibrations[pageNum]) return;
      if(tool==='length'){
        if(points.length<2) return;
        var meters=polylineLength(points)/calibrations[pageNum];
        pendingCommit={type:'Length', qty:+meters.toFixed(2), unit:'m', points:points.slice(), page:pageNum};
        openLabelPanel('Length '+(countByType('Length')+1), meters.toFixed(2)+' m');
      } else if(tool==='area'){
        if(points.length<3) return;
        var m2=polygonAreaPx(points)/(calibrations[pageNum]*calibrations[pageNum]);
        pendingCommit={type:'Area', qty:+m2.toFixed(2), unit:'m²', points:points.slice(), page:pageNum};
        openLabelPanel('Area '+(countByType('Area')+1), m2.toFixed(2)+' m²');
      } else if(tool==='count'){
        if(points.length<1) return;
        pendingCommit={type:'Count', qty:points.length, unit:'no.', points:points.slice(), page:pageNum};
        openLabelPanel('Count '+(countByType('Count')+1), points.length+' item'+(points.length===1?'':'s'));
      }
    });

    $('tk-calib-confirm').addEventListener('click', function(){
      var lenVal=parseFloat($('tk-calib-length').value);
      var unit=$('tk-calib-unit').value;
      if(!lenVal || lenVal<=0 || points.length!==2) return;
      var meters=lenVal*UNIT_TO_M[unit];
      var pxDist=dist(points[0], points[1]);
      calibrations[pageNum]=pxDist/meters;
      hideCalibPanel();
      points=[]; tool='calibrate';
      updateScaleReadout(); updateToolAvailability(); updateToolButtonsUI(); redrawOverlay();
    });
    $('tk-calib-cancel').addEventListener('click', function(){ hideCalibPanel(); });

    $('tk-label-confirm').addEventListener('click', function(){
      if(!pendingCommit) return;
      var label=$('tk-label-input').value.trim() || (pendingCommit.type+' '+(countByType(pendingCommit.type)+1));
      schedule.push({ id:scheduleIdSeed++, label:label, type:pendingCommit.type, qty:pendingCommit.qty, unit:pendingCommit.unit, points:pendingCommit.points, page:pendingCommit.page });
      pendingCommit=null; hideLabelPanel();
      points=[]; tool='calibrate';
      updateToolButtonsUI(); renderSchedule(); redrawOverlay(); updateActionAvailability();
    });
    $('tk-label-cancel').addEventListener('click', function(){ pendingCommit=null; hideLabelPanel(); });

    function renderSchedule(){
      var body=$('tk-schedule-body');
      if(!schedule.length){ body.innerHTML='<div class="tk-schedule-empty">No measurements yet. Calibrate the scale, then measure a length, area, or count.</div>'; return; }
      body.innerHTML=schedule.map(function(r){
        return '<div class="elem-row"><span>'+esc(r.label)+'</span><span>'+r.type+'</span><span>'+r.qty.toLocaleString('en-IE')+' '+r.unit+'</span>'+
          '<button class="icon-btn del" data-id="'+r.id+'" aria-label="Remove measurement"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>';
      }).join('');
      Array.prototype.forEach.call(body.querySelectorAll('.icon-btn.del'), function(btn){
        btn.addEventListener('click', function(){
          var id=parseInt(btn.getAttribute('data-id'),10);
          schedule=schedule.filter(function(r){ return r.id!==id; });
          renderSchedule(); redrawOverlay(); updateActionAvailability();
        });
      });
    }

    function updateActionAvailability(){
      var areaRows=schedule.filter(function(r){ return r.type==='Area'; });
      $('tk-tovaluation-btn').disabled = areaRows.length===0;
      $('tk-actions-hint').textContent = areaRows.length
        ? ('Total measured area: '+areaRows.reduce(function(a,r){ return a+r.qty; },0).toFixed(2)+' m² across '+areaRows.length+' area measurement'+(areaRows.length>1?'s':'')+'.')
        : 'Add at least one Area measurement to send a gross internal area to the Valuation Suite.';
    }

    $('tk-prev-page').addEventListener('click', function(){ if(pageNum>1){ pageNum--; updatePageLabel(); renderCurrentPage(); } });
    $('tk-next-page').addEventListener('click', function(){ if(pageNum<pageCount){ pageNum++; updatePageLabel(); renderCurrentPage(); } });

    zone.addEventListener('click', function(){ fileInput.click(); });
    zone.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fileInput.click(); } });
    zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', function(){ zone.classList.remove('drag'); });
    zone.addEventListener('drop', function(e){
      e.preventDefault(); zone.classList.remove('drag');
      if(e.dataTransfer.files && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function(){ if(this.files && this.files[0]) loadFile(this.files[0]); });
    clearBtn.addEventListener('click', function(){
      currentFile=null; fileInput.value=''; fileInfo.style.display='none';
      resetWorkspace();
    });

    $('tk-export-btn').addEventListener('click', function(){
      if(!schedule.length) return;
      var lines=['Label,Type,Quantity,Unit'];
      schedule.forEach(function(r){ lines.push('"'+r.label.replace(/"/g,'""')+'",'+r.type+','+r.qty+',"'+r.unit+'"'); });
      var blob=new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'}), url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download='InfraBid_Takeoff_'+(currentFile ? currentFile.name.replace(/\.[^.]+$/,'') : 'schedule')+'.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    });

    $('tk-tovaluation-btn').addEventListener('click', function(){
      var areaRows=schedule.filter(function(r){ return r.type==='Area'; });
      if(!areaRows.length) return;
      var totalArea=+areaRows.reduce(function(a,r){ return a+r.qty; },0).toFixed(2);
      try{ localStorage.setItem('infrabid_takeoff_handoff', JSON.stringify({ gia:totalArea, ts:Date.now() })); }catch(e){}
      window.location.href='valuation.html';
    });

    async function renderSavedTakeoffs(){
      var body=$('tk-saved-body');
      if(!body || !sb) return;
      var res = await sb.from('takeoffs').select('*').order('created_at', { ascending:false }).limit(20);
      if(res.error){ console.error('InfraBid: failed to load saved takeoffs', res.error); return; }
      savedTakeoffs = res.data || [];
      body.innerHTML = savedTakeoffs.length ? savedTakeoffs.map(function(r){
        var count=(r.schedule||[]).length;
        return '<div class="elem-row">'+
          '<span>'+esc(r.name)+'</span>'+
          '<span>'+count+' measurement'+(count===1?'':'s')+'</span>'+
          '<span>'+new Date(r.created_at).toLocaleDateString('en-IE')+'</span>'+
          '<span style="display:flex;gap:6px;justify-content:flex-end">'+
            '<button class="icon-btn" data-tksaved-load="'+r.id+'" aria-label="Load saved takeoff into schedule"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>'+
            '<button class="icon-btn del" data-tksaved-del="'+r.id+'" aria-label="Delete saved takeoff"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6L6 18M6 6l12 12"/></svg></button>'+
          '</span></div>';
      }).join('') : '<div class="tk-schedule-empty">No saved takeoffs yet.</div>';
    }

    var saveTkBtn=$('tk-save-btn');
    if(saveTkBtn) saveTkBtn.addEventListener('click', async function(){
      if(!schedule.length){ window.alert('Add at least one measurement before saving.'); return; }
      if(!sb) return;
      var name = currentFile ? currentFile.name : ('Takeoff '+new Date().toLocaleDateString('en-IE'));
      var res = await sb.from('takeoffs').insert({ name:name, schedule:schedule });
      if(res.error){ window.alert('Could not save takeoff: '+res.error.message); return; }
      var origText=saveTkBtn.textContent;
      saveTkBtn.textContent='Saved ✓';
      setTimeout(function(){ saveTkBtn.textContent=origText; }, 1600);
      renderSavedTakeoffs();
    });

    var savedBody=$('tk-saved-body');
    if(savedBody) savedBody.addEventListener('click', async function(e){
      var loadBtn=e.target.closest('[data-tksaved-load]'), delBtn=e.target.closest('[data-tksaved-del]');
      if(loadBtn){
        var row=savedTakeoffs.find(function(r){ return String(r.id)===loadBtn.dataset.tksavedLoad; });
        if(!row) return;
        schedule=(row.schedule||[]).slice();
        scheduleIdSeed=schedule.reduce(function(m,r){ return Math.max(m,(r.id||0)+1); }, 1);
        $('tk-schedule-wrap').style.display='block';
        $('tk-actions').style.display='flex';
        renderSchedule(); updateActionAvailability();
        $('tk-schedule-wrap').scrollIntoView({behavior: reduce?'auto':'smooth', block:'center'});
      } else if(delBtn){
        if(window.confirm('Delete this saved takeoff? This cannot be undone.')){
          var res = await sb.from('takeoffs').delete().eq('id', delBtn.dataset.tksavedDel);
          if(res.error){ window.alert('Could not delete saved takeoff: '+res.error.message); return; }
          renderSavedTakeoffs();
        }
      }
    });

    InfraBidAuth.getSession().then(function(session){
      if(!session) return; // auth.js guard is redirecting away
      sb = InfraBidAuth.getClient();
      renderSavedTakeoffs();
    });

    renderSchedule();
  })();

  /* ---------- valuation handoff from AI takeoff ---------- */
  (function(){
    var areaField=document.getElementById('spec-area');
    if(!areaField) return;
    try{
      var raw=localStorage.getItem('infrabid_takeoff_handoff');
      if(raw){
        var data=JSON.parse(raw);
        if(data && data.gia && (Date.now()-data.ts) < 1000*60*30){
          areaField.value=data.gia;
        }
        localStorage.removeItem('infrabid_takeoff_handoff');
      }
    }catch(e){}
  })();

  /* ---------- supplier marketplace (marketplace.html) ---------- */
  (function(){
    var grid=document.getElementById('supplier-grid');
    if(!grid) return;
    var $=function(id){ return document.getElementById(id); };

    var SUPPLIERS=[
      {id:'chadwicks', name:'Chadwicks', category:'Concrete & Aggregates', region:'Leinster', item:'Readymix C30', price:124.50, unit:'m³', trend:0.8, rating:4.6},
      {id:'roadstone', name:'Roadstone', category:'Concrete & Aggregates', region:'Leinster', item:'Aggregate', price:32.00, unit:'t', trend:1.2, rating:4.7},
      {id:'kilsaran', name:'Kilsaran', category:'Concrete & Aggregates', region:'Munster', item:'Readymix C30', price:121.00, unit:'m³', trend:-0.4, rating:4.4},
      {id:'brooks', name:'Brooks Timber', category:'Timber & Frame', region:'Leinster', item:'C24 Timber 4.8m', price:18.40, unit:'length', trend:0.5, rating:4.5},
      {id:'murray', name:'Murray Timber', category:'Timber & Frame', region:'Munster', item:'C24 Timber 4.8m', price:17.90, unit:'length', trend:-0.6, rating:4.3},
      {id:'heiton', name:'Heiton Buckley', category:'Steel & Rebar', region:'Leinster', item:'Rebar T12', price:0.96, unit:'kg', trend:0.9, rating:4.4},
      {id:'mbs', name:'MBS Steel', category:'Steel & Rebar', region:'Connacht', item:'Rebar T12', price:0.99, unit:'kg', trend:1.5, rating:4.2},
      {id:'dakota', name:'Dakota', category:'Insulation & Dry-lining', region:'Leinster', item:'Insulation PIR', price:34.10, unit:'m²', trend:0.3, rating:4.6},
      {id:'isocover', name:'Isocover', category:'Insulation & Dry-lining', region:'Munster', item:'Insulation PIR', price:33.20, unit:'m²', trend:-0.2, rating:4.5},
      {id:'murdocks', name:"Murdock's", category:'Roofing & Cladding', region:'Ulster (ROI)', item:'Roof Tile', price:14.80, unit:'m²', trend:0.7, rating:4.3},
      {id:'tegral', name:'Tegral', category:'Roofing & Cladding', region:'Leinster', item:'Roof Sheet', price:22.50, unit:'m²', trend:0.4, rating:4.5},
      {id:'wolseley', name:'Wolseley', category:'Plumbing & Civil', region:'Leinster', item:'PVC Pipe 110mm', price:6.40, unit:'m', trend:-0.3, rating:4.4}
    ];

    var catFilter='all', regionFilter='all', searchTerm='', sortBy='price-asc', selected={};

    function euro2(n){ return '€'+n.toFixed(2); }
    function esc(s){ var d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }
    function stars(r){ var full=Math.round(r); return '★★★★★'.slice(0,full)+'☆☆☆☆☆'.slice(0,5-full); }

    function selectedList(){ return SUPPLIERS.filter(function(s){ return selected[s.id]; }); }

    function renderCompareBar(){
      var n=selectedList().length;
      var bar=$('compare-bar');
      bar.classList.toggle('show', n>0);
      $('compare-count').textContent=n+' selected';
      $('compare-view-btn').style.display = n>=2 ? 'inline-block' : 'none';
    }

    function render(){
      var term=searchTerm;
      var list=SUPPLIERS.filter(function(s){
        if(catFilter!=='all' && s.category!==catFilter) return false;
        if(regionFilter!=='all' && s.region!==regionFilter) return false;
        if(term && s.name.toLowerCase().indexOf(term)===-1 && s.item.toLowerCase().indexOf(term)===-1) return false;
        return true;
      });
      list.sort(function(a,b){
        if(sortBy==='price-asc') return a.price-b.price;
        if(sortBy==='price-desc') return b.price-a.price;
        if(sortBy==='rating-desc') return b.rating-a.rating;
        if(sortBy==='name-asc') return a.name.localeCompare(b.name);
        return 0;
      });

      grid.innerHTML = list.length ? list.map(function(s){
        var trendUp=s.trend>=0;
        return '<div class="supplier-card">'+
          '<div class="cat">'+esc(s.category)+'</div>'+
          '<h3>'+esc(s.name)+'</h3>'+
          '<div class="region">'+esc(s.region)+'</div>'+
          '<div class="price-row"><span>'+esc(s.item)+'</span><b>'+euro2(s.price)+'/'+esc(s.unit)+'</b></div>'+
          '<div class="price-row"><span>7-day trend</span><span style="color:'+(trendUp?'#17A06A':'#C0392B')+'">'+(trendUp?'▲':'▼')+' '+Math.abs(s.trend).toFixed(1)+'%</span></div>'+
          '<div class="price-row"><span class="stars">'+stars(s.rating)+'</span><span>'+s.rating.toFixed(1)+'</span></div>'+
          '<div class="sc-foot">'+
            '<label class="cmp"><input type="checkbox" data-cmp="'+s.id+'" '+(selected[s.id]?'checked':'')+'> Compare</label>'+
            '<button class="btn btn-ghost btn-sm-quote" data-quote="'+s.id+'" style="padding:8px 14px;font-size:10px">Request Quote</button>'+
          '</div></div>';
      }).join('') : '<div style="grid-column:1/-1;padding:44px;text-align:center;color:var(--muted);font-size:13px">No suppliers match these filters.</div>';

      renderCompareBar();
    }

    document.querySelectorAll('#cat-chips .fchip').forEach(function(chip){
      chip.addEventListener('click', function(){
        document.querySelectorAll('#cat-chips .fchip').forEach(function(c){ c.classList.remove('active'); });
        chip.classList.add('active');
        catFilter=chip.dataset.cat;
        render();
      });
    });
    $('supp-region-filter').addEventListener('change', function(){ regionFilter=this.value; render(); });
    $('supp-sort').addEventListener('change', function(){ sortBy=this.value; render(); });
    $('supp-search').addEventListener('input', function(){ searchTerm=this.value.trim().toLowerCase(); render(); });

    grid.addEventListener('change', function(e){
      var cb=e.target.closest('[data-cmp]');
      if(!cb) return;
      if(cb.checked) selected[cb.dataset.cmp]=true; else delete selected[cb.dataset.cmp];
      renderCompareBar();
    });

    var quotePanel=$('quote-panel'), currentQuoteSupplier=null;
    grid.addEventListener('click', function(e){
      var qb=e.target.closest('[data-quote]');
      if(!qb) return;
      var s=SUPPLIERS.find(function(x){ return x.id===qb.dataset.quote; });
      if(!s) return;
      currentQuoteSupplier=s;
      $('quote-supplier-name').textContent=s.name;
      ['q-name','q-email','q-qty','q-notes'].forEach(function(id){ $(id).value=''; });
      document.querySelectorAll('#quote-panel .fld').forEach(function(f){ f.classList.remove('invalid'); });
      quotePanel.style.display='block';
      quotePanel.scrollIntoView({behavior: reduce?'auto':'smooth', block:'center'});
    });
    $('quote-cancel-btn').addEventListener('click', function(){ quotePanel.style.display='none'; });

    function readQuotes(){ try{ return JSON.parse(localStorage.getItem('infrabid_quote_requests')||'[]'); }catch(e){ return []; } }
    function saveQuote(q){ var list=readQuotes(); list.push(q); try{ localStorage.setItem('infrabid_quote_requests', JSON.stringify(list)); }catch(e){} }

    $('quote-send-btn').addEventListener('click', function(){
      var name=$('q-name').value.trim(), email=$('q-email').value.trim(), ok=true;
      $('q-name').closest('.fld').classList.remove('invalid');
      $('q-email').closest('.fld').classList.remove('invalid');
      if(!name){ $('q-name').closest('.fld').classList.add('invalid'); ok=false; }
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ $('q-email').closest('.fld').classList.add('invalid'); ok=false; }
      if(!ok || !currentQuoteSupplier) return;

      var ref='RFQ-'+Date.now().toString(36).toUpperCase();
      var data={ ref:ref, supplier:currentQuoteSupplier.name, item:currentQuoteSupplier.item,
        name:name, email:email, qty:$('q-qty').value.trim(), notes:$('q-notes').value.trim(), submittedAt:new Date().toISOString() };
      saveQuote(data);

      var subject='Quote Request '+ref+' — '+data.supplier;
      var body=['Reference: '+ref,'Supplier: '+data.supplier,'Item: '+data.item,'Requested by: '+data.name,
        'Email: '+data.email,'Quantity: '+(data.qty||'—'),'','Notes:',data.notes||'—'].join('\n');
      var mailto='mailto:info@infrabid.ie?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
      $('quote-hint').textContent='Request '+ref+' logged. Opening email draft…';
      quotePanel.style.display='none';
      window.location.href=mailto;
    });

    $('compare-view-btn').addEventListener('click', function(){
      var list=selectedList();
      var panel=$('compare-panel');
      var attrs=[['Category', function(s){return s.category;}], ['Region', function(s){return s.region;}],
        ['Reference Item', function(s){return s.item;}], ['Price', function(s){return euro2(s.price)+'/'+s.unit;}],
        ['7-Day Trend', function(s){return (s.trend>=0?'▲ ':'▼ ')+Math.abs(s.trend).toFixed(1)+'%';}],
        ['Rating', function(s){return s.rating.toFixed(1)+' '+stars(s.rating);}]];
      var html='<div class="ledger-head"><span>Side-by-Side Comparison</span><h4>'+list.length+' Suppliers Selected</h4></div>'+
        '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:'+(280+list.length*160)+'px">'+
        '<tr><td style="padding:10px 8px;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em"></td>'+
        list.map(function(s){ return '<td style="padding:10px 8px;font-weight:700;color:var(--navy);font-size:13px">'+esc(s.name)+'</td>'; }).join('')+'</tr>'+
        attrs.map(function(a){ return '<tr><td style="padding:10px 8px;border-top:1px solid var(--border);color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.06em">'+a[0]+'</td>'+
          list.map(function(s){ return '<td style="padding:10px 8px;border-top:1px solid var(--border);font-size:13px;color:var(--ink)">'+a[1](s)+'</td>'; }).join('')+'</tr>'; }).join('')+
        '</table></div>';
      panel.innerHTML=html;
      panel.style.display='block';
      panel.scrollIntoView({behavior: reduce?'auto':'smooth', block:'center'});
    });

    $('compare-clear-btn').addEventListener('click', function(){
      selected={};
      $('compare-panel').style.display='none';
      render();
    });

    render();
  })();

  /* ---------- Tender Import (tender-import.html) ---------- */
  (function(){
    var pdZone=document.getElementById('pd-zone');
    if(!pdZone) return;
    var $=function(id){ return document.getElementById(id); };

    // Illustrative placeholder rates only — same starter set as the Valuation
    // Suite's rate library. Replace with your real CECA schedule via that page.
    var DEFAULT_RATE_ITEMS=[
      {category:'Labour', description:'General Operative', unit:'per hr', rate:26.50},
      {category:'Labour', description:'Skilled Operative / Ganger', unit:'per hr', rate:34.00},
      {category:'Plant', description:'13T Excavator', unit:'per hr', rate:65.00},
      {category:'Plant', description:'6T Dumper', unit:'per hr', rate:38.00},
      {category:'Output Rate', description:'Lay 150mm dia. pipe', unit:'per m', rate:28.00},
      {category:'Output Rate', description:'Lay 300mm dia. pipe', unit:'per m', rate:42.00},
      {category:'Output Rate', description:'Excavate & backfill trench', unit:'per m³', rate:18.50},
      {category:'Materials', description:'300mm dia. pipe (supply)', unit:'per m', rate:55.00}
    ];
    var libraryItems=DEFAULT_RATE_ITEMS.slice();
    var boqRows=[], lastBoqTotals={subtotal:0,uplift:0,total:0,markup:0,contingency:0};
    var savedImports=[], specFiles=[], dwgFiles=[], pdFileName='';
    var sb=null;

    function bytesToSize(b){ if(b<1024) return b+' B'; if(b<1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB'; }
    function escAttr(s){ return (s==null?'':String(s)).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

    function scoreMatch(a,b){
      var wa=(a||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
      var wb=(b||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
      if(!wa.length||!wb.length) return 0;
      var setB={}; wb.forEach(function(w){ setB[w]=true; });
      var shared=wa.filter(function(w){ return setB[w]; }).length;
      return shared/Math.max(wa.length,wb.length);
    }
    function bestMatch(desc){
      var best=null, bestScore=0;
      libraryItems.forEach(function(it){
        var s=scoreMatch(desc, it.description);
        if(s>bestScore){ bestScore=s; best=it; }
      });
      return bestScore>=0.34 ? best : null;
    }

    function parseCSVText(text){
      var rows=[], row=[], field='', inQuotes=false;
      for(var i=0;i<text.length;i++){
        var c=text[i];
        if(inQuotes){
          if(c==='"'){ if(text[i+1]==='"'){ field+='"'; i++; } else inQuotes=false; }
          else field+=c;
        } else {
          if(c==='"') inQuotes=true;
          else if(c===','){ row.push(field); field=''; }
          else if(c==='\n' || c==='\r'){
            if(c==='\r' && text[i+1]==='\n') i++;
            row.push(field); field=''; rows.push(row); row=[];
          } else field+=c;
        }
      }
      if(field.length || row.length){ row.push(field); rows.push(row); }
      return rows.filter(function(r){ return r.length>1 || (r[0]&&r[0].trim()); });
    }

    async function parsePDFRows(file){
      var buf=await file.arrayBuffer();
      var pdf=await pdfjsLib.getDocument({data:buf}).promise;
      var rows=[];
      for(var p=1;p<=pdf.numPages;p++){
        var page=await pdf.getPage(p);
        var content=await page.getTextContent();
        var items=content.items.map(function(it){ return { str:it.str, x:it.transform[4], y:it.transform[5] }; });
        var byY={};
        items.forEach(function(it){
          var key=Math.round(it.y/3)*3;
          (byY[key]=byY[key]||[]).push(it);
        });
        var ys=Object.keys(byY).map(Number).sort(function(a,b){ return b-a; });
        ys.forEach(function(y){
          var rowItems=byY[y].slice().sort(function(a,b){ return a.x-b.x; });
          var cols=[], cur='', lastX=null;
          rowItems.forEach(function(it){
            if(lastX!==null && (it.x-lastX)>12){ cols.push(cur.trim()); cur=''; }
            cur+=(cur?' ':'')+it.str;
            lastX=it.x+(it.str.length*3);
          });
          if(cur.trim()) cols.push(cur.trim());
          if(cols.length) rows.push(cols);
        });
      }
      return rows;
    }

    var HEADER_KEYWORDS={
      description:['description','item description','particulars','details'],
      unit:['unit','uom','u.o.m','unit of measure'],
      qty:['qty','quantity','quant.']
    };
    function detectColumns(rows){
      for(var r=0;r<Math.min(rows.length,8);r++){
        var row=(rows[r]||[]).map(function(c){ return (c||'').toString().toLowerCase().trim(); });
        var map={};
        row.forEach(function(cell,i){
          Object.keys(HEADER_KEYWORDS).forEach(function(key){
            if(map[key]==null && HEADER_KEYWORDS[key].some(function(kw){ return cell.indexOf(kw)>-1; })) map[key]=i;
          });
        });
        if(map.description!=null && map.qty!=null) return { headerRow:r, map:map };
      }
      return null;
    }

    async function handlePricingFile(file){
      var ext=file.name.split('.').pop().toLowerCase();
      var statusEl=$('ti-parse-status');
      var rows;
      try{
        if(ext==='csv'){
          rows=parseCSVText(await file.text());
          statusEl.textContent='Parsed as CSV — '+rows.length+' rows detected.';
        } else if(ext==='xlsx' || ext==='xls'){
          if(!window.XLSX){ window.alert('Excel parser failed to load (check your connection) — try CSV instead.'); return; }
          var wb=XLSX.read(await file.arrayBuffer(), {type:'array'});
          var ws=wb.Sheets[wb.SheetNames[0]];
          rows=XLSX.utils.sheet_to_json(ws, {header:1, raw:false, defval:''});
          statusEl.textContent='Parsed as Excel ("'+wb.SheetNames[0]+'") — '+rows.length+' rows detected.';
        } else if(ext==='pdf'){
          if(!window.pdfjsLib){ window.alert('PDF parser failed to load (check your connection) — try CSV/Excel instead.'); return; }
          pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          rows=await parsePDFRows(file);
          statusEl.textContent='Best-effort PDF text extraction — '+rows.length+' rows detected. Please review every line carefully.';
        } else {
          window.alert('Unsupported file type. Use CSV, XLSX, or PDF.');
          return;
        }
      } catch(e){
        console.error('InfraBid: pricing document parse failed', e);
        window.alert('Could not parse this file: '+e.message);
        return;
      }

      var detected=detectColumns(rows);
      var startRow, colMap;
      if(detected){
        startRow=detected.headerRow+1; colMap=detected.map;
      } else {
        startRow=0; colMap={description:0, unit:1, qty:2};
        statusEl.textContent+=' Column headers not recognized — guessed Description/Unit/Qty as the first three columns; please verify every row.';
      }

      boqRows=[];
      for(var i=startRow;i<rows.length;i++){
        var r=rows[i];
        if(!r) continue;
        var desc=(r[colMap.description]||'').toString().trim();
        var qtyRaw=colMap.qty!=null ? (r[colMap.qty]||'').toString().replace(/,/g,'') : '';
        var qty=parseFloat(qtyRaw);
        if(!desc || !isFinite(qty) || qty<=0) continue;
        var unit=colMap.unit!=null ? (r[colMap.unit]||'').toString().trim() : '';
        var match=bestMatch(desc);
        boqRows.push({ description:desc, unit:unit||(match?match.unit:'ea'), qty:qty, rate:match?match.rate:0, matched:!!match });
      }

      if(!boqRows.length) window.alert('No line items could be extracted from this file. Check the format, or add items manually below.');
      $('ti-boq-wrap').style.display='block';
      renderBOQTable();
    }

    function renderBOQTable(){
      var body=$('ti-boq-body');
      body.innerHTML=boqRows.map(function(row,i){
        return '<div class="elem-row" data-row-idx="'+i+'">'+
          '<span><input type="text" class="ti-desc" data-field="description" value="'+escAttr(row.description)+'"></span>'+
          '<span><input type="text" class="ti-unit" data-field="unit" value="'+escAttr(row.unit)+'"></span>'+
          '<span><input type="number" class="ti-qty" data-field="qty" value="'+row.qty+'" step="0.01"></span>'+
          '<span><input type="number" class="ti-rate" data-field="rate" value="'+row.rate+'" step="0.01">'+
            '<div class="'+(row.matched?'':'unmatched')+'" style="font-size:9px;margin-top:2px">'+(row.matched?'Auto-matched':'Unmatched — set rate')+'</div></span>'+
          '<span class="ti-amount">'+euro((row.qty||0)*(row.rate||0))+'</span>'+
          '<button class="icon-btn del" data-remove-boq="'+i+'" aria-label="Remove line item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 6L6 18M6 6l12 12"/></svg></button>'+
        '</div>';
      }).join('');
      recomputeTotals();
    }

    function recomputeTotals(){
      var sub=0;
      Array.prototype.forEach.call(document.querySelectorAll('#ti-boq-body .elem-row'), function(rowEl){
        var idx=parseInt(rowEl.dataset.rowIdx,10);
        var row=boqRows[idx];
        if(!row) return;
        var amt=(row.qty||0)*(row.rate||0);
        sub+=amt;
        var amtEl=rowEl.querySelector('.ti-amount');
        if(amtEl) amtEl.textContent=euro(amt);
      });
      var markup=parseFloat($('ti-markup').value)||0, contingency=parseFloat($('ti-contingency').value)||0;
      var uplift=sub*((markup+contingency)/100);
      var total=sub+uplift;
      $('ti-subtotal').textContent=euro(sub);
      $('ti-uplift').textContent=euro(uplift);
      $('ti-total').textContent=euro(total);
      lastBoqTotals={ subtotal:sub, uplift:uplift, total:total, markup:markup, contingency:contingency };
    }

    $('ti-boq-body').addEventListener('input', function(e){
      var rowEl=e.target.closest('.elem-row');
      if(!rowEl) return;
      var idx=parseInt(rowEl.dataset.rowIdx,10);
      var field=e.target.dataset.field;
      if(!field || !boqRows[idx]) return;
      var val=(field==='qty'||field==='rate') ? (parseFloat(e.target.value)||0) : e.target.value;
      boqRows[idx][field]=val;
      if(field==='rate') boqRows[idx].matched=true;
      recomputeTotals();
    });
    $('ti-boq-body').addEventListener('click', function(e){
      var rmBtn=e.target.closest('[data-remove-boq]');
      if(!rmBtn) return;
      boqRows.splice(parseInt(rmBtn.dataset.removeBoq,10),1);
      renderBOQTable();
    });
    $('ti-markup').addEventListener('input', recomputeTotals);
    $('ti-contingency').addEventListener('input', recomputeTotals);

    $('ti-add-row-btn').addEventListener('click', function(){
      boqRows.push({ description:'New Item', unit:'ea', qty:1, rate:0, matched:false });
      $('ti-boq-wrap').style.display='block';
      renderBOQTable();
    });

    $('ti-export-btn').addEventListener('click', function(){
      if(!boqRows.length) return;
      var lines=['Description,Unit,Qty,Rate,Amount'];
      boqRows.forEach(function(r){
        lines.push('"'+(r.description||'').replace(/"/g,'""')+'",'+(r.unit||'')+','+r.qty+','+r.rate+','+((r.qty||0)*(r.rate||0)).toFixed(2));
      });
      lines.push(',,,Subtotal,'+lastBoqTotals.subtotal.toFixed(2));
      lines.push(',,,Markup+Contingency,'+lastBoqTotals.uplift.toFixed(2));
      lines.push(',,,Total,'+lastBoqTotals.total.toFixed(2));
      downloadBlob('InfraBid_TenderImport.csv', lines.join('\n'), 'text/csv;charset=utf-8');
    });

    $('ti-save-btn').addEventListener('click', async function(){
      if(!sb) return;
      if(!boqRows.length){ window.alert('Nothing to save yet.'); return; }
      var btn=this, orig=btn.textContent;
      var name=(pdFileName||'Tender Import')+' — '+euro(lastBoqTotals.total);
      var res=await sb.from('boq_imports').insert({
        name:name, rows:boqRows, markup_pct:lastBoqTotals.markup, contingency_pct:lastBoqTotals.contingency,
        subtotal:lastBoqTotals.subtotal, total:lastBoqTotals.total
      });
      if(res.error){ window.alert('Could not save: '+res.error.message); return; }
      btn.textContent='Saved ✓';
      setTimeout(function(){ btn.textContent=orig; }, 1600);
      renderSavedList();
    });

    async function renderSavedList(){
      if(!sb) return;
      var body=$('ti-saved-body');
      var res=await sb.from('boq_imports').select('*').order('created_at', { ascending:false }).limit(20);
      if(res.error){ console.error('InfraBid: failed to load tender imports', res.error); return; }
      savedImports=res.data||[];
      body.innerHTML=savedImports.length ? savedImports.map(function(r){
        return '<div class="board-row">'+
          '<div class="tname">'+escHtml(r.name)+'</div>'+
          '<div class="tval">'+euro(r.total)+'</div>'+
          '<div class="tval">'+(r.rows||[]).length+'</div>'+
          '<div class="tdeadline">'+new Date(r.created_at).toLocaleDateString('en-IE')+'</div>'+
          '<div class="board-actions">'+
            '<button class="icon-btn" data-load-boq="'+r.id+'" aria-label="Load tender import"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12l7 7 7-7"/></svg></button>'+
            '<button class="icon-btn del" data-del-boq="'+r.id+'" aria-label="Delete tender import"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/></svg></button>'+
          '</div></div>';
      }).join('') : '<div style="padding:24px 22px;text-align:center;color:var(--muted);font-size:13px">No saved tender imports yet.</div>';
    }

    $('ti-saved-body').addEventListener('click', async function(e){
      var loadBtn=e.target.closest('[data-load-boq]'), delBtn=e.target.closest('[data-del-boq]');
      if(loadBtn){
        var row=savedImports.find(function(r){ return String(r.id)===loadBtn.dataset.loadBoq; });
        if(!row) return;
        boqRows=(row.rows||[]).slice();
        $('ti-markup').value=row.markup_pct||0;
        $('ti-contingency').value=row.contingency_pct||0;
        $('ti-boq-wrap').style.display='block';
        renderBOQTable();
        $('ti-boq-wrap').scrollIntoView({behavior: reduce?'auto':'smooth', block:'center'});
      } else if(delBtn){
        if(window.confirm('Delete this saved tender import? This cannot be undone.')){
          var res=await sb.from('boq_imports').delete().eq('id', delBtn.dataset.delBoq);
          if(res.error){ window.alert('Could not delete: '+res.error.message); return; }
          renderSavedList();
        }
      }
    });

    async function loadRateLibrary(){
      if(!sb) return;
      var res=await sb.from('rate_items').select('*').order('created_at', { ascending:true });
      var custom=(res.error || !res.data) ? [] : res.data;
      libraryItems=DEFAULT_RATE_ITEMS.concat(custom);
    }

    function renderFileList(el, files){
      el.innerHTML=files.map(function(f){ return '<div><span>'+escHtml(f.name)+'</span><span>'+bytesToSize(f.size)+'</span></div>'; }).join('');
    }

    function wireZone(zoneEl, inputEl, onFiles){
      zoneEl.addEventListener('click', function(){ inputEl.click(); });
      zoneEl.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); inputEl.click(); } });
      zoneEl.addEventListener('dragover', function(e){ e.preventDefault(); zoneEl.classList.add('drag'); });
      zoneEl.addEventListener('dragleave', function(){ zoneEl.classList.remove('drag'); });
      zoneEl.addEventListener('drop', function(e){
        e.preventDefault(); zoneEl.classList.remove('drag');
        if(e.dataTransfer.files && e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      });
      inputEl.addEventListener('change', function(){ if(this.files && this.files.length) onFiles(this.files); });
    }

    wireZone(pdZone, $('pd-file-input'), function(files){
      var f=files[0]; pdFileName=f.name;
      renderFileList($('pd-filelist'), [f]);
      handlePricingFile(f);
    });
    wireZone($('spec-zone'), $('spec-file-input'), function(files){
      specFiles=specFiles.concat(Array.prototype.slice.call(files));
      renderFileList($('spec-filelist'), specFiles);
    });
    wireZone($('dwg-zone'), $('dwg-file-input'), function(files){
      dwgFiles=dwgFiles.concat(Array.prototype.slice.call(files));
      renderFileList($('dwg-filelist'), dwgFiles);
    });

    InfraBidAuth.getSession().then(function(session){
      if(!session) return; // auth.js guard is redirecting away
      sb=InfraBidAuth.getClient();
      loadRateLibrary();
      renderSavedList();
    });
  })();
})();
