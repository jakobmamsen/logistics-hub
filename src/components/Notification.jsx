import React from 'react';

export const Notification = ({ 
  type = 'info',
  message,
  onClose,
  className = ''
}) => {
  const typeStyles = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700',
  };

  return (
    <div className={`border-l-4 p-4 ${typeStyles[type]} ${className}`}>
      <div className="flex justify-between items-center">
        <p>{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-4 font-bold"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default Notification;
