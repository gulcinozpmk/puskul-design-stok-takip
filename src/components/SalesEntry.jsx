import { useState, useEffect } from 'react';
import {
  addSale,
  getSales,
  getBrands,
  getModelsByBrand,
  getColorCodesByBrandModel,
  decreaseStock,
  updateSale,
  deleteSale
} from '../services/supabaseStorage';
import { formatCurrency, formatDate } from '../utils/helpers';

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

  // STOKSUZ ÜRÜNLER
  const [isOtherProduct, setIsOtherProduct] = useState(false);
  const [otherDescription, setOtherDescription] = useState('');

  const [sales, setSales] = useState([]);
  const [todaySales, setTodaySales] = useState({ total: 0, cash: 0, card: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const freshSales = await getSales();
    const freshBrands = await getBrands();
    setSales([...freshSales]);
    setBrands([...freshBrands]);
    calculateTodaySales(freshSales);
  };

  const calculateTodaySales = (salesData) => {
    const today = new Date().toISOString().split('T')[0];
    const todaySalesData = salesData.filter(sale => {
      const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
      return saleDate === today;
    });

    const total = todaySalesData.reduce((sum, sale) => sum + parseFloat(sale.amount || 0), 0);
    const cash = todaySalesData
      .filter(sale => sale.paymentType === 'Nakit')
      .reduce((sum, sale) => sum + parseFloat(sale.amount || 0), 0);
    const card = todaySalesData
      .filter(sale => sale.paymentType === 'Kredi Kartı')
      .reduce((sum, sale) => sum + parseFloat(sale.amount || 0), 0);

    setTodaySales({ total, cash, card });
  };

  // Marka seçildiğinde modelleri getir
  useEffect(() => {
    const loadModels = async () => {
      if (selectedBrand) {
        const brandModels = await getModelsByBrand(selectedBrand);
        setModels(brandModels);
        setSelectedModel('');
        setColorCodes([]);
        setSelectedColorCode('');
        setSelectedProduct(null);
      } else {
        setModels([]);
        setSelectedModel('');
        setColorCodes([]);
        setSelectedColorCode('');
        setSelectedProduct(null);
      }
    };
    loadModels();
  }, [selectedBrand]);

  // Model seçildiğinde renk kodlarını getir
  useEffect(() => {
    const loadColorCodes = async () => {
      if (selectedBrand && selectedModel) {
        const colors = await getColorCodesByBrandModel(selectedBrand, selectedModel);
        setColorCodes(colors);
        setSelectedColorCode('');
        setSelectedProduct(null);
      } else {
        setColorCodes([]);
        setSelectedColorCode('');
        setSelectedProduct(null);
      }
    };
    loadColorCodes();
  }, [selectedModel]);

  // Renk kodu seçildiğinde ürünü bul
  useEffect(() => {
    if (selectedColorCode) {
      const product = colorCodes.find(p => p.colorCode === selectedColorCode);
      setSelectedProduct(product);
    } else {
      setSelectedProduct(null);
    }
  }, [selectedColorCode, colorCodes]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasyon
    if (isOtherProduct) {
      // STOKSUZ ÜRÜN
      if (!otherDescription || !amount) {
        alert('Lütfen açıklama ve tutar girin!');
        return;
      }
    } else {
      // NORMAL ÜRÜN
      if (!selectedBrand || !selectedModel || !selectedColorCode) {
        alert('Lütfen ürün seçin!');
        return;
      }
      if (!amount) {
        alert('Lütfen tutar girin!');
        return;
      }
    }

    try {
      const saleData = {
        quantity: parseInt(quantity),
        amount: parseFloat(amount),
        paymentType,
        note,
        is_other_product: isOtherProduct,
      };

      if (isOtherProduct) {
        // STOKSUZ ÜRÜN
        saleData.description = otherDescription;
      } else {
        // NORMAL ÜRÜN
        saleData.brand = selectedBrand;
        saleData.model = selectedModel;
        saleData.colorCode = selectedColorCode;
      }

      await addSale(saleData);
      await loadData();

      // Formu temizle
      if (isOtherProduct) {
        setOtherDescription('');
      } else {
        setSelectedBrand('');
        setSelectedModel('');
        setSelectedColorCode('');
        setSelectedProduct(null);
      }
      setQuantity(1);
      setAmount('');
      setPaymentType('Nakit');
      setNote('');

      alert('Satış başarıyla kaydedildi!');
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  const handleDecreaseStock = async (sale) => {
    if (!confirm(`${sale.brand} - ${sale.model} - ${sale.colorCode} için stoktan ${sale.quantity} adet düşülecek. Onaylıyor musunuz?`)) {
      return;
    }

    try {
      await decreaseStock(sale.brand, sale.model, sale.colorCode, sale.quantity);
      await updateSale(sale.id, { stockDecreased: true });
      await loadData();
      alert('Stok başarıyla düşürüldü!');
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu satışı silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      await deleteSale(id);
      await loadData();
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Satış Girişi</h1>

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

      {/* Yeni Satış Formu */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Yeni Satış</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Diğer Ürünler Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isOtherProduct"
              checked={isOtherProduct}
              onChange={(e) => setIsOtherProduct(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isOtherProduct" className="ml-2 text-sm font-medium text-gray-700">
              ☑️ Diğer Ürünler (Stoksuz - Şiş, Tığ, Çanta Sapı vb.)
            </label>
          </div>

          {!isOtherProduct ? (
            // NORMAL ÜRÜN FORMU
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Marka */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marka *</label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Marka Seçin</option>
                    {brands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!selectedBrand}
                    required
                  >
                    <option value="">Model Seçin</option>
                    {models.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>

                {/* Renk Kodu */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Renk Kodu *</label>
                  <select
                    value={selectedColorCode}
                    onChange={(e) => setSelectedColorCode(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!selectedModel}
                    required
                  >
                    <option value="">Renk Kodu Seçin</option>
                    {colorCodes.map(item => (
                      <option key={item.id} value={item.colorCode}>
                        {item.colorCode} - Stok: {item.quantity}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Seçili Ürün */}
              {selectedProduct && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-800">Seçili Ürün</p>
                  <p className="text-lg font-semibold text-blue-900 mt-1">
                    {selectedBrand} - {selectedModel} - {selectedColorCode}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Mevcut Stok: <span className="font-bold text-red-600">{selectedProduct.quantity}</span>
                  </p>
                </div>
              )}
            </>
          ) : (
            // STOKSUZ ÜRÜN FORMU
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama *</label>
              <input
                type="text"
                value={otherDescription}
                onChange={(e) => setOtherDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: 2 adet - çanta sapı"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Ürün adı ve adedini yazın (Örn: 3 adet - şiş 5mm)</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Miktar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Miktar *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1"
                required
              />
            </div>

            {/* Tutar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tutar (₺) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>

            {/* Ödeme Tipi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ödeme Tipi</label>
              <div className="flex gap-4 items-center h-[42px]">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="Nakit"
                    checked={paymentType === 'Nakit'}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Nakit</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    value="Kredi Kartı"
                    checked={paymentType === 'Kredi Kartı'}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Kredi Kartı</span>
                </label>
              </div>
            </div>
          </div>

          {/* Not */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Not (Opsiyonel)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Satış hakkında not ekleyin..."
              rows="2"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200"
          >
            + Yeni Ürün Ekle
          </button>
        </form>
      </div>

      {/* Satış Listesi */}
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
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(sale.created_at)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {sale.is_other_product ? (
                        <span className="text-purple-700 font-medium">
                          🛠️ {sale.description}
                        </span>
                      ) : (
                        <span className="text-gray-800 font-medium">
                          {sale.brand} - {sale.model} - {sale.colorCode}
                        </span>
                      )}
                      {sale.note && (
                        <p className="text-xs text-gray-500 mt-1">{sale.note}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-gray-800">
                      {sale.quantity}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(sale.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${sale.paymentType === 'Nakit'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                        }`}>
                        {sale.paymentType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Stoktan Düş Butonu - Sadece normal ürünlerde */}
                        {!sale.is_other_product && (
                          sale.stockDecreased ? (
                            <span className="text-green-600 text-xl font-bold" title="Stok düşürüldü">✓</span>
                          ) : (
                            <button
                              onClick={() => handleDecreaseStock(sale)}
                              className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded transition"
                              title="Stoktan Düş"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                          )
                        )}

                        {/* Sil Butonu */}
                        <button
                          onClick={() => handleDelete(sale.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition"
                          title="Sil"
                        >
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