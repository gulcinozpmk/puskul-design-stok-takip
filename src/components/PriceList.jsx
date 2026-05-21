import { useState, useEffect } from 'react';
import { getStock, getBrands, getModelsByBrand } from '../services/supabaseStorage';
import { formatCurrency } from '../utils/helpers';

export default function PriceList() {
  const [stock, setStock] = useState([]);
  const [filterBrand, setFilterBrand] = useState('');
  const [brands, setBrands] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const freshStock = await getStock();
    const freshBrands = await getBrands();
    setStock(freshStock);
    setBrands(freshBrands);
  };

  // Her marka-model kombinasyonu için tek fiyat al
  const priceList = [];
  const seen = new Set();

  stock.forEach(item => {
    const key = `${item.brand}-${item.model}`;
    if (!seen.has(key)) {
      seen.add(key);
      priceList.push({
        brand: item.brand,
        model: item.model,
        price: item.price,
      });
    }
  });

  const filtered = priceList.filter(item => {
    const matchesBrand = filterBrand === '' || item.brand === filterBrand;
    const matchesSearch = searchTerm === '' ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesBrand && matchesSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    return a.model.localeCompare(b.model);
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Fiyat Listesi</h1>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Marka</label>
            <select value={filterBrand} onChange={e => setFilterBrand(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option value="">Tüm Markalar</option>
              {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ara</label>
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Marka veya model ara..." />
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-500">{sorted.length} model listeleniyor</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Marka</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Model</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Fiyat</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, index) => (
              <tr key={`${item.brand}-${item.model}`}
                className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="py-3 px-4 text-sm font-medium text-gray-800">{item.brand}</td>
                <td className="py-3 px-4 text-sm text-gray-800">{item.model}</td>
                <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                  {formatCurrency(item.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}