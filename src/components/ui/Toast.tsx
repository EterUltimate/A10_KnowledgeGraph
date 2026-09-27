'use client';

/**
 * 全局 Toast 通知：右上角弹出（弹簧浮入），3.5 秒自动消失。
 * 语义色：success=green / error=red / info=blue，左侧 3px 强调线区分权重。
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

const TOAST_STYLE: Record<ToastItem['type'], { bar: string; text: string; dot: string }> = {
  success: { bar: 'var(--acc-green)', text: 'text-fg', dot: 'bg-acc-green' },
  error: { bar: 'var(--acc-red)', text: 'text-fg', dot: 'bg-acc-red' },
  info: { bar: 'var(--acc-blue)', text: 'text-fg', dot: 'bg-acc-blue' },
};

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
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-16 z-50 flex flex-col gap-2"
      >
        {toasts.map((t) => {
          const s = TOAST_STYLE[t.type];
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-2.5 overflow-hidden rounded-lg border border-line bg-surface/95 py-2.5 pl-0 pr-4 text-sm shadow-lg backdrop-blur-sm ${s.text}`}
              style={{ animation: 'fade-up 260ms var(--ease-spring-soft)' }}
              role="status"
            >
              <span
                aria-hidden="true"
                className={`h-full w-[3px] self-stretch ${s.dot}`}
                style={{ borderRadius: 1 }}
              />
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
              {t.text}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
