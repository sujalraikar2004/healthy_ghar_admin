import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ActivityLog,
  AdminUser,
  AppNotification,
  AuthSession,
  Banner,
  Batch,
  BatchStatus,
  Brand,
  BusinessSettings,
  Campaign,
  Category,
  Consultation,
  ConsultationStatus,
  Coupon,
  Customer,
  CustomerGroup,
  DeliveryPartner,
  Doctor,
  GoodsReceipt,
  GoodsReceiptItem,
  InventoryItem,
  NotificationTemplate,
  Order,
  OrderStatus,
  Payment,
  PermissionAction,
  PermissionModule,
  Prescription,
  Product,
  ProductReview,
  PurchaseOrder,
  PurchaseOrderItem,
  Refund,
  ReturnRequest,
  RoleDefinition,
  RoleId,
  Shipment,
  ShipmentStatus,
  StockMovement,
  StockMovementType,
  StockTransfer,
  Supplier,
  SupportTicket,
  TicketStatus,
  TransferStatus,
  Warehouse,
} from '../types';
import { buildInitialSeedState } from '../data/seedData';
import { deriveInventoryFromBatches } from '../data/seedCatalog';
import { daysUntil, generateId, slugify } from '../utils/formatters';
import { calculateOrderTotals, computePincodeZone, validateAndCalculateCoupon } from '../utils/calculations';
import { hasPermission } from '../utils/permissions';

export interface ActionResult<T = undefined> {
  ok: boolean;
  message: string;
  data?: T;
}

const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  Placed: ['Confirmed', 'Cancelled'],
  Confirmed: ['Processing', 'Cancelled'],
  Processing: ['Packed', 'Cancelled'],
  Packed: ['Shipped', 'Cancelled'],
  Shipped: ['Out for Delivery'],
  'Out for Delivery': ['Delivered'],
  Delivered: [],
  Cancelled: [],
};

const VALID_TRANSFER_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  Requested: ['Approved', 'Cancelled'],
  Approved: ['In Transit', 'Cancelled'],
  'In Transit': ['Received'],
  Received: [],
  Cancelled: [],
};

function computeBatchLifecycleStatus(
  expiryDate: string,
  availableQty: number,
  reservedQty: number,
  currentStatus?: BatchStatus
): BatchStatus {
  if (currentStatus === 'Quarantined' || currentStatus === 'Expired') {
    return currentStatus;
  }
  if (new Date(expiryDate).getTime() <= Date.now()) {
    return 'Expired';
  }
  if (availableQty <= 0 && reservedQty <= 0) {
    return 'Depleted';
  }
  return daysUntil(expiryDate) <= 30 ? 'Expiring Soon' : 'Active';
}

function recomputePartnerLoads(partners: DeliveryPartner[], shipments: Shipment[]): DeliveryPartner[] {
  return partners.map((dp) => ({
    ...dp,
    activeShipments: shipments.filter((sh) => sh.partnerId === dp.id && sh.status !== 'Delivered').length,
  }));
}

export interface PharmacyState {
  session: AuthSession | null;
  activeHubId: string;
  roles: RoleDefinition[];
  staff: AdminUser[];
  warehouses: Warehouse[];
  categories: Category[];
  brands: Brand[];
  products: Product[];
  batches: Batch[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  transfers: StockTransfer[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  customerGroups: CustomerGroup[];
  customers: Customer[];
  orders: Order[];
  prescriptions: Prescription[];
  payments: Payment[];
  refunds: Refund[];
  returns: ReturnRequest[];
  deliveryPartners: DeliveryPartner[];
  shipments: Shipment[];
  doctors: Doctor[];
  consultations: Consultation[];
  coupons: Coupon[];
  campaigns: Campaign[];
  banners: Banner[];
  reviews: ProductReview[];
  tickets: SupportTicket[];
  notifications: AppNotification[];
  notificationTemplates: NotificationTemplate[];
  activityLogs: ActivityLog[];
  settings: BusinessSettings;

  // Auth & Navigation Context
  loginDemoUser: (email: string) => ActionResult<AdminUser>;
  switchDemoRole: (roleId: RoleId) => ActionResult<AdminUser>;
  logout: () => void;
  expireSession: () => void;
  restoreSession: () => void;
  setActiveHub: (hubId: string) => void;

  // Helpers
  getCurrentUser: () => AdminUser | null;
  can: (module: PermissionModule, action?: PermissionAction) => boolean;

  // Catalog CRUD
  saveProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'ratingAvg' | 'reviewCount'>, existingId?: string) => ActionResult<Product>;
  archiveProduct: (productId: string) => ActionResult;
  bulkUpdateProductStatus: (productIds: string[], status: Product['status']) => ActionResult;
  saveCategory: (category: Omit<Category, 'id' | 'createdAt'>, existingId?: string) => ActionResult<Category>;
  deleteOrReassignCategory: (categoryId: string, reassignToCategoryId?: string) => ActionResult;
  saveBrand: (brand: Omit<Brand, 'id' | 'createdAt'>, existingId?: string) => ActionResult<Brand>;
  archiveBrand: (brandId: string) => ActionResult;

  // Inventory & Batches
  adjustStock: (input: {
    productId: string;
    batchId: string;
    warehouseId: string;
    adjustmentType: 'Received' | 'Damaged' | 'Expired' | 'Correction' | 'Returned';
    quantityDelta: number;
    reason: string;
    notes?: string;
  }) => ActionResult;
  quarantineBatch: (batchId: string, reason: string) => ActionResult;
  createTransfer: (input: {
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    productId: string;
    batchId: string;
    quantity: number;
    coldChainMonitor: boolean;
    notes: string;
  }) => ActionResult<StockTransfer>;
  advanceTransfer: (transferId: string, nextStatus: StockTransfer['status']) => ActionResult;

  // Suppliers & Procurement
  saveSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>, existingId?: string) => ActionResult<Supplier>;
  archiveSupplier: (supplierId: string) => ActionResult;
  createPurchaseOrder: (input: {
    supplierId: string;
    warehouseId: string;
    expectedDeliveryDate: string;
    notes?: string;
    items: Omit<PurchaseOrderItem, 'receivedQty'>[];
    submitForApproval: boolean;
  }) => ActionResult<PurchaseOrder>;
  decidePurchaseOrder: (poId: string, decision: 'Approved' | 'Rejected', reason?: string) => ActionResult;
  receiveGoodsNote: (input: {
    purchaseOrderId: string;
    invoiceNumber: string;
    notes?: string;
    items: GoodsReceiptItem[];
  }) => ActionResult<GoodsReceipt>;

  // Orders & Fulfillment
  createOrder: (input: {
    customerId: string;
    warehouseId: string;
    paymentMethod: Order['paymentMethod'];
    couponCode?: string;
    items: { productId: string; quantity: number }[];
    notes?: string;
  }) => ActionResult<Order>;
  transitionOrderStatus: (orderId: string, nextStatus: OrderStatus, reason: string) => ActionResult;

  // Prescriptions
  assignPharmacist: (rxId: string, pharmacistId: string) => ActionResult;
  reviewPrescription: (input: {
    rxId: string;
    decision: 'Approved' | 'Rejected' | 'Clarification Requested';
    notes: string;
  }) => ActionResult;

  // Payments, Refunds & Returns
  createRefundRequest: (input: { paymentId: string; amount: number; reason: string }) => ActionResult<Refund>;
  processRefund: (refundId: string, action: 'Approve & Simulate' | 'Reject') => ActionResult;
  reviewReturnRequest: (input: {
    returnId: string;
    decision: 'Approved' | 'Rejected' | 'Form 46 Destroyed' | 'Restocked';
    reviewNotes: string;
  }) => ActionResult;

  // Delivery
  createShipment: (input: {
    orderId: string;
    partnerId: string;
    coldChainRequired: boolean;
    deliveryFee: number;
    expectedDeliveryDate: string;
  }) => ActionResult<Shipment>;
  updateShipmentStatus: (shipmentId: string, nextStatus: ShipmentStatus, location: string) => ActionResult;
  reassignShipmentPartner: (shipmentId: string, partnerId: string) => ActionResult;

  // Customers & Support & Reviews
  updateCustomer: (customerId: string, patch: Partial<Customer>) => ActionResult;
  moderateReview: (reviewId: string, status: ProductReview['status'], note?: string) => ActionResult;
  createSupportTicket: (input: {
    customerId: string;
    relatedOrderNumber?: string;
    category: SupportTicket['category'];
    priority: SupportTicket['priority'];
    subject: string;
    initialMessage: string;
  }) => ActionResult<SupportTicket>;
  replySupportTicket: (ticketId: string, senderType: 'Staff' | 'Internal Note', body: string) => ActionResult;
  updateSupportTicketStatus: (ticketId: string, status: TicketStatus, assignedStaffId?: string) => ActionResult;

  // Healthcare
  saveDoctor: (doctor: Omit<Doctor, 'id' | 'rating' | 'consultationsCount'>, existingId?: string) => ActionResult<Doctor>;
  createConsultation: (input: {
    customerId: string;
    doctorId: string;
    scheduledAt: string;
    mode: Consultation['mode'];
    chiefComplaint: string;
  }) => ActionResult<Consultation>;
  updateConsultationStatus: (consultationId: string, status: ConsultationStatus, clinicalNotes?: string) => ActionResult;

  // Marketing
  saveCoupon: (coupon: Omit<Coupon, 'id' | 'usedCount'>, existingId?: string) => ActionResult<Coupon>;
  toggleCoupon: (couponId: string) => ActionResult;
  deleteCoupon: (couponId: string) => ActionResult;
  saveCampaign: (campaign: Omit<Campaign, 'id'>, existingId?: string) => ActionResult<Campaign>;
  saveBanner: (banner: Omit<Banner, 'id'>, existingId?: string) => ActionResult<Banner>;
  toggleBanner: (bannerId: string) => ActionResult;
  deleteBanner: (bannerId: string) => ActionResult;

  // Notifications, Staff, RBAC & Settings
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  sendSimulatedNotification: (input: { category: AppNotification['category']; title: string; message: string; channel: AppNotification['channel'] }) => ActionResult;
  saveStaff: (member: Omit<AdminUser, 'id' | 'lastActiveAt' | 'createdAt'>, existingId?: string) => ActionResult<AdminUser>;
  toggleStaffStatus: (userId: string) => ActionResult;
  toggleRolePermission: (roleId: RoleId, module: PermissionModule, action: PermissionAction) => ActionResult;
  updateSettings: (patch: Partial<BusinessSettings>) => ActionResult;
  resetDemoData: () => void;
}

const seed = buildInitialSeedState();

export const usePharmacyStore = create<PharmacyState>()(
  persist(
    (set, get) => {
      const appendLog = (
        action: string,
        module: PermissionModule,
        recordId: string,
        result: ActivityLog['result'],
        metadata: Record<string, unknown> = {}
      ): ActivityLog => {
        const user = get().getCurrentUser();
        return {
          id: generateId('LOG'),
          actorId: user?.id || 'SYSTEM',
          actorName: user?.name || 'System',
          actorRole: user?.roleId || 'SUPER_ADMIN',
          action,
          module,
          recordId,
          result,
          metadata,
          ipAddress: '10.24.18.10',
          timestamp: new Date().toISOString(),
        };
      };

      return {
        session: {
          userId: seed.staff[0].id,
          email: seed.staff[0].email,
          roleId: seed.staff[0].roleId,
          loggedInAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(),
          isDemoMode: true,
          sessionExpired: false,
        },
        activeHubId: 'ALL',
        ...seed,

        getCurrentUser: () => {
          const { session, staff } = get();
          if (!session) return null;
          return staff.find((u) => u.id === session.userId) || null;
        },

        can: (module, action = 'view') => {
          const { session, roles } = get();
          if (!session || session.sessionExpired) return false;
          return hasPermission(roles, session.roleId, module, action);
        },

        loginDemoUser: (email) => {
          const normalized = email.trim().toLowerCase();
          const user = get().staff.find((u) => u.email.toLowerCase() === normalized);
          if (!user) {
            return { ok: false, message: 'No registered staff account matches this email.' };
          }
          if (user.status !== 'Active') {
            return { ok: false, message: `Account is currently ${user.status}. Contact Super Admin.` };
          }
          const session: AuthSession = {
            userId: user.id,
            email: user.email,
            roleId: user.roleId,
            loggedInAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(),
            isDemoMode: true,
            sessionExpired: false,
          };
          set((s) => ({
            session,
            activityLogs: [appendLog('STAFF_LOGIN_DEMO', 'staff', user.id, 'Success', { role: user.roleId }), ...s.activityLogs],
          }));
          return { ok: true, message: `Signed in as ${user.name}`, data: user };
        },

        switchDemoRole: (roleId) => {
          const user = get().staff.find((u) => u.roleId === roleId && u.status === 'Active');
          if (!user) {
            return { ok: false, message: 'No active demo user found for selected role.' };
          }
          const session: AuthSession = {
            userId: user.id,
            email: user.email,
            roleId: user.roleId,
            loggedInAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(),
            isDemoMode: true,
            sessionExpired: false,
          };
          set((s) => ({
            session,
            activityLogs: [appendLog('DEMO_ROLE_SWITCH', 'roles', user.id, 'Success', { roleId }), ...s.activityLogs],
          }));
          return { ok: true, message: `Switched demo session to ${user.name} (${roleId})`, data: user };
        },

        logout: () =>
          set((s) => {
            const log = appendLog('STAFF_LOGOUT', 'staff', s.session?.userId || 'SYSTEM', 'Success');
            return {
              session: null,
              activityLogs: [log, ...s.activityLogs],
            };
          }),

        expireSession: () =>
          set((s) => ({
            session: s.session ? { ...s.session, sessionExpired: true } : null,
          })),

        restoreSession: () =>
          set((s) => ({
            session: s.session
              ? { ...s.session, sessionExpired: false, expiresAt: new Date(Date.now() + 8 * 3600000).toISOString() }
              : null,
          })),

        setActiveHub: (hubId) => set({ activeHubId: hubId }),

        saveProduct: (input, existingId) => {
          const actionNeeded = existingId ? 'edit' : 'create';
          if (!get().can('products', actionNeeded)) {
            return { ok: false, message: 'Permission denied: You cannot modify product catalogue records.' };
          }
          const category = get().categories.find((c) => c.id === input.categoryId && c.status === 'Active');
          if (!category) {
            return { ok: false, message: 'Selected category does not exist or is archived.' };
          }
          if (input.subcategoryId) {
            const subcat = get().categories.find(
              (c) => c.id === input.subcategoryId && c.status === 'Active' && c.parentId === input.categoryId
            );
            if (!subcat) {
              return { ok: false, message: 'Selected subcategory is invalid for this parent category.' };
            }
          }
          const brand = get().brands.find((b) => b.id === input.brandId && b.status === 'Active');
          if (!brand) {
            return { ok: false, message: 'Selected brand does not exist or is archived.' };
          }
          const duplicateSku = get().products.find(
            (p) => p.sku.toLowerCase() === input.sku.trim().toLowerCase() && p.id !== existingId
          );
          if (duplicateSku) {
            return { ok: false, message: `Duplicate SKU detected: ${input.sku} is already assigned to ${duplicateSku.name}.` };
          }
          if (input.mrp <= 0 || input.sellingPrice <= 0 || input.costPrice < 0) {
            return { ok: false, message: 'MRP and selling price must be greater than zero.' };
          }
          if (input.sellingPrice > input.mrp) {
            return { ok: false, message: 'Selling price cannot exceed printed MRP.' };
          }
          if (input.costPrice > input.sellingPrice) {
            return { ok: false, message: 'Cost price cannot exceed selling price.' };
          }
          const now = new Date().toISOString();
          const user = get().getCurrentUser();
          if (existingId) {
            let updatedProduct: Product | undefined;
            set((s) => {
              const products = s.products.map((p) => {
                if (p.id !== existingId) return p;
                updatedProduct = {
                  ...p,
                  ...input,
                  slug: slugify(input.slug || input.name),
                  updatedAt: now,
                };
                return updatedProduct;
              });
              const inventory = deriveInventoryFromBatches(products, s.batches);
              return {
                products,
                inventory,
                activityLogs: [appendLog('PRODUCT_UPDATED', 'products', existingId, 'Success', { sku: input.sku }), ...s.activityLogs],
              };
            });
            return { ok: true, message: `${input.name} updated across catalogue & inventory.`, data: updatedProduct };
          }

          const newProduct: Product = {
            ...input,
            id: generateId('PRD'),
            slug: slugify(input.slug || input.name),
            ratingAvg: 4.5,
            reviewCount: 0,
            createdAt: now,
            updatedAt: now,
          };
          const openingBatch: Batch = {
            id: generateId('BAT'),
            batchNumber: `OPEN-${newProduct.sku.slice(-4)}-${new Date().getFullYear()}`,
            productId: newProduct.id,
            warehouseId: 'WH-BLR-01',
            supplierId: get().suppliers[0]?.id || 'SUP-001',
            manufacturer: newProduct.manufacturer,
            mfgDate: now,
            expiryDate: new Date(Date.now() + 540 * 86400000).toISOString(),
            receivedQty: 100,
            availableQty: 100,
            reservedQty: 0,
            damagedQty: 0,
            costPrice: newProduct.costPrice,
            mrp: newProduct.mrp,
            status: 'Active',
            rackLocation: 'BLR-NEW-A1',
            coldChainTemp: newProduct.storageCondition === 'Cold Chain (2-8°C)' ? 4.2 : undefined,
            createdAt: now,
          };
          const openingMovement: StockMovement = {
            id: generateId('MOV'),
            productId: newProduct.id,
            batchId: openingBatch.id,
            warehouseId: openingBatch.warehouseId,
            type: 'ADJUSTMENT_ADD',
            quantityDelta: 100,
            previousQty: 0,
            newQty: 100,
            referenceId: openingBatch.batchNumber,
            reason: 'Opening stock batch initialized on new SKU creation',
            staffId: user?.id || 'SYSTEM',
            staffName: user?.name || 'System',
            createdAt: now,
          };
          set((s) => {
            const products = [newProduct, ...s.products];
            const batches = [openingBatch, ...s.batches];
            return {
              products,
              batches,
              inventory: deriveInventoryFromBatches(products, batches),
              stockMovements: [openingMovement, ...s.stockMovements],
              activityLogs: [appendLog('PRODUCT_CREATED', 'products', newProduct.id, 'Success', { name: newProduct.name, sku: newProduct.sku }), ...s.activityLogs],
            };
          });
          return { ok: true, message: `${newProduct.name} added to Healthy Ghar catalogue.`, data: newProduct };
        },

        archiveProduct: (productId) => {
          if (!get().can('products', 'delete')) {
            return { ok: false, message: 'Permission denied to archive products.' };
          }
          set((s) => ({
            products: s.products.map((p) => (p.id === productId ? { ...p, status: 'Archived', updatedAt: new Date().toISOString() } : p)),
            activityLogs: [appendLog('PRODUCT_ARCHIVED', 'products', productId, 'Warning'), ...s.activityLogs],
          }));
          return { ok: true, message: 'Product archived safely.' };
        },

        bulkUpdateProductStatus: (productIds, status) => {
          if (!get().can('products', 'edit')) {
            return { ok: false, message: 'Permission denied.' };
          }
          set((s) => ({
            products: s.products.map((p) => (productIds.includes(p.id) ? { ...p, status, updatedAt: new Date().toISOString() } : p)),
            activityLogs: [appendLog('PRODUCTS_BULK_STATUS', 'products', `${productIds.length} SKUs`, 'Success', { status }), ...s.activityLogs],
          }));
          return { ok: true, message: `Updated ${productIds.length} product(s) to ${status}.` };
        },

        saveCategory: (input, existingId) => {
          if (!get().can('categories', existingId ? 'edit' : 'create')) {
            return { ok: false, message: 'Permission denied.' };
          }
          const slug = slugify(input.slug || input.name);
          if (existingId) {
            let updated: Category | undefined;
            set((s) => ({
              categories: s.categories.map((c) => {
                if (c.id !== existingId) return c;
                updated = { ...c, ...input, slug };
                return updated;
              }),
              activityLogs: [appendLog('CATEGORY_UPDATED', 'categories', existingId, 'Success', { name: input.name }), ...s.activityLogs],
            }));
            return { ok: true, message: `Category "${input.name}" updated.`, data: updated };
          }
          const newCat: Category = {
            ...input,
            id: generateId('CAT'),
            slug,
            createdAt: new Date().toISOString(),
          };
          set((s) => ({
            categories: [...s.categories, newCat],
            activityLogs: [appendLog('CATEGORY_CREATED', 'categories', newCat.id, 'Success', { name: newCat.name }), ...s.activityLogs],
          }));
          return { ok: true, message: `Category "${newCat.name}" created.`, data: newCat };
        },

        deleteOrReassignCategory: (categoryId, reassignToCategoryId) => {
          if (!get().can('categories', 'delete')) {
            return { ok: false, message: 'Permission denied.' };
          }
          const activeChildren = get().categories.filter((c) => c.parentId === categoryId && c.status !== 'Archived');
          if (activeChildren.length > 0) {
            return {
              ok: false,
              message: `Cannot archive category while ${activeChildren.length} active subcategory(s) depend on it.`,
            };
          }
          const linkedProducts = get().products.filter(
            (p) => (p.categoryId === categoryId || p.subcategoryId === categoryId) && p.status !== 'Archived'
          );
          if (linkedProducts.length > 0 && !reassignToCategoryId) {
            return {
              ok: false,
              message: `Cannot delete category: ${linkedProducts.length} active product(s) still reference it. Select a target category to reassign first.`,
            };
          }
          if (reassignToCategoryId) {
            if (reassignToCategoryId === categoryId) {
              return { ok: false, message: 'Target reassignment category must be different.' };
            }
            const targetCat = get().categories.find((c) => c.id === reassignToCategoryId && c.status === 'Active');
            if (!targetCat) {
              return { ok: false, message: 'Selected target reassignment category is invalid or archived.' };
            }
          }
          set((s) => ({
            products: reassignToCategoryId
              ? s.products.map((p) =>
                  p.categoryId === categoryId || p.subcategoryId === categoryId
                    ? {
                        ...p,
                        categoryId: p.categoryId === categoryId ? reassignToCategoryId : p.categoryId,
                        subcategoryId: p.subcategoryId === categoryId ? undefined : p.subcategoryId,
                        updatedAt: new Date().toISOString(),
                      }
                    : p
                )
              : s.products,
            categories: s.categories.map((c) => (c.id === categoryId ? { ...c, status: 'Archived' } : c)),
            activityLogs: [appendLog('CATEGORY_ARCHIVED', 'categories', categoryId, 'Warning', { reassignedTo: reassignToCategoryId || null }), ...s.activityLogs],
          }));
          return { ok: true, message: 'Category archived and product links updated cleanly.' };
        },

        saveBrand: (input, existingId) => {
          if (!get().can('brands', existingId ? 'edit' : 'create')) {
            return { ok: false, message: 'Permission denied.' };
          }
          const slug = slugify(input.slug || input.name);
          if (existingId) {
            let updated: Brand | undefined;
            set((s) => ({
              brands: s.brands.map((b) => {
                if (b.id !== existingId) return b;
                updated = { ...b, ...input, slug };
                return updated;
              }),
              activityLogs: [appendLog('BRAND_UPDATED', 'brands', existingId, 'Success', { name: input.name }), ...s.activityLogs],
            }));
            return { ok: true, message: `Brand "${input.name}" updated.`, data: updated };
          }
          const newBrand: Brand = {
            ...input,
            id: generateId('BRD'),
            slug,
            createdAt: new Date().toISOString(),
          };
          set((s) => ({
            brands: [newBrand, ...s.brands],
            activityLogs: [appendLog('BRAND_CREATED', 'brands', newBrand.id, 'Success', { name: newBrand.name }), ...s.activityLogs],
          }));
          return { ok: true, message: `Brand "${newBrand.name}" registered.`, data: newBrand };
        },

        archiveBrand: (brandId) => {
          if (!get().can('brands', 'delete')) {
            return { ok: false, message: 'Permission denied.' };
          }
          const refs = get().products.filter((p) => p.brandId === brandId && p.status === 'Active');
          if (refs.length > 0) {
            return { ok: false, message: `Cannot archive brand while ${refs.length} active SKUs depend on it.` };
          }
          set((s) => ({
            brands: s.brands.map((b) => (b.id === brandId ? { ...b, status: 'Archived' } : b)),
            activityLogs: [appendLog('BRAND_ARCHIVED', 'brands', brandId, 'Warning'), ...s.activityLogs],
          }));
          return { ok: true, message: 'Brand archived.' };
        },

        adjustStock: ({ productId, batchId, warehouseId, adjustmentType, quantityDelta, reason, notes }) => {
          if (!get().can('inventory', 'edit')) {
            return { ok: false, message: 'Permission denied: Inventory Manager or Admin role required.' };
          }
          if (!reason.trim()) {
            return { ok: false, message: 'Statutory reason is required for every stock adjustment.' };
          }
          if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
            return { ok: false, message: 'Adjustment quantity delta must be non-zero.' };
          }
          const batch = get().batches.find((b) => b.id === batchId);
          if (!batch) {
            return { ok: false, message: 'Selected batch does not exist.' };
          }
          if (batch.warehouseId !== warehouseId || batch.productId !== productId) {
            return { ok: false, message: 'Batch does not belong to the selected product and warehouse.' };
          }
          if (quantityDelta > 0 && (batch.status === 'Quarantined' || batch.status === 'Expired')) {
            return { ok: false, message: `Blocked: Cannot add sellable stock to ${batch.status} batch ${batch.batchNumber}.` };
          }
          const nextAvail = batch.availableQty + quantityDelta;
          if (nextAvail < 0) {
            return { ok: false, message: `Invalid adjustment: Batch ${batch.batchNumber} only has ${batch.availableQty} available units (cannot go negative).` };
          }
          const user = get().getCurrentUser();
          const movementType: StockMovementType =
            adjustmentType === 'Received'
              ? 'ADJUSTMENT_ADD'
              : adjustmentType === 'Damaged'
              ? 'ADJUSTMENT_DAMAGED'
              : adjustmentType === 'Expired'
              ? 'ADJUSTMENT_EXPIRED'
              : adjustmentType === 'Returned'
              ? 'RETURN_RESTOCK'
              : 'ADJUSTMENT_CORRECTION';

          const movement: StockMovement = {
            id: generateId('MOV'),
            productId,
            batchId,
            warehouseId,
            type: movementType,
            quantityDelta,
            previousQty: batch.availableQty,
            newQty: nextAvail,
            reason,
            notes,
            staffId: user?.id || 'SYSTEM',
            staffName: user?.name || 'System',
            createdAt: new Date().toISOString(),
          };

          set((s) => {
            const batches = s.batches.map((b) => {
              if (b.id !== batchId) return b;
              const isDamagedOrExpired = adjustmentType === 'Damaged' || adjustmentType === 'Expired';
              const isBatchExpired = new Date(b.expiryDate).getTime() <= Date.now();
              const nextStatus: BatchStatus =
                adjustmentType === 'Expired' && (nextAvail === 0 || isBatchExpired)
                  ? 'Quarantined'
                  : computeBatchLifecycleStatus(
                      b.expiryDate,
                      nextAvail,
                      b.reservedQty,
                      b.status === 'Depleted' && nextAvail > 0 ? 'Active' : b.status
                    );
              return {
                ...b,
                availableQty: nextAvail,
                damagedQty: isDamagedOrExpired ? b.damagedQty + Math.abs(quantityDelta) : b.damagedQty,
                status: nextStatus,
              };
            });
            return {
              batches,
              inventory: deriveInventoryFromBatches(s.products, batches),
              stockMovements: [movement, ...s.stockMovements],
              activityLogs: [appendLog('STOCK_ADJUSTED', 'inventory', batchId, 'Success', { delta: quantityDelta, adjustmentType, reason }), ...s.activityLogs],
            };
          });
          return { ok: true, message: `Stock adjusted (${quantityDelta > 0 ? `+${quantityDelta}` : quantityDelta} units) & movement recorded.` };
        },

        quarantineBatch: (batchId, reason) => {
          if (!get().can('batches', 'edit')) {
            return { ok: false, message: 'Permission denied.' };
          }
          if (!reason.trim()) {
            return { ok: false, message: 'Statutory reason is required to quarantine a batch.' };
          }
          const batch = get().batches.find((b) => b.id === batchId);
          if (!batch) return { ok: false, message: 'Batch not found.' };
          if (batch.status === 'Quarantined') {
            return { ok: false, message: `Duplicate action blocked: Batch ${batch.batchNumber} is already quarantined.` };
          }
          const user = get().getCurrentUser();
          const movement: StockMovement = {
            id: generateId('MOV'),
            productId: batch.productId,
            batchId: batch.id,
            warehouseId: batch.warehouseId,
            type: 'ADJUSTMENT_EXPIRED',
            quantityDelta: -batch.availableQty,
            previousQty: batch.availableQty,
            newQty: 0,
            reason: `Batch Quarantined: ${reason}`,
            staffId: user?.id || 'SYSTEM',
            staffName: user?.name || 'System',
            createdAt: new Date().toISOString(),
          };
          set((s) => {
            const batches = s.batches.map((b) =>
              b.id === batchId
                ? {
                    ...b,
                    status: 'Quarantined' as const,
                    damagedQty: b.damagedQty + b.availableQty,
                    availableQty: 0,
                    quarantineReason: reason,
                    rackLocation: 'QUARANTINE-BAY-01',
                  }
                : b
            );
            return {
              batches,
              inventory: deriveInventoryFromBatches(s.products, batches),
              stockMovements: [movement, ...s.stockMovements],
              activityLogs: [appendLog('BATCH_QUARANTINED', 'batches', batchId, 'Warning', { reason }), ...s.activityLogs],
            };
          });
          return { ok: true, message: `Batch ${batch.batchNumber} quarantined under Rule 65.` };
        },

        createTransfer: (input) => {
          if (!get().can('transfers', 'create')) {
            return { ok: false, message: 'Permission denied to initiate inter-warehouse transfers.' };
          }
          if (input.sourceWarehouseId === input.destinationWarehouseId) {
            return { ok: false, message: 'Source and destination hubs must be different.' };
          }
          const batch = get().batches.find((b) => b.id === input.batchId);
          if (!batch || batch.warehouseId !== input.sourceWarehouseId) {
            return { ok: false, message: 'Selected batch is not located at the source hub.' };
          }
          if (batch.status === 'Quarantined' || batch.status === 'Expired' || new Date(batch.expiryDate) < new Date()) {
            return { ok: false, message: 'Expired or quarantined batches cannot be transferred.' };
          }
          if (input.quantity <= 0 || input.quantity > batch.availableQty) {
            return { ok: false, message: `Requested quantity exceeds available stock (${batch.availableQty}) in source batch.` };
          }
          const user = get().getCurrentUser();
          const newTransfer: StockTransfer = {
            id: generateId('TRF'),
            transferCode: `TRF-${input.sourceWarehouseId.slice(3, 6)}-${input.destinationWarehouseId.slice(3, 6)}-${Math.floor(100 + Math.random() * 899)}`,
            ...input,
            status: 'Requested',
            currentTemp: input.coldChainMonitor ? 4.2 : undefined,
            requestedBy: user?.name || 'Inventory Ops',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set((s) => ({
            transfers: [newTransfer, ...s.transfers],
            activityLogs: [appendLog('TRANSFER_REQUESTED', 'transfers', newTransfer.id, 'Success', { qty: input.quantity }), ...s.activityLogs],
          }));
          return { ok: true, message: `Transfer ${newTransfer.transferCode} created.`, data: newTransfer };
        },

        advanceTransfer: (transferId, nextStatus) => {
          if (!get().can('transfers', 'edit')) {
            return { ok: false, message: 'Permission denied.' };
          }
          const trf = get().transfers.find((t) => t.id === transferId);
          if (!trf) return { ok: false, message: 'Transfer not found.' };

          const allowedNext = VALID_TRANSFER_TRANSITIONS[trf.status];
          if (!allowedNext.includes(nextStatus)) {
            return {
              ok: false,
              message: `Invalid transfer transition: ${trf.status} cannot move to ${nextStatus}.`,
            };
          }

          const user = get().getCurrentUser();
          const now = new Date().toISOString();

          if (nextStatus === 'In Transit') {
            const srcBatch = get().batches.find((b) => b.id === trf.batchId);
            if (!srcBatch) {
              return { ok: false, message: 'Source batch no longer exists.' };
            }
            if (srcBatch.status === 'Quarantined' || srcBatch.status === 'Expired' || new Date(srcBatch.expiryDate) <= new Date()) {
              return { ok: false, message: 'Cannot dispatch expired or quarantined source batch.' };
            }
            if (srcBatch.availableQty < trf.quantity) {
              return { ok: false, message: 'Insufficient source batch quantity to dispatch transfer.' };
            }
            const movOut: StockMovement = {
              id: generateId('MOV'),
              productId: trf.productId,
              batchId: trf.batchId,
              warehouseId: trf.sourceWarehouseId,
              type: 'TRANSFER_OUT',
              quantityDelta: -trf.quantity,
              previousQty: srcBatch.availableQty,
              newQty: srcBatch.availableQty - trf.quantity,
              referenceId: trf.transferCode,
              reason: `Dispatched to ${trf.destinationWarehouseId}`,
              staffId: user?.id || 'SYSTEM',
              staffName: user?.name || 'System',
              createdAt: now,
            };
            set((s) => {
              const batches = s.batches.map((b) => {
                if (b.id !== trf.batchId) return b;
                const nextAvail = b.availableQty - trf.quantity;
                return {
                  ...b,
                  availableQty: nextAvail,
                  status: computeBatchLifecycleStatus(b.expiryDate, nextAvail, b.reservedQty, b.status),
                };
              });
              return {
                batches,
                inventory: deriveInventoryFromBatches(s.products, batches),
                stockMovements: [movOut, ...s.stockMovements],
                transfers: s.transfers.map((t) => (t.id === transferId ? { ...t, status: 'In Transit', updatedAt: now } : t)),
                activityLogs: [appendLog('TRANSFER_DISPATCHED', 'transfers', transferId, 'Success'), ...s.activityLogs],
              };
            });
            return { ok: true, message: `Transfer ${trf.transferCode} dispatched; source hub stock deducted.` };
          }

          if (nextStatus === 'Received') {
            const srcBatch = get().batches.find((b) => b.id === trf.batchId);
            if (!srcBatch) return { ok: false, message: 'Source batch missing.' };
            const destBatchId = generateId('BAT');
            const newDestBatch: Batch = {
              ...srcBatch,
              id: destBatchId,
              warehouseId: trf.destinationWarehouseId,
              receivedQty: trf.quantity,
              availableQty: trf.quantity,
              reservedQty: 0,
              damagedQty: 0,
              status: computeBatchLifecycleStatus(srcBatch.expiryDate, trf.quantity, 0),
              rackLocation: `${trf.destinationWarehouseId.slice(3, 6)}-TRF-01`,
              createdAt: now,
            };
            const movIn: StockMovement = {
              id: generateId('MOV'),
              productId: trf.productId,
              batchId: destBatchId,
              warehouseId: trf.destinationWarehouseId,
              type: 'TRANSFER_IN',
              quantityDelta: trf.quantity,
              previousQty: 0,
              newQty: trf.quantity,
              referenceId: trf.transferCode,
              reason: `Received from ${trf.sourceWarehouseId}`,
              staffId: user?.id || 'SYSTEM',
              staffName: user?.name || 'System',
              createdAt: now,
            };
            set((s) => {
              const batches = [newDestBatch, ...s.batches];
              return {
                batches,
                inventory: deriveInventoryFromBatches(s.products, batches),
                stockMovements: [movIn, ...s.stockMovements],
                transfers: s.transfers.map((t) => (t.id === transferId ? { ...t, status: 'Received', updatedAt: now } : t)),
                activityLogs: [appendLog('TRANSFER_RECEIVED', 'transfers', transferId, 'Success'), ...s.activityLogs],
              };
            });
            return { ok: true, message: `Transfer ${trf.transferCode} received at destination hub.` };
          }

          set((s) => ({
            transfers: s.transfers.map((t) =>
              t.id === transferId
                ? { ...t, status: nextStatus, approvedBy: nextStatus === 'Approved' ? user?.name : t.approvedBy, updatedAt: now }
                : t
            ),
            activityLogs: [appendLog('TRANSFER_STATUS_CHANGED', 'transfers', transferId, 'Success', { nextStatus }), ...s.activityLogs],
          }));
          return { ok: true, message: `Transfer status updated to ${nextStatus}.` };
        },

        saveSupplier: (input, existingId) => {
          if (!get().can('suppliers', existingId ? 'edit' : 'create')) {
            return { ok: false, message: 'Permission denied.' };
          }
          if (existingId) {
            let updated: Supplier | undefined;
            set((s) => ({
              suppliers: s.suppliers.map((sup) => {
                if (sup.id !== existingId) return sup;
                updated = { ...sup, ...input };
                return updated;
              }),
              activityLogs: [appendLog('SUPPLIER_UPDATED', 'suppliers', existingId, 'Success', { name: input.name }), ...s.activityLogs],
            }));
            return { ok: true, message: `Supplier "${input.name}" updated.`, data: updated };
          }
          const newSup: Supplier = {
            ...input,
            id: generateId('SUP'),
            createdAt: new Date().toISOString(),
          };
          set((s) => ({
            suppliers: [newSup, ...s.suppliers],
            activityLogs: [appendLog('SUPPLIER_CREATED', 'suppliers', newSup.id, 'Success', { name: newSup.name }), ...s.activityLogs],
          }));
          return { ok: true, message: `Supplier "${newSup.name}" onboarded.`, data: newSup };
        },

        archiveSupplier: (supplierId) => {
          if (!get().can('suppliers', 'edit')) return { ok: false, message: 'Permission denied.' };
          const openPOs = get().purchaseOrders.filter(
            (po) =>
              po.supplierId === supplierId &&
              (po.status === 'Pending Approval' || po.status === 'Approved' || po.status === 'Partially Received')
          );
          if (openPOs.length > 0) {
            return {
              ok: false,
              message: `Cannot archive supplier while ${openPOs.length} open Purchase Order(s) remain active.`,
            };
          }
          set((s) => ({
            suppliers: s.suppliers.map((sup) => (sup.id === supplierId ? { ...sup, status: 'Archived' } : sup)),
            activityLogs: [appendLog('SUPPLIER_ARCHIVED', 'suppliers', supplierId, 'Warning'), ...s.activityLogs],
          }));
          return { ok: true, message: 'Supplier archived.' };
        },

        createPurchaseOrder: (input) => {
          if (!get().can('purchase_orders', 'create')) {
            return { ok: false, message: 'Permission denied.' };
          }
          if (input.items.length === 0) {
            return { ok: false, message: 'Add at least one SKU to the Purchase Order.' };
          }
          const supplier = get().suppliers.find((s) => s.id === input.supplierId && s.status === 'Active');
          if (!supplier) {
            return { ok: false, message: 'Selected supplier does not exist or is archived.' };
          }
          const warehouse = get().warehouses.find((w) => w.id === input.warehouseId && w.status === 'Active');
          if (!warehouse) {
            return { ok: false, message: 'Selected receiving warehouse is inactive or invalid.' };
          }
          if (input.items.some((it) => !Number.isFinite(it.orderedQty) || it.orderedQty <= 0 || it.unitCost < 0)) {
            return { ok: false, message: 'PO line quantities must be positive and unit cost non-negative.' };
          }
          const items: PurchaseOrderItem[] = input.items.map((it) => ({ ...it, receivedQty: 0 }));
          const subtotal = items.reduce((s, it) => s + it.orderedQty * it.unitCost, 0);
          const taxAmount = Math.round(items.reduce((s, it) => s + (it.orderedQty * it.unitCost * it.gstRate) / 100, 0));
          const user = get().getCurrentUser();
          const now = new Date().toISOString();
          const po: PurchaseOrder = {
            id: generateId('PO'),
            poNumber: `PO-MC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`,
            supplierId: input.supplierId,
            warehouseId: input.warehouseId,
            items,
            subtotal,
            taxAmount,
            totalAmount: subtotal + taxAmount,
            status: input.submitForApproval ? 'Pending Approval' : 'Draft',
            expectedDeliveryDate: input.expectedDeliveryDate,
            notes: input.notes,
            createdBy: user?.id || 'SYSTEM',
            createdAt: now,
            updatedAt: now,
          };
          set((s) => ({
            purchaseOrders: [po, ...s.purchaseOrders],
            activityLogs: [appendLog('PO_CREATED', 'purchase_orders', po.id, 'Success', { poNumber: po.poNumber, totalAmount: po.totalAmount }), ...s.activityLogs],
          }));
          return { ok: true, message: `Purchase Order ${po.poNumber} created (inventory remains unchanged until GRN dock receipt).`, data: po };
        },

        decidePurchaseOrder: (poId, decision, reason) => {
          if (!get().can('purchase_orders', 'approve')) {
            return { ok: false, message: 'Permission denied: Approval authority required.' };
          }
          const po = get().purchaseOrders.find((p) => p.id === poId);
          if (!po) return { ok: false, message: 'Purchase Order not found.' };
          if (po.status !== 'Draft' && po.status !== 'Pending Approval') {
            return { ok: false, message: `Duplicate decision blocked: PO ${po.poNumber} is already ${po.status}.` };
          }
          const user = get().getCurrentUser();
          set((s) => ({
            purchaseOrders: s.purchaseOrders.map((p) =>
              p.id === poId
                ? {
                    ...p,
                    status: decision,
                    approvedBy: decision === 'Approved' ? user?.id : p.approvedBy,
                    rejectionReason: decision === 'Rejected' ? reason : undefined,
                    updatedAt: new Date().toISOString(),
                  }
                : p
            ),
            activityLogs: [appendLog(`PO_${decision.toUpperCase()}`, 'purchase_orders', poId, 'Success', { reason }), ...s.activityLogs],
          }));
          return { ok: true, message: `Purchase order ${decision.toLowerCase()}.` };
        },

        receiveGoodsNote: ({ purchaseOrderId, invoiceNumber, notes, items }) => {
          if (!get().can('purchase_orders', 'edit')) {
            return { ok: false, message: 'Permission denied to record Goods Received Notes.' };
          }
          if (!invoiceNumber.trim()) {
            return { ok: false, message: 'Supplier tax invoice number is mandatory for GRN.' };
          }
          if (items.length === 0) {
            return { ok: false, message: 'Include at least one line item in Goods Receipt.' };
          }
          const po = get().purchaseOrders.find((p) => p.id === purchaseOrderId);
          if (!po) return { ok: false, message: 'Purchase Order not found.' };
          if (po.status !== 'Approved' && po.status !== 'Partially Received') {
            return { ok: false, message: 'Only Approved or Partially Received POs can receive goods at dock.' };
          }
          const qtyByProduct = new Map<string, number>();
          for (const rec of items) {
            const poItem = po.items.find((i) => i.productId === rec.productId);
            if (!poItem) return { ok: false, message: `SKU ${rec.sku} is not part of this PO.` };
            if (rec.receivedQty <= 0) return { ok: false, message: `Received quantity for ${rec.sku} must be > 0.` };
            if (rec.damagedQty < 0 || rec.damagedQty > rec.receivedQty) {
              return { ok: false, message: `Damaged quantity for ${rec.sku} must be between 0 and received quantity (${rec.receivedQty}).` };
            }
            const nextSum = (qtyByProduct.get(rec.productId) || 0) + rec.receivedQty;
            qtyByProduct.set(rec.productId, nextSum);
            const remaining = poItem.orderedQty - poItem.receivedQty;
            if (nextSum > remaining) {
              return { ok: false, message: `Duplicate / over-receipt blocked: ${rec.sku} only has ${remaining} remaining unit(s) on PO.` };
            }
            if (new Date(rec.expiryDate) <= new Date()) {
              return { ok: false, message: `Rejected at dock: Batch ${rec.batchNumber} is already expired.` };
            }
          }

          const now = new Date().toISOString();
          const user = get().getCurrentUser();
          const grnId = generateId('GRN');
          const grnNumber = `GRN-${po.warehouseId.slice(3, 6)}-${Math.floor(1000 + Math.random() * 8999)}`;
          const newBatches: Batch[] = [];
          const newMovements: StockMovement[] = [];

          for (const rec of items) {
            const prod = get().products.find((p) => p.id === rec.productId);
            const batchId = generateId('BAT');
            const netGood = Math.max(0, rec.receivedQty - rec.damagedQty);
            newBatches.push({
              id: batchId,
              batchNumber: rec.batchNumber,
              productId: rec.productId,
              warehouseId: po.warehouseId,
              supplierId: po.supplierId,
              manufacturer: prod?.manufacturer || 'Verified Manufacturer',
              mfgDate: rec.mfgDate,
              expiryDate: rec.expiryDate,
              receivedQty: rec.receivedQty,
              availableQty: netGood,
              reservedQty: 0,
              damagedQty: rec.damagedQty,
              costPrice: rec.unitCost,
              mrp: prod?.mrp || rec.unitCost * 1.3,
              status: computeBatchLifecycleStatus(rec.expiryDate, netGood, 0),
              rackLocation: rec.rackLocation || `${po.warehouseId.slice(3, 6)}-DOCK`,
              coldChainTemp: prod?.storageCondition === 'Cold Chain (2-8°C)' ? 4.2 : undefined,
              createdAt: now,
            });
            newMovements.push({
              id: generateId('MOV'),
              productId: rec.productId,
              batchId,
              warehouseId: po.warehouseId,
              type: 'GRN_RECEIPT',
              quantityDelta: netGood,
              previousQty: 0,
              newQty: netGood,
              referenceId: grnNumber,
              reason: `GRN Receipt against ${po.poNumber}`,
              notes,
              staffId: user?.id || 'SYSTEM',
              staffName: user?.name || 'System',
              createdAt: now,
            });
          }

          const totalReceivedValue = items.reduce((s, it) => s + it.receivedQty * it.unitCost, 0);
          const totalReceivedWithGst = Math.round(
            items.reduce((s, it) => {
              const poLine = po.items.find((pi) => pi.productId === it.productId);
              const gst = poLine?.gstRate || 0;
              return s + it.receivedQty * it.unitCost * (1 + gst / 100);
            }, 0)
          );
          const grn: GoodsReceipt = {
            id: grnId,
            grnNumber,
            purchaseOrderId: po.id,
            supplierId: po.supplierId,
            warehouseId: po.warehouseId,
            invoiceNumber,
            items,
            totalReceivedValue,
            inspectedBy: user?.name || 'Warehouse QC',
            qcPassed: true,
            notes,
            receivedAt: now,
          };

          set((s) => {
            const batches = [...newBatches, ...s.batches];
            const purchaseOrders = s.purchaseOrders.map((p) => {
              if (p.id !== po.id) return p;
              const updatedItems = p.items.map((it) => {
                const addQty = qtyByProduct.get(it.productId) || 0;
                return addQty > 0 ? { ...it, receivedQty: it.receivedQty + addQty } : it;
              });
              const allDone = updatedItems.every((it) => it.receivedQty >= it.orderedQty);
              return {
                ...p,
                items: updatedItems,
                status: allDone ? ('Received' as const) : ('Partially Received' as const),
                updatedAt: now,
              };
            });
            const suppliers = s.suppliers.map((sup) => {
              if (sup.id !== po.supplierId) return sup;
              const receivedProdIds = items.map((r) => r.productId);
              return {
                ...sup,
                outstandingBalance: sup.outstandingBalance + totalReceivedWithGst,
                suppliedProductIds: Array.from(new Set([...sup.suppliedProductIds, ...receivedProdIds])),
              };
            });
            return {
              batches,
              inventory: deriveInventoryFromBatches(s.products, batches),
              stockMovements: [...newMovements, ...s.stockMovements],
              purchaseOrders,
              goodsReceipts: [grn, ...s.goodsReceipts],
              suppliers,
              activityLogs: [appendLog('GRN_RECEIVED', 'purchase_orders', grnNumber, 'Success', { poNumber: po.poNumber, valueINR: totalReceivedValue }), ...s.activityLogs],
            };
          });
          return { ok: true, message: `${grnNumber} recorded: Batches created, inventory & supplier ledger updated.`, data: grn };
        },

        createOrder: ({ customerId, warehouseId, paymentMethod, couponCode, items, notes }) => {
          if (!get().can('orders', 'create')) {
            return { ok: false, message: 'Permission denied to create orders.' };
          }
          const customer = get().customers.find((c) => c.id === customerId);
          if (!customer) return { ok: false, message: 'Customer not found.' };
          if (customer.status === 'Blocked') {
            return { ok: false, message: `Order blocked: Customer ${customer.name} is currently Blocked.` };
          }
          const shippingAddress = customer.addresses.find((a) => a.isDefault) || customer.addresses[0];
          if (!shippingAddress) {
            return { ok: false, message: `Customer ${customer.name} has no saved shipping address.` };
          }
          const warehouse = get().warehouses.find((w) => w.id === warehouseId && w.status === 'Active');
          if (!warehouse) {
            return { ok: false, message: 'Selected fulfillment hub is not active.' };
          }
          if (items.length === 0) return { ok: false, message: 'Add at least one medicine to the order.' };

          // Merge duplicate SKU rows and validate positive integer quantities
          const mergedMap = new Map<string, number>();
          for (const reqItem of items) {
            if (!Number.isInteger(reqItem.quantity) || reqItem.quantity <= 0) {
              return { ok: false, message: 'Order line quantities must be positive integers.' };
            }
            mergedMap.set(reqItem.productId, (mergedMap.get(reqItem.productId) || 0) + reqItem.quantity);
          }
          const normalizedItems = Array.from(mergedMap.entries()).map(([productId, quantity]) => ({ productId, quantity }));

          // Prevent duplicate submission within 60 seconds with identical customer + hub + normalized lines
          const signature = normalizedItems
            .slice()
            .sort((a, b) => a.productId.localeCompare(b.productId))
            .map((i) => `${i.productId}:${i.quantity}`)
            .join('|');
          const nowMs = Date.now();
          const duplicateRecent = get().orders.find((o) => {
            if (o.customerId !== customerId || o.warehouseId !== warehouseId || o.status === 'Cancelled') return false;
            if (nowMs - new Date(o.createdAt).getTime() > 60000) return false;
            const existingSig = o.items
              .slice()
              .sort((a, b) => a.productId.localeCompare(b.productId))
              .map((i) => `${i.productId}:${i.quantity}`)
              .join('|');
            return existingSig === signature;
          });
          if (duplicateRecent) {
            return {
              ok: false,
              message: `Duplicate order submission blocked: Identical order ${duplicateRecent.orderNumber} was placed moments ago.`,
            };
          }

          // Validate products & coupon eligibility before mutating stock
          for (const reqItem of normalizedItems) {
            const product = get().products.find((p) => p.id === reqItem.productId);
            if (!product) return { ok: false, message: 'Selected product not found.' };
            if (product.status !== 'Active') {
              return { ok: false, message: `${product.name} is ${product.status} and cannot be ordered.` };
            }
          }

          const couponEval = validateAndCalculateCoupon({
            couponCode,
            customerId,
            items: normalizedItems,
            products: get().products,
            orders: get().orders,
            coupons: get().coupons,
            nowMs,
          });
          if (!couponEval.valid) {
            return { ok: false, message: couponEval.error || 'Coupon is not eligible for this order.' };
          }

          const now = new Date(nowMs).toISOString();
          const user = get().getCurrentUser();
          const allBatches = get().batches.map((b) => ({ ...b }));
          const orderItems: Order['items'] = [];
          const movements: StockMovement[] = [];

          // Validate & FEFO allocate non-expired batches across multiple batches cleanly
          for (const reqItem of normalizedItems) {
            const product = get().products.find((p) => p.id === reqItem.productId)!;
            const validBatches = allBatches
              .filter(
                (b) =>
                  b.productId === reqItem.productId &&
                  b.warehouseId === warehouseId &&
                  b.status !== 'Quarantined' &&
                  b.status !== 'Expired' &&
                  new Date(b.expiryDate).getTime() > nowMs &&
                  b.availableQty > 0
              )
              .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

            const totalAvail = validBatches.reduce((s, b) => s + b.availableQty, 0);
            if (totalAvail < reqItem.quantity) {
              return {
                ok: false,
                message: `Insufficient non-expired FEFO stock for ${product.name} at selected hub (available: ${totalAvail}).`,
              };
            }

            let remainingToReserve = reqItem.quantity;
            const primaryBatch = validBatches[0];
            const batchAllocations: { batchId: string; batchNumber: string; quantity: number }[] = [];

            for (const b of validBatches) {
              if (remainingToReserve <= 0) break;
              const take = Math.min(b.availableQty, remainingToReserve);
              const prevAvail = b.availableQty;
              b.availableQty -= take;
              b.reservedQty += take;
              remainingToReserve -= take;
              batchAllocations.push({ batchId: b.id, batchNumber: b.batchNumber, quantity: take });
              movements.push({
                id: generateId('MOV'),
                productId: product.id,
                batchId: b.id,
                warehouseId,
                type: 'ORDER_RESERVE',
                quantityDelta: -take,
                previousQty: prevAvail,
                newQty: b.availableQty,
                reason: 'FEFO Stock Reserved on Order Placement',
                staffId: user?.id || 'SYSTEM',
                staffName: user?.name || 'System',
                createdAt: now,
              });
            }

            orderItems.push({
              id: generateId('OI'),
              productId: product.id,
              productName: product.name,
              sku: product.sku,
              hsnCode: product.hsnCode,
              batchId: primaryBatch.id,
              batchNumber:
                batchAllocations.length > 1
                  ? batchAllocations.map((a) => `${a.batchNumber}(${a.quantity})`).join(', ')
                  : primaryBatch.batchNumber,
              batchAllocations,
              quantity: reqItem.quantity,
              mrp: product.mrp,
              unitPrice: product.sellingPrice,
              gstRate: product.gstRate,
              lineTotal: product.sellingPrice * reqItem.quantity,
              prescriptionRequired: product.prescriptionRequired,
            });
          }

          const totals = calculateOrderTotals({
            items: normalizedItems,
            products: get().products,
            settings: get().settings,
            discountAmount: couponEval.discountAmount,
          });
          if (totals.coldChainRequired && !warehouse.coldChainEnabled) {
            return { ok: false, message: `${warehouse.name} is not certified for 2–8°C cold-chain fulfillment.` };
          }

          const rxRequired = orderItems.some((i) => i.prescriptionRequired);
          const rxProducts = normalizedItems
            .map((it) => get().products.find((p) => p.id === it.productId))
            .filter((p): p is Product => Boolean(p && p.prescriptionRequired));
          const containsScheduleH1 = rxProducts.some((p) => p.schedule === 'Schedule H1' || p.schedule === 'Schedule X');

          const orderId = generateId('ORD');
          const orderNumber = `MED-${new Date().getFullYear()}-${Math.floor(2000 + Math.random() * 7999)}`;

          let rxId: string | undefined;
          let newRx: Prescription | undefined;
          if (rxRequired) {
            rxId = generateId('RX');
            newRx = {
              id: rxId,
              rxNumber: `RX-MC-${Math.floor(300000 + Math.random() * 699999)}`,
              customerId: customer.id,
              orderId,
              doctorName: 'Pending Patient Upload Verification',
              doctorRegNo: 'PENDING-CHECK',
              clinicName: 'Patient Uploaded Sample Document',
              prescriptionDate: now,
              documentReference: `DEMO-SAMPLE-${orderNumber}.svg`,
              isDemoSample: true,
              status: 'Pending Review',
              urgency: containsScheduleH1 ? 'Critical' : 'Standard',
              containsScheduleH1,
              extractedDrugs: rxProducts.map((p) => ({
                name: p.name,
                dosage: p.strength || 'As prescribed',
                frequency: 'Verify against Rx scan',
                duration: '15 Days',
                matchedProductId: p.id,
                schedule: p.schedule,
              })),
              reviewHistory: [],
              uploadedAt: now,
            };
          }

          const defaultPartner = totals.coldChainRequired
            ? get().deliveryPartners.find((p) => p.coldChainCapable && p.status === 'Active') || get().deliveryPartners[0]
            : get().deliveryPartners.find((p) => p.status === 'Active') || get().deliveryPartners[0];

          const newOrder: Order = {
            id: orderId,
            orderNumber,
            customerId: customer.id,
            warehouseId,
            shippingAddress,
            items: orderItems,
            subtotal: totals.subtotal,
            discountAmount: couponEval.discountAmount,
            couponCode: couponEval.discountAmount > 0 && couponEval.coupon ? couponEval.coupon.code : undefined,
            taxAmount: totals.taxAmount,
            shippingFee: totals.shippingFee,
            totalAmount: totals.totalAmount,
            paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid',
            status: 'Placed',
            prescriptionRequired: rxRequired,
            prescriptionId: rxId,
            prescriptionStatus: rxRequired ? 'Pending Review' : 'Not Required',
            inventoryState: 'Reserved',
            deliveryPartnerId: defaultPartner?.id,
            notes,
            timeline: [
              {
                previousStatus: null,
                newStatus: 'Placed',
                staffId: user?.id || 'SYSTEM',
                staffName: user?.name || 'Admin Desk',
                reason: 'Order created with FEFO stock reservation',
                timestamp: now,
              },
            ],
            createdAt: now,
            updatedAt: now,
          };

          const newPayment: Payment = {
            id: generateId('PAY'),
            transactionId: `TXN-DEMO-${Math.floor(100000 + Math.random() * 899999)}`,
            orderId: newOrder.id,
            orderNumber: newOrder.orderNumber,
            customerId: customer.id,
            customerName: customer.name,
            method: paymentMethod,
            gateway: paymentMethod === 'COD' ? 'COD Settlement' : 'Razorpay',
            gatewayReference: `pg_sim_${Date.now().toString(36)}`,
            amount: totals.totalAmount,
            refundedAmount: 0,
            status: paymentMethod === 'COD' ? 'Pending' : 'Captured',
            isSimulated: true,
            payloadJson: { mode: 'DEMO_SIMULATED', orderNumber, totalAmount: totals.totalAmount, method: paymentMethod },
            createdAt: now,
          };

          set((s) => ({
            batches: allBatches,
            inventory: deriveInventoryFromBatches(s.products, allBatches),
            stockMovements: [...movements, ...s.stockMovements],
            orders: [newOrder, ...s.orders],
            prescriptions: newRx ? [newRx, ...s.prescriptions] : s.prescriptions,
            payments: [newPayment, ...s.payments],
            coupons:
              couponEval.discountAmount > 0 && couponEval.coupon
                ? s.coupons.map((c) => (c.id === couponEval.coupon!.id ? { ...c, usedCount: c.usedCount + 1 } : c))
                : s.coupons,
            customers: s.customers.map((c) =>
              c.id === customerId ? { ...c, orderCount: c.orderCount + 1, totalSpent: c.totalSpent + totals.totalAmount, lastOrderAt: now } : c
            ),
            activityLogs: [appendLog('ORDER_CREATED', 'orders', newOrder.orderNumber, 'Success', { totalAmount: totals.totalAmount, rxRequired }), ...s.activityLogs],
          }));

          return { ok: true, message: `Order ${orderNumber} placed with FEFO stock reserved.`, data: newOrder };
        },

        transitionOrderStatus: (orderId, nextStatus, reason) => {
          if (!get().can('orders', 'edit')) {
            return { ok: false, message: 'Permission denied to change order fulfillment status.' };
          }
          const order = get().orders.find((o) => o.id === orderId);
          if (!order) return { ok: false, message: 'Order not found.' };

          const allowed = VALID_ORDER_TRANSITIONS[order.status];
          if (!allowed.includes(nextStatus)) {
            return { ok: false, message: `Invalid state transition: ${order.status} cannot move directly to ${nextStatus}.` };
          }

          if (
            get().settings.blockOrderDispatchWithoutRxApproval &&
            order.prescriptionRequired &&
            order.prescriptionStatus !== 'Approved' &&
            (nextStatus === 'Packed' || nextStatus === 'Shipped' || nextStatus === 'Out for Delivery' || nextStatus === 'Delivered')
          ) {
            return {
              ok: false,
              message: `Clinical Gate: Order ${order.orderNumber} requires Pharmacist Rx Approval before ${nextStatus}.`,
            };
          }

          const now = new Date().toISOString();
          const user = get().getCurrentUser();
          const updatedBatches = get().batches.map((b) => ({ ...b }));
          const movements: StockMovement[] = [];
          let nextInvState = order.inventoryState;

          // Release reserved inventory on cancel across all allocated batches
          if (nextStatus === 'Cancelled' && order.inventoryState === 'Reserved') {
            for (const item of order.items) {
              const allocs = item.batchAllocations?.length
                ? item.batchAllocations
                : item.batchId
                ? [{ batchId: item.batchId, quantity: item.quantity }]
                : [];
              for (const alloc of allocs) {
                const batch = updatedBatches.find((b) => b.id === alloc.batchId);
                if (batch) {
                  const prevAvail = batch.availableQty;
                  const releaseQty = Math.min(batch.reservedQty, alloc.quantity);
                  batch.reservedQty -= releaseQty;
                  batch.availableQty += releaseQty;
                  batch.status = computeBatchLifecycleStatus(
                    batch.expiryDate,
                    batch.availableQty,
                    batch.reservedQty,
                    batch.status === 'Depleted' && batch.availableQty > 0 ? 'Active' : batch.status
                  );
                  movements.push({
                    id: generateId('MOV'),
                    productId: item.productId,
                    batchId: batch.id,
                    warehouseId: order.warehouseId,
                    type: 'ORDER_RELEASE',
                    quantityDelta: releaseQty,
                    previousQty: prevAvail,
                    newQty: batch.availableQty,
                    referenceId: order.orderNumber,
                    reason: `Released reserved stock on order cancellation: ${reason}`,
                    staffId: user?.id || 'SYSTEM',
                    staffName: user?.name || 'System',
                    createdAt: now,
                  });
                }
              }
            }
            nextInvState = 'Released';
          }

          // Deduct reserved inventory on Shipped across all allocated batches (never double-deduct!)
          if (nextStatus === 'Shipped' && order.inventoryState === 'Reserved') {
            for (const item of order.items) {
              const allocs = item.batchAllocations?.length
                ? item.batchAllocations
                : item.batchId
                ? [{ batchId: item.batchId, quantity: item.quantity }]
                : [];
              for (const alloc of allocs) {
                const batch = updatedBatches.find((b) => b.id === alloc.batchId);
                if (batch) {
                  const deductQty = Math.min(batch.reservedQty, alloc.quantity);
                  batch.reservedQty -= deductQty;
                  batch.status = computeBatchLifecycleStatus(batch.expiryDate, batch.availableQty, batch.reservedQty, batch.status);
                  movements.push({
                    id: generateId('MOV'),
                    productId: item.productId,
                    batchId: batch.id,
                    warehouseId: order.warehouseId,
                    type: 'ORDER_DEDUCT',
                    quantityDelta: -deductQty,
                    previousQty: batch.availableQty + deductQty,
                    newQty: batch.availableQty,
                    referenceId: order.orderNumber,
                    reason: 'Order Shipped — Final Inventory Deduction',
                    staffId: user?.id || 'SYSTEM',
                    staffName: user?.name || 'System',
                    createdAt: now,
                  });
                }
              }
            }
            nextInvState = 'Deducted';
          }

          const coldChainRequired = order.items.some((it) => {
            const p = get().products.find((pr) => pr.id === it.productId);
            return p?.storageCondition === 'Cold Chain (2-8°C)';
          });

          const existingPartner = get().deliveryPartners.find(
            (dp) => dp.id === order.deliveryPartnerId && dp.status === 'Active' && (!coldChainRequired || dp.coldChainCapable)
          );
          const chosenPartner =
            existingPartner ||
            get().deliveryPartners.find((dp) => dp.status === 'Active' && (!coldChainRequired || dp.coldChainCapable)) ||
            get().deliveryPartners[0];

          const trackingNumber =
            nextStatus === 'Shipped' && !order.trackingNumber
              ? `AWB-${chosenPartner?.code.slice(0, 3) || 'MC'}-${Math.floor(100000 + Math.random() * 899999)}`
              : order.trackingNumber;

          set((s) => {
            let payments = s.payments;
            let refunds = s.refunds;
            let customers = s.customers;
            let coupons = s.coupons;
            let nextOrderPaymentStatus =
              nextStatus === 'Delivered' && order.paymentMethod === 'COD' ? ('Paid' as const) : order.paymentStatus;

            // Sync COD settlement on Delivered
            if (nextStatus === 'Delivered' && order.paymentMethod === 'COD') {
              payments = s.payments.map((p) =>
                p.orderId === orderId && p.status === 'Pending' ? { ...p, status: 'Captured' as const } : p
              );
            }

            // Sync Customer metrics, Coupons, Payments & Refund queue on Cancelled
            if (nextStatus === 'Cancelled') {
              customers = s.customers.map((c) =>
                c.id === order.customerId
                  ? {
                      ...c,
                      orderCount: Math.max(0, c.orderCount - 1),
                      totalSpent: Math.max(0, c.totalSpent - order.totalAmount),
                    }
                  : c
              );
              if (order.couponCode) {
                coupons = s.coupons.map((cp) =>
                  cp.code.toUpperCase() === order.couponCode?.toUpperCase()
                    ? { ...cp, usedCount: Math.max(0, cp.usedCount - 1) }
                    : cp
                );
              }
              const linkedPayment = s.payments.find((p) => p.orderId === orderId);
              if (linkedPayment) {
                if (linkedPayment.status === 'Pending') {
                  payments = s.payments.map((p) =>
                    p.id === linkedPayment.id ? { ...p, status: 'Failed' as const } : p
                  );
                  nextOrderPaymentStatus = 'Failed';
                } else if (linkedPayment.status === 'Captured') {
                  const alreadyQueued = s.refunds
                    .filter((r) => r.paymentId === linkedPayment.id && r.status !== 'Rejected')
                    .reduce((sum, r) => sum + r.amount, 0);
                  const eligibleRefund = linkedPayment.amount - alreadyQueued;
                  if (eligibleRefund > 0) {
                    const cust = s.customers.find((c) => c.id === order.customerId);
                    const autoRefund: Refund = {
                      id: generateId('REF'),
                      refundCode: `RFND-MC-${Math.floor(500 + Math.random() * 499)}`,
                      paymentId: linkedPayment.id,
                      orderId: order.id,
                      orderNumber: order.orderNumber,
                      customerId: order.customerId,
                      customerName: cust?.name || linkedPayment.customerName,
                      amount: eligibleRefund,
                      reason: `Auto-queued on order cancellation: ${reason || 'Cancelled'}`,
                      status: 'Pending Approval',
                      isSimulated: true,
                      requestedBy: user?.name || 'System',
                      createdAt: now,
                    };
                    refunds = [autoRefund, ...s.refunds];
                  }
                }
              }
            }

            const orders = s.orders.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    status: nextStatus,
                    inventoryState: nextInvState,
                    trackingNumber,
                    deliveryPartnerId: nextStatus === 'Shipped' ? chosenPartner?.id : o.deliveryPartnerId,
                    paymentStatus: nextOrderPaymentStatus,
                    updatedAt: now,
                    timeline: [
                      ...o.timeline,
                      {
                        previousStatus: o.status,
                        newStatus: nextStatus,
                        staffId: user?.id || 'SYSTEM',
                        staffName: user?.name || 'System',
                        reason: reason || `Transitioned to ${nextStatus}`,
                        timestamp: now,
                      },
                    ],
                  }
                : o
            );

            // Auto-create or sync shipment record on Shipped / Delivered
            let shipments = s.shipments;
            if (nextStatus === 'Shipped' && !s.shipments.some((sh) => sh.orderId === orderId)) {
              const cust = s.customers.find((c) => c.id === order.customerId);
              shipments = [
                {
                  id: generateId('SHP'),
                  shipmentCode: `SHP-MC-${Math.floor(6000 + Math.random() * 3999)}`,
                  orderId: order.id,
                  orderNumber: order.orderNumber,
                  customerId: order.customerId,
                  customerName: cust?.name || order.shippingAddress.recipientName || 'Patient',
                  destinationCity: order.shippingAddress.city,
                  pincode: order.shippingAddress.pincode,
                  zone: computePincodeZone(order.shippingAddress.pincode),
                  partnerId: chosenPartner?.id || 'DP-01',
                  partnerName: chosenPartner?.name || 'Healthy Ghar Express',
                  awbNumber: trackingNumber || 'AWB-SIM-001',
                  deliveryFee: order.shippingFee,
                  coldChainRequired,
                  currentTempCelsius: coldChainRequired ? 4.2 : undefined,
                  status: 'In Transit',
                  expectedDeliveryDate: new Date(Date.now() + 86400000).toISOString(),
                  isSimulated: true,
                  timeline: [{ status: 'In Transit', location: order.warehouseId, timestamp: now }],
                  createdAt: now,
                },
                ...s.shipments,
              ];
            } else if (nextStatus === 'Out for Delivery' || nextStatus === 'Delivered') {
              shipments = s.shipments.map((sh) =>
                sh.orderId === orderId && sh.status !== nextStatus && sh.status !== 'Delivered'
                  ? {
                      ...sh,
                      status: nextStatus,
                      timeline: [...sh.timeline, { status: nextStatus, location: order.shippingAddress.city, timestamp: now }],
                    }
                  : sh
              );
            }

            return {
              batches: updatedBatches,
              inventory: deriveInventoryFromBatches(s.products, updatedBatches),
              stockMovements: [...movements, ...s.stockMovements],
              orders,
              shipments,
              deliveryPartners: recomputePartnerLoads(s.deliveryPartners, shipments),
              payments,
              refunds,
              customers,
              coupons,
              activityLogs: [appendLog('ORDER_STATUS_CHANGED', 'orders', order.orderNumber, 'Success', { from: order.status, to: nextStatus, reason }), ...s.activityLogs],
            };
          });

          return { ok: true, message: `Order ${order.orderNumber} transitioned from ${order.status} to ${nextStatus}.` };
        },

        assignPharmacist: (rxId, pharmacistId) => {
          if (!get().can('prescriptions', 'edit')) {
            return { ok: false, message: 'Permission denied.' };
          }
          const rx = get().prescriptions.find((r) => r.id === rxId);
          if (!rx) return { ok: false, message: 'Prescription not found.' };
          if (rx.status === 'Approved' || rx.status === 'Rejected') {
            return { ok: false, message: `Cannot assign: Prescription ${rx.rxNumber} is already finalized (${rx.status}).` };
          }
          const pharmacist = get().staff.find(
            (u) =>
              u.id === pharmacistId &&
              u.status === 'Active' &&
              (u.roleId === 'PHARMACIST' || u.roleId === 'SUPER_ADMIN')
          );
          if (!pharmacist) {
            return { ok: false, message: 'Assignee must be an active licensed Pharmacist or Chief Pharmacist.' };
          }
          const user = get().getCurrentUser();
          const now = new Date().toISOString();

          set((s) => ({
            prescriptions: s.prescriptions.map((item) =>
              item.id === rxId
                ? {
                    ...item,
                    assignedPharmacistId: pharmacist.id,
                    assignedPharmacistName: pharmacist.name,
                    status: item.status === 'Pending Review' || item.status === 'Uploaded' ? ('Under Review' as const) : item.status,
                    reviewHistory: [
                      ...item.reviewHistory,
                      {
                        id: generateId('REVH'),
                        reviewerId: user?.id || 'SYSTEM',
                        reviewerName: user?.name || 'System',
                        reviewerRegNo: user?.registrationNumber || 'OPS',
                        action: 'Assigned',
                        notes: `Assigned to ${pharmacist.name} (${pharmacist.registrationNumber || 'RMP'})`,
                        timestamp: now,
                      },
                    ],
                  }
                : item
            ),
            activityLogs: [appendLog('RX_PHARMACIST_ASSIGNED', 'prescriptions', rxId, 'Success', { pharmacist: pharmacist.name }), ...s.activityLogs],
          }));
          return { ok: true, message: `Assigned to ${pharmacist.name}.` };
        },

        reviewPrescription: ({ rxId, decision, notes }) => {
          if (!get().can('prescriptions', 'approve')) {
            return {
              ok: false,
              message: 'Blocked: Only authorized Pharmacists or Super Admins may approve/reject prescriptions.',
            };
          }
          if ((decision === 'Rejected' || decision === 'Clarification Requested') && !notes.trim()) {
            return { ok: false, message: `A clinical reason / explanation is mandatory when marking ${decision}.` };
          }
          const rx = get().prescriptions.find((r) => r.id === rxId);
          if (!rx) return { ok: false, message: 'Prescription not found.' };
          if (rx.status === 'Approved' || rx.status === 'Rejected') {
            return { ok: false, message: `Duplicate review blocked: Prescription ${rx.rxNumber} is already ${rx.status}.` };
          }

          const user = get().getCurrentUser();
          const now = new Date().toISOString();

          set((s) => {
            const prescriptions = s.prescriptions.map((item) =>
              item.id === rxId
                ? {
                    ...item,
                    status: decision,
                    assignedPharmacistId: item.assignedPharmacistId || user?.id,
                    assignedPharmacistName: item.assignedPharmacistName || user?.name,
                    rejectionReason: decision === 'Rejected' ? notes : undefined,
                    clarificationRequest: decision === 'Clarification Requested' ? notes : undefined,
                    reviewedAt: now,
                    reviewHistory: [
                      ...item.reviewHistory,
                      {
                        id: generateId('REVH'),
                        reviewerId: user?.id || 'SYSTEM',
                        reviewerName: user?.name || 'Pharmacist',
                        reviewerRegNo: user?.registrationNumber || 'KSPC-VERIFIED',
                        action: decision,
                        notes: notes || 'Verified against Schedule H / Rule 65 dispensing guidelines.',
                        timestamp: now,
                      },
                    ],
                  }
                : item
            );

            const orders = s.orders.map((ord) => {
              if (ord.prescriptionId !== rxId && ord.id !== rx.orderId) return ord;
              const nextOrderStatus =
                decision === 'Approved' && ord.status === 'Placed' ? ('Confirmed' as const) : ord.status;
              return {
                ...ord,
                prescriptionStatus: decision,
                status: nextOrderStatus,
                updatedAt: now,
                timeline: [
                  ...ord.timeline,
                  {
                    previousStatus: ord.status,
                    newStatus: nextOrderStatus,
                    staffId: user?.id || 'SYSTEM',
                    staffName: user?.name || 'Pharmacist',
                    reason: `Rx ${rx.rxNumber} ${decision}: ${notes || 'Clinical check passed'}`,
                    timestamp: now,
                  },
                ],
              };
            });

            return {
              prescriptions,
              orders,
              activityLogs: [appendLog(`RX_${decision.toUpperCase().replace(/\s+/g, '_')}`, 'prescriptions', rx.rxNumber, 'Success', { orderId: rx.orderId, regNo: user?.registrationNumber }), ...s.activityLogs],
            };
          });

          return { ok: true, message: `Prescription ${rx.rxNumber} marked ${decision}. Linked order synchronized.` };
        },

        createRefundRequest: ({ paymentId, amount, reason }) => {
          if (!get().can('refunds', 'create')) {
            return { ok: false, message: 'Permission denied.' };
          }
          const payment = get().payments.find((p) => p.id === paymentId);
          if (!payment) return { ok: false, message: 'Payment record not found.' };
          if (payment.status === 'Failed' || payment.status === 'Pending') {
            return { ok: false, message: 'Cannot refund an uncaptured or failed transaction.' };
          }
          const pendingOrDone = get()
            .refunds.filter((r) => r.paymentId === paymentId && r.status !== 'Rejected')
            .reduce((sum, r) => sum + r.amount, 0);
          const remainingEligible = payment.amount - pendingOrDone;
          if (amount <= 0 || amount > remainingEligible) {
            return {
              ok: false,
              message: `Refund blocked: Requested amount exceeds remaining eligible balance (₹${remainingEligible}).`,
            };
          }
          const user = get().getCurrentUser();
          const refund: Refund = {
            id: generateId('REF'),
            refundCode: `RFND-MC-${Math.floor(500 + Math.random() * 499)}`,
            paymentId: payment.id,
            orderId: payment.orderId,
            orderNumber: payment.orderNumber,
            customerId: payment.customerId,
            customerName: payment.customerName,
            amount,
            reason,
            status: 'Pending Approval',
            isSimulated: true,
            requestedBy: user?.name || 'Finance Ops',
            createdAt: new Date().toISOString(),
          };
          set((s) => ({
            refunds: [refund, ...s.refunds],
            activityLogs: [appendLog('REFUND_REQUESTED', 'refunds', refund.refundCode, 'Success', { amount, orderNumber: payment.orderNumber }), ...s.activityLogs],
          }));
          return { ok: true, message: `Refund request ${refund.refundCode} queued for approval.`, data: refund };
        },

        processRefund: (refundId, action) => {
          if (!get().can('refunds', 'approve')) {
            return { ok: false, message: 'Permission denied: Finance Manager or Admin approval required.' };
          }
          const refund = get().refunds.find((r) => r.id === refundId);
          if (!refund) return { ok: false, message: 'Refund record not found.' };
          if (refund.status === 'Processed (Simulated)' || refund.status === 'Rejected') {
            return { ok: false, message: 'Duplicate refund blocked: This refund request is already finalized.' };
          }
          const payment = get().payments.find((p) => p.id === refund.paymentId);
          if (!payment || payment.refundedAmount + refund.amount > payment.amount) {
            return { ok: false, message: 'Over-refund prevented: Total refunded exceeds original transaction amount.' };
          }

          const user = get().getCurrentUser();
          const now = new Date().toISOString();

          if (action === 'Reject') {
            set((s) => ({
              refunds: s.refunds.map((r) =>
                r.id === refundId ? { ...r, status: 'Rejected', processedBy: user?.name, processedAt: now } : r
              ),
              activityLogs: [appendLog('REFUND_REJECTED', 'refunds', refund.refundCode, 'Warning'), ...s.activityLogs],
            }));
            return { ok: true, message: `Refund ${refund.refundCode} rejected.` };
          }

          const simRef = `rfnd_sim_${Date.now().toString(36)}`;
          set((s) => {
            const newRefundedTotal = payment.refundedAmount + refund.amount;
            const fullRefund = newRefundedTotal >= payment.amount;
            return {
              refunds: s.refunds.map((r) =>
                r.id === refundId
                  ? {
                      ...r,
                      status: 'Processed (Simulated)',
                      gatewayRefundRef: simRef,
                      processedBy: user?.name,
                      processedAt: now,
                    }
                  : r
              ),
              payments: s.payments.map((p) =>
                p.id === payment.id
                  ? {
                      ...p,
                      refundedAmount: newRefundedTotal,
                      status: fullRefund ? 'Refunded' : 'Partially Refunded',
                    }
                  : p
              ),
              orders: s.orders.map((o) =>
                o.id === payment.orderId
                  ? { ...o, paymentStatus: fullRefund ? 'Refunded' : 'Partially Refunded', updatedAt: now }
                  : o
              ),
              activityLogs: [appendLog('REFUND_PROCESSED_SIMULATED', 'refunds', refund.refundCode, 'Success', { amount: refund.amount, simRef }), ...s.activityLogs],
            };
          });
          return { ok: true, message: `Demo refund ${refund.refundCode} simulated (${simRef}).` };
        },

        reviewReturnRequest: ({ returnId, decision, reviewNotes }) => {
          if (!get().can('returns', 'approve')) {
            return { ok: false, message: 'Permission denied.' };
          }
          const ret = get().returns.find((r) => r.id === returnId);
          if (!ret) return { ok: false, message: 'Return request not found.' };
          if (ret.status === 'Restocked' || ret.status === 'Form 46 Destroyed' || ret.status === 'Rejected') {
            return { ok: false, message: `Duplicate return processing blocked: ${ret.returnCode} is already ${ret.status}.` };
          }
          if (ret.status === 'Approved' && decision === 'Approved') {
            return { ok: false, message: `Return ${ret.returnCode} is already Approved.` };
          }
          if (
            (decision === 'Approved' || decision === 'Restocked') &&
            ret.eligibilityCheck !== 'Eligible' &&
            !get().settings.allowReturnForColdChain
          ) {
            return {
              ok: false,
              message: `Blocked by CDSCO Rule 65 Policy: ${ret.eligibilityCheck}.`,
            };
          }
          const user = get().getCurrentUser();
          const now = new Date().toISOString();
          const linkedOrder = get().orders.find((o) => o.id === ret.orderId);
          const restockBatchTarget =
            decision === 'Restocked'
              ? get().batches.find(
                  (b) =>
                    b.productId === ret.productId &&
                    b.warehouseId === linkedOrder?.warehouseId &&
                    b.status !== 'Quarantined' &&
                    b.status !== 'Expired' &&
                    new Date(b.expiryDate) > new Date()
                ) ||
                get().batches.find(
                  (b) =>
                    b.productId === ret.productId &&
                    b.status !== 'Quarantined' &&
                    b.status !== 'Expired' &&
                    new Date(b.expiryDate) > new Date()
                )
              : undefined;
          if (decision === 'Restocked' && !restockBatchTarget) {
            return {
              ok: false,
              message: 'No active non-expired batch found for this SKU to restock into. Record Form 46 Destruction instead.',
            };
          }

          set((s) => {
            let batches = s.batches;
            let stockMovements = s.stockMovements;
            if (decision === 'Restocked' && restockBatchTarget) {
              const targetBatch = s.batches.find((b) => b.id === restockBatchTarget.id);
              if (targetBatch) {
                const nextAvail = targetBatch.availableQty + ret.quantity;
                batches = s.batches.map((b) =>
                  b.id === targetBatch.id
                    ? {
                        ...b,
                        availableQty: nextAvail,
                        status: computeBatchLifecycleStatus(
                          b.expiryDate,
                          nextAvail,
                          b.reservedQty,
                          b.status === 'Depleted' ? 'Active' : b.status
                        ),
                      }
                    : b
                );
                stockMovements = [
                  {
                    id: generateId('MOV'),
                    productId: ret.productId,
                    batchId: targetBatch.id,
                    warehouseId: targetBatch.warehouseId,
                    type: 'RETURN_RESTOCK',
                    quantityDelta: ret.quantity,
                    previousQty: targetBatch.availableQty,
                    newQty: nextAvail,
                    referenceId: ret.returnCode,
                    reason: 'Approved Sealed Return Restocked',
                    staffId: user?.id || 'SYSTEM',
                    staffName: user?.name || 'System',
                    createdAt: now,
                  },
                  ...s.stockMovements,
                ];
              }
            }

            let refunds = s.refunds;
            let linkedRefundId = ret.linkedRefundId;
            if (
              (decision === 'Approved' || decision === 'Restocked' || decision === 'Form 46 Destroyed') &&
              !linkedRefundId &&
              ret.refundEligibleAmount > 0
            ) {
              const payment = s.payments.find(
                (p) => p.orderId === ret.orderId && (p.status === 'Captured' || p.status === 'Partially Refunded')
              );
              if (payment) {
                const usedOrPending = s.refunds
                  .filter((r) => r.paymentId === payment.id && r.status !== 'Rejected')
                  .reduce((sum, r) => sum + r.amount, 0);
                const remaining = payment.amount - usedOrPending;
                const refundAmt = Math.min(ret.refundEligibleAmount, remaining);
                if (refundAmt > 0) {
                  const newRefund: Refund = {
                    id: generateId('REF'),
                    refundCode: `RFND-MC-${Math.floor(500 + Math.random() * 499)}`,
                    paymentId: payment.id,
                    orderId: payment.orderId,
                    orderNumber: payment.orderNumber,
                    customerId: payment.customerId,
                    customerName: payment.customerName,
                    amount: refundAmt,
                    reason: `Return ${ret.returnCode} (${decision}): ${reviewNotes || ret.reason}`,
                    status: 'Pending Approval',
                    isSimulated: true,
                    requestedBy: user?.name || 'Returns Desk',
                    createdAt: now,
                  };
                  linkedRefundId = newRefund.id;
                  refunds = [newRefund, ...s.refunds];
                }
              }
            }

            return {
              batches,
              inventory: deriveInventoryFromBatches(s.products, batches),
              stockMovements,
              refunds,
              returns: s.returns.map((r) =>
                r.id === returnId
                  ? { ...r, status: decision, linkedRefundId, reviewedBy: user?.name, reviewNotes, updatedAt: now }
                  : r
              ),
              activityLogs: [appendLog('RETURN_REVIEWED', 'returns', ret.returnCode, 'Success', { decision, linkedRefundId }), ...s.activityLogs],
            };
          });
          return { ok: true, message: `Return ${ret.returnCode} updated to ${decision}.` };
        },

        createShipment: ({ orderId, partnerId, coldChainRequired, deliveryFee, expectedDeliveryDate }) => {
          if (!get().can('delivery', 'create') && !get().can('delivery', 'edit')) {
            return { ok: false, message: 'Permission denied.' };
          }
          const order = get().orders.find((o) => o.id === orderId);
          if (!order) return { ok: false, message: 'Selected order not found.' };
          if (order.status === 'Cancelled') {
            return { ok: false, message: 'Cannot create shipment for a cancelled order.' };
          }
          if (order.prescriptionRequired && order.prescriptionStatus !== 'Approved') {
            return {
              ok: false,
              message: `Blocked by CDSCO Rule 65: Prescription for ${order.orderNumber} is not Approved yet.`,
            };
          }
          if (get().shipments.some((sh) => sh.orderId === orderId)) {
            return { ok: false, message: `An active shipment already exists for ${order.orderNumber}.` };
          }
          const partner = get().deliveryPartners.find((p) => p.id === partnerId && p.status === 'Active');
          if (!partner) return { ok: false, message: 'Selected delivery partner is unavailable or degraded.' };
          if (coldChainRequired && !partner.coldChainCapable) {
            return { ok: false, message: `${partner.name} does not support 2–8°C Cold Chain transport.` };
          }

          const cust = get().customers.find((c) => c.id === order.customerId);
          const now = new Date().toISOString();
          const awb = `AWB-${partner.code}-${Math.floor(100000 + Math.random() * 899999)}`;
          const zone = computePincodeZone(order.shippingAddress.pincode);

          const shipment: Shipment = {
            id: generateId('SHP'),
            shipmentCode: `SHP-MC-${Math.floor(6000 + Math.random() * 3999)}`,
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerId: order.customerId,
            customerName: cust?.name || order.shippingAddress.recipientName || 'Patient',
            destinationCity: order.shippingAddress.city,
            pincode: order.shippingAddress.pincode,
            zone,
            partnerId: partner.id,
            partnerName: partner.name,
            awbNumber: awb,
            deliveryFee,
            coldChainRequired,
            currentTempCelsius: coldChainRequired ? 4.2 : undefined,
            status: 'Label Created',
            expectedDeliveryDate: new Date(expectedDeliveryDate).toISOString(),
            isSimulated: true,
            timeline: [
              {
                status: 'Label Created',
                location: `${order.warehouseId.replace('WH-', '')} Dispatch Desk`,
                timestamp: now,
              },
            ],
            createdAt: now,
          };

          set((s) => {
            const shipments = [shipment, ...s.shipments];
            return {
              shipments,
              deliveryPartners: recomputePartnerLoads(s.deliveryPartners, shipments),
              orders: s.orders.map((o) =>
                o.id === order.id
                  ? { ...o, trackingNumber: awb, deliveryPartnerId: partner.id, updatedAt: now }
                  : o
              ),
              activityLogs: [
                appendLog('SHIPMENT_CREATED', 'delivery', awb, 'Success', {
                  orderNumber: order.orderNumber,
                  partner: partner.name,
                }),
                ...s.activityLogs,
              ],
            };
          });
          return { ok: true, message: `Shipment ${awb} created for ${order.orderNumber} (Demo 3PL).`, data: shipment };
        },

        updateShipmentStatus: (shipmentId, nextStatus, location) => {
          if (!get().can('delivery', 'edit')) return { ok: false, message: 'Permission denied.' };
          const shp = get().shipments.find((s) => s.id === shipmentId);
          if (!shp) return { ok: false, message: 'Shipment not found.' };
          if (shp.status === 'Delivered') {
            return { ok: false, message: `Shipment ${shp.awbNumber} is already Delivered.` };
          }
          if (shp.status === nextStatus) {
            return { ok: false, message: `Shipment ${shp.awbNumber} is already marked ${nextStatus}.` };
          }
          const linkedOrder = get().orders.find((o) => o.id === shp.orderId);
          if (linkedOrder?.status === 'Cancelled') {
            return { ok: false, message: 'Cannot update shipment for a cancelled order.' };
          }
          if (
            linkedOrder &&
            get().settings.blockOrderDispatchWithoutRxApproval &&
            linkedOrder.prescriptionRequired &&
            linkedOrder.prescriptionStatus !== 'Approved' &&
            (nextStatus === 'Picked Up' ||
              nextStatus === 'In Transit' ||
              nextStatus === 'Out for Delivery' ||
              nextStatus === 'Delivered')
          ) {
            return {
              ok: false,
              message: `Clinical Gate: Order ${linkedOrder.orderNumber} requires Pharmacist Rx Approval before ${nextStatus}.`,
            };
          }
          const user = get().getCurrentUser();
          const now = new Date().toISOString();

          const updatedBatches = get().batches.map((b) => ({ ...b }));
          const dispatchMovements: StockMovement[] = [];
          const shouldDeductReserved =
            linkedOrder &&
            linkedOrder.inventoryState === 'Reserved' &&
            (nextStatus === 'Picked Up' ||
              nextStatus === 'In Transit' ||
              nextStatus === 'Out for Delivery' ||
              nextStatus === 'Delivered');

          if (shouldDeductReserved && linkedOrder) {
            for (const item of linkedOrder.items) {
              const allocs = item.batchAllocations?.length
                ? item.batchAllocations
                : item.batchId
                ? [{ batchId: item.batchId, quantity: item.quantity }]
                : [];
              for (const alloc of allocs) {
                const batch = updatedBatches.find((b) => b.id === alloc.batchId);
                if (batch) {
                  const deductQty = Math.min(batch.reservedQty, alloc.quantity);
                  batch.reservedQty -= deductQty;
                  batch.status = computeBatchLifecycleStatus(
                    batch.expiryDate,
                    batch.availableQty,
                    batch.reservedQty,
                    batch.status
                  );
                  dispatchMovements.push({
                    id: generateId('MOV'),
                    productId: item.productId,
                    batchId: batch.id,
                    warehouseId: linkedOrder.warehouseId,
                    type: 'ORDER_DEDUCT',
                    quantityDelta: -deductQty,
                    previousQty: batch.availableQty + deductQty,
                    newQty: batch.availableQty,
                    referenceId: linkedOrder.orderNumber,
                    reason: `3PL Dispatch (${shp.awbNumber}) — Final Inventory Deduction`,
                    staffId: user?.id || 'SYSTEM',
                    staffName: user?.name || 'Delivery Ops',
                    createdAt: now,
                  });
                }
              }
            }
          }

          set((s) => {
            const shipments = s.shipments.map((item) =>
              item.id === shipmentId
                ? {
                    ...item,
                    status: nextStatus,
                    timeline: [...item.timeline, { status: nextStatus, location, timestamp: now }],
                  }
                : item
            );
            let payments = s.payments;
            const orders = s.orders.map((ord) => {
              if (ord.id !== shp.orderId) return ord;
              const syncedOrderStatus: OrderStatus =
                nextStatus === 'Delivered'
                  ? 'Delivered'
                  : nextStatus === 'Out for Delivery'
                  ? 'Out for Delivery'
                  : (nextStatus === 'In Transit' || nextStatus === 'Picked Up') &&
                    (ord.status === 'Placed' || ord.status === 'Confirmed' || ord.status === 'Processing' || ord.status === 'Packed')
                  ? 'Shipped'
                  : ord.status;
              const nextInvState = shouldDeductReserved ? ('Deducted' as const) : ord.inventoryState;
              if (syncedOrderStatus === ord.status && nextInvState === ord.inventoryState) return ord;
              if (syncedOrderStatus === 'Delivered' && ord.paymentMethod === 'COD') {
                payments = s.payments.map((p) =>
                  p.orderId === ord.id && p.status === 'Pending' ? { ...p, status: 'Captured' as const } : p
                );
              }
              return {
                ...ord,
                status: syncedOrderStatus,
                inventoryState: nextInvState,
                paymentStatus: syncedOrderStatus === 'Delivered' && ord.paymentMethod === 'COD' ? ('Paid' as const) : ord.paymentStatus,
                updatedAt: now,
                timeline:
                  syncedOrderStatus !== ord.status
                    ? [
                        ...ord.timeline,
                        {
                          previousStatus: ord.status,
                          newStatus: syncedOrderStatus,
                          staffId: user?.id || 'SYSTEM',
                          staffName: user?.name || 'Delivery Ops',
                          reason: `3PL tracking scan (${shp.awbNumber}): ${nextStatus} at ${location}`,
                          timestamp: now,
                        },
                      ]
                    : ord.timeline,
              };
            });
            return {
              batches: shouldDeductReserved ? updatedBatches : s.batches,
              inventory: shouldDeductReserved ? deriveInventoryFromBatches(s.products, updatedBatches) : s.inventory,
              stockMovements: shouldDeductReserved ? [...dispatchMovements, ...s.stockMovements] : s.stockMovements,
              shipments,
              deliveryPartners: recomputePartnerLoads(s.deliveryPartners, shipments),
              orders,
              payments,
              activityLogs: [appendLog('SHIPMENT_UPDATED', 'delivery', shp.awbNumber, 'Success', { nextStatus, location }), ...s.activityLogs],
            };
          });
          return { ok: true, message: `Shipment ${shp.awbNumber} updated to ${nextStatus} (Demo 3PL).` };
        },

        reassignShipmentPartner: (shipmentId, partnerId) => {
          if (!get().can('delivery', 'edit')) return { ok: false, message: 'Permission denied.' };
          const shp = get().shipments.find((s) => s.id === shipmentId);
          if (!shp) return { ok: false, message: 'Shipment not found.' };
          if (shp.status === 'Delivered') {
            return { ok: false, message: 'Cannot reassign carrier on an already delivered shipment.' };
          }
          const partner = get().deliveryPartners.find((p) => p.id === partnerId && p.status === 'Active');
          if (!partner) return { ok: false, message: 'Selected partner not found or currently degraded.' };
          if (shp.coldChainRequired && !partner.coldChainCapable) {
            return { ok: false, message: `Blocked: ${partner.name} does not support 2–8°C Cold-Chain telemetry.` };
          }
          set((s) => {
            const shipments = s.shipments.map((sh) =>
              sh.id === shipmentId ? { ...sh, partnerId: partner.id, partnerName: partner.name } : sh
            );
            return {
              shipments,
              deliveryPartners: recomputePartnerLoads(s.deliveryPartners, shipments),
              orders: s.orders.map((o) =>
                o.id === shp.orderId ? { ...o, deliveryPartnerId: partner.id, updatedAt: new Date().toISOString() } : o
              ),
              activityLogs: [appendLog('CARRIER_REASSIGNED', 'delivery', shipmentId, 'Success', { partner: partner.name }), ...s.activityLogs],
            };
          });
          return { ok: true, message: `Carrier reassigned to ${partner.name}.` };
        },

        updateCustomer: (customerId, patch) => {
          if (!get().can('customers', 'edit')) return { ok: false, message: 'Permission denied.' };
          set((s) => ({
            customers: s.customers.map((c) => (c.id === customerId ? { ...c, ...patch } : c)),
            activityLogs: [appendLog('CUSTOMER_UPDATED', 'customers', customerId, 'Success'), ...s.activityLogs],
          }));
          return { ok: true, message: 'Customer profile updated.' };
        },

        moderateReview: (reviewId, status, note) => {
          if (!get().can('reviews', 'approve')) return { ok: false, message: 'Permission denied.' };
          const rev = get().reviews.find((r) => r.id === reviewId);
          if (!rev) return { ok: false, message: 'Review not found.' };

          set((s) => {
            const wasApproved = rev.status === 'Approved';
            const willBeApproved = status === 'Approved';
            const reviews = s.reviews.map((r) =>
              r.id === reviewId ? { ...r, status, moderationNote: note || r.moderationNote } : r
            );
            const products = s.products.map((p) => {
              if (p.id !== rev.productId) return p;
              if (!wasApproved && willBeApproved) {
                const nextCount = p.reviewCount + 1;
                const nextAvg = Number(((p.ratingAvg * p.reviewCount + rev.rating) / nextCount).toFixed(1));
                return { ...p, ratingAvg: nextAvg, reviewCount: nextCount };
              }
              if (wasApproved && !willBeApproved) {
                const nextCount = Math.max(0, p.reviewCount - 1);
                const nextAvg =
                  nextCount === 0
                    ? 0
                    : Number(Math.max(1, Math.min(5, (p.ratingAvg * p.reviewCount - rev.rating) / nextCount)).toFixed(1));
                return { ...p, ratingAvg: nextAvg, reviewCount: nextCount };
              }
              return p;
            });
            return {
              reviews,
              products,
              activityLogs: [appendLog('REVIEW_MODERATED', 'reviews', reviewId, 'Success', { status }), ...s.activityLogs],
            };
          });
          return { ok: true, message: `Review marked ${status}.` };
        },

        createSupportTicket: ({ customerId, relatedOrderNumber, category, priority, subject, initialMessage }) => {
          if (!get().can('support', 'create') && !get().can('support', 'edit')) {
            return { ok: false, message: 'Permission denied.' };
          }
          if (!subject.trim() || !initialMessage.trim()) {
            return { ok: false, message: 'Subject and initial description are required.' };
          }
          const cust = get().customers.find((c) => c.id === customerId);
          if (!cust) return { ok: false, message: 'Selected customer not found.' };
          const user = get().getCurrentUser();
          const now = new Date().toISOString();
          const ticket: SupportTicket = {
            id: generateId('TKT'),
            ticketCode: `TKT-MC-${Math.floor(1000 + Math.random() * 8999)}`,
            customerId: cust.id,
            customerName: cust.name,
            relatedOrderNumber: relatedOrderNumber?.trim() || undefined,
            category,
            priority,
            subject: subject.trim(),
            status: 'Open',
            assignedStaffId: user?.id,
            assignedStaffName: user?.name,
            messages: [
              {
                id: generateId('MSG'),
                senderType: 'Customer',
                senderName: cust.name,
                body: initialMessage.trim(),
                timestamp: now,
              },
            ],
            createdAt: now,
            updatedAt: now,
          };
          set((s) => ({
            tickets: [ticket, ...s.tickets],
            activityLogs: [
              appendLog('TICKET_CREATED', 'support', ticket.ticketCode, 'Success', {
                customerName: cust.name,
                category,
                priority,
              }),
              ...s.activityLogs,
            ],
          }));
          return { ok: true, message: `Support ticket ${ticket.ticketCode} created.`, data: ticket };
        },

        replySupportTicket: (ticketId, senderType, body) => {
          if (!get().can('support', 'edit')) return { ok: false, message: 'Permission denied.' };
          if (!body.trim()) return { ok: false, message: 'Message body cannot be empty.' };
          const user = get().getCurrentUser();
          const now = new Date().toISOString();
          set((s) => ({
            tickets: s.tickets.map((t) =>
              t.id === ticketId
                ? {
                    ...t,
                    status: senderType === 'Staff' && t.status === 'Open' ? ('In Progress' as const) : t.status,
                    updatedAt: now,
                    messages: [
                      ...t.messages,
                      {
                        id: generateId('MSG'),
                        senderType,
                        senderName: user?.name || 'Support Agent',
                        body,
                        isSimulatedDelivery: senderType === 'Staff',
                        timestamp: now,
                      },
                    ],
                  }
                : t
            ),
            activityLogs: [appendLog('TICKET_REPLIED', 'support', ticketId, 'Success', { senderType }), ...s.activityLogs],
          }));
          return {
            ok: true,
            message: senderType === 'Internal Note' ? 'Internal staff note saved.' : 'Reply logged (Simulated email/SMS delivery in Demo Mode).',
          };
        },

        updateSupportTicketStatus: (ticketId, status, assignedStaffId) => {
          if (!get().can('support', 'edit')) return { ok: false, message: 'Permission denied.' };
          const assigned = assignedStaffId ? get().staff.find((u) => u.id === assignedStaffId) : undefined;
          set((s) => ({
            tickets: s.tickets.map((t) =>
              t.id === ticketId
                ? {
                    ...t,
                    status,
                    assignedStaffId: assigned ? assigned.id : t.assignedStaffId,
                    assignedStaffName: assigned ? assigned.name : t.assignedStaffName,
                    updatedAt: new Date().toISOString(),
                  }
                : t
            ),
            activityLogs: [appendLog('TICKET_UPDATED', 'support', ticketId, 'Success', { status }), ...s.activityLogs],
          }));
          return { ok: true, message: `Ticket status updated to ${status}.` };
        },

        saveDoctor: (input, existingId) => {
          if (!get().can('doctors', existingId ? 'edit' : 'create')) {
            return { ok: false, message: 'Permission denied.' };
          }
          if (existingId) {
            let updated: Doctor | undefined;
            set((s) => ({
              doctors: s.doctors.map((d) => {
                if (d.id !== existingId) return d;
                updated = { ...d, ...input };
                return updated;
              }),
              activityLogs: [appendLog('DOCTOR_UPDATED', 'doctors', existingId, 'Success', { name: input.name }), ...s.activityLogs],
            }));
            return { ok: true, message: `Doctor profile "${input.name}" updated.`, data: updated };
          }
          const doc: Doctor = {
            ...input,
            id: generateId('DOC'),
            rating: 4.8,
            consultationsCount: 0,
          };
          set((s) => ({
            doctors: [doc, ...s.doctors],
            activityLogs: [appendLog('DOCTOR_ONBOARDED', 'doctors', doc.id, 'Success', { nmc: doc.nmcRegNo }), ...s.activityLogs],
          }));
          return { ok: true, message: `${doc.name} onboarded to Telehealth roster.`, data: doc };
        },

        createConsultation: ({ customerId, doctorId, scheduledAt, mode, chiefComplaint }) => {
          if (!get().can('consultations', 'create')) return { ok: false, message: 'Permission denied.' };
          const cust = get().customers.find((c) => c.id === customerId);
          const doc = get().doctors.find((d) => d.id === doctorId);
          if (!cust || !doc) return { ok: false, message: 'Patient or Doctor not found.' };
          if (cust.status === 'Blocked') return { ok: false, message: `Patient ${cust.name} account is Blocked.` };
          if (doc.status === 'Credential Pending' || doc.status === 'Off Duty') {
            return { ok: false, message: `Cannot schedule with ${doc.name} (status: ${doc.status}).` };
          }
          const con: Consultation = {
            id: generateId('CON'),
            consultationCode: `TELE-2026-${Math.floor(100 + Math.random() * 899)}`,
            customerId: cust.id,
            customerName: cust.name,
            doctorId: doc.id,
            doctorName: doc.name,
            specialization: doc.specialization,
            scheduledAt,
            mode,
            chiefComplaint,
            fee: doc.consultationFee,
            paymentStatus: 'Paid',
            status: 'Scheduled',
            createdAt: new Date().toISOString(),
          };
          set((s) => ({
            consultations: [con, ...s.consultations],
            activityLogs: [appendLog('CONSULTATION_SCHEDULED', 'consultations', con.consultationCode, 'Success'), ...s.activityLogs],
          }));
          return { ok: true, message: `Consultation ${con.consultationCode} scheduled.`, data: con };
        },

        updateConsultationStatus: (consultationId, status, clinicalNotes) => {
          if (!get().can('consultations', 'edit')) return { ok: false, message: 'Permission denied.' };
          const con = get().consultations.find((c) => c.id === consultationId);
          if (!con) return { ok: false, message: 'Consultation not found.' };
          if (con.status === 'Completed' || con.status === 'Cancelled') {
            return { ok: false, message: `Consultation ${con.consultationCode} is already ${con.status}.` };
          }
          set((s) => ({
            consultations: s.consultations.map((c) =>
              c.id === consultationId
                ? {
                    ...c,
                    status,
                    paymentStatus: status === 'Cancelled' && c.paymentStatus === 'Paid' ? ('Refunded' as const) : c.paymentStatus,
                    clinicalNotes: clinicalNotes ?? c.clinicalNotes,
                  }
                : c
            ),
            doctors:
              status === 'Completed'
                ? s.doctors.map((d) =>
                    d.id === con.doctorId
                      ? {
                          ...d,
                          consultationsCount: d.consultationsCount + 1,
                          status: d.status === 'In Consultation' ? ('Available' as const) : d.status,
                        }
                      : d
                  )
                : s.doctors,
            activityLogs: [appendLog('CONSULTATION_STATUS', 'consultations', consultationId, 'Success', { status }), ...s.activityLogs],
          }));
          return { ok: true, message: `Consultation marked ${status}.` };
        },

        saveCoupon: (input, existingId) => {
          if (!get().can('coupons', existingId ? 'edit' : 'create')) return { ok: false, message: 'Permission denied.' };
          const code = input.code.trim().toUpperCase();
          const dup = get().coupons.find((c) => c.code === code && c.id !== existingId);
          if (dup) return { ok: false, message: `Coupon code ${code} already exists.` };
          if (existingId) {
            let updated: Coupon | undefined;
            set((s) => ({
              coupons: s.coupons.map((c) => {
                if (c.id !== existingId) return c;
                updated = { ...c, ...input, code };
                return updated;
              }),
              activityLogs: [appendLog('COUPON_UPDATED', 'coupons', code, 'Success'), ...s.activityLogs],
            }));
            return { ok: true, message: `Coupon ${code} updated.`, data: updated };
          }
          const coupon: Coupon = { ...input, code, id: generateId('CPN'), usedCount: 0 };
          set((s) => ({
            coupons: [coupon, ...s.coupons],
            activityLogs: [appendLog('COUPON_CREATED', 'coupons', code, 'Success'), ...s.activityLogs],
          }));
          return { ok: true, message: `Coupon ${code} created.`, data: coupon };
        },

        toggleCoupon: (couponId) => {
          if (!get().can('coupons', 'edit')) return { ok: false, message: 'Permission denied.' };
          set((s) => ({
            coupons: s.coupons.map((c) => (c.id === couponId ? { ...c, active: !c.active } : c)),
            activityLogs: [appendLog('COUPON_TOGGLED', 'coupons', couponId, 'Success'), ...s.activityLogs],
          }));
          return { ok: true, message: 'Coupon status updated.' };
        },

        deleteCoupon: (couponId) => {
          if (!get().can('coupons', 'delete')) return { ok: false, message: 'Permission denied.' };
          set((s) => ({
            coupons: s.coupons.filter((c) => c.id !== couponId),
            activityLogs: [appendLog('COUPON_DELETED', 'coupons', couponId, 'Warning'), ...s.activityLogs],
          }));
          return { ok: true, message: 'Coupon deleted.' };
        },

        saveCampaign: (input, existingId) => {
          if (!get().can('campaigns', existingId ? 'edit' : 'create')) return { ok: false, message: 'Permission denied.' };
          if (existingId) {
            let updated: Campaign | undefined;
            set((s) => ({
              campaigns: s.campaigns.map((c) => {
                if (c.id !== existingId) return c;
                updated = { ...c, ...input };
                return updated;
              }),
              activityLogs: [appendLog('CAMPAIGN_UPDATED', 'campaigns', existingId, 'Success', { name: input.name, status: input.status }), ...s.activityLogs],
            }));
            return { ok: true, message: 'Campaign updated.', data: updated };
          }
          const cmp: Campaign = { ...input, id: generateId('CMP') };
          set((s) => ({
            campaigns: [cmp, ...s.campaigns],
            activityLogs: [appendLog('CAMPAIGN_CREATED', 'campaigns', cmp.id, 'Success', { name: cmp.name }), ...s.activityLogs],
          }));
          return { ok: true, message: `Campaign "${cmp.name}" saved.`, data: cmp };
        },

        saveBanner: (input, existingId) => {
          if (!get().can('banners', existingId ? 'edit' : 'create')) return { ok: false, message: 'Permission denied.' };
          if (existingId) {
            let updated: Banner | undefined;
            set((s) => ({
              banners: s.banners.map((b) => {
                if (b.id !== existingId) return b;
                updated = { ...b, ...input };
                return updated;
              }),
              activityLogs: [appendLog('BANNER_UPDATED', 'banners', existingId, 'Success', { heading: input.heading }), ...s.activityLogs],
            }));
            return { ok: true, message: 'Banner updated.', data: updated };
          }
          const bnr: Banner = { ...input, id: generateId('BNR') };
          set((s) => ({
            banners: [bnr, ...s.banners],
            activityLogs: [appendLog('BANNER_CREATED', 'banners', bnr.id, 'Success', { heading: bnr.heading }), ...s.activityLogs],
          }));
          return { ok: true, message: 'Storefront banner published.', data: bnr };
        },

        toggleBanner: (bannerId) => {
          if (!get().can('banners', 'edit')) return { ok: false, message: 'Permission denied.' };
          set((s) => ({
            banners: s.banners.map((b) => (b.id === bannerId ? { ...b, active: !b.active } : b)),
            activityLogs: [appendLog('BANNER_TOGGLED', 'banners', bannerId, 'Success'), ...s.activityLogs],
          }));
          return { ok: true, message: 'Banner visibility updated.' };
        },

        deleteBanner: (bannerId) => {
          if (!get().can('banners', 'delete') && !get().can('banners', 'edit')) {
            return { ok: false, message: 'Permission denied.' };
          }
          set((s) => ({
            banners: s.banners.filter((b) => b.id !== bannerId),
            activityLogs: [appendLog('BANNER_DELETED', 'banners', bannerId, 'Warning'), ...s.activityLogs],
          }));
          return { ok: true, message: 'Promotional banner deleted.' };
        },

        markNotificationRead: (id) =>
          set((s) => ({
            notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
          })),

        markAllNotificationsRead: () =>
          set((s) => ({
            notifications: s.notifications.map((n) => ({ ...n, read: true })),
          })),

        sendSimulatedNotification: ({ category, title, message, channel }) => {
          if (!get().can('notifications', 'create')) return { ok: false, message: 'Permission denied.' };
          const notif: AppNotification = {
            id: generateId('NOT'),
            category,
            title,
            message,
            targetPath: '/notifications',
            channel,
            read: false,
            createdAt: new Date().toISOString(),
          };
          set((s) => ({
            notifications: [notif, ...s.notifications],
            activityLogs: [appendLog('NOTIFICATION_SIMULATED', 'notifications', notif.id, 'Success', { channel }), ...s.activityLogs],
          }));
          return { ok: true, message: `Notification queued in Demo Mode (${channel}).` };
        },

        saveStaff: (input, existingId) => {
          if (!get().can('staff', existingId ? 'edit' : 'create')) {
            return { ok: false, message: 'Permission denied: Admin privileges required.' };
          }
          const dupEmail = get().staff.find((u) => u.email.toLowerCase() === input.email.toLowerCase() && u.id !== existingId);
          if (dupEmail) return { ok: false, message: 'Email already assigned to another staff account.' };
          const now = new Date().toISOString();
          if (existingId) {
            let updated: AdminUser | undefined;
            set((s) => ({
              staff: s.staff.map((u) => {
                if (u.id !== existingId) return u;
                updated = { ...u, ...input };
                return updated;
              }),
              activityLogs: [appendLog('STAFF_UPDATED', 'staff', existingId, 'Success', { roleId: input.roleId }), ...s.activityLogs],
            }));
            return { ok: true, message: `Staff member ${input.name} updated.`, data: updated };
          }
          const member: AdminUser = {
            ...input,
            id: generateId('USR'),
            lastActiveAt: now,
            createdAt: now,
          };
          set((s) => ({
            staff: [member, ...s.staff],
            activityLogs: [appendLog('STAFF_INVITED', 'staff', member.id, 'Success', { email: member.email, roleId: member.roleId }), ...s.activityLogs],
          }));
          return { ok: true, message: `${member.name} added to Healthy Ghar Ops staff.`, data: member };
        },

        toggleStaffStatus: (userId) => {
          if (!get().can('staff', 'edit')) return { ok: false, message: 'Permission denied.' };
          if (get().session?.userId === userId) {
            return { ok: false, message: 'You cannot deactivate your own active session.' };
          }
          const target = get().staff.find((u) => u.id === userId);
          if (!target) return { ok: false, message: 'Staff account not found.' };
          if (target.roleId === 'SUPER_ADMIN' && target.status === 'Active') {
            const activeSuperAdmins = get().staff.filter((u) => u.roleId === 'SUPER_ADMIN' && u.status === 'Active').length;
            if (activeSuperAdmins <= 1) {
              return { ok: false, message: 'Safeguard: Cannot deactivate the last active Super Admin account.' };
            }
          }
          set((s) => ({
            staff: s.staff.map((u) =>
              u.id === userId ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u
            ),
            activityLogs: [appendLog('STAFF_STATUS_TOGGLED', 'staff', userId, 'Warning'), ...s.activityLogs],
          }));
          return { ok: true, message: 'Staff account status updated.' };
        },

        toggleRolePermission: (roleId, module, action) => {
          if (!get().can('roles', 'manage')) {
            return { ok: false, message: 'Permission denied: Only Super Admin can alter RBAC matrix.' };
          }
          if (roleId === 'SUPER_ADMIN' && (module === 'roles' || module === 'staff')) {
            return { ok: false, message: 'Safeguard: Super Admin governance rights cannot be revoked.' };
          }
          set((s) => ({
            roles: s.roles.map((r) => {
              if (r.id !== roleId) return r;
              const current = r.permissions[module] || [];
              const next = current.includes(action)
                ? current.filter((a) => a !== action)
                : [...current, action];
              return { ...r, permissions: { ...r.permissions, [module]: next } };
            }),
            activityLogs: [appendLog('RBAC_MATRIX_UPDATED', 'roles', roleId, 'Warning', { module, action }), ...s.activityLogs],
          }));
          return { ok: true, message: `Updated ${roleId} permission for ${module}:${action}.` };
        },

        updateSettings: (patch) => {
          if (!get().can('settings', 'edit')) return { ok: false, message: 'Permission denied.' };
          set((s) => {
            const nextSettings = { ...s.settings, ...patch };
            let batches = s.batches;
            let stockMovements = s.stockMovements;
            if (nextSettings.autoQuarantineExpiredBatches) {
              const nowMs = Date.now();
              const nowIso = new Date(nowMs).toISOString();
              const user = get().getCurrentUser();
              const newMovs: StockMovement[] = [];
              batches = s.batches.map((b) => {
                if (b.status !== 'Quarantined' && new Date(b.expiryDate).getTime() <= nowMs) {
                  if (b.availableQty > 0) {
                    newMovs.push({
                      id: generateId('MOV'),
                      productId: b.productId,
                      batchId: b.id,
                      warehouseId: b.warehouseId,
                      type: 'ADJUSTMENT_EXPIRED',
                      quantityDelta: -b.availableQty,
                      previousQty: b.availableQty,
                      newQty: 0,
                      reason: 'Auto-Quarantined Expired Batch (Settings Enforcement)',
                      staffId: user?.id || 'SYSTEM',
                      staffName: user?.name || 'System',
                      createdAt: nowIso,
                    });
                  }
                  return {
                    ...b,
                    status: 'Quarantined' as const,
                    damagedQty: b.damagedQty + b.availableQty,
                    availableQty: 0,
                    quarantineReason: b.quarantineReason || 'Auto-quarantined on expiry under Rule 65',
                    rackLocation: 'QUARANTINE-BAY-01',
                  };
                }
                return b;
              });
              if (newMovs.length > 0) {
                stockMovements = [...newMovs, ...s.stockMovements];
              }
            }
            return {
              settings: nextSettings,
              batches,
              inventory: deriveInventoryFromBatches(s.products, batches),
              stockMovements,
              activityLogs: [appendLog('SETTINGS_UPDATED', 'settings', 'GLOBAL', 'Success'), ...s.activityLogs],
            };
          });
          return { ok: true, message: 'Pharmacy configuration & statutory rules saved.' };
        },

        resetDemoData: () => {
          const fresh = buildInitialSeedState();
          set({
            ...fresh,
            activeHubId: 'ALL',
            session: {
              userId: fresh.staff[0].id,
              email: fresh.staff[0].email,
              roleId: fresh.staff[0].roleId,
              loggedInAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 8 * 3600000).toISOString(),
              isDemoMode: true,
              sessionExpired: false,
            },
          });
        },
      };
    },
    {
      name: 'healthy_ghar_ops_store_v1',
      version: 1,
    }
  )
);
