// Gece stadyumu: saha, kaleler, reklam panoları, projektörler, gökyüzü, ışıklar
import * as THREE from 'three';
import { SAHA } from './ortak.js';

const { W, L, HW, HL, KALE_G, KALE_Y, PENALTI } = SAHA;

function sahaDokusu() {
  const K = 20, pay = 5, gen = (W + pay * 2) * K, yuk = (L + pay * 2) * K;
  const t = document.createElement('canvas'); t.width = gen; t.height = yuk;
  const g = t.getContext('2d');
  const X = x => (x + HW + pay) * K, Z = z => (z + HL + pay) * K;
  g.fillStyle = '#14602a'; g.fillRect(0, 0, gen, yuk);
  const serit = L / 12;
  for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#1f8a3b' : '#1a7a34'; g.fillRect(X(-HW), Z(-HL + i * serit), W * K, serit * K + 1); }
  // hafif doku
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},${Math.random() * .035})`; g.fillRect(Math.random() * gen, Math.random() * yuk, 3, 3); }
  g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = 5; g.lineJoin = 'round';
  g.strokeRect(X(-HW), Z(-HL), W * K, L * K);
  g.beginPath(); g.moveTo(X(-HW), Z(0)); g.lineTo(X(HW), Z(0)); g.stroke();
  g.beginPath(); g.arc(X(0), Z(0), 6 * K, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(X(0), Z(0), 7, 0, Math.PI * 2); g.fill();
  for (const y of [-1, 1]) {
    const cizgi = y * HL, ic = -y;
    g.strokeRect(X(-13), Z(Math.min(cizgi, cizgi + ic * 11)), 26 * K, 11 * K);       // ceza sahası
    g.strokeRect(X(-6), Z(Math.min(cizgi, cizgi + ic * 4)), 12 * K, 4 * K);          // altıpas
    g.beginPath(); g.arc(X(0), Z(cizgi + ic * PENALTI), 7, 0, Math.PI * 2); g.fill();  // penaltı noktası
    g.beginPath(); const a0 = y < 0 ? 0.25 * Math.PI : 1.25 * Math.PI;
    g.arc(X(0), Z(cizgi + ic * PENALTI), 5.2 * K, a0, a0 + 0.5 * Math.PI); g.stroke(); // yay
  }
  const d = new THREE.CanvasTexture(t); d.colorSpace = THREE.SRGBColorSpace; d.anisotropy = 8;
  return { doku: d, gen: W + pay * 2, yuk: L + pay * 2 };
}

function kale(sahne, z, yon) {
  const beyaz = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .4, emissive: 0x333333 });
  const r = 0.16, grup = new THREE.Group();
  for (const x of [-KALE_G / 2, KALE_G / 2]) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, KALE_Y, 10), beyaz); d.position.set(x, KALE_Y / 2, 0); d.castShadow = true; grup.add(d);
  }
  const ust = new THREE.Mesh(new THREE.CylinderGeometry(r, r, KALE_G + r * 2, 10), beyaz); ust.rotation.z = Math.PI / 2; ust.position.set(0, KALE_Y, 0); grup.add(ust);
  // ağ
  const t = document.createElement('canvas'); t.width = t.height = 64; const g = t.getContext('2d');
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.strokeRect(0, 0, 64, 64);
  const ag = new THREE.CanvasTexture(t); ag.wrapS = ag.wrapT = THREE.RepeatWrapping; ag.colorSpace = THREE.SRGBColorSpace;
  const agMat = tekrar => { const d = ag.clone(); d.repeat.set(...tekrar); d.needsUpdate = true; return new THREE.MeshBasicMaterial({ map: d, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false }); };
  const D = 2.6;
  const arka = new THREE.Mesh(new THREE.PlaneGeometry(KALE_G, KALE_Y), agMat([20, 7])); arka.position.set(0, KALE_Y / 2, -D); grup.add(arka);
  const tavan = new THREE.Mesh(new THREE.PlaneGeometry(KALE_G, D), agMat([20, 5])); tavan.rotation.x = Math.PI / 2; tavan.position.set(0, KALE_Y, -D / 2); grup.add(tavan);
  for (const x of [-KALE_G / 2, KALE_G / 2]) { const y = new THREE.Mesh(new THREE.PlaneGeometry(D, KALE_Y), agMat([5, 7])); y.rotation.y = Math.PI / 2; y.position.set(x, KALE_Y / 2, -D / 2); grup.add(y); }
  grup.position.z = z; if (yon > 0) grup.rotation.y = Math.PI; // ağ sahanın dışına baksın
  sahne.add(grup);
}

function panoDokusu(metin) {
  const t = document.createElement('canvas'); t.width = 2048; t.height = 64; const g = t.getContext('2d');
  g.fillStyle = '#060a1c'; g.fillRect(0, 0, 2048, 64);
  g.font = '800 40px system-ui, Arial, sans-serif'; g.textBaseline = 'middle';
  const renkler = ['#ffd23f', '#ffffff', '#5ee1ff', '#ff6b6b'];
  let x = 20, i = 0;
  while (x < 2048) { const p = metin[i % metin.length]; g.fillStyle = renkler[i % renkler.length]; g.fillText(p, x, 34); x += g.measureText(p).width + 70; i++; }
  const d = new THREE.CanvasTexture(t); d.wrapS = THREE.RepeatWrapping; d.colorSpace = THREE.SRGBColorSpace; d.anisotropy = 8;
  return d;
}

export function stadyumKur(sahne) {
  // gökyüzü
  const gt = document.createElement('canvas'); gt.width = 4; gt.height = 256; const gg = gt.getContext('2d');
  const gr = gg.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#03040c'); gr.addColorStop(.55, '#0a1230'); gr.addColorStop(1, '#1b2550');
  gg.fillStyle = gr; gg.fillRect(0, 0, 4, 256);
  const gok = new THREE.CanvasTexture(gt); gok.colorSpace = THREE.SRGBColorSpace; sahne.background = gok;
  sahne.fog = new THREE.FogExp2(0x0a1128, 0.0014);
  const yp = new Float32Array(900);
  for (let i = 0; i < 300; i++) { const a = Math.random() * Math.PI * 2, r = 260 + Math.random() * 60; yp[i * 3] = Math.cos(a) * r; yp[i * 3 + 1] = 60 + Math.random() * 200; yp[i * 3 + 2] = Math.sin(a) * r; }
  const yg = new THREE.BufferGeometry(); yg.setAttribute('position', new THREE.BufferAttribute(yp, 3));
  sahne.add(new THREE.Points(yg, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: true, fog: false })));

  // saha
  const s = sahaDokusu();
  const zemin = new THREE.Mesh(new THREE.PlaneGeometry(s.gen, s.yuk), new THREE.MeshStandardMaterial({ map: s.doku, roughness: .95 }));
  zemin.rotation.x = -Math.PI / 2; zemin.receiveShadow = true; sahne.add(zemin);
  const cevre = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x0c1220, roughness: 1 }));
  cevre.rotation.x = -Math.PI / 2; cevre.position.y = -0.05; sahne.add(cevre);

  kale(sahne, -HL, -1); kale(sahne, HL, 1);

  // reklam panoları (kenar çizgileri boyunca), yazı kayar
  const pano = panoDokusu(['TAKIMINI YAZ', 'DALGA', 'ZIPLA', 'IŞIK', 'TRİBÜNÜNÜ COŞTUR', 'BENİ GÖSTER']);
  pano.repeat.set(1.2, 1);
  const pm = new THREE.MeshBasicMaterial({ map: pano });
  for (const x of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(L + 4, 1.5), pm);
    p.rotation.y = -x * Math.PI / 2; p.position.set(x * (HW + 3.4), 0.75, 0); sahne.add(p);
    const a = new THREE.Mesh(new THREE.BoxGeometry(.3, 1.5, L + 4), new THREE.MeshStandardMaterial({ color: 0x0a0d18 })); a.position.set(x * (HW + 3.6), .75, 0); sahne.add(a);
  }

  // projektör kuleleri + ışık hüzmeleri
  const lamba = new THREE.MeshBasicMaterial({ color: 0xffffff }); lamba.color.multiplyScalar(3.2);
  const direk = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: .7 });
  const pt = document.createElement('canvas'); pt.width = pt.height = 128; const pg = pt.getContext('2d');
  const prg = pg.createRadialGradient(64, 64, 0, 64, 64, 64); prg.addColorStop(0, 'rgba(255,255,255,1)'); prg.addColorStop(.18, 'rgba(210,225,255,.55)'); prg.addColorStop(1, 'rgba(160,190,255,0)');
  pg.fillStyle = prg; pg.fillRect(0, 0, 128, 128);
  const parlamaMat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(pt), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .55, fog: false });
  const huzme = new THREE.MeshBasicMaterial({ color: 0x9fc0ff, transparent: true, opacity: .05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  for (const [x, z] of [[-52, -66], [52, -66], [-56, 44], [56, 44]]) {
    const yuk = 52;
    const d = new THREE.Mesh(new THREE.CylinderGeometry(.7, 1.1, yuk, 8), direk); d.position.set(x, yuk / 2, z); sahne.add(d);
    const p = new THREE.Mesh(new THREE.BoxGeometry(11, 6, .6), lamba); p.position.set(x, yuk + 2, z); p.lookAt(0, 0, 0); sahne.add(p);
    const kg = new THREE.ConeGeometry(9, 30, 32, 1, true); kg.translate(0, -15, 0);
    const k = new THREE.Mesh(kg, huzme); k.position.set(x, yuk + 2, z);
    k.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(-x, -(yuk + 2), -z * .8).normalize());
    k.renderOrder = 4; sahne.add(k);
    const pr = new THREE.Sprite(parlamaMat); pr.position.set(x, yuk + 2, z); pr.scale.setScalar(46); pr.renderOrder = 3; sahne.add(pr);
  }

  // çatılar ve ön kenarlarındaki lamba sıraları
  const catiMat = new THREE.MeshStandardMaterial({ color: 0x0b0f1c, roughness: .8, side: THREE.DoubleSide });
  const lambaMat = new THREE.MeshBasicMaterial({ color: 0xfff4d6 }); lambaMat.color.multiplyScalar(2.6);
  const cati = (gen, der, x, y, z, donY) => {
    const g = new THREE.Group();
    const c = new THREE.Mesh(new THREE.BoxGeometry(gen, .8, der), catiMat); c.position.z = -der / 2; c.rotation.x = .1; g.add(c);
    const kiris = new THREE.Mesh(new THREE.BoxGeometry(gen, 1.6, .8), new THREE.MeshStandardMaterial({ color: 0x1b2238, roughness: .6 })); kiris.position.y = -.4; g.add(kiris);
    for (let i = 0, n = Math.floor(gen / 6); i < n; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(2.2, .5, .5), lambaMat); l.position.set((i + .5) / n * gen - gen / 2, -1.3, .2); g.add(l); }
    g.position.set(x, y, z); g.rotation.y = donY; sahne.add(g);
  };
  cati(74, 30, 0, 36, -(HL + 20), 0);
  cati(72, 22, -(HW + 18), 26, -4, Math.PI / 2);
  cati(72, 22, HW + 18, 26, -4, -Math.PI / 2);

  // ışıklar
  sahne.add(new THREE.HemisphereLight(0xa9b8ff, 0x16301c, 1.15));
  const ana = new THREE.DirectionalLight(0xffffff, 2.1);
  ana.position.set(26, 70, 40); ana.castShadow = true;
  ana.shadow.mapSize.set(2048, 2048);
  Object.assign(ana.shadow.camera, { left: -40, right: 40, top: 46, bottom: -46, near: 10, far: 180 });
  ana.shadow.bias = -0.0004; ana.shadow.normalBias = 0.03;
  sahne.add(ana);
  const karsi = new THREE.DirectionalLight(0xbfd0ff, 1.25); karsi.position.set(-28, 62, -36);
  karsi.shadow.mapSize.set(1024, 1024); Object.assign(karsi.shadow.camera, { left: -40, right: 40, top: 46, bottom: -46, near: 10, far: 180 });
  karsi.shadow.bias = -0.0004; karsi.shadow.normalBias = 0.03; sahne.add(karsi);

  return { ana, karsi, guncelle(dt) { pano.offset.x = (pano.offset.x + dt * 0.02) % 1; } };
}
