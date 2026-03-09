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

export default function StockManagement() {
  const [activeTab, setActiveTab] = useState('existing'); // 'existing' veya 'new'
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
  const [operation, setOperation] = useState('add'); // 'add' veya 'subtract'

  // Yeni Ürün için
  const [newProduct, setNewProduct] = useState({
    brand: '',
    model: '',
    colorCode: '',
    quantity: '',
    price: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const freshStock = await getStock();
    const freshBrands = await getBrands();
    setStock([...freshStock]);
    setBrands([...freshBrands]);
  };

  // Filtre için marka seçildiğinde modelleri getir
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

  // Marka seçildiğinde modelleri getir
  useEffect(() => {
    const loadModels = async () => {
      if (selectedBrand) {
        const brandModels = await getModelsByBrand(selectedBrand);
        setModels(brandModels);
        setSelectedModel('');
        setColorCodes([]);
        setSelectedColorCode('');
      } else {
        setModels([]);
        setSelectedModel('');
        setColorCodes([]);
        setSelectedColorCode('');
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
      } else {
        setColorCodes([]);
        setSelectedColorCode('');
      }
    };
    loadColorCodes();
  }, [selectedModel]);

  // Mevcut ürün için miktar güncelleme
  const handleExistingProductUpdate = async (e) => {
    e.preventDefault();

    if (!selectedBrand || !selectedModel || !selectedColorCode) {
      alert('Lütfen ürün seçin!');
      return;
    }

    const qty = parseInt(quantityChange);
    if (qty <= 0) {
      alert('Miktar 0\'dan büyük olmalıdır!');
      return;
    }

    try {
      const stockData = await getStock();
      const stockItem = stockData.find(
        s => s.brand === selectedBrand &&
          s.model === selectedModel &&
          s.colorCode === selectedColorCode
      );

      if (!stockItem) {
        alert('Ürün bulunamadı!');
        return;
      }

      let newQuantity;
      if (operation === 'add') {
        newQuantity = stockItem.quantity + qty;
      } else {
        newQuantity = stockItem.quantity - qty;
        if (newQuantity < 0) {
          alert('Stok miktarı negatif olamaz!');
          return;
        }
      }

      await updateStock(stockItem.id, { quantity: newQuantity });
      await loadData();

      // Formu temizle
      setSelectedBrand('');
      setSelectedModel('');
      setSelectedColorCode('');
      setQuantityChange('');
      setOperation('add');

      alert(`Stok başarıyla ${operation === 'add' ? 'artırıldı' : 'azaltıldı'}!`);
    } catch (error) {
      alert('Hata: ' + error.message);
    }
  };

  // Yeni ürün ekleme
  const handleNewProductSubmit = async (e) => {
    e.preventDefault();

    if (!newProduct.brand || !newProduct.model || !newProduct.colorCode || !newProduct.quantity) {
      alert('Lütfen tüm zorunlu alanları doldurun!');
      return;
    }

    try {
      // Marka yoksa ekle
      const currentBrands = await getBrands();
      if (!currentBrands.includes(newProduct.brand)) {
        await addBrand(newProduct.brand);
      }

      // Önce aynı ürün var mı kontrol et
      const stockData = await getStock();
      const existingProduct = stockData.find(
        item => item.brand === newProduct.brand &&
          item.model === newProduct.model &&
          item.colorCode === newProduct.colorCode
      );

      if (existingProduct) {
        // Ürün varsa miktarı artır
        const newQuantity = existingProduct.quantity + parseInt(newProduct.quantity);
        await updateStock(existingProduct.id, { quantity: newQuantity });
        alert(`Mevcut ürünün miktarı ${existingProduct.quantity} → ${newQuantity} olarak güncellendi!`);
      } else {
        // Ürün yoksa yeni ekle
        await addStock({
          brand: newProduct.brand,
          model: newProduct.model,
          colorCode: newProduct.colorCode,
          quantity: parseInt(newProduct.quantity),
          price: parseFloat(newProduct.price) || 0,
        });
        alert('Yeni ürün başarıyla eklendi!');
      }

      await loadData();

      // Formu temizle
      setNewProduct({
        brand: '',
        model: '',
        colorCode: '',
        quantity: '',
        price: '',
      });
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

  // Filtreleme
  const filteredStock = stock.filter(item => {
    const matchesSearch =
      item.colorCode && item.colorCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBrand = filterBrand === '' || item.brand === filterBrand;
    const matchesModel = filterModel === '' || item.model === filterModel;

    return matchesSearch && matchesBrand && matchesModel;
  });

  // Sıralama: Marka → Model → Renk Kodu
  const sortedStock = [...filteredStock].sort((a, b) => {
    // Önce markaya göre
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    // Sonra modele göre
    if (a.model !== b.model) return a.model.localeCompare(b.model);
    // Son olarak renk koduna göre
    return String(a.colorCode).localeCompare(String(b.colorCode));
  });

  const totalValue = sortedStock.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Stok Yönetimi</h1>

      {/* Tab Buttons */}
      <div className="bg-white rounded-lg shadow-md p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('existing')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${activeTab === 'existing'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          📦 Mevcut Ürün (Miktar Güncelle)
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors ${activeTab === 'new'
            ? 'bg-green-600 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
        >
          ✨ Yeni Ürün Ekle
        </button>
      </div>

      {/* Mevcut Ürün Tab */}
      {activeTab === 'existing' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Mevcut Ürün Miktarını Güncelle</h2>

          <form onSubmit={handleExistingProductUpdate} className="space-y-4">
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
                      {item.colorCode} (Stok: {item.quantity})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* İşlem Tipi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İşlem *</label>
                <select
                  value={operation}
                  onChange={(e) => setOperation(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="add">➕ Stok Ekle (Alım)</option>
                  <option value="subtract">➖ Stok Azalt (Elle Düzeltme)</option>
                </select>
              </div>

              {/* Miktar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Miktar *</label>
                <input
                  type="number"
                  min="1"
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center ${operation === 'add'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
            >
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
              {/* Marka */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Marka *</label>
                <input
                  type="text"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Örn: Lanoso"
                  list="brandList"
                  required
                />
                <datalist id="brandList">
                  {brands.map(brand => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-500 mt-1">Mevcut marka seçebilir veya yeni girebilirsiniz</p>
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                <input
                  type="text"
                  value={newProduct.model}
                  onChange={(e) => setNewProduct({ ...newProduct, model: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Örn: Alara"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Model adını girin</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Renk Kodu */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Renk Kodu *</label>
                <input
                  type="text"
                  value={newProduct.colorCode}
                  onChange={(e) => setNewProduct({ ...newProduct, colorCode: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Örn: 101, A345, 3948"
                  required
                />
              </div>

              {/* Miktar */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Miktarı *</label>
                <input
                  type="number"
                  min="0"
                  value={newProduct.quantity}
                  onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Birim Fiyat */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Birim Fiyat (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Yeni Ürün Ekle
            </button>
          </form>
        </div>
      )}
      
      {/* Excel Import Bölümü */}
      {activeTab === 'new' && (
        <ExcelImport onImportComplete={loadData} />
      )}

      {/* Filtreler ve Arama */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marka</label>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tüm Markalar</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!filterBrand}
            >
              <option value="">Tüm Modeller</option>
              {availableFilterModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Renk Kodu</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Renk kodu ile ara... (örn: 901)"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <span>{sortedStock.length} ürün listeleniyor</span>
          <span className="font-semibold">Toplam Değer: {formatCurrency(totalValue)}</span>
        </div>
      </div>

      {/* Stok Listesi */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {sortedStock.length === 0 ? (
          <p className="text-gray-500 text-center py-12">Stok bulunamadı</p>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Marka</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Model</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Renk Kodu</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Miktar</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Birim Fiyat</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Toplam</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {sortedStock.map((item, index) => (
                  <tr key={`${item.brand}-${item.model}-${item.colorCode}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 text-sm text-gray-800 font-medium">{item.brand}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{item.model}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{item.colorCode || '-'}</td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`inline-flex px-2 py-1 rounded ${item.quantity < 10 ? 'bg-red-100 text-red-800' :
                        item.quantity < 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800">
                      {formatCurrency(item.price)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(item.quantity * item.price)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-800 transition"
                        title="Sil"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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