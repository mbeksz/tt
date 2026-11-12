// Ekran üstü yazılar: skor, tribün sesi, olay akışı, günün yıldızları, penaltı kartı
const $ = id => document.getElementById(id);

export class Hud {
  constructor() {
    this.ipuclari = []; this.ipucuSira = 0; this.afisT = null;
    setInterval(() => this._ipucu(), 6000);
  }
  takimlar(a, b, esik) {
    this.a = a; this.b = b;
    $('adA').textContent = a.ad.toLocaleUpperCase('tr'); $('adB').textContent = b.ad.toLocaleUpperCase('tr');
    for (const [el, t] of [['renkA', a], ['renkB', b]]) $(el).style.background = `linear-gradient(${t.renk1} 50%, ${t.renk2} 50%)`;
    $('olcA').style.background = a.renk1; $('olcB').style.background = b.renk1;
    this.ipuclari = [
      `Takımını yaz: <b>${a.kisa}</b> ya da <b>${b.kisa}</b>`,
      `<b>dalga</b> • <b>zıpla</b> • <b>ışık</b> yaz, tribün coşsun`,
      `Yaz ve beğen: tribünün sesi takımına güç verir`,
      `Hediye: meşale • bayrak • <b>${esik.sahayaGir}+</b> sahaya gir • <b>${esik.penalti}+</b> penaltı`,
      `Önce takımını yaz (<b>${a.kisa}</b> / <b>${b.kisa}</b>), sonra hediye at: o formayla sahaya girersin`,
      `Sahadaysan <b>beni göster</b> yaz, kamera sana gelsin`,
    ];
    this._ipucu();
  }
  _ipucu() {
    if (!this.ipuclari.length) return;
    const el = $('ipucu'); el.style.opacity = 0;
    setTimeout(() => { el.innerHTML = this.ipuclari[this.ipucuSira++ % this.ipuclari.length]; el.style.opacity = 1; }, 400);
  }
  skor(skor, dakika, sayilar, bitti) {
    $('skorYazi').textContent = `${skor[0]} - ${skor[1]}`;
    $('dakika').textContent = bitti ? 'MAÇ SONU' : dakika + "'";
    $('kisiA').textContent = sayilar[0] + ' taraftar'; $('kisiB').textContent = sayilar[1] + ' taraftar';
  }
  olcer(oranA) { $('olcA').style.width = (oranA * 100).toFixed(1) + '%'; $('olcB').style.width = ((1 - oranA) * 100).toFixed(1) + '%'; }
  afis(buyuk, kucuk, renk = '#ffffff', sure = 3.5) {
    const el = $('afis'); $('afisB').textContent = buyuk; $('afisB').style.color = renk;
    $('afisK').textContent = kucuk || ''; $('afisK').style.display = kucuk ? 'inline-block' : 'none';
    el.classList.add('acik'); clearTimeout(this.afisT); this.afisT = setTimeout(() => el.classList.remove('acik'), sure * 1000);
  }
  akis(metin, altin = false) {
    const kutu = $('akis'), d = document.createElement('div'); d.textContent = metin; if (altin) d.className = 'altin';
    kutu.appendChild(d); while (kutu.children.length > 5) kutu.firstChild.remove();
    setTimeout(() => d.remove(), altin ? 14000 : 8000);
  }
  yildizlar(liste) {
    const kutu = $('yildiz'); kutu.style.display = liste.length ? 'block' : 'none';
    const hedef = $('yildizListe'); hedef.textContent = '';
    for (const y of liste) {
      const d = document.createElement('div'), a = document.createElement('span'), b = document.createElement('span');
      a.textContent = y.ad; b.textContent = y.jeton; d.append(a, b); hedef.appendChild(d);
    }
  }
  penalti(pn, oran) {
    const el = $('pen');
    const acik = !!pn && pn.asama !== 'sonuc';
    $('akis').style.visibility = $('yildiz').style.visibility = acik ? 'hidden' : 'visible';
    if (!acik) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const takim = pn.ti ? this.b : this.a, rakip = pn.ti ? this.a : this.b;
    $('penAd').textContent = (pn.ozel ? '★ ' : '') + pn.ad;
    $('penSay').textContent = pn.asama === 'hazirlik' ? Math.max(0, Math.ceil(pn.sure - pn.t)) : '';
    $('penD').style.width = (oran * 100).toFixed(0) + '%'; $('penD').style.background = takim.renk1;
    $('penY').style.width = ((1 - oran) * 100).toFixed(0) + '%'; $('penY').style.background = rakip.renk1;
    $('penSol').textContent = `${takim.kisa}: yaz ve beğen, gol olsun!`; $('penSag').textContent = `${rakip.kisa}: ıslıkla!`;
  }
  baglanti(var_) { $('baglanti').style.display = var_ ? 'none' : 'block'; }
}
