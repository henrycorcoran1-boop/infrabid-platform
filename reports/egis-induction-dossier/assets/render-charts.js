/* ==========================================================================
   Chart instances for the dossier. Every figure in the document is drawn here
   from data stated in the body text or the source tables, so the graphic and
   the prose cannot drift apart.
   ========================================================================== */
/* eslint-env browser */
(function () {
  'use strict';

  var EC = window.EgisCharts;
  var EM = window.EgisMap;
  var C = EC.C, SOFT = EC.SOFT, el = EC.el, txt = EC.txt, wrapText = EC.wrapText;

  var diag = { missing: [], drawn: 0 };
  function has(id) {
    if (document.getElementById(id)) return true;
    diag.missing.push(id);
    return false;
  }
  function draw(id, fn) {
    if (!has(id)) return;
    try { fn(); diag.drawn++; } catch (e) { diag.missing.push(id + ':' + e.message); }
  }

  /* ================================================================== p1 */

  /* Cover motif: the same island geometry as section 03, reduced to a glow of
     live assignment positions. Decorative — the map that carries meaning is on
     page 6, and this one is marked aria-hidden in the markup. */
  draw('ch-cover-map', function () {
    var geo = window.__ireland;
    var w = 420, h = 500;
    var s = EC.svgRoot('ch-cover-map', w, h);
    var vb = geo.viewBox, pad = 3;
    var gx = vb[0] - pad, gy = vb[1] - pad, gw = vb[2] + 2 * pad, gh = vb[3] + 2 * pad;
    var k = Math.min(w / gw, h / gh);
    var ox = (w - gw * k) / 2 - gx * k, oy = (h - gh * k) / 2 - gy * k;
    var tf = 'translate(' + ox + ',' + oy + ') scale(' + k + ')';

    el('path', { d: geo.roi, fill: 'rgba(255,255,255,.045)', transform: tf }, s);
    el('path', {
      d: geo.roi, fill: 'none', stroke: 'rgba(171,192,34,.42)', 'stroke-width': 0.34,
      transform: tf, 'vector-effect': 'non-scaling-stroke'
    }, s);
    el('path', {
      d: geo.ni, fill: 'none', stroke: 'rgba(255,255,255,.14)', 'stroke-width': 0.34,
      'stroke-dasharray': '2 1.6', transform: tf, 'vector-effect': 'non-scaling-stroke'
    }, s);

    var toRad = Math.PI / 180, p = geo.projection;
    function T(lon, lat) {
      var la = lat * toRad, lo = lon * toRad;
      var rho = p.R * p.F / Math.pow(Math.tan(Math.PI / 4 + la / 2), p.n);
      var th = p.n * (lo - p.lon0 * toRad);
      return [rho * Math.sin(th) * k + ox, (rho * Math.cos(th) - p.rho0) * k + oy];
    }
    EM.LIVE.forEach(function (a) {
      var pt = T(EM.PLACES[a.at][0], EM.PLACES[a.at][1]);
      el('circle', {
        cx: pt[0].toFixed(1), cy: pt[1].toFixed(1), r: 9,
        fill: '#d5f311', opacity: 0.13
      }, s);
      el('circle', {
        cx: pt[0].toFixed(1), cy: pt[1].toFixed(1), r: 2.8, fill: '#d5f311', opacity: 0.9
      }, s);
    });
  });

  /* ================================================================== p2 */

  /* Evidence grades across the live register: 10 confirmed, 3 market-context. */
  draw('ch-grades', function () {
    var s = EC.svgRoot('ch-grades', 300, 92);
    var data = [
      { k: 'Grade A · confirmed', v: 10, c: C.gradeA },
      { k: 'Grade C · to confirm', v: 3, c: C.gradeC }
    ];
    var total = 13, x = 0, w = 300, barH = 28;
    data.forEach(function (d) {
      var bw = (d.v / total) * w;
      el('rect', { x: x, y: 18, width: bw - 2, height: barH, rx: 2, fill: d.c }, s);
      txt(s, x + (bw - 2) / 2, 18 + barH / 2 + 3.8, String(d.v), {
        'font-size': 11, 'font-weight': 800, fill: '#fff', 'text-anchor': 'middle'
      });
      x += bw;
    });
    txt(s, 0, 9, 'THE THIRTEEN LIVE ASSIGNMENTS, BY EVIDENCE GRADE', {
      'font-size': 5.8, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.13em'
    });
    var lx = 0;
    data.forEach(function (d) {
      el('rect', { x: lx, y: 60, width: 7, height: 7, rx: 1.2, fill: d.c }, s);
      txt(s, lx + 10, 65.8, d.k, { 'font-size': 6.2, fill: C.ink2, 'font-weight': 600 });
      lx += d.k.length * 3.5 + 22;
    });
    txt(s, 0, 84, 'No live assignment rests on Grade B evidence alone.', {
      'font-size': 6, fill: C.ink4, 'font-weight': 500
    });
  });

  /* ================================================================== p3 */

  /* Composition strip: the 13 live assignments as one ordered row. */
  draw('ch-compstrip', function () {
    var w = 660, h = 142;
    var s = EC.svgRoot('ch-compstrip', w, h);
    var groups = [
      { k: 'Design and capital', sub: 'at or approaching a consent gate', n: 6, cat: 'roads',
        items: ['N/M20 Cork to Limerick', 'Donegal TEN-T', 'N3 Virginia Bypass',
                'N72/N73 Mallow', 'Luas Finglas', 'R132 Drogheda'] },
      { k: 'Construction', sub: 'engineer to the contractor', n: 1, cat: 'active',
        items: ['N21 Adare Bypass'] },
      { k: 'Operations and maintenance', sub: 'live to the early 2030s', n: 3, cat: 'ops',
        items: ['Dublin and Jack Lynch Tunnels, MOCC', 'MMaRC Network C', 'East-Link Toll Bridge'] },
      { k: 'Requiring confirmation', sub: 'publicly linked, scope unclear', n: 3, cat: 'none',
        items: ['Dún Laoghaire Living Streets', 'Tunnel digital asset transformation',
                'Cork Area Commuter Rail signalling'] }
    ];
    var total = 13, x = 0, barY = 50, barH = 48, gapPx = 3;
    txt(s, 0, 8, 'THIRTEEN LIVE ASSIGNMENTS', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.15em'
    });
    txt(s, w, 8, 'band width is proportional to count, not to contract value', {
      'font-size': 5.9, fill: C.ink4, 'font-weight': 500, 'text-anchor': 'end'
    });

    groups.forEach(function (g) {
      var bw = (g.n / total) * w;
      el('rect', {
        x: x, y: barY, width: bw - gapPx, height: barH, rx: 2.4, fill: C[g.cat]
      }, s);
      /* per-assignment ticks inside the band */
      for (var i = 1; i < g.n; i++) {
        el('line', {
          x1: x + (bw - gapPx) * (i / g.n), y1: barY + 4,
          x2: x + (bw - gapPx) * (i / g.n), y2: barY + barH - 4,
          stroke: 'rgba(255,255,255,.55)', 'stroke-width': 1
        }, s);
      }
      txt(s, x + 5, barY + barH / 2 + 4.4, String(g.n), {
        'font-size': 12, 'font-weight': 800, fill: '#fff'
      });
      wrapText(s, x, barY - 13, g.k, bw - 6, 7, { fill: C[g.cat], 'font-weight': 800 }, 7.8);
      wrapText(s, x, barY - 4, g.sub, bw - 6, 5.7, { fill: C.ink4, 'font-weight': 500 }, 6.4);
      wrapText(s, x, barY + barH + 10, g.items.join(' · '), bw - 8, 5.7, {
        fill: C.ink3, 'font-weight': 500
      }, 6.6);
      x += bw;
    });
  });

  /* ================================================================== p4 */

  /* Group performance. 2024 revenue is reported at €2.164bn on 14% growth, so
     the 2023 comparator is derived as 2.164 / 1.14. Labelled as derived. */
  draw('ch-group', function () {
    var w = 330, h = 176;
    var s = EC.svgRoot('ch-group', w, h);
    var rev24 = 2.164, rev23 = 2.164 / 1.14;
    var base = 40, top = 34, plotH = 96;
    var max = 2.4;
    var bars = [
      { k: '2023', v: rev23, c: '#c9d2cc', note: 'derived from the stated growth rate' },
      { k: '2024', v: rev24, c: C.roads, note: 'reported' }
    ];
    bars.forEach(function (b, i) {
      var bw = 52, bx = base + i * 86;
      var bh = (b.v / max) * plotH;
      el('path', {
        d: EC.barPath(bx, top + plotH - bh, bw, bh, 3.2, 'top'), fill: b.c
      }, s);
      txt(s, bx + bw / 2, top + plotH - bh - 6, '€' + b.v.toFixed(3) + 'bn', {
        'font-size': 7.6, 'font-weight': 800, fill: i ? C.roads : C.ink3, 'text-anchor': 'middle'
      });
      txt(s, bx + bw / 2, top + plotH + 11, b.k, {
        'font-size': 7.2, 'font-weight': 800, fill: C.ink, 'text-anchor': 'middle'
      });
      wrapText(s, bx + bw / 2, top + plotH + 20, b.note, 74, 5.6, {
        'text-anchor': 'middle', fill: C.ink4, 'font-weight': 500
      }, 6.4);
    });
    el('line', {
      x1: base - 8, y1: top + plotH, x2: base + 138, y2: top + plotH,
      stroke: C.ink, 'stroke-width': 0.9
    }, s);

    /* growth arrow between the two bars */
    var y24 = top + plotH - (rev24 / max) * plotH;
    var y23 = top + plotH - (rev23 / max) * plotH;
    el('path', {
      d: 'M' + (base + 54) + ',' + (y23 - 4) + 'C' + (base + 74) + ',' + (y23 - 14) +
         ' ' + (base + 74) + ',' + (y24 - 8) + ' ' + (base + 84) + ',' + (y24 - 4),
      fill: 'none', stroke: C.lime, 'stroke-width': 1.6
    }, s);
    txt(s, base + 69, y23 - 16, '+14%', {
      'font-size': 7.4, 'font-weight': 800, fill: C.roads, 'text-anchor': 'middle'
    });

    /* secondary measures, kept off the revenue axis — never a second y-scale */
    var sx = 208;
    [{ k: 'Net profit', v: '+75%', c: C.roads },
     { k: 'Order backlog', v: 'record', c: C.ink3 },
     { k: 'Outside France', v: '72%', c: C.ink3 }].forEach(function (m, i) {
      var y = top + i * 34;
      el('line', { x1: sx, y1: y - 8, x2: w, y2: y - 8, stroke: C.rule, 'stroke-width': 0.6 }, s);
      txt(s, sx, y + 6, m.v, { 'font-size': 13, 'font-weight': 800, fill: m.c });
      txt(s, sx, y + 15, m.k, { 'font-size': 6, fill: C.ink4, 'font-weight': 600 });
    });
    txt(s, 0, 10, 'GROUP REVENUE', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.15em'
    });
    txt(s, sx, 10, 'ALSO REPORTED FOR 2024', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.15em'
    });
  });

  /* Irish history timeline, 1959 to 2026. The last five years carry most of the
     events, so the axis is banded: 1959-2014 is compressed and the break is
     drawn on the axis rather than left implicit. */
  draw('ch-history', function () {
    EC.timeline('ch-history', {
      w: 660, h: 152, axisY: 76, pad: 42,
      bands: [
        { from: 1959, to: 2014, share: 42 },
        { from: 2021, to: 2027, share: 58 }
      ],
      events: [
        { at: 1959, y: '1959', k: 'JB Barry & Partners founded', up: true, c: C.roads, big: true, wrap: 62 },
        { at: 1987, y: '1987', k: 'Egis Engineering Ireland registered', up: false, c: C.ink3, wrap: 62 },
        { at: 1994, y: '1994', k: 'Egis enters Ireland; Luas Lines A and B design team', up: true, c: C.rail, big: true, wrap: 68, stem: 40 },
        { at: 2000, y: '2000', k: 'Barry Transportation established', up: false, c: C.ink3, wrap: 60, stem: 42 },
        { at: 2005, y: '2005', k: 'ERTO established', up: true, c: C.ops, wrap: 52 },
        { at: 2013, y: '2013', k: 'Egis Lagan Services JV', up: false, c: C.ops, wrap: 56 },
        { at: 2022, y: '2022', k: 'Tikehau Capital takes control', up: true, c: C.active, wrap: 62 },
        { at: 2023.2, y: '2023', k: 'JB Barry acquisition cleared, M/23/012', up: false, c: C.roads, big: true, wrap: 66 },
        { at: 2024.5, y: 'Jul 2024', k: 'Rebrand to Egis completes', up: true, c: C.roads, big: true, wrap: 58, stem: 42 },
        { at: 2025.6, y: 'Aug 2025', k: '630+ staff; 100 new roles announced', up: false, c: C.lime, big: true, wrap: 60, stem: 42 },
        { at: 2026.6, y: 'Jan 2026', k: 'UK and Ireland reorganisation', up: true, c: C.active, big: true, wrap: 58 }
      ]
    });
  });

  /* ================================================================== p5 */

  /* Entity map: four legal entities and what the public record places in each. */
  draw('ch-entities', function () {
    var w = 660, h = 208;
    var s = EC.svgRoot('ch-entities', w, h);
    var boxW = 152, boxH = 44, gap = 17, y0 = 38;
    var ents = [
      { k: 'Egis Engineering Ireland Ltd', sub: 'Consultancy and design · reg. 1987', cat: 'roads',
        items: ['N/M20 · Donegal TEN-T · N3 Virginia', 'N72/N73 Mallow · Luas Finglas',
                'R132 Drogheda · N21 Adare', '~200 engineers, four offices'] },
      { k: 'Egis Road & Tunnel Operation Ireland', sub: 'Tunnel and motorway control · est. 2005', cat: 'ops',
        items: ['Dublin Tunnel', 'Jack Lynch Tunnel', 'Motorway Operations Control Centre',
                'East-Link Toll Bridge'] },
      { k: 'Egis Projects Ireland Ltd', sub: 'PPP, tolling and ITS · est. 2001', cat: 'active',
        items: ['Concession and tolling positions', 'Owned by Egis Projects SA',
                'M1 Dundalk toll via Northlink', 'Disability Toll Exemption Scheme'] },
      { k: 'Egis Lagan Services Ltd', sub: 'Maintenance and renewals · est. 2013', cat: 'rail',
        items: ['MMaRC Network C', '~328km, south and south-east', 'Joint venture with Lagan',
                'Renewals design interface'] }
    ];
    var totalW = ents.length * boxW + (ents.length - 1) * gap;
    var x0 = (w - totalW) / 2;

    /* parent */
    el('rect', { x: w / 2 - 74, y: 2, width: 148, height: 20, rx: 2.4, fill: C.petrol }, s);
    txt(s, w / 2, 15, 'EGIS  ·  IRELAND', {
      'font-size': 7.4, 'font-weight': 800, fill: C.limeBright, 'text-anchor': 'middle',
      'letter-spacing': '.14em'
    });

    ents.forEach(function (e, i) {
      var x = x0 + i * (boxW + gap);
      /* connector */
      el('path', {
        d: 'M' + (w / 2) + ',22 V' + (y0 - 12) + ' H' + (x + boxW / 2) + ' V' + y0,
        fill: 'none', stroke: C.rule, 'stroke-width': 1
      }, s);
      el('rect', {
        x: x, y: y0, width: boxW, height: boxH, rx: 2.4,
        fill: '#fff', stroke: C[e.cat], 'stroke-width': 1.2
      }, s);
      el('rect', { x: x, y: y0, width: boxW, height: 3, rx: 1.5, fill: C[e.cat] }, s);
      wrapText(s, x + 7, y0 + 15, e.k, boxW - 14, 7, { fill: C.ink, 'font-weight': 800 }, 8);
      wrapText(s, x + 7, y0 + (e.k.length > 30 ? 32 : 24), e.sub, boxW - 14, 5.8, {
        fill: C.ink4, 'font-weight': 600
      }, 6.6);

      /* holdings band */
      var by = y0 + boxH + 8;
      el('rect', {
        x: x, y: by, width: boxW, height: 92, rx: 2.4, fill: SOFT[e.cat]
      }, s);
      e.items.forEach(function (it, j) {
        el('circle', { cx: x + 8, cy: by + 15 + j * 21, r: 1.5, fill: C[e.cat] }, s);
        wrapText(s, x + 13, by + 17 + j * 21, it, boxW - 20, 5.9, {
          fill: C.ink2, 'font-weight': 600
        }, 6.6);
      });
    });
  });

  /* ================================================================== p6 */

  draw('ch-map', function () {
    EM.portfolioMap('ch-map', window.__ireland, { w: 330, h: 432 });
  });
  draw('ch-mapkey', function () {
    EM.mapKey('ch-mapkey', { w: 175 });
  });

  /* ================================================================== p7 */

  draw('ch-composition', function () {
    EC.donut('ch-composition', {
      w: 340, h: 268, r: 84, thickness: 30, centre: '13', centreLabel: 'LIVE',
      centreSize: 30,
      data: [
        { k: 'Design and capital, consent stage', v: 6, c: C.roads },
        { k: 'Construction stage', v: 1, c: C.active },
        { k: 'Operations and maintenance', v: 3, c: C.ops },
        { k: 'Requiring confirmation', v: 3, c: C.none }
      ]
    });
  });

  /* Published-value coverage as a unit chart: one square per assignment. */
  draw('ch-valcover', function () {
    var w = 300, h = 66;
    var s = EC.svgRoot('ch-valcover', w, h);
    var cells = [
      { c: C.roads, on: true }, { c: C.ops, on: true }, { c: C.roads, on: true }
    ];
    for (var i = 0; i < 10; i++) cells.push({ c: '#d8dedb', on: false });
    var cw = 20, gap = 3.4;
    cells.forEach(function (cell, i) {
      el('rect', {
        x: i * (cw + gap), y: 16, width: cw, height: 20, rx: 2,
        fill: cell.on ? cell.c : '#e7ebe9',
        stroke: cell.on ? 'none' : '#d3dad7', 'stroke-width': cell.on ? 0 : 0.6
      }, s);
    });
    txt(s, 0, 9, 'PUBLISHED VALUE, BY ASSIGNMENT', {
      'font-size': 5.8, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.14em'
    });
    txt(s, 0, 48, '3 with a published value', {
      'font-size': 6.4, 'font-weight': 700, fill: C.ink
    });
    txt(s, 0, 58, '10 with none — the internal register is the only source', {
      'font-size': 6.1, 'font-weight': 500, fill: C.ink4
    });
  });

  draw('ch-values', function () {
    EC.hbar('ch-values', {
      w: 660, labelW: 148, valueW: 118, rowH: 30, barH: 14, gap: 10, max: 950,
      ticks: 5, tickFmt: function (v) { return '€' + Math.round(v) + 'm'; },
      data: [
        { k: 'Donegal TEN-T Priority Route', sub: 'approved Government estimate',
          lo: 780, hi: 915, c: C.roads, vl: '€780–915m', note: 'range, not a point' },
        { k: 'Dublin and Jack Lynch Tunnels, MOCC', sub: 'contract ceiling, 16 years',
          v: 600, c: C.ops, vl: '€600m', note: 'ceiling ex-VAT, 8 + 8 years' },
        { k: 'N21 Adare Bypass', sub: 'design and construction contract',
          v: 150, c: C.roads, vl: '~€150m', note: 'signed March 2025' },
        { k: 'Superseded Donegal figure', sub: 'legacy JB Barry project page',
          v: 350, c: '#c3ccc5', vl: '€350m', note: 'do not quote — see section 12' }
      ]
    });
    /* the ten assignments with no published value, named beneath the axis */
    var host = document.getElementById('ch-values');
    var s = host.querySelector('svg');
    var y = Number(s.getAttribute('viewBox').split(' ')[3]) - 4;
    txt(s, 0, y, 'No published value: N/M20 · N3 Virginia · N72/N73 Mallow · Luas Finglas · ' +
      'R132 Drogheda · MMaRC Network C · East-Link · Dún Laoghaire · Tunnel digital assets · Cork Area Commuter Rail', {
      'font-size': 5.9, fill: C.ink4, 'font-weight': 600
    });
  });

  /* ================================================================== p8 */

  draw('ch-stagefunnel', function () {
    var w = 660, h = 108;
    var s = EC.svgRoot('ch-stagefunnel', w, h);
    var stages = [
      { k: 'TII Phase 3', sub: 'design and environmental evaluation', n: 3, cat: 'roads',
        items: 'N/M20 · N3 Virginia · N72/N73 Mallow' },
      { k: 'Statutory process', sub: 'application lodged or in consultation', n: 2, cat: 'roads',
        items: 'Donegal TEN-T · R132 Drogheda' },
      { k: 'Consented', sub: 'approval secured, awaiting funding', n: 1, cat: 'rail',
        items: 'Luas Finglas' },
      { k: 'In construction', sub: 'engineer to the contractor', n: 1, cat: 'active',
        items: 'N21 Adare Bypass' },
      { k: 'Operating', sub: 'off the consent sequence entirely', n: 3, cat: 'ops',
        items: 'Tunnels and MOCC · Network C · East-Link' },
      { k: 'To confirm', sub: 'stage not established publicly', n: 3, cat: 'none',
        items: 'Dún Laoghaire · Tunnel digital · Cork Area Commuter Rail' }
    ];
    var gap = 8, boxW = (w - gap * (stages.length - 1)) / stages.length;
    stages.forEach(function (st, i) {
      var x = i * (boxW + gap);
      var barH = 8 + st.n * 11;
      var y = 46 - barH + 26;
      el('rect', { x: x, y: 24, width: boxW, height: 48, rx: 2.4, fill: SOFT[st.cat] }, s);
      el('rect', { x: x, y: y, width: boxW, height: barH, rx: 2.4, fill: C[st.cat] }, s);
      txt(s, x + boxW / 2, 24 - 12, String(st.n), {
        'font-size': 13, 'font-weight': 800, fill: C[st.cat], 'text-anchor': 'middle'
      });
      wrapText(s, x + boxW / 2, 24 - 4, st.k, boxW - 2, 6.6, {
        'text-anchor': 'middle', fill: C.ink, 'font-weight': 800
      }, 7.4);
      wrapText(s, x + boxW / 2, 80, st.sub, boxW - 2, 5.7, {
        'text-anchor': 'middle', fill: C.ink4, 'font-weight': 600
      }, 6.4);
      wrapText(s, x + boxW / 2, 94, st.items, boxW - 2, 5.6, {
        'text-anchor': 'middle', fill: C.ink3, 'font-weight': 500
      }, 6.3);
      if (i < stages.length - 1 && i < 4) {
        el('path', {
          d: 'M' + (x + boxW + 1.4) + ',48 l4.4,0 m-1.6,-2.2 l2.2,2.2 l-2.2,2.2',
          stroke: C.ink4, 'stroke-width': 0.9, fill: 'none', 'stroke-linecap': 'round'
        }, s);
      }
    });
  });

  /* ================================================================== p9 */

  draw('ch-nm20', function () {
    EC.corridor('ch-nm20', {
      w: 660, h: 118, cat: 'roads', c: C.roads, from: 'Blarney', to: 'Patrickswell',
      segments: [{ a: 0, b: 1, label: 'approximately 80km of motorway and dual carriageway' }],
      nodes: [
        { at: 0.14, k: 'Blarney interchange', kind: 'junction', up: false, wrap: 60 },
        { at: 0.33, k: 'Mallow freight hub', kind: 'hub', up: true, wrap: 60 },
        { at: 0.42, k: 'N72/N73 Mallow tie-in', kind: 'junction', up: false, wrap: 62 },
        { at: 0.60, k: 'Charleville', kind: 'junction', up: true, wrap: 56 },
        { at: 0.78, k: 'Attyflin junction, revised April 2026', kind: 'junction', c: C.ops, up: false, wrap: 72 }
      ]
    });
  });

  draw('ch-donegal', function () {
    EC.corridor('ch-donegal', {
      w: 660, h: 118, cat: 'roads', c: C.roads,
      from: 'Ballybofey and Stranorlar', to: 'Strabane and the A5',
      padL: 78, padR: 74,
      segments: [
        { a: 0, b: 0.30, label: 'Section 1' },
        { a: 0.33, b: 0.63, label: 'Section 2' },
        { a: 0.66, b: 0.90, label: 'Section 3' },
        { a: 0.90, b: 1, dashed: true, c: C.ink4, label: 'cross-border' }
      ],
      nodes: [
        { at: 0.33, k: 'Letterkenny', kind: 'hub', up: true, wrap: 56 },
        { at: 0.64, k: 'Manorcunningham', kind: 'junction', up: false, wrap: 64 },
        { at: 0.88, k: 'Lifford', kind: 'junction', up: true, wrap: 50 }
      ]
    });
  });

  /* ================================================================= p10 */

  draw('ch-n3', function () {
    EC.corridor('ch-n3', {
      w: 660, h: 112, cat: 'roads', c: C.roads, from: 'Derver', to: 'North of Virginia',
      segments: [{ a: 0, b: 1, label: 'approximately 14.5km Type 2 divided road' }],
      nodes: [
        { at: 0.16, k: 'Park-and-share hub', kind: 'hub', up: true, wrap: 64 },
        { at: 0.50, k: 'Virginia town centre measures', kind: 'junction', c: C.active, up: false, wrap: 74 },
        { at: 0.62, k: '~20km walking and cycling', kind: 'junction', c: C.active, up: true, wrap: 70 },
        { at: 0.84, k: 'Park-and-share hub', kind: 'hub', up: false, wrap: 64 }
      ]
    });
  });

  /* The published programme movement, drawn as a shifted bar. */
  draw('ch-n3slip', function () {
    var w = 660, h = 68;
    var s = EC.svgRoot('ch-n3slip', w, h);
    var x0 = 96, x1 = 610;
    var min = 2025.0, max = 2028.0;
    var X = function (v) { return x0 + ((v - min) / (max - min)) * (x1 - x0); };
    for (var yr = 2025; yr <= 2028; yr++) {
      el('line', { x1: X(yr), y1: 16, x2: X(yr), y2: 52, stroke: C.rule, 'stroke-width': 0.7 }, s);
      txt(s, X(yr), 12, String(yr), {
        'font-size': 6.4, fill: C.ink4, 'text-anchor': 'middle', 'font-weight': 700
      });
    }
    txt(s, x0 - 8, 30, 'Expected, June 2025', {
      'font-size': 6.4, fill: C.ink3, 'text-anchor': 'end', 'font-weight': 700
    });
    txt(s, x0 - 8, 46, 'Now expected, Feb 2026', {
      'font-size': 6.4, fill: C.ink, 'text-anchor': 'end', 'font-weight': 700
    });
    el('circle', { cx: X(2026.5), cy: 26, r: 5, fill: '#fff', stroke: C.ink4, 'stroke-width': 1.8 }, s);
    el('circle', { cx: X(2027.875), cy: 42, r: 5, fill: C.ops }, s);
    el('path', {
      d: 'M' + (X(2026.5) + 7) + ',28 C' + (X(2027) + 10) + ',30 ' +
         (X(2027.4)) + ',34 ' + (X(2027.875) - 7) + ',40,',
      fill: 'none', stroke: C.ops, 'stroke-width': 1.4, 'stroke-dasharray': '3 2.4'
    }, s);
    txt(s, X(2026.5) + 10, 24, '2026', { 'font-size': 6.6, fill: C.ink3, 'font-weight': 700 });
    txt(s, X(2027.875) + 10, 44, 'Q4 2027', { 'font-size': 6.6, fill: C.ops, 'font-weight': 800 });
    txt(s, X(2027.1), 62, 'roughly two years of movement, cause not stated publicly', {
      'font-size': 6, fill: C.ops, 'text-anchor': 'middle', 'font-weight': 600
    });
  });

  draw('ch-mallow', function () {
    EC.corridor('ch-mallow', {
      w: 660, h: 112, cat: 'roads', c: C.roads, from: 'N20', to: 'N72 / N73',
      segments: [{ a: 0, b: 1, label: 'approximately 5km east-west relief route' }],
      nodes: [
        { at: 0.16, k: 'N20 tie-in', kind: 'junction', up: true },
        { at: 0.44, k: 'Removes strategic HGV traffic from Mallow town centre',
          kind: 'junction', c: C.ops, up: false, wrap: 98 },
        { at: 0.70, k: 'Active travel provision', kind: 'junction', c: C.active, up: true, wrap: 66 },
        { at: 0.88, k: 'N72/N73 tie-in', kind: 'junction', up: false, wrap: 62 }
      ]
    });
  });

  /* ================================================================= p11 */

  draw('ch-luas', function () {
    EC.lineDiagram('ch-luas', {
      w: 660, h: 104, y: 44, c: C.rail,
      stops: [
        { at: 0, k: 'Broombridge', sub: 'existing Green Line terminus', isNew: false, wrap: 74 },
        { at: 0.26, k: 'New stop', wrap: 54 },
        { at: 0.48, k: 'New stop', wrap: 54 },
        { at: 0.70, k: 'New stop', wrap: 54 },
        { at: 1, k: 'Charlestown', sub: '350-space park and ride', wrap: 70 }
      ],
      features: [
        { at: 0.13, k: 'Tolka bridge 1' },
        { at: 0.20, k: 'Tolka bridge 2' },
        { at: 0.58, k: 'largely grass-tracked' }
      ]
    });
  });

  /* ================================================================= p12 */

  /* Scope of the tunnels and MOCC contract, as a hub and ring. */
  draw('ch-mocc', function () {
    var w = 660, h = 248;
    var s = EC.svgRoot('ch-mocc', w, h);
    var cx = w / 2, cy = 124, RX = 214, RY = 86;
    var items = [
      { k: 'Dublin Tunnel', sub: '4.7km, since 2006', a: -90 },
      { k: 'Jack Lynch Tunnel', sub: 'immersed tube, N40', a: -38 },
      { k: 'Tolling and revenue', sub: 'Dublin Tunnel', a: 14 },
      { k: 'Variable-message signs', sub: 'national network', a: 66 },
      { k: '~1,600 emergency phones', sub: 'roadside', a: 118 },
      { k: '1,200km+ monitored', sub: '24/7 incident coordination', a: 170 },
      { k: 'Fire, ventilation, drainage', sub: 'electrical and lighting', a: 222 }
    ];
    items.forEach(function (it) {
      var rad = (it.a * Math.PI) / 180;
      var x = cx + RX * Math.cos(rad), y = cy + RY * Math.sin(rad);
      el('line', {
        x1: cx + 40 * Math.cos(rad), y1: cy + 30 * Math.sin(rad),
        x2: x - 5 * Math.cos(rad), y2: y - 4 * Math.sin(rad),
        stroke: C.rule, 'stroke-width': 1
      }, s);
      el('circle', { cx: x, cy: y, r: 4.4, fill: C.ops, stroke: '#fff', 'stroke-width': 1.4 }, s);
      var right = Math.cos(rad) > -0.15;
      var anchor = Math.abs(Math.cos(rad)) < 0.2 ? 'middle' : (right ? 'start' : 'end');
      var dx = anchor === 'middle' ? 0 : (right ? 8 : -8);
      var above = Math.sin(rad) < -0.4;
      wrapText(s, x + dx, y + (above ? -9 : 2.4), it.k, 108, 6.7, {
        'text-anchor': anchor, fill: C.ink, 'font-weight': 700, up: above
      }, 7.4);
      txt(s, x + dx, y + (above ? -1 : 10.4), it.sub, {
        'font-size': 5.8, fill: C.ink4, 'font-weight': 600, 'text-anchor': anchor
      });
    });
    el('circle', { cx: cx, cy: cy, r: 38, fill: C.petrol }, s);
    txt(s, cx, cy - 4, 'MOCC', {
      'font-size': 12, 'font-weight': 800, fill: C.limeBright, 'text-anchor': 'middle',
      'letter-spacing': '.06em'
    });
    txt(s, cx, cy + 5, 'East Wall Road', {
      'font-size': 5.6, fill: '#9fb0b5', 'text-anchor': 'middle', 'font-weight': 600
    });
    txt(s, cx, cy + 13, 'Dublin 3', {
      'font-size': 5.6, fill: '#9fb0b5', 'text-anchor': 'middle', 'font-weight': 600
    });
    txt(s, 0, 10, 'ONE CONTRACT, SEVEN OPERATING SCOPES', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.15em'
    });
    txt(s, w, 10, 'entity: Egis Road & Tunnel Operation Ireland', {
      'font-size': 5.9, fill: C.ink4, 'font-weight': 600, 'text-anchor': 'end'
    });
  });

  /* ================================================================= p13 */

  draw('ch-networkc', function () {
    var w = 660, h = 118;
    var s = EC.svgRoot('ch-networkc', w, h);
    /* corridor extents measured off the drawn alignments in section 03 —
       relative only, because TII does not publish a per-route breakdown */
    var routes = [
      { k: 'M7', v: 100, c: C.ops }, { k: 'M8', v: 96, c: C.ops },
      { k: 'M9', v: 78, c: C.ops }, { k: 'N25', v: 74, c: C.ops },
      { k: 'N24', v: 70, c: C.ops }, { k: 'N20', v: 62, c: C.ops },
      { k: 'N22', v: 34, c: C.ops }, { k: 'N10', v: 16, c: C.ops },
      { k: 'N28', v: 12, c: C.ops }, { k: 'N40', v: 12, c: C.ops }
    ];
    var gap = 8, bw = (w - gap * (routes.length - 1)) / routes.length;
    var base = 96, maxH = 64;
    var max = 100;
    routes.forEach(function (r, i) {
      var x = i * (bw + gap);
      var bh = (r.v / max) * maxH;
      el('path', { d: EC.barPath(x, base - bh, bw, bh, 2.6, 'top'), fill: r.c }, s);
      txt(s, x + bw / 2, base + 11, r.k, {
        'font-size': 7.4, 'font-weight': 800, fill: C.ink, 'text-anchor': 'middle'
      });
    });
    el('line', { x1: 0, y1: base, x2: w, y2: base, stroke: C.ink, 'stroke-width': 0.9 }, s);
    txt(s, 0, 10, 'THE TEN ROUTES NAMED IN THE NETWORK C DESCRIPTION', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.14em'
    });
    txt(s, w, 10, 'relative corridor extent · total ≈ 328km', {
      'font-size': 5.9, fill: C.ink4, 'font-weight': 600, 'text-anchor': 'end'
    });
    txt(s, w, base + 11, 'south and south-east region', {
      'font-size': 5.9, fill: C.ink4, 'font-weight': 600, 'text-anchor': 'end'
    });
  });

  draw('ch-footprint', function () {
    EC.stackBar('ch-footprint', {
      w: 660, labelW: 108, rowH: 30, rowGap: 34, padTop: 24, totalW: 96, max: 480,
      rows: [
        { k: 'Egis corporate', segs: [
          { v: 470, c: C.ink4, label: '≈470km of motorway, "and all tunnels"' }
        ], total: '≈470km' },
        { k: 'TII pages', segs: [
          { v: 328, c: C.ops, label: 'Network C, 328km' },
          { v: 142, c: '#d8dedb', dashed: true, label: 'unexplained gap ≈142km' }
        ], total: '328km evidenced' }
      ]
    });
  });

  /* ================================================================= p14 */

  /* What the public record establishes, per assignment, across five facts. */
  draw('ch-confidence', function () {
    var facts = ['Involvement', 'Contracting entity', 'Contract term', 'Current phase', 'Commercial value'];
    var rows = [
      { k: 'Dún Laoghaire Living Streets', v: [1, 0, 0, 0, 0] },
      { k: 'Tunnel digital asset transformation', v: [1, 0, 0, 0, 0] },
      { k: 'Disability Toll Exemption and speed cameras', v: [1, 0, 0, 1, 0] },
      { k: 'Rail and wider urban-transport frameworks', v: [1, 0, 0, 0, 0] }
    ];
    var labelW = 196, cellW = 96, cellH = 38, headH = 30;
    var w = labelW + facts.length * cellW;
    var h = headH + rows.length * cellH + 16;
    var s = EC.svgRoot('ch-confidence', w, h);
    facts.forEach(function (f, i) {
      wrapText(s, labelW + i * cellW + cellW / 2, headH - 8, f, cellW - 6, 6.1, {
        'text-anchor': 'middle', fill: C.ink, 'font-weight': 800, up: true
      }, 6.8);
    });
    el('line', { x1: 0, y1: headH, x2: w, y2: headH, stroke: C.ink, 'stroke-width': 0.9 }, s);
    rows.forEach(function (r, ri) {
      var y = headH + ri * cellH;
      txt(s, labelW - 8, y + cellH / 2 + 2.2, r.k, {
        'font-size': 6.6, fill: C.ink, 'font-weight': 700, 'text-anchor': 'end'
      });
      el('line', { x1: 0, y1: y + cellH, x2: w, y2: y + cellH, stroke: C.rule, 'stroke-width': 0.5 }, s);
      r.v.forEach(function (v, ci) {
        var x = labelW + ci * cellW;
        el('rect', {
          x: x + 4, y: y + 3, width: cellW - 8, height: cellH - 6, rx: 1.8,
          fill: v ? '#e3 efe8'.replace(' ', '') : '#f4f2ee',
          stroke: v ? C.gradeA : '#e2ded6', 'stroke-width': 0.7
        }, s);
        txt(s, x + cellW / 2, y + cellH / 2 + 2.4, v ? 'established' : 'not established', {
          'font-size': 5.8, 'font-weight': 700,
          fill: v ? C.gradeA : '#a08a55', 'text-anchor': 'middle'
        });
      });
    });
    txt(s, 0, h - 4, 'Four assignments · twenty commercial facts · four established', {
      'font-size': 6, fill: C.ink4, 'font-weight': 600
    });
  });

  /* ================================================================= p15 */

  draw('ch-categories', function () {
    EC.hbar('ch-categories', {
      w: 360, labelW: 132, valueW: 30, rowH: 26, barH: 13, gap: 7,
      padTop: 12, padBot: 10, max: 13, ticks: 0,
      data: [
        { k: 'National roads and motorways', v: 12, c: C.roads, vl: '12' },
        { k: 'Active travel and urban realm', v: 9, c: C.active, vl: '9' },
        { k: 'Tunnels, tolling and operations', v: 7, c: C.ops, vl: '7' },
        { k: 'Secondary and local roads', v: 7, c: C.roads, vl: '7' },
        { k: 'Light rail and heavy rail', v: 6, c: C.rail, vl: '6' },
        { k: 'Transport planning and traffic', v: 6, c: C.none, vl: '6' },
        { k: 'Bridges and structures', v: 3, c: C.roads, vl: '3' }
      ]
    });
  });

  /* Derived totals across the record, as labelled unit stacks. */
  draw('ch-scale', function () {
    var w = 300, h = 214;
    var s = EC.svgRoot('ch-scale', w, h);
    var groups = [
      { k: 'Mainline kilometres', v: '~320km', bars: [
        { k: 'National roads and motorways', v: 259, c: C.roads },
        { k: 'Secondary and local roads', v: 15, c: C.roads },
        { k: 'Light rail', v: 29, c: C.rail },
        { k: 'Active travel corridors', v: 17, c: C.active }
      ], max: 320 },
      { k: 'Principal structures', v: '305', bars: [
        { k: 'N22 Macroom', v: 105, c: C.roads },
        { k: 'M11 Gorey to Enniscorthy', v: 91, c: C.roads },
        { k: 'M3 Clonee to Kells', v: 59, c: C.roads },
        { k: 'All other schemes', v: 50, c: '#c3ccc5' }
      ], max: 305 }
    ];
    var y = 14;
    groups.forEach(function (g) {
      txt(s, 0, y, g.k.toUpperCase(), {
        'font-size': 5.8, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.14em'
      });
      txt(s, w, y, g.v, { 'font-size': 11, 'font-weight': 800, fill: C.ink, 'text-anchor': 'end' });
      var bx = 0;
      g.bars.forEach(function (b) {
        var bw = (b.v / g.max) * w;
        el('rect', { x: bx, y: y + 7, width: Math.max(1, bw - 2), height: 19, rx: 1.8, fill: b.c }, s);
        bx += bw;
      });
      var ly = y + 38;
      g.bars.forEach(function (b, i) {
        var col = i % 2, row = Math.floor(i / 2);
        el('rect', {
          x: col * 152, y: ly + row * 11 - 4.4, width: 5.6, height: 5.6, rx: 1, fill: b.c
        }, s);
        txt(s, col * 152 + 9, ly + row * 11, b.k + '  ' + b.v, {
          'font-size': 5.8, fill: C.ink3, 'font-weight': 600
        });
      });
      y += 110;
    });
  });

  draw('ch-rolematrix', function () {
    EC.matrix('ch-rolematrix', {
      labelW: 168, cellW: 128, cellH: 40, headH: 32,
      cols: [
        { k: 'National roads and motorways', cat: 'roads' },
        { k: 'Secondary and local roads', cat: 'roads' },
        { k: 'Bridges and structures', cat: 'roads' }
      ],
      rows: [
        { k: 'Lead designer', sub: 'TII Project Management Guidelines',
          v: [{ n: 1, t: 'N22 Tralee' }, { n: 2, t: 'N63 · N59 Moycullen' }, null] },
        { k: "Contractor's designer", sub: 'design-and-build and PPP',
          v: [{ n: 5, t: 'M18/N17 · N4 · N2 · N22 · N4' }, null, { n: 1, t: 'Bohill river bridge' }] },
        { k: "Employer's representative", sub: 'with PSDP and site supervision',
          v: [{ n: 1, t: 'NRA service areas' }, { n: 1, t: 'N56 Donegal' }, null] },
        { k: 'Technical advisor', sub: 'through planning, TII Phases 1 to 4',
          v: [{ n: 4, t: 'N3 · N72/N73 · Donegal · N/M20' }, null, null] }
      ]
    });
  });

  /* ================================================================= p17 */

  draw('ch-spans', function () {
    EC.hbar('ch-spans', {
      w: 360, labelW: 112, valueW: 58, rowH: 26, barH: 12, gap: 7,
      padTop: 18, padBot: 12, max: 120, ticks: 3,
      tickFmt: function (v) { return Math.round(v) + 'm'; },
      data: [
        { k: 'M3 River Boyne Bridge', sub: 'three-span steel girder', v: 114, c: C.roads, vl: '114m', note: '52m skew span' },
        { k: 'Newcastle Bridge, Lucan', sub: 'two-span overbridge', v: 45, c: C.roads, vl: '45m', note: 'opened 2009' },
        { k: 'N59 Lough Kip bridge', sub: 'two-span', v: 43.3, c: C.roads, vl: '43.3m', note: 'plus 242m piled platform' }
      ]
    });
  });

  /* ================================================================= p18 */

  draw('ch-atclients', function () {
    EC.hbar('ch-atclients', {
      w: 360, labelW: 138, valueW: 26, rowH: 20, barH: 10, gap: 5,
      padTop: 10, padBot: 10, max: 3, ticks: 0,
      data: [
        { k: 'Dún Laoghaire-Rathdown', v: 2, c: C.active, vl: '2' },
        { k: 'National Transport Authority', sub: 'as co-client', v: 2, c: C.active, vl: '2' },
        { k: 'Dublin City Council', v: 1, c: C.active, vl: '1' },
        { k: 'Louth County Council', v: 1, c: C.active, vl: '1' },
        { k: 'Wicklow County Council', v: 1, c: C.active, vl: '1' },
        { k: 'Cork City Council', v: 1, c: C.active, vl: '1' },
        { k: 'South Dublin County Council', v: 1, c: C.active, vl: '1' }
      ]
    });
  });

  /* ================================================================= p19 */

  draw('ch-sections', function () {
    var host = document.getElementById('ch-sections');
    host.style.display = 'grid';
    host.style.gridTemplateColumns = 'repeat(3, 1fr)';
    host.style.gap = '5mm';
    ['xs1', 'xs2', 'xs3'].forEach(function (id) {
      var d = document.createElement('div');
      d.id = id;
      host.appendChild(d);
    });
    EC.crossSection('xs1', {
      w: 210, h: 134, cat: 'roads', title: 'Type 2 dual carriageway',
      sub: 'motorway and national primary', width: 'two lanes each way, central median',
      schemes: 'N22 Macroom · M3 · M11 · M18/N17 · N/M20 mainline',
      lanes: [
        { w: 1.4, kind: 'verge' }, { w: 7, kind: 'carriage', lanes: 2 },
        { w: 1.2, kind: 'median' }, { w: 7, kind: 'carriage', lanes: 2 },
        { w: 1.4, kind: 'verge' }
      ]
    });
    EC.crossSection('xs2', {
      w: 210, h: 134, cat: 'roads', title: 'Type 2 divided road',
      sub: 'with parallel active travel', width: 'one lane each way, plus cycle track',
      schemes: 'N3 Virginia · N72/N73 Mallow · N56 Donegal',
      lanes: [
        { w: 2.2, kind: 'cycle' }, { w: 1, kind: 'verge' },
        { w: 4, kind: 'carriage', lanes: 1 }, { w: 1.2, kind: 'median' },
        { w: 4, kind: 'carriage', lanes: 1 }, { w: 1, kind: 'verge' },
        { w: 1.8, kind: 'foot' }
      ]
    });
    EC.crossSection('xs3', {
      w: 210, h: 134, cat: 'active', title: 'Urban active travel corridor',
      sub: 'DMURS and National Cycle Manual', width: 'segregated both sides, single carriageway',
      schemes: 'R132 Drogheda · Dún Laoghaire · Cork Cycle Network',
      lanes: [
        { w: 1.8, kind: 'foot' }, { w: 2, kind: 'cycle' },
        { w: 3.5, kind: 'carriage', lanes: 1 }, { w: 3.5, kind: 'carriage', lanes: 1 },
        { w: 2, kind: 'cycle' }, { w: 1.8, kind: 'foot' }
      ]
    });
  });

  /* ================================================================= p20 */

  draw('ch-gantt', function () {
    EC.gantt('ch-gantt', {
      w: 660, start: 2024, end: 2033.4, labelW: 158, rowH: 19, gap: 7,
      now: 2026.65, nowLabel: '24 August 2026',
      rows: [
        { k: 'N/M20 Cork to Limerick', cat: 'roads', bars: [
          { a: 2024, b: 2028.4, hatch: true, label: 'design and consent, position to confirm' },
          { a: 2029, b: 2033.4, hatch: true, label: 'construction, indicative' }
        ] },
        { k: 'Donegal TEN-T Priority Route', cat: 'roads', bars: [
          { a: 2024, b: 2027.6, label: 'design, EIAR and statutory process' },
          { a: 2028, b: 2033.4, hatch: true, label: 'construction, earliest start 2028' }
        ], marks: [{ at: 2026.37, n: 2 }, { at: 2028, n: 7 }] },
        { k: 'N3 Virginia Bypass', cat: 'roads', bars: [
          { a: 2024, b: 2027.95, label: 'Phase 3 design and environmental evaluation' },
          { a: 2028.2, b: 2033.4, hatch: true, label: 'consent and construction, indicative' }
        ], marks: [{ at: 2027.87, n: 6 }] },
        { k: 'N72/N73 Mallow Relief Road', cat: 'roads', bars: [
          { a: 2024, b: 2027, label: 'Phase 3, Gate 1 pathway' },
          { a: 2027.2, b: 2032, hatch: true, label: 'consent and construction, indicative' }
        ], marks: [{ at: 2026.87, n: 4 }] },
        { k: 'Luas Finglas', cat: 'rail', bars: [
          { a: 2024, b: 2026.28, label: 'design and Railway Order' },
          { a: 2027, b: 2032.5, hatch: true, label: 'delivery, subject to funding' }
        ], marks: [{ at: 2026.28, n: 1 }] },
        { k: 'R132 Drogheda active travel', cat: 'active', bars: [
          { a: 2024, b: 2026.67, label: 'design and Part 8' },
          { a: 2027, b: 2028.6, hatch: true, label: 'construction support' }
        ], marks: [{ at: 2026.67, n: 3 }] },
        { k: 'N21 Adare Bypass', cat: 'roads', bars: [
          { a: 2025.2, b: 2027.5, label: 'design and construct, engineer to the JV' }
        ], marks: [{ at: 2027.7, n: 5 }] },
        { k: 'Dublin and Jack Lynch Tunnels, MOCC', cat: 'ops', bars: [
          { a: 2025.38, b: 2033.38, label: 'live eight-year term' }
        ] },
        { k: 'MMaRC Network C', cat: 'ops', bars: [
          { a: 2024, b: 2033.4, hatch: true, label: 'live network operator, term not published' }
        ] },
        { k: 'East-Link Toll Bridge', cat: 'ops', bars: [
          { a: 2024, b: 2033.4, hatch: true, label: 'live operator, term not disclosed' }
        ] }
      ]
    });
  });

  /* ================================================================= p21 */

  draw('ch-riskmatrix', function () {
    EC.scatter('ch-riskmatrix', {
      w: 372, h: 350, quadrants: true,
      margin: { t: 18, r: 16, b: 42, l: 46 },
      xLabel: 'HOW MUCH SITS INSIDE EGIS DELIVERY',
      yLabel: 'EXPOSURE',
      xLo: 'decided elsewhere', xHi: 'within Egis',
      quadrantLabels: [
        { x: 25, y: 96, k: 'INFLUENCE, NOT CONTROL' },
        { x: 75, y: 96, k: 'OWN IT' },
        { x: 25, y: 4, k: 'MONITOR' },
        { x: 75, y: 4, k: 'MANAGE' }
      ],
      points: [
        { x: 12, y: 90, k: 'Donegal TEN-T', c: C.ops, r: 6.5, ly: -11 },
        { x: 34, y: 82, k: 'N3 Virginia', c: C.ops, r: 6.5, ly: -11 },
        { x: 84, y: 86, k: 'N21 Adare', c: C.ops, r: 6.5, ly: -11 },
        { x: 30, y: 60, k: 'N/M20', c: C.roads, r: 6, ly: 15 },
        { x: 44, y: 40, k: 'N72/N73 Mallow', c: C.none, r: 5.5, ly: -10 },
        { x: 58, y: 34, k: 'R132 Drogheda', c: C.none, r: 5.5, ly: 14 },
        { x: 16, y: 36, k: 'Luas Finglas', c: C.none, r: 5.5, ly: -10 }
      ]
    });
  });

  draw('ch-risktypes', function () {
    EC.hbar('ch-risktypes', {
      w: 300, labelW: 108, valueW: 22, rowH: 19, barH: 10, gap: 4,
      padTop: 8, padBot: 8, max: 2, ticks: 0,
      rowH: 24, data: [
        { k: 'Consenting and statutory', v: 2, c: C.ops, vl: '2' },
        { k: 'Approval and business case', v: 2, c: C.roads, vl: '2' },
        { k: 'Programme', v: 1, c: C.ops, vl: '1' },
        { k: 'Delivery', v: 1, c: C.active, vl: '1' },
        { k: 'Funding', v: 1, c: C.none, vl: '1' }
      ]
    });
  });

  /* ================================================================= p22 */

  draw('ch-roads', function () {
    EC.stackBar('ch-roads', {
      w: 660, labelW: 96, rowH: 32, rowGap: 40, padTop: 30, totalW: 74, max: 1600,
      rows: [
        { k: 'National roads', segs: [
          { v: 659, c: C.roads, label: 'TII exchequer capital €659m' },
          { v: 104, c: C.active, label: 'PPP €104m' },
          { v: 33, c: C.rail, label: 'maintenance ≈€33m' }
        ], total: '≈€800m' },
        { k: 'All roads, 2026', segs: [
          { v: 1500, c: C.ink4, dashed: true,
            label: '> €1.5bn national, regional and local — stated as a floor' }
        ], total: '' }
      ]
    });
  });

  draw('ch-ndp', function () {
    EC.stackBar('ch-ndp', {
      w: 660, labelW: 108, rowH: 32, rowGap: 40, padTop: 30, totalW: 74, max: 290,
      rows: [
        { k: 'NDP to 2035', segs: [
          { v: 202.4, c: C.roads, label: 'Exchequer €202.4bn' },
          { v: 63, c: C.active, label: 'non-Exchequer €63bn' },
          { v: 10, c: C.ops, dashed: true, label: '€10bn not attributed' }
        ], total: '€275.4bn' },
        { k: 'Capital, 2026 to 2030', segs: [
          { v: 24.33, c: C.rail, label: 'Dept of Transport €24.33bn' },
          { v: 78.07, c: '#8b969b', label: 'all other departments €78.07bn' }
        ], total: '€102.4bn' }
      ]
    });
  });

  /* ================================================================= p23 */

  draw('ch-competitors', function () {
    EC.scatter('ch-competitors', {
      w: 660, h: 258, quadrants: true,
      margin: { t: 16, r: 20, b: 42, l: 48 },
      xLabel: 'VISIBLE IRISH TRANSPORT WORK, BY LANE',
      yLabel: 'STRENGTH OF POSITION',
      xLo: 'national roads design', xHi: 'urban transport and corridor design',
      quadrantLabels: [
        { x: 25, y: 96, k: 'THE BENCHMARK ON SCHEME DESIGN' },
        { x: 76, y: 96, k: 'HOLDS THE URBAN GROUND' },
        { x: 25, y: 4, k: 'REGIONAL AND LOCAL AUTHORITY WORK' },
        { x: 76, y: 4, k: 'BROAD CONSULTANCY' }
      ],
      points: [
        { x: 22, y: 68, k: 'EGIS', c: C.roads, r: 9, ly: 20, wrap: 60 },
        { x: 24, y: 92, k: 'Arup', c: C.none, r: 6, ly: -11 },
        { x: 14, y: 80, k: "Roughan & O'Donovan · AECOM", c: C.none, r: 6, ly: 15, wrap: 96 },
        { x: 84, y: 90, k: 'Jacobs', c: C.none, r: 6, ly: -11 },
        { x: 46, y: 56, k: 'Sweco · WSP', c: C.none, r: 5.5, hollow: true, ly: -10 },
        { x: 32, y: 44, k: 'RPS · Tetra Tech', c: C.none, r: 5.5, hollow: true, ly: 14 },
        { x: 68, y: 48, k: 'AtkinsRéalis · Mott MacDonald · SYSTRA', c: C.none, r: 5.5, hollow: true, ly: -10, wrap: 120 },
        { x: 56, y: 16, k: 'Ayesa · TOBIN · Malachy Walsh · PUNCH · DBFL · Waterman Moylan · Fehily Timoney', c: C.none, r: 5, ly: 14, wrap: 150 }
      ]
    });
    var s = document.getElementById('ch-competitors').querySelector('svg');
    /* legend: filled = competitor only, hollow = also an Egis partner */
    el('circle', { cx: 470, cy: 232, r: 4.4, fill: C.none }, s);
    txt(s, 478, 234.4, 'competitor', { 'font-size': 6, fill: C.ink3, 'font-weight': 600 });
    el('circle', { cx: 534, cy: 232, r: 4.4, fill: '#fff', stroke: C.none, 'stroke-width': 1.8 }, s);
    txt(s, 542, 234.4, 'also an Egis partner', { 'font-size': 6, fill: C.ink3, 'font-weight': 600 });
    el('circle', { cx: 628, cy: 232, r: 5.4, fill: C.roads }, s);
    txt(s, 638, 234.4, 'Egis', { 'font-size': 6, fill: C.ink3, 'font-weight': 700 });
  });

  /* ================================================================= p24 */

  draw('ch-orgchart', function () {
    var w = 660, h = 172;
    var s = EC.svgRoot('ch-orgchart', w, h);
    function box(x, y, bw, bh, title, sub, opt) {
      opt = opt || {};
      el('rect', {
        x: x, y: y, width: bw, height: bh, rx: 2.4,
        fill: opt.fill || '#fff', stroke: opt.stroke || C.rule,
        'stroke-width': opt.sw || 1, 'stroke-dasharray': opt.dash || null
      }, s);
      if (opt.bar) el('rect', { x: x, y: y, width: bw, height: 2.6, rx: 1.3, fill: opt.bar }, s);
      wrapText(s, x + bw / 2, y + 14, title, bw - 8, 7, {
        'text-anchor': 'middle', fill: opt.ink || C.ink, 'font-weight': 800
      }, 7.8);
      wrapText(s, x + bw / 2, y + bh - 8, sub, bw - 8, 5.8, {
        'text-anchor': 'middle', fill: opt.sub || C.ink4, 'font-weight': 600, up: true
      }, 6.6);
    }
    function link(x1, y1, x2, y2, dash) {
      el('path', {
        d: 'M' + x1 + ',' + y1 + 'V' + ((y1 + y2) / 2) + 'H' + x2 + 'V' + y2,
        fill: 'none', stroke: dash ? C.ink4 : C.rule, 'stroke-width': 1,
        'stroke-dasharray': dash ? '3 2.4' : null
      }, s);
    }
    box(252, 4, 156, 30, 'Francois Basselot', 'Managing Director · UK and Ireland',
      { bar: C.lime, stroke: C.rule });
    box(96, 54, 150, 30, 'Mike Birch', 'Transportation Director · UK and Ireland', { bar: C.active });
    box(414, 54, 150, 30, 'Steve Preece', 'MD Operations and Maintenance, Ireland', { bar: C.ops });
    link(330, 34, 171, 54); link(330, 34, 489, 54);

    box(4, 108, 140, 34, 'Liam Prendiville', 'MD · Transportation lead, Ireland', { bar: C.roads });
    box(152, 108, 140, 34, 'Eamon Daly', 'Director · Transportation and traffic', { bar: C.roads });
    box(300, 108, 140, 34, 'Country Director, Transportation',
      'vacant since early 2026 — Andrew Doyle to WSP',
      { dash: '3.5 2.6', stroke: C.ink4, fill: '#f7f8f7', ink: C.ink3 });
    box(448, 108, 140, 34, 'You', 'Technical Director · Roads and Urban Transportation',
      { dash: '3.5 2.6', stroke: C.lime, fill: '#f9fce9', ink: C.ink });
    link(171, 84, 74, 108); link(171, 84, 222, 108);
    link(171, 84, 370, 108, true); link(171, 84, 518, 108, true);
    el('path', {
      d: 'M489,84 V96 H518 V108', fill: 'none', stroke: C.ink4,
      'stroke-width': 1, 'stroke-dasharray': '3 2.4'
    }, s);
    txt(s, 0, 100, 'DUBLIN', {
      'font-size': 5.6, 'font-weight': 800, fill: C.ink4, 'letter-spacing': '.16em'
    });
    txt(s, w, 148, 'dashed = not established in public sources', {
      'font-size': 5.8, fill: C.ink4, 'font-weight': 600, 'text-anchor': 'end'
    });
  });

  /* ================================================================= p25 */

  draw('ch-experience', function () {
    var w = 372, h = 190;
    var s = EC.svgRoot('ch-experience', w, h);
    var bands = [
      { k: '10', n: 1 }, { k: '20', n: 3 }, { k: '25', n: 2 },
      { k: '30', n: 8 }, { k: '35', n: 3 }
    ];
    var base = 132, maxH = 96, max = 8;
    var gap = 14, bw = (w - gap * (bands.length - 1)) / bands.length;
    bands.forEach(function (b, i) {
      var x = i * (bw + gap);
      var bh = (b.n / max) * maxH;
      el('path', { d: EC.barPath(x, base - bh, bw, bh, 3, 'top'), fill: C.roads }, s);
      txt(s, x + bw / 2, base - bh - 5, String(b.n), {
        'font-size': 9, 'font-weight': 800, fill: C.roads, 'text-anchor': 'middle'
      });
      txt(s, x + bw / 2, base + 11, b.k, {
        'font-size': 7.4, 'font-weight': 800, fill: C.ink, 'text-anchor': 'middle'
      });
      txt(s, x + bw / 2, base + 19, 'years+', {
        'font-size': 5.8, fill: C.ink4, 'font-weight': 600, 'text-anchor': 'middle'
      });
    });
    el('line', { x1: 0, y1: base, x2: w, y2: base, stroke: C.ink, 'stroke-width': 0.9 }, s);
    txt(s, 0, 10, 'NAMED INDIVIDUALS BY STATED EXPERIENCE', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.14em'
    });
    txt(s, 0, 168, '465 years', { 'font-size': 16, 'font-weight': 800, fill: C.ink });
    txt(s, 82, 168, 'of stated experience across 17 named individuals', {
      'font-size': 6.4, fill: C.ink3, 'font-weight': 600
    });
    txt(s, 0, 180, 'Every figure is a floor: "30 years and more" is counted as 30.', {
      'font-size': 5.9, fill: C.ink4, 'font-weight': 500
    });
  });

  draw('ch-disciplines', function () {
    EC.hbar('ch-disciplines', {
      w: 300, labelW: 116, valueW: 22, rowH: 19, barH: 10, gap: 4.5,
      padTop: 10, padBot: 8, max: 9, ticks: 0,
      data: [
        { k: 'Transportation and traffic', v: 9, c: C.roads, vl: '9' },
        { k: 'Structural and bridges', v: 4, c: C.roads, vl: '4' },
        { k: 'Water, wastewater and flood', v: 4, c: C.active, vl: '4' },
        { k: 'Environment and EIA', v: 2, c: C.rail, vl: '2' },
        { k: 'Digital and BIM', v: 2, c: C.none, vl: '2' },
        { k: 'Road safety', v: 2, c: C.roads, vl: '2' },
        { k: 'Commercial and bids', v: 2, c: C.none, vl: '2' },
        { k: 'Geotechnics', v: 1, c: C.ops, vl: '1' },
        { k: 'Pavement and drainage', v: 1, c: C.ops, vl: '1' },
        { k: 'Project management', v: 1, c: C.none, vl: '1' }
      ]
    });
  });

  /* ================================================================= p26 */

  draw('ch-tara', function () {
    var w = 330, h = 176;
    var s = EC.svgRoot('ch-tara', w, h);
    function node(x, y, bw, bh, t, sub, col, dash) {
      el('rect', {
        x: x, y: y, width: bw, height: bh, rx: 2.4, fill: dash ? '#fdf6f3' : '#fff',
        stroke: col, 'stroke-width': 1.1, 'stroke-dasharray': dash ? '3.5 2.6' : null
      }, s);
      wrapText(s, x + bw / 2, y + 13, t, bw - 8, 6.6, {
        'text-anchor': 'middle', fill: C.ink, 'font-weight': 800
      }, 7.4);
      wrapText(s, x + bw / 2, y + bh - 7, sub, bw - 8, 5.6, {
        'text-anchor': 'middle', fill: C.ink4, 'font-weight': 600, up: true
      }, 6.4);
    }
    node(0, 10, 122, 44, "Tara O'Leary", 'transport planning, Sweco, Cork', C.rule);
    node(0, 84, 122, 44, 'Sweco', 'partner to Barry Transportation on N/M20', C.rule);
    node(208, 47, 122, 44, '"Egis in Ireland"', 'the listing is wrong', C.ops, true);
    el('path', {
      d: 'M122,32 H160 V62 H202', fill: 'none', stroke: C.ops, 'stroke-width': 1.2
    }, s);
    el('path', { d: 'M202,62 l-5,-2.6 v5.2 Z', fill: C.ops }, s);
    el('path', {
      d: 'M122,106 H160 V78 H202', fill: 'none', stroke: C.ink4,
      'stroke-width': 1, 'stroke-dasharray': '3 2.4'
    }, s);
    el('rect', { x: 126, y: 54, width: 68, height: 16, rx: 2, fill: C.ops }, s);
    txt(s, 160, 64.6, 'aggregator', {
      'font-size': 6, 'font-weight': 800, fill: '#fff', 'text-anchor': 'middle'
    });
    txt(s, 160, 92, 'plausible route to the conflation', {
      'font-size': 5.6, fill: C.ink4, 'font-weight': 600, 'text-anchor': 'middle'
    });
    txt(s, 0, 170, 'One source. No Egis-controlled page, client publication or professional listing.', {
      'font-size': 5.9, fill: C.ink4, 'font-weight': 500
    });
  });

  draw('ch-vacancies', function () {
    var w = 330, h = 176;
    var s = EC.svgRoot('ch-vacancies', w, h);
    var roles = [
      { k: 'Director of Urban Transport, Dublin', c: C.active },
      { k: 'Director of Urban Transportation', c: C.active },
      { k: 'Technical Director, MetroLink tender bid', c: C.rail },
      { k: 'Country Director, Transportation', c: C.ink4, note: 'unfilled after the Doyle departure' }
    ];
    txt(s, 0, 8, 'SENIOR TRANSPORT ROLES OPEN IN DUBLIN, EARLY 2026', {
      'font-size': 5.8, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.13em'
    });
    roles.forEach(function (r, i) {
      var y = 22 + i * 29;
      el('rect', { x: 0, y: y, width: 226, height: 18, rx: 2, fill: r.c, opacity: r.note ? 0.4 : 1 }, s);
      txt(s, 7, y + 12, r.k, { 'font-size': 6.6, 'font-weight': 700, fill: '#fff' });
      if (r.note) {
        txt(s, 232, y + 12, r.note, { 'font-size': 5.7, fill: C.ink4, 'font-weight': 600 });
      }
    });
    el('line', { x1: 0, y1: 150, x2: w, y2: 150, stroke: C.rule, 'stroke-width': 0.6 }, s);
    txt(s, 0, 164, '4 roles advertised · 1 senior departure · 100 new Irish roles announced', {
      'font-size': 6.1, fill: C.ink3, 'font-weight': 600
    });
  });

  /* ================================================================= p27 */

  draw('ch-flags', function () {
    var w = 660, h = 132;
    var s = EC.svgRoot('ch-flags', w, h);

    /* Flag 1 — the Donegal value movement */
    txt(s, 0, 9, 'DONEGAL TEN-T · ONE SCHEME, THREE PUBLISHED VALUES', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.13em'
    });
    var x0 = 130, x1 = 600, max = 950;
    var X = function (v) { return x0 + (v / max) * (x1 - x0); };
    [0, 250, 500, 750].forEach(function (t) {
      el('line', { x1: X(t), y1: 16, x2: X(t), y2: 62, stroke: C.rule, 'stroke-width': 0.7 }, s);
      txt(s, X(t), 14, '€' + t + 'm', {
        'font-size': 5.8, fill: C.ink4, 'text-anchor': 'middle', 'font-weight': 600
      });
    });
    var rows = [
      { k: 'Legacy JB Barry page', v: 350, c: '#c3ccc5', vl: '€350m', note: 'superseded' },
      { k: '2026 reporting', v: 800, c: C.ink4, vl: '≈€800m', note: 'rounded' }
    ];
    rows.forEach(function (r, i) {
      var y = 22 + i * 15;
      txt(s, x0 - 8, y + 7, r.k, {
        'font-size': 6.2, fill: C.ink2, 'font-weight': 700, 'text-anchor': 'end'
      });
      el('path', { d: EC.barPath(x0, y, X(r.v) - x0, 9, 2.4, 'right'), fill: r.c }, s);
      txt(s, X(r.v) + 6, y + 7, r.vl + ' · ' + r.note, {
        'font-size': 6, fill: C.ink3, 'font-weight': 600
      });
    });
    var yr = 52;
    txt(s, x0 - 8, yr + 7, 'Government approval', {
      'font-size': 6.2, fill: C.ink, 'font-weight': 800, 'text-anchor': 'end'
    });
    el('rect', { x: X(780), y: yr, width: X(915) - X(780), height: 9, rx: 2, fill: C.roads }, s);
    el('line', { x1: X(780), y1: yr - 2.5, x2: X(780), y2: yr + 11.5, stroke: C.roads, 'stroke-width': 1.6 }, s);
    el('line', { x1: X(915), y1: yr - 2.5, x2: X(915), y2: yr + 11.5, stroke: C.roads, 'stroke-width': 1.6 }, s);
    el('line', {
      x1: x0, y1: yr + 4.5, x2: X(780), y2: yr + 4.5,
      stroke: C.roads, 'stroke-width': 1, 'stroke-dasharray': '2.5 2.5'
    }, s);
    txt(s, X(915) + 6, yr + 7, '€780–915m · the figure to use', {
      'font-size': 6, fill: C.roads, 'font-weight': 800
    });

    /* Flag 2 — the N3 Virginia programme movement */
    txt(s, 0, 84, 'N3 VIRGINIA BYPASS · ONE SUBMISSION, TWO PUBLISHED DATES', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.13em'
    });
    var t0 = 2025, t1 = 2028.4;
    var T = function (v) { return x0 + ((v - t0) / (t1 - t0)) * (x1 - x0); };
    for (var y2 = 2025; y2 <= 2028; y2++) {
      el('line', { x1: T(y2), y1: 92, x2: T(y2), y2: 122, stroke: C.rule, 'stroke-width': 0.7 }, s);
      txt(s, T(y2), 90, String(y2), {
        'font-size': 5.8, fill: C.ink4, 'text-anchor': 'middle', 'font-weight': 600
      });
    }
    txt(s, x0 - 8, 104, 'Expected, June 2025', {
      'font-size': 6.2, fill: C.ink2, 'font-weight': 700, 'text-anchor': 'end'
    });
    txt(s, x0 - 8, 118, 'Stated, February 2026', {
      'font-size': 6.2, fill: C.ink, 'font-weight': 800, 'text-anchor': 'end'
    });
    el('circle', { cx: T(2026.5), cy: 100, r: 4.6, fill: '#fff', stroke: C.ink4, 'stroke-width': 1.8 }, s);
    el('circle', { cx: T(2027.875), cy: 114, r: 4.6, fill: C.ops }, s);
    el('line', {
      x1: T(2026.5), y1: 100, x2: T(2027.875), y2: 114,
      stroke: C.ops, 'stroke-width': 1.2, 'stroke-dasharray': '3 2.4'
    }, s);
    txt(s, T(2026.5) + 8, 98, '2026', { 'font-size': 6, fill: C.ink3, 'font-weight': 700 });
    txt(s, T(2027.875) + 8, 117, 'Q4 2027 · roughly two years of movement', {
      'font-size': 6, fill: C.ops, 'font-weight': 800
    });
  });

  /* ================================================================= p28 */

  draw('ch-tiiflow', function () {
    EC.flow('ch-tiiflow', {
      w: 660, stepW: 88, stepH: 58, gap: 6, padTop: 30,
      steps: [
        { k: 'Phase 1', sub: 'concept and feasibility', cat: 'roads' },
        { k: 'Phase 2', sub: 'options selection', cat: 'roads', gate: 'Gate 1' },
        { k: 'Phase 3', sub: 'design and environmental evaluation', cat: 'roads', solid: true,
          c: C.roads, note: 'N/M20 · N3 Virginia · N72/N73 Mallow' },
        { k: 'Phase 4', sub: 'statutory processes', cat: 'roads', solid: true, c: C.roads,
          gate: 'Gate 2', note: 'Donegal TEN-T · R132 Drogheda' },
        { k: 'Phase 5', sub: 'enabling and procurement', cat: 'roads', gate: 'Gate 3',
          note: 'Luas Finglas sits here, awaiting funding' },
        { k: 'Phase 6', sub: 'construction and implementation', cat: 'roads', solid: true,
          c: C.active, note: 'N21 Adare Bypass' },
        { k: 'Phase 7', sub: 'closeout and review', cat: 'roads' }
      ]
    });
  });

  draw('ch-consentroutes', function () {
    var w = 660, h = 150;
    var s = EC.svgRoot('ch-consentroutes', w, h);
    var routes = [
      { k: 'An Coimisiún Pleanála', sub: 'road scheme approval with CPO',
        ex: 'Donegal TEN-T', risk: 'Judicial review · oral hearing · RFI', c: C.roads },
      { k: 'Railway Order', sub: 'light rail, with land-acquisition powers',
        ex: 'Luas Finglas', risk: 'Funding gate after consent', c: C.rail },
      { k: 'Part 8', sub: 'local authority consent',
        ex: 'R132 Drogheda', risk: 'Submission volume · council approval', c: C.active }
    ];
    var gap = 10, bw = (w - gap * 2) / 3;
    routes.forEach(function (r, i) {
      var x = i * (bw + gap);
      el('rect', { x: x, y: 14, width: bw, height: 124, rx: 2.4, fill: SOFT[i === 0 ? 'roads' : (i === 1 ? 'rail' : 'active')] }, s);
      el('rect', { x: x, y: 14, width: bw, height: 3, rx: 1.5, fill: r.c }, s);
      wrapText(s, x + 8, 32, r.k, bw - 16, 8, { fill: C.ink, 'font-weight': 800 }, 8.8);
      wrapText(s, x + 8, 44, r.sub, bw - 16, 6.1, { fill: C.ink3, 'font-weight': 600 }, 7);
      txt(s, x + 8, 74, 'LIVE EXAMPLE', {
        'font-size': 5.4, 'font-weight': 800, fill: C.ink4, 'letter-spacing': '.13em'
      });
      txt(s, x + 8, 86, r.ex, { 'font-size': 8, 'font-weight': 800, fill: r.c });
      wrapText(s, x + 8, 100, r.risk, bw - 16, 5.9, { fill: C.ink3, 'font-weight': 600 }, 6.8);
    });
    txt(s, 0, 8, 'THREE CONSENT ROUTES, ALL LIVE IN THE CURRENT PORTFOLIO', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.13em'
    });
  });

  /* ================================================================= p29 */

  draw('ch-actions', function () {
    var w = 660, h = 108;
    var s = EC.svgRoot('ch-actions', w, h);
    var week = [
      { n: 1, k: 'Confirm the reporting line', c: C.roads },
      { n: 2, k: 'Get the internal register and win-loss log', c: C.roads },
      { n: 3, k: 'Own the R132 Part 8 response', c: C.ops },
      { n: 4, k: 'Archive the legacy websites', c: C.roads }
    ];
    var month = [
      { n: 1, k: 'Establish the N/M20 position', c: C.active },
      { n: 2, k: 'Map every TII and NTA framework', c: C.active },
      { n: 3, k: 'Define the operations interface', c: C.active },
      { n: 4, k: 'Audit designer and PSDP duties', c: C.active },
      { n: 5, k: 'Resolve the Dublin urban transport gap', c: C.active }
    ];
    function band(y, label, sub, items, col) {
      txt(s, 0, y - 6, label, {
        'font-size': 6.2, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.13em'
      });
      txt(s, 96, y - 6, sub, { 'font-size': 5.8, fill: C.ink4, 'font-weight': 600 });
      var gap = 7, bw = (w - gap * (items.length - 1)) / items.length;
      items.forEach(function (it, i) {
        var x = i * (bw + gap);
        el('rect', { x: x, y: y, width: bw, height: 28, rx: 2.4, fill: SOFT[col] }, s);
        el('rect', { x: x, y: y, width: bw, height: 2.6, rx: 1.3, fill: it.c }, s);
        el('circle', { cx: x + 9, cy: y + 13, r: 5, fill: it.c }, s);
        txt(s, x + 9, y + 15.2, String(it.n), {
          'font-size': 6, 'font-weight': 800, fill: '#fff', 'text-anchor': 'middle'
        });
        wrapText(s, x + 18, y + 12, it.k, bw - 24, 6.1, {
          fill: C.ink, 'font-weight': 700
        }, 6.9);
      });
    }
    band(14, 'WEEK ONE', 'verify the map', week, 'roads');
    band(70, 'FIRST MONTH', 'close the capability gap', month, 'active');
  });

  /* ============================================== added figures, p16/18/22 */

  /* p16 — structures per scheme, for the schemes that publish a count.
     Drawn as columns rather than rows so it costs the page as little height
     as possible on an already dense table page. */
  draw('ch-structures', function () {
    var w = 660, h = 104;
    var s = EC.svgRoot('ch-structures', w, h);
    var data = [
      { k: 'N22 Macroom', v: 105 }, { k: 'M11 Gorey', v: 91 },
      { k: 'M3 Clonee', v: 59 }, { k: 'N2 Finglas', v: 16 },
      { k: 'N59 Moycullen', v: 11 }, { k: 'M18/N17 Gort', v: 10 },
      { k: 'N22 Tralee', v: 5 }, { k: 'N63 Abbeyknockmoy', v: 5 }
    ];
    var gap = 10, bw = (w - 74 - gap * (data.length - 1)) / data.length;
    var base = 76, maxH = 50, max = 105;
    data.forEach(function (d, i) {
      var x = i * (bw + gap);
      var bh = (d.v / max) * maxH;
      el('path', { d: EC.barPath(x, base - bh, bw, bh, 3, 'top'), fill: C.roads }, s);
      txt(s, x + bw / 2, base - bh - 5, String(d.v), {
        'font-size': 8.4, 'font-weight': 800, fill: C.roads, 'text-anchor': 'middle'
      });
      wrapText(s, x + bw / 2, base + 10, d.k, bw + gap - 2, 5.9, {
        'text-anchor': 'middle', fill: C.ink2, 'font-weight': 700
      }, 6.6);
    });
    el('line', { x1: 0, y1: base, x2: w - 74, y2: base, stroke: C.ink, 'stroke-width': 0.9 }, s);
    txt(s, 0, 9, 'PRINCIPAL STRUCTURES, SCHEMES THAT PUBLISH A COUNT', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.13em'
    });
    el('line', { x1: w - 62, y1: 16, x2: w - 62, y2: 76, stroke: C.rule, 'stroke-width': 0.8 }, s);
    txt(s, w - 52, 40, '305', { 'font-size': 19, 'font-weight': 800, fill: C.ink });
    txt(s, w - 52, 50, 'total, plus', { 'font-size': 5.9, fill: C.ink4, 'font-weight': 600 });
    txt(s, w - 52, 58, '78 culverts', { 'font-size': 5.9, fill: C.ink4, 'font-weight': 600 });
    txt(s, w - 52, 70, 'nowhere published', { 'font-size': 5.9, fill: C.ops, 'font-weight': 700 });
    txt(s, w - 52, 78, 'as a total', { 'font-size': 5.9, fill: C.ops, 'font-weight': 700 });
    txt(s, 0, 99, 'Three schemes carry 83 per cent of the evidenced structures count.', {
      'font-size': 6.1, fill: C.ink3, 'font-weight': 600
    });
  });

  /* p18 — walking and cycling provision named across the live portfolio. */
  draw('ch-atprovision', function () {
    EC.hbar('ch-atprovision', {
      w: 360, labelW: 128, valueW: 44, rowH: 24, barH: 12, gap: 6,
      padTop: 20, padBot: 12, max: 100, ticks: 4,
      tickFmt: function (v) { return Math.round(v) + 'km'; },
      data: [
        { k: 'N/M20 Cork to Limerick', sub: 'live', v: 100, c: C.active, vl: '~100km' },
        { k: 'N3 Virginia Bypass', sub: 'live', v: 20, c: C.active, vl: '~20km' },
        { k: 'Tallaght to Liffey Valley', sub: 'completed', v: 8, c: C.active, vl: '8km' },
        { k: 'R132 Drogheda', sub: 'live, Part 8', v: 2.4, c: C.active, vl: '2.4km' }
      ]
    });
  });

  /* p22 — the NIFTI hierarchy, and where the Irish business already sits. */
  draw('ch-nifti', function () {
    var w = 660, h = 106;
    var s = EC.svgRoot('ch-nifti', w, h);
    var steps = [
      { k: 'Maintain', sub: 'protect existing assets',
        egis: 'MMaRC Network C · tunnel O&M', on: true },
      { k: 'Optimise', sub: 'get more from what exists',
        egis: 'MOCC · ITS · tolling · renewals design', on: true },
      { k: 'Improve', sub: 'upgrade existing corridors',
        egis: 'N72/N73 Mallow · R132 Drogheda · N56', on: true },
      { k: 'New', sub: 'build new infrastructure',
        egis: 'Donegal TEN-T · N/M20 · N3 Virginia · Luas Finglas', on: true }
    ];
    var gap = 9, bw = (w - gap * 3) / 4;
    txt(s, 0, 9, 'THE NIFTI PRIORITY HIERARCHY, HIGHEST PRIORITY FIRST', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.13em'
    });
    steps.forEach(function (st, i) {
      var x = i * (bw + gap);
      /* priority falls left to right, so the fill weight falls with it */
      var op = 1 - i * 0.17;
      el('path', {
        d: 'M' + x + ',18 h' + (bw - 10) + 'l10,17l-10,17 h' + (-(bw - 10)) + 'l10,-17 Z',
        fill: C.roads, opacity: op
      }, s);
      txt(s, x + bw / 2, 33, st.k, {
        'font-size': 9, 'font-weight': 800, fill: '#fff', 'text-anchor': 'middle'
      });
      txt(s, x + bw / 2, 43, st.sub, {
        'font-size': 5.9, 'font-weight': 600, fill: 'rgba(255,255,255,.9)', 'text-anchor': 'middle'
      });
      el('rect', { x: x, y: 60, width: bw, height: 34, rx: 2.4, fill: SOFT.roads }, s);
      txt(s, x + 6, 71, 'EGIS ALREADY HOLDS', {
        'font-size': 5.2, 'font-weight': 800, fill: C.roads, 'letter-spacing': '.11em'
      });
      wrapText(s, x + 6, 80, st.egis, bw - 12, 5.9, { fill: C.ink2, 'font-weight': 600 }, 6.6);
    });
    txt(s, w, 9, 'investment is directed to the left before the right', {
      'font-size': 5.9, fill: C.ink4, 'font-weight': 600, 'text-anchor': 'end'
    });
    txt(s, 0, 103, 'Egis holds a live position at every level of the hierarchy, including the two the framework funds first.', {
      'font-size': 6.2, fill: C.ink3, 'font-weight': 600
    });
  });

  /* p26 — the office footprint, and how little of it is public. */
  draw('ch-offices', function () {
    var w = 372, h = 164;
    var s = EC.svgRoot('ch-offices', w, h);
    var steps = [
      { k: '16', sub: 'offices and sites across Ireland', n: 16, c: C.roads,
        note: 'stated in the August 2025 jobs announcement' },
      { k: '4', sub: 'offices in the consultancy entity', n: 4, c: C.active,
        note: 'around 200 engineers' },
      { k: '2', sub: 'named in public sources', n: 2, c: C.ops,
        note: 'Classon House, Dundrum · Castlebar' }
    ];
    var barW = w - 108, rowH = 34, gap = 15;
    steps.forEach(function (st, i) {
      var y = 18 + i * (rowH + gap);
      var bw = (st.n / 16) * barW;
      el('rect', { x: 0, y: y, width: barW, height: rowH, rx: 2.4, fill: '#eef2f1' }, s);
      el('path', { d: EC.barPath(0, y, Math.max(14, bw), rowH, 2.6, 'right'), fill: st.c }, s);
      txt(s, 7, y + rowH / 2 + 4.4, st.k, {
        'font-size': 12, 'font-weight': 800, fill: '#fff'
      });
      wrapText(s, Math.max(14, bw) + 8, y + 13, st.sub, w - bw - 24, 6.6, {
        fill: C.ink, 'font-weight': 700
      }, 7.2);
      wrapText(s, Math.max(14, bw) + 8, y + 24, st.note, w - bw - 24, 5.9, {
        fill: C.ink4, 'font-weight': 600
      }, 6.6);
    });
    txt(s, 0, 9, 'OFFICE FOOTPRINT, AND WHAT IS PUBLIC', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.13em'
    });
    txt(s, 0, 160, '14 of the 16 locations are not identified in any public source.', {
      'font-size': 6.2, fill: C.ops, 'font-weight': 700
    });
  });

  /* p26 — provenance of the eighteen names in the wider-team table. */
  draw('ch-nameevidence', function () {
    var w = 372, h = 108;
    var s = EC.svgRoot('ch-nameevidence', w, h);
    var segs = [
      { k: 'Grade A', n: 12, c: C.gradeA, sub: 'Egis page, client publication, professional listing or signed document' },
      { k: 'Grade A/B', n: 3, c: C.gradeB, sub: 'partly legacy-sourced' },
      { k: 'Grade B', n: 3, c: C.gradeC, sub: 'legacy page only — confirm before use' }
    ];
    var total = 18, x = 0, barY = 18, barH = 30;
    segs.forEach(function (sg) {
      var bw = (sg.n / total) * w;
      el('rect', { x: x, y: barY, width: bw - 2, height: barH, rx: 2, fill: sg.c }, s);
      txt(s, x + (bw - 2) / 2, barY + barH / 2 + 3.6, String(sg.n), {
        'font-size': 10, 'font-weight': 800, fill: '#fff', 'text-anchor': 'middle'
      });
      x += bw;
    });
    txt(s, 0, 9, 'THE EIGHTEEN TABLE ENTRIES, BY SOURCE', {
      'font-size': 5.9, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.13em'
    });
    var ly = barY + barH + 12;
    segs.forEach(function (sg, i) {
      var y = ly + i * 13;
      el('rect', { x: 0, y: y - 4.6, width: 6.4, height: 6.4, rx: 1.1, fill: sg.c }, s);
      txt(s, 10, y, sg.k, { 'font-size': 6.4, 'font-weight': 800, fill: C.ink });
      txt(s, 46, y, sg.sub, { 'font-size': 5.9, fill: C.ink3, 'font-weight': 600 });
    });
  });

  /* ------------------------------------------------------------- finalise */

  window.__diagnostics = diag;
  window.__chartsReady = true;
})();
