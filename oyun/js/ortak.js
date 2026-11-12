// Ortak yardımcılar
import * as THREE from 'three';

export const SAHA = { W: 44, L: 64, HW: 22, HL: 32, KALE_G: 10, KALE_Y: 3.6, PENALTI: 8 };

export const rnd = (a, b) => a + Math.random() * (b - a);
export const sec = dizi => dizi[(Math.random() * dizi.length) | 0];
export const sinirla = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

// Türkçe karakterleri sadeleştirir, tekrar eden harfleri teke indirir ("goooool" -> "gol")
export function normal(t) {
  return String(t).toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/(.)\1+/g, '$1');
}

const YASAKLI = ['amk', 'aq', 'oc', 'pic', 'sik', 'yarak', 'orospu', 'got', 'pezevenk', 'ibne', 'kahpe', 'anan', 'amina', 'gavat', 'serefsiz', 'pust'];
export function kufurVar(t) {
  const n = ' ' + normal(t).replace(/[^a-z0-9]+/g, ' ');
  return YASAKLI.some(w => n.includes(' ' + w));
}
// Ekranda gösterilecek ad: kontrol karakterleri atılır, kısaltılır, küfürlüyse genel ad kullanılır
export function temizAd(ad, uzunluk = 14) {
  let s = String(ad || '').normalize('NFKC').replace(/[\u0000-\u001f\u007f​-‏‪-‮]/g, '').replace(/\s+/g, ' ').trim();
  if (!s || kufurVar(s)) return 'Taraftar';
  const h = [...s];
  return h.length > uzunluk ? h.slice(0, uzunluk - 1).join('') + '…' : s;
}

export function parlaklik(hex) {
  const c = new THREE.Color(hex);
  return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
}
export const zitRenk = hex => (parlaklik(hex) > 0.55 ? '#111111' : '#ffffff');

// Takım desenini bir tuvale boyar (forma ve bayrak için)
export function desenBoya(g, w, h, takim, kaleci = false) {
  if (kaleci) { g.fillStyle = takim.kaleci || '#22aa77'; g.fillRect(0, 0, w, h); return; }
  g.fillStyle = takim.renk1; g.fillRect(0, 0, w, h);
  g.fillStyle = takim.renk2;
  if (takim.desen === 'cizgili') { const n = 6, s = w / n; for (let i = 1; i < n; i += 2) g.fillRect(i * s, 0, s, h); }
  else if (takim.desen === 'parcali') g.fillRect(w / 2, 0, w / 2, h);
}

// Yazı etiketi için tuval + doku. guncelle(metin, renkler) ile yeniden çizilir.
export function etiketOlustur(gen = 384, yuk = 96) {
  const tuval = document.createElement('canvas'); tuval.width = gen; tuval.height = yuk;
  const g = tuval.getContext('2d');
  const doku = new THREE.CanvasTexture(tuval);
  doku.colorSpace = THREE.SRGBColorSpace; doku.anisotropy = 4;
  function ciz(metin, { renk = '#ffffff', zemin = 'rgba(8,12,24,.78)', kenar = null, punto = 54 } = {}) {
    g.clearRect(0, 0, gen, yuk);
    g.font = `800 ${punto}px system-ui, "Segoe UI", Roboto, Arial, sans-serif`;
    let p = punto;
    while (g.measureText(metin).width > gen - 44 && p > 22) { p -= 3; g.font = `800 ${p}px system-ui, "Segoe UI", Roboto, Arial, sans-serif`; }
    const w = Math.min(gen - 4, g.measureText(metin).width + 44), x = (gen - w) / 2;
    g.fillStyle = zemin; g.beginPath(); g.roundRect(x, 6, w, yuk - 12, 26); g.fill();
    if (kenar) { g.strokeStyle = kenar; g.lineWidth = 5; g.stroke(); }
    g.fillStyle = renk; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(metin, gen / 2, yuk / 2 + 3);
    doku.needsUpdate = true;
  }
  return { doku, ciz, oran: gen / yuk };
}
