import React from 'react';

export const Alert = ({ 
  type = 'info', 
  title, 
  message, 
  onClose,
  className = '' 
}) => {
  const typeStyles = {
    info: 'bg-blue-100 border-blue-400 text-blue-700',
    success: 'bg-green-100 border-green-400 text-green-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    error: 'bg-red-100 border-red-400 text-red-700',
  };

  return (
    <div className={`border-l-4 p-4 ${typeStyles[type]} ${className}`}>
      {title && <h4 className="font-semibold">{title}</h4>}
      {message && <p className="text-sm">{message}</p>}
      {onClose && (
        <button
          onClick={onClose}
          className="text-sm underline mt-2"
        >
          Dismiss
        </button>
      )}
    </div>
  );
};

export default Alert;
