# Chrome Web Store listing

Copy these into the Developer Dashboard. Everything here describes version 1.6.2.

## Package

- Upload: `store/tetik-1.6.2.zip` (built with `store/build.sh`)
- Category: Tools (under Productivity)
- Language: English (add Turkish as a second listing language)

## Store listing — English

**Name**

Tetik

**Summary** (132 characters max)

Keyboard and mouse for Xbox Remote Play and Cloud Gaming, with on-foot and vehicle profiles and consistent mouse aim.

**Description**

Tetik lets you play Xbox Remote Play and Xbox Cloud Gaming in the browser with a keyboard and mouse. It shows the page a virtual controller and turns your input into stick and button state.

It was built for one problem: in games like GTA, W has to mean "left stick forward" on foot and "right trigger" in a car. A plain key mapper cannot know which one you need.

FEATURES
• On-foot and vehicle profiles, each with its own key bindings, mouse sensitivity and steering ramp
• Automatic vehicle detection in GTA VI: the profile switches when you actually sit in a vehicle, not when you pick up an item with the same button
• Consistent mouse aim: the same hand movement gives the same turn angle
• Measured stick response curves for GTA VI, with separate curves for looking and aiming
• Raw mouse input, bypassing operating system pointer acceleration
• In-page settings panel; settings can be exported and imported

HOW TO USE
1. Open xbox.com/play or play.xbox.com and start a stream.
2. Press F3 to start capture. Press F3 again to get your mouse back; the controller stays connected.
3. Press F to enter or leave a vehicle. Keys 1 and 2 force the on-foot or vehicle profile.
4. Alt+R reconnects the virtual controller if the game reports a disconnected controller.

GOOD TO KNOW
• The settings panel is currently in Turkish.
• The measured curves and the vehicle detection are specific to GTA VI with particular in-game controller settings. For other games, turn the measured curve off and use the manual sliders.
• Disable other keyboard-and-mouse extensions for Xbox streaming; two of them conflict.
• Stream latency is not reduced, and the game's maximum turn rate still applies.

USE AT YOUR OWN RISK
Emulating a controller with a keyboard and mouse may be against the terms of the streaming service or of a particular game, and some online games treat it as an unfair advantage. Tetik is intended for single-player use. You are responsible for how you use it.

PRIVACY
Tetik makes no network requests and collects no data. Settings stay in your browser.

Open source (MIT): https://github.com/rudeboy53/tetik

Unofficial. Not affiliated with, endorsed by, or connected to Microsoft, Xbox, or Rockstar Games. All trademarks belong to their owners.

## Store listing — Türkçe

**Özet**

Xbox Remote Play ve Cloud Gaming için klavye-mouse: yaya ve araç profilleri, tutarlı mouse nişanı.

**Açıklama**

Tetik, Xbox Remote Play ve Xbox Cloud Gaming'i tarayıcıda klavye ve mouse ile oynamanı sağlar. Sayfaya sanal bir kumanda gösterir ve girdini stick ve düğme durumuna çevirir.

Tek bir sorunu çözmek için yazıldı: GTA gibi oyunlarda W tuşu yürürken "sol stick ileri", arabadayken "sağ tetik" olmalı. Düz bir tuş eşleyici hangisine ihtiyacın olduğunu bilemez.

ÖZELLİKLER
• Yaya ve araç profilleri; her birinin kendi tuşları, mouse hassasiyeti ve direksiyon yumuşatması var
• GTA VI'da otomatik araç algılama: profil, aynı tuşla eşya topladığında değil, araca gerçekten oturduğunda değişir
• Tutarlı mouse nişanı: aynı el hareketi aynı dönüş açısını verir
• GTA VI için ölçülmüş stick tepki eğrileri; bakış ve nişan için ayrı eğriler
• Ham mouse girdisi; işletim sisteminin imleç ivmesi devre dışı kalır
• Sayfa içi ayar paneli; ayarlar dışa ve içe aktarılabilir

NASIL KULLANILIR
1. xbox.com/play ya da play.xbox.com adresini aç ve yayını başlat.
2. Yakalamayı başlatmak için F3'e bas. Tekrar F3'e basınca mouse sana döner; kumanda bağlı kalır.
3. Araca binmek ya da inmek için F'ye bas. 1 ve 2 tuşları yaya ya da araç profiline zorlar.
4. Oyun kumandanın bağlı olmadığını söylerse Alt+R sanal kumandayı yeniden bağlar.

BİLMEN GEREKENLER
• Ölçülmüş eğriler ve araç algılama, belirli oyun içi kumanda ayarlarıyla GTA VI'ya özeldir. Başka oyunlarda ölçülmüş eğriyi kapatıp elle ayar kaydırıcılarını kullan.
• Xbox yayını için başka klavye-mouse eklentisi kullanıyorsan kapat; ikisi çakışır.
• Yayın gecikmesi azalmaz ve oyunun azami dönüş hızı geçerliliğini korur.

SORUMLULUK SENDE
Klavye ve mouse ile kumanda taklidi, yayın hizmetinin ya da belirli bir oyunun kullanım koşullarına aykırı olabilir; bazı çevrimiçi oyunlar bunu haksız avantaj sayar. Tetik tek oyunculu kullanım için tasarlandı. Nasıl kullandığın senin sorumluluğundadır.

GİZLİLİK
Tetik ağ isteği yapmaz ve veri toplamaz. Ayarlar tarayıcında kalır.

Açık kaynak (MIT): https://github.com/rudeboy53/tetik

Resmî değildir. Microsoft, Xbox ya da Rockstar Games ile hiçbir bağlantısı yoktur. Tüm markalar sahiplerine aittir.

## Graphics

- Store icon 128×128: `icons/icon128.png`
- Screenshots 1280×800: `store/screenshots/panel-1280x800.jpg`, `mouse-1280x800.jpg`, `drive-1280x800.jpg`
- Small promo tile 440×280: `store/promo-440x280.jpg`

## Privacy practices tab

**Single purpose**

Lets the user play Xbox Remote Play and Xbox Cloud Gaming in the browser with a keyboard and mouse by presenting a virtual game controller to the streaming page.

**Permission justification — host permissions (content script on www.xbox.com and play.xbox.com)**

The extension only works on the Xbox streaming pages. Its content script must run in those pages to wrap navigator.getGamepads() and supply the virtual controller state, to capture keyboard and mouse input while the stream is focused, and to draw its settings panel over the stream. It does not run on any other site and requests no other permissions.

**Remote code**

No, I am not using remote code. All scripts are included in the package.

**Data usage**

Check none of the data categories. The extension does not collect or transmit user data. Then tick the three certification boxes.

**Privacy policy URL**

https://github.com/rudeboy53/tetik/blob/main/PRIVACY.md

## Distribution

- Visibility: Public
- Regions: All regions
- Pricing: Free
