// Pavyon sahnesi: sahne, sazcılar, assolist, garson, kons, patron, masalar, pist ve misafirler
import * as THREE from 'three';
import { Insan } from './insan.js';
import { balonCiz } from './tribun.js';
import { rnd, sec } from './ortak.js';

const SAHNE_Y = 1.5, ROL_SURE = 180000, MASA_Z = [-9, -1, 7, 15], MASA_X = 7.3;
const TEN = ['#f1c9a5', '#e0ac86', '#c68e63', '#9a6844', '#6f4a31'], SAC = [0x15110d, 0x2b1d12, 0x4a3320, 0x101010, 0x8a6a2a, 0x6b1f14];
const KIYAFET = ['#2d6cdf', '#e4572e', '#17a398', '#8e44ad', '#f2c14e', '#d7263d', '#3a3f58', '#2e7d32', '#ff7aa2', '#f4f4f4'];
const NEON = [0xff3fa4, 0x7b2ff7, 0x21d4fd, 0xffd23f, 0x39ff88, 0xff5a36];
export const ROLLER = { garson: 'Garson', kons: 'Kons', sazci: 'Sazcı', assolist: 'Assolist', patron: 'Patron' };

const kiyafet = tur => {
  const ten = sec(TEN), sac = sec(SAC);
  if (tur === 'garson') return { g1: '#f5f5f5', g2: '#111111', sort: '#15151c', corap: '#15151c', ten, sac, desen: 'duz' };
  if (tur === 'kons') { const r = sec(['#e0218a', '#c1121f', '#7b2ff7', '#d4a017']); return { g1: r, g2: r, sort: r, corap: ten, ten, sac: sec([0x8a6a2a, 0x101010, 0x6b1f14]), desen: 'duz' }; }
  if (tur === 'sazci') return { g1: '#7a1022', g2: '#f5f5f5', sort: '#15151c', corap: '#15151c', ten, sac, desen: 'duz' };
  if (tur === 'assolist') return { g1: '#d4a017', g2: '#fff3b0', sort: '#d4a017', corap: ten, ten, sac: 0x101010, desen: 'duz' };
  if (tur === 'patron') return { g1: '#101014', g2: '#f5f5f5', sort: '#101014', corap: '#101014', ten, sac: 0x2b2b2b, desen: 'duz' };
  const r = sec(KIYAFET); return { g1: r, g2: r, sort: sec(['#1b2540', '#2a2a2a', '#4a3320', '#3a3f58']), corap: '#222222', ten, sac, desen: 'duz' };
};

class Karakter {
  constructor(sahne, tur, x, z, taban = 0) {
    this.tur = tur; this.insan = new Insan(kiyafet(tur)); this.kok = this.insan.kok; sahne.add(this.kok);
    this.x = this.hx = x; this.z = this.hz = z; this.taban = taban; this.vx = this.vz = 0; this.yon = 0; this.hiz = 3.4; this.yuz = null;
    this.dans = false; this.faz = Math.random() * 6.283; this.ad = ''; this.sahip = null;
    const tv = document.createElement('canvas'); tv.width = 640; tv.height = 220;
    const doku = new THREE.CanvasTexture(tv); doku.colorSpace = THREE.SRGBColorSpace; doku.anisotropy = 4;
    this.e = { tv, doku }; this.metinBitis = 0; this.etiketBitis = 0;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: doku, transparent: true, depthTest: false, depthWrite: false }));
    this.sprite.center.set(.5, 0); this.sprite.position.y = 4.35; this.sprite.visible = false; this.sprite.renderOrder = 20; this.kok.add(this.sprite);
  }
  etiket(ad, { metin = '', altin = false, sure = 0 } = {}) {
    this.ad = ad; this.altin = altin; this.metin = metin; if (metin) this.metinBitis = performance.now() + 7000;
    this.etiketBitis = sure ? performance.now() + sure * 1000 : Infinity;
    balonCiz(this.e, ad, metin, altin); this.sprite.visible = !!ad;
  }
  guncelle(dt, t, kam) {
    const dx = this.hx - this.x, dz = this.hz - this.z, d = Math.hypot(dx, dz);
    let v = this.hiz; if (d < 1.5) v *= d / 1.5;
    const k = Math.min(1, dt * 8);
    this.vx += ((d > .05 ? dx / d * v : 0) - this.vx) * k; this.vz += ((d > .05 ? dz / d * v : 0) - this.vz) * k;
    this.x += this.vx * dt; this.z += this.vz * dt;
    const sur = Math.hypot(this.vx, this.vz), ins = this.insan;
    let hedef = this.yon;
    if (sur > .5) hedef = Math.atan2(this.vx, this.vz); else if (this.yuz) hedef = Math.atan2(this.yuz.x - this.x, this.yuz.z - this.z);
    const dansEdiyor = this.dans && sur < .6;
    if (dansEdiyor) hedef += Math.sin(t * 3 + this.faz) * .7;
    let f = hedef - this.yon; f = Math.atan2(Math.sin(f), Math.cos(f)); this.yon += f * Math.min(1, dt * 8);
    ins.dans += ((dansEdiyor ? 1 : 0) - ins.dans) * Math.min(1, dt * 6);
    if (this.otoTaban) this.taban += ((this.z < -18.7 ? SAHNE_Y : 0) - this.taban) * Math.min(1, dt * 9); // sahneye çıkan misafir podyuma basar
    const y = this.taban + Math.abs(Math.sin(t * 6 + this.faz)) * .32 * ins.dans;
    this.kok.position.set(this.x, y, this.z); this.kok.rotation.y = this.yon;
    ins.guncelle(dt, sur);
    if (this.sprite.visible) {
      const now = performance.now();
      if (this.metin && this.metinBitis < now) { this.metin = ''; balonCiz(this.e, this.ad, '', this.altin); }
      if (this.etiketBitis < now) this.sprite.visible = false;
      const o = Math.min(1, kam.position.distanceTo(this.kok.position) / 50) * 7.6;
      this.sprite.scale.set(o, o * 220 / 640, 1);
    }
  }
  kaldir() { this.insan.kaldir(); }
}

export class Pavyon {
  constructor(sahne, duman, isilti) {
    this.sahne = sahne; this.duman = duman; this.isilti = isilti; this.olay = () => {};
    this.misafir = new Map();   // k -> { k, ad, yuva, son, dansBitis, jeton }
    this.yuvalar = [];          // masa başındaki yerler (her biri bir karakter)
    this.roller = { garson: [], kons: [], sazci: [], assolist: [], patron: [] };
    this.cosku = 20; this.fasil = 0; this.gorulen = new Set(); this.t = 0;
    this.sahneYer = [-3.5, 3.5, -5.3, 5.3].map(x => ({ x, bitis: 0 })); // sahnede misafirlerin çıktığı yerler
    this._mekan(); this._personel();
  }

  _mekan() {
    const s = this.sahne;
    s.background = new THREE.Color(0x0a0410); s.fog = new THREE.FogExp2(0x12061c, 0.0028);
    const zemin = new THREE.Mesh(new THREE.PlaneGeometry(60, 110), new THREE.MeshStandardMaterial({ color: 0x1c0f18, roughness: .55, metalness: .15 }));
    zemin.rotation.x = -Math.PI / 2; zemin.position.z = 10; zemin.receiveShadow = true; s.add(zemin);
    // ışıklı pist
    this.pistX = 4; this.pistZ = 7;
    this.pist = new THREE.InstancedMesh(new THREE.BoxGeometry(1.85, .12, 1.85), new THREE.MeshBasicMaterial(), this.pistX * this.pistZ);
    const m = new THREE.Matrix4(); let i = 0;
    for (let a = 0; a < this.pistX; a++) for (let b = 0; b < this.pistZ; b++) { m.setPosition((a - (this.pistX - 1) / 2) * 1.95, .06, -8.5 + b * 1.95); this.pist.setMatrixAt(i, m); this.pist.setColorAt(i++, new THREE.Color(0x220022)); }
    s.add(this.pist); this.pistT = 0;
    // sahne (podyum), perde, tabela
    const sahneKat = new THREE.Mesh(new THREE.BoxGeometry(27, SAHNE_Y, 12), new THREE.MeshStandardMaterial({ color: 0x241018, roughness: .6 }));
    sahneKat.position.set(0, SAHNE_Y / 2, -25); sahneKat.receiveShadow = true; s.add(sahneKat);
    const ampul = new THREE.MeshBasicMaterial({ color: 0xffd98a }); ampul.color.multiplyScalar(1.5);
    for (let x = -13; x <= 13; x += 1.3) { const a = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6), ampul); a.position.set(x, SAHNE_Y - .25, -18.9); s.add(a); }
    const pt = document.createElement('canvas'); pt.width = 512; pt.height = 256; const pg = pt.getContext('2d');
    for (let x = 0; x < 512; x += 32) { const g = pg.createLinearGradient(x, 0, x + 32, 0); g.addColorStop(0, '#5a0714'); g.addColorStop(.5, '#b3122b'); g.addColorStop(1, '#4a0510'); pg.fillStyle = g; pg.fillRect(x, 0, 32, 256); }
    const pv = pg.createLinearGradient(0, 0, 0, 256); pv.addColorStop(0, 'rgba(0,0,0,.65)'); pv.addColorStop(.4, 'rgba(0,0,0,0)'); pv.addColorStop(1, 'rgba(0,0,0,.45)'); pg.fillStyle = pv; pg.fillRect(0, 0, 512, 256);
    const perdeDoku = new THREE.CanvasTexture(pt); perdeDoku.colorSpace = THREE.SRGBColorSpace;
    const perde = new THREE.Mesh(new THREE.PlaneGeometry(44, 26), new THREE.MeshStandardMaterial({ map: perdeDoku, roughness: .9 })); perde.position.set(0, 13, -31); s.add(perde);
    this.tabelaTv = document.createElement('canvas'); this.tabelaTv.width = 1024; this.tabelaTv.height = 200;
    this.tabelaDoku = new THREE.CanvasTexture(this.tabelaTv); this.tabelaDoku.colorSpace = THREE.SRGBColorSpace;
    const tabela = new THREE.Mesh(new THREE.PlaneGeometry(22, 4.3), new THREE.MeshBasicMaterial({ map: this.tabelaDoku, transparent: true })); tabela.position.set(0, 14.2, -30.6); s.add(tabela);
    this.tabela('PAVYON');
    // yan duvarlar + neon şeritler
    const duvar = new THREE.MeshStandardMaterial({ color: 0x1a0b22, roughness: .85 });
    for (const yan of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.PlaneGeometry(90, 26), duvar); d.rotation.y = -yan * Math.PI / 2; d.position.set(yan * 13.5, 13, 8); s.add(d);
      NEON.slice(0, 3).forEach((renk, j) => { const nm = new THREE.MeshBasicMaterial({ color: renk }); nm.color.multiplyScalar(1.5);
        const n = new THREE.Mesh(new THREE.BoxGeometry(.12, .16, 70), nm); n.position.set(yan * 13.3, 5 + j * 3.2, 4); s.add(n); });
    }
    // masalar
    const masaMat = new THREE.MeshStandardMaterial({ color: 0x3a1c12, roughness: .5 }), ortuMat = new THREE.MeshStandardMaterial({ color: 0x7a1830, roughness: .85 });
    const lamba = new THREE.MeshBasicMaterial({ color: 0xffc46b }); lamba.color.multiplyScalar(1.25);
    const bardak = new THREE.MeshStandardMaterial({ color: 0xc8752a, roughness: .2, transparent: true, opacity: .85 });
    for (const yan of [-1, 1]) for (const z of MASA_Z) {
      const x = yan * MASA_X, g = new THREE.Group();
      const ust = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, .12, 20), ortuMat); ust.position.y = 2.35; ust.castShadow = true;
      const ayak = new THREE.Mesh(new THREE.CylinderGeometry(.12, .5, 2.3, 10), masaMat); ayak.position.y = 1.15;
      const l = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), lamba); l.position.y = 2.72;
      g.add(ust, ayak, l);
      for (let j = 0; j < 3; j++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.09, .07, .26, 8), bardak); b.position.set(Math.cos(j * 2.1 + 1) * .8, 2.54, Math.sin(j * 2.1 + 1) * .8); g.add(b); }
      g.position.set(x, 0, z); s.add(g);
      // masa başına 3 yer (masanın pist tarafı boş kalır)
      for (const a of [-1.75, 0, 1.75]) { const aci = (yan > 0 ? 0 : Math.PI) + a * yan, r = a ? 2.15 : 1.95; this.yuvalar.push({ x: x + Math.cos(aci) * r, z: z + Math.sin(aci) * r, mx: x, mz: z, kar: null, k: null }); }
    }
    // disko topu ve dönen ışık hüzmeleri
    this.top = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: .15, flatShading: true, emissive: 0x555577 }));
    this.top.position.set(0, 20.5, 9); s.add(this.top);
    this.huzmeler = NEON.slice(0, 5).map((renk, j) => {
      const geo = new THREE.ConeGeometry(1.7, 19, 20, 1, true); geo.translate(0, -9.5, 0);
      const h = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: renk, transparent: true, opacity: .035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      h.position.set((j - 2) * 3.4, 19, -8 + (j % 2) * 8); h.renderOrder = 4; s.add(h); return h;
    });
    // ışıklar
    s.add(new THREE.HemisphereLight(0xb9a0ff, 0x2a0f1c, .7));
    const sahneIsik = this.sahneIsik = new THREE.DirectionalLight(0xffe2b8, 1.55); sahneIsik.position.set(6, 34, 22); sahneIsik.castShadow = true;
    sahneIsik.shadow.mapSize.set(2048, 2048); Object.assign(sahneIsik.shadow.camera, { left: -20, right: 20, top: 34, bottom: -34, near: 5, far: 110 });
    sahneIsik.shadow.bias = -0.0004; sahneIsik.shadow.normalBias = 0.03; s.add(sahneIsik);
    this.renkli = [0, 1, 2].map(j => { const p = new THREE.PointLight(NEON[j], 90, 40, 1.7); p.position.set((j - 1) * 8, 9, -4 + j * 5); s.add(p); return p; });
    // mikrofon
    const mik = new THREE.Group(), metal = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: .9, roughness: .3 });
    const cubuk = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 3.1, 8), metal); cubuk.position.y = 1.55;
    const bas = new THREE.Mesh(new THREE.SphereGeometry(.13, 10, 8), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .6 })); bas.position.y = 3.15;
    const taban = new THREE.Mesh(new THREE.CylinderGeometry(.45, .5, .08, 14), metal);
    mik.add(cubuk, bas, taban); mik.position.set(0, SAHNE_Y, -20.1); s.add(mik);
  }
  tabela(yazi) {
    const g = this.tabelaTv.getContext('2d'); g.clearRect(0, 0, 1024, 200);
    g.font = '900 150px system-ui, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const m = String(yazi || 'PAVYON').toLocaleUpperCase('tr');
    g.shadowColor = '#ff3fa4'; g.shadowBlur = 30; g.fillStyle = '#e0409a'; g.fillText(m, 512, 104, 980);
    g.shadowBlur = 0; g.fillStyle = '#f08cc4'; g.fillText(m, 512, 104, 980);
    this.tabelaDoku.needsUpdate = true;
  }

  _enstruman(kar, tur) {
    const koyu = new THREE.MeshStandardMaterial({ color: 0x5a3716, roughness: .5 }), acik = new THREE.MeshStandardMaterial({ color: 0xc9975a, roughness: .5 });
    if (tur === 'baglama') {
      const g = new THREE.Group(), govde = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), acik); govde.scale.set(1, 1.35, .6);
      const sap = new THREE.Mesh(new THREE.BoxGeometry(.045, .62, .035), koyu); sap.position.y = .5; g.add(govde, sap);
      g.rotation.z = -1.15; kar.insan.tak('Spine2', g, -.07, -.2, .17);
    } else if (tur === 'darbuka') {
      const d = new THREE.Mesh(new THREE.CylinderGeometry(.13, .08, .36, 12), new THREE.MeshStandardMaterial({ color: 0xb8b8c8, metalness: .8, roughness: .3 }));
      d.rotation.z = 1.2; kar.insan.tak('Spine2', d, -.02, -.3, .2);
    } else {
      const k = new THREE.Mesh(new THREE.CylinderGeometry(.018, .03, .5, 8), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .4 }));
      k.rotation.x = -1.0; kar.insan.tak('Spine2', k, 0, .02, .3);
    }
    kar.insan.cal = 1;
  }
  _personel() {
    // sahnede hazır ekip: üç sazcı + assolist; salonda bir garson
    [['baglama', -6.5, -25], ['darbuka', 0, -27], ['klarnet', 6.5, -25]].forEach(([e, x, z]) => {
      const k = new Karakter(this.sahne, 'sazci', x, z, SAHNE_Y); k.yuz = { x: x * .5, z: 30 }; this._enstruman(k, e); this.roller.sazci.push(k);
    });
    const a = new Karakter(this.sahne, 'assolist', 0, -21.4, SAHNE_Y); a.yuz = { x: 0, z: 30 }; a.insan.mikrofon = 1; a.dans = false; this.roller.assolist.push(a);
    this._garsonEkle();
  }
  _garsonEkle() {
    const k = new Karakter(this.sahne, 'garson', -4.9, 15 - this.roller.garson.length * 8, 0);
    const tepsi = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .025, 16), new THREE.MeshStandardMaterial({ color: 0xcfd3dc, metalness: .9, roughness: .25 }));
    k.insan.tak('RightHand', tepsi, 0, .09, 0); k.insan.tepsi = 1; k.hiz = 3.0; k.durak = this.roller.garson.length * 2; k.bekle = 0;
    this.roller.garson.push(k); return k;
  }
  _konsEkle() { const k = new Karakter(this.sahne, 'kons', rnd(-6, 6), 24, 0); k.hiz = 2.4; k.bekle = 0; this.roller.kons.push(k); return k; }

  // ---------- misafirler ----------
  get misafirSayi() { return this.gorulen.size; }
  gel(k, ad) {
    let m = this.misafir.get(k);
    if (m) { m.ad = ad; m.son = performance.now(); if (!m.yuva && !this.rolBul(k)) this._yerVer(m); return m; } // rolü biten masasına döner
    this.gorulen.add(k);
    m = { k, ad, yuva: null, son: performance.now(), dansBitis: 0, sahneBitis: 0, jeton: 0 };
    this.misafir.set(k, m); this._yerVer(m);
    return m;
  }
  _yerVer(m) {
    // boş yerlerden az kalabalık taraftaki seçilir: salonun iki yanı dengeli dolar
    const sol = this.yuvalar.filter(y => y.k && y.mx < 0).length, sag = this.yuvalar.filter(y => y.k && y.mx > 0).length;
    let yuva = this.yuvalar.find(y => !y.k && (y.mx < 0) === (sol <= sag)) || this.yuvalar.find(y => !y.k);
    if (!yuva) { // yer yoksa en uzun süredir sessiz olan (hediye atmamış) misafirin yeri alınır
      const eski = [...this.misafir.values()].filter(x => x !== m && x.yuva && !x.jeton).sort((a, b) => a.son - b.son)[0];
      if (eski) { yuva = eski.yuva; eski.yuva = null; yuva.k = null; this.misafir.delete(eski.k); }
    }
    if (!yuva) return;
    m.yuva = yuva; yuva.k = m.k; m.dansBitis = m.sahneBitis = 0;
    if (!yuva.kar) { yuva.kar = new Karakter(this.sahne, 'misafir', yuva.x + rnd(-1, 1), 34, 0); yuva.kar.otoTaban = true; }
    else { yuva.kar.x = yuva.x + rnd(-1, 1); yuva.kar.z = 34; yuva.kar.dans = false; }
    const kar = yuva.kar; kar.yuz = { x: 0, z: -22 }; kar.hiz = 3.4; kar.hx = yuva.x; kar.hz = yuva.z; kar.etiket(m.ad, { sure: 8 });
  }
  karakter(k) { const r = this.rolBul(k); if (r) return r; const m = this.misafir.get(k); return m?.yuva?.kar || null; }
  konus(k, metin, altin = false) { const kar = this.karakter(k); if (kar) kar.etiket(kar.sahip ? kar.sahip.ad : this.misafir.get(k)?.ad || '', { metin, altin: altin || !!kar.sahip, sure: kar.sahip ? 0 : 9 }); }
  oynat(k, sure = 22) {
    const m = this.misafir.get(k); if (!m?.yuva) return;
    if (m.dansBitis > performance.now()) return; // zaten pistte ya da sahnede
    m.dansBitis = performance.now() + sure * 1000; const kar = m.yuva.kar; kar.dans = true; kar.hx = rnd(-3.2, 3.2); kar.hz = rnd(-8, 3.5);
  }
  // misafir sahneye çıkar, assolistin yanında oynar
  sahneyeCik(k, sure = 25) {
    const m = this.misafir.get(k); if (!m?.yuva) return null;
    const now = performance.now(), yer = this.sahneYer.find(y => y.bitis < now) || this.sahneYer.reduce((a, b) => (a.bitis < b.bitis ? a : b));
    yer.bitis = m.dansBitis = m.sahneBitis = now + sure * 1000;
    const kar = m.yuva.kar; kar.dans = true; kar.hx = yer.x; kar.hz = -20.5; kar.yuz = { x: 0, z: 30 }; kar.hiz = 5.5; kar.etiket(m.ad, { altin: true, sure });
    return kar;
  }
  // bir kons gelir, misafirle ortadaki ışıklı pistte karşılıklı oynar
  konslaOyna(k, sure = 25) {
    const m = this.misafir.get(k); if (!m?.yuva) return null;
    const liste = this.roller.kons, now = performance.now();
    let kons = liste.find(x => !x.es);
    if (!kons) { if (liste.length < 4) { kons = this._konsEkle(); kons.gecici = true; } else kons = liste.reduce((a, b) => (a.es.bitis < b.es.bitis ? a : b)); }
    const px = rnd(-2, 2), pz = rnd(-6, 1.5), kar = m.yuva.kar;
    m.dansBitis = now + sure * 1000; m.sahneBitis = 0;
    kar.dans = true; kar.hx = px - .95; kar.hz = pz; kar.yuz = kons; kar.hiz = 5; kar.etiket(m.ad, { altin: true, sure });
    kons.cikis = false; kons.es = { bitis: m.dansBitis }; kons.hx = px + .95; kons.hz = pz; kons.yuz = kar; kons.hiz = 5;
    return kar;
  }

  // ---------- roller ----------
  rolBul(k) { for (const liste of Object.values(this.roller)) for (const kar of liste) if (kar.sahip?.k === k) return kar; return null; }
  rolSahipleri() { const r = []; for (const [tur, liste] of Object.entries(this.roller)) for (const kar of liste) if (kar.sahip) r.push({ k: kar.sahip.k, ad: kar.sahip.ad, rol: ROLLER[tur] }); return r; }
  rolVer(tur, k, ad) {
    const eski = this.rolBul(k); if (eski) this._rolBirak(eski);
    const m = this.misafir.get(k); if (m?.yuva) { m.yuva.k = null; if (m.yuva.kar) { m.yuva.kar.sprite.visible = false; m.yuva.kar.hz = 36; } m.yuva = null; } // masadaki yerini bırakır
    const liste = this.roller[tur], azami = { garson: 3, kons: 3, sazci: 3, assolist: 1, patron: 1 }[tur];
    let kar = liste.find(x => !x.sahip);
    if (!kar && liste.length < azami) kar = tur === 'garson' ? this._garsonEkle() : tur === 'kons' ? this._konsEkle() : tur === 'patron' ? this._patronEkle() : null;
    if (!kar) kar = liste.reduce((a, b) => (a.sahip.bitis < b.sahip.bitis ? a : b));
    kar.gecici = false; kar.cikis = false;
    kar.sahip = { k, ad, bitis: performance.now() + ROL_SURE }; kar.etiket(ad, { altin: true });
    for (let i = 0; i < 40; i++) this.isilti.sac({ x: kar.x, y: kar.taban + rnd(.5, 4), z: kar.z, vx: rnd(-3, 3), vy: rnd(2, 7), vz: rnd(-3, 3), omur: rnd(.5, 1.2), boyut: .45, r: 3, g: 2.3, b: .6, a: 1, cekim: 4 });
    return kar;
  }
  _patronEkle() { const k = new Karakter(this.sahne, 'patron', 9.5, -21.5, SAHNE_Y); k.yuz = { x: 0, z: 30 }; this.roller.patron.push(k); return k; }
  _rolBirak(kar) {
    kar.sahip = null; kar.sprite.visible = false;
    const liste = this.roller[kar.tur];
    if ((kar.tur === 'kons' || kar.tur === 'patron' || (kar.tur === 'garson' && liste.indexOf(kar) > 0))) { liste.splice(liste.indexOf(kar), 1); kar.kaldir(); }
  }

  // ---------- efektler ----------
  pecete(x, z, adet = 60) { for (let i = 0; i < adet; i++) this.duman.sac({ x: x + rnd(-.6, .6), y: 2.6, z: z + rnd(-.6, .6), vx: rnd(-3.5, 3.5), vy: rnd(7, 13), vz: rnd(-3.5, 3.5), omur: rnd(2, 3.6), boyut: rnd(.3, .5), r: .95, g: .95, b: .92, a: .95, cekim: 9, surtunme: 1.3 }); }
  peceteHerYer() { for (const y of this.yuvalar) if (y.k) this.pecete(y.mx, y.mz, 14); }
  cicek(x, z) { for (let i = 0; i < 26; i++) { const c = sec([[.95, .15, .3], [1, .45, .7], [.9, .1, .1]]); this.duman.sac({ x, y: 3, z, vx: (rnd(-4, 4) - x) * .55, vy: rnd(7, 11), vz: (-20 - z) * .5 + rnd(-2, 2), omur: 2.2, boyut: .42, r: c[0], g: c[1], b: c[2], a: 1, cekim: 8 }); } }
  para(adet = 320) { for (let i = 0; i < adet; i++) this.duman.sac({ x: rnd(-13, 13), y: rnd(17, 24), z: rnd(-20, 22), vx: rnd(-1.5, 1.5), vy: rnd(-3, 0), vz: rnd(-1, 1), omur: rnd(3.5, 6), boyut: rnd(.36, .5), r: .35, g: .85, b: .42, a: 1, cekim: 2.2, surtunme: .9 }); }
  konfeti() { for (let i = 0; i < 260; i++) { const c = new THREE.Color(sec(NEON)); this.duman.sac({ x: rnd(-12, 12), y: rnd(15, 21), z: rnd(-22, 10), vx: rnd(-3, 3), vy: rnd(-1, 4), vz: rnd(-2, 3), omur: rnd(3, 5), boyut: rnd(.3, .5), r: c.r, g: c.g, b: c.b, a: 1, cekim: 3.2, surtunme: .8 }); } }
  fasilBaslat(sure = 16) { if (this.fasil > 0) return false; this.fasil = sure; this.konfeti(); this.peceteHerYer(); return true; }
  coskuEkle(v) { if (this.fasil <= 0) this.cosku = Math.min(100, this.cosku + v); }

  // ---------- her kare ----------
  guncelle(dt, t, kam) {
    this.t = t; const now = performance.now(), fasil = this.fasil > 0;
    if (fasil) { this.fasil -= dt; if (this.fasil <= 0) { this.cosku = 35; this.olay('fasilBitti', {}); } }
    else { this.cosku = Math.max(8, this.cosku - dt * 1.1); if (this.cosku >= 100) { this.fasilBaslat(); this.olay('fasil', {}); } }
    // pist ışıkları
    this.pistT -= dt;
    if (this.pistT <= 0) {
      this.pistT = fasil ? .16 : .42; const c = new THREE.Color();
      for (let i = 0; i < this.pist.count; i++) { c.set(sec(NEON)).multiplyScalar(Math.random() < (fasil ? .7 : .4) ? rnd(.5, .95) : .08); this.pist.setColorAt(i, c); }
      this.pist.instanceColor.needsUpdate = true;
    }
    const hiz = fasil ? 2.4 : 1;
    this.top.rotation.y += dt * .8 * hiz;
    this.huzmeler.forEach((h, j) => { h.rotation.x = Math.sin(t * .9 * hiz + j * 1.3) * .5; h.rotation.z = Math.cos(t * .7 * hiz + j * 2.1) * .55; h.material.opacity = fasil ? .07 : .035; });
    this.renkli.forEach((p, j) => { p.position.x = Math.sin(t * .6 * hiz + j * 2.1) * 7; p.position.z = -3 + Math.cos(t * .5 * hiz + j * 1.7) * 9; p.color.setHSL((t * .06 * hiz + j / 3) % 1, 1, .55); p.intensity = fasil ? 170 : 90; });

    // misafirler
    for (const y of this.yuvalar) {
      const kar = y.kar; if (!kar) continue;
      const m = y.k ? this.misafir.get(y.k) : null;
      if (m) {
        if (m.dansBitis && m.dansBitis < now) { m.dansBitis = m.sahneBitis = 0; kar.hx = y.x; kar.hz = y.z; kar.yuz = { x: 0, z: -22 }; kar.hiz = 3.4; }
        kar.dans = fasil || m.dansBitis > 0;
        if (!m.dansBitis) { kar.hx = y.x; kar.hz = y.z; }
      } else kar.dans = false;
      kar.guncelle(dt, t, kam);
    }
    // personel
    const DURAK = [[-4.9, 15], [-4.9, 7], [-4.9, -1], [-4.9, -9], [4.9, -9], [4.9, -1], [4.9, 7], [4.9, 15]];
    for (const g of this.roller.garson) {
      if (Math.hypot(g.hx - g.x, g.hz - g.z) < .5) { g.bekle -= dt; if (g.bekle <= 0) { g.durak = (g.durak + 1) % DURAK.length; g.hx = DURAK[g.durak][0]; g.hz = DURAK[g.durak][1]; g.bekle = rnd(1.5, 3.5); g.yuz = { x: Math.sign(g.hx) * MASA_X, z: g.hz }; } }
      g.insan.tepsi = 1; g.guncelle(dt, t, kam);
    }
    for (const k of [...this.roller.kons]) {
      if (k.es) { // bir misafirle pistte oynuyor
        if (k.es.bitis > now) { k.dans = true; k.guncelle(dt, t, kam); continue; }
        k.es = null; k.hiz = 2.4; k.yuz = null;
        if (k.gecici && !k.sahip) { k.cikis = true; k.hx = rnd(-4, 4); k.hz = 38; }
      }
      if (k.cikis) { k.dans = false; k.guncelle(dt, t, kam); if (k.z > 35) { this.roller.kons.splice(this.roller.kons.indexOf(k), 1); k.kaldir(); } continue; }
      if (Math.hypot(k.hx - k.x, k.hz - k.z) < .5) { k.bekle -= dt; if (k.bekle <= 0) { const yan = Math.random() < .5 ? -1 : 1, z = sec(MASA_Z); k.hx = yan * 5.3; k.hz = z + rnd(-1.5, 1.5); k.bekle = rnd(5, 9); k.yuz = { x: yan * MASA_X, z }; } }
      k.dans = fasil; k.guncelle(dt, t, kam);
    }
    for (const sz of this.roller.sazci) { sz.insan.cal = 1; sz.guncelle(dt, t, kam); }
    for (const a of this.roller.assolist) { a.hx = Math.sin(t * .5) * 1.6; a.hiz = 1; a.yuz = { x: 0, z: 30 }; a.insan.mikrofon = 1; a.guncelle(dt, t, kam); }
    for (const p of this.roller.patron) { p.insan.kutla += ((fasil || (p.sacma || 0) > now ? 1 : 0) - p.insan.kutla) * Math.min(1, dt * 6); p.guncelle(dt, t, kam); }
    // süresi dolan roller
    for (const liste of Object.values(this.roller)) for (const kar of [...liste]) if (kar.sahip && kar.sahip.bitis < now) this._rolBirak(kar);
  }
}
