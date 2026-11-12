// Tribün — ana dosya: sahneyi kurar, köprüden gelen olayları oyuna bağlar
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { normal, temizAd, kufurVar, rnd } from './ortak.js';
import { Parcaciklar } from './parcacik.js';
import { stadyumKur } from './stadyum.js';
import { Tribun } from './tribun.js';
import { Mac } from './mac.js';
import { insanYukle } from './insan.js';
import { Kamera } from './kamera.js';
import { Ses } from './ses.js';
import { Hud } from './hud.js';

const GEN = 1080, YUK = 1920;
const YAYIN = location.pathname.startsWith('/yayin');

// ---------- çerçeve: sahne hep 1080x1920, pencereye ölçeklenir ----------
const cerceve = document.getElementById('cerceve');
function sigdir() { const o = Math.min(innerWidth / GEN, innerHeight / YUK); cerceve.style.transform = `translate(-50%,-50%) scale(${o})`; }
addEventListener('resize', sigdir); sigdir();

// ---------- sahne ----------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(GEN, YUK, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
const sahne = new THREE.Scene();
const kam = new THREE.PerspectiveCamera(46, GEN / YUK, 1, 600);
const hedef = new THREE.WebGLRenderTarget(GEN, YUK, { type: THREE.HalfFloatType, samples: 4 });
const besteci = new EffectComposer(renderer, hedef);
besteci.addPass(new RenderPass(sahne, kam));
const parlama = new UnrealBloomPass(new THREE.Vector2(GEN, YUK), .5, .55, .92);
besteci.addPass(parlama);
// yayın görünümü: kenar karartma, hafif renk canlılığı ve kontrast, ince kumlanma
const yayinGecis = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uT: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uT; varying vec2 vUv;
    float kum(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + uT) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      float g = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(vec3(g), c.rgb, 1.16);                       // canlılık
      c.rgb = (c.rgb - 0.18) * 1.07 + 0.18;                    // kontrast
      vec2 d = (vUv - 0.5) * vec2(0.82, 1.0); float v = smoothstep(0.78, 0.28, length(d));
      c.rgb *= mix(0.62, 1.0, v);                              // kenar karartma
      c.rgb += (kum(vUv * vec2(1080.0, 1920.0)) - 0.5) * 0.018;
      gl_FragColor = vec4(max(c.rgb, 0.0), c.a); }`,
});
besteci.addPass(yayinGecis);
besteci.addPass(new OutputPass());

const stadyum = stadyumKur(sahne);
// Görüntü kalitesi: zayıf bilgisayarda akıcılık için düşürülebilir (panelden)
let kalite = '';
function kaliteUygula(k) {
  if (k === kalite) return; kalite = k;
  const ornek = k === 'yuksek' ? 4 : k === 'orta' ? 2 : 0;
  for (const h of [besteci.renderTarget1, besteci.renderTarget2]) if (h.samples !== ornek) { h.samples = ornek; h.dispose(); }
  renderer.shadowMap.enabled = k !== 'dusuk';
  stadyum.ana.castShadow = k !== 'dusuk'; stadyum.karsi.castShadow = k === 'yuksek';
  stadyum.ana.shadow.mapSize.setScalar(k === 'yuksek' ? 2048 : 1024); stadyum.ana.shadow.map?.dispose(); stadyum.ana.shadow.map = null;
  parlama.enabled = k !== 'dusuk';
  sahne.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
}
const duman = new Parcaciklar(sahne, 1400, false), isilti = new Parcaciklar(sahne, 2600, true);
const tribun = new Tribun(sahne, duman, isilti);
const mac = new Mac(sahne, isilti);
const kamera = new Kamera(kam);
const ses = new Ses();
const hud = new Hud();

// ---------- durum ----------
let ayar = null, takimListe = [], takimlar = [null, null], hazir = false;
const gurultu = [0, 0];
const yildiz = new Map();               // k -> { ad, jeton }
const sonGoster = new Map(); let sonGosterGenel = 0, sonDalga = 0, islikT = 0;

function takimBul(id, haric) { return takimListe.find(t => t.id === id && t !== haric) || takimListe.find(t => t !== haric); }
function kur() {
  const a = takimBul(ayar.takimA), b = takimBul(ayar.takimB, a);
  if (!a || !b) { hud.afis('takimlar.json', 'En az iki takım gerekli', '#ff6b6b', 60); return; }
  const degisti = !hazir || takimlar[0]?.id !== a.id || takimlar[1]?.id !== b.id;
  takimlar = [a, b];
  mac.macSuresi = ayar.macSuresi;
  kaliteUygula(ayar.kalite || 'yuksek');
  ses.ayarla({ efektSes: ayar.efektSes, muzikSes: ayar.muzikSes, spiker: ayar.spiker }); ses.karisik = ayar.muzikSira === 'karisik';
  ses.kaynakAyarla(ayar.muzikKaynak, ayar.youtube);
  hud.takimlar(a, b, ayar.esik);
  if (degisti) { tribun.takimlariAyarla(a, b); mac.takimlariKur(a, b); }
  tribun.dolguAyarla(ayar.dolgu);
  if (ayar.muzikAcik && !ses.istenen) ses.cal(); else if (!ayar.muzikAcik && ses.istenen) ses.dur();
  hazir = true;
}

// ---------- yorum çözümleme ----------
function takimSec(kelimeler) {
  let son = null;
  for (const w of kelimeler) for (const ti of [0, 1]) if ((takimlar[ti].anahtar || []).includes(w)) son = ti;
  return son;
}
function gosterIste(k) {
  const p = mac.misafirBul(k), t = performance.now();
  if (!p || t - sonGosterGenel < 8000 || t - (sonGoster.get(k) || 0) < 45000) return;
  sonGoster.set(k, t); sonGosterGenel = t; kamera.goster('oyuncu', p, 5);
}

function olayIsle(o) {
  if (!hazir || !o.k) return;
  const k = o.k, ad = temizAd(o.ad);
  if (o.test && (o.ti === 0 || o.ti === 1)) tribun.otur(k, ad, o.ti); // test panelinden takım seçimi
  let f = tribun.gercek.get(k);
  if (o.tur === 'yorum') {
    const n = normal(o.metin || '').replace(/[^a-z0-9 ]+/g, ' '), kelimeler = n.split(' ').filter(Boolean);
    const secim = takimSec(kelimeler), simdi = performance.now();
    if (f && secim != null && secim !== f.takim && simdi - (f.degisim || 0) < 30000) f = tribun.otur(k, ad);
    else { const once = f?.takim; f = tribun.otur(k, ad, secim ?? undefined); if (once !== undefined && once !== f.takim) { f.degisim = simdi; hud.akis(`${ad} → ${takimlar[f.takim].ad}`); } }
    if (kelimeler.includes('dalga') && simdi - sonDalga > 6000) { sonDalga = simdi; tribun.dalga(); }
    if (kelimeler.includes('zipla')) { tribun.ziplat(f.takim); if (tribun.zipla[f.takim] > 6.5) ses.davul(6); }
    if (kelimeler.some(w => w === 'isik' || w === 'isiklar' || w === 'fener')) tribun.isikAc(f.takim);
    if (n.includes('beni goster')) gosterIste(k);
    gurultu[f.takim] += 3; mac.penaltiTepki(f.takim, 1.5);
    const yazi = String(o.metin || '').replace(/[\u0000-\u001f\u200b-\u200f\u202a-\u202e]/g, '').replace(/\s+/g, ' ').trim();
    tribun.etiketGoster(k, { metin: kufurVar(yazi) ? '' : [...yazi].slice(0, 40).join(''), sure: 9 });
  } else if (o.tur === 'begeni') {
    f = tribun.otur(k, ad);
    const adet = Math.max(1, o.adet | 0);
    gurultu[f.takim] += Math.min(adet, 60) * .22; mac.penaltiTepki(f.takim, Math.min(adet, 30) * .12);
    if (adet >= 10 || Math.random() < .25) tribun.etiketGoster(k, { sure: 5 });
  } else if (o.tur === 'giris') {
    f = tribun.otur(k, ad); tribun.etiketGoster(k, { sure: 5 });
  } else if (o.tur === 'takip' || o.tur === 'paylasim') {
    f = tribun.otur(k, ad); tribun.mesale(k, f.takim, 12); tribun.etiketGoster(k, { sure: 10 });
    hud.akis(`${ad} ${o.tur === 'takip' ? 'takip etti' : 'yayını paylaştı'}`); gurultu[f.takim] += 6;
  } else if (o.tur === 'hediye') {
    f = tribun.otur(k, ad);
    const toplam = Math.max(1, (o.jeton | 0) * (o.adet | 0)), ti = f.takim, e = ayar.esik;
    f.jeton += toplam;
    const y = yildiz.get(k) || { ad, jeton: 0 }; y.ad = ad; y.jeton += toplam; yildiz.set(k, y);
    hud.yildizlar([...yildiz.values()].sort((a, b) => b.jeton - a.jeton).slice(0, 5));
    gurultu[ti] += Math.min(70, 6 + toplam * .5); mac.penaltiTepki(ti, Math.min(12, 2 + toplam * .1));
    tribun.etiketGoster(k, { altin: true, sure: 40 });
    let sonuc;
    if (toplam >= e.ozel) { mac.penaltiIste(k, ad, ti, true); tribun.havaiFisek(10); tribun.pankart(ti, ad); tribun.bayrak(ti); tribun.dumanBulutu(ti, 6); sonuc = 'özel penaltı kazandı'; }
    else if (toplam >= e.penalti) { mac.penaltiIste(k, ad, ti, false); tribun.pankart(ti, ad); tribun.mesale(k, ti); tribun.bayrak(ti); sonuc = 'penaltı kazandı'; }
    else if (toplam >= e.sahayaGir) { mac.sahayaGir(k, ad, ti); tribun.mesale(k, ti); tribun.bayrak(ti); sonuc = 'sahaya giriyor'; }
    else if (toplam >= 10) { tribun.pankart(ti, ad); tribun.dumanBulutu(ti, 4); tribun.bayrak(ti); sonuc = 'pankart açtı'; }
    else if (toplam >= 5) { tribun.bayrak(ti); tribun.mesale(k, ti); sonuc = 'bayrak açtı'; }
    else { tribun.mesale(k, ti); sonuc = 'meşale yaktı'; }
    hud.akis(`${ad} ${takimlar[ti].kisa} için ${sonuc}`, true);
    if (toplam >= e.sahayaGir) ses.fanfar();
  }
}

// ---------- maç olayları ----------
mac.olay = (ad, v) => {
  if (ad === 'gol') {
    const t = takimlar[v.ti];
    hud.afis('GOL!', `${v.misafir ? '★ ' : ''}${v.ad} • ${t.ad}`, t.renk1 === '#111111' ? '#ffffff' : t.renk1, 4.2);
    ses.tezahurat(1); ses.kis(5); kamera.sarsinti = 1.2;
    tribun.kutla(v.ti, 6); tribun.konfeti(v.ti); for (let i = 0; i < 6; i++) tribun.mesale(null, v.ti, rnd(8, 14));
    gurultu[v.ti] += 25; ses.soyle(`Gol! ${v.ad}!`);
  } else if (ad === 'sahayaGirdi') {
    hud.afis('SAHADA!', `★ ${v.ad} • ${takimlar[v.ti].ad}`, '#ffd23f', 3.2);
    kamera.goster('oyuncu', v.p, 4.5); ses.soyle(`${v.ad} sahaya giriyor!`);
  } else if (ad === 'penaltiBasla') {
    ses.duduk(1); ses.kis(14); ses.soyle(`Penaltı! Topun başında ${v.ad}!`);
  } else if (ad === 'penaltiSonuc') {
    const t = takimlar[v.ti];
    if (v.gol) { hud.afis('GOL!', `★ ${v.ad} penaltıyı attı`, t.renk1 === '#111111' ? '#ffffff' : t.renk1, 4.2); ses.tezahurat(1.1); kamera.sarsinti = 1.4; tribun.kutla(v.ti, 6); tribun.konfeti(v.ti); if (v.ozel) tribun.havaiFisek(8); ses.soyle(`Gol! ${v.ad}!`); }
    else { hud.afis(v.tur === 'kurtaris' ? 'KURTARDI!' : v.tur === 'direk' ? 'DİREK!' : 'DIŞARI!', `${v.ad} kaçırdı`, '#ffffff', 3.6); ses.ah(); tribun.kutla(1 - v.ti, 4); ses.soyle(`Kaçtı!`); }
  } else if (ad === 'duduk') ses.duduk(1);
  else if (ad === 'vurus') ses.vurus(v.guclu);
  else if (ad === 'direk') ses.direk();
  else if (ad === 'kurtaris' || ad === 'aut') ses.ah();
  else if (ad === 'macSonu') {
    const [a, b] = v.skor;
    hud.afis('MAÇ BİTTİ', v.kazanan < 0 ? `Berabere ${a} - ${b}` : `${takimlar[v.kazanan].ad} kazandı ${a} - ${b}`, '#ffd23f', 9);
    ses.duduk(3); if (v.kazanan >= 0) { tribun.kutla(v.kazanan, 10); tribun.konfeti(v.kazanan); tribun.havaiFisek(8); kamera.goster('tribun', v.kazanan, 7); ses.tezahurat(.9, 6); }
    ses.soyle(v.kazanan < 0 ? 'Maç berabere bitti.' : `Maç bitti. Kazanan ${takimlar[v.kazanan].ad}!`);
  } else if (ad === 'macBasi') {
    if (takimlar[0]) hud.afis('MAÇ BAŞLIYOR', `${takimlar[0].ad} - ${takimlar[1].ad}`, '#ffffff', 3.5);
  }
};

// ---------- köprü ----------
let ws = null;
function baglan() {
  ws = new WebSocket(`ws://${location.host}`);
  ws.onopen = () => { hud.baglanti(true); ws.send(JSON.stringify({ t: 'rol', rol: 'oyun' })); };
  ws.onclose = () => { hud.baglanti(false); setTimeout(baglan, 2000); };
  ws.onmessage = m => {
    let v; try { v = JSON.parse(m.data); } catch { return; }
    if ((v.t === 'merhaba' || v.t === 'ayar') && (v.ayar.mod || 'mac') !== 'mac') { location.reload(); return; } // yayın tipi değişti
    if (v.t === 'merhaba') { ayar = v.ayar; takimListe = v.takimlar || []; ses.listeAyarla(v.muzik); kur(); }
    else if (v.t === 'ayar') { ayar = v.ayar; if (takimListe.length) kur(); }
    else if (v.t === 'muzik') ses.listeAyarla(v.liste);
    else if (v.t === 'olay') olayIsle(v);
    else if (v.t === 'komut') komut(v);
  };
}
function komut(v) {
  if (!hazir) return;
  if (v.ne === 'yeniMac') mac.yeniMac();
  else if (v.ne === 'goster') { const p = mac.misafirBul(v.k); if (p) kamera.goster('oyuncu', p, 6); }
  else if (v.ne === 'tribunGoster') kamera.goster('tribun', v.ti ? 1 : 0, 6);
  else if (v.ne === 'hareket') {
    const tl = v.ti === 0 || v.ti === 1 ? [v.ti] : [0, 1];
    if (v.is === 'dalga') tribun.dalga();
    else if (v.is === 'zipla') { tl.forEach(t => tribun.ziplat(t)); ses.davul(6); }
    else if (v.is === 'isik') tl.forEach(t => tribun.isikAc(t));
    else if (v.is === 'fisek') tribun.havaiFisek(8);
  } else if (v.ne === 'muzik') {
    ses.baslat();
    if (v.is === 'cal') ses.cal(typeof v.i === 'number' ? v.i : undefined);
    else if (v.is === 'dur') ses.dur();
    else if (v.is === 'sonraki') ses.sonraki();
  }
}
insanYukle().then(baglan).catch(e => { console.error(e); hud.afis('MODEL', 'Oyuncu modeli yüklenemedi', '#ff6b6b', 60); });

// ---------- ses başlatma ----------
// Yayın programlarının tarayıcı kaynağında ses kendiliğinden açılır; normal tarayıcıda bir tıklama gerekir.
const sesDugme = document.getElementById('ses');
const sesAc = () => { ses.baslat(); sesDugme.style.display = 'none'; };
addEventListener('pointerdown', sesAc); addEventListener('keydown', sesAc);
ses.baslat();
if (!YAYIN) setTimeout(() => { if (!ses.hazir) sesDugme.style.display = 'block'; }, 1200);

// ---------- döngü ----------
let sonKare = performance.now();
let t = 0, hudT = 0, durumT = 0, bakimT = 0, kareSayi = 0, fps = 0, fpsT = performance.now();
function kare() {
  requestAnimationFrame(kare);
  const simdiKare = performance.now(), dt = Math.min(.05, (simdiKare - sonKare) / 1000); sonKare = simdiKare; t += dt;
  if (++kareSayi && simdiKare - fpsT >= 1000) { fps = Math.round(kareSayi * 1000 / (simdiKare - fpsT)); kareSayi = 0; fpsT = simdiKare; }
  if (hazir) {
    const sonme = Math.exp(-dt / 8); gurultu[0] *= sonme; gurultu[1] *= sonme;
    mac.gurultu = gurultu;
    tribun.heyecan[0] = Math.min(1, gurultu[0] / 60); tribun.heyecan[1] = Math.min(1, gurultu[1] / 60);
    mac.guncelle(dt, kam); tribun.guncelle(dt, t, kam);
    const pn = mac.pen;
    if (pn && pn.asama === 'hazirlik') { islikT -= dt; if (islikT <= 0) { islikT = rnd(.25, .7); ses.islik(Math.min(2, .6 + pn.yuh * .08)); } }
    hudT -= dt;
    if (hudT <= 0) {
      hudT = .1;
      hud.skor(mac.skor, mac.dakika, [tribun.sayi(0), tribun.sayi(1)], mac.faz === 'bitti');
      hud.olcer((gurultu[0] + 4) / (gurultu[0] + gurultu[1] + 8));
      hud.penalti(pn, mac.penaltiOran());
      ses.seviye((gurultu[0] + gurultu[1]) / 120 + (mac.faz === 'gol' ? .5 : 0));
    }
    bakimT -= dt;
    if (bakimT <= 0) { bakimT = 5; tribun.pasifleriCikar(20 * 60 * 1000); tribun.dolguAyarla(ayar.dolgu); }
    if (simdiKare - durumT >= 1000 && ws?.readyState === 1) {
      durumT = simdiKare;
      ws.send(JSON.stringify({ t: 'durum', skor: mac.skor, dakika: mac.dakika, faz: mac.faz, sayi: [tribun.sayi(0), tribun.sayi(1)],
        misafirler: mac.misafirler(), penalti: mac.pen ? mac.pen.ad : '', kuyruk: mac.penKuyruk.map(p => p.ad), muzik: ses.durum(), fps, kalite }));
    }
  }
  stadyum.guncelle(dt); duman.guncelle(dt); isilti.guncelle(dt);
  kamera.guncelle(dt, mac, t);
  yayinGecis.uniforms.uT.value = t % 10;
  besteci.render();
}
kare();

// Geliştirme ve ekran görüntüsü kontrolü için
window.tribunOyun = { mac, tribun, kamera, ses, hud, olayIsle, gurultu };
