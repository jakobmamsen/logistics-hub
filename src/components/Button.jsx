import React from 'react';

export const Button = ({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary',
  disabled = false,
  type = 'button',
  ...props 
}) => {
  const baseStyles = 'px-4 py-2 rounded font-medium transition-colors';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400',
    success: 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
