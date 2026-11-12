// Pavyon yayını — ana dosya: sahneyi kurar, köprüden gelen olayları pavyona bağlar
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { normal, temizAd, kufurVar, rnd } from './ortak.js';
import { Parcaciklar } from './parcacik.js';
import { insanYukle } from './insan.js';
import { Pavyon, ROLLER } from './pavyon.js';
import { Ses } from './ses.js';
import { Hud } from './hud.js';

const GEN = 1080, YUK = 1920, YAYIN = location.pathname.startsWith('/yayin');
document.body.classList.add('pavyon');
const cerceve = document.getElementById('cerceve');
function sigdir() { const o = Math.min(innerWidth / GEN, innerHeight / YUK); cerceve.style.transform = `translate(-50%,-50%) scale(${o})`; }
addEventListener('resize', sigdir); sigdir();

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(GEN, YUK, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
const sahne = new THREE.Scene();
const kam = new THREE.PerspectiveCamera(46, GEN / YUK, 1, 400);
const besteci = new EffectComposer(renderer, new THREE.WebGLRenderTarget(GEN, YUK, { type: THREE.HalfFloatType, samples: 4 }));
besteci.addPass(new RenderPass(sahne, kam));
const parlama = new UnrealBloomPass(new THREE.Vector2(GEN, YUK), .55, .55, .9); besteci.addPass(parlama);
besteci.addPass(new OutputPass());

const duman = new Parcaciklar(sahne, 1800, false), isilti = new Parcaciklar(sahne, 1500, true);
const ses = new Ses(), hud = new Hud();
let pavyon = null, ayar = null, hazir = false, kalite = '';
const yildiz = new Map();
const cek = { kar: null, bitis: 0 }, kp = new THREE.Vector3(0, 21, 41), kb = new THREE.Vector3(0, 5.5, -9);
let sonHesap = 0, sonOyna = new Map(), sonGoster = 0;

function kaliteUygula(k) {
  if (k === kalite) return; kalite = k;
  const ornek = k === 'yuksek' ? 4 : k === 'orta' ? 2 : 0;
  for (const h of [besteci.renderTarget1, besteci.renderTarget2]) if (h.samples !== ornek) { h.samples = ornek; h.dispose(); }
  renderer.shadowMap.enabled = k !== 'dusuk'; pavyon.sahneIsik.castShadow = k !== 'dusuk'; parlama.enabled = k !== 'dusuk';
  sahne.traverse(o => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
}
function esikler() { return { konslaOyna: 20, sahne: 30, garson: 50, kons: 80, sazci: 100, assolist: 200, patron: 500, ...(ayar.pavyonEsik || {}) }; }
function kur() {
  kaliteUygula(ayar.kalite || 'yuksek');
  ses.ayarla({ efektSes: ayar.efektSes, muzikSes: ayar.muzikSes, spiker: ayar.spiker }); ses.karisik = ayar.muzikSira === 'karisik';
  ses.kaynakAyarla(ayar.muzikKaynak, ayar.youtube);
  if (ayar.muzikAcik && !ses.istenen) ses.cal(); else if (!ayar.muzikAcik && ses.istenen) ses.dur();
  pavyon.tabela(ayar.pavyonAd); document.getElementById('pvAd').textContent = (ayar.pavyonAd || 'PAVYON').toLocaleUpperCase('tr');
  const e = esikler();
  hud.ipuclari = [
    `Yaz, beğen: <b>coşku</b> dolunca fasıl başlar`,
    `<b>oyna</b> yaz, piste çık • <b>alkış</b> yaz, peçeteler uçsun`,
    `Hediye: peçete • çiçek • istek parça`,
    `<b>${e.konslaOyna}+</b> konsla pistte oyna • <b>${e.sahne}+</b> sahneye çık`,
    `<b>${e.garson}+</b> garson • <b>${e.kons}+</b> kons • <b>${e.sazci}+</b> sazcı`,
    `<b>${e.assolist}+</b> assolist • <b>${e.patron}+</b> patron (para yağmuru)`,
  ];
  if (!hazir) hud._ipucu();
  hazir = true;
}
const goster = (kar, sure = 4.5) => { if (kar) { cek.kar = kar; cek.bitis = performance.now() + sure * 1000; } };

function olayIsle(o) {
  if (!hazir || !o.k) return;
  const k = o.k, ad = temizAd(o.ad), simdi = performance.now();
  const m = pavyon.gel(k, ad);
  if (o.tur === 'yorum') {
    const n = normal(o.metin || '').replace(/[^a-z0-9 ]+/g, ' '), kelimeler = n.split(' ').filter(Boolean);
    const yazi = String(o.metin || '').replace(/[\u0000-\u001f​-‏‪-‮]/g, '').replace(/\s+/g, ' ').trim();
    pavyon.konus(k, kufurVar(yazi) ? '' : [...yazi].slice(0, 40).join(''));
    if (kelimeler.some(w => w === 'oyna' || w === 'oynat' || w === 'pist' || w === 'halay') && simdi - (sonOyna.get(k) || 0) > 15000) { sonOyna.set(k, simdi); pavyon.oynat(k); }
    if (kelimeler.includes('alkis') && m.yuva) { pavyon.pecete(m.yuva.mx, m.yuva.mz, 30); ses.alkis(); }
    if (kelimeler.includes('hesap') && simdi - sonHesap > 30000) { sonHesap = simdi; hud.afis('HESAP!', `${ad}: ${(Math.round(rnd(40, 990)) * 50).toLocaleString('tr-TR')} TL`, '#ffd23f', 3.5); }
    if (n.includes('beni goster') && simdi - sonGoster > 8000) { const kar = pavyon.rolBul(k) || (m.dansBitis > simdi && m.yuva ? m.yuva.kar : null); if (kar) { sonGoster = simdi; goster(kar, 5); } }
    pavyon.coskuEkle(3);
  } else if (o.tur === 'begeni') {
    pavyon.coskuEkle(Math.min(60, Math.max(1, o.adet | 0)) * .16);
  } else if (o.tur === 'takip' || o.tur === 'paylasim') {
    if (m.yuva) pavyon.pecete(m.yuva.mx, m.yuva.mz, 40);
    hud.akis(`${ad} ${o.tur === 'takip' ? 'takip etti' : 'yayını paylaştı'}`); pavyon.coskuEkle(6);
  } else if (o.tur === 'hediye') {
    const toplam = Math.max(1, (o.jeton | 0) * (o.adet | 0)), e = esikler();
    m.jeton += toplam;
    const y = yildiz.get(k) || { ad, jeton: 0 }; y.ad = ad; y.jeton += toplam; yildiz.set(k, y);
    hud.yildizlar([...yildiz.values()].sort((a, b) => b.jeton - a.jeton).slice(0, 5));
    pavyon.coskuEkle(Math.min(45, 5 + toplam * .4));
    const yer = m.yuva ? [m.yuva.mx, m.yuva.mz] : [0, 6];
    // eşikler panelden değişir: tutarı karşılayan en yüksek basamak uygulanır
    const basamak = Object.entries(e).filter(([, j]) => toplam >= j).sort((a, b) => b[1] - a[1])[0]?.[0];
    let rol = ROLLER[basamak] ? basamak : null, sonuc, kar;
    if (rol) {
      kar = pavyon.rolVer(rol, k, ad); goster(kar, 5); ses.fanfar();
      hud.afis(ROLLER[rol].toLocaleUpperCase('tr') + '!', `★ ${ad}`, '#ffd23f', 3.4); sonuc = `${ROLLER[rol].toLocaleLowerCase('tr')} oldu`;
      if (rol === 'patron') { pavyon.para(); kar.sacma = simdi + 9000; pavyon.fasilBaslat(18); ses.tezahurat(.8, 4); ses.soyle(`Patron geldi! ${ad}!`); }
      else if (rol === 'assolist') { pavyon.konfeti(); ses.alkis(); ses.soyle(`Sahnede ${ad}!`); }
    } else if (basamak === 'sahne' && (kar = pavyon.sahneyeCik(k))) { goster(kar, 6); hud.afis('SAHNEDE!', `★ ${ad}`, '#ff7ac4', 3.2); pavyon.konfeti(); ses.alkis(); ses.fanfar(); sonuc = 'sahneye çıktı';
    } else if (basamak && (kar = pavyon.konslaOyna(k))) { goster(kar, 6); hud.afis('KONSLA OYNUYOR', `★ ${ad}`, '#ff7ac4', 3.2); pavyon.pecete(kar.hx, kar.hz, 60); ses.alkis(); sonuc = 'konsla pistte oynuyor';
    } else if (toplam >= 10) { hud.afis('İSTEK PARÇA', `${ad} için çalıyor`, '#ff7ac4', 3); goster(pavyon.roller.assolist[0], 3.5); pavyon.peceteHerYer(); ses.alkis(); sonuc = 'istek parça yaptı'; }
    else if (toplam >= 5) { pavyon.cicek(yer[0], yer[1]); sonuc = 'sahneye çiçek attı'; }
    else { pavyon.pecete(yer[0], yer[1], 70); sonuc = 'peçete attı'; }
    hud.akis(`${ad} ${sonuc}`, true);
    if (!kar) pavyon.konus(k, '', true);
  }
}

// ---------- köprü ----------
let ws = null;
function baglan() {
  ws = new WebSocket(`ws://${location.host}`);
  ws.onopen = () => { hud.baglanti(true); ws.send(JSON.stringify({ t: 'rol', rol: 'oyun' })); };
  ws.onclose = () => { hud.baglanti(false); setTimeout(baglan, 2000); };
  ws.onmessage = msg => {
    let v; try { v = JSON.parse(msg.data); } catch { return; }
    if ((v.t === 'merhaba' || v.t === 'ayar') && v.ayar.mod !== 'pavyon') { location.reload(); return; } // yayın tipi değişti
    if (v.t === 'merhaba') { ayar = v.ayar; ses.listeAyarla(v.muzik); kur(); }
    else if (v.t === 'ayar') { ayar = v.ayar; kur(); }
    else if (v.t === 'muzik') ses.listeAyarla(v.liste);
    else if (v.t === 'olay') olayIsle(v);
    else if (v.t === 'komut') komut(v);
  };
}
function komut(v) {
  if (!hazir) return;
  if (v.ne === 'goster') goster(pavyon.rolBul(v.k), 6);
  else if (v.ne === 'hareket') {
    if (v.is === 'fasil' || v.is === 'zipla' || v.is === 'dalga') { if (pavyon.fasilBaslat(14)) hud.afis('FASIL!', 'Herkes piste', '#ff7ac4', 3); }
    else if (v.is === 'konfeti' || v.is === 'isik') pavyon.konfeti();
    else if (v.is === 'para' || v.is === 'fisek') pavyon.para();
    else if (v.is === 'pecete') { pavyon.peceteHerYer(); ses.alkis(); }
  } else if (v.ne === 'muzik') {
    ses.baslat();
    if (v.is === 'cal') ses.cal(typeof v.i === 'number' ? v.i : undefined); else if (v.is === 'dur') ses.dur(); else if (v.is === 'sonraki') ses.sonraki();
  }
}

insanYukle().then(() => {
  pavyon = new Pavyon(sahne, duman, isilti);
  pavyon.olay = ad => {
    if (ad === 'fasil') { hud.afis('FASIL!', 'Herkes piste', '#ff7ac4', 3.2); ses.tezahurat(.7, 3.5); ses.alkis(); }
  };
  baglan();
}).catch(e => { console.error(e); hud.afis('MODEL', 'Karakter modeli yüklenemedi', '#ff6b6b', 60); });

const sesDugme = document.getElementById('ses');
const sesAc = () => { ses.baslat(); sesDugme.style.display = 'none'; };
addEventListener('pointerdown', sesAc); addEventListener('keydown', sesAc); ses.baslat();
if (!YAYIN) setTimeout(() => { if (!ses.hazir) sesDugme.style.display = 'block'; }, 1200);

let sonKare = performance.now(), t = 0, hudT = 0, durumT = 0, kareSayi = 0, fps = 0, fpsT = sonKare;
const hp = new THREE.Vector3(), hb = new THREE.Vector3();
function kare() {
  requestAnimationFrame(kare);
  const simdi = performance.now(), dt = Math.min(.05, (simdi - sonKare) / 1000); sonKare = simdi; t += dt;
  if (++kareSayi && simdi - fpsT >= 1000) { fps = Math.round(kareSayi * 1000 / (simdi - fpsT)); kareSayi = 0; fpsT = simdi; }
  if (hazir) {
    pavyon.guncelle(dt, t, kam);
    const fasil = pavyon.fasil > 0;
    if (cek.kar && cek.bitis > simdi && cek.kar.kok.parent) { const c = cek.kar; hp.set(c.x + 3, c.taban + 5.2, c.z + 13.5); hb.set(c.x, c.taban + 2.7, c.z); }
    else if (fasil) { hp.set(Math.sin(t * .5) * 7, 15, 30); hb.set(0, 4, -6); }
    else { hp.set(Math.sin(t * .22) * 2, 22, 42); hb.set(0, 5, -8); }
    const k = 1 - Math.exp(-dt * 2.4); kp.lerp(hp, k); kb.lerp(hb, k);
    kam.position.copy(kp); kam.lookAt(kb);
    hudT -= dt;
    if (hudT <= 0) {
      hudT = .15;
      document.getElementById('pvDolu').style.width = (fasil ? 100 : pavyon.cosku).toFixed(0) + '%';
      document.getElementById('pvKisi').textContent = `${pavyon.misafirSayi} misafir`;
      ses.seviye(pavyon.cosku / 140 + (fasil ? .4 : 0)); ses.ritim(true, fasil);
    }
    if (simdi - durumT >= 1000 && ws?.readyState === 1) {
      durumT = simdi;
      ws.send(JSON.stringify({ t: 'durum', mod: 'pavyon', skor: [0, 0], dakika: 0, faz: fasil ? 'fasil' : 'pavyon', sayi: [pavyon.misafirSayi, 0], cosku: Math.round(pavyon.cosku),
        misafirler: pavyon.rolSahipleri().map(r => ({ k: r.k, ad: r.ad, rol: r.rol })), penalti: '', kuyruk: [], muzik: ses.durum(), fps, kalite }));
    }
  }
  duman.guncelle(dt); isilti.guncelle(dt);
  besteci.render();
}
kare();
window.tribunOyun = { get pavyon() { return pavyon; }, ses, hud, olayIsle, kam };
