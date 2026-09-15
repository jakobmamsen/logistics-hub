// Export all components
export { default as Card } from './Card';
export { default as Button } from './Button';
export { default as Alert } from './Alert';
export { default as Badge } from './Badge';
export { default as Form, FormGroup, FormLabel, FormInput } from './Form';
export { default as Modal } from './Modal';
export { default as Tabs } from './Tabs';
export { default as Table } from './Table';
export { default as Notification } from './Notification';

// Aliases for common UI patterns
export const CardBody = ({ children, className = '' }) => (
  <div className={`space-y-4 ${className}`}>{children}</div>
);

export const CardHeader = ({ children, className = '' }) => (
  <div className={`border-b pb-4 mb-4 ${className}`}>{children}</div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);

export const TableHead = ({ children, className = '' }) => (
  <thead className={`bg-gray-100 ${className}`}>{children}</thead>
);

export const TableBody = ({ children, className = '' }) => (
  <tbody className={className}>{children}</tbody>
);

export const TableRow = ({ children, className = '' }) => (
  <tr className={`border-b hover:bg-gray-50 ${className}`}>{children}</tr>
);

export const TableHeader = ({ children, className = '' }) => (
  <th className={`px-4 py-2 text-left text-sm font-semibold ${className}`}>{children}</th>
);

export const TableCell = ({ children, className = '' }) => (
  <td className={`px-4 py-2 text-sm ${className}`}>{children}</td>
);

export const StatusBadge = ({ status, className = '' }) => {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${statusColors[status] || statusColors.inactive} ${className}`}>
      {status}
    </span>
  );
};

export const Select = ({ label, options = [], error, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium mb-1">{label}</label>}
    <select
      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
      {...props}
    >
      {options.map((opt, idx) => (
        <option key={idx} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
);

export const Input = ({ label, error, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-sm font-medium mb-1">{label}</label>}
    <input
      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
      {...props}
    />
    {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
  </div>
);

export const useModalState = (initialState = false) => {
  const [isOpen, setIsOpen] = React.useState(initialState);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(!isOpen),
  };
};
