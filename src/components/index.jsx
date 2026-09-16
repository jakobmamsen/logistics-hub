// Re-export all components as named exports from their default exports
export { default as Button } from './Button';
export { default as Alert } from './Alert';
export { default as Badge } from './Badge';
export { default as Card } from './Card';
export { default as Modal } from './Modal';
export { default as Tabs } from './Tabs';
export { default as Table } from './Table';
export { default as Notification } from './Notification';
export { default as Form } from './Form';

// Re-export Form sub-components as named exports
export { FormGroup, FormLabel, FormInput } from './Form';

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
  return <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[status] || statusColors.inactive}`}>{status}</span>;
};
