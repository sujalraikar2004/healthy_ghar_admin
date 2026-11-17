import React, { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { usePharmacyStore } from '../store/usePharmacyStore';
import { useToastStore } from '../store/useToastStore';
import { PermissionModule, RoleId } from '../types';
import { daysUntil, formatIndianDateTime } from '../utils/formatters';
import { BrandEmblem, StaffAvatar } from '../components/common/BrandEmblem';
import { GlobalSearchModal } from '../components/common/GlobalSearchModal';
import { QuickOrderModal } from '../components/common/QuickOrderModal';

interface NavItemConfig {
  label: string;
  path: string;
  icon: string;
  module: PermissionModule;
  badgeCount?: number;
  badgeStyle?: string;
}

interface NavGroupConfig {
  title: string;
  items: NavItemConfig[];
}

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const session = usePharmacyStore((s) => s.session);
  const roles = usePharmacyStore((s) => s.roles);
  const warehouses = usePharmacyStore((s) => s.warehouses);
  const activeHubId = usePharmacyStore((s) => s.activeHubId);
  const setActiveHub = usePharmacyStore((s) => s.setActiveHub);
  const batches = usePharmacyStore((s) => s.batches);
  const orders = usePharmacyStore((s) => s.orders);
  const prescriptions = usePharmacyStore((s) => s.prescriptions);
  const notifications = usePharmacyStore((s) => s.notifications);
  const markNotificationRead = usePharmacyStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = usePharmacyStore((s) => s.markAllNotificationsRead);
  const switchDemoRole = usePharmacyStore((s) => s.switchDemoRole);
  const expireSession = usePharmacyStore((s) => s.expireSession);
  const logout = usePharmacyStore((s) => s.logout);
  const can = usePharmacyStore((s) => s.can);
  const currentUser = usePharmacyStore((s) => s.getCurrentUser());
  const pushToast = useToastStore((s) => s.pushToast);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [profileMenuOpen]);

  const expiringBatchCount = useMemo(
    () => batches.filter((b) => b.status !== 'Quarantined' && b.availableQty > 0 && daysUntil(b.expiryDate) <= 60).length,
    [batches]
  );

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Cancelled').length,
    [orders]
  );

  const pendingRxCount = useMemo(
    () => prescriptions.filter((r) => r.status === 'Pending Review' || r.status === 'Under Review' || r.status === 'Uploaded').length,
    [prescriptions]
  );

  const unreadNotifCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const navGroups: NavGroupConfig[] = [
    {
      title: 'Overview',
      items: [{ label: 'Dashboard', path: '/dashboard', icon: 'grid_view', module: 'dashboard' }],
    },
    {
      title: 'Catalog',
      items: [
        { label: 'Products', path: '/products', icon: 'medication', module: 'products' },
        { label: 'Categories', path: '/categories', icon: 'category', module: 'categories' },
        { label: 'Brands', path: '/brands', icon: 'verified', module: 'brands' },
        { label: 'Product Reviews', path: '/product-reviews', icon: 'rate_review', module: 'reviews' },
      ],
    },
    {
      title: 'Inventory',
      items: [
        { label: 'Inventory Overview', path: '/inventory-overview', icon: 'inventory_2', module: 'inventory' },
        { label: 'Stock Management', path: '/stock-management', icon: 'package_2', module: 'inventory' },
        {
          label: 'Batches & Expiry',
          path: '/batches-and-expiry',
          icon: 'event_busy',
          module: 'batches',
          badgeCount: expiringBatchCount,
          badgeStyle: 'bg-error-container text-on-error-container',
        },
        { label: 'Stock Transfers', path: '/stock-transfers', icon: 'sync_alt', module: 'transfers' },
        { label: 'Purchase Orders', path: '/purchase-orders', icon: 'receipt_long', module: 'purchase_orders' },
        { label: 'Suppliers', path: '/suppliers', icon: 'local_shipping', module: 'suppliers' },
        { label: 'Warehouses', path: '/warehouses', icon: 'warehouse', module: 'warehouses' },
      ],
    },
    {
      title: 'Sales & Operations',
      items: [
        {
          label: 'Orders',
          path: '/orders',
          icon: 'shopping_bag',
          module: 'orders',
          badgeCount: pendingOrdersCount,
          badgeStyle: 'bg-secondary-container text-on-secondary-container',
        },
        {
          label: 'Prescriptions',
          path: '/prescriptions',
          icon: 'clinical_notes',
          module: 'prescriptions',
          badgeCount: pendingRxCount,
          badgeStyle: 'bg-tertiary-fixed text-on-tertiary-fixed',
        },
        { label: 'Returns & Refunds', path: '/returns-and-refunds', icon: 'assignment_return', module: 'returns' },
        { label: 'Delivery Management', path: '/delivery-management', icon: 'moped', module: 'delivery' },
        { label: 'Payments', path: '/payments', icon: 'payments', module: 'payments' },
      ],
    },
    {
      title: 'Customers',
      items: [
        { label: 'Customers', path: '/customers', icon: 'groups', module: 'customers' },
        { label: 'Customer Groups', path: '/customer-groups', icon: 'folder_shared', module: 'customers' },
        { label: 'Support Tickets', path: '/support-tickets', icon: 'support_agent', module: 'support' },
      ],
    },
    {
      title: 'Healthcare Services',
      items: [
        { label: 'Doctor Consultations', path: '/doctor-consultations', icon: 'video_call', module: 'consultations' },
        { label: 'Doctors', path: '/doctors', icon: 'stethoscope', module: 'doctors' },
      ],
    },
    {
      title: 'Marketing',
      items: [
        { label: 'Coupons & Discounts', path: '/coupons-and-discounts', icon: 'sell', module: 'coupons' },
        { label: 'Promotional Banners', path: '/promotional-banners', icon: 'view_carousel', module: 'banners' },
        { label: 'Notifications Center', path: '/notifications', icon: 'campaign', module: 'notifications' },
      ],
    },
    {
      title: 'Analytics',
      items: [
        { label: 'Sales Analytics', path: '/sales-analytics', icon: 'monitoring', module: 'analytics' },
        { label: 'Inventory Analytics', path: '/inventory-analytics', icon: 'query_stats', module: 'analytics' },
      ],
    },
    {
      title: 'Administration',
      items: [
        { label: 'Staff Management', path: '/staff-management', icon: 'badge', module: 'staff' },
        { label: 'Roles & Permissions', path: '/roles-and-permissions', icon: 'admin_panel_settings', module: 'roles' },
        { label: 'Activity Logs', path: '/activity-logs', icon: 'history_toggle_off', module: 'activity_logs' },
        { label: 'Settings', path: '/settings', icon: 'settings', module: 'settings' },
      ],
    },
  ];

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(item.module, 'view')),
    }))
    .filter((g) => g.items.length > 0);

  const currentRoleDef = roles.find((r) => r.id === session?.roleId);
  const currentHubObj = warehouses.find((w) => w.id === activeHubId);

  const pageCrumb = useMemo(() => {
    const seg = location.pathname.split('/').filter(Boolean)[0] || 'dashboard';
    return seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }, [location.pathname]);

  const handleRoleSwitch = (roleId: RoleId) => {
    const res = switchDemoRole(roleId);
    setProfileMenuOpen(false);
    if (res.ok) {
      pushToast({ type: 'info', title: 'Role Context Switched', description: res.message });
    }
  };

  const sidebarContent = (
    <>
      <div className="h-16 px-space-md flex items-center justify-between bg-surface-container-lowest shrink-0">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-space-xs text-left"
        >
          <BrandEmblem />
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight leading-none">
                Healthy Ghar
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                Operations Core
              </span>
            </div>
          )}
        </button>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center px-space-xs py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
              v2.4
            </span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 rounded-lg text-on-surface-variant hover:bg-surface-container"
              aria-label="Close navigation menu"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile & Tablet Quick Hub Switcher + Quick Actions */}
      <div className="lg:hidden px-space-sm pt-space-sm pb-space-xs border-b border-outline-variant/25 space-y-2 shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-container-low">
          <span className="material-symbols-outlined text-[16px] text-primary shrink-0">location_on</span>
          <select
            value={activeHubId}
            onChange={(e) => setActiveHub(e.target.value)}
            className="w-full min-w-0 bg-transparent font-label-md text-label-md text-on-surface focus:outline-none"
            aria-label="Mobile fulfillment hub filter"
          >
            <option value="ALL">All India Hubs (3)</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.city} ({w.code})
              </option>
            ))}
          </select>
        </div>
        {(can('orders', 'create') || can('products', 'create')) && (
          <div className="grid grid-cols-2 gap-1.5">
            {can('orders', 'create') && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setQuickOrderOpen(true);
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-surface-container-high text-on-surface font-title-md text-body-sm"
              >
                <span className="material-symbols-outlined text-[15px]">add_circle</span>
                <span>+ Order</span>
              </button>
            )}
            {can('products', 'create') && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/products/new');
                }}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm"
              >
                <span className="material-symbols-outlined text-[15px]">medication</span>
                <span>+ SKU</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-space-sm py-space-sm space-y-space-md">
        {visibleGroups.map((group) => (
          <nav key={group.title} className="space-y-space-xs">
            {!sidebarCollapsed && (
              <div className="px-space-xs py-space-xs">
                <span className="font-label-sm text-label-sm text-outline tracking-wider uppercase">
                  {group.title}
                </span>
              </div>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-space-sm py-space-xs rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-container text-on-primary font-title-md'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  }`
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <div className="flex items-center gap-space-sm min-w-0">
                  <span className="material-symbols-outlined text-[18px] shrink-0">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <span className="font-body-md text-body-md truncate">{item.label}</span>
                  )}
                </div>
                {!sidebarCollapsed && item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span
                    className={`font-label-sm text-label-sm px-1.5 py-0.5 rounded-full shrink-0 ${
                      item.badgeStyle || 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {item.badgeCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        ))}
      </div>

      <div className="p-space-sm bg-surface-container-low shrink-0">
        <div className="flex items-center justify-between px-space-xs py-space-xs">
          <div className="flex items-center gap-space-xs min-w-0">
            <span className="w-2 h-2 rounded-full bg-primary-container shrink-0" />
            {!sidebarCollapsed && (
              <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                Demo Persistence: Active
              </span>
            )}
          </div>
          {!sidebarCollapsed && (
            <span className="font-label-sm text-label-sm text-outline">
              {currentHubObj ? currentHubObj.code : 'ALL'}
            </span>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-screen bg-surface-container-lowest z-50 flex-col shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-200 no-print ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[260px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet Slide-over Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[75] lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-[260px] max-w-[85vw] h-full bg-surface-container-lowest z-10 flex flex-col shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className={`transition-all duration-200 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[260px]'}`}>
        <header
          className={`fixed top-0 right-0 left-0 h-16 bg-surface-container-lowest z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-200 no-print ${
            sidebarCollapsed ? 'lg:left-[76px]' : 'lg:left-[260px]'
          }`}
        >
          <div className="h-16 w-full px-4 sm:px-margin flex items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-sm min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setMobileMenuOpen(true);
                  } else {
                    setSidebarCollapsed((v) => !v);
                  }
                }}
                className="p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                aria-label="Toggle navigation sidebar"
              >
                <span className="material-symbols-outlined text-[20px]">menu_open</span>
              </button>
              <div className="flex sm:hidden items-center min-w-0">
                <span className="text-primary font-title-md text-body-md truncate">{pageCrumb}</span>
              </div>
              <div className="hidden sm:flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant truncate">
                <button type="button" onClick={() => navigate('/dashboard')} className="hover:text-on-surface">
                  Healthy Ghar Admin
                </button>
                <span className="text-outline">/</span>
                <span className="text-primary font-title-md text-title-md truncate">{pageCrumb}</span>
              </div>
            </div>

            {/* Global Search Trigger */}
            <div className="flex-1 max-w-xl hidden md:flex items-center">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="w-full h-9 pl-9 pr-3 bg-surface-container-low rounded-lg font-body-sm text-body-sm text-outline text-left relative hover:bg-surface-container transition-colors shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
              >
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">
                  search
                </span>
                <span className="truncate block pr-10">
                  Search medicines, orders (MED-...), RX, customers, suppliers...
                </span>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  ⌘K
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="md:hidden p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container"
                aria-label="Search"
              >
                <span className="material-symbols-outlined text-[20px]">search</span>
              </button>

              {/* Active Hub Selector */}
              <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                <select
                  value={activeHubId}
                  onChange={(e) => setActiveHub(e.target.value)}
                  className="bg-transparent font-label-md text-label-md text-on-surface focus:outline-none cursor-pointer"
                  aria-label="Active fulfillment hub filter"
                >
                  <option value="ALL">All India Hubs (3)</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.city} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Actions */}
              <div className="hidden xl:flex items-center gap-space-xs">
                {can('orders', 'create') && (
                  <button
                    type="button"
                    onClick={() => setQuickOrderOpen(true)}
                    className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-high text-on-surface font-title-md text-body-sm hover:bg-surface-variant transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    <span>Order</span>
                  </button>
                )}
                {can('products', 'create') && (
                  <button
                    type="button"
                    onClick={() => navigate('/products/new')}
                    className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-primary-container text-on-primary font-title-md text-body-sm hover:bg-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">medication</span>
                    <span>Medicine</span>
                  </button>
                )}
              </div>

              {/* Notification Bell */}
              <button
                type="button"
                onClick={() => setNotifDrawerOpen(true)}
                className="relative p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                aria-label="Open notifications"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[10px] flex items-center justify-center font-bold">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Profile & Role Switcher */}
              <div className="relative pl-1" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl p-1 hover:bg-surface-container transition-colors"
                >
                  <StaffAvatar name={currentUser?.name || 'Dr. Priya Sharma'} />
                  <div className="hidden 2xl:flex flex-col text-left">
                    <span className="font-title-md text-body-sm text-on-surface leading-tight">
                      {currentUser?.name || 'Staff User'}
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
                      {currentRoleDef?.name || session?.roleId}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-outline">expand_more</span>
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/40 p-3 z-[80]">
                    <div className="px-2 py-2 border-b border-outline-variant/30">
                      <div className="font-title-md text-on-surface">{currentUser?.name}</div>
                      <div className="font-body-sm text-on-surface-variant">{currentUser?.email}</div>
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm">
                        <span>DEMO MODE • {currentRoleDef?.name}</span>
                      </div>
                    </div>

                    <div className="py-2 border-b border-outline-variant/30">
                      <div className="px-2 pb-1 font-label-sm text-outline uppercase">Switch Demo Role</div>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-0.5">
                        {roles.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleRoleSwitch(r.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg font-body-sm flex items-center justify-between ${
                              session?.roleId === r.id
                                ? 'bg-primary-container text-on-primary font-semibold'
                                : 'hover:bg-surface-container text-on-surface'
                            }`}
                          >
                            <span>{r.name}</span>
                            {session?.roleId === r.id && (
                              <span className="material-symbols-outlined text-[16px]">check</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          expireSession();
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-container font-body-sm text-on-surface flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">lock</span>
                        <span>Lock Session (Test Timeout)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          logout();
                          navigate('/login');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-error-container/60 font-body-sm text-error flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">logout</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="w-full pt-16 min-h-screen bg-surface">
          <Outlet />
        </main>
      </div>

      {/* Notification Slide-over Drawer */}
      {notifDrawerOpen && (
        <div className="fixed inset-0 z-[85] flex justify-end no-print">
          <div className="fixed inset-0 bg-on-surface/35 backdrop-blur-xs" onClick={() => setNotifDrawerOpen(false)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest h-full shadow-2xl z-10 flex flex-col">
            <div className="px-5 py-4 border-b border-outline-variant/30 flex items-center justify-between">
              <div>
                <h2 className="font-headline-sm text-on-surface">Operations Alert Stream</h2>
                <p className="font-body-sm text-on-surface-variant">{unreadNotifCount} unread alert(s) • Demo Mode</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="font-label-md text-primary hover:underline"
                >
                  Mark all read
                </button>
                <button
                  type="button"
                  onClick={() => setNotifDrawerOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-surface-container"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    markNotificationRead(n.id);
                    setNotifDrawerOpen(false);
                    navigate(n.targetPath);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                    n.read
                      ? 'bg-surface-container-low border-transparent'
                      : 'bg-primary-fixed/25 border-primary-container/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary font-label-sm">
                      {n.category}
                    </span>
                    <span className="font-label-sm text-outline">{formatIndianDateTime(n.createdAt)}</span>
                  </div>
                  <div className="font-title-md text-body-md text-on-surface mt-1.5">{n.title}</div>
                  <div className="font-body-sm text-on-surface-variant mt-0.5">{n.message}</div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => {
                  setNotifDrawerOpen(false);
                  navigate('/notifications');
                }}
                className="w-full py-2.5 rounded-xl bg-primary-container text-on-primary font-title-md text-body-md hover:bg-primary"
              >
                Open Notification Templates & Center
              </button>
            </div>
          </div>
        </div>
      )}

      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <QuickOrderModal open={quickOrderOpen} onClose={() => setQuickOrderOpen(false)} />
    </div>
  );
}
