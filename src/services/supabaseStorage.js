import { supabase } from './supabaseClient';

// ============= PRODUCTS (Stok) =============

export const getStock = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('brand', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getStock error:', error);
    return [];
  }
};

export const addStock = async (product) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        brand: product.brand,
        model: product.model,
        colorCode: product.colorCode,
        quantity: product.quantity || 0,
        price: product.price || 0,
      }])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('addStock error:', error);
    throw error;
  }
};

export const updateStock = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('updateStock error:', error);
    throw error;
  }
};

export const deleteStock = async (id) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('deleteStock error:', error);
    throw error;
  }
};

export const decreaseStock = async (brand, model, colorCode, quantity) => {
  try {
    console.log('🔍 Stok düşürülecek:', { brand, model, colorCode, quantity });

    // Ürünü bul
    const { data: products, error: findError } = await supabase
      .from('products')
      .select('*')
      .eq('brand', brand)
      .eq('model', model)
      .eq('colorCode', colorCode);

    if (findError) {
      console.error('❌ Ürün bulunamadı hatası:', findError);
      throw findError;
    }

    console.log('📦 Bulunan ürünler:', products);

    if (!products || products.length === 0) {
      throw new Error('Ürün bulunamadı!');
    }

    const product = products[0];

    console.log('✅ Bulundu! Mevcut stok:', product.quantity);

    // Stok kontrolü
    if (product.quantity < quantity) {
      throw new Error(`Yetersiz stok! Mevcut: ${product.quantity}, İstenen: ${quantity}`);
    }

    // Stok azalt
    const newQuantity = product.quantity - quantity;

    const { data, error } = await supabase
      .from('products')
      .update({ quantity: newQuantity })
      .eq('id', product.id)
      .select();

    if (error) {
      console.error('❌ Güncelleme hatası:', error);
      throw error;
    }

    console.log('✅ Stok düşürüldü! Yeni stok:', newQuantity);

    return data[0];
  } catch (error) {
    console.error('❌ decreaseStock error:', error);
    throw error;
  }
};

// ============= SALES (Satışlar) =============

export const getSales = async () => {
  try {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // created_at'i date formatına çevir
    return (data || []).map(sale => ({
      ...sale,
      date: sale.created_at,
    }));
  } catch (error) {
    console.error('getSales error:', error);
    return [];
  }
};

export const addSale = async (sale) => {
  try {
    const saleData = {
      amount: sale.amount,
      paymentType: sale.paymentType,
      quantity: sale.quantity || 1,
      note: sale.note || '',
      stockDecreased: false,
    };

    // Diğer ürün mü yoksa normal ürün mü?
    if (sale.is_other_product) {
      // STOKSUZ ÜRÜN
      saleData.is_other_product = true;
      saleData.description = sale.description || '';
      saleData.brand = null;
      saleData.model = null;
      saleData.colorCode = null;
    } else {
      // NORMAL ÜRÜN
      saleData.is_other_product = false;
      saleData.description = null;
      saleData.brand = sale.brand;
      saleData.model = sale.model;
      saleData.colorCode = sale.colorCode;
    }

    const { data, error } = await supabase
      .from('sales')
      .insert([saleData])
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('addSale error:', error);
    throw error;
  }
};

export const updateSale = async (id, updates) => {
  try {
    console.log('🔄 Satış güncelleniyor:', id, updates);

    const { data, error } = await supabase
      .from('sales')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    console.log('✅ Satış güncellendi:', data[0]);

    return data[0];
  } catch (error) {
    console.error('updateSale error:', error);
    throw error;
  }
};

export const deleteSale = async (id) => {
  try {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id);

    if (error) throw error;

    console.log('🗑️ Satış silindi:', id);

    return true;
  } catch (error) {
    console.error('deleteSale error:', error);
    throw error;
  }
};

// ============= BRANDS (Markalar) =============

export const getBrands = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('brand');

    if (error) throw error;

    const uniqueBrands = [...new Set(data.map(item => item.brand))];
    return uniqueBrands.sort();
  } catch (error) {
    console.error('getBrands error:', error);
    return [];
  }
};

export const addBrand = async (brandName) => {
  console.log('Brand ekleme için ürün ekleyin:', brandName);
  return true;
};

// ============= MODELS (Modeller) =============

export const getModelsByBrand = async (brandName) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('model')
      .eq('brand', brandName);

    if (error) throw error;

    const uniqueModels = [...new Set(data.map(item => item.model))];
    return uniqueModels.sort();
  } catch (error) {
    console.error('getModelsByBrand error:', error);
    return [];
  }
};

// ============= COLOR CODES (Renk Kodları) =============

export const getColorCodesByBrandModel = async (brandName, modelName) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('brand', brandName)
      .eq('model', modelName)
      .order('colorCode', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getColorCodesByBrandModel error:', error);
    return [];
  }
};
// ============= BARCODE (Barkod) =============

export const getProductByBarcode = async (barcode) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', barcode)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    console.error('getProductByBarcode error:', error);
    return null;
  }
};