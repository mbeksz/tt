// Sesler: stadyum efektleri tarayıcıda üretilir (telifsiz). Müzik muzik/ klasöründen çalar.
export class Ses {
  constructor() {
    this.ctx = null; this.efektSes = .8; this.muzikSes = .5; this.spiker = false;
    this.liste = []; this.sira = -1; this.karisik = false; this.caliyor = false; this.istenen = false;
    this.oynatici = new Audio(); this.oynatici.preload = 'auto';
    this.oynatici.addEventListener('ended', () => this.sonraki());
    this.oynatici.addEventListener('error', () => { if (this.istenen && this.liste.length > 1) setTimeout(() => this.sonraki(), 800); });
    this._seviye = 0;
    this.kaynak = 'dosya'; this.ytKimlik = null; this.yt = null; this.ytDurum = -1;
  }
  // ---------- YouTube (oynatma listesi ya da tek video) ----------
  static ytCoz(adres) {
    const s = String(adres || '').trim(); if (!s) return null;
    try {
      const u = new URL(s);
      if (!/(^|\.)(youtube\.com|youtu\.be)$/.test(u.hostname)) return null;
      const liste = u.searchParams.get('list'), video = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v');
      if (liste && /^[\w-]{10,64}$/.test(liste)) return { liste, video: /^[\w-]{11}$/.test(video || '') ? video : '' };
      if (/^[\w-]{11}$/.test(video || '')) return { liste: '', video };
    } catch {}
    return null;
  }
  kaynakAyarla(kaynak, adres) {
    const yeni = kaynak === 'youtube' ? 'youtube' : 'dosya', kimlik = Ses.ytCoz(adres);
    if (yeni === this.kaynak && JSON.stringify(kimlik) === JSON.stringify(this.ytKimlik)) return;
    const caliyordu = this.istenen;
    this.dur(); this.kaynak = yeni; this.ytKimlik = kimlik;
    if (this.yt) { try { this.yt.destroy(); } catch {} this.yt = null; this.ytDurum = -1; }
    document.getElementById('ytKutu').style.display = 'none';
    if (caliyordu) this.cal();
  }
  _ytBaslat() {
    if (!this.ytKimlik) return;
    if (this.yt) { try { this.yt.playVideo(); } catch {} return; }
    if (window.YT && window.YT.Player) return this._ytOlustur();
    window.onYouTubeIframeAPIReady = () => { if (this.istenen && this.kaynak === 'youtube' && !this.yt) this._ytOlustur(); };
    if (!document.getElementById('ytApi')) { const sc = document.createElement('script'); sc.id = 'ytApi'; sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc); }
  }
  _ytOlustur() {
    const kutu = document.getElementById('ytKutu'), k = this.ytKimlik;
    kutu.textContent = ''; const yer = document.createElement('div'); kutu.appendChild(yer); kutu.style.display = 'block';
    this.yt = new YT.Player(yer, { width: 200, height: 200, videoId: k.video || undefined,
      playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0, ...(k.liste ? { listType: 'playlist', list: k.liste } : {}) },
      events: {
        onReady: e => { e.target.setVolume(this.muzikSes * 100); if (this.karisik && k.liste) e.target.setShuffle(true); if (this.istenen) e.target.playVideo(); },
        onError: e => { if (k.liste) setTimeout(() => { try { e.target.nextVideo(); } catch {} }, 600); }, // gömülemeyen video atlanır
        onStateChange: e => { this.ytDurum = e.data; if (e.data === 0 && !k.liste && this.istenen) e.target.playVideo(); },
      } });
  }
  get hazir() { return this.ctx && this.ctx.state === 'running'; }
  baslat() {
    if (!this.ctx) {
      const c = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.ana = c.createGain(); this.ana.connect(c.destination);
      this.efekt = c.createGain(); this.efekt.gain.value = this.efektSes; this.efekt.connect(this.ana);
      this.muzik = c.createGain(); this.muzik.gain.value = this.muzikSes; this.muzik.connect(this.ana);
      try { c.createMediaElementSource(this.oynatici).connect(this.muzik); } catch {}
      // gürültü tamponu (uğultu ve tezahürat için)
      const n = c.sampleRate * 3, tampon = c.createBuffer(1, n, c.sampleRate), v = tampon.getChannelData(0);
      let son = 0; for (let i = 0; i < n; i++) { const b = Math.random() * 2 - 1; son = (son + .04 * b) / 1.04; v[i] = son * 9 + b * .25; }
      this.gurultu = tampon;
      // sürekli tribün uğultusu
      const k = c.createBufferSource(); k.buffer = tampon; k.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = .45;
      this.ugultu = c.createGain(); this.ugultu.gain.value = .05;
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = .13; lg.gain.value = .02; lfo.connect(lg); lg.connect(this.ugultu.gain); lfo.start();
      k.connect(f); f.connect(this.ugultu); this.ugultu.connect(this.efekt); k.start();
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
    if (this.istenen && this.oynatici.paused && this.oynatici.src) this.oynatici.play().catch(() => {});
  }
  ayarla({ efektSes, muzikSes, spiker }) {
    if (efektSes != null) { this.efektSes = efektSes; if (this.efekt) this.efekt.gain.setTargetAtTime(efektSes, this.ctx.currentTime, .1); }
    if (muzikSes != null) { try { this.yt?.setVolume?.(muzikSes * 100); } catch {}
      this.muzikSes = muzikSes; if (this.muzik) this.muzik.gain.setTargetAtTime(muzikSes, this.ctx.currentTime, .1); else this.oynatici.volume = muzikSes; }
    if (spiker != null) this.spiker = spiker;
  }
  // tribün uğultusunun yüksekliği (0..1)
  seviye(v) { if (!this.hazir) return; this.ugultu.gain.setTargetAtTime(.045 + .2 * Math.min(1, v), this.ctx.currentTime, .4); }

  _gurultuVur(frek, q, tepe, atak, sure, frekSon) {
    if (!this.hazir) return;
    const c = this.ctx, t = c.currentTime, k = c.createBufferSource(); k.buffer = this.gurultu; k.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(frek, t); f.Q.value = q;
    if (frekSon) f.frequency.linearRampToValueAtTime(frekSon, t + sure * .6);
    const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(tepe, t + atak); g.gain.exponentialRampToValueAtTime(.001, t + sure);
    k.connect(f); f.connect(g); g.connect(this.efekt); k.start(t, Math.random() * 2); k.stop(t + sure + .1);
  }
  _ton(tip, f0, f1, tepe, sure, gecikme = 0) {
    if (!this.hazir) return;
    const c = this.ctx, t = c.currentTime + gecikme, o = c.createOscillator(), g = c.createGain();
    o.type = tip; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + sure);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(tepe, t + .012); g.gain.exponentialRampToValueAtTime(.001, t + sure);
    o.connect(g); g.connect(this.efekt); o.start(t); o.stop(t + sure + .05);
  }
  tezahurat(guc = 1, sure = 4.5) { this._gurultuVur(520, .5, .85 * guc, .18, sure, 1150); this._gurultuVur(1900, .9, .25 * guc, .25, sure * .8, 2600); }
  ah() { this._gurultuVur(520, .7, .5, .12, 2.2, 300); }
  vurus(guclu) { this._ton('sine', guclu ? 170 : 140, 45, guclu ? .9 : .5, .13); }
  direk() { this._ton('triangle', 930, 900, .5, .5); this._ton('triangle', 1390, 1350, .3, .4); }
  davul(sure = 7) { for (let s = 0; s < sure; s += .483) { this._ton('sine', 110, 42, .9, .2, s); if ((s / .483 | 0) % 4 === 3) this._ton('sine', 150, 60, .6, .12, s + .24); } }
  fanfar() { [523, 659, 784, 1047].forEach((f, i) => this._ton('square', f, f, .12, .22, i * .11)); }
  islik(siddet = 1) { const f = 1700 + Math.random() * 900; this._ton('sine', f, f * 1.35, .05 * siddet, .5 + Math.random() * .4, Math.random() * .3); }
  alkis() { for (let i = 0; i < 7; i++) setTimeout(() => this._gurultuVur(1800 + Math.random() * 900, 1.2, .22, .004, .09), i * 95 + Math.random() * 30); }
  // darbuka ritmi (düm tek): müzik çalmıyorken pavyonun fon sesi
  ritim(acik, hizli = false) {
    const ara = hizli ? 190 : 270;
    if (!acik) { clearInterval(this._ritimZ); this._ritimZ = null; this._ritimAra = 0; return; }
    if (this._ritimZ && this._ritimAra === ara) return;
    clearInterval(this._ritimZ); this._ritimAra = ara; let adim = 0;
    const DESEN = 'D.T.DDT.D.T.D.TT';
    this._ritimZ = setInterval(() => {
      if (!this.hazir || (this.istenen && (this.kaynak === 'youtube' ? this.ytDurum === 1 : !this.oynatici.paused))) return;
      const v = DESEN[adim++ % DESEN.length];
      if (v === 'D') this._ton('sine', 135, 52, .55, .16);
      else if (v === 'T') { this._gurultuVur(3400, 1.6, .2, .003, .07); this._ton('triangle', 620, 480, .12, .05); }
    }, ara);
  }
  duduk(adet = 1) {
    if (!this.hazir) return;
    const c = this.ctx;
    for (let i = 0; i < adet; i++) {
      const t = c.currentTime + i * .55, sure = adet > 1 && i === adet - 1 ? 1.1 : .42, g = c.createGain();
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.16, t + .02); g.gain.setValueAtTime(.16, t + sure - .05); g.gain.linearRampToValueAtTime(.0001, t + sure);
      const trem = c.createOscillator(), tg = c.createGain(); trem.frequency.value = 31; tg.gain.value = .07; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(t + sure);
      for (const f of [2850, 3010]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + sure); }
      g.connect(this.efekt);
    }
  }
  // gol gibi anlarda müzik kısa süre kısılır
  kis(sure = 5) {
    if (this.kaynak === 'youtube' && this.yt?.setVolume) { try { this.yt.setVolume(this.muzikSes * 25); } catch {} clearTimeout(this._ytKis); this._ytKis = setTimeout(() => { try { this.yt?.setVolume(this.muzikSes * 100); } catch {} }, sure * 1000); return; }
    if (!this.hazir) return;
    const t = this.ctx.currentTime, g = this.muzik.gain;
    g.cancelScheduledValues(t); g.setTargetAtTime(this.muzikSes * .25, t, .15); g.setTargetAtTime(this.muzikSes, t + sure, .6);
  }
  soyle(metin) {
    if (!this.spiker || !('speechSynthesis' in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(metin); u.lang = 'tr-TR'; u.rate = 1.08; u.volume = Math.min(1, this.efektSes + .2);
      const ses = speechSynthesis.getVoices().find(v => v.lang?.toLowerCase().startsWith('tr')); if (ses) u.voice = ses;
      if (speechSynthesis.pending) speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch {}
  }

  // ---------- müzik ----------
  listeAyarla(liste) {
    const calan = this.liste[this.sira];
    this.liste = liste || [];
    this.sira = calan ? this.liste.indexOf(calan) : -1;
  }
  cal(i) {
    if (this.kaynak === 'youtube') { this.istenen = true; this._ytBaslat(); return; }
    if (!this.liste.length) return;
    if (i != null) this.sira = ((i % this.liste.length) + this.liste.length) % this.liste.length;
    else if (this.sira < 0) this.sira = 0;
    this.istenen = true;
    const adres = '/muzik/' + encodeURIComponent(this.liste[this.sira]);
    if (i != null || !this.oynatici.src.endsWith(adres)) this.oynatici.src = adres;
    if (!this.muzik) this.oynatici.volume = this.muzikSes;
    this.oynatici.play().then(() => { this.caliyor = true; }).catch(() => { this.caliyor = false; });
  }
  dur() { this.istenen = false; this.caliyor = false; this.oynatici.pause(); try { this.yt?.pauseVideo?.(); } catch {} }
  sonraki() {
    if (this.kaynak === 'youtube') { this.istenen = true; if (this.yt) { try { this.yt.nextVideo(); } catch {} } else this._ytBaslat(); return; }
    if (!this.liste.length) return;
    let i = this.sira + 1;
    if (this.karisik && this.liste.length > 2) { do i = (Math.random() * this.liste.length) | 0; while (i === this.sira); }
    this.cal(i);
  }
  durum() {
    if (this.kaynak === 'youtube') { let ad = ''; try { ad = this.yt?.getVideoData?.().title || ''; } catch {} return { calan: 'YouTube' + (ad ? ': ' + ad : this.ytKimlik ? '' : ' (bağlantı yok)'), caliyor: this.ytDurum === 1, sesHazir: !!this.hazir, yt: this.ytDurum }; }
    return { calan: this.liste[this.sira] || '', caliyor: this.istenen && !this.oynatici.paused, sesHazir: !!this.hazir };
  }
}
