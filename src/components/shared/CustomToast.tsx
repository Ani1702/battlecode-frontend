import React from 'react';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface CustomToastProps {
  message: string;
  icon?: React.ReactNode;
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export const showCustomToast = ({ 
  message, 
  icon = <CheckCircle className="h-4 w-4" />, 
  duration = 2000, 
  position = 'bottom-right' 
}: CustomToastProps) => {
  return toast(message, {
    duration,
    position,

    // Styling to match UI theme
    style: {
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(10px)',
      border: '1px solid #f97316',
      borderRadius: '8px',
      color: '#ffffff',
      fontFamily: 'Oxanium, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    },
    className: '',

    // Custom Icon
    icon: icon as any,

    // Change colors of success/error/loading icon to match theme
    iconTheme: {
      primary: '#f97316',
      secondary: '#ffffff',
    },

    // Aria
    ariaProps: {
      role: 'status',
      'aria-live': 'polite',
    },

    // Additional Configuration
    removeDelay: 1000,
    toasterId: 'default',
  });
};

// Additional toast variants for different message types
export const showSuccessToast = (message: string) => {
  return showCustomToast({ message, icon: <CheckCircle className="h-4 w-4 text-green-400" /> });
};

export const showErrorToast = (message: string) => {
  return showCustomToast({ message, icon: <XCircle className="h-4 w-4 text-red-400" /> });
};

export const showWarningToast = (message: string) => {
  return showCustomToast({ message, icon: <AlertTriangle className="h-4 w-4 text-yellow-400" /> });
};

export const showInfoToast = (message: string) => {
  return showCustomToast({ message, icon: <Info className="h-4 w-4 text-blue-400" /> });
};

export default showCustomToast;
