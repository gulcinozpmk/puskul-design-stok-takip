// Tarih formatlama
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Bugünün başlangıcı
export const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Bugünün bitişi
export const getTodayEnd = () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
};

// Para formatı
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
};

// Bugünkü satışları filtrele
export const filterTodaySales = (sales) => {
  const todayStart = getTodayStart();
  const todayEnd = getTodayEnd();
  
  return sales.filter(sale => {
    const saleDate = new Date(sale.date);
    return saleDate >= todayStart && saleDate <= todayEnd;
  });
};

// Aylık satışları filtrele
export const filterMonthlySales = (sales, year, month) => {
  return sales.filter(sale => {
    const saleDate = new Date(sale.date);
    return saleDate.getFullYear() === year && saleDate.getMonth() === month;
  });
};

// Toplam hesapla (nakit + kredi kartı)
export const calculateTotal = (sales) => {
  return sales.reduce((total, sale) => {
    return total + (sale.cash || 0) + (sale.card || 0);
  }, 0);
};

// Nakit toplam
export const calculateCashTotal = (sales) => {
  return sales.reduce((total, sale) => total + (sale.cash || 0), 0);
};

// Kredi kartı toplam
export const calculateCardTotal = (sales) => {
  return sales.reduce((total, sale) => total + (sale.card || 0), 0);
};

// Stok değerini hesapla
export const calculateStockValue = (stockItems) => {
  return stockItems.reduce((total, item) => {
    return total + (item.quantity * item.price);
  }, 0);
};
