'use client';

/**
 * 全局 Toast 通知：右上角弹出，3 秒自动消失。
 * 用法：const toast = useToast(); toast.success('保存成功');
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface ToastItem {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastContextValue {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((type: ToastItem['type'], text: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const value: ToastContextValue = {
    success: (text) => push('success', text),
    error: (text) => push('error', text),
    info: (text) => push('info', text),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 top-16 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-lg border px-4 py-2.5 text-sm shadow-lg backdrop-blur-sm transition-all ${
              t.type === 'success'
                ? 'border-green-200 bg-green-50/95 text-green-800 dark:border-green-800 dark:bg-green-900/90 dark:text-green-200'
                : t.type === 'error'
                  ? 'border-red-200 bg-red-50/95 text-red-800 dark:border-red-800 dark:bg-red-900/90 dark:text-red-200'
                  : 'border-blue-200 bg-blue-50/95 text-blue-800 dark:border-blue-800 dark:bg-blue-900/90 dark:text-blue-200'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
