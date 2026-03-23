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

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();

    // localStorage değişikliklerini dinle
    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('stockUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('stockUpdated', handleStorageChange);
    };
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    const salesData = await getSales();
    setSales(salesData);
  };

  const monthlySales = filterMonthlySales(sales, selectedYear, selectedMonth);

  // Yeni formattan eski formata çevir
  const convertedSales = monthlySales.map(sale => ({
    cash: sale.paymentType === 'Nakit' ? sale.amount :
      sale.paymentType === 'Karma' ? parseFloat(sale.cashamount || 0) : 0,
    card: sale.paymentType === 'Kredi Kartı' ? sale.amount :
      sale.paymentType === 'Karma' ? parseFloat(sale.cardamount || 0) : 0,
  }));

  const monthlyTotal = calculateTotal(convertedSales);
  const monthlyCash = calculateCashTotal(convertedSales);
  const monthlyCard = calculateCardTotal(convertedSales);

  // Günlük bazda gruplama
  const dailyGroups = monthlySales.reduce((groups, sale) => {
    const date = formatDate(sale.date);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(sale);
    return groups;
  }, {});

  const dailyStats = Object.entries(dailyGroups).map(([date, sales]) => {
    const converted = sales.map(sale => ({
      cash: sale.paymentType === 'Nakit' ? sale.amount :
        sale.paymentType === 'Karma' ? parseFloat(sale.cashamount || 0) : 0,
      card: sale.paymentType === 'Kredi Kartı' ? sale.amount :
        sale.paymentType === 'Karma' ? parseFloat(sale.cardamount || 0) : 0,
    }));

    return {
      date,
      total: calculateTotal(converted),
      cash: calculateCashTotal(converted),
      card: calculateCardTotal(converted),
      count: sales.length,
    };
  }).sort((a, b) => new Date(b.date.split('.').reverse().join('-')) - new Date(a.date.split('.').reverse().join('-')));

  // Yıl listesi (son 3 yıl)
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Raporlar</h1>

      {/* Tarih Seçici */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ay</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {months.map((month, index) => (
                <option key={index} value={index}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yıl</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Aylık Özet */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-blue-100 text-sm font-medium">Toplam Satış</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(monthlyTotal)}</p>
          <p className="text-blue-100 text-sm mt-2">{monthlySales.length} işlem</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-green-100 text-sm font-medium">Nakit</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(monthlyCash)}</p>
          <p className="text-green-100 text-sm mt-2">
            {monthlyTotal > 0 ? `%${((monthlyCash / monthlyTotal) * 100).toFixed(1)}` : '0%'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-purple-100 text-sm font-medium">Kredi Kartı</p>
          <p className="text-3xl font-bold mt-2">{formatCurrency(monthlyCard)}</p>
          <p className="text-purple-100 text-sm mt-2">
            {monthlyTotal > 0 ? `%${((monthlyCard / monthlyTotal) * 100).toFixed(1)}` : '0%'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <p className="text-orange-100 text-sm font-medium">Ortalama İşlem</p>
          <p className="text-3xl font-bold mt-2">
            {monthlySales.length > 0 ? formatCurrency(monthlyTotal / monthlySales.length) : formatCurrency(0)}
          </p>
          <p className="text-orange-100 text-sm mt-2">günlük ort.</p>
        </div>
      </div>

      {/* Günlük Detay */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Günlük Satışlar - {months[selectedMonth]} {selectedYear}
        </h2>

        {dailyStats.length === 0 ? (
          <p className="text-gray-500 text-center py-12">Bu ay için satış kaydı yok</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tarih</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">İşlem Sayısı</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Nakit</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Kredi Kartı</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((day, index) => (
                  <tr key={day.date} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4 text-sm text-gray-800 font-medium">{day.date}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600">{day.count}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800">
                      {formatCurrency(day.cash)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-800">
                      {formatCurrency(day.card)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(day.total)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-blue-50 font-semibold">
                  <td className="py-3 px-4 text-sm text-gray-800">TOPLAM</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-800">{monthlySales.length}</td>
                  <td className="py-3 px-4 text-sm text-right text-gray-800">
                    {formatCurrency(monthlyCash)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-800">
                    {formatCurrency(monthlyCard)}
                  </td>
                  <td className="py-3 px-4 text-sm text-right text-gray-900">
                    {formatCurrency(monthlyTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Basit Grafik - En Yüksek Satış Günleri */}
      {dailyStats.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">En Yüksek Satış Günleri</h2>
          <div className="space-y-3">
            {dailyStats
              .sort((a, b) => b.total - a.total)
              .slice(0, 5)
              .map((day, index) => {
                const percentage = (day.total / monthlyTotal) * 100;
                return (
                  <div key={day.date} className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-gray-400 w-8">#{index + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{day.date}</span>
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(day.total)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}