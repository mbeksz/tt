# Tribün — yapılacaklar

TikTok LIVE için etkileşimli stadyum yayını. Her şey bu bilgisayarda çalışır; dışarıya açık adres yok.

## 1. Temel
- [x] Klasör, paketler, `.gitignore`
- [x] Köprü (`kopru.mjs`): sayfaları sunar, oyun ve panel arasında mesaj taşır, ayarları saklar
- [x] Ayar dosyaları: `takimlar.json` (takımlar, renkler, ilk 11), `ayarlar.json` (panelden değişenler)

## 2. Stadyum ve tribün
- [x] 3D gece stadyumu: saha, kaleler, projektörler, reklam panoları, ışık parlaması
- [x] Net görüntü: sahne doğrudan 1080×1920 çizilir (bulanıklık yok)
- [x] Tribünler: sol + kale arkası sol = A takımı, sağ + kale arkası sağ = B takımı
- [x] İzleyici adıyla koltuğa oturur; yoruma takımını yazınca o tribüne geçer
- [x] Toplu hareketler: `dalga`, `zıpla`, `ışık`
- [x] İsimsiz dolgu seyirci (panelden oran seçilir; gerçek izleyici geldikçe yerini alır)
- [x] Ses ölçer: hangi tribün daha gürültülü (takımına küçük avantaj verir)

## 3. Maç
- [x] Panelden iki takım seçimi, forma renkleri ve desenleri, sırtta isim + numara
- [x] 11'e 11 otomatik maç: pas, top kapma, şut, gol, santra, maç sonu ve yeni maç
- [x] Skor tabelası, dakika, olay yazıları (GOL vb.)
- [x] Kamera: geniş açı, topu takip, gol ve tribün çekimleri

## 4. Hediyeler
- [x] Küçük hediye: meşale, duman, bayrak, isimli pankart
- [x] Orta hediye: atan kişi takım formasıyla sahaya girer (sırtında kendi adı)
- [x] Büyük hediye: penaltı (10 sn hazırlık, iki tribün ihtimali etkiler, ağır çekim atış)
- [x] Çok büyük hediye: özel penaltı + havai fişek
- [x] `beni göster`: sahadaki hediye oyuncusuna kamera yaklaşır (bekleme süreli)
- [x] Günün yıldızları tablosu

## 5. Ses ve müzik
- [x] Stadyum sesleri (uğultu, gol tezahüratı, düdük, vuruş, ıslık, davul) — tarayıcıda üretilir, telifsiz
- [x] Müzik: `muzik/` klasöründeki dosyalar, panelden çal / duraklat / sıradaki / ses seviyesi; gol anında kısılır
- [x] Spiker sesi (varsayılan kapalı)

## 6. Kontrol paneli (`/panel`)
- [x] Takım seçimi, yeni maç, maç süresi, hediye eşikleri
- [x] Dolgu seyirci oranı, ses ve müzik kontrolleri, spiker anahtarı
- [x] Sahadaki hediye oyuncuları listesi + "Göster" düğmesi
- [x] Test paneli: sahte yorum / beğeni / hediye (yalnızca TikTok'a bağlı değilken çalışır)

## 7. TikTok bağlantısı
- [x] Yorum, beğeni, hediye, giriş, takip olaylarını okuma; kopunca yeniden bağlanma
- [x] Hediye serilerini tek sefer sayma

## 8. Kontrol ve belge
- [x] Ekran görüntüsüyle görsel kontrol (geniş açı, penaltı, tribün)
- [x] `BENIOKU.md`: kurulum, yayın açma (LIVE Studio / OBS), net görüntü ayarları

## 9. Grafik yükseltme
- [x] Oyuncular: kutu figür yerine iskeletli insan modeli; gerçek koşu / yürüme / bekleme animasyonu, hıza göre harmanlanır
- [x] Forma, şort, çorap, ten ve ayakkabı model üzerinde boyanır (düz / çizgili / parçalı); sırtta isim + numara; saç
- [x] Vuruş, gol sevinci (kollar havada), üzüntü ve kaleci kurtarışı pozları
- [x] Tribün: yuvarlak gövdeler, zıplarken kalkan kollar, kişi kişi salınım
- [x] Stadyum: çatılar ve lamba sıraları, projektör parlaması, çapraz gölgeler
- [x] Yayın görünümü: kenar karartma, renk canlılığı, kontrast, ince kumlanma
- [x] Kalite ayarı (yüksek / orta / düşük) ve panelde kare hızı göstergesi

## 10. YouTube müziği
- [x] Panele oynatma listesi ya da video bağlantısı yapıştırılır; müzik oradan çalar (çal / duraklat / sıradaki / ses, gol anında kısılma)

## 11. Yorum balonu, takım seçimi, Amedspor
- [x] Yorum yazanın koltuğunun üstünde konuşma balonu (yorum + isim), daha büyük etiketler
- [x] Test panelinde "hangi takım için" seçimi; akış yazılarında takım adı
- [x] Amedspor takım listesinde

## 12. Pavyon yayını (ikinci yayın tipi)
- [x] Panelden yayın tipi seçimi (Maç / Pavyon) ve tabela yazısı; tip değişince yayın sayfası kendini yeniler
- [x] Mekân: sahne, perde, neon tabela, ışıklı pist, masalar, disko topu, dönen renkli ışıklar
- [x] Hazır ekip: üç sazcı (bağlama, darbuka, klarnet), assolist, garson
- [x] Misafirler adıyla masalara gelir; yorum balonu; `oyna` yazan piste çıkar, `alkış` peçete, `hesap` şaka hesabı
- [x] Coşku ölçeri: yorum ve beğeniyle dolar, dolunca fasıl (herkes oynar, ışıklar hızlanır)
- [x] Hediyeler: peçete, çiçek, istek parça; roller: garson, kons, sazcı, assolist, patron (para yağmuru)
- [x] Darbuka ritmi (müzik çalmıyorken), alkış sesi

## Gerçek yayında denenmesi gerekenler
- [ ] Canlı TikTok yayınıyla olay akışı (köprü TikTok'a ulaşıyor ve yayın yokken yeniden deniyor; gerçek yorum / hediye henüz görülmedi)
- [ ] Seslerin kulakla kontrolü (efektler ve müzik hatasız çalışıyor, ama ses dengesi dinlenerek ayarlanmalı)
- [ ] Yayın bilgisayarında akıcılık (kare hızı) ve LIVE Studio / OBS içinde görüntü netliği
- [ ] `takimlar.json` kadrolarının güncelliği (2025 sonu bilgisiyle dolduruldu)

## Bilinçli olarak yapılmayanlar
- Sahte kullanıcı adı, sahte yorum, sahte hediye yayında gösterilmez (test paneli canlı bağlantıda kapanır).
- Resmi kulüp armaları kullanılmaz; takımlar renk ve isimle ayırt edilir.

## 13. Panel ayrımı ve pavyon hareketleri
- [x] Panel yayın tipine göre ayrıldı: üstte Maç / Pavyon düğmeleri, altında yalnız o yayının bölümleri; müzik ve görüntü ortak
- [x] Pavyonun kendi hediye eşikleri (`pavyonEsik`), maçtan bağımsız
- [x] Konsla oyna: kons gelir, ışıklı pistte karşılıklı oynarlar
- [x] Sahneye çık: misafir podyuma çıkar, assolistin yanında oynar
- [x] Rolü biten misafir masasına döner; masalar iki yana dengeli dolar
- [x] Kayıtlı ayarların açılışta yüklenmemesi düzeltildi
