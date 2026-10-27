// The landing page: the hero's search that types itself, and the demo video.
import '@fontsource/scheherazade-new/arabic-400.css';
import '../src/styles/tokens.css';
import './welcome.css';

interface Hit {
  ref: string;
  name: string;
  ar?: string;
  /** HTML: <mark> around the matched words. */
  text: string;
}

// What the app returns for each query (top results, texts shortened).
const EXAMPLES: { q: string; note: string; hits: Hit[] }[] = [
  {
    q: 'patiance prayer',
    note: 'Misspelled',
    hits: [
      { ref: '2:153', name: 'Al-Baqarah', text: 'O you who have believed, seek help through <mark>patience</mark> and <mark>prayer</mark>. Indeed, Allāh is with the patient.' },
      { ref: '2:45', name: 'Al-Baqarah', text: 'And seek help through <mark>patience</mark> and <mark>prayer</mark>; and indeed, it is difficult except for the humbly submissive [to Allāh]' },
    ],
  },
  {
    q: 'ayatul kursi',
    note: 'By a well-known name',
    hits: [{ ref: '2:255', name: 'Ayat al-Kursi', text: 'Allāh - there is no deity except Him, the Ever-Living, the Self-Sustaining. Neither drowsiness overtakes Him nor sleep…' }],
  },
  {
    q: 'الحمد لله رب العالمين',
    note: 'In Arabic, no diacritics needed',
    hits: [
      { ref: '1:2', name: 'Al-Fatihah', ar: '<mark>ٱلْحَمْدُ</mark> <mark>لِلَّهِ</mark> <mark>رَبِّ</mark> <mark>ٱلْعَـٰلَمِينَ</mark>', text: '[All] praise is [due] to Allāh, Lord of the worlds -' },
      { ref: '40:65', name: 'Ghafir', ar: '…ٱلدِّينَ ۗ <mark>ٱلْحَمْدُ</mark> <mark>لِلَّهِ</mark> <mark>رَبِّ</mark> <mark>ٱلْعَـٰلَمِينَ</mark>', text: 'He is the Ever-Living; there is no deity except Him, so call upon Him…' },
    ],
  },
  {
    q: 'qul huwa allahu ahad',
    note: 'In transliteration',
    hits: [
      { ref: '112:1', name: 'Al-Ikhlas', text: '<mark>Qul huwa Allahu ahad</mark>: Say, “He is Allāh, [who is] One,”' },
      { ref: 'Tirmidhi 2899', name: "Virtues of the Qur'an", text: '…the Messenger of Allah (ﷺ) said: “<mark>Qul Huwa Allahu Ahad</mark> is equal to a third of the Qur’an.”' },
    ],
  },
  {
    q: 'bukhari 1',
    note: 'By its number',
    hits: [{ ref: 'Bukhari 1', name: 'Revelation', text: 'I heard Allah’s Messenger (ﷺ) saying, “The reward of deeds depends upon the intentions and every person will get the reward according to what he has intended…”' }],
  },
];

const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function showHits(list: HTMLElement, hits: Hit[]): void {
  list.innerHTML = hits
    .map((h) => `<li><p class="ref"><b>${h.ref}</b> ${h.name}</p>${h.ar ? `<p class="ar" lang="ar" dir="rtl">${h.ar}</p>` : ''}<p>${h.text}</p></li>`)
    .join('');
}

async function typeExamples(mock: HTMLElement): Promise<void> {
  const q = mock.querySelector<HTMLElement>('.mock-q')!;
  const note = mock.querySelector<HTMLElement>('.mock-note')!;
  const list = mock.querySelector<HTMLElement>('.mock-hits')!;
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e!.isIntersecting)).observe(mock);
  for (let k = 1; ; k = (k + 1) % EXAMPLES.length) {
    await wait(still ? 5000 : 3200);
    while (!visible || document.hidden) await wait(500);
    const ex = EXAMPLES[k]!;
    list.classList.add('fading');
    if (still) q.textContent = ex.q;
    else {
      for (let n = q.textContent!.length; n > 0; n--) {
        q.textContent = q.textContent!.slice(0, n - 1);
        await wait(25);
      }
      // Arabic types word by word (letters join as they come, so one at a time looks broken).
      const parts = /[؀-ۿ]/.test(ex.q) ? ex.q.split(/(?<= )/) : [...ex.q];
      for (const p of parts) {
        q.textContent += p;
        await wait(/[؀-ۿ]/.test(p) ? 180 : 70);
      }
    }
    await wait(150);
    note.textContent = ex.note;
    showHits(list, ex.hits);
    list.classList.remove('fading');
  }
}

const mock = document.querySelector<HTMLElement>('.hero .mock');
if (mock) void typeExamples(mock);

// "See demo": the video loads only when asked for.
const dialog = document.querySelector<HTMLDialogElement>('dialog.demo')!;
const video = dialog.querySelector('video')!;
for (const b of document.querySelectorAll('[data-demo]'))
  b.addEventListener('click', () => {
    if (!video.src) video.src = new URL('demo.mp4', location.href).href;
    dialog.showModal();
    void video.play().catch(() => {});
  });
dialog.querySelector('.demo-close')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => e.target === dialog && dialog.close()); // the backdrop
dialog.addEventListener('close', () => video.pause());
