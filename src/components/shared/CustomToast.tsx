import { toast } from 'react-hot-toast';

interface CustomToastProps {
  message: string;
  icon?: string;
  duration?: number;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export const showCustomToast = ({ 
  message, 
  icon = '✅', 
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
    icon,

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
  return showCustomToast({ message, icon: '✅' });
};

export const showErrorToast = (message: string) => {
  return showCustomToast({ message, icon: '❌' });
};

export const showWarningToast = (message: string) => {
  return showCustomToast({ message, icon: '⚠️' });
};

export const showInfoToast = (message: string) => {
  return showCustomToast({ message, icon: 'ℹ️' });
};

export default showCustomToast;
