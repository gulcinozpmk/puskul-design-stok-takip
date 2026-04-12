import { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/helpers';
import { getSales } from '../services/supabaseStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const fetchFromSupabase = async (path, options = {}) => {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            ...options.headers,
        },
        ...options,
    });
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    return text ? JSON.parse(text) : [];
};

export default function CashRegister() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [salesTotal, setSalesTotal] = useState(0);
    const [movements, setMovements] = useState([]);

    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');

    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [newEmployeeName, setNewEmployeeName] = useState('');
    const [employeeAmount, setEmployeeAmount] = useState('');
    const [showAddEmployee, setShowAddEmployee] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

    // Edit state
    const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({});

    useEffect(() => { loadData(); }, [selectedYear, selectedMonth]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const allSales = await getSales();
            const filteredSales = allSales.filter(s => {
                const d = new Date(s.created_at);
                const yearMatch = d.getFullYear() === selectedYear;
                const monthMatch = selectedMonth === 0 || (d.getMonth() + 1) === selectedMonth;
                const cashMatch = s.paymentType === 'Nakit' || s.paymentType === 'Karma';
                return yearMatch && monthMatch && cashMatch;
            });

            const total = filteredSales.reduce((sum, s) => {
                if (s.paymentType === 'Nakit') return sum + parseFloat(s.amount || 0);
                if (s.paymentType === 'Karma') return sum + parseFloat(s.cashamount || 0);
                return sum;
            }, 0);
            setSalesTotal(total);

            const startDate = selectedMonth === 0
                ? `${selectedYear}-01-01`
                : `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
            const endDate = selectedMonth === 0
                ? `${selectedYear}-12-31`
                : new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

            const movementsRes = await fetchFromSupabase(
                `cash_movements?date=gte.${startDate}&date=lte.${endDate}&order=created_at.desc`
            );
            setMovements(movementsRes);

            const allMovements = await fetchFromSupabase(
                `cash_movements?type=eq.employee&select=employee_name`
            );
            const uniqueEmployees = [...new Set(allMovements.map(m => m.employee_name).filter(Boolean))];
            setEmployees(uniqueEmployees);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!expenseDesc || !expenseAmount) { alert('Lütfen açıklama ve tutar girin!'); return; }
        try {
            await fetchFromSupabase('cash_movements', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'expense',
                    description: expenseDesc,
                    amount: parseFloat(expenseAmount),
                    employee_name: null,
                    date: (() => {
                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const currentMonth = now.getMonth() + 1;
                        if (selectedYear === currentYear && selectedMonth === currentMonth) {
                            return todayStr; // bu ay ise bugün
                        } else if (selectedMonth === 0) {
                            return todayStr; // tüm yıl seçiliyse bugün
                        } else {
                            // geçmiş ay ise o ayın son günü
                            return new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
                        }
                    })(),
                }),
            });
            setExpenseDesc(''); setExpenseAmount('');
            await loadData();
        } catch (err) { alert('Hata: ' + err.message); }
    };

    const handleAddEmployeePayment = async (e) => {
        e.preventDefault();
        const empName = showAddEmployee ? newEmployeeName : selectedEmployee;
        if (!empName || !employeeAmount) { alert('Lütfen çalışan adı ve tutar girin!'); return; }
        try {
            await fetchFromSupabase('cash_movements', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'employee',
                    description: null,
                    amount: parseFloat(employeeAmount),
                    employee_name: empName,
                    date: (() => {
                        const now = new Date();
                        const currentYear = now.getFullYear();
                        const currentMonth = now.getMonth() + 1;
                        if (selectedYear === currentYear && selectedMonth === currentMonth) {
                            return todayStr; // bu ay ise bugün
                        } else if (selectedMonth === 0) {
                            return todayStr; // tüm yıl seçiliyse bugün
                        } else {
                            // geçmiş ay ise o ayın son günü
                            return new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];
                        }
                    })(),
                }),
            });
            setSelectedEmployee(''); setNewEmployeeName(''); setEmployeeAmount(''); setShowAddEmployee(false);
            await loadData();
        } catch (err) { alert('Hata: ' + err.message); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
        try {
            await fetchFromSupabase(`cash_movements?id=eq.${id}`, { method: 'DELETE' });
            await loadData();
        } catch (err) { alert('Hata: ' + err.message); }
    };

    const handleEditSave = async (m) => {
        try {
            await fetchFromSupabase(`cash_movements?id=eq.${m.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    description: editValues.description ?? m.description,
                    amount: parseFloat(editValues.amount) || m.amount,
                    employee_name: editValues.employee_name ?? m.employee_name,
                }),
            });
            setEditingId(null);
            setEditValues({});
            await loadData();
        } catch (err) { alert('Hata: ' + err.message); }
    };

    const expenseTotal = movements.filter(m => m.type === 'expense').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
    const employeeTotal = movements.filter(m => m.type === 'employee').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
    const netCash = salesTotal - expenseTotal - employeeTotal;

    const employeeBreakdown = {};
    movements.filter(m => m.type === 'employee').forEach(m => {
        employeeBreakdown[m.employee_name] = (employeeBreakdown[m.employee_name] || 0) + parseFloat(m.amount || 0);
    });

    // Tüm yıl seçilince ay ay grupla
    const groupedMovements = () => {
        if (selectedMonth !== 0) return null;
        const groups = {};
        movements.forEach(m => {
            const monthNum = new Date(m.date + 'T12:00:00').getMonth() + 1;
            if (!groups[monthNum]) groups[monthNum] = [];
            groups[monthNum].push(m);
        });
        return groups;
    };

    const renderMovementRow = (m) => {
        const isEditing = editingId === m.id;
        return (
            <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                <td className="py-3 px-4 text-sm text-gray-500">
                    {new Date(m.date + 'T12:00:00').toLocaleDateString('tr-TR')} {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-3 px-4 text-sm">
                    {m.type === 'expense'
                        ? <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">💸 Masraf</span>
                        : <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">👤 {isEditing ? (
                            <input value={editValues.employee_name ?? m.employee_name}
                                onChange={e => setEditValues(prev => ({ ...prev, employee_name: e.target.value }))}
                                className="w-20 px-1 border border-purple-300 rounded text-xs" />
                        ) : m.employee_name}</span>}
                </td>
                <td className="py-3 px-4 text-sm text-gray-800">
                    {isEditing ? (
                        <input value={editValues.description ?? (m.type === 'expense' ? m.description : `${m.employee_name} ödemesi`)}
                            onChange={e => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full px-2 py-0.5 border border-blue-300 rounded text-sm" />
                    ) : (
                        m.type === 'expense' ? m.description : `${m.employee_name} ödemesi`
                    )}
                </td>
                <td className="py-3 px-4 text-sm text-right font-semibold text-red-600">
                    {isEditing ? (
                        <input type="number" step="0.01" value={editValues.amount ?? m.amount}
                            onChange={e => setEditValues(prev => ({ ...prev, amount: e.target.value }))}
                            className="w-24 px-2 py-0.5 border border-blue-300 rounded text-right text-sm" />
                    ) : (
                        `-${formatCurrency(m.amount)}`
                    )}
                </td>
                <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                            <>
                                <button onClick={() => handleEditSave(m)} className="p-1 text-green-600 hover:text-green-800 rounded transition" title="Kaydet">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </button>
                                <button onClick={() => { setEditingId(null); setEditValues({}); }} className="p-1 text-gray-400 hover:text-gray-600 rounded transition" title="İptal">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => { setEditingId(m.id); setEditValues({ description: m.description, amount: m.amount, employee_name: m.employee_name }); }}
                                    className="p-1 text-blue-400 hover:text-blue-600 rounded transition" title="Düzenle">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onClick={() => handleDelete(m.id)} className="p-1 text-red-600 hover:text-red-800 rounded transition" title="Sil">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    const tableHead = (
        <thead className="bg-gray-50">
            <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tarih / Saat</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tür</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Açıklama</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Tutar</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">İşlem</th>
            </tr>
        </thead>
    );

    const groups = groupedMovements();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Kasa</h1>
            </div>

            {/* Yıl/Ay Filtresi */}
            <div className="bg-white rounded-lg shadow-md p-4 flex items-center gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yıl</label>
                    <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ay</label>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value={0}>Tüm Yıl</option>
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                </div>
            </div>

            {/* Özet Kartlar */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-5 text-white">
                    <p className="text-sm opacity-90">Toplam Nakit Satış</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(salesTotal)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-5 text-white">
                    <p className="text-sm opacity-90">Net Kasa</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(netCash)}</p>
                    <p className="text-xs opacity-75 mt-1">Satış - Masraf - Personel</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-5 text-white">
                    <p className="text-sm opacity-90">Masraflar</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(expenseTotal)}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-5 text-white">
                    <p className="text-sm opacity-90">Personel Ödemeleri</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(employeeTotal)}</p>
                    {Object.entries(employeeBreakdown).map(([name, total]) => (
                        <p key={name} className="text-xs opacity-80 mt-0.5">{name}: {formatCurrency(total)}</p>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Masraf Ekle */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">💸 Masraf Ekle</h2>
                    <form onSubmit={handleAddExpense} className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama *</label>
                            <input type="text" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Örn: Su alındı, İp alındı..." required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺) *</label>
                            <input type="number" step="0.01" min="0" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00" required />
                        </div>
                        <button type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition text-sm">
                            💸 Masraf Ekle
                        </button>
                    </form>
                </div>

                {/* Personel Ödemesi */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">👤 Personel Ödemesi</h2>
                    <form onSubmit={handleAddEmployeePayment} className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Çalışan *</label>
                            {!showAddEmployee ? (
                                <div className="flex gap-2">
                                    <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                        <option value="">Çalışan Seçin</option>
                                        {employees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setShowAddEmployee(true)}
                                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">
                                        + Yeni
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input type="text" value={newEmployeeName} onChange={e => setNewEmployeeName(e.target.value)}
                                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Çalışan adı..." />
                                    <button type="button" onClick={() => setShowAddEmployee(false)}
                                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition">
                                        İptal
                                    </button>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺) *</label>
                            <input type="number" step="0.01" min="0" value={employeeAmount} onChange={e => setEmployeeAmount(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="0.00" required />
                        </div>
                        <button type="submit" className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 rounded-lg transition text-sm">
                            👤 Ödeme Ekle
                        </button>
                    </form>
                </div>
            </div>

            {/* Hareketler Listesi */}
            <div className="space-y-4">
                {movements.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md flex flex-col items-center justify-center py-16 text-gray-400">
                        <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-sm font-medium">Kayıt yok</p>
                    </div>
                ) : selectedMonth !== 0 ? (
                    // Tek ay — normal tablo
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-800">Kasa Hareketleri — {MONTHS[selectedMonth - 1]} {selectedYear}</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                {tableHead}
                                <tbody>{movements.map(m => renderMovementRow(m))}</tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    // Tüm yıl — ay ay grupla
                    Object.keys(groups).sort((a, b) => b - a).map(monthNum => {
                        const monthMovements = groups[monthNum];
                        const monthExpense = monthMovements.filter(m => m.type === 'expense').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
                        const monthEmployee = monthMovements.filter(m => m.type === 'employee').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0);
                        return (
                            <div key={monthNum} className="bg-white rounded-lg shadow-md overflow-hidden">
                                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-gray-800">{MONTHS[monthNum - 1]} {selectedYear}</h3>
                                    <div className="flex gap-4 text-sm">
                                        <span className="text-red-600">Masraf: <strong>{formatCurrency(monthExpense)}</strong></span>
                                        <span className="text-purple-600">Personel: <strong>{formatCurrency(monthEmployee)}</strong></span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        {tableHead}
                                        <tbody>{monthMovements.map(m => renderMovementRow(m))}</tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}