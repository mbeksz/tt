#!/usr/bin/env node
// Tribün köprüsü
// - Oyun sayfasını ve kontrol panelini sunar (yalnızca bu bilgisayardan erişilir).
// - TikTok yayınındaki yorum / beğeni / hediye olaylarını okuyup oyun sayfasına iletir.
//
//   node kopru.mjs                 -> TikTok'a bağlanmaz, test paneliyle denenir
//   node kopru.mjs kullaniciadin   -> TikTok yayınına bağlanır
//
//   Yayın sayfası : http://127.0.0.1:8770/yayin   (LIVE Studio için: http://localtest.me:8770/yayin)
//   Kontrol paneli: http://127.0.0.1:8770/panel

import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, readdir, stat, mkdir } from 'node:fs/promises';
import { WebSocketServer } from 'ws';

const KOK = path.dirname(fileURLToPath(import.meta.url));
try { process.loadEnvFile(path.join(KOK, '.env')); } catch {}

const PORT = Number(process.env.PORT) || 8770;
const KULLANICI = String(process.argv[2] || process.env.TIKTOK_KULLANICI || '')
  .replace(/^https?:\/\/(www\.)?tiktok\.com\//, '').replace(/^@/, '').replace(/\/.*$/, '').trim();
const IZINLI_HOST = new Set(['127.0.0.1', 'localhost', 'localtest.me']);
// AG=1: aynı ağdaki başka bilgisayardan da açılabilsin (ön izleme için). Varsayılan: yalnızca bu bilgisayar.
const AG = process.env.AG === '1';
const AG_ADRESLER = AG ? Object.values(os.networkInterfaces()).flat().filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address) : [];
for (const a of AG_ADRESLER) IZINLI_HOST.add(a);
const MUZIK_KLASOR = path.join(KOK, 'muzik');
const MUZIK_UZANTI = /\.(mp3|m4a|ogg|wav|flac)$/i;
const AYAR_DOSYA = path.join(KOK, 'ayarlar.json');
const TAKIM_DOSYA = path.join(KOK, 'takimlar.json');
await mkdir(MUZIK_KLASOR, { recursive: true }).catch(() => {});

// ---------------- ayarlar ----------------
const VARSAYILAN = {
  mod: 'mac',              // yayın tipi: 'mac' | 'pavyon'
  pavyonAd: 'PAVYON',      // pavyon tabelasındaki yazı
  takimA: 'gs', takimB: 'fb',
  macSuresi: 300,          // saniye (gerçek süre)
  dolgu: 55,               // isimsiz dolgu seyirci oranı (%)
  muzikAcik: false, muzikSes: 0.5, muzikSira: 'sirali',
  muzikKaynak: 'dosya',    // 'dosya' (muzik klasörü) | 'youtube'
  youtube: '',             // YouTube oynatma listesi ya da video bağlantısı
  kalite: 'yuksek',        // 'yuksek' | 'orta' | 'dusuk'
  efektSes: 0.8,
  spiker: false,
  esik: { sahayaGir: 30, penalti: 100, ozel: 500 }, // jeton (maç)
  pavyonEsik: { konslaOyna: 20, sahne: 30, garson: 50, kons: 80, sazci: 100, assolist: 200, patron: 500 }, // jeton (pavyon)
};
let ayar = structuredClone(VARSAYILAN);

const sayi = (v, alt, ust, yedek) => { const n = Number(v); return Number.isFinite(n) ? Math.min(ust, Math.max(alt, n)) : yedek; };
try { ayarBirlestir(JSON.parse(await readFile(AYAR_DOSYA, 'utf8'))); } catch {}
function ayarBirlestir(y) {
  if (!y || typeof y !== 'object') return;
  if (y.mod === 'mac' || y.mod === 'pavyon') ayar.mod = y.mod;
  if (typeof y.pavyonAd === 'string') ayar.pavyonAd = y.pavyonAd.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 22) || 'PAVYON';
  if (typeof y.takimA === 'string') ayar.takimA = y.takimA.slice(0, 20);
  if (typeof y.takimB === 'string') ayar.takimB = y.takimB.slice(0, 20);
  if ('macSuresi' in y) ayar.macSuresi = sayi(y.macSuresi, 60, 3600, ayar.macSuresi);
  if ('dolgu' in y) ayar.dolgu = sayi(y.dolgu, 0, 100, ayar.dolgu);
  if ('muzikAcik' in y) ayar.muzikAcik = !!y.muzikAcik;
  if ('muzikSes' in y) ayar.muzikSes = sayi(y.muzikSes, 0, 1, ayar.muzikSes);
  if (y.muzikSira === 'sirali' || y.muzikSira === 'karisik') ayar.muzikSira = y.muzikSira;
  if (y.muzikKaynak === 'dosya' || y.muzikKaynak === 'youtube') ayar.muzikKaynak = y.muzikKaynak;
  if (typeof y.youtube === 'string') { const u = y.youtube.trim().slice(0, 300); if (!u || /^https:\/\/((www|m|music)\.)?(youtube\.com|youtu\.be)\//i.test(u)) ayar.youtube = u; }
  if (['yuksek', 'orta', 'dusuk'].includes(y.kalite)) ayar.kalite = y.kalite;
  if ('efektSes' in y) ayar.efektSes = sayi(y.efektSes, 0, 1, ayar.efektSes);
  if ('spiker' in y) ayar.spiker = !!y.spiker;
  if (y.pavyonEsik && typeof y.pavyonEsik === 'object') for (const a of Object.keys(VARSAYILAN.pavyonEsik)) ayar.pavyonEsik[a] = sayi(y.pavyonEsik[a], 1, 100000, ayar.pavyonEsik[a]);
  if (y.esik && typeof y.esik === 'object') {
    const e = ayar.esik;
    e.sahayaGir = sayi(y.esik.sahayaGir, 1, 100000, e.sahayaGir);
    e.penalti = sayi(y.esik.penalti, 1, 100000, e.penalti);
    e.ozel = sayi(y.esik.ozel, 1, 100000, e.ozel);
  }
}
let kayitZamanlayici = null;
function ayarKaydet() {
  clearTimeout(kayitZamanlayici);
  kayitZamanlayici = setTimeout(() => writeFile(AYAR_DOSYA, JSON.stringify(ayar, null, 2)).catch(e => console.warn('[ayar] kaydedilemedi:', e.message)), 300);
}
async function takimlariOku() {
  try { return JSON.parse(await readFile(TAKIM_DOSYA, 'utf8')).takimlar || []; }
  catch (e) { console.warn('[takimlar.json] okunamadı:', e.message); return []; }
}
async function muzikListe() {
  try { return (await readdir(MUZIK_KLASOR)).filter(d => MUZIK_UZANTI.test(d)).sort((a, b) => a.localeCompare(b, 'tr')); }
  catch { return []; }
}

// ---------------- http ----------------
const TUR = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.flac': 'audio/flac' };

const KOKLER = [
  ['/js/', path.join(KOK, 'oyun', 'js')],
  ['/model/', path.join(KOK, 'oyun', 'model')],
  ['/lib/addons/', path.join(KOK, 'node_modules', 'three', 'examples', 'jsm')],
  ['/lib/', path.join(KOK, 'node_modules', 'three', 'build')],
  ['/muzik/', MUZIK_KLASOR],
];
const SAYFALAR = { '/': 'index.html', '/yayin': 'index.html', '/panel': 'panel.html' };

async function dosyaGonder(req, res, dosya) {
  let bilgi;
  try { bilgi = await stat(dosya); } catch { res.writeHead(404).end('yok'); return; }
  if (!bilgi.isFile()) { res.writeHead(404).end('yok'); return; }
  const baslik = { 'Content-Type': TUR[path.extname(dosya).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Accept-Ranges': 'bytes' };
  const aralik = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (aralik && (aralik[1] || aralik[2])) {
    let bas = aralik[1] ? Number(aralik[1]) : Math.max(0, bilgi.size - Number(aralik[2]));
    let son = aralik[1] && aralik[2] ? Math.min(Number(aralik[2]), bilgi.size - 1) : bilgi.size - 1;
    if (bas > son || bas >= bilgi.size) { res.writeHead(416, { 'Content-Range': `bytes */${bilgi.size}` }).end(); return; }
    res.writeHead(206, { ...baslik, 'Content-Range': `bytes ${bas}-${son}/${bilgi.size}`, 'Content-Length': son - bas + 1 });
    createReadStream(dosya, { start: bas, end: son }).pipe(res);
    return;
  }
  res.writeHead(200, { ...baslik, 'Content-Length': bilgi.size });
  createReadStream(dosya).pipe(res);
}

const hostIzinli = h => IZINLI_HOST.has(String(h || '').replace(/:\d+$/, '').toLowerCase());

const server = http.createServer(async (req, res) => {
  if (!hostIzinli(req.headers.host)) { res.writeHead(403).end('izin yok'); return; }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
  let yol;
  try { yol = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  if (yol === '/favicon.ico') { res.writeHead(204).end(); return; }
  if (SAYFALAR[yol]) return dosyaGonder(req, res, path.join(KOK, 'oyun', SAYFALAR[yol]));
  if (yol === '/api/ayar') { res.writeHead(200, { 'Content-Type': TUR['.json'], 'Cache-Control': 'no-store' }).end(JSON.stringify({ mod: ayar.mod })); return; }
  if (yol === '/api/muzik') { res.writeHead(200, { 'Content-Type': TUR['.json'], 'Cache-Control': 'no-store' }).end(JSON.stringify(await muzikListe())); return; }
  for (const [onEk, klasor] of KOKLER) {
    if (!yol.startsWith(onEk)) continue;
    const hedef = path.resolve(klasor, yol.slice(onEk.length));
    if (hedef !== klasor && !hedef.startsWith(klasor + path.sep)) { res.writeHead(403).end(); return; }
    return dosyaGonder(req, res, hedef);
  }
  res.writeHead(404).end('yok');
});

// ---------------- websocket ----------------
const wss = new WebSocketServer({
  server,
  verifyClient: ({ origin, req }) => {
    if (!hostIzinli(req.headers.host)) return false;
    if (!origin) return true;
    try { return IZINLI_HOST.has(new URL(origin).hostname); } catch { return false; }
  },
});
wss.on('error', () => {}); // port hatasını aşağıdaki server 'error' işleyicisi anlaşılır biçimde bildirir
const tiktok = { kullanici: KULLANICI, bagli: false, mesaj: KULLANICI ? 'bağlanıyor…' : 'TikTok kapalı (test modu)', izleyici: 0 };

function gonder(ws, veri) { if (ws.readyState === 1) ws.send(JSON.stringify(veri)); }
function yayinla(veri, rol) { const s = JSON.stringify(veri); for (const ws of wss.clients) if (ws.readyState === 1 && (!rol || ws.rol === rol)) ws.send(s); }
function olayYayinla(olay) { yayinla({ t: 'olay', ...olay }, 'oyun'); }
function tiktokDurum(mesaj, bagli) {
  tiktok.mesaj = mesaj; tiktok.bagli = !!bagli;
  console.log(`[tiktok] ${mesaj}`);
  yayinla({ t: 'tiktok', ...tiktok });
}

const metin = (v, n) => String(v ?? '').slice(0, n);
wss.on('connection', async ws => {
  ws.rol = 'panel';
  ws.on('message', async ham => {
    let m; try { m = JSON.parse(String(ham)); } catch { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'rol') {
      ws.rol = m.rol === 'oyun' ? 'oyun' : 'panel';
      gonder(ws, { t: 'merhaba', ayar, takimlar: await takimlariOku(), tiktok, muzik: await muzikListe() });
    } else if (m.t === 'ayar') {
      ayarBirlestir(m.deger); ayarKaydet(); yayinla({ t: 'ayar', ayar });
    } else if (m.t === 'komut') {
      yayinla({ ...m, t: 'komut', ne: metin(m.ne, 30) }, 'oyun');
    } else if (m.t === 'test') {
      // Test olayları yalnızca canlı yayına bağlı değilken kabul edilir: yayında sahte izleyici gösterilmez.
      if (tiktok.bagli) { gonder(ws, { t: 'bilgi', mesaj: 'Canlı yayına bağlıyken test olayları kapalıdır.' }); return; }
      const o = m.olay || {};
      olayYayinla({ tur: metin(o.tur, 12), k: 'test_' + metin(o.k || o.ad || 'izleyici', 40), ad: metin(o.ad || 'izleyici', 40),
        metin: metin(o.metin, 300), adet: sayi(o.adet, 1, 100000, 1), jeton: sayi(o.jeton, 1, 100000, 1), hediye: metin(o.hediye || 'hediye', 40), ti: o.ti === 0 || o.ti === 1 ? o.ti : undefined, test: true });
    } else if (m.t === 'durum' && ws.rol === 'oyun') {
      yayinla(m, 'panel');
    } else if (m.t === 'muzikYenile') {
      yayinla({ t: 'muzik', liste: await muzikListe() });
    }
  });
});

// ---------------- tiktok ----------------
const kimlik = u => ({
  k: metin(u?.uniqueId || u?.displayId || u?.userId || u?.id || 'izleyici', 40),
  ad: metin(u?.nickname || u?.uniqueId || u?.displayId || 'izleyici', 40),
});
const gorulenHediye = new Map(); // aynı hediye olayı iki kez gelirse tek sayılır
let baglanti = null, denemeZamanlayici = null;
function yenidenDene(sn) { clearTimeout(denemeZamanlayici); denemeZamanlayici = setTimeout(tiktokBaglan, sn * 1000); }

async function tiktokBaglan() {
  if (!KULLANICI) return;
  let kutuphane;
  try { kutuphane = await import('tiktok-live-connector'); }
  catch (e) { tiktokDurum('tiktok-live-connector yüklenemedi: ' + e.message, false); return; }
  const { TikTokLiveConnection, WebcastEvent, ControlEvent } = kutuphane;
  try { await baglanti?.disconnect?.(); } catch {}
  let b;
  try { b = baglanti = new TikTokLiveConnection(KULLANICI, {}); }
  catch (e) { tiktokDurum('TikTok bağlantısı kurulamadı: ' + e.message, false); yenidenDene(30); return; }

  b.on(WebcastEvent.CHAT, d => { const m = d?.comment ?? d?.content; if (m) olayYayinla({ tur: 'yorum', ...kimlik(d.user), metin: metin(m, 300) }); });
  b.on(WebcastEvent.LIKE, d => olayYayinla({ tur: 'begeni', ...kimlik(d.user), adet: sayi(d?.likeCount ?? d?.count, 1, 100000, 1) }));
  b.on(WebcastEvent.GIFT, d => {
    const tip = d?.giftDetails?.giftType ?? d?.giftType;
    if (tip === 1 && !d.repeatEnd) return; // seri sürüyor; bitince toplamı tek seferde sayılır
    const anahtar = `${d?.user?.userId ?? d?.user?.uniqueId}|${d?.giftId}|${d?.groupId}|${d?.repeatCount}`;
    const simdi = Date.now();
    if (gorulenHediye.has(anahtar)) return;
    gorulenHediye.set(anahtar, simdi);
    if (gorulenHediye.size > 2000) for (const [a, z] of gorulenHediye) if (simdi - z > 120000) gorulenHediye.delete(a);
    const jeton = sayi(d?.giftDetails?.diamondCount ?? d?.diamondCount, 1, 100000, 1);
    const adet = sayi(d?.repeatCount, 1, 100000, 1);
    const kim = kimlik(d.user);
    console.log(`[hediye] ${kim.ad}: ${d?.giftDetails?.giftName || 'hediye'} x${adet} (${jeton * adet} jeton)`);
    olayYayinla({ tur: 'hediye', ...kim, hediye: metin(d?.giftDetails?.giftName || 'hediye', 40), jeton, adet });
  });
  b.on(WebcastEvent.FOLLOW, d => olayYayinla({ tur: 'takip', ...kimlik(d.user) }));
  b.on(WebcastEvent.SHARE, d => olayYayinla({ tur: 'paylasim', ...kimlik(d.user) }));
  b.on(WebcastEvent.MEMBER, d => olayYayinla({ tur: 'giris', ...kimlik(d.user) }));
  b.on(WebcastEvent.ROOM_USER, d => { tiktok.izleyici = sayi(d?.viewerCount ?? d?.totalUser, 0, 1e9, tiktok.izleyici); yayinla({ t: 'tiktok', ...tiktok }); });
  b.on(WebcastEvent.STREAM_END, () => { if (baglanti !== b) return; tiktokDurum('yayın bitti, yeniden açılması bekleniyor', false); yenidenDene(20); });
  b.on(ControlEvent.DISCONNECTED, () => { if (baglanti !== b) return; tiktokDurum('bağlantı koptu, yeniden deneniyor', false); yenidenDene(10); });
  b.on(ControlEvent.ERROR, e => console.warn('[tiktok hata]', e?.info || '', e?.exception?.message || ''));

  try {
    await b.connect();
    tiktokDurum(`@${KULLANICI} yayınına bağlı`, true);
  } catch (e) {
    if (baglanti !== b) return;
    tiktokDurum(`@${KULLANICI} yayında değil ya da bağlanılamadı (${String(e?.message || e).slice(0, 120)}); 15 sn sonra yeniden denenecek`, false);
    yenidenDene(15);
  }
}

// ---------------- başlat ----------------
server.on('error', e => {
  if (e.code === 'EADDRINUSE') console.error(`Port ${PORT} dolu. Köprü zaten açık olabilir; kapatıp yeniden dene ya da PORT=8771 node kopru.mjs yaz.`);
  else console.error(e);
  process.exit(1);
});
server.listen(PORT, AG ? '0.0.0.0' : '127.0.0.1', () => {
  console.log(`Tribün köprüsü açık.`);
  console.log(`  Yayın sayfası : http://127.0.0.1:${PORT}/yayin   (LIVE Studio: http://localtest.me:${PORT}/yayin)`);
  console.log(`  Kontrol paneli: http://127.0.0.1:${PORT}/panel`);
  for (const ip of AG_ADRESLER) console.log(`  Ağdan erişim  : http://${ip}:${PORT}/panel  ve  http://${ip}:${PORT}/yayin  (ağdaki herkes açabilir)`);
  console.log(KULLANICI ? `  TikTok        : @${KULLANICI}` : `  TikTok        : kapalı (test modu). Bağlanmak için: node kopru.mjs KULLANICI_ADIN`);
  tiktokBaglan();
});
for (const sinyal of ['SIGINT', 'SIGTERM']) process.on(sinyal, async () => { try { await baglanti?.disconnect?.(); } catch {} process.exit(0); });
