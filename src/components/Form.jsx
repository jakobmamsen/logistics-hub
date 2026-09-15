import React from 'react';

export const Form = ({ 
  onSubmit, 
  children, 
  className = '',
  ...props 
}) => {
  return (
    <form 
      onSubmit={onSubmit}
      className={`space-y-4 ${className}`}
      {...props}
    >
      {children}
    </form>
  );
};

export const FormGroup = ({ children, className = '' }) => {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
};

export const FormLabel = ({ children, htmlFor, className = '' }) => {
  return (
    <label 
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-700 ${className}`}
    >
      {children}
    </label>
  );
};

export const FormInput = ({ 
  error, 
  className = '', 
  ...props 
}) => {
  return (
    <>
      <input
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
        {...props}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </>
  );
};

export default Form;
