import { create } from 'zustand';
import { AlertCircle, AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'; // Added AlertTriangle
import React from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  icon?: React.ReactNode;
}

interface ToastState {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const typeIcons: Record<ToastType, React.ReactNode> = {
  success: React.createElement(CheckCircle, { className: "text-green-500", size: 20 }),
  error: React.createElement(XCircle, { className: "text-red-500", size: 20 }),
  info: React.createElement(Info, { className: "text-blue-500", size: 20 }),
  warning: React.createElement(AlertTriangle, { className: "text-yellow-500", size: 20 }), // Using AlertTriangle for warning
};


export const useToastStore = create<ToastState>((set, get) => ({ // Added get
  toasts: [],
  showToast: (message, type = 'info', duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    const icon = typeIcons[type];
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration, icon }],
    }));
    if (duration) {
      setTimeout(() => {
        get().removeToast(id); // Use get().removeToast to ensure it calls the latest version
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

export const useToast = () => {
  const showToast = useToastStore((state) => state.showToast);
  return { showToast };
};