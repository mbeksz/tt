// Kamera yönetmeni: geniş açı, oyuncu yakın çekimi, penaltı ve tribün çekimleri
import * as THREE from 'three';
import { SAHA } from './ortak.js';

const { HL, PENALTI } = SAHA;
const PEN_Z = -HL + PENALTI;

export class Kamera {
  constructor(kamera) {
    this.kamera = kamera;
    this.pos = new THREE.Vector3(0, 40, 66); this.bak = new THREE.Vector3(0, 6, -12); this.fov = 46;
    this.hp = new THREE.Vector3(); this.hb = new THREE.Vector3(); this.hfov = 46;
    this.ozel = null; this.sarsinti = 0;
  }
  // tur: 'oyuncu' (veri = oyuncu) | 'tribun' (veri = takım sırası)
  goster(tur, veri, sure) { this.ozel = { tur, veri, bitis: performance.now() + sure * 1000 }; }
  _oyuncu(p, fov = 38) { this.hp.set(p.x + 4, 6.5, p.z + 20); this.hb.set(p.x, 2.4, p.z); this.hfov = fov; }
  _tribun(ti) { const s = ti ? 1 : -1; this.hp.set(s * 3, 15, -HL + 17); this.hb.set(s * 15, 15.5, -HL - 20); this.hfov = 48; }

  guncelle(dt, mac, t) {
    const top = mac.top, now = performance.now();
    let hiz = 2.4;
    if (this.ozel && this.ozel.bitis < now) this.ozel = null;
    const pn = mac.pen;
    if (pn && (pn.asama === 'kosu' || pn.asama === 'atis')) {
      this.hp.set(6.5, 5, PEN_Z + 14); this.hb.set(0, 2, -HL + .5); this.hfov = 46; hiz = 3.2;
    } else if (this.ozel) {
      if (this.ozel.tur === 'oyuncu') this._oyuncu(this.ozel.veri, 34); else this._tribun(this.ozel.veri);
      hiz = 3;
    } else if (pn && pn.asama === 'hazirlik') {
      this.hp.set(Math.sin(t * .4) * 3, 7.5, PEN_Z + 15); this.hb.set(0, 5.5, -HL - 8); this.hfov = 50;
    } else if (pn && pn.asama === 'sonuc') {
      if (pn.sonuc === 'gol' && pn.t > 1.2) this._tribun(pn.ti); else this._oyuncu(pn.p, 36);
    } else if (mac.faz === 'gol' && mac.sonGol) {
      if (mac.fazT > 2.6) this._oyuncu(mac.sonGol.p, 38); else this._tribun(mac.sonGol.ti);
      hiz = 3;
    } else {
      this.hp.set(top.x * .22, 37, 60 + top.z * .22); this.hb.set(top.x * .42, 6.5, top.z * .42 - 13); this.hfov = 46;
    }
    const k = 1 - Math.exp(-dt * hiz);
    this.pos.lerp(this.hp, k); this.bak.lerp(this.hb, k); this.fov += (this.hfov - this.fov) * k;
    this.sarsinti = Math.max(0, this.sarsinti - dt * 1.6);
    const s = this.sarsinti;
    this.kamera.position.set(this.pos.x + (Math.random() - .5) * s, this.pos.y + (Math.random() - .5) * s, this.pos.z);
    this.kamera.lookAt(this.bak);
    if (Math.abs(this.kamera.fov - this.fov) > .01) { this.kamera.fov = this.fov; this.kamera.updateProjectionMatrix(); }
  }
}
