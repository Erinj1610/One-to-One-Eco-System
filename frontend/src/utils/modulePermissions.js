/**
 * Canonical mapping between system feature modules and frontend routes/IDs.
 */

export const SYSTEM_MODULES = [
  'Dashboard',
  'CRM',
  'Pipeline',
  'Design tracker',
  'Projects',
  'Design fee',
  'Time tracking',
  'Products',
  'BOQ Maker',
  'Orders',
  'Invoices',
  'Documents',
  'HR & people',
  'Reports',
  'Support'
];

export const PATH_TO_MODULE = {
  '/dashboard': 'Dashboard',
  '/crm': 'CRM',
  '/pipeline': 'Pipeline',
  '/sales-tracker': 'Pipeline',
  '/tracker': 'Design tracker',
  '/projects': 'Projects',
  '/designfee': 'Design fee',
  '/design': 'Design fee',
  '/time': 'Time tracking',
  '/products': 'Products',
  '/boq': 'BOQ Maker',
  '/orders': 'Orders',
  '/purchasing': 'Orders',
  '/logistics': 'Orders',
  '/invoices': 'Invoices',
  '/payments': 'Invoices',
  '/docs': 'Documents',
  '/hr': 'HR & people',
  '/reports': 'Reports',
  '/ticket-logger': 'Support',
  '/support': 'Support',
};

export const MODULE_ID_TO_SYSTEM_MODULE = {
  'dashboard': 'Dashboard',
  'crm': 'CRM',
  'pipeline': 'Pipeline',
  'sales_tracker': 'Pipeline',
  'tracker': 'Design tracker',
  'projects': 'Projects',
  'design': 'Design fee',
  'designfee': 'Design fee',
  'time': 'Time tracking',
  'products': 'Products',
  'boq': 'BOQ Maker',
  'orders': 'Orders',
  'purchasing': 'Orders',
  'logistics': 'Orders',
  'invoices': 'Invoices',
  'payments': 'Invoices',
  'docs': 'Documents',
  'hr': 'HR & people',
  'reports': 'Reports',
  'ticket_logger': 'Support',
  'support': 'Support'
};

export const getSystemModuleForPath = (pathname) => {
  if (!pathname) return null;
  if (PATH_TO_MODULE[pathname]) return PATH_TO_MODULE[pathname];
  for (const [path, moduleName] of Object.entries(PATH_TO_MODULE)) {
    if (path !== '/' && pathname.startsWith(path)) {
      return moduleName;
    }
  }
  return null;
};
