"use client";

interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

export default function Toast({ message, type }: ToastProps) {
  return (
    <div
      className={`fixed top-6 right-6 z-[9999] px-6 py-3 rounded shadow-lg text-white font-semibold flex items-center gap-2 transition-all ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
      role="alert"
    >
      {type === 'success' ? '✓' : '!'} {message}
    </div>
  );
}
