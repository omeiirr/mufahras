# Mufahras showcase, 16:9: spec

GOAL:    a viewer who half-remembers a verse knows there is a free app that finds it from anything they recall,
         and remembers the gold star.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps.
TIME:    ~46.5 s = ~1395 frames. The voice (assets/vo/voiceover.mp3, 43.4 s) is the clock; no music.
LOOK:    two grounds from the app's own themes, never a void: Night #1f242c and Paper #faf8f3.
         Gold #e6c77e is the geometry's only colour and the one highlighted word per shot; green #1f6b57
         is the app's accent and appears only inside the product UI and the icon tile.
         Latin type: Inter 900 for kinetic words (120-200 px, -3% tracking), Inter 600 for subtitles (44 px).
         Arabic: Amiri (UI) and the app's screenshots; Quranic text only as captured, whole, never per letter.
         Medium: line geometry drawn with compass and ruler (stroke 2-6 px, gold on Night, 6% green on Paper)
         and the real app's screens at 2x their CSS size (text >= 26 px) on a card with 44 px radius,
         shadow 0 40px 90px rgba(31,29,26,0.18). No grain, no vignette, no glow.
OBJECTS: the khatam (8-pointed star of two squares, the icon's), its 8-fold tessellation, the app icon
         (assets/icon-512.png, never redrawn), the app's screens (assets/screens, real captures).
MOTION:  arrive expo.out / power4.out 0.5-0.9 s; camera power2.inOut 0.8-1.4 s; exits power3.in, 40% shorter;
         stagger words 0.08 s, cards 0.06 s; strokes draw power2.inOut 0.5-1 s. Landed type holds dead still.
         Transitions (each caused by something on screen): zoom through the star; tessellation collapses
         into the icon; the search card grows into the world; girih line sweep; iris from a tapped word;
         circular theme wipes; star tiles closing in for the end card.
SHOTS:   see the timing table in index.html comments; one hero move per shot, something new every 2-4 s.
BANNED:  dark void with small floating things; glow/bloom/lens flare; particles as decoration (the meaning
         points carry the query's words); purple/blue gradients; glass cards; product UI tilted in 3D while
         it is read; text moving while read; pill chips as decoration; logo docked in a corner;
         Quranic or Arabic text animated per letter, distorted or used as a texture; music of any kind.
QA:      first frame not empty; every subtitle readable at 360 px; Arabic shaped; the end card holds 2 s;
         loudness about -14 LUFS, peak <= -1 dBTP.
