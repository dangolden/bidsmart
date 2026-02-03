import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NotificationToastProps {
  show: boolean;
  title: string;
  message: string;
  onClose: () => void;
  autoClose?: number; // milliseconds
}

export function NotificationToast({ 
  show, 
  title, 
  message, 
  onClose, 
  autoClose = 8000 
}: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      if (autoClose) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(onClose, 300); // Wait for animation
        }, autoClose);
        return () => clearTimeout(timer);
      }
    }
  }, [show, autoClose, onClose]);

  if (!show && !isVisible) return null;

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-sm w-full
      transform transition-all duration-300 ease-out
      ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-switch-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-switch-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onClose, 300);
            }}
            className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
            aria-label="Close notification"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}
