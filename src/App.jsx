import { useState } from 'react';
import Dashboard from './components/Dashboard';
import SalesEntry from './components/SalesEntry';
import StockManagement from './components/StockManagement';
import Reports from './components/Reports';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [reportsKey, setReportsKey] = useState(0); // Raporlar için key

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'sales':
        return <SalesEntry />;
      case 'stock':
        return <StockManagement />;
      case 'reports':
        return <Reports key={reportsKey} />; // Key ile yenile
      default:
        return <Dashboard />;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'sales', label: 'Satış Girişi', icon: '💰' },
    { id: 'stock', label: 'Stok Yönetimi', icon: '📦' },
    { id: 'reports', label: 'Raporlar', icon: '📈' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">🧶</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Puskul Design</h1>
                <p className="text-sm text-gray-500">Stok Takip Sistemi</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  // Raporlar tab'ına her tıklandığında key'i artır
                  if (item.id === 'reports') {
                    setReportsKey(prev => prev + 1);
                  }
                }}
                className={`
                  flex items-center space-x-2 px-6 py-4 font-medium transition-colors duration-200
                  ${currentPage === item.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }
                `}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 lg:px-12">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Puskul Design Stok Takip Sistemi - Tüm hakları saklıdır
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;