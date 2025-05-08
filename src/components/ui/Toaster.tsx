import React, { useEffect } from 'react'; // Added useEffect
import { useToastStore, type ToastMessage as ToastMessageType } from '../../hooks/useToast'; 
import { X } from 'lucide-react';
import classNames from 'classnames';

const Toast: React.FC<ToastMessageType & { onDismiss: (id: string) => void }> = ({
  id,
  message,
  type,
  icon,
  onDismiss,
  duration // Receive duration to manage auto-dismiss if needed here, though store handles it
}) => {
  const baseClasses = "flex items-center p-4 mb-3 rounded-lg shadow-lg text-sm w-full max-w-sm transition-all duration-300 ease-in-out transform"; // Added transform for animation
  const typeClasses: Record<ToastMessageType['type'], string> = {
    success: "bg-green-50 text-green-700 border border-green-200",
    error: "bg-red-50 text-red-700 border border-red-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
    warning: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  };
  
  // For enter/exit animations
  const [isVisible, setIsVisible] = React.useState(false);
  useEffect(() => {
    setIsVisible(true); // Trigger enter animation
    // Optional: if managing dismiss animation here
    // if (!duration) return; // Only if auto-dismissing from component
    // const timer = setTimeout(() => {
    //   setIsVisible(false);
    //   setTimeout(() => onDismiss(id), 300); // Wait for animation before removing
    // }, duration);
    // return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);


  return (
    <div 
        className={classNames(
            baseClasses, 
            typeClasses[type],
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full' // Animation classes
        )} 
        role="alert"
    >
      {icon && <span className="mr-3 flex-shrink-0">{icon}</span>} {/* Added flex-shrink-0 */}
      <div className="flex-grow break-words">{message}</div> {/* Added break-words */}
      <button
        onClick={() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(id), 300); // Animate out then dismiss
        }}
        className={classNames(
            "ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg inline-flex h-8 w-8 focus:ring-2 flex-shrink-0", // Added flex-shrink-0
            {
                'bg-green-50 text-green-500 hover:bg-green-100 focus:ring-green-400': type === 'success',
                'bg-red-50 text-red-500 hover:bg-red-100 focus:ring-red-400': type === 'error',
                'bg-blue-50 text-blue-500 hover:bg-blue-100 focus:ring-blue-400': type === 'info',
                'bg-yellow-50 text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-400': type === 'warning',
            }
        )}
        aria-label="Close"
      >
        <X size={20} />
      </button>
    </div>
  );
};

export const Toaster: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-5 right-5 z-[100] space-y-2 w-full max-w-sm"> {/* Added w-full max-w-sm for consistency */}
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={removeToast} />
      ))}
    </div>
  );
};