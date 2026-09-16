import React, { useState } from 'react';

const FormGroup = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

const FormLabel = ({ htmlFor, children, className = '' }) => (
  <label htmlFor={htmlFor} className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}>
    {children}
  </label>
);

const FormInput = ({ error, className = '', ...props }) => (
  <>
    <input
      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
      {...props}
    />
    {error && <p className="text-red-500 text-sm">{error}</p>}
  </>
);

const Form = ({ children, onSubmit, className = '' }) => (
  <form onSubmit={onSubmit} className={className}>
    {children}
  </form>
);

// Attach sub-components as properties
Form.Group = FormGroup;
Form.Label = FormLabel;
Form.Input = FormInput;

export default Form;
export { FormGroup, FormLabel, FormInput };
