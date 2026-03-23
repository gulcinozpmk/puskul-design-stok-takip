import { useState, useEffect } from 'react';
import { getSales, getStock } from '../services/supabaseStorage';
import {
  formatCurrency,
  filterTodaySales,
  calculateTotal,
  calculateCashTotal,
  calculateCardTotal,
  calculateStockValue
} from '../utils/helpers';

export default function Dashboard() {
  const [todaySales, setTodaySales] = useState([]);
  const [stock, setStock] = useState([]);
  const [filterBrand, setFilterBrand] = useState('');
  const [filterModel, setFilterModel] = useState('');

  useEffect(() => {
    loadData();
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('stockUpdated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('stockUpdated', handleStorageChange);
    };
  }, []);

  const loadData = async () => {
    const allSales = await getSales();
    const todayData = filterTodaySales(allSales);
    setTodaySales(todayData);
    const stockData = await getStock();
    setStock(stockData);
  };

  const convertedSales = todaySales.map(sale => ({
    cash: sale.paymentType === 'Nakit' ? sale.amount :
      sale.paymentType === 'Karma' ? parseFloat(sale.cashamount || 0) : 0,
    card: sale.paymentType === 'Kredi Kartı' ? sale.amount :
      sale.paymentType === 'Karma' ? parseFloat(sale.cardamount || 0) : 0,
  }));

  const todayTotal = calculateTotal(convertedSales);
  const todayCash = calculateCashTotal(convertedSales);
  const todayCard = calculateCardTotal(convertedSales);
  const totalStockValue = calculateStockValue(stock);

  // Benzersiz markalar
  const brands = [...new Set(stock.map(item => item.brand).filter(Boolean))].sort();

  // Seçili markaya göre modeller
  const models = [...new Set(
    stock.filter(item => !filterBrand || item.brand === filterBrand)
      .map(item => item.model).filter(Boolean)
  )].sort();

  // Marka değişince modeli sıfırla
  const handleBrandChange = (val) => {
    setFilterBrand(val);
    setFilterModel('');
  };

  const lowStock = stock
    .filter(item => item.quantity < 10)
    .filter(item => !filterBrand || item.brand === filterBrand)
    .filter(item => !filterModel || item.model === filterModel)
    .sort((a, b) => {
      if (a.brand !== b.brand) return a.brand?.localeCompare(b.brand);
      if (a.model !== b.model) return a.model?.localeCompare(b.model);
      return a.colorCode?.localeCompare(b.colorCode);
    });

  //Export Excel
  const handleExportLowStock = () => {
    import('xlsx').then(XLSX => {
      const data = lowStock.map(item => ({
        'Marka': item.brand,
        'Model': item.model,
        'Renk Kodu': item.colorCode,
        'Miktar': item.quantity,
        'Birim Fiyat': item.price,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Düşük Stok');
      XLSX.writeFile(wb, `dusuk-stok-${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`);
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Bugünkü Satış</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(todayTotal)}</p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Nakit</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(todayCash)}</p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Kredi Kartı</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(todayCard)}</p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Stok Değeri</p>
              <p className="text-3xl font-bold mt-2">{formatCurrency(totalStockValue)}</p>
            </div>
            <div className="bg-white bg-opacity-30 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Alt Kısım */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bugünkü Satışlar */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Bugünkü Satışlar</h2>
          {todaySales.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Henüz satış kaydı yok</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {todaySales.slice().reverse().map((sale, index) => (
                <div key={`sale-${sale.id}-${index}`} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{formatCurrency(sale.amount)}</p>
                    <p className="text-sm text-gray-500">
                      {sale.is_other_product
                        ? `🛠️ ${sale.description}`
                        : `${sale.brand} - ${sale.model} - ${sale.colorCode}`}
                    </p>
                    <p className="text-xs text-gray-400">{sale.paymentType} • {sale.quantity} adet</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(sale.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Düşük Stok Uyarıları */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Düşük Stok Uyarıları</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-500 font-medium">{lowStock.length} ürün</span>
              {lowStock.length > 0 && (
                <button
                  onClick={handleExportLowStock}
                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition"
                >
                  📥 Excel
                </button>
              )}
            </div>
          </div>

          {/* Filtreler */}
          <div className="flex gap-2 mb-4">
            <select
              value={filterBrand}
              onChange={e => handleBrandChange(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <option value="">Tüm Markalar</option>
              {brands.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <select
              value={filterModel}
              onChange={e => setFilterModel(e.target.value)}
              disabled={!filterBrand}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-40"
            >
              <option value="">Tüm Modeller</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {lowStock.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {filterBrand || filterModel ? 'Seçili filtrede düşük stok yok' : 'Tüm stoklar yeterli'}
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {lowStock.map((item, index) => (
                <div key={`lowstock-${item.id}-${index}`} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{item.brand} - {item.model}</p>
                    <p className="text-sm text-gray-600">Renk: {item.colorCode}</p>
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    {item.quantity} adet
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}