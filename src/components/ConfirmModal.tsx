"use client";
import React, { useEffect } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "red" | "blue" | "green" | "orange";
  icon?: "warning" | "danger" | "info" | "question";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title = "Confirmare",
  message,
  confirmText = "Confirmă",
  cancelText = "Anulează",
  confirmColor = "red",
  icon = "warning",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onCancel();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const colorClasses = {
    red: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    blue: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    green: "bg-green-600 hover:bg-green-700 focus:ring-green-500",
    orange: "bg-orange-600 hover:bg-orange-700 focus:ring-orange-500",
  };

  const iconColors = {
    warning: "text-yellow-500 bg-yellow-100",
    danger: "text-red-500 bg-red-100",
    info: "text-blue-500 bg-blue-100",
    question: "text-purple-500 bg-purple-100",
  };

  const icons = {
    warning: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    danger: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    info: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    question: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in zoom-in-95 duration-200">
          {/* Header with icon */}
          <div className="pt-6 pb-4 px-6 text-center">
            <div className={`mx-auto w-16 h-16 rounded-full ${iconColors[icon]} flex items-center justify-center mb-4`}>
              {icons[icon]}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 leading-relaxed">{message}</p>
          </div>
          
          {/* Actions */}
          <div className="px-6 pb-6 flex gap-3 justify-center">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              autoFocus
              className={`px-6 py-2.5 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${colorClasses[confirmColor]}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook pentru a folosi confirm modal mai ușor
export function useConfirmModal() {
  const [modalState, setModalState] = React.useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: "red" | "blue" | "green" | "orange";
    icon?: "warning" | "danger" | "info" | "question";
    onConfirm: () => void;
  } | null>(null);

  const confirm = (options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmColor?: "red" | "blue" | "green" | "orange";
    icon?: "warning" | "danger" | "info" | "question";
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        ...options,
        onConfirm: () => {
          setModalState(null);
          resolve(true);
        },
      });
    });
  };

  const ConfirmModalComponent = modalState ? (
    <ConfirmModal
      isOpen={modalState.isOpen}
      title={modalState.title}
      message={modalState.message}
      confirmText={modalState.confirmText}
      cancelText={modalState.cancelText}
      confirmColor={modalState.confirmColor}
      icon={modalState.icon}
      onConfirm={modalState.onConfirm}
      onCancel={() => setModalState(null)}
    />
  ) : null;

  return { confirm, ConfirmModalComponent };
}
