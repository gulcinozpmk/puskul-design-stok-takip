// ⚠️ ESKİ KOD - ARTIK KULLANILMIYOR!
// localStorage kullanan eski sistem
// Supabase'e geçildi (supabaseStorage.js kullanılıyor)
// Referans için saklanıyor - SİLİNEBİLİR!
// localStorage yönetimi için yardımcı fonksiyonlar

const STORAGE_KEYS = {
  SALES: 'stok_takip_sales',
  STOCK: 'stok_takip_stock',
  BRANDS: 'stok_takip_brands',
};

// Satışları getir
export const getSales = () => {
  try {
    const sales = localStorage.getItem(STORAGE_KEYS.SALES);
    return sales ? JSON.parse(sales) : [];
  } catch (error) {
    console.error('Satışlar yüklenirken hata:', error);
    return [];
  }
};

// Yeni satış ekle
export const addSale = (sale) => {
  try {
    const sales = getSales();
    const newSale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...sale,
    };
    sales.push(newSale);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));

    // Dashboard'ı bilgilendir
    window.dispatchEvent(new Event('stockUpdated'));

    return newSale;
  } catch (error) {
    console.error('Satış eklenirken hata:', error);
    throw error;
  }
};

// Satış sil
export const deleteSale = (id) => {
  try {
    const sales = getSales();
    const filtered = sales.filter(sale => sale.id !== id);
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Satış silinirken hata:', error);
    return false;
  }
};

// Stokları getir
export const getStock = () => {
  try {
    const stock = localStorage.getItem(STORAGE_KEYS.STOCK);
    return stock ? JSON.parse(stock) : [];
  } catch (error) {
    console.error('Stoklar yüklenirken hata:', error);
    return [];
  }
};

// Yeni stok ürünü ekle
export const addStockItem = (item) => {
  try {
    const stock = getStock();
    const newItem = {
      id: Date.now().toString(),
      ...item,
    };
    stock.push(newItem);
    localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stock));
    return newItem;
  } catch (error) {
    console.error('Stok eklenirken hata:', error);
    throw error;
  }
};

// Stok güncelle
export const updateStockItem = (id, updates) => {
  try {
    const stock = getStock();
    const index = stock.findIndex(item => item.id === id);
    if (index !== -1) {
      stock[index] = { ...stock[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stock));
      return stock[index];
    }
    return null;
  } catch (error) {
    console.error('Stok güncellenirken hata:', error);
    throw error;
  }
};

// Stok sil
export const deleteStockItem = (id) => {
  try {
    const stock = getStock();
    const filtered = stock.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Stok silinirken hata:', error);
    return false;
  }
};

// Stoktan düş (satış yapınca)
export const decreaseStock = (brand, model, colorCode, quantity) => {
  try {
    const stock = getStock();
    const item = stock.find(
      s => s.brand === brand && s.model === model && s.colorCode === colorCode
    );

    if (!item) {
      throw new Error('Ürün bulunamadı!');
    }

    if (item.quantity < quantity) {
      throw new Error(`Yetersiz stok! Mevcut: ${item.quantity}, İstenen: ${quantity}`);
    }

    item.quantity -= quantity;
    localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stock));

    // EVENT FIRLAT - EKLE!
    window.dispatchEvent(new Event('stockUpdated'));

    return item;
  } catch (error) {
    throw error;
  }
};

// Stok artır (alım yapınca)
export const increaseStock = (brand, model, colorCode, quantity) => {
  try {
    const stock = getStock();
    const item = stock.find(
      s => s.brand === brand &&
        s.model === model &&
        s.colorCode === colorCode
    );

    if (item) {
      // Ürün varsa miktarı artır
      item.quantity += quantity;
      localStorage.setItem(STORAGE_KEYS.STOCK, JSON.stringify(stock));
      return item;
    } else {
      // Ürün yoksa hata ver
      throw new Error('Ürün stokta bulunamadı! Önce ürünü stok yönetiminden ekleyin.');
    }
  } catch (error) {
    console.error('Stok artırılırken hata:', error);
    throw error;
  }
};

// Markaları getir
export const getBrands = () => {
  try {
    const brands = localStorage.getItem(STORAGE_KEYS.BRANDS);
    return brands ? JSON.parse(brands) : []; // ← Boş array
  } catch (error) {
    console.error('Markalar yüklenirken hata:', error);
    return [];
  }
};

// Marka ekle
export const addBrand = (brandName) => {
  try {
    const brands = getBrands();
    if (!brands.includes(brandName)) {
      brands.push(brandName);
      localStorage.setItem(STORAGE_KEYS.BRANDS, JSON.stringify(brands));
    }
    return brands;
  } catch (error) {
    console.error('Marka eklenirken hata:', error);
    throw error;
  }
};

// Belirli bir markaya ait modelleri getir
export const getModelsByBrand = (brand) => {
  const stock = getStock();
  const models = [...new Set(stock
    .filter(item => item.brand === brand)
    .map(item => item.model))];
  return models;
};

// Belirli marka ve modele ait renk kodlarını getir
export const getColorCodesByBrandModel = (brand, model) => {
  const stock = getStock();
  const items = stock.filter(item =>
    item.brand === brand && item.model === model
  );
  return items.map(item => ({
    colorCode: item.colorCode,
    color: item.color,
    quantity: item.quantity,
    id: item.id
  }));
};

// Tüm verileri temizle (dikkatli kullan!)
export const clearAllData = () => {
  if (confirm('Tüm veriler silinecek! Emin misiniz?')) {
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.STOCK);
    localStorage.removeItem(STORAGE_KEYS.BRANDS);
    return true;
  }
  return false;
};