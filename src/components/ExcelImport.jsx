import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  getStock,
  addStock,
  updateStock,
  addBrand,
  getBrands
} from '../services/supabaseStorage';

export default function ExcelImport({ onImportComplete }) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const extractBrandFromFilename = (filename) => {
    const namePart = filename.replace('.xlsx', '').replace('.xls', '');
    const cleaned = namePart.replace(/^\d+_-_/, '').replace(/_/g, ' ').trim();
    const words = cleaned.split(' ');
    return words[0] || 'Bilinmeyen Marka';
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    setImportResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const brandName = extractBrandFromFilename(file.name);

      console.log('📊 Toplam sheet sayısı:', workbook.SheetNames.length);
      console.log('📋 Sheet isimleri:', workbook.SheetNames);

      const products = [];
      let processedSheets = 0;

      for (const sheetName of workbook.SheetNames) {
        console.log(`🔍 İşleniyor [${processedSheets + 1}/${workbook.SheetNames.length}]:`, sheetName);

        if (sheetName.toUpperCase() === 'STOKLAR') {
          console.log('⏭️ Atlandı: STOKLAR');
          processedSheets++;
          continue;
        }

        try {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          // MODEL ADI = SHEET ADI
          const modelName = sheetName;
          console.log(`📝 Model: ${modelName}`);

          // SADECE 3. SATIR (index 2) - Renk kodları ve stoklar
          if (rows.length < 3) {
            console.log(`⚠️ Sheet'te yeterli satır yok, atlanıyor`);
            processedSheets++;
            continue;
          }

          const dataRow = rows[2]; // SADECE 3. SATIR!

          if (!dataRow || dataRow.length === 0) {
            console.log(`⚠️ 3. satır boş, atlanıyor`);
            processedSheets++;
            continue;
          }

          console.log(`🔎 Satır verisi:`, dataRow);

          // Her satırda 2'li grup: RenkNo, Stok, RenkNo, Stok
          let productCount = 0;
          for (let j = 0; j < dataRow.length; j += 3) { // ← 3'LÜ!
            const renkNo = dataRow[j];
            const stok = dataRow[j + 1];
            // dataRow[j + 2] boş, atla

            console.log(`  [${j}] Renk: ${renkNo}, Stok: ${stok}`);

            const renkNoStr = String(renkNo).trim();

            if (!renkNo || renkNoStr === '' || renkNoStr === 'undefined' || renkNoStr === 'null' || renkNoStr === '……..') {
              console.log(`  ⏭️ Atlandı (geçersiz renk kodu): ${renkNo}`);
              continue;
            }

            let stokValue = 0;
            if (stok !== null && stok !== undefined && stok !== '') {
              const parsed = parseInt(stok);
              if (!isNaN(parsed)) {
                stokValue = parsed < 0 ? 0 : parsed;
              }
            }

            products.push({
              brand: brandName,
              model: modelName,
              colorCode: renkNoStr,
              quantity: stokValue,
              price: 0,
            });

            console.log(`  ✅ Eklendi: ${renkNoStr} → ${stokValue}`);
            productCount++;
          }

          console.log(`   → ${productCount} renk kodu bulundu`);
          processedSheets++;
          console.log(`✅ Tamamlandı [${processedSheets}/${workbook.SheetNames.length}]:`, sheetName);

        } catch (error) {
          console.error(`❌ Sheet hatası [${sheetName}]:`, error);
          processedSheets++;
          continue;
        }
      }

      console.log(`📦 Toplam ${products.length} ürün bulundu`);
      console.log(`📋 İlk 10 ürün:`, products.slice(0, 10));

      // Veritabanına ekle
      const currentStock = await getStock();
      let added = 0;
      let updated = 0;
      let skipped = 0;

      await addBrand(brandName);
      console.log('💾 Veritabanına yazılıyor...');

      for (const product of products) {
        const existing = currentStock.find(
          item => item.brand === product.brand &&
            item.model === product.model &&
            item.colorCode === product.colorCode
        );

        if (existing) {
          if (existing.quantity !== product.quantity) {
            await updateStock(existing.id, { quantity: product.quantity });
            updated++;
          } else {
            skipped++;
          }
        } else {
          await addStock({
            brand: product.brand,
            model: product.model,
            colorCode: product.colorCode,
            quantity: product.quantity,
            price: product.price,
          });
          added++;
        }

        if ((added + updated + skipped) % 50 === 0) {
          console.log(`📝 İlerleme: ${added + updated + skipped}/${products.length}`);
        }
      }

      console.log('✅ Veritabanına yazma tamamlandı!');

      setImportResults({
        brand: brandName,
        total: products.length,
        added,
        updated,
        skipped,
      });

      if (onImportComplete) {
        await onImportComplete();
      }

    } catch (error) {
      console.error('❌ Import hatası:', error);
      alert('Excel dosyası okunurken hata oluştu: ' + error.message);
    } finally {
      setIsImporting(false);
      e.target.value = '';
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
          <p className="text-xs text-gray-500 mt-1">
            Marka adı dosya isminden otomatik olarak algılanır
          </p>
        </div>

        {isImporting && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-blue-700 font-medium">Excel dosyası işleniyor... (Console'u kontrol edin)</span>
            </div>
          </div>
        )}

        {importResults && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">✅ İçe Aktarma Tamamlandı!</h4>
            <div className="space-y-1 text-sm text-green-700">
              <p>• Marka: <strong>{importResults.brand}</strong></p>
              <p>• Toplam işlenen: <strong>{importResults.total}</strong> ürün</p>
              <p>• Yeni eklenen: <strong>{importResults.added}</strong> ürün</p>
              <p>• Güncellenen: <strong>{importResults.updated}</strong> ürün</p>
              <p>• Değişmeden kalan: <strong>{importResults.skipped}</strong> ürün</p>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-800 mb-2">💡 İpuçları:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Her markayı ayrı ayrı yükleyin (Lanoso, Nako, Himalaya...)</li>
            <li>• Dosya adı önemli: "Lanosa_Stok.xlsx" → Marka: Lanoso</li>
            <li>• Aynı ürün varsa sadece stok miktarı güncellenir</li>
            <li>• Fiyatları daha sonra "Stok Yönetimi" sekmesinden girebilirsiniz</li>
          </ul>
        </div>
      </div>
    </div>
  );
}