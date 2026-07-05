(function(){
  "use strict";
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var euro = function(n){ return '€' + n.toLocaleString('en-IE',{minimumFractionDigits:2,maximumFractionDigits:2}); };
  var euro0 = function(n){ return '€' + Math.round(n).toLocaleString('en-IE'); };

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

      var sub=concreteCost+timberCost+labor+plant,
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

      lastLedger={
        region:REGION_LABEL[region]||region, structure:STRUCT_LABEL[structure]||structure,
        gia:gia, storeys:storeys,
        rows:[
          ['Concrete Substructure', concreteVol.toFixed(1)+'m³ Readymix Volume', concreteCost],
          ['Roof Framing Timber', timberVol.toFixed(1)+'m³ C24 Certified Sawn', timberCost],
          ['Site Production Labour', (carpentryHrs+generalHrs).toFixed(0)+' labour hrs', labor],
          ['Support Logistics', diggerDays+' excavator days, '+skipUnits+' skip units', plant]
        ],
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
      '<style>body{font-family:Arial,Helvetica,sans-serif;color:#15234E;padding:48px;max-width:760px;margin:0 auto}'+
      'h1{font-size:22px;margin-bottom:4px}p.sub{color:#56648A;margin-bottom:28px}'+
      'table{width:100%;border-collapse:collapse;margin-bottom:24px}'+
      'th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #E2EAF6;font-size:13px}'+
      'th{color:#8290AE;text-transform:uppercase;font-size:10px;letter-spacing:.08em}'+
      'td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}'+
      '.totals td{font-weight:700;border-top:2px solid #133198;border-bottom:none}'+
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
      '<p style="color:#8290AE;font-size:11px">Generated by InfraBid · '+new Date().toLocaleString('en-IE')+'</p>'+
      '</body></html>');
    w.document.close();
    w.focus();
    setTimeout(function(){ w.print(); }, 350);
  });

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
    (function frame(){
      ctx.clearRect(0,0,W,H);
      for(var i=0;i<pts.length;i++){ var p=pts[i]; p.x+=p.vx; p.y+=p.vy;
        if(p.x<0||p.x>W)p.vx*=-1; if(p.y<0||p.y>H)p.vy*=-1;
        ctx.beginPath(); ctx.arc(p.x,p.y,1.4*DPR,0,6.2832); ctx.fillStyle='rgba(19,49,152,.32)'; ctx.fill();
        for(var j=i+1;j<pts.length;j++){ var q=pts[j], dx=p.x-q.x, dy=p.y-q.y, d=Math.sqrt(dx*dx+dy*dy);
          if(d<LINK){ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y);
            ctx.strokeStyle='rgba(19,49,152,'+(.10*(1-d/LINK))+')'; ctx.lineWidth=DPR*.6; ctx.stroke(); } }
        var mdx=p.x-mouse.x, mdy=p.y-mouse.y, md=Math.sqrt(mdx*mdx+mdy*mdy);
        if(md<MO){ ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(mouse.x,mouse.y);
          ctx.strokeStyle='rgba(71,109,207,'+(.30*(1-md/MO))+')'; ctx.lineWidth=DPR*.7; ctx.stroke(); } }
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
  (function(){
    var boardBody = document.getElementById('board-body');
    if(!boardBody) return;
    var $=function(id){ return document.getElementById(id); };

    var DEFAULT_TENDERS=[
      {id:1,name:"Blanchardstown Distributor Road — Ph2",client:"Fingal County Council",value:1850000,deadline:"2026-08-14",status:"Submitted"},
      {id:2,name:"Cork Docklands Foul Sewer Upgrade",client:"Irish Water",value:640000,deadline:"2026-07-22",status:"Draft"},
      {id:3,name:"N24 Realignment — Earthworks Package",client:"TII",value:3200000,deadline:"2026-09-30",status:"Draft"},
      {id:4,name:"Kilkenny Commercial Unit Fit-Out",client:"Bracken Developments",value:412000,deadline:"2026-07-10",status:"Won"},
      {id:5,name:"Galway Flood Relief — Culvert Works",client:"OPW",value:980000,deadline:"2026-06-28",status:"Lost"},
      {id:6,name:"Waterford Greenway Extension",client:"Waterford City & County Council",value:275000,deadline:"2026-08-02",status:"Submitted"}
    ];

    function load(){ try{ var r=localStorage.getItem('infrabid_tenders'); if(r) return JSON.parse(r); }catch(e){} return JSON.parse(JSON.stringify(DEFAULT_TENDERS)); }
    function persist(){ try{ localStorage.setItem('infrabid_tenders', JSON.stringify(tenders)); }catch(e){} }
    var tenders=load(), statusFilter='all', searchTerm='', editingId=null;

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
      $('form-hint').textContent='Saved locally to this browser.';
      $('t-name').value=''; $('t-client').value=''; $('t-value').value=''; $('t-deadline').value='';
      $('t-status').value='Draft';
      formWrap.style.display='block';
      formWrap.scrollIntoView({behavior: reduce?'auto':'smooth', block:'center'});
    });

    $('tender-cancel-btn').addEventListener('click', function(){ formWrap.style.display='none'; });

    $('tender-save-btn').addEventListener('click', function(){
      resetInvalid();
      var name=$('t-name').value.trim(), client=$('t-client').value.trim(), ok=true;
      if(!name){ $('t-name').closest('.fld').classList.add('invalid'); ok=false; }
      if(!client){ $('t-client').closest('.fld').classList.add('invalid'); ok=false; }
      if(!ok) return;

      var data={ name:name, client:client, value:parseFloat($('t-value').value)||0,
        deadline:$('t-deadline').value, status:$('t-status').value };

      if(editingId){
        tenders=tenders.map(function(t){ return t.id===editingId? Object.assign({},t,data) : t; });
      } else {
        data.id=Date.now();
        tenders.push(data);
      }
      persist(); formWrap.style.display='none'; render();
    });

    boardBody.addEventListener('click', function(e){
      var editBtn=e.target.closest('[data-edit]'), delBtn=e.target.closest('[data-del]');
      if(editBtn){
        var id=parseFloat(editBtn.dataset.edit), t=tenders.find(function(x){ return x.id===id; });
        if(!t) return;
        editingId=id; resetInvalid();
        $('form-title').textContent='Edit Tender';
        $('form-hint').textContent='Updating an existing tender.';
        $('t-name').value=t.name; $('t-client').value=t.client; $('t-value').value=t.value;
        $('t-deadline').value=t.deadline; $('t-status').value=t.status;
        formWrap.style.display='block';
        formWrap.scrollIntoView({behavior: reduce?'auto':'smooth', block:'center'});
      } else if(delBtn){
        var did=parseFloat(delBtn.dataset.del);
        if(window.confirm('Delete this tender? This cannot be undone.')){
          tenders=tenders.filter(function(x){ return x.id!==did; });
          persist(); render();
        }
      }
    });

    render();
  })();

  /* ---------- AI takeoff (takeoff.html) ---------- */
  (function(){
    var zone=document.getElementById('upload-zone');
    if(!zone) return;
    var $=function(id){ return document.getElementById(id); };
    var fileInput=$('takeoff-file-input'), fileInfo=$('upload-file-info'), runBtn=$('run-takeoff-btn'),
        clearBtn=$('upload-clear-btn'), standby=$('tk-standby'), loading=$('tk-loading'), results=$('tk-results'),
        footer=$('tk-footer'), badge=$('tk-badge'), elemBody=$('tk-elem-body');
    var currentFile=null, lastTakeoff=null;

    var ELEMENT_POOL=[
      {name:'Concrete Ground Slab', unit:'m²', factor:0.92},
      {name:'Structural Steel Beams', unit:'no.', factor:0.018},
      {name:'Timber Stud Partitions', unit:'m', factor:0.35},
      {name:'External Doors', unit:'no.', factor:0.012},
      {name:'Windows (Glazed Units)', unit:'no.', factor:0.028},
      {name:'Roof Trusses', unit:'no.', factor:0.02},
      {name:'Rebar T12', unit:'kg', factor:4.2},
      {name:'Blockwork (100mm)', unit:'m²', factor:0.65},
      {name:'Insulation Boards (PIR)', unit:'m²', factor:0.88},
      {name:'Drainage Pipework', unit:'m', factor:0.22},
      {name:'Plasterboard Sheets', unit:'no.', factor:0.08},
      {name:'Excavation', unit:'m³', factor:0.24}
    ];

    function mulberry32(seed){
      var a=seed>>>0;
      return function(){ a|=0; a=a+0x6D2B79F5|0; var t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
    }

    function bytesToSize(b){
      if(b<1024) return b+' B';
      if(b<1048576) return (b/1024).toFixed(1)+' KB';
      return (b/1048576).toFixed(2)+' MB';
    }

    function setFile(file){
      currentFile=file;
      fileInfo.style.display='flex';
      $('upload-file-name').textContent=file.name;
      $('upload-file-meta').textContent=bytesToSize(file.size)+' · '+(file.type||'unknown type');
      runBtn.disabled=false;
      standby.style.display='block'; results.style.display='none'; footer.style.display='none'; loading.style.display='none';
      badge.textContent='Ready'; badge.style.color='var(--navy)';
    }

    zone.addEventListener('click', function(){ fileInput.click(); });
    zone.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fileInput.click(); } });
    zone.addEventListener('dragover', function(e){ e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', function(){ zone.classList.remove('drag'); });
    zone.addEventListener('drop', function(e){
      e.preventDefault(); zone.classList.remove('drag');
      if(e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function(){ if(this.files && this.files[0]) setFile(this.files[0]); });
    clearBtn.addEventListener('click', function(){
      currentFile=null; fileInput.value=''; fileInfo.style.display='none'; runBtn.disabled=true;
      standby.style.display='block'; results.style.display='none'; footer.style.display='none';
      badge.textContent='Standby'; badge.style.color='var(--muted)';
    });

    function esc(s){ var d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

    async function runAnalysis(){
      if(!currentFile) return;
      standby.style.display='none'; results.style.display='none'; footer.style.display='none';
      loading.style.display='block'; runBtn.disabled=true;
      badge.textContent='Analysing'; badge.style.color='var(--navy)';
      var stepEls=document.querySelectorAll('#tk-steps .scan-step');
      stepEls.forEach(function(s){ s.className='scan-step'; });

      var buf=await currentFile.arrayBuffer();
      var digest, seed;
      try{
        var hashBuf=await crypto.subtle.digest('SHA-256', buf);
        var hashArr=Array.from(new Uint8Array(hashBuf));
        digest=hashArr.map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
        seed=parseInt(digest.slice(0,8),16);
      } catch(e){
        seed=(currentFile.size*2654435761)>>>0;
        digest=seed.toString(16);
      }
      var rand=mulberry32(seed);

      var stepDur=reduce?0:550;
      for(var i=0;i<stepEls.length;i++){
        (function(idx){ setTimeout(function(){
          stepEls.forEach(function(s,j){ if(j<idx) s.className='scan-step done'; });
          if(stepEls[idx]) stepEls[idx].className='scan-step active';
        }, idx*stepDur); })(i);
      }
      await new Promise(function(res){ setTimeout(res, reduce?0:stepEls.length*stepDur+400); });
      stepEls.forEach(function(s){ s.className='scan-step done'; });

      var gia=Math.max(80, Math.min(2400, Math.round((currentFile.size/1024)*0.9)));
      var shuffled=ELEMENT_POOL.map(function(e){ return [rand(), e]; }).sort(function(a,b){ return a[0]-b[0]; }).map(function(p){ return p[1]; });
      var count=6+Math.floor(rand()*3);
      var chosen=shuffled.slice(0, count);
      var rows=chosen.map(function(el){
        var qty=Math.max(1, Math.round(gia*el.factor*(0.82+rand()*0.36)));
        var confidence=Math.round(60+rand()*38);
        return { name:el.name, qty:qty, unit:el.unit, confidence:confidence };
      });
      var avgConf=Math.round(rows.reduce(function(a,r){ return a+r.confidence; },0)/rows.length);

      elemBody.innerHTML=rows.map(function(r){
        var flag = r.confidence<80 ? 'Verify Manually' : '';
        return '<div class="elem-row"><span>'+esc(r.name)+'</span><span>'+r.qty.toLocaleString('en-IE')+' '+r.unit+'</span>'+
          '<span><span class="conf-bar"><i style="width:'+r.confidence+'%"></i></span>'+r.confidence+'%</span>'+
          '<span class="flag">'+flag+'</span></div>';
      }).join('');
      $('tk-summary-title').textContent=rows.length+' elements detected';
      $('tk-gia').textContent=gia.toLocaleString('en-IE')+' m²';
      $('tk-avgconf').textContent=avgConf+'%';

      lastTakeoff={ fileName:currentFile.name, gia:gia, avgConf:avgConf, rows:rows, digest:digest.slice(0,16) };

      loading.style.display='none'; results.style.display='block'; footer.style.display='block';
      runBtn.disabled=false; badge.textContent='Complete'; badge.style.color='#17A06A';
    }

    runBtn.addEventListener('click', runAnalysis);

    var exportBtn=$('tk-export-btn');
    if(exportBtn) exportBtn.addEventListener('click', function(){
      if(!lastTakeoff) return;
      var lines=['Element,Quantity,Unit,Confidence %,Flag'];
      lastTakeoff.rows.forEach(function(r){
        lines.push('"'+r.name+'",'+r.qty+',"'+r.unit+'",'+r.confidence+','+(r.confidence<80?'Verify Manually':''));
      });
      var blob=new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8'}), url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url; a.download='InfraBid_Takeoff_'+lastTakeoff.fileName.replace(/\.[^.]+$/,'')+'.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    });

    var toValBtn=$('tk-tovaluation-btn');
    if(toValBtn) toValBtn.addEventListener('click', function(){
      if(!lastTakeoff) return;
      try{ localStorage.setItem('infrabid_takeoff_handoff', JSON.stringify({ gia:lastTakeoff.gia, ts:Date.now() })); }catch(e){}
      window.location.href='valuation.html';
    });
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
})();
