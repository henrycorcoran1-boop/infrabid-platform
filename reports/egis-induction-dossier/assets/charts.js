/* ==========================================================================
   Chart toolkit — Egis Ireland induction dossier
   Static inline SVG for print. No hover layer: the output is a PDF, so the
   dataviz interaction rules are met instead by direct labels on every mark
   plus a table view of the same data on the same or facing page.
   ========================================================================== */
/* eslint-env browser */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  var C = {
    roads: '#849a12',
    active: '#1160c6',
    ops: '#c9401f',
    rail: '#b03a8e',
    none: '#6b7b84',
    lime: '#abc022',
    limeBright: '#d5f311',
    petrol: '#09212c',
    ink: '#09212c',
    ink2: '#3c4c54',
    ink3: '#6b7b84',
    ink4: '#97a3a9',
    rule: '#dfe5e4',
    surf2: '#f6f8f7',
    surf3: '#eef2f1',
    gradeA: '#2f7d4f',
    gradeB: '#b8801a',
    gradeC: '#6b7b84'
  };
  var SOFT = {
    roads: '#eef1de',
    active: '#e3ecfa',
    ops: '#fae8e3',
    rail: '#f7e7f2',
    none: '#edf0f1'
  };

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    if (attrs) {
      for (var k in attrs) {
        if (attrs[k] !== null && attrs[k] !== undefined) {
          n.setAttribute(k, attrs[k]);
        }
      }
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  function txt(parent, x, y, s, attrs) {
    var t = el('text', Object.assign({
      x: x, y: y, fill: C.ink2, 'font-size': 7, 'font-weight': 500
    }, attrs || {}), parent);
    t.textContent = s;
    return t;
  }

  /* Wrap a string onto <tspan> lines at an approximate character width. */
  function wrapText(parent, x, y, s, width, size, attrs, lh) {
    var perChar = size * 0.53;
    var max = Math.max(4, Math.floor(width / perChar));
    var words = String(s).split(' ');
    var lines = [];
    var cur = '';
    words.forEach(function (w) {
      var test = cur ? cur + ' ' + w : w;
      if (test.length > max && cur) { lines.push(cur); cur = w; } else { cur = test; }
    });
    if (cur) lines.push(cur);
    var step = lh || size * 1.25;
    var a = Object.assign({}, attrs || {});
    /* `up: true` grows the block upward from y, so the LAST line sits on y —
       the caller can then place a label above a mark without it creeping back
       across the mark when it needs two lines. */
    var up = a.up; delete a.up;
    var mid = a.mid; delete a.mid;      /* centre the block vertically on y */
    var y0 = y;
    if (up) y0 = y - (lines.length - 1) * step;
    else if (mid) y0 = y - ((lines.length - 1) * step) / 2;
    var t = el('text', Object.assign({
      x: x, y: y0, 'font-size': size, fill: C.ink2, 'font-weight': 500
    }, a), parent);
    lines.forEach(function (l, i) {
      var ts = el('tspan', { x: x, dy: i === 0 ? 0 : step }, t);
      ts.textContent = l;
    });
    return { node: t, lines: lines.length };
  }

  function svgRoot(host, w, h) {
    var host_ = typeof host === 'string' ? document.getElementById(host) : host;
    if (!host_) return null;
    host_.innerHTML = '';
    var s = el('svg', {
      viewBox: '0 0 ' + w + ' ' + h,
      width: '100%',
      preserveAspectRatio: 'xMidYMid meet',
      'font-family': 'Manrope, sans-serif'
    }, host_);
    return s;
  }

  /* Rounded rect with only the "data end" corners rounded (marks-and-anatomy). */
  function barPath(x, y, w, h, r, side) {
    r = Math.max(0, Math.min(r, h / 2, w / 2));
    if (r === 0) return 'M' + x + ',' + y + 'h' + w + 'v' + h + 'h' + (-w) + 'Z';
    if (side === 'right') {
      return 'M' + x + ',' + y + 'h' + (w - r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r +
        'v' + (h - 2 * r) + 'a' + r + ',' + r + ' 0 0 1 ' + (-r) + ',' + r + 'h' + (-(w - r)) + 'Z';
    }
    if (side === 'top') {
      return 'M' + x + ',' + (y + h) + 'v' + (-(h - r)) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + (-r) +
        'h' + (w - 2 * r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r + 'v' + (h - r) + 'Z';
    }
    return 'M' + (x + r) + ',' + y + 'h' + (w - 2 * r) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r +
      'v' + (h - 2 * r) + 'a' + r + ',' + r + ' 0 0 1 ' + (-r) + ',' + r +
      'h' + (-(w - 2 * r)) + 'a' + r + ',' + r + ' 0 0 1 ' + (-r) + ',' + (-r) +
      'v' + (-(h - 2 * r)) + 'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + (-r) + 'Z';
  }

  /* ---------------------------------------------------------------- donut */

  function donut(host, opt) {
    var w = opt.w || 300, h = opt.h || 300;
    var s = svgRoot(host, w, h);
    if (!s) return;
    var cx = opt.cx || w / 2, cy = opt.cy || h / 2;
    var R = opt.r || Math.min(w, h) / 2 - 46;
    var thick = opt.thickness || 34;
    var total = opt.data.reduce(function (a, d) { return a + d.v; }, 0);
    var gapDeg = 1.6;               /* the 2px surface gap between fills */
    var a = -Math.PI / 2;

    opt.data.forEach(function (d) {
      var sweep = (d.v / total) * Math.PI * 2;
      var g = (gapDeg * Math.PI) / 180;
      var a0 = a + g / 2, a1 = a + sweep - g / 2;
      if (a1 <= a0) a1 = a0 + 0.004;
      var large = (a1 - a0) > Math.PI ? 1 : 0;
      var ro = R, ri = R - thick;
      var p = 'M' + (cx + ro * Math.cos(a0)) + ',' + (cy + ro * Math.sin(a0)) +
        'A' + ro + ',' + ro + ' 0 ' + large + ' 1 ' + (cx + ro * Math.cos(a1)) + ',' + (cy + ro * Math.sin(a1)) +
        'L' + (cx + ri * Math.cos(a1)) + ',' + (cy + ri * Math.sin(a1)) +
        'A' + ri + ',' + ri + ' 0 ' + large + ' 0 ' + (cx + ri * Math.cos(a0)) + ',' + (cy + ri * Math.sin(a0)) + 'Z';
      el('path', { d: p, fill: d.c }, s);

      /* direct label on every segment */
      var mid = (a0 + a1) / 2;
      var lr = R + 15;
      var lx = cx + lr * Math.cos(mid), ly = cy + lr * Math.sin(mid);
      var anchor = Math.cos(mid) > 0.18 ? 'start' : (Math.cos(mid) < -0.18 ? 'end' : 'middle');
      txt(s, lx, ly + 3, String(d.v), {
        'font-size': 15, 'font-weight': 800, fill: d.c, 'text-anchor': anchor
      });
      var lw = wrapText(s, lx, ly + 13, d.k, 74, 6.6, {
        'text-anchor': anchor, fill: C.ink3, 'font-weight': 600
      }, 8);
      void lw;
      a += sweep;
    });

    if (opt.centre) {
      txt(s, cx, cy - 2, opt.centre, {
        'font-size': opt.centreSize || 34, 'font-weight': 800, fill: C.ink,
        'text-anchor': 'middle', 'letter-spacing': '-0.03em'
      });
      txt(s, cx, cy + 14, opt.centreLabel || '', {
        'font-size': 7.5, 'font-weight': 600, fill: C.ink3, 'text-anchor': 'middle',
        'letter-spacing': '0.1em'
      });
    }
  }

  /* ------------------------------------------------------- horizontal bars */

  function hbar(host, opt) {
    var rows = opt.data;
    var labelW = opt.labelW || 130;
    var rowH = opt.rowH || 30;
    var gap = opt.gap || 9;
    var padTop = opt.padTop || 22;
    var padBot = opt.padBot || 20;
    var valueW = opt.valueW || 78;
    var w = opt.w || 640;
    var h = padTop + rows.length * (rowH + gap) - gap + padBot;
    var s = svgRoot(host, w, h);
    if (!s) return;
    var x0 = labelW + 8;
    var plotW = w - x0 - valueW;
    var max = opt.max || Math.max.apply(null, rows.map(function (d) {
      return Math.max(d.v || 0, d.hi || 0);
    }));

    /* recessive gridlines */
    var ticks = opt.ticks || 4;
    for (var i = 0; i <= ticks; i++) {
      var gx = x0 + (plotW * i) / ticks;
      el('line', {
        x1: gx, y1: padTop - 8, x2: gx, y2: h - padBot + 2,
        stroke: C.rule, 'stroke-width': 0.7
      }, s);
      if (opt.tickFmt) {
        txt(s, gx, padTop - 12, opt.tickFmt((max * i) / ticks), {
          'font-size': 6.4, fill: C.ink4, 'text-anchor': 'middle', 'font-weight': 600
        });
      }
    }

    rows.forEach(function (d, i) {
      var y = padTop + i * (rowH + gap);
      var col = d.c || C.roads;

      wrapText(s, labelW, y + (d.sub ? rowH / 2 - 3 : rowH / 2 + 2), d.k, labelW - 4, 7.2, {
        'text-anchor': 'end', fill: C.ink, 'font-weight': 700
      }, 8.2);
      if (d.sub) {
        txt(s, labelW, y + rowH / 2 + 8, d.sub, {
          'font-size': 6.2, fill: C.ink4, 'text-anchor': 'end', 'font-weight': 500
        });
      }

      var bh = opt.barH || 13;
      var by = y + (rowH - bh) / 2;

      /* track */
      el('rect', {
        x: x0, y: by, width: plotW, height: bh, rx: 2, fill: C.surf3
      }, s);

      if (d.lo !== undefined && d.hi !== undefined) {
        /* range bar: a published estimate that spans a band */
        var xl = x0 + (d.lo / max) * plotW;
        var xh = x0 + (d.hi / max) * plotW;
        el('rect', { x: x0, y: by, width: xl - x0, height: bh, rx: 2, fill: col }, s);
        el('rect', {
          x: xl, y: by, width: xh - xl, height: bh,
          fill: col, opacity: 0.34
        }, s);
        el('line', {
          x1: xh, y1: by - 2.5, x2: xh, y2: by + bh + 2.5,
          stroke: col, 'stroke-width': 1.6, 'stroke-linecap': 'round'
        }, s);
        el('line', {
          x1: xl, y1: by - 2.5, x2: xl, y2: by + bh + 2.5,
          stroke: col, 'stroke-width': 1.6, 'stroke-linecap': 'round'
        }, s);
      } else {
        var bw = Math.max(2, (d.v / max) * plotW);
        el('path', { d: barPath(x0, by, bw, bh, 3.2, 'right'), fill: col }, s);
      }

      /* direct value label */
      txt(s, w - valueW + 6, y + rowH / 2 + 3, d.vl, {
        'font-size': 8, 'font-weight': 800, fill: C.ink, 'text-anchor': 'start'
      });
      if (d.note) {
        txt(s, w - valueW + 6, y + rowH / 2 + 11, d.note, {
          'font-size': 5.9, fill: C.ink4, 'font-weight': 500
        });
      }
    });

    /* baseline */
    el('line', {
      x1: x0, y1: h - padBot + 2, x2: w - valueW, y2: h - padBot + 2,
      stroke: C.ink, 'stroke-width': 0.9
    }, s);
  }

  /* --------------------------------------------------------- stacked bar */

  function stackBar(host, opt) {
    var w = opt.w || 640;
    var rowH = opt.rowH || 26;
    var gap = opt.rowGap || 40;
    var padTop = opt.padTop || 26;
    var labelW = opt.labelW || 74;
    var totalW = opt.totalW || 62;
    var h = padTop + opt.rows.length * (rowH + gap);
    var s = svgRoot(host, w, h);
    if (!s) return;
    var x0 = labelW + 6;
    var plotW = w - x0 - totalW;
    var max = opt.max || Math.max.apply(null, opt.rows.map(function (r) {
      return r.segs.reduce(function (a, x) { return a + x.v; }, 0);
    }));
    /* a label needs roughly this much room to sit inside its own segment */
    var fits = function (label, sw, size) { return sw > label.length * size * 0.56 + 10; };

    opt.rows.forEach(function (r, ri) {
      var y = padTop + ri * (rowH + gap);
      txt(s, labelW, y + rowH / 2 + 3, r.k, {
        'font-size': 7.6, 'font-weight': 700, fill: C.ink, 'text-anchor': 'end'
      });
      var cursor = x0;
      /* leader labels stack upward in lanes so two narrow segments never collide */
      var lanes = [];
      r.segs.forEach(function (sg) {
        var sw = (sg.v / max) * plotW;
        if (sg.dashed) {
          el('rect', {
            x: cursor, y: y, width: Math.max(1, sw - 2), height: rowH, rx: 2,
            fill: 'none', stroke: sg.c, 'stroke-width': 1.1, 'stroke-dasharray': '3.5 2.5'
          }, s);
        } else {
          /* 2px surface gap between adjacent fills */
          el('rect', {
            x: cursor, y: y, width: Math.max(1, sw - 2), height: rowH, rx: 1.6, fill: sg.c
          }, s);
        }
        var cxm = cursor + sw / 2;
        if (sg.label) {
          var inside = fits(sg.label, sw, 7);
          if (inside) {
            txt(s, cxm, y + rowH / 2 + 3, sg.label, {
              'font-size': 7, 'font-weight': 700,
              fill: sg.dashed ? sg.c : '#fff', 'text-anchor': 'middle'
            });
          } else {
            var halfW = sg.label.length * 6.6 * 0.56 / 2 + 4;
            var lane = 0;
            while (lanes[lane] !== undefined && cxm - halfW < lanes[lane]) lane++;
            lanes[lane] = cxm + halfW;
            var ly = y - 9 - lane * 9;
            el('path', {
              d: 'M' + cxm + ',' + (y - 2) + 'V' + (ly + 2.5),
              stroke: sg.c, 'stroke-width': 0.8, fill: 'none'
            }, s);
            txt(s, cxm, ly, sg.label, {
              'font-size': 6.6, 'font-weight': 700, fill: sg.c, 'text-anchor': 'middle'
            });
          }
        }
        cursor += sw;
      });
      if (r.total) {
        txt(s, Math.min(cursor + 7, w - totalW + 6), y + rowH / 2 + 3, r.total, {
          'font-size': 8.6, 'font-weight': 800, fill: C.ink
        });
      }
    });
  }

  /* -------------------------------------------------------------- gantt */

  function gantt(host, opt) {
    var y0 = opt.start, y1 = opt.end;
    var rows = opt.rows;
    var labelW = opt.labelW || 150;
    var rowH = opt.rowH || 15;
    var gap = opt.gap || 5.5;
    var padTop = 30;
    var padBot = 26;
    var w = opt.w || 680;
    var h = padTop + rows.length * (rowH + gap) + padBot;
    var s = svgRoot(host, w, h);
    if (!s) return;
    var x0 = labelW + 8;
    var plotW = w - x0 - 12;
    var span = y1 - y0;
    var X = function (v) { return x0 + ((v - y0) / span) * plotW; };

    /* hatch pattern for probable / legacy evidence */
    var defs = el('defs', null, s);
    ['roads', 'active', 'ops', 'rail', 'none'].forEach(function (key) {
      var p = el('pattern', {
        id: 'h-' + key, width: 4.5, height: 4.5,
        patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)'
      }, defs);
      el('rect', { width: 4.5, height: 4.5, fill: SOFT[key] }, p);
      el('line', { x1: 0, y1: 0, x2: 0, y2: 4.5, stroke: C[key], 'stroke-width': 1.7 }, p);
    });

    /* year gridlines */
    for (var yr = Math.ceil(y0); yr <= y1; yr++) {
      var gx = X(yr);
      var isNow = yr === opt.nowYear;
      el('line', {
        x1: gx, y1: padTop - 12, x2: gx, y2: h - padBot + 4,
        stroke: isNow ? C.rule : C.rule, 'stroke-width': 0.7
      }, s);
      txt(s, gx, padTop - 16, String(yr), {
        'font-size': 6.6, fill: C.ink4, 'text-anchor': 'middle', 'font-weight': 700
      });
    }

    /* "today" marker */
    if (opt.now) {
      var nx = X(opt.now);
      el('line', {
        x1: nx, y1: padTop - 12, x2: nx, y2: h - padBot + 4,
        stroke: C.petrol, 'stroke-width': 1.2, 'stroke-dasharray': '2.5 2'
      }, s);
      txt(s, nx, h - padBot + 14, opt.nowLabel || 'information date', {
        'font-size': 6.2, fill: C.petrol, 'text-anchor': 'middle', 'font-weight': 700
      });
    }

    rows.forEach(function (r, i) {
      var y = padTop + i * (rowH + gap);
      if (i % 2 === 1) {
        el('rect', { x: 6, y: y - gap / 2, width: w - 12, height: rowH + gap, fill: C.surf2 }, s);
      }
      txt(s, labelW, y + rowH / 2 + 2.6, r.k, {
        'font-size': 6.9, 'font-weight': 700, fill: C.ink, 'text-anchor': 'end'
      });
      r.bars.forEach(function (b) {
        var bx = X(b.a), bw = Math.max(3, X(b.b) - X(b.a));
        el('rect', {
          x: bx, y: y, width: bw, height: rowH, rx: 2.6,
          fill: b.hatch ? 'url(#h-' + (r.cat || 'roads') + ')' : C[r.cat || 'roads'],
          stroke: b.hatch ? C[r.cat || 'roads'] : 'none',
          'stroke-width': b.hatch ? 0.6 : 0
        }, s);
        if (b.label) {
          txt(s, bx + bw / 2, y + rowH / 2 + 2.4, b.label, {
            'font-size': 5.9, 'font-weight': 700,
            fill: b.hatch ? C[r.cat || 'roads'] : '#fff', 'text-anchor': 'middle'
          });
        }
      });
      (r.marks || []).forEach(function (m) {
        var mx = X(m.at);
        el('circle', {
          cx: mx, cy: y + rowH / 2, r: 4.4,
          fill: C.petrol, stroke: '#fff', 'stroke-width': 1.4
        }, s);
        txt(s, mx, y + rowH / 2 + 2.1, String(m.n), {
          'font-size': 5.4, 'font-weight': 800, fill: C.limeBright, 'text-anchor': 'middle'
        });
      });
    });
  }

  /* ------------------------------------------------------------ timeline */

  function timeline(host, opt) {
    var w = opt.w || 660;
    var h = opt.h || 150;
    var s = svgRoot(host, w, h);
    if (!s) return;
    var pad = opt.pad || 26;
    var axisY = opt.axisY || h * 0.52;
    var min = opt.min, max = opt.max;
    var inner = w - 2 * pad;

    /* Optional piecewise scale. `bands` is a list of {from,to,share}: recent
       years get more width than distant ones so clustered events stay legible.
       The break is drawn explicitly so the compression is never implied. */
    var X;
    if (opt.bands) {
      var acc = [];
      var cum = 0;
      opt.bands.forEach(function (b) {
        acc.push({ from: b.from, to: b.to, x0: cum, x1: cum + b.share });
        cum += b.share;
      });
      X = function (v) {
        for (var i = 0; i < acc.length; i++) {
          var b = acc[i];
          if (v <= b.to || i === acc.length - 1) {
            var t = (v - b.from) / (b.to - b.from);
            t = Math.max(0, Math.min(1, t));
            return pad + (b.x0 + t * (b.x1 - b.x0)) / cum * inner;
          }
        }
        return pad;
      };
      /* axis break marks between bands */
      for (var bi = 1; bi < acc.length; bi++) {
        var bx = pad + (acc[bi].x0 / cum) * inner;
        el('path', {
          d: 'M' + (bx - 3.5) + ',' + (axisY + 4) + 'l3,-8M' + (bx + 1.5) + ',' + (axisY + 4) + 'l3,-8',
          stroke: '#fff', 'stroke-width': 2.4, fill: 'none'
        }, s);
        el('path', {
          d: 'M' + (bx - 3.5) + ',' + (axisY + 4) + 'l3,-8M' + (bx + 1.5) + ',' + (axisY + 4) + 'l3,-8',
          stroke: C.ink4, 'stroke-width': 0.9, fill: 'none'
        }, s);
      }
    } else {
      X = function (v) { return pad + ((v - min) / (max - min)) * inner; };
    }

    el('line', {
      x1: pad - 8, y1: axisY, x2: w - pad + 8, y2: axisY,
      stroke: C.rule, 'stroke-width': 1.4, 'stroke-linecap': 'round'
    }, s);

    opt.events.forEach(function (e, i) {
      var x = X(e.at);
      var up = e.up !== undefined ? e.up : i % 2 === 0;
      var stemLen = e.stem || 26;
      var ty = up ? axisY - stemLen : axisY + stemLen;
      el('line', {
        x1: x, y1: axisY, x2: x, y2: ty,
        stroke: e.c || C.lime, 'stroke-width': 1.1
      }, s);
      el('circle', {
        cx: x, cy: axisY, r: e.big ? 4.4 : 3.2,
        fill: e.c || C.lime, stroke: '#fff', 'stroke-width': 1.5
      }, s);
      txt(s, x, up ? ty - 8 : ty + 9, e.y, {
        'font-size': 7.4, 'font-weight': 800, fill: e.c || C.ink, 'text-anchor': 'middle'
      });
      /* For events above the axis the year sits highest and the description
         reads downward toward the stem; below the axis the order mirrors. */
      wrapText(s, x, up ? ty - 1 : ty + 17, e.k, e.wrap || 76, 6.2, {
        'text-anchor': 'middle', fill: C.ink3, 'font-weight': 600
      }, 7.2);
    });
  }

  /* ------------------------------------------------------ corridor schematic */

  function corridor(host, opt) {
    var w = opt.w || 640;
    var h = opt.h || 118;
    var s = svgRoot(host, w, h);
    if (!s) return;
    /* Endpoint names sit outside the alignment, level with it, so they can
       never collide with the node labels above and below. */
    var padL = opt.padL || 66, padR = opt.padR || 66;
    var y = opt.y || h * 0.5;
    var x0 = padL, x1 = w - padR;
    var col = opt.c || C.roads;
    var segY = opt.segY || (y - 30);

    /* the alignment: a thick recessive casing with a coloured core */
    el('line', {
      x1: x0, y1: y, x2: x1, y2: y,
      stroke: SOFT[opt.cat || 'roads'], 'stroke-width': 13, 'stroke-linecap': 'round'
    }, s);
    (opt.segments || [{ a: 0, b: 1 }]).forEach(function (sg) {
      var sa = x0 + (x1 - x0) * sg.a, sb = x0 + (x1 - x0) * sg.b;
      el('line', {
        x1: sa, y1: y, x2: sb, y2: y,
        stroke: sg.c || col,
        'stroke-width': sg.thin ? 3.4 : 6,
        'stroke-linecap': 'round',
        'stroke-dasharray': sg.dashed ? '5 3.5' : null
      }, s);
      if (sg.label) {
        /* a span rule above the segment, then its label — no overlap with nodes */
        el('path', {
          d: 'M' + sa + ',' + (segY + 5) + 'v-3H' + sb + 'v3',
          fill: 'none', stroke: sg.c || col, 'stroke-width': 0.7, opacity: 0.7
        }, s);
        txt(s, (sa + sb) / 2, segY, sg.label, {
          'font-size': 6.2, 'font-weight': 700, fill: sg.c || col, 'text-anchor': 'middle'
        });
      }
    });

    /* end caps, labelled outboard */
    el('circle', { cx: x0, cy: y, r: 5, fill: '#fff', stroke: col, 'stroke-width': 2.2 }, s);
    el('circle', { cx: x1, cy: y, r: 5, fill: '#fff', stroke: col, 'stroke-width': 2.2 }, s);
    wrapText(s, x0 - 9, y + 2.4, opt.from, padL - 12, 7, {
      'text-anchor': 'end', fill: C.ink, 'font-weight': 800, mid: true
    }, 7.8);
    wrapText(s, x1 + 9, y + 2.4, opt.to, padR - 12, 7, {
      'text-anchor': 'start', fill: C.ink, 'font-weight': 800, mid: true
    }, 7.8);

    /* nodes along the alignment */
    (opt.nodes || []).forEach(function (nd) {
      var x = x0 + (x1 - x0) * nd.at;
      var up = nd.up !== false;
      var r = nd.kind === 'hub' ? 4 : 3;
      if (nd.kind === 'junction') {
        el('rect', {
          x: x - 3.2, y: y - 3.2, width: 6.4, height: 6.4, rx: 1,
          fill: '#fff', stroke: nd.c || col, 'stroke-width': 1.8,
          transform: 'rotate(45 ' + x + ' ' + y + ')'
        }, s);
      } else {
        el('circle', {
          cx: x, cy: y, r: r, fill: nd.kind === 'hub' ? (nd.c || col) : '#fff',
          stroke: nd.c || col, 'stroke-width': 1.8
        }, s);
      }
      el('line', {
        x1: x, y1: up ? y - 7 : y + 7, x2: x, y2: up ? y - 11 : y + 11,
        stroke: C.ink4, 'stroke-width': 0.7
      }, s);
      wrapText(s, x, up ? y - 14 : y + 19, nd.k, nd.wrap || 62, 6.1, {
        'text-anchor': 'middle', fill: C.ink2, 'font-weight': 600, up: up
      }, 7);
    });
  }

  /* --------------------------------------------------------- line diagram */

  function lineDiagram(host, opt) {
    var w = opt.w || 640;
    var h = opt.h || 108;
    var s = svgRoot(host, w, h);
    if (!s) return;
    var padL = 30, padR = 30;
    var y = opt.y || 46;
    var x0 = padL, x1 = w - padR;
    var col = opt.c || C.rail;

    el('line', {
      x1: x0, y1: y, x2: x1, y2: y,
      stroke: col, 'stroke-width': 5.5, 'stroke-linecap': 'round'
    }, s);

    opt.stops.forEach(function (st, i) {
      var x = x0 + (x1 - x0) * st.at;
      var isNew = st.isNew !== false;
      el('circle', {
        cx: x, cy: y, r: isNew ? 5.4 : 4.4,
        fill: isNew ? '#fff' : col, stroke: col, 'stroke-width': isNew ? 2.6 : 2.6
      }, s);
      var up = i % 2 === 0;
      wrapText(s, x, up ? y - 14 : y + 20, st.k, st.wrap || 66, 6.4, {
        'text-anchor': 'middle', fill: C.ink, 'font-weight': 700
      }, 7.2);
      if (st.sub) {
        txt(s, x, up ? y - 6 : y + 28, st.sub, {
          'font-size': 5.8, fill: C.ink4, 'text-anchor': 'middle', 'font-weight': 500
        });
      }
    });

    (opt.features || []).forEach(function (f) {
      var x = x0 + (x1 - x0) * f.at;
      el('path', {
        d: 'M' + (x - 7) + ',' + (y + 11) + 'q7,-7 14,0',
        fill: 'none', stroke: f.c || C.ink4, 'stroke-width': 1.5, 'stroke-linecap': 'round'
      }, s);
      txt(s, x, y + 24, f.k, {
        'font-size': 5.8, fill: C.ink3, 'text-anchor': 'middle', 'font-weight': 600
      });
    });
  }

  /* --------------------------------------------------------- matrix / heat */

  function matrix(host, opt) {
    var cols = opt.cols, rows = opt.rows;
    var labelW = opt.labelW || 126;
    var cellW = opt.cellW || 86;
    var cellH = opt.cellH || 30;
    var headH = opt.headH || 34;
    var w = labelW + cols.length * cellW;
    var h = headH + rows.length * cellH + 6;
    var s = svgRoot(host, w, h);
    if (!s) return;

    cols.forEach(function (c, ci) {
      var x = labelW + ci * cellW + cellW / 2;
      wrapText(s, x, headH - 15, c.k, cellW - 8, 6.3, {
        'text-anchor': 'middle', fill: C.ink, 'font-weight': 800
      }, 7);
      if (c.sub) {
        txt(s, x, headH - 4, c.sub, {
          'font-size': 5.7, fill: C.ink4, 'text-anchor': 'middle', 'font-weight': 600
        });
      }
    });
    el('line', {
      x1: 0, y1: headH, x2: w, y2: headH, stroke: C.ink, 'stroke-width': 0.9
    }, s);

    rows.forEach(function (r, ri) {
      var y = headH + ri * cellH;
      wrapText(s, labelW - 7, y + cellH / 2 - (r.sub ? 2 : -2), r.k, labelW - 12, 6.8, {
        'text-anchor': 'end', fill: C.ink, 'font-weight': 700
      }, 7.6);
      if (r.sub) {
        txt(s, labelW - 7, y + cellH / 2 + 7, r.sub, {
          'font-size': 5.7, fill: C.ink4, 'text-anchor': 'end', 'font-weight': 500
        });
      }
      el('line', {
        x1: 0, y1: y + cellH, x2: w, y2: y + cellH, stroke: C.rule, 'stroke-width': 0.5
      }, s);

      cols.forEach(function (c, ci) {
        var v = r.v[ci];
        var x = labelW + ci * cellW;
        if (!v) return;
        var col = C[c.cat || 'roads'];
        /* strength encoded by fill weight AND by a printed count — never colour alone */
        var strong = v.n >= 3;
        el('rect', {
          x: x + 3, y: y + 3.4, width: cellW - 6, height: cellH - 6.8, rx: 1.8,
          fill: strong ? col : SOFT[c.cat || 'roads'],
          stroke: strong ? 'none' : col, 'stroke-width': strong ? 0 : 0.7
        }, s);
        txt(s, x + cellW / 2, y + cellH / 2 - 1, String(v.n), {
          'font-size': 9, 'font-weight': 800,
          fill: strong ? '#fff' : col, 'text-anchor': 'middle'
        });
        if (v.t) {
          txt(s, x + cellW / 2, y + cellH / 2 + 8, v.t, {
            'font-size': 5.4, 'font-weight': 600,
            fill: strong ? 'rgba(255,255,255,.86)' : C.ink3, 'text-anchor': 'middle'
          });
        }
      });
    });
  }

  /* ------------------------------------------------------------- scatter */

  function scatter(host, opt) {
    var w = opt.w || 620, h = opt.h || 330;
    var s = svgRoot(host, w, h);
    if (!s) return;
    var m = opt.margin || { t: 20, r: 22, b: 40, l: 52 };
    var pw = w - m.l - m.r, ph = h - m.t - m.b;
    var X = function (v) { return m.l + (v / 100) * pw; };
    var Y = function (v) { return m.t + ph - (v / 100) * ph; };

    /* quadrant wash */
    if (opt.quadrants) {
      el('rect', { x: m.l, y: m.t, width: pw / 2, height: ph / 2, fill: C.surf2 }, s);
      el('rect', {
        x: m.l + pw / 2, y: m.t, width: pw / 2, height: ph / 2, fill: SOFT.roads, opacity: 0.55
      }, s);
      el('rect', {
        x: m.l, y: m.t + ph / 2, width: pw / 2, height: ph / 2, fill: '#fff'
      }, s);
      el('rect', {
        x: m.l + pw / 2, y: m.t + ph / 2, width: pw / 2, height: ph / 2, fill: C.surf2
      }, s);
      el('line', {
        x1: m.l + pw / 2, y1: m.t, x2: m.l + pw / 2, y2: m.t + ph,
        stroke: C.rule, 'stroke-width': 0.8, 'stroke-dasharray': '3 2.5'
      }, s);
      el('line', {
        x1: m.l, y1: m.t + ph / 2, x2: m.l + pw, y2: m.t + ph / 2,
        stroke: C.rule, 'stroke-width': 0.8, 'stroke-dasharray': '3 2.5'
      }, s);
      (opt.quadrantLabels || []).forEach(function (q) {
        txt(s, X(q.x), Y(q.y), q.k, {
          'font-size': 6, fill: C.ink4, 'font-weight': 700,
          'text-anchor': q.anchor || 'middle', 'letter-spacing': '.09em'
        });
      });
    }

    /* frame */
    el('rect', {
      x: m.l, y: m.t, width: pw, height: ph,
      fill: 'none', stroke: C.rule, 'stroke-width': 0.8
    }, s);

    /* axes */
    txt(s, m.l + pw / 2, h - 8, opt.xLabel, {
      'font-size': 6.6, fill: C.ink3, 'text-anchor': 'middle', 'font-weight': 700,
      'letter-spacing': '.05em'
    });
    var yt = txt(s, 12, m.t + ph / 2, opt.yLabel, {
      'font-size': 6.6, fill: C.ink3, 'text-anchor': 'middle', 'font-weight': 700,
      'letter-spacing': '.05em'
    });
    yt.setAttribute('transform', 'rotate(-90 12 ' + (m.t + ph / 2) + ')');
    if (opt.xLo) {
      txt(s, m.l, h - 21, opt.xLo, { 'font-size': 5.9, fill: C.ink4, 'font-weight': 600 });
      txt(s, m.l + pw, h - 21, opt.xHi, {
        'font-size': 5.9, fill: C.ink4, 'font-weight': 600, 'text-anchor': 'end'
      });
    }

    opt.points.forEach(function (p) {
      var x = X(p.x), y = Y(p.y);
      var r = p.r || 5.5;
      el('circle', {
        cx: x, cy: y, r: r + 1.4, fill: '#fff'          /* 2px surface ring */
      }, s);
      el('circle', {
        cx: x, cy: y, r: r, fill: p.hollow ? '#fff' : (p.c || C.none),
        stroke: p.c || C.none, 'stroke-width': p.hollow ? 1.8 : 0
      }, s);
      var dx = p.lx || 0, dy = p.ly || 0;
      wrapText(s, x + dx, y + dy, p.k, p.wrap || 84, 6.3, {
        'text-anchor': p.anchor || 'middle', fill: C.ink, 'font-weight': 700
      }, 7);
    });
  }

  /* ----------------------------------------------------------- process flow */

  function flow(host, opt) {
    var w = opt.w || 660;
    var stepW = opt.stepW || 96;
    var stepH = opt.stepH || 44;
    var gap = opt.gap || 12;
    var padTop = opt.padTop || 18;
    var h = padTop + stepH + 54;
    var s = svgRoot(host, w, h);
    if (!s) return;
    var n = opt.steps.length;
    var totalW = n * stepW + (n - 1) * gap;
    var startX = (w - totalW) / 2;

    opt.steps.forEach(function (st, i) {
      var x = startX + i * (stepW + gap);
      var col = st.c || C.roads;
      el('path', {
        d: 'M' + x + ',' + padTop + 'h' + (stepW - 9) + 'l9,' + (stepH / 2) +
           'l-9,' + (stepH / 2) + 'h' + (-(stepW - 9)) + 'l9,' + (-stepH / 2) + 'Z',
        fill: st.solid ? col : SOFT[st.cat || 'roads'],
        stroke: st.solid ? 'none' : col, 'stroke-width': 0.8
      }, s);
      /* the chevron notch eats ~9 units at each end, so keep text inside that */
      var inner = stepW - 24;
      txt(s, x + stepW / 2, padTop + 17, st.k, {
        'font-size': 7.6, 'font-weight': 800,
        fill: st.solid ? '#fff' : col, 'text-anchor': 'middle'
      });
      wrapText(s, x + stepW / 2, padTop + 27, st.sub, inner, 5.8, {
        'text-anchor': 'middle', 'font-weight': 600,
        fill: st.solid ? 'rgba(255,255,255,.88)' : C.ink3
      }, 6.6);
      if (st.gate) {
        var gx = x + stepW + gap / 2 - 1;
        el('path', {
          d: 'M' + gx + ',' + (padTop - 9) + 'l6,6l-6,6l-6,-6Z',
          fill: '#fff', stroke: C.petrol, 'stroke-width': 1.3
        }, s);
        txt(s, gx, padTop - 13, st.gate, {
          'font-size': 5.6, 'font-weight': 800, fill: C.petrol, 'text-anchor': 'middle'
        });
      }
      if (st.note) {
        wrapText(s, x + stepW / 2, padTop + stepH + 13, st.note, stepW + gap - 4, 5.9, {
          'text-anchor': 'middle', fill: C.ink3, 'font-weight': 500
        }, 6.8);
      }
    });
  }

  /* --------------------------------------------------------- cross-section */

  function crossSection(host, opt) {
    var w = opt.w || 200, h = opt.h || 132;
    var s = svgRoot(host, w, h);
    if (!s) return;
    var groundY = opt.groundY || 74;           /* road surface level */
    var slabH = opt.slabH || 15;
    var lanes = opt.lanes;                     /* [{w, kind}] */
    var totalUnits = lanes.reduce(function (a, l) { return a + l.w; }, 0);
    var padX = 12;
    var scale = (w - 2 * padX) / totalUnits;
    var col = C[opt.cat || 'roads'];

    /* embankment and ground line */
    el('path', {
      d: 'M1,' + (groundY + 13) + 'L' + (padX - 7) + ',' + groundY +
         'H' + (w - padX + 7) + 'L' + (w - 1) + ',' + (groundY + 13) + 'Z',
      fill: '#e7ece6'
    }, s);
    el('line', {
      x1: 1, y1: groundY + 13, x2: w - 1, y2: groundY + 13,
      stroke: '#c9d2cc', 'stroke-width': 0.8
    }, s);

    var x = padX;
    lanes.forEach(function (l) {
      var lw = l.w * scale;
      var fill = C.surf2, stroke = null;
      if (l.kind === 'carriage') { fill = '#46565e'; }
      if (l.kind === 'cycle') { fill = SOFT.active; stroke = C.active; }
      if (l.kind === 'foot') { fill = '#eceee9'; stroke = '#b9c3c2'; }
      if (l.kind === 'verge') { fill = '#dde4da'; }
      if (l.kind === 'median') { fill = '#aeb9b3'; }
      el('rect', {
        x: x, y: groundY - slabH, width: Math.max(1, lw - 0.6),
        height: slabH, fill: fill, stroke: stroke, 'stroke-width': stroke ? 0.6 : 0
      }, s);
      /* lane markings */
      if (l.kind === 'carriage' && l.lanes > 1) {
        for (var i = 1; i < l.lanes; i++) {
          el('line', {
            x1: x + (lw / l.lanes) * i, y1: groundY - slabH + 1.5,
            x2: x + (lw / l.lanes) * i, y2: groundY - 1.5,
            stroke: '#fff', 'stroke-width': 0.7, 'stroke-dasharray': '2.4 2.4'
          }, s);
        }
      }
      x += lw;
    });

    /* dimension line below the ground line, label below that */
    var dy = groundY + 24;
    el('line', { x1: padX, y1: dy, x2: w - padX, y2: dy, stroke: col, 'stroke-width': 0.9 }, s);
    [padX, w - padX].forEach(function (px) {
      el('line', { x1: px, y1: dy - 3.5, x2: px, y2: dy + 3.5, stroke: col, 'stroke-width': 0.9 }, s);
    });
    wrapText(s, w / 2, dy + 11, opt.width, w - 6, 6.4, {
      'text-anchor': 'middle', fill: col, 'font-weight': 800
    }, 7.2);

    txt(s, w / 2, 12, opt.title, {
      'font-size': 7.4, 'font-weight': 800, fill: C.ink, 'text-anchor': 'middle'
    });
    wrapText(s, w / 2, 21, opt.sub, w - 6, 5.9, {
      'text-anchor': 'middle', fill: C.ink4, 'font-weight': 600
    }, 6.6);
    if (opt.schemes) {
      wrapText(s, w / 2, dy + 26, opt.schemes, w - 8, 5.8, {
        'text-anchor': 'middle', fill: C.ink3, 'font-weight': 600
      }, 6.6);
    }
  }

  /* -------------------------------------------------------------- exports */

  global.EgisCharts = {
    C: C, SOFT: SOFT, el: el, txt: txt, wrapText: wrapText, svgRoot: svgRoot,
    barPath: barPath,
    donut: donut, hbar: hbar, stackBar: stackBar, gantt: gantt, timeline: timeline,
    corridor: corridor, lineDiagram: lineDiagram, matrix: matrix, scatter: scatter,
    flow: flow, crossSection: crossSection
  };
})(window);
