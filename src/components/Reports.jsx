import { useState, useEffect } from 'react';
import { getSales } from '../services/supabaseStorage';
import {
  formatCurrency,
  formatDate,
  calculateTotal,
  calculateCashTotal,
  calculateCardTotal,
  filterMonthlySales
} from '../utils/helpers';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isAllYear, setIsAllYear] = useState(false);

  useEffect(() => { loadData(); }, [selectedMonth, selectedYear, isAllYear]);

  const loadData = async () => {
    const salesData = await getSales();
    setSales(salesData);
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Tüm yıl veya tek ay filtrele
  const filteredSales = isAllYear
    ? sales.filter(s => new Date(s.created_at).getFullYear() === selectedYear)
    : filterMonthlySales(sales, selectedYear, selectedMonth);

  const convertSales = (salesArr) => salesArr.map(sale => ({
    cash: sale.paymentType === 'Nakit' ? sale.amount :
      sale.paymentType === 'Karma' ? parseFloat(sale.cashamount || 0) : 0,
    card: sale.paymentType === 'Kredi Kartı' ? sale.amount :
      sale.paymentType === 'Karma' ? parseFloat(sale.cardamount || 0) : 0,
  }));

  const converted = convertSales(filteredSales);
  const totalAmount = calculateTotal(converted);
  const totalCash = calculateCashTotal(converted);
  const totalCard = calculateCardTotal(converted);

  // Tüm yıl: ay ay grupla
  const monthlyGroups = () => {
    const groups = {};
    filteredSales.forEach(sale => {
      const m = new Date(sale.created_at).getMonth();
      if (!groups[m]) groups[m] = [];
      groups[m].push(sale);
    });
    return Object.entries(groups)
      .sort((a, b) => b[0] - a[0])
      .map(([monthIdx, salesArr]) => {
        const conv = convertSales(salesArr);
        return {
          monthIdx: parseInt(monthIdx),
          total: calculateTotal(conv),
          cash: calculateCashTotal(conv),
          card: calculateCardTotal(conv),
          count: salesArr.length,
        };
      });
  };

  // Tek ay: gün gün grupla
  const dailyGroups = filteredSales.reduce((groups, sale) => {
    const date = formatDate(sale.date || sale.created_at);
    if (!groups[date]) groups[date] = [];
    groups[date].push(sale);
    return groups;
  }, {});

  const dailyStats = Object.entries(dailyGroups).map(([date, salesArr]) => {
    const conv = convertSales(salesArr);
    return {
      date,
      total: calculateTotal(conv),
      cash: calculateCashTotal(conv),
      card: calculateCardTotal(conv),
      count: salesArr.length,
    };
  }).sort((a, b) => new Date(b.date.split('.').reverse().join('-')) - new Date(a.date.split('.').reverse().join('-')));

  const tableHead = (
    <thead className="bg-gray-50">
      <tr>
        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tarih</th>
        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">İşlem Sayısı</th>
        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Nakit</th>
        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Kredi Kartı</th>
        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Toplam</th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Raporlar</h1>

      {/* Tarih Seçici */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yıl</label>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ay</label>
            <select
              value={isAllYear ? -1 : selectedMonth}
              onChange={e => {
                const val = parseInt(e.target.value);
                if (val === -1) { setIsAllYear(true); }
                else { setIsAllYear(false); setSelectedMonth(val); }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value={-1}>Tüm Yıl</option>
              {MONTHS.map((month, index) => <option key={index} value={index}>{month}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-blue-100 text-sm font-medium">Toplam Satış</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(totalAmount)}</p>
          <p className="text-blue-100 text-sm mt-2">{filteredSales.length} işlem</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-green-100 text-sm font-medium">Nakit</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(totalCash)}</p>
          <p className="text-green-100 text-sm mt-2">{totalAmount > 0 ? `%${((totalCash / totalAmount) * 100).toFixed(1)}` : '%0'}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-purple-100 text-sm font-medium">Kredi Kartı</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(totalCard)}</p>
          <p className="text-purple-100 text-sm mt-2">{totalAmount > 0 ? `%${((totalCard / totalAmount) * 100).toFixed(1)}` : '%0'}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-orange-100 text-sm font-medium">Ortalama İşlem</p>
          <p className="text-3xl font-bold mt-2">{filteredSales.length > 0 ? formatCurrency(totalAmount / filteredSales.length) : formatCurrency(0)}</p>
          <p className="text-orange-100 text-sm mt-2">işlem başı ort.</p>
        </div>
      </div>

      {/* Tüm Yıl: ay ay tablo */}
      {isAllYear ? (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Aylık Satışlar — {selectedYear}</h2>
          {monthlyGroups().length === 0 ? (
            <p className="text-gray-500 text-center py-12">Bu yıl için satış kaydı yok</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                {tableHead}
                <tbody>
                  {monthlyGroups().map((m, index) => (
                    <tr key={m.monthIdx} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-3 px-4 text-sm text-gray-800 font-medium">{MONTHS[m.monthIdx]} {selectedYear}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-600">{m.count}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-800">{formatCurrency(m.cash)}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-800">{formatCurrency(m.card)}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(m.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-semibold">
                    <td className="py-3 px-4 text-sm text-gray-800">TOPLAM</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800">{filteredSales.length}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800">{formatCurrency(totalCash)}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800">{formatCurrency(totalCard)}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">{formatCurrency(totalAmount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Tek Ay: gün gün tablo */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Günlük Satışlar — {MONTHS[selectedMonth]} {selectedYear}
            </h2>
            {dailyStats.length === 0 ? (
              <p className="text-gray-500 text-center py-12">Bu ay için satış kaydı yok</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  {tableHead}
                  <tbody>
                    {dailyStats.map((day, index) => (
                      <tr key={day.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-3 px-4 text-sm text-gray-800 font-medium">{day.date}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-600">{day.count}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-800">{formatCurrency(day.cash)}</td>
                        <td className="py-3 px-4 text-sm text-right text-gray-800">{formatCurrency(day.card)}</td>
                        <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">{formatCurrency(day.total)}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 font-semibold">
                      <td className="py-3 px-4 text-sm text-gray-800">TOPLAM</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-800">{filteredSales.length}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-800">{formatCurrency(totalCash)}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-800">{formatCurrency(totalCard)}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900">{formatCurrency(totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* En Yüksek Satış Günleri */}
          {dailyStats.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">En Yüksek Satış Günleri</h2>
              <div className="space-y-3">
                {[...dailyStats].sort((a, b) => b.total - a.total).slice(0, 5).map((day, index) => {
                  const percentage = (day.total / totalAmount) * 100;
                  return (
                    <div key={day.date} className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-gray-400 w-8">#{index + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{day.date}</span>
                          <span className="text-sm font-semibold text-gray-900">{formatCurrency(day.total)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}