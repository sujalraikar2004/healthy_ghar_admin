import {
  PermissionAction,
  PermissionModule,
  RoleDefinition,
  RoleId,
  RolePermissionMatrix,
} from '../types';

export const ALL_MODULES: { id: PermissionModule; label: string; group: string }[] = [
  { id: 'dashboard', label: 'Dashboard Overview', group: 'Overview' },
  { id: 'products', label: 'Products Catalogue', group: 'Catalog' },
  { id: 'categories', label: 'Categories & Taxonomy', group: 'Catalog' },
  { id: 'brands', label: 'Brands & Manufacturers', group: 'Catalog' },
  { id: 'reviews', label: 'Product Reviews', group: 'Catalog' },
  { id: 'inventory', label: 'Inventory & Stock', group: 'Inventory' },
  { id: 'batches', label: 'Batches & FEFO Expiry', group: 'Inventory' },
  { id: 'transfers', label: 'Stock Transfers', group: 'Inventory' },
  { id: 'purchase_orders', label: 'Purchase Orders & GRN', group: 'Inventory' },
  { id: 'suppliers', label: 'Suppliers Directory', group: 'Inventory' },
  { id: 'warehouses', label: 'Warehouses & Hubs', group: 'Inventory' },
  { id: 'orders', label: 'Order Fulfillment', group: 'Sales & Ops' },
  { id: 'prescriptions', label: 'Prescription Verification', group: 'Sales & Ops' },
  { id: 'returns', label: 'Returns & Cancellations', group: 'Sales & Ops' },
  { id: 'delivery', label: 'Delivery & 3PL Logistics', group: 'Sales & Ops' },
  { id: 'payments', label: 'Payments Ledger', group: 'Finance' },
  { id: 'refunds', label: 'Refund Processing', group: 'Finance' },
  { id: 'customers', label: 'Customers & Groups', group: 'Customers' },
  { id: 'support', label: 'Support Tickets', group: 'Customers' },
  { id: 'consultations', label: 'Doctor Consultations', group: 'Healthcare' },
  { id: 'doctors', label: 'Doctors & Credentialing', group: 'Healthcare' },
  { id: 'coupons', label: 'Coupons & Discounts', group: 'Marketing' },
  { id: 'campaigns', label: 'Campaigns', group: 'Marketing' },
  { id: 'banners', label: 'Promotional Banners', group: 'Marketing' },
  { id: 'notifications', label: 'Notifications & Templates', group: 'Operations' },
  { id: 'analytics', label: 'Analytics & Reports', group: 'Analytics' },
  { id: 'staff', label: 'Staff Management', group: 'Administration' },
  { id: 'roles', label: 'Roles & Permissions', group: 'Administration' },
  { id: 'activity_logs', label: 'Activity & Security Logs', group: 'Administration' },
  { id: 'settings', label: 'Pharmacy Settings', group: 'Administration' },
];

export const ALL_ACTIONS: PermissionAction[] = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'export',
  'manage',
];

function fullAccess(): RolePermissionMatrix {
  return ALL_MODULES.reduce((acc, mod) => {
    acc[mod.id] = [...ALL_ACTIONS];
    return acc;
  }, {} as RolePermissionMatrix);
}

function emptyMatrix(): RolePermissionMatrix {
  return ALL_MODULES.reduce((acc, mod) => {
    acc[mod.id] = [];
    return acc;
  }, {} as RolePermissionMatrix);
}

function withOverrides(
  overrides: Partial<Record<PermissionModule, PermissionAction[]>>
): RolePermissionMatrix {
  return {
    ...emptyMatrix(),
    ...overrides,
  };
}

export const INITIAL_ROLES: RoleDefinition[] = [
  {
    id: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Unrestricted enterprise governance across all clinical, operational, financial, and RBAC modules.',
    badgeColor: 'bg-primary-container text-on-primary',
    permissions: fullAccess(),
  },
  {
    id: 'ADMIN',
    name: 'Administrator',
    description: 'Full operational oversight excluding destructive super-admin RBAC overrides.',
    badgeColor: 'bg-primary-fixed text-on-primary-fixed',
    permissions: {
      ...fullAccess(),
      roles: ['view', 'export'],
      activity_logs: ['view', 'export'],
    },
  },
  {
    id: 'PHARMACIST',
    name: 'Pharmacist (RMP / Reg)',
    description: 'Licensed clinical pharmacist authorized to review, approve, reject, or clarify Schedule H/H1/X prescriptions.',
    badgeColor: 'bg-tertiary-fixed text-on-tertiary-fixed',
    permissions: withOverrides({
      dashboard: ['view'],
      products: ['view'],
      categories: ['view'],
      brands: ['view'],
      inventory: ['view'],
      batches: ['view'],
      orders: ['view', 'edit'],
      prescriptions: ['view', 'edit', 'approve', 'export', 'manage'],
      customers: ['view'],
      consultations: ['view', 'edit'],
      doctors: ['view'],
      notifications: ['view'],
    }),
  },
  {
    id: 'INVENTORY_MANAGER',
    name: 'Inventory Manager',
    description: 'Governs stock adjustments, FEFO batch lifecycle, inter-hub transfers, suppliers, and PO/GRN dock receipts.',
    badgeColor: 'bg-secondary-container text-on-secondary-container',
    permissions: withOverrides({
      dashboard: ['view'],
      products: ['view', 'create', 'edit', 'export'],
      categories: ['view', 'create', 'edit'],
      brands: ['view', 'create', 'edit'],
      inventory: ['view', 'create', 'edit', 'approve', 'export', 'manage'],
      batches: ['view', 'create', 'edit', 'approve', 'export', 'manage'],
      warehouses: ['view', 'edit', 'manage'],
      transfers: ['view', 'create', 'edit', 'approve', 'manage'],
      suppliers: ['view', 'create', 'edit', 'export'],
      purchase_orders: ['view', 'create', 'edit', 'approve', 'export', 'manage'],
      analytics: ['view', 'export'],
      notifications: ['view'],
    }),
  },
  {
    id: 'ORDER_MANAGER',
    name: 'Order Manager',
    description: 'Controls order processing, packing slips, validated fulfillment transitions, and 3PL delivery dispatch.',
    badgeColor: 'bg-surface-container-high text-primary',
    permissions: withOverrides({
      dashboard: ['view'],
      products: ['view'],
      inventory: ['view'],
      orders: ['view', 'create', 'edit', 'approve', 'export', 'manage'],
      prescriptions: ['view'],
      returns: ['view', 'edit', 'approve'],
      delivery: ['view', 'create', 'edit', 'manage', 'export'],
      customers: ['view'],
      notifications: ['view'],
    }),
  },
  {
    id: 'FINANCE_MANAGER',
    name: 'Finance Manager',
    description: 'Handles payment gateway reconciliation, GST invoices, statutory refund approvals, and financial exports.',
    badgeColor: 'bg-tertiary-fixed-dim/40 text-on-tertiary-fixed',
    permissions: withOverrides({
      dashboard: ['view'],
      orders: ['view', 'export'],
      payments: ['view', 'edit', 'export', 'manage'],
      refunds: ['view', 'create', 'edit', 'approve', 'export', 'manage'],
      returns: ['view', 'approve', 'export'],
      purchase_orders: ['view', 'approve', 'export'],
      analytics: ['view', 'export'],
      notifications: ['view'],
    }),
  },
  {
    id: 'MARKETING_MANAGER',
    name: 'Marketing Manager',
    description: 'Manages promo coupons, DPCO rules, seasonal campaigns, storefront banners, and review moderation.',
    badgeColor: 'bg-primary-fixed/60 text-on-primary-fixed',
    permissions: withOverrides({
      dashboard: ['view'],
      products: ['view'],
      categories: ['view'],
      brands: ['view'],
      coupons: ['view', 'create', 'edit', 'delete', 'manage'],
      campaigns: ['view', 'create', 'edit', 'delete', 'manage'],
      banners: ['view', 'create', 'edit', 'delete', 'manage'],
      reviews: ['view', 'edit', 'approve', 'manage'],
      customers: ['view'],
      analytics: ['view', 'export'],
      notifications: ['view', 'create'],
    }),
  },
  {
    id: 'CUSTOMER_SUPPORT',
    name: 'Customer Support',
    description: 'Handles support tickets, customer order inquiries, return initiation, and consultation scheduling.',
    badgeColor: 'bg-surface-container text-on-surface',
    permissions: withOverrides({
      dashboard: ['view'],
      products: ['view'],
      orders: ['view'],
      prescriptions: ['view'],
      returns: ['view', 'create'],
      delivery: ['view'],
      customers: ['view', 'edit'],
      consultations: ['view', 'create', 'edit'],
      doctors: ['view'],
      support: ['view', 'create', 'edit', 'manage'],
      reviews: ['view'],
      notifications: ['view'],
    }),
  },
  {
    id: 'ANALYST',
    name: 'Analyst',
    description: 'Read-only analytical access across sales, inventory velocity, prescriptions, and CSV/PDF export center.',
    badgeColor: 'bg-surface-container-highest text-on-surface-variant',
    permissions: withOverrides({
      dashboard: ['view', 'export'],
      products: ['view', 'export'],
      inventory: ['view', 'export'],
      batches: ['view', 'export'],
      orders: ['view', 'export'],
      payments: ['view', 'export'],
      analytics: ['view', 'export'],
      activity_logs: ['view', 'export'],
    }),
  },
];

export function hasPermission(
  roles: RoleDefinition[],
  roleId: RoleId | undefined | null,
  module: PermissionModule,
  action: PermissionAction = 'view'
): boolean {
  if (!roleId) return false;
  const role = roles.find((r) => r.id === roleId);
  if (!role) return false;
  const perms = role.permissions[module] || [];
  if (perms.includes('manage')) return true;
  return perms.includes(action);
}

export function getRoleDefinition(roles: RoleDefinition[], roleId: RoleId): RoleDefinition {
  return roles.find((r) => r.id === roleId) || INITIAL_ROLES[0];
}
