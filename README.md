# 🧶 İplik Dükkanı - Stok Takip Sistemi

Modern, kullanıcı dostu bir stok ve satış takip uygulaması.

## ✨ Özellikler

### Mevcut Özellikler (Faz 1)
- ✅ **Dashboard**: Günlük satış ve stok özetleri
- ✅ **Satış Girişi**: Nakit ve kredi kartı ile satış kaydı
- ✅ **Stok Yönetimi**: Marka, model, renk bazlı stok takibi
- ✅ **Raporlar**: Günlük ve aylık satış raporları

### Gelecek Özellikler
- 🔄 QR kod ile ürün okuma
- 🔄 Excel import/export
- 🔄 Gelişmiş grafikler ve istatistikler
- 🔄 Barkod yazdırma

## 🚀 Kurulum

### 1. Gereksinimler
- Node.js (v16 veya üzeri)
- npm veya yarn

### 2. Projeyi Klonlayın
\`\`\`bash
git clone [repo-url]
cd stok-takip-v2
\`\`\`

### 3. Bağımlılıkları Yükleyin
\`\`\`bash
npm install
\`\`\`

### 4. Uygulamayı Başlatın
\`\`\`bash
npm run dev
\`\`\`

Uygulama otomatik olarak tarayıcıda açılacak: http://localhost:3000

## 📱 Kullanım

### Satış Girişi
1. "Satış Girişi" sekmesine gidin
2. Nakit ve/veya kredi kartı tutarını girin
3. İsteğe bağlı not ekleyin
4. "Satışı Kaydet" butonuna tıklayın

### Stok Yönetimi
1. "Stok Yönetimi" sekmesine gidin
2. "Yeni Marka" ile yeni marka ekleyin (isteğe bağlı)
3. "Yeni Ürün" ile ürün bilgilerini girin:
   - Marka seçin
   - Model, renk, renk kodu girin
   - Miktar ve birim fiyat girin
4. Arama ve filtreleme ile ürünleri kolayca bulun

### Raporlar
1. "Raporlar" sekmesine gidin
2. Ay ve yıl seçin
3. Günlük satışları ve istatistikleri görüntüleyin

## 💾 Veri Saklama

Uygulama localStorage kullanarak verileri tarayıcıda saklar:
- Satış kayıtları
- Stok bilgileri
- Marka listesi

**Önemli:** Tarayıcı verilerini temizlerseniz tüm kayıtlar silinir. İlerleyen versiyonlarda Excel export özelliği ile yedekleme yapabileceksiniz.

## 🛠️ Teknolojiler

- **React 18**: Modern UI framework
- **Vite**: Hızlı geliştirme ortamı
- **Tailwind CSS**: Utility-first CSS framework
- **localStorage**: Veri saklama

## 📂 Proje Yapısı

\`\`\`
stok-takip-v2/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── SalesEntry.jsx
│   │   ├── StockManagement.jsx
│   │   └── Reports.jsx
│   ├── services/
│   │   └── storage.js
│   ├── utils/
│   │   └── helpers.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
\`\`\`

## 🐛 Sorun Giderme

### Uygulama başlamıyor
\`\`\`bash
# Node modules'ı temizle ve yeniden yükle
rm -rf node_modules package-lock.json
npm install
npm run dev
\`\`\`

### Tailwind CSS çalışmıyor
\`\`\`bash
# Tailwind'i yeniden derle
npx tailwindcss init -p
npm run dev
\`\`\`

## 📝 Lisans

Bu proje özel kullanım içindir.

## 👥 Katkıda Bulunanlar

- Gülçin - Geliştirici

---

**Not**: Bu uygulama aktif geliştirme aşamasındadır. Yeni özellikler düzenli olarak eklenmektedir.
