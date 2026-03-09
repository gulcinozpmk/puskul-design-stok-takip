// ⚠️ ESKİ KOD - ARTIK KULLANILMIYOR!
// localStorage'dan Supabase'e tek seferlik migration kodu
// Migration tamamlandı - SİLİNEBİLİR!

import { supabase } from '../supabaseClient';

// localStorage'dan verileri al
const getLocalData = () => {
  const stock = JSON.parse(localStorage.getItem('stok_takip_stock') || '[]');
  const sales = JSON.parse(localStorage.getItem('stok_takip_sales') || '[]');
  return { stock, sales };
};

// products tablosuna aktar
export const migrateProducts = async () => {
  const { stock } = getLocalData();
  
  if (stock.length === 0) {
    console.log('Aktarılacak ürün yok');
    return { success: false, message: 'Veri yok' };
  }

  try {
    // Supabase formatına çevir
    const products = stock.map(item => ({
      brand: item.brand,
      model: item.model,
      colorCode: item.colorCode,
      quantity: item.quantity || 0,
      price: item.price || 0,
    }));

    // Supabase'e ekle
    const { data, error } = await supabase
      .from('products')
      .insert(products);

    if (error) throw error;

    console.log(`✅ ${products.length} ürün aktarıldı!`);
    return { success: true, count: products.length };
  } catch (error) {
    console.error('❌ Hata:', error);
    return { success: false, error: error.message };
  }
};

// sales tablosuna aktar
export const migrateSales = async () => {
  const { sales } = getLocalData();
  
  if (sales.length === 0) {
    console.log('Aktarılacak satış yok');
    return { success: false, message: 'Veri yok' };
  }

  try {
    // Supabase formatına çevir
    const salesData = sales.map(item => ({
      brand: item.brand,
      model: item.model,
      colorCode: item.colorCode,
      amount: item.amount || 0,
      paymentType: item.paymentType || 'Nakit',
      quantity: item.quantity || 1,
      note: item.note || '',
      stockDecreased: item.stockDecreased || false,
      created_at: item.date || new Date().toISOString(),
    }));

    // Supabase'e ekle
    const { data, error } = await supabase
      .from('sales')
      .insert(salesData);

    if (error) throw error;

    console.log(`✅ ${salesData.length} satış aktarıldı!`);
    return { success: true, count: salesData.length };
  } catch (error) {
    console.error('❌ Hata:', error);
    return { success: false, error: error.message };
  }
};

// Hepsini aktar
export const migrateAll = async () => {
  console.log('🚀 Veri aktarımı başlıyor...');
  
  const productsResult = await migrateProducts();
  const salesResult = await migrateSales();
  
  return {
    products: productsResult,
    sales: salesResult,
  };
};