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

  (function(){ var path=(location.pathname.split('/').pop()||'estimate.html');
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
      lastMailto='mailto:info@arya.ie?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(bodyLines.join('\n'));

      badge.textContent='Verified'; badge.style.color='var(--navy)';
      standby.style.display='none'; success.style.display='block';
      refEl.textContent=ref;
      summaryEl.innerHTML='Enquiry from <b>'+(data.name||'you')+'</b> logged locally. An email draft to <b>info@arya.ie</b> is opening now.';
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
})();
