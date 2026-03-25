import { useState } from 'react';

export default function CalendarPopup({ selectedDate, onSelect, onClose }) {
  const today = new Date();
  const initDate = new Date(selectedDate);
  const [calYear, setCalYear] = useState(initDate.getFullYear());
  const [calMonth, setCalMonth] = useState(initDate.getMonth());

  const monthNames = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const firstDay = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;

  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let i = 1; i <= lastDay.getDate(); i++) days.push(i);

  return (
    <div className="absolute top-12 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72">
      {/* Ay/Yıl navigasyon */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }}
          className="p-1 hover:bg-gray-100 rounded transition">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-gray-800">{monthNames[calMonth]} {calYear}</span>
        <button
          onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }}
          className="p-1 hover:bg-gray-100 rounded transition">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Gün isimleri */}
      <div className="grid grid-cols-7 mb-1">
        {['Pt','Sa','Ça','Pe','Cu','Ct','Pz'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Günler */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const isFuture = dateStr > todayStr;

          return (
            <button key={day} disabled={isFuture}
              onClick={() => { onSelect(dateStr); onClose(); }}
              className={`text-xs py-1.5 rounded-lg transition font-medium
                ${isSelected ? 'bg-blue-600 text-white' :
                  isToday ? 'bg-blue-100 text-blue-700' :
                  isFuture ? 'text-gray-300 cursor-not-allowed' :
                  'hover:bg-gray-100 text-gray-700'}`}>
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}