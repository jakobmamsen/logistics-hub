import React from 'react';
import { AlertCircle, CheckCircle, InfoIcon } from 'lucide-react';

const Alert = ({ 
  type = 'info', 
  title, 
  message, 
  onClose,
  className = '',
  ...props 
}) => {
  const types = {
    info: { bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-800', icon: InfoIcon },
    success: { bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-800', icon: CheckCircle },
    error: { bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-800', icon: AlertCircle },
    warning: { bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200', textColor: 'text-yellow-800', icon: AlertCircle },
  };
  
  const config = types[type] || types.info;
  const Icon = config.icon;

  return (
    <div 
      className={`${config.bgColor} border ${config.borderColor} rounded-md p-4 ${config.textColor} ${className}`}
      {...props}
    >
      <div className="flex items-start">
        <Icon className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          {title && <h3 className="font-medium">{title}</h3>}
          {message && <p className="text-sm mt-1">{message}</p>}
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="ml-3 text-sm font-medium hover:opacity-75"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
