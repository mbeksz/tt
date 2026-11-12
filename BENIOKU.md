# Tribün

TikTok LIVE için etkileşimli stadyum yayını. İzleyici takımını yazar, tribüne oturur; hediye atan sahaya girer ya da penaltı kullanır.
Her şey bu bilgisayarda çalışır. Dışarıya açık adres, sunucu ya da alan adı gerekmez; internet yalnızca TikTok'a bağlanmak için kullanılır.

```
TikTok yorum / beğeni / hediye ──> kopru.mjs (bu bilgisayar) ──> yayın sayfası ──> LIVE Studio ya da OBS ──> yayın
```

## Başlatma

```bash
cd /home/baykanai/projects/tt
npm install                     # yalnızca ilk kez
node kopru.mjs                  # test modu (TikTok'a bağlanmaz)
node kopru.mjs KULLANICI_ADIN   # yayına bağlanır (@ olmadan)
AG=1 node kopru.mjs             # aynı ağdaki başka bilgisayardan da açılır (şifresiz; yalnızca ön izleme için)
```

| Adres | Ne işe yarar |
|---|---|
| `http://127.0.0.1:8770/panel` | Kontrol paneli: takım seçimi, müzik, dolgu seyirci, test düğmeleri |
| `http://127.0.0.1:8770/yayin` | Yayına verilecek sayfa (1080×1920) |

Köprü penceresi yayın boyunca açık kalmalı. Yayın henüz açık değilse köprü 15 saniyede bir yeniden dener.
Durdurmak için o pencerede `Ctrl + C`.

## Önce dene (yayın açmadan)

1. `node kopru.mjs` ile başlat.
2. Bir sekmede yayın sayfasını, başka bir sekmede paneli aç.
3. Yayın sayfasına bir kez tıkla (tarayıcı sesi ancak tıklamadan sonra açar; yayın programında buna gerek yok).
4. Panelin "Test" bölümünden yorum, beğeni ve hediye gönder. "+100" ile tribünü doldur.

Test olayları yalnızca köprü bir TikTok yayınına bağlı değilken çalışır.

## İzleyici ne yapabilir

| İzleyici | Olan |
|---|---|
| Yayına girer, yorum yazar, beğenir | Adıyla tribüne oturur (takım seçmediyse az kalabalık tarafa) |
| Takımını yazar (`gs`, `fb`, `bjk`, `ts` ya da tam adı) | O takımın tribününe geçer |
| `dalga` | Bütün stadyum dalga yapar |
| `zıpla` | Kendi tribünü zıplar |
| `ışık` | Kendi tribününde telefon ışıkları yanar |
| Yorum ve beğeni | Tribün sesi artar; sesi yüksek tarafın takımı biraz daha iyi oynar |
| `beni göster` | Sahadaysa kamera ona yaklaşır (kişi başı 45 sn, genelde 8 sn bekleme) |

| Hediye (toplam jeton) | Olan |
|---|---|
| 1–4 | Meşale |
| 5–9 | Bayrak + meşale |
| 10 ve üstü | İsimli pankart + duman + bayrak |
| 30 ve üstü | Takım formasıyla sahaya girer, sırtında adı yazar (en az 3 dakika) |
| 100 ve üstü | Penaltı: 10 sn hazırlık, kendi tribünü destekler, karşı tribün ıslıklar |
| 500 ve üstü | Özel penaltı (gol ihtimali daha yüksek) + havai fişek |

Son üç eşik panelden değiştirilir.

## Pavyon yayını

Panelin en üstündeki **Pavyon yayını** düğmesine basınca yayın sayfası kendini yeniler ve pavyon sahnesi açılır. Tabeladaki yazıyı aynı yerden değiştirirsin.

| İzleyici | Olan |
|---|---|
| Yayına girer, yorum yazar | Adıyla bir masaya gelir (24 kişilik yer; dolunca en sessiz misafirin yerini alır) |
| Yorum yazar | Başının üstünde konuşma balonu çıkar |
| `oyna` | Piste çıkıp oynar |
| `alkış` | Masasından peçeteler uçar |
| `hesap` | Ekrana şaka bir hesap gelir |
| Yorum ve beğeni | Coşku ölçeri dolar; dolunca **fasıl** başlar, herkes oynar |

| Hediye (toplam jeton) | Olan |
|---|---|
| 1–4 | Peçete atar |
| 5–9 | Sahneye çiçek atar |
| 10 ve üstü | İstek parça: assolist onun için söyler |
| 20 ve üstü | **Konsla oynar:** bir kons gelir, ortadaki ışıklı pistte karşılıklı oynarlar (25 sn) |
| 30 ve üstü | **Sahneye çıkar:** assolistin yanında oynar (25 sn) |
| 50 ve üstü | **Garson** olur |
| 80 ve üstü | **Kons** olur |
| 100 ve üstü | **Sazcı** olur (sahnedeki sazcılardan biri onun adını taşır) |
| 200 ve üstü | **Assolist** olur |
| 500 ve üstü | **Patron** olur: para yağmuru ve fasıl |

20 ve üstündeki yedi eşik panelde "Pavyon hediyeleri"nden değiştirilir; maçın eşiklerinden bağımsızdır. Rol 3 dakika sürer, bitince kişi masasına döner. Pistte, sahnede ya da rolde olan `beni göster` yazınca kamera ona yaklaşır. Müzik (dosya ya da YouTube) pavyonda da aynı çalışır; müzik çalmıyorken fonda darbuka ritmi vardır.

Panel yayın tipine göre değişir: üstteki iki büyük düğmeden biri seçilir, altında yalnızca o yayının ayarları ve test düğmeleri görünür. Müzik ve görüntü ayarları iki yayında ortaktır.

Pavyon teması TikTok'ta yaş ya da içerik denetimine takılabilir; sahnede içki ve müstehcen öğe yoktur, ama yayındaki konuşma ve başlık senin sorumluluğunda.

## Yayın açma

### TikTok LIVE Studio (Windows)
1. Köprüyü kullanıcı adınla başlat.
2. LIVE Studio'da **dikey görünümü** seç.
3. **Kaynak ekle → Bağlantı (Link)**: adres `http://localtest.me:8770/yayin`
   (LIVE Studio `127.0.0.1` adresini kabul etmeyebilir; `localtest.me` aynı yere, yani bu bilgisayara gider.)
4. Kaynağın çözünürlüğünü **özel → 1080 × 1920** yap ve tüm ekranı kaplat.
5. LIVE Studio'da masaüstü sesini kapalı tut; bütün ses sayfanın içinden gelir.

### OBS (Windows, Mac, Linux)
1. **Ayarlar → Video**: tuval ve çıkış **1080×1920**, 30 FPS.
2. **Kaynaklar → + → Tarayıcı**: adres `http://127.0.0.1:8770/yayin`, genişlik 1080, yükseklik 1920, "Sesi OBS üzerinden kontrol et" işaretli.
3. **Ayarlar → Yayın**: Hizmet "Özel"; sunucu ve yayın anahtarını TikTok'tan al. Anahtarı kimseyle paylaşma.

### Görüntü net olsun
- Sahne her zaman 1080×1920 çizilir. Kaynak da tam **1080×1920** olmalı; küçük açılıp büyütülürse bulanıklaşır (LIVE Studio'nun varsayılanı 800×600'dür).
- Kaynağı tuvalde büyütüp küçültme; birebir otursun.
- OBS'te çıkış çözünürlüğünü tuvalle aynı tut (küçültme yok), bit hızını 4000–6000 kbps aralığında dene.
- TikTok yayını izleyiciye yeniden sıkıştırarak verir; son netliği izleyicinin bağlantısı da belirler.

## Müzik

Şarkı dosyalarını (`mp3`, `m4a`, `ogg`, `wav`, `flac`) `muzik` klasörüne koy, panelde "Listeyi yenile"ye bas, "Çal"a bas.
Müzik yayın sayfasının içinden çalar; gol ve penaltıda kendiliğinden kısılır.
Telifli şarkıda TikTok yayının sesini kapatabilir ya da uyarı verebilir.

### YouTube'dan çalmak
Panelde "Müzik ve ses" bölümüne oynatma listesi ya da video bağlantısını yapıştır, Enter'a bas, sonra "Çal".
- Oynatıcı yayın ekranının sol alt köşesinde 200×200'lük küçük bir kutu olarak görünür (YouTube kuralları oynatıcının görünür olmasını ister).
- Başka sitede oynatılmasına izin verilmeyen videolar listede atlanır.
- Gizli (private) listeler çalmaz; liste "herkese açık" ya da "liste dışı" olmalı.
- Telif uyarısı YouTube'dan çalınca da geçerlidir.

Stadyum sesleri (uğultu, tezahürat, düdük, davul) tarayıcıda üretilir, telifsizdir.
Spiker sesi panelden açılır, varsayılan kapalıdır; tarayıcının Türkçe sesini kullanır, yayın programının tarayıcısında ses yoksa çalışmaz.

## Görüntü kalitesi ve akıcılık

Panelde "Görüntü" bölümünde kalite seçilir ve yayın sayfasının kare hızı görünür.
- **Yüksek:** kenar yumuşatma, çapraz gölgeler, ışık parlaması. Ekran kartı olan bilgisayar için.
- **Orta:** tek gölge, daha hafif kenar yumuşatma.
- **Düşük:** gölge ve parlama yok. Kare hızı 30'un altındaysa buna in.

Oyuncu modeli `oyun/model/Xbot.glb` dosyasıdır (three.js örnek modeli, Mixamo iskeleti). Yüzü yoktur; forma renkleri ve saç kodla eklenir.

## Takımlar ve kadrolar

`takimlar.json` dosyasında. Her takım için ad, renkler, desen (`duz`, `cizgili`, `parcali`), diziliş, 11 oyuncu (numara + ad) ve
izleyicinin yazacağı anahtar kelimeler bulunur. Yeni takım eklemek için bir blok kopyalayıp düzenle; dosyayı kaydedince yayın sayfasını yenile.
Kadrolar 2025 sonu bilgisiyle dolduruldu; güncel değilse buradan düzelt.

## Dolgu seyirci

Panelden tribünün yüzde kaçının dolu görüneceğini seçersin. Dolgu seyircinin adı yoktur, yalnızca dekor olarak tribünü doldurur.
Gerçek izleyici geldikçe en görünür koltuklara o oturur. Yayında sahte kullanıcı adı, sahte yorum ya da sahte hediye gösterilmez.

## Dosyalar

| Dosya | İçerik |
|---|---|
| `kopru.mjs` | Köprü: sayfaları sunar, TikTok olaylarını okur, ayarları saklar |
| `oyun/index.html`, `oyun/js/` | Yayın sayfası (stadyum, tribün, maç, kamera, ses) |
| `oyun/panel.html` | Kontrol paneli |
| `oyun/model/Xbot.glb` | Oyuncu modeli |
| `takimlar.json` | Takımlar ve kadrolar |
| `ayarlar.json` | Panelden yapılan ayarlar (kendiliğinden oluşur) |
| `PLAN.md` | Yapılanlar ve gerçek yayında denenecekler |

## Bilinmesi gerekenler

- TikTok bağlantısı resmi olmayan `tiktok-live-connector` kütüphanesiyle kurulur. TikTok bir değişiklik yaparsa bağlantı bozulabilir.
- Kulüp ve oyuncu adlarının para kazanılan bir yayında kullanılması hak sahiplerinin şikâyetine yol açabilir. Resmi armalar kullanılmaz.
- Port doluysa: `PORT=8771 node kopru.mjs` (adreslerdeki 8770'i de değiştir).
