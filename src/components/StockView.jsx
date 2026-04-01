import { useState, useEffect } from 'react';
import { getStock, getBrands, getModelsByBrand } from '../services/supabaseStorage';
import { formatCurrency } from '../utils/helpers';

export default function StockView() {
    const [stock, setStock] = useState([]);
    const [brands, setBrands] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [filterModel, setFilterModel] = useState('');
    const [availableFilterModels, setAvailableFilterModels] = useState([]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        const freshStock = await getStock();
        const freshBrands = await getBrands();
        setStock([...freshStock]);
        setBrands([...freshBrands]);
    };

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

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Stok Görüntüle</h1>

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
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Miktar</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Birim Fiyat</th>
                                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Toplam</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedStock.map((item, index) => (
                                    <tr key={`${item.brand}-${item.model}-${item.colorCode}-${index}`}
                                        className={`border-t border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                        <td className="py-3 px-4 text-sm text-gray-800 font-medium">{item.brand}</td>
                                        <td className="py-3 px-4 text-sm text-gray-800">{item.model}</td>
                                        <td className="py-3 px-4 text-sm text-gray-800">{item.colorCode || '-'}</td>
                                        <td className="py-3 px-4 text-sm text-right">
                                            <span className={`inline-flex px-2 py-1 rounded ${item.quantity < 10 ? 'bg-red-100 text-red-800' :
                                                item.quantity < 50 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'}`}>
                                                {item.quantity}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-right text-gray-800">{formatCurrency(item.price)}</td>
                                        <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                                            {formatCurrency(item.quantity * item.price)}
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