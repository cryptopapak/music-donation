// Форматирование времени
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Форматирование даты
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// Форматирование суммы
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Генерация случайного ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Проверка URL
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Получение домена из URL
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}
