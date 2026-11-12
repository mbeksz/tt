// Maç: 11'e 11 otomatik oyun, hediyeyle sahaya giren oyuncular ve penaltı
import * as THREE from 'three';
import { SAHA, rnd, sec, sinirla, zitRenk, etiketOlustur } from './ortak.js';
import { Insan } from './insan.js';

const { HW, HL, KALE_G, PENALTI } = SAHA;
const L = SAHA.L, W = SAHA.W;
const PEN_Z = -HL + PENALTI;          // penaltılar hep kuzey kalesine (tribünün önüne) atılır
const MISAFIR_SURE = 180000;          // hediyeyle giren oyuncu en az 3 dk sahada kalır
const TEN = [0xf1c9a5, 0xe0ac86, 0xc68e63, 0x9a6844, 0x6f4a31];

const GEO = { top: new THREE.SphereGeometry(.42, 16, 12) };
const SAC = [0x15110d, 0x2b1d12, 0x4a3320, 0x101010, 0x6b4a2a];

function tuvalDoku(w, h) {
  const tv = document.createElement('canvas'); tv.width = w; tv.height = h;
  const doku = new THREE.CanvasTexture(tv); doku.colorSpace = THREE.SRGBColorSpace; doku.anisotropy = 4;
  return { tv, g: tv.getContext('2d'), doku };
}

class Oyuncu {
  constructor(mac, ti, sira, takim, kaleci, ev) {
    this.mac = mac; this.ti = ti; this.sira = sira; this.takim = takim; this.kaleci = kaleci; this.ev = ev;
    const [no, ad] = takim.oyuncular[sira] || [sira + 1, 'Oyuncu'];
    this.no = no; this.asilAd = String(ad); this.misafir = null;
    this.x = ev.x; this.z = ev.z; this.vx = 0; this.vz = 0; this.hx = ev.x; this.hz = ev.z;
    this.yon = ti ? 0 : Math.PI; this.hiz = 6.5; this.carpan = 1;
    this.sersem = 0; this.koruma = 0; this.kutla = 0; this.uzgun = 0; this.dalis = null; this.yuz = null;

    const zemin = this.zeminRenk = kaleci ? (takim.kaleci || '#22aa77') : takim.renk1;
    this.insan = new Insan({ g1: zemin, g2: kaleci ? zemin : takim.renk2, sort: kaleci ? zemin : takim.sort || takim.renk1,
      corap: kaleci ? zemin : takim.renk1, ten: sec(TEN), desen: kaleci ? 'duz' : takim.desen, sac: sec(SAC) });
    const g = this.grup = this.insan.kok;
    // sırtta isim + numara
    this.sirt = tuvalDoku(256, 256);
    const levha = new THREE.Mesh(new THREE.PlaneGeometry(.33, .33), new THREE.MeshLambertMaterial({ map: this.sirt.doku, transparent: true, alphaTest: .4 }));
    levha.rotation.y = Math.PI; this.insan.tak('Spine2', levha, 0, -.075, -.128);

    this.etiket = etiketOlustur(384, 96);
    this.etiketS = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.etiket.doku, transparent: true, depthTest: false, depthWrite: false }));
    this.etiketS.scale.set(3.8, .95, 1); this.etiketS.position.y = 4.75; this.etiketS.visible = false; this.etiketS.renderOrder = 21;
    g.add(this.etiketS); this.etiketAnahtar = '';
    this.sirtCiz();
    mac.sahne.add(g);
  }
  get ad() { return this.misafir ? this.misafir.ad : this.asilAd; }
  sirtCiz() {
    const { g, doku } = this.sirt;
    g.clearRect(0, 0, 256, 256);
    const renk = zitRenk(this.zeminRenk), kenar = renk === '#ffffff' ? '#000' : '#fff';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.font = '900 40px system-ui, Arial, sans-serif'; g.lineWidth = 8; g.strokeStyle = kenar; g.fillStyle = renk;
    const ad = this.ad.toLocaleUpperCase('tr');
    g.strokeText(ad, 128, 50, 236); g.fillText(ad, 128, 50, 236);
    g.font = '900 140px system-ui, Arial, sans-serif'; g.lineWidth = 13;
    g.strokeText(String(this.no), 128, 160); g.fillText(String(this.no), 128, 160);
    doku.needsUpdate = true;
  }
  etiketAyarla(topSahibi) {
    const anahtar = this.misafir ? 'm:' + this.misafir.ad : topSahibi ? 's:' + this.asilAd : '';
    if (anahtar === this.etiketAnahtar) return;
    this.etiketAnahtar = anahtar; this.etiketS.visible = !!anahtar;
    if (this.misafir) this.etiket.ciz('★ ' + this.misafir.ad, { renk: '#1a1200', zemin: 'rgba(255,205,60,.96)', kenar: '#fff3b0' });
    else if (anahtar) this.etiket.ciz(this.asilAd, { renk: '#ffffff', zemin: 'rgba(8,12,24,.6)', punto: 46 });
  }
  hareket(dt) {
    this.sersem = Math.max(0, this.sersem - dt); this.koruma = Math.max(0, this.koruma - dt);
    this.kutla = Math.max(0, this.kutla - dt); this.uzgun = Math.max(0, this.uzgun - dt);
    const dx = this.hx - this.x, dz = this.hz - this.z, d = Math.hypot(dx, dz);
    let v = this.hiz * this.carpan * (this.sersem > 0 ? .35 : 1) * (this.uzgun > 0 ? .5 : 1);
    if (d < 2) v *= d / 2;
    const ivx = d > .05 ? dx / d * v : 0, ivz = d > .05 ? dz / d * v : 0, k = Math.min(1, dt * 9);
    this.vx += (ivx - this.vx) * k; this.vz += (ivz - this.vz) * k;
    this.x += this.vx * dt; this.z += this.vz * dt;
    const sur = Math.hypot(this.vx, this.vz);
    let hedefYon = this.yon;
    if (this.yuzKilit && this.yuz) hedefYon = Math.atan2(this.yuz.x - this.x, this.yuz.z - this.z);
    else if (sur > .8) hedefYon = Math.atan2(this.vx, this.vz);
    else if (this.yuz) hedefYon = Math.atan2(this.yuz.x - this.x, this.yuz.z - this.z);
    let fark = hedefYon - this.yon; fark = Math.atan2(Math.sin(fark), Math.cos(fark));
    this.yon += fark * Math.min(1, dt * 10);
    // poz: kutlama, üzüntü, kurtarış
    const ins = this.insan, yum = Math.min(1, dt * 8);
    let y = 0, egim = 0;
    ins.kutla += ((this.kutla > 0 ? 1 : 0) - ins.kutla) * yum; ins.uzgun += ((this.uzgun > 0 ? .85 : 0) - ins.uzgun) * yum;
    if (this.kutla > 0) y = Math.abs(Math.sin(this.mac.t * 8 + this.sira)) * .9 * Math.min(1, this.kutla);
    if (this.dalis) {
      this.dalis.t += dt; const u = Math.max(0, Math.min(1, this.dalis.t / .38));
      egim = -this.dalis.yon * 1.3 * u; y = Math.sin(u * Math.PI * .5) * 1.1; ins.dalis = u;
    } else ins.dalis += (0 - ins.dalis) * yum;
    this.grup.position.set(this.x, y, this.z); this.grup.rotation.set(0, this.yon, egim, 'YXZ');
    ins.guncelle(dt, sur);
  }
  kaldir() { this.insan.kaldir(); }
}

export class Mac {
  constructor(sahne, isilti) {
    this.sahne = sahne; this.isilti = isilti;
    this.olay = () => {};
    this.takimlar = [null, null]; this.oyuncular = [];
    this.skor = [0, 0]; this.sure = 0; this.macSuresi = 300; this.t = 0;
    this.faz = 'bekle'; this.fazT = 0; this.zamanOlcek = 1;
    this.gurultu = [0, 0];
    this.penKuyruk = []; this.pen = null; this.sonGol = null;
    const tt = tuvalDoku(64, 32); tt.g.fillStyle = '#fff'; tt.g.fillRect(0, 0, 64, 32); tt.g.fillStyle = '#111';
    for (let i = 0; i < 9; i++) { tt.g.beginPath(); tt.g.arc(rnd(4, 60), rnd(4, 28), 4.5, 0, 6.3); tt.g.fill(); }
    tt.doku.needsUpdate = true;
    const tm = new THREE.Mesh(GEO.top, new THREE.MeshLambertMaterial({ map: tt.doku })); tm.castShadow = true; sahne.add(tm);
    this.top = { x: 0, y: .42, z: 0, sahip: null, ucus: null, mesh: tm, atesli: false };
    this.kararT = 1; this.kapmaT = 0; this.misafirT = 0;
  }

  // ---------- kurulum ----------
  yon(ti) { return ti ? 1 : -1; }           // A kuzeye (-z), B güneye (+z) hücum eder
  kaleZ(ti) { return -this.yon(ti) * HL; }  // takımın kendi kalesi
  takimlariKur(a, b) {
    const eskiMisafir = this.oyuncular.filter(p => p.misafir).map(p => ({ ...p.misafir, ti: p.ti }));
    for (const p of this.oyuncular) p.kaldir();
    this.oyuncular = []; this.takimlar = [a, b];
    [a, b].forEach((takim, ti) => {
      const hatlar = String(takim.dizilis || '4-4-2').split('-').map(Number).filter(n => n > 0);
      const yon = this.yon(ti), z0 = this.kaleZ(ti);
      this.oyuncular.push(new Oyuncu(this, ti, 0, takim, true, { x: 0, z: z0 + yon * 1.3 }));
      let sira = 1;
      hatlar.forEach((adet, hi) => {
        const f = hatlar.length > 1 ? .2 + (.74 - .2) * hi / (hatlar.length - 1) : .45;
        for (let j = 0; j < adet && sira < 11; j++, sira++)
          this.oyuncular.push(new Oyuncu(this, ti, sira, takim, false, { x: ((j + .5) / adet - .5) * (W - 7), z: z0 + yon * f * L }));
      });
      for (; sira < 11; sira++) this.oyuncular.push(new Oyuncu(this, ti, sira, takim, false, { x: rnd(-10, 10), z: z0 + yon * .5 * L }));
    });
    for (const m of eskiMisafir) if (m.bitis > performance.now()) this.sahayaGir(m.k, m.ad, m.ti, true, m.bitis);
    this.yeniMac();
  }
  yeniMac() {
    this.skor = [0, 0]; this.sure = 0; this.pen = null; this.zamanOlcek = 1; this.top.atesli = false;
    for (const p of this.oyuncular) { p.kutla = 0; p.uzgun = 0; p.dalis = null; }
    this.olay('macBasi', {});
    this.santra(Math.random() < .5 ? 0 : 1);
  }
  takimOyunculari(ti) { return this.oyuncular.filter(p => p.ti === ti); }
  kaleci(ti) { return this.oyuncular.find(p => p.ti === ti && p.kaleci); }
  mom(ti) { const g = this.gurultu; return (g[ti] - g[1 - ti]) / (g[0] + g[1] + 20); }
  get dakika() { return Math.min(90, Math.floor(this.sure / this.macSuresi * 90)); }

  // ---------- hediye oyuncusu ----------
  misafirBul(k) { return this.oyuncular.find(p => p.misafir && p.misafir.k === k); }
  sahayaGir(k, ad, ti, sessiz = false, bitis = 0) {
    const simdi = performance.now();
    let p = this.misafirBul(k);
    if (p && p.ti !== ti) { this._misafirCikar(p); p = null; }
    if (!p) {
      const aday = this.takimOyunculari(ti).filter(o => !o.kaleci);
      const bos = aday.filter(o => !o.misafir && o !== this.top.sahip);
      p = bos.length ? sec(bos) : aday.filter(o => o !== this.pen?.p).reduce((a, b) => ((a.misafir?.bitis || 0) < (b.misafir?.bitis || 0) ? a : b));
      if (!p) return null;
    }
    p.misafir = { k, ad, bitis: Math.max(bitis, simdi + MISAFIR_SURE) };
    p.sirtCiz(); p.etiketAnahtar = '~';
    if (!sessiz) {
      for (let i = 0; i < 40; i++) this.isilti.sac({ x: p.x, y: rnd(.5, 4), z: p.z, vx: rnd(-3, 3), vy: rnd(2, 8), vz: rnd(-3, 3), omur: rnd(.5, 1.2), boyut: .5, r: 3, g: 2.4, b: .6, a: 1, cekim: 4 });
      this.olay('sahayaGirdi', { p, k, ad, ti });
    }
    return p;
  }
  _misafirCikar(p) { p.misafir = null; p.sirtCiz(); p.etiketAnahtar = '~'; }
  misafirler() { return this.oyuncular.filter(p => p.misafir).map(p => ({ k: p.misafir.k, ad: p.misafir.ad, ti: p.ti, no: p.no })); }

  // ---------- penaltı ----------
  penaltiIste(k, ad, ti, ozel) { if (this.penKuyruk.length < 30) this.penKuyruk.push({ k, ad, ti, ozel: !!ozel }); }
  penaltiTepki(ti, miktar) {
    const pn = this.pen; if (!pn || pn.asama !== 'hazirlik') return;
    if (ti === pn.ti) pn.destek += miktar; else pn.yuh += miktar;
  }
  penaltiOran() {
    const pn = this.pen; if (!pn) return .5;
    return sinirla(.5 + .28 * (pn.destek - pn.yuh) / (pn.destek + pn.yuh + 6) + (pn.ozel ? .22 : 0), .15, .92);
  }
  _penaltiBasla() {
    const istek = this.penKuyruk.shift();
    const p = this.sahayaGir(istek.k, istek.ad, istek.ti, true); if (!p) return;
    const top = this.top; top.sahip = null; top.ucus = null; top.x = 0; top.y = .42; top.z = PEN_Z; top.atesli = false;
    this.pen = { ...istek, p, kaleci: this.kaleci(1 - istek.ti), asama: 'hazirlik', t: 0, sure: 10, destek: 0, yuh: 0 };
    this.faz = 'penalti';
    // diğer oyuncular ceza sahası dışına dizilir
    let j = 0;
    for (const o of this.oyuncular) {
      o.carpan = 2.6; o.kutla = 0; o.uzgun = 0; o.dalis = null; o.yuz = { x: 0, z: -HL };
      if (o === p) { o.hx = .6; o.hz = PEN_Z + 4.6; }
      else if (o === this.pen.kaleci) { o.hx = 0; o.hz = -HL + .5; o.yuz = { x: 0, z: 0 }; o.yuzKilit = true; }
      else if (o.kaleci) { o.hx = 0; o.hz = HL - 2; }
      else { const yan = j % 2 ? 1 : -1, s = (j / 2) | 0; o.hx = yan * (14.5 + (s % 2) * 3.2); o.hz = -HL + 9 + ((s / 2) | 0) * 2.4 + (s % 2) * 1.2; j++; } // kameranın önünü kapatmasınlar
    }
    this.olay('penaltiBasla', { ad: istek.ad, ti: istek.ti, ozel: istek.ozel, p });
  }
  _penaltiGuncelle(dt) {
    const pn = this.pen, top = this.top, p = pn.p;
    pn.t += dt;
    if (pn.asama === 'hazirlik') {
      pn.kaleci.hx = Math.sin(this.t * 3.2) * 1.7; pn.kaleci.carpan = 1.2;
      if (pn.t >= pn.sure) { pn.asama = 'kosu'; pn.t = 0; p.hx = 0; p.hz = PEN_Z + 1.0; p.carpan = 1.25; this.olay('duduk', {}); }
    } else if (pn.asama === 'kosu') {
      if (pn.t >= .85) {
        pn.asama = 'atis'; pn.t = 0; this.zamanOlcek = .3;
        const gol = Math.random() < this.penaltiOran(), yan = Math.random() < .5 ? -1 : 1, z0 = -HL;
        let hedef, tur;
        if (gol) { tur = 'gol'; hedef = { x: yan * rnd(2.4, 4.3), y: rnd(.5, 2.9), z: z0 - 1.7 }; pn.kaleci.dalis = { yon: Math.random() < .75 ? -yan : yan, t: -.06 }; }
        else {
          const r = Math.random();
          if (r < .55) { tur = 'kurtaris'; hedef = { x: yan * rnd(1.6, 3.4), y: rnd(.7, 2.1), z: z0 + .5 }; pn.kaleci.dalis = { yon: yan, t: 0 }; }
          else if (r < .8) { tur = 'direk'; hedef = { x: yan * (KALE_G / 2), y: rnd(1, 3), z: z0 }; pn.kaleci.dalis = { yon: -yan, t: 0 }; }
          else { tur = 'aut'; hedef = { x: yan * rnd(6.2, 8), y: rnd(2.5, 6), z: z0 - 7 }; pn.kaleci.dalis = { yon: yan, t: 0 }; }
        }
        if (pn.kaleci.dalis) { pn.kaleci.hx = pn.kaleci.dalis.yon * 3.3; pn.kaleci.carpan = 2.2; }
        pn.sonuc = tur; top.atesli = pn.ozel; p.insan.vur();
        this._ucur({ tur: 'penalti', hedef, hiz: pn.ozel ? 36 : 30, yuk: .5 });
        this.olay('vurus', { guclu: true });
      }
    } else if (pn.asama === 'atis') {
      if (!top.ucus) {
        if (pn.sonuc === 'direk' && !pn.sekti) { pn.sekti = true; this.olay('direk', {}); this._ucur({ tur: 'penalti', hedef: { x: top.x * 2.2, y: .42, z: -HL + 11 }, hiz: 22, yuk: 2.5 }); return; }
        pn.asama = 'sonuc'; pn.t = 0; this.zamanOlcek = 1; top.atesli = false;
        const gol = pn.sonuc === 'gol';
        if (gol) { this.skor[pn.ti]++; for (const o of this.takimOyunculari(pn.ti)) o.kutla = 4.5; p.kutla = 4.5; }
        else { p.uzgun = 4.5; for (const o of this.takimOyunculari(1 - pn.ti)) o.kutla = 3.5; }
        this.sonGol = gol ? { p, ti: pn.ti, t: this.t } : this.sonGol;
        this.olay('penaltiSonuc', { gol, tur: pn.sonuc, ad: pn.ad, ti: pn.ti, p, ozel: pn.ozel });
      }
    } else if (pn.asama === 'sonuc' && pn.t >= 4.6) {
      const ti = pn.ti; this.pen = null;
      for (const o of this.oyuncular) { o.dalis = null; o.yuz = null; o.yuzKilit = false; }
      this.santra(1 - ti);
    }
  }

  // ---------- oyun akışı ----------
  santra(ti) {
    this.faz = 'santra'; this.fazT = 2.4; this.santraTakim = ti;
    const top = this.top; top.sahip = null; top.ucus = null; top.x = 0; top.y = .42; top.z = 0;
    for (const p of this.oyuncular) {
      p.carpan = 2.5; p.dalis = null; p.yuz = { x: 0, z: 0 };
      const yon = this.yon(p.ti); p.hx = p.ev.x;
      const ic = (p.sira % 3) * 2.6; // aynı çizgide üst üste binmesinler
      p.hz = yon < 0 ? Math.max(1.8 + ic, p.ev.z) : Math.min(-1.8 - ic, p.ev.z); // herkes kendi yarı sahasında
    }
  }
  _ucur({ tur, hedef, hiz, yuk, alici = null, sonuc = null, ti = -1 }) {
    const top = this.top, d = Math.hypot(hedef.x - top.x, hedef.z - top.z);
    top.sahip = null;
    top.ucus = { tur, x0: top.x, y0: top.y, z0: top.z, x1: hedef.x, y1: hedef.y ?? .42, z1: hedef.z, t: 0, T: Math.max(.12, d / hiz), yuk: yuk ?? d * .07, alici, sonuc, ti };
  }
  _pasVer(p) {
    const yon = this.yon(p.ti), rakip = this.takimOyunculari(1 - p.ti);
    let iyi = null, puan = -1e9;
    for (const o of this.takimOyunculari(p.ti)) {
      if (o === p || o.kaleci) continue;
      const mesafe = Math.hypot(o.x - p.x, o.z - p.z); if (mesafe < 4) continue;
      const ileri = sinirla(yon * (o.z - p.z), -10, 24);
      let yakin = 99; for (const r of rakip) yakin = Math.min(yakin, Math.hypot(r.x - o.x, r.z - o.z));
      const s = ileri + Math.random() * 13 - (yakin < 3 ? 9 : 0) - (mesafe > 30 ? 10 : 0) + (p.kaleci && mesafe < 26 ? 6 : 0) + (o.misafir ? 5 : 0);
      if (s > puan) { puan = s; iyi = o; }
    }
    if (!iyi) return;
    let alici = iyi;
    if (!p.kaleci && Math.random() > .82 + .06 * this.mom(p.ti)) { // pas arası
      alici = rakip.filter(r => !r.kaleci).reduce((a, b) => (Math.hypot(a.x - iyi.x, a.z - iyi.z) < Math.hypot(b.x - iyi.x, b.z - iyi.z) ? a : b));
    }
    const d = Math.hypot(alici.x - p.x, alici.z - p.z), T = d / 25;
    const hedef = { x: sinirla(alici.x + alici.vx * T * .6, -HW + 1, HW - 1), z: sinirla(alici.z + alici.vz * T * .6, -HL + 1, HL - 1) };
    p.insan.vur();
    this._ucur({ tur: 'pas', hedef, hiz: 25, alici, ti: p.ti });
    this.olay('vurus', {});
  }
  _sutCek(p, mesafe) {
    const yon = this.yon(p.ti), gz = yon * HL, kaleci = this.kaleci(1 - p.ti);
    const pGol = .2 + Math.max(0, 17 - mesafe) / 17 * .25 + .08 * this.mom(p.ti) + (p.misafir ? .06 : 0);
    const r = Math.random(), yan = Math.random() < .5 ? -1 : 1;
    let sonuc, hedef;
    if (r < pGol) { sonuc = 'gol'; hedef = { x: yan * rnd(1.5, 4.2), y: rnd(.4, 2.8), z: gz + yon * 1.6 }; kaleci.dalis = { yon: (yon > 0 ? -1 : 1) * (Math.random() < .7 ? -yan : yan), t: -.05 }; }
    else if (r < pGol + .42) { sonuc = 'kurtaris'; hedef = { x: sinirla(kaleci.x + yan * rnd(.5, 2.4), -4.5, 4.5), y: rnd(.6, 2), z: gz - yon * .8 }; kaleci.dalis = { yon: (yon > 0 ? -1 : 1) * yan, t: 0 }; kaleci.hx = hedef.x; kaleci.carpan = 2.2; }
    else { sonuc = 'aut'; hedef = { x: yan * rnd(6.2, 9), y: rnd(1.5, 6), z: gz + yon * 6 }; }
    this.sutcu = p; p.insan.vur();
    this._ucur({ tur: 'sut', hedef, hiz: 36, yuk: mesafe * .04, sonuc, ti: p.ti });
    this.olay('vurus', { guclu: true });
  }
  _golOldu(ti, p) {
    this.skor[ti]++; this.faz = 'gol'; this.fazT = 5.2; this.sonGol = { p, ti, t: this.t };
    for (const o of this.oyuncular) {
      if (o.ti === ti) { o.kutla = 5; o.hx = p.x + rnd(-4, 4); o.hz = p.z + rnd(-4, 4); o.carpan = 1.2; }
      else o.uzgun = 5;
    }
    this.olay('gol', { ti, p, ad: p.ad, misafir: !!p.misafir });
  }
  _ucusBitti(u) {
    const top = this.top;
    if (u.tur === 'pas') { top.sahip = u.alici; u.alici.koruma = .75; this.kararT = rnd(.5, 1.0); }
    else if (u.tur === 'sut') {
      const kaleci = this.kaleci(1 - u.ti);
      if (u.sonuc === 'gol') this._golOldu(u.ti, this.sutcu);
      else { top.sahip = kaleci; kaleci.koruma = 3; top.x = kaleci.x; top.z = kaleci.z; this.kararT = 1.5; this.olay(u.sonuc === 'kurtaris' ? 'kurtaris' : 'aut', { ti: u.ti }); }
    }
  }
  _oyun(dt) {
    const top = this.top, sahip = top.sahip;
    // sahiplik: top kimdeyse o takım hücumda
    const hucum = sahip ? sahip.ti : top.ucus ? top.ucus.ti : -1;
    for (const p of this.oyuncular) {
      p.carpan = 1; p.yuz = top; p.hiz = 6.5;
      const yon = this.yon(p.ti);
      if (p.kaleci) { if (p !== sahip) { p.hx = sinirla(top.x * .35, -3.6, 3.6); p.hz = this.kaleZ(p.ti) + yon * 1.3; if (!top.ucus) p.dalis = null; } continue; }
      if (p === sahip) continue;
      const itme = p.ti === hucum ? 4 : -1;
      p.hx = sinirla(p.ev.x + (top.x - p.ev.x) * .22, -HW + 1.5, HW - 1.5);
      p.hz = sinirla(p.ev.z + (top.z - p.ev.z) * .4 + yon * itme, -HL + 3, HL - 3);
    }
    // savunan takımdan en yakın iki oyuncu topa basar; pasın alıcısı topa koşar
    if (hucum >= 0) {
      const hx = top.ucus ? top.ucus.x1 : top.x, hz = top.ucus ? top.ucus.z1 : top.z;
      const sav = this.takimOyunculari(1 - hucum).filter(p => !p.kaleci).sort((a, b) => Math.hypot(a.x - hx, a.z - hz) - Math.hypot(b.x - hx, b.z - hz));
      for (const p of sav.slice(0, 2)) { p.hx = hx; p.hz = hz; p.hiz = 7; }
      if (top.ucus?.tur === 'pas' && top.ucus.alici) { const a = top.ucus.alici; a.hx = top.ucus.x1; a.hz = top.ucus.z1; a.hiz = 7.2; }
    }
    if (!sahip) return;
    const yon = this.yon(sahip.ti), gz = yon * HL;
    if (sahip.kaleci) { sahip.hx = sahip.x; sahip.hz = sahip.z; }
    else { sahip.hiz = 6; sahip.hx = sahip.x * .55 + Math.sin(this.t * 1.7 + sahip.sira) * 5; sahip.hz = gz - yon * 3; }
    const ileriX = Math.sin(sahip.yon), ileriZ = Math.cos(sahip.yon);
    top.x = sahip.x + ileriX * .9; top.z = sahip.z + ileriZ * .9; top.y = .42 + (sahip.kaleci ? 1.3 : 0);

    // top kapma
    this.kapmaT -= dt;
    if (this.kapmaT <= 0 && sahip.koruma <= 0) {
      this.kapmaT = .2;
      for (const r of this.oyuncular) {
        if (r.ti === sahip.ti || r.kaleci || r.sersem > 0) continue;
        if (Math.hypot(r.x - sahip.x, r.z - sahip.z) < 1.6 && Math.random() < .2 * (1 + .35 * this.mom(r.ti))) {
          sahip.sersem = .9; r.koruma = .9; top.sahip = r; this.kararT = rnd(.4, .9); return;
        }
      }
    }
    // karar: şut ya da pas
    this.kararT -= dt;
    if (this.kararT > 0) return;
    this.kararT = rnd(.5, 1.0);
    if (sahip.kaleci) { this._pasVer(sahip); return; }
    const mesafe = Math.hypot(sahip.x, gz - sahip.z);
    if (mesafe < 9 || (mesafe < 17 && Math.random() < .45)) { this._sutCek(sahip, mesafe); return; }
    let baski = 99; for (const r of this.oyuncular) if (r.ti !== sahip.ti) baski = Math.min(baski, Math.hypot(r.x - sahip.x, r.z - sahip.z));
    if (Math.random() < (baski < 4 ? .6 : .22)) this._pasVer(sahip);
  }

  guncelle(gdt, kamera) {
    const dt = gdt * this.zamanOlcek; this.t += dt;
    const top = this.top;
    // top uçuşu
    if (top.ucus) {
      const u = top.ucus; u.t += dt; const k = Math.min(1, u.t / u.T);
      top.x = u.x0 + (u.x1 - u.x0) * k; top.z = u.z0 + (u.z1 - u.z0) * k; top.y = u.y0 + (u.y1 - u.y0) * k + u.yuk * 4 * k * (1 - k);
      if (top.atesli) for (let i = 0; i < 3; i++) this.isilti.sac({ x: top.x, y: top.y, z: top.z, vx: rnd(-1, 1), vy: rnd(-1, 1), vz: rnd(-1, 1), omur: rnd(.25, .5), boyut: rnd(.8, 1.4), r: 3.2, g: 1.3, b: .3, a: 1 });
      if (k >= 1) { top.ucus = null; this._ucusBitti(u); }
    }
    if (this.faz === 'oyun') {
      this.sure += dt;
      this._oyun(dt);
      if (!top.ucus && this.faz === 'oyun') {
        if (this.sure >= this.macSuresi) this._bitir();
        else if (this.penKuyruk.length) this._penaltiBasla();
      }
    } else if (this.faz === 'santra') {
      this.fazT -= dt;
      if (this.fazT <= 0) {
        const p = this.takimOyunculari(this.santraTakim).filter(o => !o.kaleci).at(-1);
        p.x = 0; p.z = -this.yon(p.ti) * 1.0; p.vx = p.vz = 0; p.yon = this.yon(p.ti) > 0 ? 0 : Math.PI;
        top.sahip = p; p.koruma = 1.2; this.kararT = .5; this.faz = 'oyun'; this.olay('duduk', {});
      }
    } else if (this.faz === 'gol') {
      this.fazT -= dt; if (this.fazT <= 0) this.santra(1 - this.sonGol.ti);
    } else if (this.faz === 'penalti') {
      this._penaltiGuncelle(dt);
    } else if (this.faz === 'bitti') {
      this.fazT -= dt; if (this.fazT <= 0) this.yeniMac();
    }
    for (const p of this.oyuncular) {
      p.hareket(dt); p.etiketAyarla(p === top.sahip && this.faz === 'oyun');
      if (kamera && p.etiketS.visible) { const o = Math.min(1, Math.hypot(kamera.position.x - p.x, kamera.position.y - 4, kamera.position.z - p.z) / 62); p.etiketS.scale.set(4.6 * o, 1.15 * o, 1); }
    }
    top.mesh.position.set(top.x, top.y, top.z); top.mesh.rotation.x += dt * 8; top.mesh.rotation.z += dt * 5;
    // süresi dolan hediye oyuncuları
    this.misafirT -= gdt;
    if (this.misafirT <= 0) {
      this.misafirT = 1; const simdi = performance.now();
      for (const p of this.oyuncular) if (p.misafir && p.misafir.bitis < simdi && p !== this.pen?.p && this.faz === 'oyun') this._misafirCikar(p);
    }
  }
  _bitir() {
    this.faz = 'bitti'; this.fazT = 11; this.top.sahip = null;
    const [a, b] = this.skor, kazanan = a === b ? -1 : a > b ? 0 : 1;
    for (const p of this.oyuncular) { p.hx = p.x; p.hz = p.z; if (p.ti === kazanan) p.kutla = 10; else if (kazanan >= 0) p.uzgun = 10; }
    this.olay('macSonu', { skor: [a, b], kazanan });
  }
}
