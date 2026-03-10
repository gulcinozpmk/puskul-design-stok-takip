import { useState, useEffect } from 'react';
import {
  addSale,
  getSales,
  getBrands,
  getModelsByBrand,
  getColorCodesByBrandModel,
  getStock,
  decreaseStock,
  updateSale,
  deleteSale
} from '../services/supabaseStorage';
import { formatCurrency, formatDate } from '../utils/helpers';
import QRScanner from './QRScanner';

export default function SalesEntry() {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [colorCodes, setColorCodes] = useState([]);
  const [selectedColorCode, setSelectedColorCode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('Nakit');
  const [note, setNote] = useState('');

  const [isOtherProduct, setIsOtherProduct] = useState(false);
  const [otherDescription, setOtherDescription] = useState('');

  const [sales, setSales] = useState([]);
  const [todaySales, setTodaySales] = useState({ total: 0, cash: 0, card: 0 });

  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrStatus, setQrStatus] = useState(null);

  // 🛒 SEPET
  const [cart, setCart] = useState([]);
  const [cartPaymentType, setCartPaymentType] = useState('Nakit');
  const [isSavingCart, setIsSavingCart] = useState(false);

  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const freshSales = await getSales();
    const freshBrands = await getBrands();
    setSales([...freshSales]);
    setBrands([...freshBrands]);
    calculateTodaySales(freshSales);
  };

  const calculateTodaySales = (salesData) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todaySalesData = salesData.filter(sale => {
      const saleDate = new Date(sale.created_at);
      const saleDateStr = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(saleDate.getDate()).padStart(2, '0')}`;
      return saleDateStr === todayStr;
    });
    const total = todaySalesData.reduce((sum, sale) => sum + parseFloat(sale.amount || 0), 0);
    const cash = todaySalesData.filter(s => s.paymentType === 'Nakit').reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    const card = todaySalesData.filter(s => s.paymentType === 'Kredi Kartı').reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
    setTodaySales({ total, cash, card });
  };

  useEffect(() => {
    const loadModels = async () => {
      if (selectedBrand) {
        const brandModels = await getModelsByBrand(selectedBrand);
        setModels(brandModels);
        setSelectedModel(prev => prev || '');
        setColorCodes([]);
        setSelectedColorCode(prev => prev || '');
        setSelectedProduct(null);
      } else {
        setModels([]); setSelectedModel(''); setColorCodes([]); setSelectedColorCode(''); setSelectedProduct(null);
      }
    };
    loadModels();
  }, [selectedBrand]);

  useEffect(() => {
    const loadColorCodes = async () => {
      if (selectedBrand && selectedModel) {
        const colors = await getColorCodesByBrandModel(selectedBrand, selectedModel);
        setColorCodes(colors);
        setSelectedColorCode(prev => prev || '');
        setSelectedProduct(null);
      } else {
        setColorCodes([]); setSelectedColorCode(''); setSelectedProduct(null);
      }
    };
    loadColorCodes();
  }, [selectedModel]);

  useEffect(() => {
    if (selectedColorCode) {
      const product = colorCodes.find(p => p.colorCode === selectedColorCode);
      setSelectedProduct(product);
      if (product?.price && product.price > 0) {
        setAmount((product.price * (parseInt(quantity) || 1)).toFixed(2));
      }
    } else {
      setSelectedProduct(null);
    }
  }, [selectedColorCode, colorCodes]);

  const handleQRScan = async (rawValue) => {
    setShowQRScanner(false);
    setQrStatus(null);
    try {
      const allStock = await getStock();
      let found = allStock.find(p => p.barcode === rawValue.trim());
      if (!found && rawValue.includes('|')) {
        const parts = rawValue.split('|');
        if (parts.length >= 3) {
          const [qrBrand, qrModel, qrColor] = parts;
          found = allStock.find(p =>
            p.brand?.toLowerCase() === qrBrand.trim().toLowerCase() &&
            p.model?.toLowerCase() === qrModel.trim().toLowerCase() &&
            p.colorCode?.toLowerCase() === qrColor.trim().toLowerCase()
          );
        }
      }
      if (!found) found = allStock.find(p => p.colorCode?.toLowerCase() === rawValue.trim().toLowerCase());

      if (found) {
        setIsOtherProduct(false);
        const brandModels = await getModelsByBrand(found.brand);
        const colors = await getColorCodesByBrandModel(found.brand, found.model);
        setModels(brandModels); setColorCodes(colors);
        setSelectedBrand(found.brand); setSelectedModel(found.model);
        setSelectedColorCode(found.colorCode); setSelectedProduct(found);
        if (found.price && found.price > 0) setAmount(found.price.toString());
        setQrStatus({ type: 'success', message: `✅ Ürün bulundu: ${found.brand} - ${found.model} - ${found.colorCode}` });
      } else {
        setQrStatus({ type: 'error', message: `❌ "${rawValue}" — stokta eşleşen ürün bulunamadı.` });
      }
    } catch (err) {
      setQrStatus({ type: 'error', message: `Hata oluştu: ${err.message}` });
    }
  };

  const resetForm = () => {
    setSelectedBrand(''); setSelectedModel(''); setSelectedColorCode('');
    setSelectedProduct(null); setQuantity(1); setAmount('');
    setNote(''); setIsOtherProduct(false); setOtherDescription(''); setQrStatus(null);
  };

  // Sepete ekle (Supabase'e yazmaz)
  const handleAddToCart = (e) => {
    e.preventDefault();
    if (isOtherProduct) {
      if (!otherDescription || !amount) { alert('Lütfen açıklama ve tutar girin!'); return; }
    } else {
      if (!selectedBrand || !selectedModel || !selectedColorCode) { alert('Lütfen ürün seçin!'); return; }
      if (!amount) { alert('Lütfen tutar girin!'); return; }
    }

    const item = {
      id: Date.now(),
      quantity: parseInt(quantity) || 1,
      amount: parseFloat(amount),
      note,
      is_other_product: isOtherProduct,
      description: isOtherProduct ? otherDescription : null,
      brand: isOtherProduct ? null : selectedBrand,
      model: isOtherProduct ? null : selectedModel,
      colorCode: isOtherProduct ? null : selectedColorCode,
    };

    setCart(prev => [...prev, item]);
    resetForm();
  };

  // Sepeti tamamla - Supabase'e kaydet
  const handleCompleteCart = async () => {
    if (cart.length === 0) return;
    if (!confirm(`${cart.length} ürün, toplam ${formatCurrency(cartTotal)} olarak kaydedilecek. Onaylıyor musunuz?`)) return;

    setIsSavingCart(true);
    try {
      for (const item of cart) {
        await addSale({ ...item, paymentType: cartPaymentType });
      }
      setCart([]);
      setCartPaymentType('Nakit');
      await loadData();
    } catch (error) {
      alert('Hata: ' + error.message);
    } finally {
      setIsSavingCart(false);
    }
  };

  const handleDecreaseStock = async (sale) => {
    if (!confirm(`${sale.brand} - ${sale.model} - ${sale.colorCode} için stoktan ${sale.quantity} adet düşülecek. Onaylıyor musunuz?`)) return;
    try {
      await decreaseStock(sale.brand, sale.model, sale.colorCode, sale.quantity);
      await updateSale(sale.id, { stockDecreased: true });
      await loadData();
      alert('Stok başarıyla düşürüldü!');
    } catch (error) { alert('Hata: ' + error.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu satışı silmek istediğinize emin misiniz?')) return;
    try { await deleteSale(id); await loadData(); }
    catch (error) { alert('Hata: ' + error.message); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Satış Girişi</h1>

      {showQRScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowQRScanner(false)} />}

      {/* Bugünkü Toplam */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Bugünkü Toplam</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(todaySales.total)}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Nakit</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(todaySales.cash)}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-sm opacity-90">Kredi Kartı</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(todaySales.card)}</p>
        </div>
      </div>

      {/* 🛒 SEPET */}
      {cart.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-amber-400 flex items-center justify-between">
            <h2 className="text-lg font-bold text-amber-900">🛒 Mevcut Müşteri Sepeti ({cart.length} ürün)</h2>
            <span className="text-2xl font-bold text-amber-900">{formatCurrency(cartTotal)}</span>
          </div>
          <div className="p-4 space-y-2">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 shadow-sm">
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    {item.is_other_product ? `🛠️ ${item.description}` : `${item.brand} - ${item.model} - ${item.colorCode}`}
                  </p>
                  {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">{item.quantity} adet</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(item.amount)}</span>
                  <button onClick={() => setCart(prev => prev.filter(i => i.id !== item.id))}
                    className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 bg-amber-50 border-t border-amber-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-amber-900">Ödeme Tipi:</span>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" value="Nakit" checked={cartPaymentType === 'Nakit'} onChange={e => setCartPaymentType(e.target.value)} className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-900">Nakit</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" value="Kredi Kartı" checked={cartPaymentType === 'Kredi Kartı'} onChange={e => setCartPaymentType(e.target.value)} className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-900">Kredi Kartı</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { if (confirm('Sepet iptal edilecek. Emin misiniz?')) setCart([]); }}
                className="px-4 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition">
                ✕ İptal Et
              </button>
              <button onClick={handleCompleteCart} disabled={isSavingCart}
                className="px-6 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition disabled:opacity-50">
                {isSavingCart ? 'Kaydediliyor...' : `✅ Satışı Tamamla (${formatCurrency(cartTotal)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ürün Ekleme Formu */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {cart.length > 0 ? '➕ Sepete Ürün Ekle' : 'Yeni Satış'}
          </h2>
          {!isOtherProduct && (
            <button type="button" onClick={() => { setQrStatus(null); setShowQRScanner(true); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 3.5V16M4 4h4v4H4V4zm12 0h4v4h-4V4zM4 16h4v4H4v-4z" />
              </svg>
              QR / Barkod Tara
            </button>
          )}
        </div>

        {qrStatus && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${qrStatus.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {qrStatus.message}
          </div>
        )}

        <form onSubmit={handleAddToCart} className="space-y-4">
          <div className="flex items-center">
            <input type="checkbox" id="isOtherProduct" checked={isOtherProduct}
              onChange={(e) => { setIsOtherProduct(e.target.checked); setQrStatus(null); }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <label htmlFor="isOtherProduct" className="ml-2 text-sm font-medium text-gray-700">
              ☑️ Diğer Ürünler (Stoksuz - Şiş, Tığ, Çanta Sapı vb.)
            </label>
          </div>

          {!isOtherProduct ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marka *</label>
                  <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                    <option value="">Marka Seçin</option>
                    {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                  <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={!selectedBrand} required>
                    <option value="">Model Seçin</option>
                    {models.map(model => <option key={model} value={model}>{model}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Renk Kodu *</label>
                  <select value={selectedColorCode} onChange={(e) => setSelectedColorCode(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" disabled={!selectedModel} required>
                    <option value="">Renk Kodu Seçin</option>
                    {colorCodes.map(item => <option key={item.id} value={item.colorCode}>{item.colorCode} - Stok: {item.quantity}</option>)}
                  </select>
                </div>
              </div>
              {selectedProduct && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800">Seçili Ürün</p>
                  <p className="text-lg font-semibold text-blue-900 mt-1">{selectedBrand} - {selectedModel} - {selectedColorCode}</p>
                  <p className="text-sm text-blue-700 mt-1">Mevcut Stok: <span className="font-bold text-red-600">{selectedProduct.quantity}</span></p>
                </div>
              )}
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama *</label>
              <input type="text" value={otherDescription} onChange={(e) => setOtherDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Örn: 2 adet - çanta sapı" required />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Miktar *</label>
              <input type="number" min="1" value={quantity}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuantity(val);
                  const qty = parseInt(val) || 1;
                  if (selectedProduct?.price && selectedProduct.price > 0) setAmount((selectedProduct.price * qty).toFixed(2));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="1" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tutar (₺) *</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="0.00" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Not (Opsiyonel)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Not ekleyin..." />
            </div>
          </div>

          <button type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-lg transition">
            🛒 Sepete Ekle
          </button>
        </form>
      </div>

      {/* Son Satışlar */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Son Satışlar</h2>
        </div>
        {sales.length === 0 ? (
          <p className="text-gray-500 text-center py-12">Henüz satış kaydı yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tarih</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ürün</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Miktar</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Tutar</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Ödeme</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale, index) => (
                  <tr key={sale.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 text-sm text-gray-600">{formatDate(sale.created_at)}</td>
                    <td className="py-3 px-4 text-sm">
                      {sale.is_other_product
                        ? <span className="text-purple-700 font-medium">🛠️ {sale.description}</span>
                        : <span className="text-gray-800 font-medium">{sale.brand} - {sale.model} - {sale.colorCode}</span>}
                      {sale.note && <p className="text-xs text-gray-500 mt-1">{sale.note}</p>}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-gray-800">{sale.quantity}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(sale.amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sale.paymentType === 'Nakit' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                        {sale.paymentType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {!sale.is_other_product && (
                          sale.stockDecreased
                            ? <span className="text-green-600 text-xl font-bold" title="Stok düşürüldü">✓</span>
                            : <button onClick={() => handleDecreaseStock(sale)}
                                className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition" title="Stoktan Düş">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              </button>
                        )}
                        <button onClick={() => handleDelete(sale.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition" title="Sil">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}