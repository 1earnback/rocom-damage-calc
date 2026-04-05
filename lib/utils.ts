export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function lazyLoad<T>(
  loader: () => Promise<T>,
  options: {
    timeout?: number;
    retries?: number;
  } = {}
): Promise<T> {
  const { timeout = 30000, retries = 3 } = options;

  let lastError: Error | null = null;

  return new Promise((resolve, reject) => {
    const attempt = (retryCount: number) => {
      const timer = setTimeout(() => {
        reject(new Error(`Load timeout after ${timeout}ms`));
      }, timeout);

      loader()
        .then((data) => {
          clearTimeout(timer);
          resolve(data);
        })
        .catch((error) => {
          clearTimeout(timer);
          lastError = error;

          if (retryCount < retries) {
            setTimeout(() => attempt(retryCount + 1), 1000 * (retryCount + 1));
          } else {
            reject(lastError);
          }
        });
    };

    attempt(0);
  });
}

export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${formatNumber(value * 100, decimals)}%`;
}
