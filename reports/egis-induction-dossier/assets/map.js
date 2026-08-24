/* ==========================================================================
   Portfolio map — island of Ireland
   Coastline: Natural Earth 10m admin-0, projected Lambert conformal conic
   (standard parallels 53.5N / 54.5N, central meridian 8W) by build/make_map.py.
   Scheme positions are indicative locations, not surveyed alignments.
   ========================================================================== */
/* eslint-env browser */
(function (global) {
  'use strict';

  var EC = global.EgisCharts;
  var C = EC.C, SOFT = EC.SOFT, el = EC.el, txt = EC.txt, wrapText = EC.wrapText;

  /* ------------------------------------------------------------ projection */

  function makeProjector(p) {
    var toRad = Math.PI / 180;
    return function (lon, lat) {
      var la = lat * toRad, lo = lon * toRad;
      var rho = p.R * p.F / Math.pow(Math.tan(Math.PI / 4 + la / 2), p.n);
      var th = p.n * (lo - p.lon0 * toRad);
      return [rho * Math.sin(th), rho * Math.cos(th) - p.rho0];
    };
  }

  /* ---------------------------------------------------------------- places */

  var P = {
    dublin: [-6.2603, 53.3498], finglas: [-6.2986, 53.3906],
    drogheda: [-6.3478, 53.7189], dunLaoghaire: [-6.1358, 53.2939],
    eastLink: [-6.2286, 53.3467], mocc: [-6.2333, 53.3536],
    cork: [-8.4756, 51.8985], jackLynch: [-8.4000, 51.8917],
    limerick: [-8.6267, 52.6638], mallow: [-8.6500, 52.1333],
    blarney: [-8.5667, 51.9333], patrickswell: [-8.7000, 52.6000],
    adare: [-8.7897, 52.5642], virginia: [-7.0833, 53.8333],
    letterkenny: [-7.7333, 54.9500], ballybofey: [-7.7833, 54.8000],
    lifford: [-7.4833, 54.8333], manorcunningham: [-7.6333, 54.9167],
    galway: [-9.0568, 53.2707], macroom: [-8.9622, 51.9042],
    ballyvourney: [-9.1500, 51.9333], tralee: [-9.7026, 52.2704],
    castlebar: [-9.2988, 53.8547], navan: [-6.6814, 53.6528],
    kells: [-6.8783, 53.7264], clonee: [-6.4400, 53.4100],
    gorey: [-6.2939, 52.6747], enniscorthy: [-6.5661, 52.5019],
    gort: [-8.8181, 53.0656], tuam: [-8.8500, 53.5147],
    lucan: [-6.4494, 53.3564], ashbourne: [-6.4000, 53.5133],
    dromod: [-7.9139, 53.8583], moycullen: [-9.1806, 53.3389],
    abbeyknockmoy: [-8.7500, 53.4667], balla: [-9.1333, 53.8000],
    boyoughter: [-8.3500, 54.8000], ballaghaderreen: [-8.5806, 53.7972],
    greystones: [-6.0694, 53.1444], bray: [-6.0983, 53.2028],
    tallaght: [-6.3733, 53.2859], carrickmines: [-6.1706, 53.2611],
    naas: [-6.6614, 53.2189], portlaoise: [-7.3000, 53.0344],
    roscrea: [-7.8000, 52.9500], nenagh: [-8.1972, 52.8639],
    cashel: [-7.8833, 52.5167], mitchelstown: [-8.2664, 52.2653],
    fermoy: [-8.2717, 52.1394], kilcullen: [-6.7472, 53.1297],
    carlow: [-6.9261, 52.8408], thomastown: [-7.1375, 52.5269],
    waterford: [-7.1100, 52.2593], youghal: [-7.8497, 51.9508],
    dungarvan: [-7.6231, 52.0897], tipperaryTown: [-8.1600, 52.4733],
    clonmel: [-7.7000, 52.3550], charleville: [-8.6800, 52.3500],
    ringaskiddy: [-8.3200, 51.8300], kilkenny: [-7.2500, 52.6500],
    cobh: [-8.2967, 51.8511], midleton: [-8.1736, 51.9147],
    dundalk: [-6.4000, 54.0000], slane: [-6.5406, 53.7108],
    athenry: [-8.7500, 53.3000], killeen: [-6.3600, 53.3300],
    leopardstown: [-6.1900, 53.2700], shankill: [-6.1167, 53.2333],
    clondalkin: [-6.3947, 53.3208], rooskey: [-7.9333, 53.8333]
  };

  /* Network C — the roughly 328km of motorway and national road managed by
     Egis Lagan Services, drawn as indicative corridors. */
  var NETWORK_C = [
    { k: 'M7', pts: ['naas', 'portlaoise', 'roscrea', 'nenagh', 'limerick'] },
    { k: 'M8', pts: ['portlaoise', 'cashel', 'mitchelstown', 'fermoy', 'cork'] },
    { k: 'M9', pts: ['kilcullen', 'carlow', 'thomastown', 'waterford'] },
    { k: 'N25', pts: ['cork', 'youghal', 'dungarvan', 'waterford'] },
    { k: 'N24', pts: ['limerick', 'tipperaryTown', 'clonmel', 'waterford'] },
    { k: 'N20', pts: ['cork', 'mallow', 'charleville', 'limerick'] },
    { k: 'N22', pts: ['cork', 'macroom', 'ballyvourney'] },
    { k: 'N28', pts: ['cork', 'ringaskiddy'] },
    { k: 'N10', pts: ['thomastown', 'kilkenny'] }
  ];

  /* Live assignments. n = legend number, cat = category, at = position. */
  var LIVE = [
    { n: 1, cat: 'roads', at: 'blarney', k: 'N/M20 Cork to Limerick',
      corridor: ['blarney', 'mallow', 'charleville', 'patrickswell'] },
    { n: 2, cat: 'roads', at: 'ballybofey', k: 'Donegal TEN-T Priority Route',
      corridor: ['ballybofey', 'letterkenny', 'manorcunningham', 'lifford'] },
    { n: 3, cat: 'roads', at: 'virginia', k: 'N3 Virginia Bypass' },
    { n: 4, cat: 'roads', at: 'mallow', k: 'N72/N73 Mallow Relief Road' },
    { n: 5, cat: 'rail', at: 'finglas', k: 'Luas Finglas' },
    { n: 6, cat: 'active', at: 'drogheda', k: 'R132 Drogheda active travel' },
    { n: 7, cat: 'ops', at: 'mocc', k: 'Dublin Tunnel and MOCC' },
    { n: 8, cat: 'ops', at: 'jackLynch', k: 'Jack Lynch Tunnel, Cork' },
    { n: 9, cat: 'ops', at: 'cashel', k: 'MMaRC Network C' },
    { n: 10, cat: 'ops', at: 'eastLink', k: 'East-Link Toll Bridge' },
    { n: 11, cat: 'active', at: 'dunLaoghaire', k: 'Dún Laoghaire Living Streets' },
    { n: 12, cat: 'rail', at: 'cobh', k: 'Cork Area Commuter Rail' },
    { n: 13, cat: 'roads', at: 'adare', k: 'N21 Adare Bypass' }
  ];

  /* Twenty representative completed schemes from the credentials base. */
  var COMPLETED = [
    'macroom', 'kells', 'enniscorthy', 'gort', 'lucan', 'ashbourne', 'dromod',
    'tralee', 'dundalk', 'naas', 'galway', 'abbeyknockmoy', 'moycullen', 'balla',
    'boyoughter', 'killeen', 'ballaghaderreen', 'navan', 'tallaght', 'greystones'
  ];

  /* Label leaders: some markers sit too close to read, so their number is
     repeated on a leader line out to clear space. */
  var LEADERS = [
    { n: 5, dx: -30, dy: -12 },
    { n: 7, dx: 22, dy: -13 },
    { n: 10, dx: 26, dy: 3 },
    { n: 11, dx: 24, dy: 12 },
    { n: 8, dx: 20, dy: 9 },
    { n: 12, dx: 26, dy: 18 }
  ];

  /* ------------------------------------------------------------------ draw */

  function portfolioMap(host, geo, opt) {
    opt = opt || {};
    var vb = geo.viewBox;
    var pad = opt.pad || 3;
    var w = opt.w || 300, h = opt.h || 380;
    var s = EC.svgRoot(host, w, h);
    if (!s) return;

    var proj = makeProjector(geo.projection);

    /* fit the island bounding box into the drawing area */
    var gx = vb[0] - pad, gy = vb[1] - pad, gw = vb[2] + 2 * pad, gh = vb[3] + 2 * pad;
    var k = Math.min(w / gw, h / gh);
    var ox = (w - gw * k) / 2 - gx * k;
    var oy = (h - gh * k) / 2 - gy * k;
    var T = function (lon, lat) {
      var p = proj(lon, lat);
      return [p[0] * k + ox, p[1] * k + oy];
    };
    var at = function (name) { return T(P[name][0], P[name][1]); };

    var g = el('g', null, s);

    /* landmass */
    el('path', {
      d: geo.roi, fill: '#e8ede8', stroke: '#c3ccc5', 'stroke-width': 0.5,
      transform: 'translate(' + ox + ',' + oy + ') scale(' + k + ')',
      'vector-effect': 'non-scaling-stroke'
    }, g);
    el('path', {
      d: geo.ni, fill: '#f3f5f2', stroke: '#c3ccc5', 'stroke-width': 0.5,
      'stroke-dasharray': '2.5 2',
      transform: 'translate(' + ox + ',' + oy + ') scale(' + k + ')',
      'vector-effect': 'non-scaling-stroke'
    }, g);

    /* Network C corridors, drawn beneath the markers */
    if (opt.networkC !== false) {
      NETWORK_C.forEach(function (c) {
        var d = c.pts.map(function (nm, i) {
          var p = at(nm);
          return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
        }).join('');
        el('path', {
          d: d, fill: 'none', stroke: C.ops, 'stroke-width': 2.4,
          'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.4
        }, g);
      });
    }

    /* live corridors (schemes that are a line, not a point) */
    LIVE.forEach(function (a) {
      if (!a.corridor) return;
      var d = a.corridor.map(function (nm, i) {
        var p = at(nm);
        return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
      }).join('');
      el('path', {
        d: d, fill: 'none', stroke: C[a.cat], 'stroke-width': 2.6,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.85
      }, g);
    });

    /* completed schemes — open markers */
    COMPLETED.forEach(function (nm) {
      var p = at(nm);
      el('circle', {
        cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 2.6,
        fill: '#fff', stroke: '#8b969b', 'stroke-width': 1
      }, g);
    });

    /* live assignments — numbered markers with a white keyline */
    LIVE.forEach(function (a) {
      var p = at(a.at);
      var lead = LEADERS.filter(function (l) { return l.n === a.n; })[0];
      var mx = p[0], my = p[1];
      if (lead) {
        el('circle', {
          cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 1.9, fill: C[a.cat]
        }, g);
        mx = p[0] + lead.dx; my = p[1] + lead.dy;
        el('line', {
          x1: p[0].toFixed(1), y1: p[1].toFixed(1),
          x2: mx.toFixed(1), y2: my.toFixed(1),
          stroke: C[a.cat], 'stroke-width': 0.7
        }, g);
      }
      el('circle', {
        cx: mx.toFixed(1), cy: my.toFixed(1), r: 6.4,
        fill: C[a.cat], stroke: '#fff', 'stroke-width': 1.5
      }, g);
      txt(g, mx, my + 2.4, String(a.n), {
        'font-size': 7, 'font-weight': 800, fill: '#fff', 'text-anchor': 'middle'
      });
    });

    /* city anchors for orientation */
    if (opt.cities !== false) {
      [['dublin', 'Dublin', 8, 12], ['cork', 'Cork', -8, 12],
       ['galway', 'Galway', -6, -6], ['limerick', 'Limerick', -8, 13],
       ['waterford', 'Waterford', 7, 10]].forEach(function (c) {
        var p = at(c[0]);
        txt(g, p[0] + c[2], p[1] + c[3], c[1], {
          'font-size': 6, 'font-weight': 700, fill: '#7d8a8f',
          'text-anchor': c[2] < 0 ? 'end' : 'start', 'letter-spacing': '.06em'
        });
      });
    }

    return { live: LIVE, completed: COMPLETED, networkC: NETWORK_C };
  }

  /* ------------------------------------------------------------- key block */

  function mapKey(host, opt) {
    opt = opt || {};
    var w = opt.w || 190;
    var rowH = 13.4;
    var groups = [
      { k: 'National roads and motorways', cat: 'roads' },
      { k: 'Active travel and urban realm', cat: 'active' },
      { k: 'Light rail and heavy rail', cat: 'rail' },
      { k: 'Operations, maintenance, tolling', cat: 'ops' }
    ];
    var h = 18 + LIVE.length * rowH + 46 + 12 + groups.length * 11 + 8;
    var s = EC.svgRoot(host, w, h);
    if (!s) return;

    txt(s, 0, 7, 'LIVE ASSIGNMENTS', {
      'font-size': 6.1, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.16em'
    });

    LIVE.forEach(function (a, i) {
      var y = 18 + i * rowH;
      el('circle', { cx: 6, cy: y, r: 5.6, fill: C[a.cat] }, s);
      txt(s, 6, y + 2.2, String(a.n), {
        'font-size': 6.4, 'font-weight': 800, fill: '#fff', 'text-anchor': 'middle'
      });
      txt(s, 16, y + 2.2, a.k, { 'font-size': 6.5, fill: C.ink2, 'font-weight': 600 });
    });

    var y0 = 18 + LIVE.length * rowH + 8;
    el('line', { x1: 0, y1: y0, x2: w, y2: y0, stroke: C.rule, 'stroke-width': 0.6 }, s);

    el('circle', { cx: 6, cy: y0 + 11, r: 2.8, fill: '#fff', stroke: '#8b969b', 'stroke-width': 1 }, s);
    txt(s, 16, y0 + 13.2, 'Completed schemes (20 of 47 plotted)', {
      'font-size': 6.2, fill: C.ink3, 'font-weight': 600
    });

    el('line', {
      x1: 1.5, y1: y0 + 24, x2: 11, y2: y0 + 24,
      stroke: C.ops, 'stroke-width': 2.4, opacity: 0.4, 'stroke-linecap': 'round'
    }, s);
    txt(s, 16, y0 + 26.2, 'MMaRC Network C corridors', {
      'font-size': 6.2, fill: C.ink3, 'font-weight': 600
    });

    var y1 = y0 + 36;
    txt(s, 0, y1, 'CATEGORY', {
      'font-size': 6.1, 'font-weight': 800, fill: C.ink, 'letter-spacing': '.16em'
    });
    groups.forEach(function (gp, i) {
      var y = y1 + 10 + i * 11;
      el('rect', { x: 0, y: y - 4, width: 8, height: 8, rx: 1.4, fill: C[gp.cat] }, s);
      txt(s, 13, y + 2.4, gp.k, { 'font-size': 6.3, fill: C.ink2, 'font-weight': 600 });
    });
  }

  global.EgisMap = {
    portfolioMap: portfolioMap, mapKey: mapKey,
    LIVE: LIVE, COMPLETED: COMPLETED, NETWORK_C: NETWORK_C, PLACES: P
  };
})(window);
