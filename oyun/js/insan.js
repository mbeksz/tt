// İskeletli insan modeli: gerçek koşu / yürüme / bekleme animasyonları, forma renkleri bölge bölge boyanır
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export const BOY = 2.25;            // model metre ölçüsünde; sahadaki boyu bu çarpanla büyür
let kaynak = null, klipler = null, kemikOlcek = 1;

// Kemik adına göre gövde bölgesi: 0 ten, 1 forma, 2 şort, 3 çorap, 4 ayakkabı
function bolgeBul(ad, yn) {
  if (/Toe|Foot/.test(ad)) return 4;
  if (/(Left|Right)Leg/.test(ad)) return yn < 0.075 ? 4 : 3;
  if (/UpLeg|Hips/.test(ad)) return yn > 0.4 ? 2 : 0;
  if (/ForeArm|Hand/.test(ad)) return 0;
  if (/Spine|Shoulder|Arm/.test(ad)) return 1;
  return 0; // baş, boyun
}

export async function insanYukle() {
  const gltf = await new GLTFLoader().loadAsync('/model/Xbot.glb');
  kaynak = gltf.scene; klipler = gltf.animations;
  kaynak.updateMatrixWorld(true);
  // ölçüler (bağlama pozunda)
  const kutu = new THREE.Box3();
  kaynak.traverse(o => { if (o.isSkinnedMesh) { o.geometry.computeBoundingBox(); kutu.union(o.geometry.boundingBox); } });
  const yMin = kutu.min.y, yBoy = kutu.max.y - kutu.min.y;
  kaynak.traverse(o => {
    if (!o.isSkinnedMesh) return;
    const g = o.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, kemikler = o.skeleton.bones;
    const veri = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      let enIyi = 0, agirlik = -1;
      for (let j = 0; j < 4; j++) { const w = sw.getComponent(i, j); if (w > agirlik) { agirlik = w; enIyi = si.getComponent(i, j); } }
      const yn = (pos.getY(i) - yMin) / yBoy;
      veri[i * 3] = bolgeBul(kemikler[enIyi].name, yn); veri[i * 3 + 1] = pos.getX(i) / yBoy; veri[i * 3 + 2] = yn;
    }
    g.setAttribute('bolge', new THREE.BufferAttribute(veri, 3));
    o.castShadow = true; o.frustumCulled = false;
  });
  const bas = kaynak.getObjectByName('mixamorigHead');
  kemikOlcek = bas.getWorldScale(new THREE.Vector3()).y || 1;
}

function malzeme(renkler) {
  const m = new THREE.MeshStandardMaterial({ roughness: .72, metalness: 0 });
  const u = m.userData.u = {
    uG1: { value: new THREE.Color(renkler.g1) }, uG2: { value: new THREE.Color(renkler.g2) }, uSort: { value: new THREE.Color(renkler.sort) },
    uCorap: { value: new THREE.Color(renkler.corap) }, uTen: { value: new THREE.Color(renkler.ten) }, uDesen: { value: renkler.desen },
  };
  m.onBeforeCompile = s => {
    Object.assign(s.uniforms, u);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 bolge; varying vec3 vBolge;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBolge = bolge;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vBolge; uniform vec3 uG1, uG2, uSort, uCorap, uTen; uniform float uDesen;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float b = floor(vBolge.x + 0.5); vec3 c = uTen;
        if (b > 3.5) c = vec3(0.04);
        else if (b > 2.5) c = uCorap;
        else if (b > 1.5) c = uSort;
        else if (b > 0.5) {
          c = uG1;
          if (uDesen > 1.5) c = vBolge.y > 0.0 ? uG2 : uG1;                               // parçalı
          else if (uDesen > 0.5) c = fract(vBolge.y * 14.0 + 0.5) > 0.5 ? uG2 : uG1;      // çizgili
          if (vBolge.z > 0.84 && abs(vBolge.y) < 0.045) c = mix(c, uG2, 0.9);              // yaka
        }
        diffuseColor.rgb = c;`);
  };
  m.customProgramCacheKey = () => 'insan';
  return m;
}

const Y = new THREE.Vector3(0, 1, 0), gq = new THREE.Quaternion(), gq2 = new THREE.Quaternion(), gv = new THREE.Vector3();
const DESEN = { duz: 0, cizgili: 1, parcali: 2 };

export class Insan {
  // renkler: { g1, g2, sort, corap, ten, desen: 'duz'|'cizgili'|'parcali', sac }
  constructor(renkler) {
    this.kok = new THREE.Group();
    this.model = SkeletonUtils.clone(kaynak); this.model.scale.setScalar(BOY); this.kok.add(this.model);
    this.malzeme = malzeme({ ...renkler, desen: DESEN[renkler.desen] ?? 0 });
    this.model.traverse(o => { if (o.isSkinnedMesh) o.material = this.malzeme; });
    this.k = {};
    for (const ad of ['Head', 'Spine2', 'LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm', 'RightHand', 'RightUpLeg', 'RightLeg'])
      this.k[ad] = this.model.getObjectByName('mixamorig' + ad);
    // her kemiğin uzun ekseni: ilk çocuk kemiğe giden yön (modelden okunur)
    for (const b of Object.values(this.k)) { const c = b.children.find(x => x.isBone); b.userData.eksen = c ? c.position.clone().normalize() : new THREE.Vector3(0, 1, 0); }
    // saç: başa takılı yarım küre
    const sac = new THREE.Mesh(new THREE.SphereGeometry(.112, 16, 10, 0, Math.PI * 2, 0, Math.PI * .47), new THREE.MeshStandardMaterial({ color: renkler.sac, roughness: .9 }));
    this.tak('Head', sac, 0, .1, -.004); sac.rotation.x = -.3; sac.castShadow = true;
    this.mixer = new THREE.AnimationMixer(this.model);
    this.a = {};
    for (const ad of ['idle', 'walk', 'run']) { const a = this.mixer.clipAction(klipler.find(k => k.name === ad)); a.play(); a.setEffectiveWeight(ad === 'idle' ? 1 : 0); this.a[ad] = a; }
    this.a.run.time = Math.random(); this.a.idle.time = Math.random() * 3;
    this.kutla = 0; this.dalis = 0; this.vurus = -1; this.uzgun = 0;
    this.dans = 0; this.cal = 0; this.tepsi = 0; this.mikrofon = 0; this._faz = Math.random() * 6.283; this._agir = { idle: 1, walk: 0, run: 0 };
  }
  // Bir nesneyi kemiğe takar; konum metre cinsindendir (kemiğin kendi ölçeği ne olursa olsun)
  tak(kemik, nesne, x, y, z) { nesne.scale.multiplyScalar(1 / kemikOlcek); nesne.position.set(x / kemikOlcek, y / kemikOlcek, z / kemikOlcek); this.k[kemik].add(nesne); }
  // Kemiği, oyuncunun kendi yönüne göre verilen doğrultuya çevirir (x: sol, y: yukarı, z: ileri). agirlik 0..1
  _yonelt(kemik, x, y, z, agirlik) {
    if (agirlik <= 0) return;
    const b = this.k[kemik];
    b.parent.updateWorldMatrix(true, false);
    b.parent.getWorldQuaternion(gq).invert();
    gv.set(x, y, z).normalize().applyQuaternion(this.kok.getWorldQuaternion(gq2)).applyQuaternion(gq);
    gq2.setFromUnitVectors(b.userData.eksen, gv);
    b.quaternion.slerp(gq2, Math.min(1, agirlik));
  }
  vur() { this.vurus = 0; }
  // hiz: sahadaki hız (birim/sn). Animasyonlar hıza göre harmanlanır, sonra kutlama / vuruş / kurtarış pozları eklenir.
  guncelle(dt, hiz) {
    const v = hiz / BOY, h = this._agir, k = Math.min(1, dt * 8);
    const kos = Math.min(1, Math.max(0, (v - 1.4) / 1.4)), dur = Math.min(1, Math.max(0, 1 - v / .9));
    h.run += (kos - h.run) * k; h.idle += (dur - h.idle) * k; h.walk += ((1 - kos - dur) - h.walk) * k;
    this.a.run.setEffectiveWeight(h.run); this.a.idle.setEffectiveWeight(h.idle); this.a.walk.setEffectiveWeight(Math.max(0, h.walk));
    this.a.run.timeScale = Math.min(1.5, Math.max(.75, v / 3.3)); this.a.walk.timeScale = Math.min(1.6, Math.max(.6, v / 1.3));
    this.mixer.update(dt);
    const ku = this.kutla, da = this.dalis;
    if (ku > 0 || da > 0) {
      const w = Math.max(ku, da), ac = da > 0 ? .12 : .42 + Math.sin(performance.now() * .012) * .12;
      this._yonelt('LeftArm', ac, 1, .05, w); this._yonelt('LeftForeArm', ac * .4, 1, .1, w);
      this._yonelt('RightArm', -ac, 1, .05, w); this._yonelt('RightForeArm', -ac * .4, 1, .1, w);
    }
    const zt = performance.now() * .001;
    if (this.dans > 0) { // oyun havası: kollar iki yanda, sırayla inip kalkar
      const s = Math.sin(zt * 6 + this._faz), w = this.dans;
      this._yonelt('LeftArm', .9, .5 + .45 * s, .25, w); this._yonelt('LeftForeArm', .35, 1, .3, w);
      this._yonelt('RightArm', -.9, .5 - .45 * s, .25, w); this._yonelt('RightForeArm', -.35, 1, .3, w);
    }
    if (this.tepsi > 0) { this._yonelt('RightArm', -.55, .15, .6, this.tepsi); this._yonelt('RightForeArm', -.15, 1, .25, this.tepsi); }
    if (this.cal > 0) { // saz çalma: sol el sapta, sağ el tezenede
      const s = Math.sin(zt * 11 + this._faz), w = this.cal;
      this._yonelt('LeftArm', .75, -.25, .55, w); this._yonelt('LeftForeArm', -.3, .25, .9, w);
      this._yonelt('RightArm', -.5, -.75, .35, w); this._yonelt('RightForeArm', .55, -.1 + .25 * s, .8, w);
    }
    if (this.mikrofon > 0) { this._yonelt('RightArm', -.35, -.5, .7, this.mikrofon); this._yonelt('RightForeArm', .25, .9, .35, this.mikrofon); }
    if (this.uzgun > 0) this._yonelt('Head', 0, .55, .85, this.uzgun);
    if (this.vurus >= 0) {
      this.vurus += dt; const u = this.vurus / .38;
      if (u >= 1) this.vurus = -1;
      else {
        const s = u < .35 ? -(u / .35) : -1 + (u - .35) / .3 * 2, a = Math.max(-1, Math.min(1, s)), w = Math.sin(Math.min(1, u * 1.2) * Math.PI);
        this._yonelt('RightUpLeg', -.08, -Math.cos(a * 1.05), Math.sin(a * 1.05), w);
        this._yonelt('RightLeg', -.08, -Math.cos(a * 1.05 - (a < 0 ? .9 : 0)), Math.sin(a * 1.05 - (a < 0 ? .9 : 0)), w);
      }
    }
  }
  kaldir() { this.mixer.stopAllAction(); this.kok.removeFromParent(); this.malzeme.dispose(); }
}
