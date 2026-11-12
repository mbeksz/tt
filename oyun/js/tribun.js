// Tribünler: koltuklar, seyirciler (gerçek izleyici + isimsiz dolgu), toplu hareketler ve tribün efektleri
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SAHA, rnd, sec, desenBoya, etiketOlustur, zitRenk } from './ortak.js';

const { HW, HL } = SAHA;
const ARALIK = 1.1, DERINLIK = 1.45, YUKSELIS = 1.05;
const K_SUTUN = 27, K_SIRA = 24; // kuzey tribünü blok ölçüsü
const TEN = [0xf1c9a5, 0xe0ac86, 0xc68e63, 0x9a6844, 0x6f4a31];
const ETIKET_SAYI = 16, ETIKET_GEN = 13.5; // etiket genişliği (saha birimi)

// Her tribün: başlangıç noktası, sıra yönü (a), geriye doğru yön (b), ilk sıra yüksekliği
const BLOKLAR = [
  { takim: 0, kuzey: true,  o: [-1.0, -(HL + 7)], a: [-1, 0], b: [0, -1], sutun: K_SUTUN, sira: K_SIRA, y0: 3.0 },
  { takim: 1, kuzey: true,  o: [1.0, -(HL + 7)],  a: [1, 0],  b: [0, -1], sutun: K_SUTUN, sira: K_SIRA, y0: 3.0 },
  { takim: 0, kuzey: false, o: [-(HW + 7), -(HL + 2)], a: [0, 1], b: [-1, 0], sutun: 57, sira: 16, y0: 2.2 },
  { takim: 1, kuzey: false, o: [HW + 7, -(HL + 2)],    a: [0, 1], b: [1, 0],  sutun: 57, sira: 16, y0: 2.2 },
];

// Başka sahnelerin de (ör. pavyon) aynı isim + yorum balonunu çizebilmesi için
export const balonCiz = (e, ad, metin, altin) => Tribun.prototype._etiketCiz.call(null, e, ad, metin, altin);

export class Tribun {
  constructor(sahne, duman, isilti) {
    this.sahne = sahne; this.duman = duman; this.isilti = isilti;
    this.takimlar = [null, null];
    this.gercek = new Map();           // k -> { k, ad, takim, koltuk, son, jeton }
    this.heyecan = [0, 0]; this.zipla = [0, 0]; this.kutlama = [0, 0]; this.isik = [0, 0];
    this.dalgalar = [];
    this.mesaleler = []; this.bayraklar = [[], []]; this.pankartlar = [null, null];
    this.fisekSira = [];
    this._koltuklariKur();
    this._yapiKur();
    this._isiklariKur();
    this._etiketleriKur();
  }

  _koltuklariKur() {
    const liste = [];
    for (const [bi, b] of BLOKLAR.entries()) for (let r = 0; r < b.sira; r++) for (let c = 0; c < b.sutun; c++) {
      const x = b.o[0] + b.a[0] * c * ARALIK + b.b[0] * r * DERINLIK, z = b.o[1] + b.a[1] * c * ARALIK + b.b[1] * r * DERINLIK;
      // dalga sırası: batı tribünü (güneyden kuzeye) -> kuzey sol -> kuzey sağ -> doğu tribünü (kuzeyden güneye)
      const u = c / (b.sutun - 1);
      const s = bi === 2 ? 0.36 * (1 - u) : bi === 0 ? 0.36 + 0.14 * (1 - u) : bi === 1 ? 0.5 + 0.14 * u : 0.64 + 0.36 * u;
      liste.push({ x, y: b.y0 + r * YUKSELIS, z, takim: b.takim, s, oncelik: (b.kuzey ? 0 : 200) + r * 2 + c * (b.kuzey ? 2.2 : .5) + Math.random() * 30 });
    }
    const n = this.n = liste.length;
    this.bx = new Float32Array(n); this.by = new Float32Array(n); this.bz = new Float32Array(n);
    this.kTakim = new Uint8Array(n); this.kS = new Float32Array(n); this.kFaz = new Float32Array(n);
    this.durum = new Uint8Array(n); // 0 boş, 1 dolgu, 2 gerçek izleyici
    liste.forEach((k, i) => { this.bx[i] = k.x; this.by[i] = k.y; this.bz[i] = k.z; this.kTakim[i] = k.takim; this.kS[i] = k.s; this.kFaz[i] = Math.random() * 6.283; });
    this.oncelik = [0, 1].map(t => liste.map((k, i) => i).filter(i => liste[i].takim === t).sort((a, b) => liste[a].oncelik - liste[b].oncelik));
    this.kapasite = this.oncelik.map(o => o.length);

    const gm = new THREE.MeshLambertMaterial(), km = new THREE.MeshLambertMaterial();
    this.govde = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.43, .62, 3, 9), gm, n);
    this.kafa = new THREE.InstancedMesh(new THREE.SphereGeometry(.38, 8, 6), km, n);
    const kolGeo = mergeGeometries([-1, 1].map(s => new THREE.BoxGeometry(.14, .85, .14).translate(0, .42, 0).rotateZ(-s * .32).translate(s * .4, .42, 0)));
    this.kol = new THREE.InstancedMesh(kolGeo, new THREE.MeshLambertMaterial(), n);
    for (const m of [this.govde, this.kafa, this.kol]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceMatrix.array.fill(0); m.frustumCulled = false; this.sahne.add(m); }
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) { this.govde.setColorAt(i, c.set(0x444444)); this.kol.setColorAt(i, c.set(0x444444)); this.kafa.setColorAt(i, c.set(sec(TEN))); }
  }

  _yapiKur() {
    const beton = new THREE.MeshStandardMaterial({ color: 0x1a2136, roughness: .95 });
    const duvar = new THREE.MeshStandardMaterial({ color: 0x0d1322, roughness: .9 });
    for (const b of BLOKLAR) {
      const uz = (b.sutun - 1) * ARALIK + 2, der = b.sira * DERINLIK, yuk = b.sira * YUKSELIS;
      const egim = Math.atan2(yuk, der), hip = Math.hypot(der, yuk);
      const ax = b.o[0] + b.a[0] * (b.sutun - 1) * ARALIK / 2, az = b.o[1] + b.a[1] * (b.sutun - 1) * ARALIK / 2;
      const levha = new THREE.Mesh(new THREE.BoxGeometry(uz, .5, hip), beton);
      // levhanın yereli: x = sıra yönü, z = geriye doğru
      const yonA = new THREE.Vector3(b.a[0], 0, b.a[1]), yonB = new THREE.Vector3(b.b[0], 0, b.b[1]);
      const taban = new THREE.Matrix4().makeBasis(yonA, new THREE.Vector3(0, 1, 0), new THREE.Vector3().crossVectors(yonA, new THREE.Vector3(0, 1, 0)));
      const grup = new THREE.Group(); grup.setRotationFromMatrix(taban);
      const isaret = new THREE.Vector3(0, 0, 1).applyQuaternion(grup.quaternion).dot(yonB) > 0 ? 1 : -1; // yerel +z geriye mi bakıyor
      levha.rotation.x = -isaret * egim; levha.position.set(0, b.y0 + yuk / 2 - .75, isaret * (der / 2 - .3));
      const on = new THREE.Mesh(new THREE.BoxGeometry(uz, b.y0 + .3, .5), duvar); on.position.set(0, (b.y0 + .3) / 2 - .4, -isaret * 1.0);
      const arka = new THREE.Mesh(new THREE.BoxGeometry(uz, yuk + b.y0 + 5, .6), duvar); arka.position.set(0, (yuk + b.y0 + 5) / 2, isaret * (der + .4));
      const serit = new THREE.Mesh(new THREE.BoxGeometry(uz, .5, .9), this._seritMat ||= (() => { const m = new THREE.MeshBasicMaterial({ color: 0xcfe0ff }); m.color.multiplyScalar(1.15); return m; })());
      serit.position.set(0, yuk + b.y0 + 5.2, isaret * (der + .4));
      serit.visible = false;
      grup.add(levha, on, arka, serit); grup.position.set(ax, 0, az); this.sahne.add(grup);
    }
    // köşe dolguları ve arkadaki karanlık çanak
    const canak = new THREE.Mesh(new THREE.CylinderGeometry(118, 118, 46, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0x070b18, side: THREE.BackSide }));
    canak.position.y = 23; this.sahne.add(canak);
  }

  _isiklariKur() {
    // telefon ışıkları: her koltukta bir nokta; açık olan takımın dolu koltukları parlar
    const n = this.n, pos = new Float32Array(n * 3), veri = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = this.bx[i]; pos[i * 3 + 1] = this.by[i] + 2.3; pos[i * 3 + 2] = this.bz[i]; veri[i * 3] = 0; veri[i * 3 + 1] = this.kTakim[i]; veri[i * 3 + 2] = this.kFaz[i]; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('veri', new THREE.BufferAttribute(veri, 3));
    this.isikVeri = g.attributes.veri;
    this.isikMat = new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uA: { value: 0 }, uB: { value: 0 } },
      vertexShader: `attribute vec3 veri; uniform float uT, uA, uB; varying float vA;
        void main(){ float g = mix(uA, uB, veri.y); vA = veri.x * g * (0.55 + 0.45 * sin(uT * 3.0 + veri.z * 5.0));
          vec4 mv = modelViewMatrix * vec4(position + vec3(sin(uT * 2.0 + veri.z) * 0.35, 0.0, 0.0), 1.0);
          gl_PointSize = 700.0 / max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, 0.97, 0.85) * 2.2, a * a * vA); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const p = new THREE.Points(g, this.isikMat); p.frustumCulled = false; p.renderOrder = 7; this.sahne.add(p);
  }

  _etiketleriKur() {
    this.etiketler = [];
    for (let i = 0; i < ETIKET_SAYI; i++) {
      const tv = document.createElement('canvas'); tv.width = 640; tv.height = 220;
      const doku = new THREE.CanvasTexture(tv); doku.colorSpace = THREE.SRGBColorSpace; doku.anisotropy = 4;
      const e = { tv, doku };
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: e.doku, transparent: true, depthTest: false, depthWrite: false }));
      s.center.set(.5, 0); s.scale.set(ETIKET_GEN, ETIKET_GEN * 220 / 640, 1); s.visible = false; s.renderOrder = 20; this.sahne.add(s);
      this.etiketler.push({ ...e, sprite: s, k: null, bitis: 0 });
    }
  }

  // ---------- takım renkleri ----------
  takimlariAyarla(a, b) {
    this.takimlar = [a, b];
    this.bayrakDoku = [a, b].map(t => {
      const tv = document.createElement('canvas'); tv.width = 128; tv.height = 80; desenBoya(tv.getContext('2d'), 128, 80, t);
      const d = new THREE.CanvasTexture(tv); d.colorSpace = THREE.SRGBColorSpace; return d;
    });
    for (let i = 0; i < this.n; i++) if (this.durum[i]) this._renkVer(i);
    this.govde.instanceColor.needsUpdate = true;
    for (const liste of this.bayraklar) for (const by of liste) by.mesh.material.map = this.bayrakDoku[by.takim];
  }
  _renkVer(i) {
    const t = this.takimlar[this.kTakim[i]]; if (!t) return;
    const c = new THREE.Color(Math.random() < 0.68 ? t.renk1 : t.renk2);
    c.multiplyScalar(rnd(.78, 1.05));
    this.govde.setColorAt(i, c); this.kol.setColorAt(i, c); this.govde.instanceColor.needsUpdate = this.kol.instanceColor.needsUpdate = true;
  }
  _koltukAc(i, durum) {
    const once = this.durum[i]; this.durum[i] = durum;
    const g = this.govde.instanceMatrix.array, k = this.kafa.instanceMatrix.array, o = i * 16, s = durum ? 1 : 0;
    g[o] = g[o + 5] = g[o + 10] = s; g[o + 15] = 1; g[o + 12] = this.bx[i]; g[o + 13] = this.by[i] + .72; g[o + 14] = this.bz[i];
    k[o] = k[o + 5] = k[o + 10] = s; k[o + 15] = 1; k[o + 12] = this.bx[i]; k[o + 13] = this.by[i] + 1.78; k[o + 14] = this.bz[i];
    if (!s) { const ka = this.kol.instanceMatrix.array; ka[o] = ka[o + 5] = ka[o + 10] = 0; }
    this.isikVeri.array[i * 3] = s; this.isikVeri.needsUpdate = true;
    if (durum && !once) this._renkVer(i);
  }

  // ---------- izleyiciler ----------
  sayi(takim) { let n = 0; for (const f of this.gercek.values()) if (f.takim === takim) n++; return n; }
  azOlanTakim() { const a = this.sayi(0), b = this.sayi(1); return a === b ? (Math.random() < .5 ? 0 : 1) : a < b ? 0 : 1; }
  // İzleyiciyi tribüne oturtur (varsa yerini korur). takim verilmezse az kalabalık tarafa gider.
  otur(k, ad, takim) {
    let f = this.gercek.get(k);
    if (f) { f.ad = ad; f.son = performance.now(); if (takim == null || takim === f.takim) return f; this._koltukAc(f.koltuk, 0); f.koltuk = -1; }
    else { f = { k, ad, takim: 0, koltuk: -1, son: performance.now(), jeton: 0 }; this.gercek.set(k, f); }
    f.takim = takim ?? this.azOlanTakim();
    const bos = this.oncelik[f.takim].find(i => this.durum[i] !== 2);
    if (bos === undefined) { f.koltuk = -1; return f; } // tribün dolu: sayılır ama koltuğu yok
    f.koltuk = bos; this._koltukAc(bos, 0); this._koltukAc(bos, 2);
    return f;
  }
  cikar(k) {
    const f = this.gercek.get(k); if (!f) return;
    if (f.koltuk >= 0) this._koltukAc(f.koltuk, 0);
    this.gercek.delete(k);
  }
  // Uzun süredir hiçbir şey yapmayanlar yerini boşaltır
  pasifleriCikar(sureMs) { const t = performance.now(); for (const f of [...this.gercek.values()]) if (t - f.son > sureMs) this.cikar(f.k); }
  // İsimsiz dolgu seyirci: tribünün yüzde kaçı dolu görünsün (gerçek izleyiciler dahil)
  dolguAyarla(yuzde) {
    for (const t of [0, 1]) {
      const hedef = Math.round(this.kapasite[t] * yuzde / 100), bos = [], dolgu = [];
      let dolu = 0;
      for (const i of this.oncelik[t]) { if (this.durum[i]) dolu++; if (this.durum[i] === 0) bos.push(i); else if (this.durum[i] === 1) dolgu.push(i); }
      while (dolu < hedef && bos.length) { const j = (Math.random() * bos.length) | 0; this._koltukAc(bos[j], 1); bos[j] = bos[bos.length - 1]; bos.pop(); dolu++; }
      while (dolu > hedef && dolgu.length) { const j = (Math.random() * dolgu.length) | 0; this._koltukAc(dolgu[j], 0); dolgu[j] = dolgu[dolgu.length - 1]; dolgu.pop(); dolu--; }
    }
    this.govde.instanceMatrix.needsUpdate = this.kafa.instanceMatrix.needsUpdate = true;
  }
  koltukYeri(k, hedef = new THREE.Vector3()) {
    const f = this.gercek.get(k); if (!f || f.koltuk < 0) return null;
    return hedef.set(this.bx[f.koltuk], this.by[f.koltuk], this.bz[f.koltuk]);
  }
  _rastgeleKoltuk(takim, kuzey = true) {
    const o = this.oncelik[takim], sinir = kuzey ? K_SUTUN * K_SIRA : o.length;
    for (let d = 0; d < 30; d++) { const i = o[(Math.random() * sinir) | 0]; if (this.durum[i]) return i; }
    return o[(Math.random() * sinir) | 0];
  }

  // ---------- toplu hareketler ----------
  dalga() { if (this.dalgalar.length < 3) this.dalgalar.push({ p: -0.08 }); }
  ziplat(takim, sure = 7) { this.zipla[takim] = Math.max(this.zipla[takim], sure); }
  isikAc(takim, sure = 14) { this.isik[takim] = Math.max(this.isik[takim], sure); }
  kutla(takim, sure = 6) { this.kutlama[takim] = Math.max(this.kutlama[takim], sure); }

  // ---------- etiket (isim + varsa yorum balonu) ----------
  _etiketCiz(e, ad, metin, altin) {
    const g = e.tv.getContext('2d'), W = 640, H = 220, F = 'system-ui, "Segoe UI", Roboto, Arial, sans-serif';
    g.clearRect(0, 0, W, H); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const adYazi = (altin ? '★ ' : '') + ad;
    if (metin) {
      // üstte yorum balonu, altta isim
      g.font = `800 50px ${F}`; let m = metin; while (g.measureText(m).width > W - 70 && m.length > 4) m = m.slice(0, -2); if (m !== metin) m = m.trimEnd() + '…';
      const bw = Math.min(W - 8, g.measureText(m).width + 60), bx = (W - bw) / 2;
      // koyu balon: parlak beyaz zemin ışık parlamasında okunmaz hale geliyor
      g.fillStyle = 'rgba(16,22,44,.94)'; g.beginPath(); g.roundRect(bx, 6, bw, 104, 34); g.fill();
      g.strokeStyle = 'rgba(150,170,230,.85)'; g.lineWidth = 5; g.stroke();
      g.fillStyle = 'rgba(16,22,44,.94)'; g.beginPath(); g.moveTo(W / 2 - 20, 108); g.lineTo(W / 2, 134); g.lineTo(W / 2 + 20, 108); g.fill();
      g.fillStyle = '#d9dde8'; g.fillText(m, W / 2, 60);
      g.font = `900 46px ${F}`; const aw = Math.min(W - 8, g.measureText(adYazi).width + 44);
      g.fillStyle = altin ? 'rgba(226,176,40,.97)' : 'rgba(8,12,24,.85)'; g.beginPath(); g.roundRect((W - aw) / 2, 140, aw, 72, 28); g.fill();
      g.fillStyle = altin ? '#1a1200' : '#e0b534'; g.fillText(adYazi, W / 2, 178, W - 40);
    } else {
      g.font = `900 64px ${F}`; const aw = Math.min(W - 8, g.measureText(adYazi).width + 56);
      g.fillStyle = altin ? 'rgba(226,176,40,.97)' : 'rgba(8,12,24,.85)'; g.beginPath(); g.roundRect((W - aw) / 2, 118, aw, 96, 34); g.fill();
      if (altin) { g.strokeStyle = '#c9a23a'; g.lineWidth = 6; g.stroke(); }
      g.fillStyle = altin ? '#1a1200' : '#d9dde8'; g.fillText(adYazi, W / 2, 168, W - 40);
    }
    e.doku.needsUpdate = true;
  }
  etiketGoster(k, { altin = false, sure = 9, metin = '' } = {}) {
    const f = this.gercek.get(k); if (!f || f.koltuk < 0) return;
    const t = performance.now();
    let e = this.etiketler.find(x => x.k === k);
    if (!e) e = this.etiketler.reduce((a, b) => (a.bitis <= b.bitis ? a : b));
    if (e.k !== k && e.altin && e.bitis > t && !altin) { // hediye etiketlerini sıradan etiket ezmesin
      e = this.etiketler.filter(x => !(x.altin && x.bitis > t)).reduce((a, b) => (!a || b.bitis < a.bitis ? b : a), null);
      if (!e) return;
    }
    const eskiAltin = e.k === k && e.altin && e.bitis > t;
    if (!metin && e.k === k && e.metin && e.metinBitis > t) metin = e.metin; // balon süresi dolmadan silinmesin
    const yeni = e.k !== k || e.altin !== (altin || eskiAltin) || e.ad !== f.ad || (e.metin || '') !== metin;
    if (metin) { e.metin = metin; e.metinBitis = t + 7000; } else e.metin = '';
    e.k = k; e.ad = f.ad; e.altin = altin || (e.altin && e.bitis > t && e.k === k); e.bitis = Math.max(e.bitis, t + sure * 1000);
    if (yeni) this._etiketCiz(e, f.ad, metin, e.altin);
    e.sprite.visible = true;
  }

  // ---------- efektler ----------
  mesale(k, takim, sure = 22) {
    let yer = k ? this.koltukYeri(k) : null;
    if (!yer) { const i = this._rastgeleKoltuk(takim); yer = new THREE.Vector3(this.bx[i], this.by[i], this.bz[i]); }
    if (this.mesaleler.length > 45) this.mesaleler.shift();
    this.mesaleler.push({ x: yer.x, y: yer.y + 2.7, z: yer.z, takim, bitis: performance.now() + sure * 1000 });
  }
  dumanBulutu(takim, adet = 5) { for (let i = 0; i < adet; i++) this.mesale(null, takim, rnd(10, 16)); }
  bayrak(takim, sure = 35) {
    const liste = this.bayraklar[takim], t = performance.now();
    let b = liste.find(x => x.bitis < t);
    if (!b) {
      if (liste.length >= 7) { b = liste.reduce((a, c) => (a.bitis < c.bitis ? a : c)); }
      else {
        const geo = new THREE.PlaneGeometry(5.4, 3.4, 14, 6); geo.translate(2.7, 0, 0);
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.bayrakDoku[takim], side: THREE.DoubleSide }));
        const direk = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 7.5, 5), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
        direk.position.set(0, -1.6, 0); mesh.add(direk);
        b = { mesh, takim, taban: geo.attributes.position.array.slice(), faz: Math.random() * 6 }; liste.push(b); this.sahne.add(mesh);
      }
    }
    const i = this._rastgeleKoltuk(takim);
    b.mesh.position.set(this.bx[i], this.by[i] + 5.5, this.bz[i]); b.mesh.visible = true; b.bitis = t + sure * 1000;
  }
  pankart(takim, ad, sure = 50) {
    let p = this.pankartlar[takim];
    if (!p) {
      const tv = document.createElement('canvas'); tv.width = 1024; tv.height = 112;
      const doku = new THREE.CanvasTexture(tv); doku.colorSpace = THREE.SRGBColorSpace; doku.anisotropy = 8;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(25, 2.74), new THREE.MeshBasicMaterial({ map: doku }));
      mesh.position.set((takim ? 1 : -1) * 14.6, 1.55, -(HL + 5.65)); this.sahne.add(mesh);
      p = this.pankartlar[takim] = { tv, doku, mesh };
    }
    const tk = this.takimlar[takim], g = p.tv.getContext('2d');
    g.fillStyle = tk.renk1; g.fillRect(0, 0, 1024, 112); g.fillStyle = tk.renk2; g.fillRect(0, 0, 1024, 12); g.fillRect(0, 100, 1024, 12);
    g.font = '900 64px system-ui, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const yazi = `★ ${ad.toLocaleUpperCase('tr')} ★`;
    g.lineWidth = 8; g.strokeStyle = zitRenk(tk.renk1) === '#ffffff' ? '#000' : '#fff'; g.strokeText(yazi, 512, 58, 980);
    g.fillStyle = zitRenk(tk.renk1); g.fillText(yazi, 512, 58, 980);
    p.doku.needsUpdate = true; p.mesh.visible = true; p.bitis = performance.now() + sure * 1000;
  }
  havaiFisek(adet = 8) { const t = performance.now(); for (let i = 0; i < adet; i++) this.fisekSira.push(t + i * rnd(280, 520)); }
  _patlat() {
    const x = rnd(-34, 34), y = rnd(42, 62), z = rnd(-HL - 50, -HL - 22);
    const c = new THREE.Color().setHSL(Math.random(), 1, .6);
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * 6.283, b = Math.acos(rnd(-1, 1)), h = rnd(9, 17);
      this.isilti.sac({ x, y, z, vx: Math.sin(b) * Math.cos(a) * h, vy: Math.cos(b) * h, vz: Math.sin(b) * Math.sin(a) * h,
        omur: rnd(1.1, 1.9), boyut: rnd(1.2, 2.0), r: c.r * 2.5, g: c.g * 2.5, b: c.b * 2.5, a: 1, cekim: 5, surtunme: 1.2 });
    }
  }
  konfeti(takim) {
    const tk = this.takimlar[takim]; if (!tk) return;
    const c1 = new THREE.Color(tk.renk1), c2 = new THREE.Color(tk.renk2);
    for (let i = 0; i < 260; i++) {
      const c = Math.random() < .5 ? c1 : c2;
      this.duman.sac({ x: (takim ? 1 : -1) * rnd(2, 30), y: rnd(26, 40), z: -(HL + rnd(8, 36)), vx: rnd(-3, 3), vy: rnd(-2, 3), vz: rnd(0, 5),
        omur: rnd(3, 5.5), boyut: rnd(.5, .9), r: c.r, g: c.g, b: c.b, a: 1, cekim: 3.2, surtunme: .8 });
    }
  }

  // ---------- her kare ----------
  guncelle(dt, t, kamera) {
    const now = performance.now();
    for (const ti of [0, 1]) {
      this.zipla[ti] = Math.max(0, this.zipla[ti] - dt); this.kutlama[ti] = Math.max(0, this.kutlama[ti] - dt); this.isik[ti] = Math.max(0, this.isik[ti] - dt);
    }
    for (const d of this.dalgalar) d.p += dt / 4.2;
    this.dalgalar = this.dalgalar.filter(d => d.p < 1.1);

    const g = this.govde.instanceMatrix.array, k = this.kafa.instanceMatrix.array, ka = this.kol.instanceMatrix.array, n = this.n;
    const zs = Math.abs(Math.sin(t * 6.5)) * 0.8;
    for (let i = 0; i < n; i++) {
      if (!this.durum[i]) continue;
      const ti = this.kTakim[i], f = this.kFaz[i];
      let dy = 0.04 * Math.sin(t * 2 + f) + this.heyecan[ti] * 0.3 * Math.abs(Math.sin(t * 5 + f));
      if (this.zipla[ti] > 0) dy += zs * Math.min(1, this.zipla[ti]);
      if (this.kutlama[ti] > 0) dy += 0.95 * Math.abs(Math.sin(t * 7 + f * .6)) * Math.min(1, this.kutlama[ti]);
      for (const d of this.dalgalar) { const u = (this.kS[i] - d.p) / 0.055; if (u > -1 && u < 1) { const c = Math.cos(u * 1.5708); dy += 1.5 * c * c; } }
      const o = i * 16 + 13, x = this.bx[i] + Math.sin(t * 1.4 + f) * .06, kolAc = dy > .14 ? Math.min(1, dy * 1.5) : 0;
      g[o] = this.by[i] + .72 + dy; k[o] = this.by[i] + 1.78 + dy; g[o - 1] = k[o - 1] = x;
      ka[o - 13] = ka[o - 3] = kolAc ? 1 : 0; ka[o - 8] = kolAc; ka[o - 1] = x; ka[o] = this.by[i] + .72 + dy; ka[o + 1] = this.bz[i]; ka[o + 2] = 1;
    }
    this.govde.instanceMatrix.needsUpdate = this.kafa.instanceMatrix.needsUpdate = this.kol.instanceMatrix.needsUpdate = true;

    const u = this.isikMat.uniforms; u.uT.value = t;
    u.uA.value += (Math.min(1, this.isik[0]) - u.uA.value) * Math.min(1, dt * 3);
    u.uB.value += (Math.min(1, this.isik[1]) - u.uB.value) * Math.min(1, dt * 3);

    // meşaleler: parlak çekirdek + kıvılcım + takım renginde duman
    this.mesaleler = this.mesaleler.filter(m => m.bitis > now);
    for (const m of this.mesaleler) {
      const tk = this.takimlar[m.takim]; const c = this._dumanRenk?.[m.takim] || new THREE.Color(tk?.renk1 || '#ff4422');
      this.isilti.sac({ x: m.x, y: m.y, z: m.z, omur: .09, boyut: rnd(3.4, 4.6), r: 3.4, g: .8, b: .4, a: 1 });
      if (Math.random() < .5) this.isilti.sac({ x: m.x, y: m.y, z: m.z, vx: rnd(-2, 2), vy: rnd(2, 6), vz: rnd(-2, 2), omur: rnd(.3, .7), boyut: .35, r: 3, g: 1.6, b: .5, a: 1, cekim: 6 });
      if (Math.random() < .28) this.duman.sac({ x: m.x, y: m.y + .5, z: m.z, vx: rnd(-.6, .6), vy: rnd(1.5, 3), vz: rnd(-.3, .6), omur: rnd(3.5, 6), boyut: 1.6, buyume: 7,
        r: .55 + c.r * .45, g: .5 + c.g * .4, b: .5 + c.b * .4, a: .16, surtunme: .25 });
    }
    // bayraklar
    for (const liste of this.bayraklar) for (const b of liste) {
      if (b.bitis < now) { b.mesh.visible = false; continue; }
      const p = b.mesh.geometry.attributes.position, a = p.array, tb = b.taban;
      for (let i = 0; i < a.length; i += 3) { const x = tb[i]; a[i + 2] = Math.sin(x * 1.1 - t * 7 + b.faz) * .1 * x; a[i + 1] = tb[i + 1] + Math.sin(x * .8 - t * 5 + b.faz) * .04 * x; }
      p.needsUpdate = true; b.mesh.rotation.z = Math.sin(t * 2.2 + b.faz) * .25;
    }
    for (const p of this.pankartlar) if (p && p.bitis < now) p.mesh.visible = false;
    while (this.fisekSira.length && this.fisekSira[0] <= now) { this.fisekSira.shift(); this._patlat(); }
    // etiketler
    for (const e of this.etiketler) {
      if (!e.sprite.visible) continue;
      const f = this.gercek.get(e.k), kalan = e.bitis - now;
      if (!f || f.koltuk < 0 || kalan <= 0) { e.sprite.visible = false; e.k = null; e.altin = false; e.bitis = 0; continue; }
      if (e.metin && e.metinBitis < now) { e.metin = ''; this._etiketCiz(e, f.ad, '', e.altin); } // balon kapanır, isim kalır
      e.sprite.position.set(this.bx[f.koltuk], this.by[f.koltuk] + 2.5, this.bz[f.koltuk]);
      const olcek = kamera ? Math.min(1, kamera.position.distanceTo(e.sprite.position) / 80) : 1; // yakın çekimde dev görünmesin
      e.sprite.scale.set(ETIKET_GEN * olcek, ETIKET_GEN * 220 / 640 * olcek, 1);
      e.sprite.material.opacity = Math.min(1, kalan / 700);
    }
  }
}
