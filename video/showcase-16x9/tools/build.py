"""Writes the showcase film (index.html, compositions/*.html) from one description, so every scene uses the
same crops, card sizes and voice timings. Run from the project root: python3 tools/build.py

Times inside a scene are local to it. Scene starts come from the voice-over's word timings
(assets/vo/transcript.json), with the voice placed at VO = 0.3 s."""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOXES = json.loads((ROOT / 'assets/screens/boxes.json').read_text())
WORDS = json.loads((ROOT / 'assets/vo/transcript.json').read_text())
VO = 0.3
S = 2  # screenshot CSS px -> frame px: the app at twice its size, so its body text is 28 px
TOP, BAR_Y, BAR_H = 364, 838, 74  # the part of a typing screen shown above its search bar, in CSS px
CARD_X, CARD_Y = 1000, 60
CARD_W, CARD_H = 412 * S, (TOP + BAR_H) * S

NIGHT, PAPER, GOLD, GREEN, INK, INK_NIGHT = '#1f242c', '#faf8f3', '#e6c77e', '#1f6b57', '#1f1d1a', '#d3d9e1'

# Scenes: id, file, start, duration. Each starts on the voice's first word of its line.
SCENES = [
    ('open', 0.0, 8.15),
    ('typing', 8.15, 7.6),
    ('hadith', 15.75, 4.8),
    ('meaning', 20.55, 7.25),
    ('word', 27.8, 3.15),
    ('browse', 30.95, 5.5),
    ('free', 36.45, 3.85),
    ('end', 40.3, 6.2),
]
FILM = 46.5


def word_at(i):
    return round(WORDS[i]['start'] + VO, 2)


# ---------------------------------------------------------------- shared pieces

BASE_CSS = f"""
    @font-face {{ font-family: 'Amiri'; src: url('assets/fonts/amiri.woff2') format('woff2'); }}
    #root {{ position: absolute; inset: 0; overflow: hidden; background: {PAPER}; font-family: 'Inter', sans-serif; }}
    .ground {{ position: absolute; inset: 0; }}
    .card {{ position: absolute; width: {CARD_W}px; border-radius: 44px; overflow: hidden; background: {PAPER};
      border: 1px solid #e4dfd3; box-shadow: 0 40px 90px rgba(31, 29, 26, 0.18); }}
    .cam {{ position: absolute; inset: 0; }}
    .fr {{ position: absolute; inset: 0; opacity: 0; }}
    .shot {{ position: absolute; left: 0; background-repeat: no-repeat; background-size: {412 * S}px auto; }}
    .fade {{ position: absolute; left: 0; width: 100%; height: 80px; background: linear-gradient(rgba(250, 248, 243, 0), {PAPER}); }}
    .lift {{ position: absolute; border-radius: 22px; overflow: hidden; background: {PAPER};
      box-shadow: 0 30px 70px rgba(31, 29, 26, 0.22); }}
    .k {{ position: absolute; left: 120px; width: 800px; color: {INK}; letter-spacing: -0.03em; }}
    .k span, .w {{ display: inline-block; }}
"""


def shot(src, y, h, top=0, x=0, w=412, sid=''):
    ident = f' id="{sid}"' if sid else ''
    return (f'<div{ident} class="shot" style="top:{top}px;width:{w * S}px;height:{h * S}px;'
            f'background-image:url(assets/screens/{src}.png);background-position:{-x * S}px {-y * S}px"></div>')


def tframe(fid, src, top=TOP):
    """A typing screen: its top (header and first results), then its search bar."""
    th = top * S
    return (f'<div id="{fid}" class="fr">{shot(src, 0, top)}<div class="fade" style="top:{th - 80}px"></div>'
            f'{shot(src, BAR_Y, BAR_H, top=th)}</div>')


def cframe(fid, src, y, h, op=0):
    return f'<div id="{fid}" class="fr" style="opacity:{op}">{shot(src, y, h)}</div>'


STEPS_JS = """
      // One frame of the real app at a time: each appears as the previous one goes.
      const steps = (list) => list.forEach(([id, t], k) => {
        tl.set(id, { opacity: 1 }, t);
        if (k) tl.set(list[k - 1][0], { opacity: 0 }, t);
      });
      const blurIn = (sel, t, d = 0.2, stagger = 0, px = 8) => tl.fromTo(sel, { opacity: 0, filter: `blur(${px}px)` },
        { opacity: 1, filter: 'blur(0px)', duration: d, stagger, ease: 'power2.out' }, t);
      const blurOut = (sel, t, d = 0.2, stagger = 0) => tl.to(sel, { opacity: 0, filter: 'blur(8px)', duration: d, stagger, ease: 'power2.in' }, t);
"""

GEO_JS = """
      // The khatam: the eight-pointed star of two squares, as in the app's icon.
      const NS = 'http://www.w3.org/2000/svg';
      const khatam = (cx, cy, r, rot = 0) => Array.from({ length: 16 }, (_, k) => {
        const a = ((rot - 90 + k * 22.5) * Math.PI) / 180, rr = k % 2 ? r * 0.7654 : r;
        return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`;
      }).join(' ');
      const diamond = (cx, cy, h) => `${cx},${cy - h} ${cx + h},${cy} ${cx},${cy + h} ${cx - h},${cy}`;
      const poly = (parent, points, attrs = {}) => {
        const p = document.createElementNS(NS, 'polygon');
        p.setAttribute('points', points);
        p.setAttribute('pathLength', 1);
        for (const [k, v] of Object.entries(attrs)) p.setAttribute(k, v);
        parent.appendChild(p);
        return p;
      };
      // An 8-fold tessellation: stars touching tip to tip, diamonds where four stars meet.
      // keep(x, y) decides which cells are drawn; each piece remembers its distance from (ox, oy).
      const tessellate = (parent, T, keep, ox, oy) => {
        const out = [];
        for (let j = -5; j <= 5; j++) for (let i = -8; i <= 8; i++) {
          const x = 960 + i * T, y = 540 + j * T;
          if (keep(x, y)) out.push(Object.assign(poly(parent, khatam(x, y, T / 2)), { d: Math.hypot(x - ox, y - oy), cx: x, cy: y }));
          const dx = x + T / 2, dy = y + T / 2;
          if (keep(dx, dy)) out.push(Object.assign(poly(parent, diamond(dx, dy, (T / 2) * (Math.SQRT2 - 1) * 1.0)), { d: Math.hypot(dx - ox, dy - oy), cx: dx, cy: dy }));
        }
        return out.sort((a, b) => a.d - b.d);
      };
"""


def scene(sid, body, script, css='', ground=PAPER, asyncb=False):
    reg = f"window.__timelines['{sid}'] = tl;"
    if asyncb:
        js = f"""
    (() => {{
      const tl = gsap.timeline({{ paused: true }});{STEPS_JS}{GEO_JS}
      document.fonts.ready.then(() => {{{script}
        {reg}
      }});
    }})();"""
    else:
        js = f"""
    (() => {{
      const tl = gsap.timeline({{ paused: true }});{STEPS_JS}{GEO_JS}{script}
      {reg}
    }})();"""
    return f"""<template>
  <style>{BASE_CSS}
    #root {{ background: {ground}; }}{css}
  </style>
  <div id="root" data-composition-id="{sid}" data-width="1920" data-height="1080" data-layout-allow-overlap data-layout-allow-overflow>
{body}
  </div>
  <script>{js}
  </script>
</template>
"""


def write(name, html):
    (ROOT / 'compositions' / f'{name}.html').write_text(html)


def card(cid, inner, x=CARD_X, y=CARD_Y, h=CARD_H, style=''):
    return f'    <div id="{cid}" class="card" style="left:{x}px;top:{y}px;height:{h}px;{style}"><div id="{cid}-cam" class="cam">{inner}</div></div>'


def lift(lid, src, y, h, x, top, left, w=412):
    return f'    <div id="{lid}" class="lift" style="left:{left}px;top:{top}px;width:{w * S}px;height:{h * S}px">{shot(src, y, h, x=x, w=w)}</div>'


# ---------------------------------------------------------------- 1. open: the star, the icon, the name (0–8.15)
ICON_X, ICON_Y = 586, 540  # icon centre once the wordmark is beside it
open_body = f"""
    <div id="open-cam" class="ground">
      <svg id="open-tess" class="ground" viewBox="0 0 1920 1080" width="1920" height="1080"></svg>
      <svg id="open-geo" class="ground" viewBox="0 0 1920 1080" width="1920" height="1080">
        <g id="open-build">
          <circle id="open-circle" class="guide" cx="960" cy="540" r="300" pathLength="1"></circle>
          <g id="open-axes"></g>
          <polygon id="open-sq1" class="mid" pathLength="1"></polygon>
          <polygon id="open-sq2" class="mid" pathLength="1"></polygon>
        </g>
        <polygon id="open-star" pathLength="1" stroke-width="6"></polygon>
        <polygon id="open-rosette" pathLength="1" stroke-width="3"></polygon>
      </svg>
    </div>
    <svg id="open-tess2" class="ground" viewBox="0 0 1920 1080" width="1920" height="1080"></svg>
    <img id="open-icon" src="assets/icon-512.png" alt="Mufahras icon" style="position:absolute;left:{960 - 130}px;top:{540 - 130}px;width:260px;height:260px;border-radius:56px">
    <div id="open-word" style="position:absolute;left:754px;top:388px;font-weight:900;font-size:168px;letter-spacing:-0.035em;color:{PAPER};line-height:1">{''.join(f'<span>{c}</span>' for c in 'Mufahras')}</div>
    <div id="open-ar" dir="rtl" style="position:absolute;left:754px;top:580px;width:690px;text-align:left;font-family:Amiri;font-size:92px;color:{GOLD};line-height:1.2">مُفَهْرَس</div>
    <div id="open-iris" class="ground" style="background:{PAPER}"></div>"""
open_css = f"""
    #open-geo *, #open-tess *, #open-tess2 * {{ fill: none; stroke: {GOLD}; stroke-linejoin: miter; stroke-linecap: round; }}
    #open-geo .guide {{ stroke-opacity: 0.42; stroke-width: 2; }}
    #open-geo .mid {{ stroke-opacity: 0.65; stroke-width: 2.5; }}
    #open-tess polygon, #open-tess2 polygon {{ stroke-width: 2; stroke-opacity: 0.5; }}"""
open_js = f"""
      const geo = document.getElementById('open-geo');
      const P = (k, r = 300) => {{ const a = ((k * 45 - 90) * Math.PI) / 180; return [960 + r * Math.cos(a), 540 + r * Math.sin(a)]; }};
      const pts = (l) => l.map(([x, y]) => `${{x.toFixed(1)}},${{y.toFixed(1)}}`).join(' ');
      const axes = document.getElementById('open-axes');
      for (let k = 0; k < 4; k++) {{
        const [a, b] = [P(k), P(k + 4)], l = document.createElementNS(NS, 'line');
        Object.entries({{ x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: 'guide axis', pathLength: 1 }}).forEach(([k2, v]) => l.setAttribute(k2, v));
        axes.appendChild(l);
      }}
      document.getElementById('open-sq1').setAttribute('points', pts([0, 2, 4, 6].map((k) => P(k))));
      document.getElementById('open-sq2').setAttribute('points', pts([1, 3, 5, 7].map((k) => P(k))));
      document.getElementById('open-star').setAttribute('points', khatam(960, 540, 300));
      document.getElementById('open-rosette').setAttribute('points', khatam(960, 540, 126, 22.5));
      // The pattern grows out of the star; a second copy, clear of the name, waits behind the icon.
      const tess = tessellate(document.getElementById('open-tess'), 170, (x, y) => Math.hypot(x - 960, y - 540) > 330, 960, 540);
      const tess2 = tessellate(document.getElementById('open-tess2'), 170, (x, y) => Math.abs(y - 540) > 250 || x < 330 || x > 1640, {ICON_X}, {ICON_Y});
      gsap.set('#open-geo [pathLength], #open-tess polygon, #open-tess2 polygon', {{ strokeDasharray: 1, strokeDashoffset: 1 }});

      const draw = (sel, t, d, ease = 'power2.inOut', stagger = 0) => tl.to(sel, {{ strokeDashoffset: 0, duration: d, ease, stagger }}, t);
      // Frame 0 already has the circle under way, so the thumbnail is never empty.
      tl.fromTo('#open-circle', {{ strokeDashoffset: 0.55 }}, {{ strokeDashoffset: 0, duration: 0.7, ease: 'power2.out' }}, 0);
      draw('.axis', 0.35, 0.45, 'power2.out', 0.09);
      draw('#open-sq1', 0.85, 0.6);
      draw('#open-sq2', 1.1, 0.6);
      draw('#open-star', 1.55, 0.8);
      draw('#open-rosette', 2.0, 0.5, 'power2.out');
      tl.to('#open-build', {{ opacity: 0.25, duration: 0.6, ease: 'power2.inOut' }}, 2.2);
      tess.forEach((p) => draw(p, 1.9 + p.d / 1300, 0.55, 'power2.out'));
      // "...where is it from?": the camera falls through the star's centre.
      tl.to('#open-cam', {{ scale: 9, transformOrigin: '960px 540px', filter: 'blur(6px)', duration: 0.8, ease: 'power3.in' }}, 3.35);
      tl.set('#open-cam', {{ opacity: 0 }}, 4.15);
      // ...and lands on the icon, still moving at the speed of the fall.
      tl.fromTo('#open-icon', {{ opacity: 0, scale: 2.6, filter: 'blur(14px)' }}, {{ opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' }}, 4.1);
      tl.to('#open-icon', {{ x: {ICON_X - 960}, duration: 0.75, ease: 'power3.inOut' }}, 4.65);
      tl.fromTo('#open-word span', {{ opacity: 0.0, filter: 'blur(6px)', x: -20 }}, {{ opacity: 1, filter: 'blur(0px)', x: 0, duration: 0.3, stagger: 0.055, ease: 'power3.out' }}, 4.95);
      blurIn('#open-ar', 5.55, 0.4);
      tess2.forEach((p) => draw(p, 4.6 + p.d / 1600, 0.6, 'power2.out'));
      // "indexed": the whole pattern gathers into the icon.
      tess2.forEach((p) => tl.to(p, {{ x: ({ICON_X} - p.cx) * 0.92, y: ({ICON_Y} - p.cy) * 0.92, scale: 0.1, opacity: 0, transformOrigin: '50% 50%', duration: 0.55, ease: 'power3.in' }}, 7.1 + (1 - p.d / 1500) * 0.35));
      tl.fromTo('#open-iris', {{ clipPath: 'circle(0px at {ICON_X}px {ICON_Y}px)' }}, {{ clipPath: 'circle(2300px at {ICON_X}px {ICON_Y}px)', duration: 0.55, ease: 'power3.in' }}, 7.6);"""
write('open', scene('open', open_body, open_js, open_css, ground=NIGHT))

# ---------------------------------------------------------------- 2. typing: a typo, Arabic, transliteration (8.15–15.75)
pat = [f'type-patiance-{k:02d}' for k in range(1, 9)]
ara = [f'type-arabic-{k:02d}' for k in range(1, 5)]
tf = [('ty-f0', 'start-paper', 0)] + [(f'ty-p{k}', n, 0.5 + 0.2 * k) for k, n in enumerate(pat)]
tf += [(f'ty-a{k}', n, 3.1 + 0.15 * k) for k, n in enumerate(ara)]
R1, R2 = (100, 105), (225, 175)  # first two results of the Arabic search: y and height, CSS px
typing_body = (
    card('ty-card', ''.join(tframe(f, n) for f, n, _ in tf)) + '\n'
    + f'    <div id="ty-l1" class="k" style="top:150px;font-size:150px;font-weight:900;line-height:1">'
    + ''.join(f'<span class="ch">{c}</span>' for c in 'pati') + '<span style="position:relative"><span id="ty-bad" class="ch" style="position:relative">a<i id="ty-strike" style="position:absolute;left:-6px;right:-6px;top:52%;height:12px;background:' + INK + '"></i></span>'
    + f'<span id="ty-good" style="position:absolute;left:0;top:0;color:{GREEN}">e</span></span>' + ''.join(f'<span class="ch ch2">{c}</span>' for c in 'nce') + '</div>\n'
    + f'    <div id="ty-l2" class="k" dir="rtl" style="top:380px;font-family:Amiri;font-size:100px;letter-spacing:0;text-align:left;line-height:1.3">الحمد لله رب العالمين</div>\n'
    + f'    <div id="ty-l3" class="k" style="top:600px;font-size:58px;font-weight:900;line-height:1.1;white-space:nowrap">'
    + ' '.join(f'<span class="w">{w}</span>' for w in ['alhamdu', 'lillahi', 'rabbil', 'ʿalamin']) + '</div>\n'
    + lift('ty-r2', 'type-arabic-04', R2[0], R2[1], 0, CARD_Y + R2[0] * S, CARD_X) + '\n'
    + lift('ty-r1', 'type-arabic-04', R1[0], R1[1], 0, CARD_Y + R1[0] * S, CARD_X)
)
typing_js = f"""
      steps({json.dumps([['#' + f, t] for f, _, t in tf])});
      tl.fromTo('#ty-card', {{ opacity: 0, y: 90, filter: 'blur(10px)' }}, {{ opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out' }}, 0);
      // The big word is typed with the phone, letter for letter.
      const chars = gsap.utils.toArray('#ty-l1 .ch');
      chars.forEach((c, k) => tl.fromTo(c, {{ opacity: 0 }}, {{ opacity: 1, duration: 0.06 }}, 0.5 + 0.2 * k));
      // "misspelled": the stray a is struck and an e drops into its place, as the app reads it.
      tl.fromTo('#ty-strike', {{ scaleX: 0, transformOrigin: '0% 50%' }}, {{ scaleX: 1, duration: 0.22, ease: 'power3.out' }}, 2.05);
      tl.to('#ty-bad', {{ y: 70, opacity: 0, duration: 0.3, ease: 'power3.in' }}, 2.35);
      tl.fromTo('#ty-good', {{ y: -120, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.55, ease: 'expo.out' }}, 2.45);
      // "in Arabic", "in transliteration": each way of asking stacks under the last.
      tl.to('#ty-l1', {{ opacity: 0.22, duration: 0.3, ease: 'power2.inOut' }}, 3.05);
      blurIn('#ty-l2', 3.11, 0.25);
      tl.to('#ty-l2', {{ opacity: 0.22, duration: 0.3, ease: 'power2.inOut' }}, 3.95);
      blurIn('#ty-l3 .w', 3.99, 0.15, 0.08, 6);
      blurOut('#ty-l1, #ty-l2, #ty-l3', 5.05, 0.2, 0.06);
      // "The source appears": the first results lift out of the phone toward the viewer.
      tl.to('#ty-card', {{ opacity: 0.55, duration: 0.5, ease: 'power2.inOut' }}, 5.25);
      tl.fromTo('#ty-r1', {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, 5.25);
      tl.fromTo('#ty-r2', {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, 5.35);
      tl.to('#ty-r1', {{ x: -880, y: 30, scale: 1.04, duration: 0.8, ease: 'power3.inOut' }}, 5.25);
      tl.to('#ty-r2', {{ x: -820, y: 120, scale: 0.92, opacity: 0.75, duration: 0.8, ease: 'power3.inOut' }}, 5.4);
      // A whip up into the next search.
      tl.to('#ty-card, #ty-r1, #ty-r2', {{ y: '-=1250', filter: 'blur(18px)', duration: 0.42, ease: 'power3.in' }}, 7.18);"""
typing_css = '\n    #ty-r1, #ty-r2 { opacity: 0; }\n    #ty-l2, #ty-l3 .w { opacity: 0; }'
write('typing', scene('typing', typing_body, typing_js, typing_css))

# ---------------------------------------------------------------- 3. hadith: a half quote, its source, its gradings (15.75–20.55)
smile = [f'type-smile-{k:02d}' for k in range(1, 10)]
hf = [('hd-f0', 'start-paper', 0)] + [(f'hd-s{k}', n, 0.35 + 0.17 * k) for k, n in enumerate(smile)]
G = BOXES['grades']
SCROLL = 400  # CSS px the hadith page scrolls to bring its gradings up
GROWS = [(G['y'], 34), (G['y'] + 34, 40), (G['y'] + 74, 40), (G['y'] + 114, 40)]
quote = 'smiling in the face of your brother is charity'.split()
hadith_body = (
    card('hd-card', ''.join(tframe(f, n) for f, n, _ in hf)
         + f'<div id="hd-page" class="fr" style="opacity:1">{shot("hadith-tirmidhi-1956", 0, 915, sid="hd-pshot")}</div>') + '\n'
    + f'    <div id="hd-q" class="k" style="top:200px;font-size:84px;font-weight:900;line-height:1.08">'
    + f'<span class="w" style="color:{GREEN}">“</span>' + ' '.join(f'<span class="w qw">{w}</span>' for w in quote) + '</div>\n'
    + '\n'.join(lift(f'hd-g{k}', 'hadith-tirmidhi-1956', y, h, G['x'] - 8, CARD_Y + (y - SCROLL) * S, CARD_X + (G['x'] - 8) * S, w=G['width'] + 16)
                for k, (y, h) in enumerate(GROWS))
    + f'\n    <div id="hd-sweep" style="position:absolute;left:0;top:-200px;width:2700px;height:1480px">'
    + f'<div style="position:absolute;left:0;top:0;width:2400px;height:100%;background:{NIGHT}"></div>'
    + '<svg id="hd-band" style="position:absolute;left:2330px;top:0" width="330" height="1480" viewBox="0 0 330 1480"></svg></div>'
)
hadith_js = f"""
      steps({json.dumps([['#' + f, t] for f, _, t in hf])});
      tl.fromTo('#hd-card', {{ y: 1150, filter: 'blur(16px)' }}, {{ y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power3.out' }}, 0);
      gsap.set('#hd-page', {{ x: {CARD_W} }});
      // The half-remembered words, as they are typed.
      const qw = gsap.utils.toArray('#hd-q .w');
      tl.fromTo(qw[0], {{ opacity: 0 }}, {{ opacity: 1, duration: 0.2 }}, 0.3);
      qw.slice(1).forEach((w, k) => blurIn(w, 0.35 + 0.19 * k, 0.13, 0, 6));
      // "Found": the app opens the hadith, then scrolls to its gradings.
      tl.to('#hd-card-cam', {{ scale: 1.12, transformOrigin: '50% 30%', duration: 0.35, ease: 'power2.in' }}, 2.05);
      tl.to('#hd-q', {{ opacity: 0.18, duration: 0.3, ease: 'power2.inOut' }}, 2.1);
      tl.to('#hd-page', {{ x: 0, duration: 0.45, ease: 'power3.out' }}, 2.3);
      tl.set('#hd-card-cam', {{ scale: 1 }}, 2.75);
      tl.to('#hd-pshot', {{ y: {-SCROLL * S}, duration: 0.6, ease: 'power2.inOut' }}, 2.45);
      blurOut('#hd-q', 2.9, 0.2);
      // "every scholar's grading": the table comes out of the page, row by row, each grade arriving last.
      gsap.utils.toArray('[id^=hd-g]').forEach((g, k) => {{
        const t = 3.0 + k * 0.1;
        tl.fromTo(g, {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, t);
        tl.to(g, {{ x: -{CARD_X - 110}, y: k * 22 - 110, scale: 1.1, transformOrigin: '0% 50%', duration: 0.6, ease: 'power3.inOut' }}, t);
        if (k) tl.fromTo(g, {{ clipPath: 'inset(0 18% 0 0 round 22px)' }}, {{ clipPath: 'inset(0 0% 0 0 round 22px)', duration: 0.3, ease: 'power3.out' }}, t + 0.45);
      }});
      tl.to('#hd-card', {{ opacity: 0.5, duration: 0.4 }}, 3.0);
      // A girih band sweeps across and leaves the night behind it.
      const band = document.getElementById('hd-band');
      for (let j = 0; j < 9; j++) poly(band, khatam(165, 90 + j * 165, 82), {{ fill: 'none', stroke: '{GOLD}', 'stroke-width': 3 }});
      for (let j = 0; j < 9; j++) poly(band, diamond(165, 172 + j * 165, 34), {{ fill: 'none', stroke: '{GOLD}', 'stroke-width': 3 }});
      tl.fromTo('#hd-sweep', {{ x: -2750, skewX: -10 }}, {{ x: -100, skewX: -10, duration: 0.55, ease: 'power2.inOut' }}, 4.25);"""
hadith_css = '\n    [id^=hd-g] { opacity: 0; border-radius: 22px; }'
write('hadith', scene('hadith', hadith_body, hadith_js, hadith_css))

# ---------------------------------------------------------------- 4. meaning: describe it, and the words become the answer (20.55–27.8)
MH = BOXES['meaning-hit']
BAR_HOME = (548, 640)  # where the empty search bar waits, centred, before it docks into the phone
meaning_body = (
    f'    <div id="mn-card" class="card" style="left:{CARD_X}px;top:{CARD_Y}px;height:{TOP * S}px;border-bottom-left-radius:0;border-bottom-right-radius:0;border-bottom:0">'
    f'{shot("type-meaning-03", 0, TOP)}<div id="mn-mark" style="position:absolute;left:{(MH["x"] - 2) * S}px;top:{(MH["y"] - 2) * S}px;'
    f'width:{(MH["width"] + 4) * S}px;height:{(MH["height"] + 4) * S}px;border:5px solid {GOLD};border-radius:22px;opacity:0"></div></div>\n'
    f'    <div id="mn-bar" class="card" style="left:{BAR_HOME[0]}px;top:{BAR_HOME[1]}px;height:{BAR_H * S}px">'
    + ''.join(f'<div id="mn-b{k}" class="fr" style="opacity:{1 if k == 0 else 0}">{shot(src, BAR_Y, BAR_H)}</div>'
              for k, src in enumerate(['start-paper', 'type-meaning-01', 'type-meaning-02', 'type-meaning-03'])) + '</div>\n'
    + f'    <div id="mn-q" style="position:absolute;left:0;width:1920px;top:330px;text-align:center;font-size:130px;font-weight:900;letter-spacing:-0.03em;color:{PAPER};line-height:1">'
    + ' '.join(f'<span class="w">{w}</span>' for w in ['dealing', 'with', 'anxiety']) + '</div>\n'
    + '    <div id="mn-dots" class="ground"></div>\n'
    + f'    <div id="mn-ghost" class="ground" style="color:#4f5764;font-weight:700;font-size:60px">'
    + '<span class="w" style="position:absolute;left:260px;top:250px">patiance</span>'
    + '<span class="w" style="position:absolute;left:1080px;top:170px">the face of your brother</span>'
    + '<span class="w" dir="rtl" style="position:absolute;left:1230px;top:800px;font-family:Amiri;font-weight:400;font-size:76px">الحمد لله</span></div>'
    + f'    <div id="mn-hit" class="lift" style="left:{CARD_X + (MH["x"] - 4) * S}px;top:{CARD_Y + (MH["y"] - 4) * S}px;width:{(MH["width"] + 8) * S}px;height:{(MH["height"] + 8) * S}px;border:5px solid {GOLD}">'
    + f'<div style="position:absolute;left:-5px;top:-5px">{shot("type-meaning-03", MH["y"] - 4, MH["height"] + 8, x=MH["x"] - 4, w=MH["width"] + 8)}</div></div>\n'
    + f'    <div id="mn-tag" style="position:absolute;left:0;width:1920px;text-align:center;top:650px;font-size:44px;font-weight:700;color:{INK_NIGHT}">'
    + ' '.join(f'<span class="w">{w}</span>' for w in ['On', 'your', 'device.', 'Works', 'offline.']) + f' <span class="w" style="color:{GOLD};font-size:30px;letter-spacing:0.1em;vertical-align:6px">BETA</span></div>'
)
meaning_js = f"""
      tl.fromTo('#mn-bar', {{ y: 160, opacity: 0, filter: 'blur(10px)' }}, {{ y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out' }}, 0.05);
      // "Can't recall the words": what was typed before drifts up and fades out of reach.
      blurIn('#mn-ghost .w', 0.2, 0.3, 0.2, 10);
      tl.to('#mn-ghost .w', {{ y: -40, opacity: 0, filter: 'blur(10px)', duration: 0.5, stagger: 0.1, ease: 'power2.in' }}, 1.2);
      // "Describe it": the description is typed, and grows above the bar.
      [['#mn-b1', 1.8], ['#mn-b2', 2.15], ['#mn-b3', 2.5]].forEach(([id, t], k) => {{
        tl.set(id, {{ opacity: 1 }}, t);
        tl.set(`#mn-b${{k}}`, {{ opacity: 0 }}, t);
      }});
      blurIn('#mn-q .w', 1.8, 0.16, 0.35, 8);
      // The bar docks into the phone, and the screen grows up out of it.
      tl.to('#mn-bar', {{ x: {CARD_X - BAR_HOME[0]}, y: {CARD_Y + TOP * S - BAR_HOME[1]}, duration: 0.65, ease: 'power2.inOut' }}, 3.0);
      gsap.set('#mn-bar', {{ borderTopLeftRadius: 44, borderTopRightRadius: 44 }});
      tl.to('#mn-bar', {{ borderTopLeftRadius: 0, borderTopRightRadius: 0, duration: 0.2 }}, 3.5);
      tl.fromTo('#mn-card', {{ clipPath: 'inset(100% 0 0 0)' }}, {{ clipPath: 'inset(0% 0 0 0)', duration: 0.6, ease: 'power3.out' }}, 3.55);
      // "search by meaning": the words come apart into points and gather on the verse they meant.
      const rnd = ((a) => () => {{ a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }})(1994);
      // Points start inside each word's box. The scene is hidden while this runs, so the boxes come from
      // text metrics (centred line, 130 px, -3% tracking) rather than layout.
      const m = document.createElement('canvas').getContext('2d'), dots = [];
      m.font = '900 130px Inter';
      const words = ['dealing', 'with', 'anxiety'], wid = (t) => m.measureText(t).width - 3.9 * t.length;
      const gap = wid('a b') - wid('ab');
      let x = 960 - (words.reduce((a, w) => a + wid(w), 0) + gap * 2) / 2;
      for (const w of words) {{
        for (let k = 0, n = Math.round(wid(w) / 2.4); k < n; k++) dots.push({{ x: x + rnd() * wid(w), y: 352 + rnd() * 92 }});
        x += wid(w) + gap;
      }}
      const T = {{ x: {CARD_X + MH['x'] * S}, y: {CARD_Y + MH['y'] * S}, w: {MH['width'] * S}, h: {MH['height'] * S} }};
      for (const d of dots) {{
        d.tx = T.x + rnd() * T.w; d.ty = T.y + rnd() * T.h;
        d.cy = Math.min(d.y, d.ty) - 90 - rnd() * 220;
        d.delay = (d.x / 1920) * 0.35 + rnd() * 0.15; d.r = 2 + rnd() * 2;
      }}
      // Each point is its own element: x and y travel on different eases, so the path arcs up and over.
      const layer = document.getElementById('mn-dots');
      for (const d of dots) {{
        const el = document.createElement('i');
        el.className = 'dot';
        Object.assign(el.style, {{ width: `${{2 * d.r}}px`, height: `${{2 * d.r}}px` }});
        layer.appendChild(el);
        const t0 = 3.1 + d.delay;
        tl.fromTo(el, {{ x: d.x, y: d.y }}, {{ x: d.tx, duration: 0.95, ease: 'power2.inOut', immediateRender: true }}, t0);
        tl.to(el, {{ opacity: 1, duration: 0.01 }}, 3.1);
        tl.to(el, {{ y: d.cy, duration: 0.45, ease: 'power2.out' }}, t0);
        tl.to(el, {{ y: d.ty, duration: 0.5, ease: 'power2.in' }}, t0 + 0.45);
        tl.to(el, {{ opacity: 0, duration: 0.3, ease: 'power2.in' }}, 4.35 + d.delay * 0.3);
      }}
      tl.set('#mn-q', {{ opacity: 0 }}, 3.12);
      tl.to('#mn-mark', {{ opacity: 1, duration: 0.25, ease: 'power2.out' }}, 4.25);
      // "find what speaks to it": the verse it found comes forward.
      tl.to('#mn-card, #mn-bar', {{ x: 420, opacity: 0, filter: 'blur(8px)', duration: 0.55, ease: 'power3.in' }}, 4.5);
      tl.fromTo('#mn-hit', {{ opacity: 0 }}, {{ opacity: 1, duration: 0.01 }}, 4.5);
      tl.to('#mn-hit', {{ x: {354 - CARD_X - (MH['x'] - 4) * S}, y: {360 - CARD_Y - (MH['y'] - 4) * S}, scale: 1.5, transformOrigin: '0% 0%', duration: 0.8, ease: 'power3.inOut' }}, 4.5);
      blurIn('#mn-tag .w', 5.3, 0.15, 0.07, 6);
      // The verse becomes the next page: it grows past the frame.
      blurOut('#mn-tag', 6.7, 0.2);
      tl.to('#mn-hit', {{ x: {-1868 - CARD_X - (MH['x'] - 4) * S}, y: {-91 - CARD_Y - (MH['y'] - 4) * S}, scale: 7, duration: 0.5, ease: 'power3.in' }}, 6.75);"""
meaning_css = f'\n    #mn-hit, #mn-tag .w, #mn-q .w, #mn-ghost .w {{ opacity: 0; }}\n    .dot {{ position: absolute; left: 0; top: 0; border-radius: 50%; background: {GOLD}; opacity: 0; }}'
write('meaning', scene('meaning', meaning_body, meaning_js, meaning_css, ground=NIGHT, asyncb=True))

# ---------------------------------------------------------------- 5. word: every verse explained, word by word (27.8–30.95)
W3, W2 = BOXES['word-3'], BOXES['word-2']
VY, VH = 40, 380  # verse screen crop
WX = 548
wc = lambda b: ((b['x'] + b['width'] / 2) * S, (b['y'] + b['height'] / 2 - VY) * S)
(w3x, w3y), (w2x, w2y) = wc(W3), wc(W2)
word_body = (
    card('wd-card', cframe('wd-v0', 'verse-94-6', VY, VH, 1) + cframe('wd-v1', 'verse-94-6-word', VY, VH, 1) + cframe('wd-v2', 'verse-94-6-word-2', VY, VH, 1),
         x=WX, y=160, h=VH * S) + '\n'
    + lift('wd-ex', 'verse-94-6-explain', 312, 196, 0, 300, 1040)
)
word_js = f"""
      tl.fromTo('#wd-card', {{ scale: 1.1, filter: 'blur(12px)' }}, {{ scale: 1, filter: 'blur(0px)', duration: 0.55, ease: 'expo.out' }}, 0);
      // Push in on the Arabic line.
      tl.fromTo('#wd-card-cam', {{ scale: 1 }}, {{ scale: 1.15, transformOrigin: '{412 * S / 2}px {w3y:.0f}px', duration: 0.8, ease: 'power2.inOut' }}, 0.3);
      // Each tap opens the word's meaning: the next screen irises out of the tapped word.
      tl.fromTo('#wd-v1', {{ clipPath: 'circle(0px at {w3x:.0f}px {w3y:.0f}px)' }}, {{ clipPath: 'circle(900px at {w3x:.0f}px {w3y:.0f}px)', duration: 0.4, ease: 'power2.out' }}, 1.06);
      tl.fromTo('#wd-v2', {{ clipPath: 'circle(0px at {w2x:.0f}px {w2y:.0f}px)' }}, {{ clipPath: 'circle(900px at {w2x:.0f}px {w2y:.0f}px)', duration: 0.4, ease: 'power2.out' }}, 1.86);
      // Its explanation slides in beside it.
      tl.to('#wd-card', {{ x: -420, duration: 0.55, ease: 'power2.inOut' }}, 2.1);
      tl.fromTo('#wd-ex', {{ opacity: 0, x: 200, filter: 'blur(10px)' }}, {{ opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.55, ease: 'expo.out' }}, 2.25);
      tl.to('#root', {{ filter: 'brightness(0.6)', duration: 0.1 }}, 3.05);"""
write('word', scene('word', word_body, word_js, '\n    #wd-ex { opacity: 0; }'))

# ---------------------------------------------------------------- 6. browse: the library, then the themes (30.95–36.45)
WALL = ['surahs', 'books', 'names-of-allah', 'duas', 'bookmarks', 'card-dark-story', 'verse-94-6', 'graph-whole', 'theme-sepia',
        'bukhari-chapter', 'start-night', 'hadith-tirmidhi-1956', 'theme-dusk', 'menu', 'sakinah-start', 'card', 'theme-night', 'start-paper',
        'type-patiance-08', 'graph-night', 'duas', 'surahs', 'names-of-allah', 'books']
TW, TH, GAP = 360, 800, 44
tiles = ''.join(
    f'<div class="tile" style="left:{(k % 8) * (TW + GAP)}px;top:{(k // 8) * (TH + GAP)}px;background-image:url(assets/screens/{src}.png)"></div>'
    for k, src in enumerate(WALL))
FRONT = [('bw-surahs', 'surahs', 0.55), ('bw-books', 'books', 1.2), ('bw-names', 'names-of-allah', 2.6)]
FY, FH = 36, 418
browse_body = (
    f'    <div id="bw-world" class="ground" style="perspective:1700px"><div id="bw-plane" style="position:absolute;left:0;top:0;width:{8 * (TW + GAP)}px;height:{3 * (TH + GAP)}px">{tiles}</div></div>\n'
    + '\n'.join(card(cid, shot(src, FY, FH), x=548, y=70, h=FH * S) for cid, src, _ in FRONT) + '\n'
    + card('bw-theme', ''.join(cframe(f'bw-t{k}', f'theme-{n}', FY, FH, 1) for k, n in enumerate(['paper', 'sepia', 'dusk', 'night'])), x=548, y=70, h=FH * S)
)
browse_css = f"""
    .tile {{ position: absolute; width: {TW}px; height: {TH}px; border-radius: 26px; background-size: cover; }}
    #bw-world {{ opacity: 0.38; }}
    [id^=bw-] .cam {{ position: absolute; }}
    #bw-surahs, #bw-books, #bw-names, #bw-theme {{ opacity: 0; }}"""
names = [f[0] for f in FRONT] + ['bw-theme']
browse_js = f"""
      // The whole library as a wall of real screens; the camera glides across it.
      tl.fromTo('#bw-plane', {{ x: -300, y: -500, rotationX: 50, rotationZ: -22, z: -300 }},
        {{ x: -1500, y: -560, rotationX: 50, rotationZ: -16, z: -300, duration: 5.5, ease: 'power1.inOut' }}, 0);
      tl.fromTo('#bw-world', {{ opacity: 0 }}, {{ opacity: 0.38, duration: 0.4, ease: 'power2.out' }}, 0);
      // As each is named, its screen rises out of the wall and lands flat to be read.
      const front = {json.dumps(names)}, times = {json.dumps([f[2] for f in FRONT] + [4.0])};
      front.forEach((id, k) => {{
        tl.fromTo('#' + id, {{ opacity: 0, y: 260, rotationX: 48, scale: 0.7, filter: 'blur(10px)', transformPerspective: 1700 }},
          {{ opacity: 1, y: 0, rotationX: 0, scale: 1, filter: 'blur(0px)', duration: 0.6, ease: 'expo.out' }}, times[k]);
        if (k < front.length - 1) tl.to('#' + id, {{ x: -760, opacity: 0, filter: 'blur(8px)', duration: 0.32, ease: 'power3.in' }}, times[k + 1] - 0.05);
      }});
      // "in the theme you like": Paper, Sepia, Dusk, Night, each opening from the corner.
      [1, 2, 3].forEach((k) => tl.fromTo(`#bw-t${{k}}`, {{ clipPath: 'circle(0px at 92% 4%)' }}, {{ clipPath: 'circle(1300px at 92% 4%)', duration: 0.38, ease: 'power2.inOut' }}, 4.2 + 0.38 * (k - 1)));
      blurOut('#bw-theme, #bw-world', 5.28, 0.2);"""
write('browse', scene('browse', browse_body, browse_js, browse_css, ground=NIGHT))

# ---------------------------------------------------------------- 7. free: free, no ads, no accounts, offline (36.45–40.3)
of = [('fr-f0', 'start-paper', 0), ('fr-o0', 'type-offline-01', 1.6), ('fr-o1', 'type-offline-02', 2.1)]
WIFI = ('<svg id="fr-wifi" viewBox="0 0 24 24" width="84" height="84" fill="none" stroke="' + GOLD + '" stroke-width="2.4" stroke-linecap="round" '
        'style="position:absolute;left:0;top:4px"><path class="arc" d="M2 8.82a15 15 0 0 1 20 0"/><path class="arc" d="M5 12.86a10 10 0 0 1 14 0"/>'
        '<path class="arc" d="M8.5 16.43a5 5 0 0 1 7 0"/><path d="M12 20h.01"/><path id="fr-slash" pathLength="1" d="m2 2 20 20"/></svg>')
free_body = (
    card('fr-card', ''.join(tframe(f, n) for f, n, _ in of)) + '\n'
    + f'    <div id="fr-1" class="k" style="top:110px;font-size:230px;font-weight:900;line-height:1;color:{PAPER}">Free.</div>\n'
    + f'    <div id="fr-2" class="k" style="top:410px;font-size:84px;font-weight:900;color:{INK_NIGHT}">No ads.</div>\n'
    + f'    <div id="fr-3" class="k" style="top:520px;font-size:84px;font-weight:900;color:{INK_NIGHT}">No accounts.</div>\n'
    + f'    <div id="fr-4" class="k" style="top:660px;font-size:84px;font-weight:900;color:{GOLD};padding-left:116px">{WIFI}Works offline.</div>'
)
free_js = f"""
      steps({json.dumps([['#' + f, t] for f, _, t in of])});
      tl.fromTo('#fr-card', {{ opacity: 0, x: 160, filter: 'blur(10px)' }}, {{ opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.7, ease: 'expo.out' }}, 0.1);
      blurIn('#fr-1', 0.0, 0.18);
      blurIn('#fr-2', 0.73, 0.16);
      blurIn('#fr-3', 1.53, 0.16);
      blurIn('#fr-4', 2.4, 0.18);
      // The signal drains, the line crosses it out, and the search above still answers.
      gsap.set('#fr-slash', {{ strokeDasharray: 1, strokeDashoffset: 1 }});
      tl.to('#fr-wifi .arc', {{ opacity: 0.35, duration: 0.15, stagger: 0.1, ease: 'power2.in' }}, 2.6);
      tl.to('#fr-slash', {{ strokeDashoffset: 0, duration: 0.25, ease: 'power3.out' }}, 2.95);
      blurOut('#fr-1, #fr-2, #fr-3, #fr-4, #fr-card', 3.55, 0.2, 0.03);"""
write('free', scene('free', free_body, free_js, '\n    #fr-1, #fr-2, #fr-3, #fr-4 { opacity: 0; }', ground=NIGHT))

# ---------------------------------------------------------------- 8. end: the pattern returns around the name (40.3–46.5)
end_body = f"""
    <svg id="en-tess" class="ground" viewBox="0 0 1920 1080" width="1920" height="1080"></svg>
    <img id="en-icon" src="assets/icon-512.png" alt="Mufahras icon" style="position:absolute;left:{960 - 105}px;top:120px;width:210px;height:210px;border-radius:46px">
    <div id="en-word" style="position:absolute;left:0;width:1920px;top:360px;text-align:center;font-weight:900;font-size:150px;letter-spacing:-0.035em;color:{PAPER};line-height:1">{''.join(f'<span>{c}</span>' for c in 'Mufahras')}</div>
    <div id="en-ar" dir="rtl" style="position:absolute;left:0;width:1920px;top:520px;text-align:center;font-family:Amiri;font-size:76px;color:{GOLD};line-height:1.2">مُفَهْرَس</div>
    <div id="en-tag" style="position:absolute;left:0;width:1920px;top:680px;text-align:center;font-weight:700;font-size:56px;color:{INK_NIGHT}">{' '.join(f'<span class="w">{w}</span>' for w in 'Find any verse or hadith.'.split())}</div>
    <div id="en-url" style="position:absolute;left:0;width:1920px;top:790px;text-align:center;font-weight:700;font-size:44px;color:{GOLD}">omeiirr.github.io/mufahras</div>
    <div id="en-oss" style="position:absolute;left:0;width:1920px;top:856px;text-align:center;font-weight:400;font-size:32px;color:#9aa3ae">Free and open source</div>"""
end_css = f"""
    #en-tess polygon {{ fill: none; stroke: {GOLD}; stroke-width: 2; stroke-opacity: 0.45; }}
    #en-tag .w, #en-url, #en-oss {{ opacity: 0; }}"""
end_js = """
      // The pattern closes in from the edges and stops short of the name.
      const tess = tessellate(document.getElementById('en-tess'), 170, (x, y) => ((x - 960) / 820) ** 2 + ((y - 520) / 520) ** 2 > 1, 960, 520);
      gsap.set('#en-tess polygon', { strokeDasharray: 1, strokeDashoffset: 1 });
      const far = tess[tess.length - 1].d;
      tess.forEach((p) => tl.to(p, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' }, 0.05 + (1 - p.d / far) * 1.0));
      tl.fromTo('#en-icon', { opacity: 0, scale: 0.55, filter: 'blur(8px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out' }, 0);
      tl.fromTo('#en-word span', { opacity: 0.0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.25, stagger: 0.05, ease: 'power2.out' }, 0.2);
      blurIn('#en-ar', 0.7, 0.35);
      blurIn('#en-tag .w', 1.28, 0.14, 0.08, 6);
      blurIn('#en-url', 2.1, 0.25);
      blurIn('#en-oss', 2.4, 0.25);"""
write('end', scene('end', end_body, end_js, end_css, ground=NIGHT))

# ---------------------------------------------------------------- captions: what is said, through the browse scene
# Word ranges (indices into the transcript) and the text shown; the transcript misspells the names.
GROUPS = [
    (0, 7, 'You remember a few words of a verse,'),
    (8, 12, 'but where is it from?'),
    (14, 18, 'the Quran and hadith, indexed.'),
    (19, 25, 'Type it the way you remember it.'),
    (26, 30, 'Misspelled, in Arabic, in transliteration.'),
    (31, 36, 'The source appears as you type.'),
    (37, 41, 'Half a hadith someone quoted?'),
    (42, 46, "Found, with every scholar's grading."),
    (47, 52, "Can't recall the words at all?"),
    (53, 54, 'Describe it.'),
    (55, 59, 'It can search by meaning'),
    (60, 65, 'and find what speaks to it,'),
    (66, 69, 'right on your device.'),
    (70, 75, 'Every verse explained, word by word.'),
    (76, 80, 'Browse the surahs, hadith collections,'),
    (81, 84, 'the Names of Allah'),
    (85, 89, 'in the theme you like.'),
]
assert WORDS[89]['text'].startswith('like') and WORDS[70]['text'] == 'Every', 'transcript changed: re-check GROUPS'
# Caption ink follows the ground: light on Night, dark on Paper.
GROUND = [(0, PAPER), (7.6, INK), (20.0, PAPER), (27.3, INK), (30.95, PAPER)]  # when each ground starts to arrive
els, tw = [], []
for k, (a, b, text) in enumerate(GROUPS):
    t0 = word_at(a) - 0.05
    t1 = word_at(b + 1) - 0.08 if b + 1 < len(WORDS) else word_at(b) + 0.6
    ink = [c for t, c in GROUND if t <= t0 + 0.2][-1]
    t1 = min([t1] + [t for t, _ in GROUND if t > t0 + 0.2])  # gone before the ground changes under it
    els.append(f'    <p id="cap{k}" class="cap clip" data-start="{t0:.2f}" data-duration="{t1 - t0:.2f}" style="color:{ink}">{text}</p>')
    tw.append(f"      tl.fromTo('#cap{k}', {{ opacity: 0, filter: 'blur(6px)' }}, {{ opacity: 1, filter: 'blur(0px)', duration: 0.16, ease: 'power2.out' }}, {t0:.2f});")
    tw.append(f"      tl.to('#cap{k}', {{ opacity: 0, duration: 0.1, ease: 'power2.in' }}, {t1 - 0.1:.2f});")
CAP_END = SCENES[6][1]
caps = f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; }}
    .cap {{ position: absolute; left: 0; width: 1920px; top: 962px; text-align: center; font-family: 'Inter', sans-serif;
      font-weight: 700; font-size: 44px; line-height: 1.2; opacity: 0; margin: 0; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1920" data-height="1080">
{chr(10).join(els)}
  </div>
  <script>
    (() => {{
      const tl = gsap.timeline({{ paused: true }});
{chr(10).join(tw)}
      window.__timelines['captions'] = tl;
    }})();
  </script>
</template>
"""
write('captions', caps)

# ---------------------------------------------------------------- the root: scenes, captions, voice and sound
hosts = '\n'.join(
    f'      <div id="{sid}" data-composition-id="{sid}" data-composition-src="compositions/{sid}.html" data-start="{st}" data-duration="{d}" '
    f'data-track-index="1" data-track-kind="graphics" data-width="1920" data-height="1080"></div>'
    for sid, st, d in SCENES)
# Sounds on visible actions only (no music): placed in film seconds.
sc = {sid: st for sid, st, _ in SCENES}
SFX = [('sketch', 'sketch', 0.1, 3.2, 0.26), ('whoosh', 'whoosh-soft', sc['open'] + 3.6, 0.4, 0.4),
       ('turn', 'page-turn', sc['open'] + 7.1, 1.1, 0.32), ('slide', 'paper-slide', sc['open'] + 7.7, 1.2, 0.3)]
SFX += [(f'key{k}', 'key-soft', sc['typing'] + 0.5 + 0.2 * k, 0.6, 0.2 if k % 2 else 0.15) for k in range(8)]
SFX += [('drop', 'tap', sc['typing'] + 2.5, 0.4, 0.45)]
SFX += [(f'akey{k}', 'key-soft', sc['typing'] + 3.1 + 0.15 * k, 0.6, 0.15) for k in range(4)]
SFX += [('lift1', 'paper-slide', sc['typing'] + 5.25, 1.2, 0.3), ('whip1', 'whoosh-soft', sc['typing'] + 7.2, 0.4, 0.45)]
SFX += [(f'skey{k}', 'key-soft', sc['hadith'] + 0.35 + 0.19 * k, 0.6, 0.2 if k % 2 else 0.14) for k in range(8)]
SFX += [('open1', 'tap', sc['hadith'] + 2.05, 0.4, 0.45), ('sweep', 'whoosh-soft', sc['hadith'] + 4.25, 0.4, 0.35)]
SFX += [(f'mkey{k}', 'key-soft', sc['meaning'] + 1.8 + 0.35 * k, 0.6, 0.18) for k in range(3)]
SFX += [('dock', 'paper-slide', sc['meaning'] + 3.0, 1.2, 0.25), ('gather', 'sketch', sc['meaning'] + 3.15, 1.3, 0.2),
        ('zoom2', 'whoosh-soft', sc['meaning'] + 6.8, 0.4, 0.4)]
SFX += [('tapw1', 'tap', sc['word'] + 1.06, 0.4, 0.45), ('tapw2', 'tap', sc['word'] + 1.86, 0.4, 0.4)]
SFX += [(f'rise{k}', 'paper-slide', sc['browse'] + t, 1.0, 0.22) for k, t in enumerate([0.55, 1.2, 2.6, 4.0])]
SFX += [(f'theme{k}', 'tap', sc['browse'] + 4.2 + 0.38 * k, 0.4, 0.3) for k in range(3)]
SFX += [('chime0', 'tap', sc['free'] + 2.95, 0.4, 0.35), ('endturn', 'page-turn', sc['end'] + 0.05, 1.1, 0.25)]
audio = '\n'.join(
    f'      <audio id="a-{n}" class="clip" src="assets/sfx/{f}.mp3" data-start="{t:.2f}" data-duration="{d}" data-track-index="{11 + k}" data-volume="{v}"></audio>'
    for k, (n, f, t, d, v) in enumerate(SFX))
index = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: {NIGHT}; }}
    </style>
  </head>
  <body>
    <!-- Mufahras showcase, 16:9. Generated by tools/build.py: edit that, then re-run it. -->
    <div id="root" data-composition-id="main" data-start="0" data-duration="{FILM}" data-width="1920" data-height="1080">
{hosts}
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{CAP_END}" data-track-index="2" data-track-kind="captions" data-width="1920" data-height="1080"></div>

      <audio id="a-vo" class="clip" src="assets/vo/voiceover.mp3" data-start="{VO}" data-duration="43.36" data-track-index="9" data-volume="1"></audio>
      <audio id="a-wind" class="clip" src="assets/sfx/wind-bed.mp3" data-start="0" data-duration="{FILM}" data-track-index="10" data-volume="0.9" data-fade-out="2.5"></audio>
{audio}
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""
(ROOT / 'index.html').write_text(index)
print('wrote index.html,', len(SCENES), 'scenes, captions;', len(SFX), 'sounds')
