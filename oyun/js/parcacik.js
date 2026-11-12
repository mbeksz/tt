// Basit parçacık sistemi: duman, kıvılcım, konfeti, havai fişek
import * as THREE from 'three';

const VS = `
attribute vec4 renk; attribute float boyut;
varying vec4 vRenk;
void main(){
  vRenk = renk;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = boyut * (900.0 / max(1.0, -mv.z));
  gl_Position = projectionMatrix * mv;
}`;
const FS = `
varying vec4 vRenk;
void main(){
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, d);
  gl_FragColor = vec4(vRenk.rgb, vRenk.a * a * a);
}`;

export class Parcaciklar {
  constructor(sahne, azami, toplamali) {
    this.n = azami; this.sira = 0;
    this.pos = new Float32Array(azami * 3); this.renk = new Float32Array(azami * 4); this.boyut = new Float32Array(azami);
    this.hiz = new Float32Array(azami * 3);
    this.omur = new Float32Array(azami); this.omur0 = new Float32Array(azami);
    this.b0 = new Float32Array(azami); this.buyume = new Float32Array(azami); this.a0 = new Float32Array(azami);
    this.cekim = new Float32Array(azami); this.surtunme = new Float32Array(azami);
    const g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('renk', new THREE.BufferAttribute(this.renk, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('boyut', new THREE.BufferAttribute(this.boyut, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
      blending: toplamali ? THREE.AdditiveBlending : THREE.NormalBlending });
    this.nokta = new THREE.Points(g, m);
    this.nokta.frustumCulled = false; this.nokta.renderOrder = toplamali ? 6 : 5;
    sahne.add(this.nokta);
  }
  // o: {x,y,z,vx,vy,vz,omur,boyut,buyume,r,g,b,a,cekim,surtunme}
  sac(o) {
    const i = this.sira; this.sira = (i + 1) % this.n;
    this.pos[i * 3] = o.x; this.pos[i * 3 + 1] = o.y; this.pos[i * 3 + 2] = o.z;
    this.hiz[i * 3] = o.vx || 0; this.hiz[i * 3 + 1] = o.vy || 0; this.hiz[i * 3 + 2] = o.vz || 0;
    this.omur[i] = this.omur0[i] = o.omur || 1;
    this.b0[i] = o.boyut || 1; this.buyume[i] = o.buyume || 0; this.a0[i] = o.a ?? 1;
    this.cekim[i] = o.cekim || 0; this.surtunme[i] = o.surtunme || 0;
    this.renk[i * 4] = o.r ?? 1; this.renk[i * 4 + 1] = o.g ?? 1; this.renk[i * 4 + 2] = o.b ?? 1; this.renk[i * 4 + 3] = this.a0[i];
    this.boyut[i] = this.b0[i];
  }
  guncelle(dt) {
    const { n, pos, hiz, omur, omur0, renk, boyut } = this;
    for (let i = 0; i < n; i++) {
      if (omur[i] <= 0) continue;
      omur[i] -= dt;
      if (omur[i] <= 0) { renk[i * 4 + 3] = 0; boyut[i] = 0; continue; }
      const s = Math.max(0, 1 - this.surtunme[i] * dt), j = i * 3;
      hiz[j] *= s; hiz[j + 1] = hiz[j + 1] * s - this.cekim[i] * dt; hiz[j + 2] *= s;
      pos[j] += hiz[j] * dt; pos[j + 1] += hiz[j + 1] * dt; pos[j + 2] += hiz[j + 2] * dt;
      const k = omur[i] / omur0[i];
      renk[i * 4 + 3] = this.a0[i] * Math.min(1, k * 2.2);
      boyut[i] = this.b0[i] + this.buyume[i] * (1 - k);
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = a.renk.needsUpdate = a.boyut.needsUpdate = true;
  }
}
