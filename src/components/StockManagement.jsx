import { useState, useEffect } from 'react';
import {
  getStock,
  addStock,
  updateStock,
  deleteStock,
  getBrands,
  addBrand,
  getModelsByBrand,
  getColorCodesByBrandModel
} from '../services/supabaseStorage';
import { formatCurrency } from '../utils/helpers';
import ExcelImport from './ExcelImport';
import QRScanner from './QRScanner';

export default function StockManagement() {
  const [activeTab, setActiveTab] = useState('existing');
  const [stock, setStock] = useState([]);
  const [brands, setBrands] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [availableFilterModels, setAvailableFilterModels] = useState([]);

  // Mevcut Ürün için
  const [selectedBrand, setSelectedBrand] = useState('');
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [colorCodes, setColorCodes] = useState([]);
  const [selectedColorCode, setSelectedColorCode] = useState('');
  const [quantityChange, setQuantityChange] = useState('');
  const [operation, setOperation] = useState('add');

  // Yeni Ürün için
  const [newProduct, setNewProduct] = useState({
    brand: '', model: '', colorCode: '', quantity: '', price: '', barcode: '',
  });

  //Fiayt Güncelleme için
  const [priceUpdateBrand, setPriceUpdateBrand] = useState('');
  const [priceUpdateModel, setPriceUpdateModel] = useState('');
  const [priceUpdateModels, setPriceUpdateModels] = useState([]);
  //const [newPrice, setNewPrice] = useState(''); -- bu tekli fiyat güncelleme içindi değiştirdik.
  const [newPrices, setNewPrices] = useState({});

  // Barkod düzenleme
  const [editingBarcode, setEditingBarcode] = useState(null); // { id, barcode }
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [barcodeScanTarget, setBarcodeScanTarget] = useState(null); // 'new' veya item.id

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const freshStock = await getStock();
    const freshBrands = await getBrands();
    setStock([...freshStock]);
    setBrands([...freshBrands]);
  };

  useEffect(() => {
    const loadFilterModels = async () => {
      if (filterBrand) {
        const brandModels = await getModelsByBrand(filterBrand);
        setAvailableFilterModels(brandModels);
        setFilterModel('');
      } else {
        setAvailableFilterModels([]);
        setFilterModel('');
      }
    };
    loadFilterModels();
  }, [filterBrand]);

  useEffect(() => {
    const loadModels = async () => {
      if (selectedBrand) {
        const brandModels = await getModelsByBrand(selectedBrand);
        setModels(brandModels);
        setSelectedModel(''); setColorCodes([]); setSelectedColorCode('');
      } else {
        setModels([]); setSelectedModel(''); setColorCodes([]); setSelectedColorCode('');
      }
    };
    loadModels();
  }, [selectedBrand]);

  useEffect(() => {
    const loadColorCodes = async () => {
      if (selectedBrand && selectedModel) {
        const colors = await getColorCodesByBrandModel(selectedBrand, selectedModel);
        setColorCodes(colors); setSelectedColorCode('');
      } else {
        setColorCodes([]); setSelectedColorCode('');
      }
    };
    loadColorCodes();
  }, [selectedModel]);

  // Fiyat güncelleme
  useEffect(() => {
    const loadPriceModels = async () => {
      if (priceUpdateBrand) {
        const brandModels = await getModelsByBrand(priceUpdateBrand);
        setPriceUpdateModels(brandModels);
        setPriceUpdateModel('');
        setNewPrices({}); // Marka değişince sıfırla
      } else {
        setPriceUpdateModels([]);
        setPriceUpdateModel('');
        setNewPrices({});
      }
    };
    loadPriceModels();
  }, [priceUpdateBrand]);

  // Barkod tarama sonucu
  const handleBarcodeScan = (rawValue) => {
    setShowBarcodeScanner(false);
    if (barcodeScanTarget === 'new') {
      setNewProduct(prev => ({ ...prev, barcode: rawValue }));
    } else if (barcodeScanTarget !== null) {
      setEditingBarcode({ id: barcodeScanTarget, barcode: rawValue });
    }
    setBarcodeScanTarget(null);
  };

  // Barkod kaydet
  const handleSaveBarcode = async (itemId) => {
    try {
      await updateStock(itemId, { barcode: editingBarcode.barcode });
      await loadData();
      setEditingBarcode(null);
      alert('Barkod kaydedildi!');
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  const handleExistingProductUpdate = async (e) => {
    e.preventDefault();
    if (!selectedBrand || !selectedModel || !selectedColorCode) {
      alert('Lütfen ürün seçin!'); return;
    }
    const qty = parseInt(quantityChange);
    if (qty <= 0) { alert('Miktar 0\'dan büyük olmalıdır!'); return; }

    try {
      const stockData = await getStock();
      const stockItem = stockData.find(
        s => s.brand === selectedBrand && s.model === selectedModel && s.colorCode === selectedColorCode
      );
      if (!stockItem) { alert('Ürün bulunamadı!'); return; }

      let newQuantity = operation === 'add'
        ? stockItem.quantity + qty
        : stockItem.quantity - qty;

      if (newQuantity < 0) { alert('Stok miktarı negatif olamaz!'); return; }

      await updateStock(stockItem.id, { quantity: newQuantity });
      await loadData();
      setSelectedBrand(''); setSelectedModel(''); setSelectedColorCode('');
      setQuantityChange(''); setOperation('add');
      alert(`Stok başarıyla ${operation === 'add' ? 'artırıldı' : 'azaltıldı'}!`);
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  const handleNewProductSubmit = async (e) => {
    e.preventDefault();
    if (!newProduct.brand || !newProduct.model || !newProduct.colorCode || !newProduct.quantity) {
      alert('Lütfen tüm zorunlu alanları doldurun!'); return;
    }
    try {
      const currentBrands = await getBrands();
      if (!currentBrands.includes(newProduct.brand)) await addBrand(newProduct.brand);

      const stockData = await getStock();
      const existingProduct = stockData.find(
        item => item.brand === newProduct.brand && item.model === newProduct.model && item.colorCode === newProduct.colorCode
      );

      if (existingProduct) {
        const newQuantity = existingProduct.quantity + parseInt(newProduct.quantity);
        await updateStock(existingProduct.id, { quantity: newQuantity });
        alert(`Mevcut ürünün miktarı ${existingProduct.quantity} → ${newQuantity} olarak güncellendi!`);
      } else {
        await addStock({
          brand: newProduct.brand,
          model: newProduct.model,
          colorCode: newProduct.colorCode,
          quantity: parseInt(newProduct.quantity),
          price: parseFloat(newProduct.price) || 0,
          barcode: newProduct.barcode || null,
        });
        alert('Yeni ürün başarıyla eklendi!');
      }

      await loadData();
      setNewProduct({ brand: '', model: '', colorCode: '', quantity: '', price: '', barcode: '' });
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
      try {
        await deleteStock(id);
        await loadData();
      } catch (error) {
        alert('Hata: ' + error.message);
      }
    }
  };

  const filteredStock = stock.filter(item => {
    const matchesSearch = item.colorCode && item.colorCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBrand = filterBrand === '' || item.brand === filterBrand;
    const matchesModel = filterModel === '' || item.model === filterModel;
    return matchesSearch && matchesBrand && matchesModel;
  });

  const sortedStock = [...filteredStock].sort((a, b) => {
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    if (a.model !== b.model) return a.model.localeCompare(b.model);
    return String(a.colorCode).localeCompare(String(b.colorCode));
  });

  const totalValue = sortedStock.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  // Fiyat güncelleme
  const handleBulkPriceUpdate = async () => {
    const updates = Object.entries(newPrices).filter(([_, v]) => v !== '');
    if (updates.length === 0) return;

    const lines = updates.map(([model, price]) => `${model}: ${formatCurrency(parseFloat(price))}`).join('\n');
    if (!confirm(`Aşağıdaki modeller güncellenecek:\n\n${lines}\n\nOnaylıyor musunuz?`)) return;

    try {
      for (const [model, price] of updates) {
        const affected = stock.filter(s => s.brand === priceUpdateBrand && s.model === model);
        for (const item of affected) {
          await updateStock(item.id, { price: parseFloat(price) });
        }
      }
      await loadData();
      setNewPrices({});
      alert(`${updates.length} model başarıyla güncellendi!`);
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  //Export Excel
  const handleExportExcel = () => {
    import('xlsx').then(XLSX => {
      const data = sortedStock.map(item => ({
        'Marka': item.brand,
        'Model': item.model,
        'Renk Kodu': item.colorCode,
        'Barkod': item.barcode || '',
        'Miktar': item.quantity,
        'Birim Fiyat': item.price,
        'Toplam Değer': item.quantity * item.price,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Stok');
      XLSX.writeFile(wb, `stok-listesi-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`);
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Stok Yönetimi</h1>

      {/* Barkod Tarayıcı Modal */}
      {showBarcodeScanner && (
        <QRScanner
          onScan={handleBarcodeScan}
          onClose={() => { setShowBarcodeScanner(false); setBarcodeScanTarget(null); }}
        />
      )}

      {/* Tab Buttons */}
      <div className="bg-white rounded-lg shadow-md p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('existing')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${activeTab === 'existing' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          📦 Mevcut Ürün (Miktar Güncelle)
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${activeTab === 'new' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          ✨ Yeni Ürün Ekle
        </button>
        <button
          onClick={() => setActiveTab('price')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${activeTab === 'price' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          💰 Fiyat Güncelle
        </button>
      </div>

      {/* Mevcut Ürün Tab */}
      {activeTab === 'existing' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Mevcut Ürün Miktarını Güncelle</h2>
          <form onSubmit={handleExistingProductUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marka *</label>
                <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" required>
                  <option value="">Marka Seçin</option>
                  {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedBrand} required>
                  <option value="">Model Seçin</option>
                  {models.map(model => <option key={model} value={model}>{model}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Renk Kodu *</label>
                <select value={selectedColorCode} onChange={(e) => setSelectedColorCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!selectedModel} required>
                  <option value="">Renk Kodu Seçin</option>
                  {colorCodes.map(item => (
                    <option key={item.id} value={item.colorCode}>{item.colorCode} (Stok: {item.quantity})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İşlem *</label>
                <select value={operation} onChange={(e) => setOperation(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="add">➕ Stok Ekle (Alım)</option>
                  <option value="subtract">➖ Stok Azalt (Elle Düzeltme)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Miktar *</label>
                <input type="number" min="1" value={quantityChange} onChange={(e) => setQuantityChange(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0" required />
              </div>
            </div>
            <button type="submit"
              className={`w-full font-semibold py-3 rounded-lg transition duration-200 ${operation === 'add' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}>
              {operation === 'add' ? '➕ Stok Ekle' : '➖ Stok Azalt'}
            </button>
          </form>
        </div>
      )}

      {/* Yeni Ürün Tab */}
      {activeTab === 'new' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Yeni Ürün Ekle</h2>
          <form onSubmit={handleNewProductSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marka *</label>
                <input type="text" value={newProduct.brand}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Örn: Lanoso" list="brandList" required />
                <datalist id="brandList">
                  {brands.map(brand => <option key={brand} value={brand} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                <input type="text" value={newProduct.model}
                  onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Örn: Alara" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Renk Kodu *</label>
                <input type="text" value={newProduct.colorCode}
                  onChange={(e) => setNewProduct({ ...newProduct, colorCode: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="Örn: 101, A345" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Miktarı *</label>
                <input type="number" min="0" value={newProduct.quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="0" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birim Fiyat (₺)</label>
                <input type="number" step="0.01" min="0" value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Barkod</label>
                <div className="flex gap-2">
                  <input type="text" value={newProduct.barcode}
                    onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Barkod numarası" />
                  <button type="button"
                    onClick={() => { setBarcodeScanTarget('new'); setShowBarcodeScanner(true); }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm"
                    title="Barkod Tara">
                    📷
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Kamerayla okutabilir veya elle girebilirsiniz</p>
              </div>
            </div>
            <button type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200">
              Yeni Ürün Ekle
            </button>
          </form>
        </div>
      )}

      {activeTab === 'new' && <ExcelImport onImportComplete={loadData} />}

      {activeTab === 'price' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Fiyat Güncelle</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Marka *</label>
            <select value={priceUpdateBrand} onChange={e => setPriceUpdateBrand(e.target.value)}
              className="w-full max-w-xs px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
              <option value="">Marka Seçin</option>
              {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </div>

          {priceUpdateBrand && (() => {
            // O markanın modellerini ve mevcut fiyatlarını getir
            const brandModels = [...new Set(stock.filter(s => s.brand === priceUpdateBrand).map(s => s.model))].sort();

            return brandModels.length === 0 ? (
              <p className="text-gray-500 text-sm">Bu markaya ait model bulunamadı.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Model</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Renk Sayısı</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Mevcut Fiyat</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Yeni Fiyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brandModels.map((model, index) => {
                        const sample = stock.find(s => s.brand === priceUpdateBrand && s.model === model);
                        const colorCount = stock.filter(s => s.brand === priceUpdateBrand && s.model === model).length;
                        const currentPrice = sample?.price || 0;

                        return (
                          <tr key={model} className={`border-t border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="py-3 px-4 text-sm font-medium text-gray-800">{model}</td>
                            <td className="py-3 px-4 text-sm text-center text-gray-600">{colorCount} renk</td>
                            <td className="py-3 px-4 text-sm text-right">
                              <span className="text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg text-sm">
                                {formatCurrency(currentPrice)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <input
                                type="number" step="0.01" min="0"
                                value={newPrices[model] || ''}
                                onChange={e => setNewPrices(prev => ({ ...prev, [model]: e.target.value }))}
                                className="w-32 px-3 py-1.5 text-sm border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-right"
                                placeholder="Değiştir..."
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Kaç model güncellenecek özeti */}
                {Object.values(newPrices).some(v => v !== '') && (
                  <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
                    <span className="text-sm text-purple-700">
                      {Object.values(newPrices).filter(v => v !== '').length} model güncellemeye hazır
                    </span>
                  </div>
                )}

                <button
                  onClick={handleBulkPriceUpdate}
                  disabled={!Object.values(newPrices).some(v => v !== '')}
                  className="mt-4 w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition">
                  💰 Toplu Fiyat Güncelle
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marka</label>
            <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Tüm Markalar</option>
              {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!filterBrand}>
              <option value="">Tüm Modeller</option>
              {availableFilterModels.map(model => <option key={model} value={model}>{model}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Renk Kodu</label>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Renk kodu ile ara..." />
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <span>{sortedStock.length} ürün listeleniyor</span>
          <div className="flex items-center gap-4">
            <span className="font-semibold">Toplam Değer: {formatCurrency(totalValue)}</span>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              📥 Excel'e Aktar
            </button>
          </div>
        </div>
      </div>

      {/* Stok Listesi */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {sortedStock.length === 0 ? (
          <p className="text-gray-500 text-center py-12">Stok bulunamadı</p>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Marka</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Model</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Renk Kodu</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Barkod</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Miktar</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Birim Fiyat</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Toplam</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {sortedStock.map((item, index) => (
                  <tr key={`${item.brand}-${item.model}-${item.colorCode}-${index}`}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 text-sm text-gray-800 font-medium">{item.brand}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{item.model}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{item.colorCode || '-'}</td>
                    <td className="py-3 px-4 text-sm">
                      {editingBarcode && editingBarcode.id === item.id ? (
                        <div className="flex gap-1 items-center">
                          <input
                            type="text"
                            value={editingBarcode.barcode}
                            onChange={(e) => setEditingBarcode({ ...editingBarcode, barcode: e.target.value })}
                            className="w-32 px-2 py-1 border border-blue-400 rounded text-xs focus:ring-1 focus:ring-blue-500"
                          />
                          <button onClick={() => { setBarcodeScanTarget(item.id); setShowBarcodeScanner(true); }}
                            className="text-blue-600 hover:text-blue-800 text-xs px-1" title="Tara">📷</button>
                          <button onClick={() => handleSaveBarcode(item.id)}
                            className="text-green-600 hover:text-green-800 font-bold text-sm" title="Kaydet">✓</button>
                          <button onClick={() => setEditingBarcode(null)}
                            className="text-red-400 hover:text-red-600 font-bold text-sm" title="İptal">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500 text-xs">{item.barcode || '-'}</span>
                          <button
                            onClick={() => setEditingBarcode({ id: item.id, barcode: item.barcode || '' })}
                            className="text-gray-400 hover:text-blue-600 transition ml-1" title="Barkod Düzenle">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`inline-flex px-2 py-1 rounded ${item.quantity < 10 ? 'bg-red-100 text-red-800' : item.quantity < 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800">{formatCurrency(item.price)}</td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(item.quantity * item.price)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800 transition" title="Sil">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
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