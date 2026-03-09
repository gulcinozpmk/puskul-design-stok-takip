import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  getStock,
  addStock,
  updateStock,
  deleteStock,
  addBrand,
} from '../services/supabaseStorage';

export default function ExcelImport({ onImportComplete }) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [preview, setPreview] = useState(null);

  const parseFirstSheet = (workbook) => {
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    const products = [];
    const totalCols = rows[1]?.length || 0;

    // col=1'den başla (A boş), her grup 3 kolon (2 veri + 1 boş)
    for (let col = 1; col < totalCols; col += 3) {
      const brand = String(rows[1]?.[col] || '').trim();
      const model = String(rows[2]?.[col] || '').trim();
      const satisFiyati = parseFloat(rows[3]?.[col + 1]) || 0;

      if (!brand || !model) continue;

      for (let row = 5; row < rows.length; row++) {
        const renkNo = String(rows[row]?.[col] || '').trim();
        const stokRaw = rows[row]?.[col + 1];

        if (!renkNo || renkNo === '' || renkNo === 'undefined' || renkNo === '……..' || renkNo === '……..') continue;

        const stok = parseInt(stokRaw);
        const stokValue = isNaN(stok) ? 0 : Math.max(0, stok);

        products.push({
          brand,
          model,
          colorCode: renkNo,
          quantity: stokValue,
          price: satisFiyati,
        });
      }
    }

    return products;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(false);
    setImportResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const products = parseFirstSheet(workbook);

      console.log(`📦 ${products.length} ürün bulundu`);
      console.log('İlk 5:', products.slice(0, 5));

      // Önizleme göster
      const brands = [...new Set(products.map(p => p.brand))];
      const models = [...new Set(products.map(p => p.model))];
      setPreview({ products, brands, models, filename: file.name });

    } catch (error) {
      console.error('❌ Okuma hatası:', error);
      alert('Excel dosyası okunurken hata oluştu: ' + error.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleImport = async () => {
    if (!preview) return;
    setIsImporting(true);

    try {
      const { products } = preview;

      // Mevcut stoku tamamen sil
      const currentStock = await getStock();
      for (const item of currentStock) {
        await deleteStock(item.id);
      }

      // Markaları ekle
      const brands = [...new Set(products.map(p => p.brand))];
      for (const brand of brands) {
        await addBrand(brand);
      }

      // Yeni stoku ekle
      let added = 0;
      for (const product of products) {
        await addStock({
          brand: product.brand,
          model: product.model,
          colorCode: product.colorCode,
          quantity: product.quantity,
          price: product.price,
        });
        added++;

        if (added % 50 === 0) {
          console.log(`📝 İlerleme: ${added}/${products.length}`);
        }
      }

      setImportResults({
        total: products.length,
        added,
        brands: brands.join(', '),
      });

      setPreview(null);

      if (onImportComplete) {
        await onImportComplete();
      }

    } catch (error) {
      console.error('❌ Import hatası:', error);
      alert('Import sırasında hata oluştu: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">📥 Excel'den Toplu İçe Aktar</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stok Excel Dosyası Seçin
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            disabled={isImporting}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Önizleme */}
        {preview && !isImporting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">📋 Önizleme — {preview.filename}</h4>
            <div className="space-y-1 text-sm text-blue-700 mb-3">
              <p>• Toplam ürün: <strong>{preview.products.length}</strong></p>
              <p>• Markalar: <strong>{preview.brands.join(', ')}</strong></p>
              <p>• Modeller: <strong>{preview.models.length} model</strong> ({preview.models.slice(0, 5).join(', ')}{preview.models.length > 5 ? '...' : ''})</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 mb-3">
              ⚠️ Bu işlem mevcut tüm stoku silip yenisiyle değiştirecek!
            </div>
            <button
              onClick={handleImport}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              ✅ Onayla ve İçe Aktar
            </button>
          </div>
        )}

        {/* Yükleniyor */}
        {isImporting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-blue-700 font-medium">İçe aktarılıyor, lütfen bekleyin...</span>
            </div>
          </div>
        )}

        {/* Sonuç */}
        {importResults && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">✅ İçe Aktarma Tamamlandı!</h4>
            <div className="space-y-1 text-sm text-green-700">
              <p>• Markalar: <strong>{importResults.brands}</strong></p>
              <p>• Toplam eklenen: <strong>{importResults.added}</strong> ürün</p>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">💡 Excel Yapısı:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 2. satır: Marka adı</li>
            <li>• 3. satır: Model adı</li>
            <li>• 4. satır: Alış fiyatı | Satış fiyatı</li>
            <li>• 5. satır: "Renk No" | "Stok" başlıkları</li>
            <li>• 6. satırdan itibaren: Renk kodları ve stok adetleri</li>
            <li>• Sadece ilk sheet (STOKLAR) okunur</li>
          </ul>
        </div>
      </div>
    </div>
  );
}