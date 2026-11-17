export type RoleId =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PHARMACIST'
  | 'INVENTORY_MANAGER'
  | 'ORDER_MANAGER'
  | 'FINANCE_MANAGER'
  | 'MARKETING_MANAGER'
  | 'CUSTOMER_SUPPORT'
  | 'ANALYST';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'export'
  | 'manage';

export type PermissionModule =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'brands'
  | 'inventory'
  | 'batches'
  | 'warehouses'
  | 'transfers'
  | 'suppliers'
  | 'purchase_orders'
  | 'orders'
  | 'prescriptions'
  | 'customers'
  | 'payments'
  | 'refunds'
  | 'returns'
  | 'delivery'
  | 'consultations'
  | 'doctors'
  | 'coupons'
  | 'campaigns'
  | 'banners'
  | 'reviews'
  | 'support'
  | 'notifications'
  | 'analytics'
  | 'staff'
  | 'roles'
  | 'activity_logs'
  | 'settings';

export type RolePermissionMatrix = Record<PermissionModule, PermissionAction[]>;

export interface RoleDefinition {
  id: RoleId;
  name: string;
  description: string;
  badgeColor: string;
  permissions: RolePermissionMatrix;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: RoleId;
  title: string;
  hubId: string;
  status: 'Active' | 'Inactive' | 'Suspended';
  registrationNumber?: string; // e.g., KSPC-48219 for Pharmacists
  twoFactorEnabled: boolean;
  lastActiveAt: string;
  createdAt: string;
  avatarUrl?: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  roleId: RoleId;
  loggedInAt: string;
  expiresAt: string;
  isDemoMode: boolean;
  sessionExpired: boolean;
}

export type DrugSchedule = 'OTC' | 'Schedule H' | 'Schedule H1' | 'Schedule X' | 'Medical Device';
export type StorageCondition = 'Room Temp (<25°C)' | 'Cool & Dry (<20°C)' | 'Cold Chain (2-8°C)' | 'Protect from Light';

export interface ProductVariant {
  id: string;
  label: string; // e.g. "Strip of 15 Tablets"
  skuSuffix: string;
  mrp: number;
  sellingPrice: number;
  costPrice: number;
  packSize: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  subcategoryId?: string;
  brandId: string;
  manufacturer: string;
  genericName: string;
  composition: string;
  strength: string;
  dosageForm: string;
  packSize: string;
  mrp: number;
  sellingPrice: number;
  costPrice: number;
  gstRate: 0 | 5 | 12 | 18;
  hsnCode: string;
  images: string[];
  prescriptionRequired: boolean;
  schedule: DrugSchedule;
  storageCondition: StorageCondition;
  isReturnable: boolean;
  dpcoCapped: boolean;
  reorderLevel: number;
  status: 'Active' | 'Draft' | 'Archived';
  ratingAvg: number;
  reviewCount: number;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string;
  icon: string;
  imageUrl?: string;
  displayOrder: number;
  status: 'Active' | 'Archived';
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  manufacturerName: string;
  country: string;
  licenseNumber: string;
  description: string;
  logoUrl?: string;
  featured: boolean;
  status: 'Active' | 'Archived';
  createdAt: string;
}

export interface Warehouse {
  id: string;
  code: string; // BLR-01, BOM-02, HYD-01
  name: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  managerName: string;
  phone: string;
  drugLicenseNo: string;
  gstin: string;
  capacityUnits: number;
  coldChainEnabled: boolean;
  temperatureCelsius: number;
  status: 'Active' | 'Maintenance';
}

export type BatchStatus = 'Active' | 'Expiring Soon' | 'Quarantined' | 'Expired' | 'Depleted';

export interface Batch {
  id: string;
  batchNumber: string;
  productId: string;
  warehouseId: string;
  supplierId: string;
  manufacturer: string;
  mfgDate: string;
  expiryDate: string;
  receivedQty: number;
  availableQty: number;
  reservedQty: number;
  damagedQty: number;
  costPrice: number;
  mrp: number;
  status: BatchStatus;
  rackLocation: string;
  coldChainTemp?: number;
  quarantineReason?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  sku: string;
  warehouseId: string;
  availableQty: number;
  reservedQty: number;
  damagedQty: number;
  reorderLevel: number;
  updatedAt: string;
}

export type StockMovementType =
  | 'GRN_RECEIPT'
  | 'ORDER_RESERVE'
  | 'ORDER_RELEASE'
  | 'ORDER_DEDUCT'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_DAMAGED'
  | 'ADJUSTMENT_EXPIRED'
  | 'ADJUSTMENT_CORRECTION'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'RETURN_RESTOCK';

export interface StockMovement {
  id: string;
  productId: string;
  batchId: string;
  warehouseId: string;
  type: StockMovementType;
  quantityDelta: number;
  previousQty: number;
  newQty: number;
  referenceId?: string;
  reason: string;
  notes?: string;
  staffId: string;
  staffName: string;
  createdAt: string;
}

export type TransferStatus = 'Requested' | 'Approved' | 'In Transit' | 'Received' | 'Cancelled';

export interface StockTransfer {
  id: string;
  transferCode: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  productId: string;
  batchId: string;
  quantity: number;
  status: TransferStatus;
  vehicleInfo?: string;
  coldChainMonitor: boolean;
  currentTemp?: number;
  requestedBy: string;
  approvedBy?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  drugLicenseNo: string;
  city: string;
  address: string;
  paymentTerms: 'Net 15' | 'Net 30' | 'Net 45' | 'Advance';
  suppliedProductIds: string[];
  outstandingBalance: number;
  rating: number;
  status: 'Active' | 'Archived';
  createdAt: string;
}

export type PurchaseOrderStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Partially Received'
  | 'Received'
  | 'Rejected';

export interface PurchaseOrderItem {
  productId: string;
  sku: string;
  productName: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  gstRate: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  warehouseId: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: PurchaseOrderStatus;
  expectedDeliveryDate: string;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceiptItem {
  productId: string;
  sku: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  receivedQty: number;
  damagedQty: number;
  unitCost: number;
  rackLocation: string;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  supplierId: string;
  warehouseId: string;
  invoiceNumber: string;
  items: GoodsReceiptItem[];
  totalReceivedValue: number;
  inspectedBy: string;
  qcPassed: boolean;
  notes?: string;
  receivedAt: string;
}

export interface Address {
  id: string;
  label: 'Home' | 'Office' | 'Other';
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  customerCode: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  city: string;
  groupId: string;
  chronicTags: string[];
  allergies: string[];
  addresses: Address[];
  orderCount: number;
  totalSpent: number;
  lastOrderAt?: string;
  status: 'Active' | 'Blocked';
  registeredAt: string;
}

export interface CustomerGroup {
  id: string;
  name: string;
  description: string;
  discountPercent: number;
  minOrders: number;
  memberCount?: number;
  badgeColor: string;
}

export type OrderStatus =
  | 'Placed'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type PaymentMethod = 'UPI' | 'Card' | 'Net Banking' | 'Wallet' | 'COD';
export type PaymentStatus = 'Paid' | 'Pending' | 'Failed' | 'Refunded' | 'Partially Refunded';
export type PrescriptionOrderStatus = 'Not Required' | 'Pending Review' | 'Approved' | 'Rejected' | 'Clarification Requested';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  hsnCode: string;
  batchId?: string;
  batchNumber?: string;
  batchAllocations?: { batchId: string; batchNumber: string; quantity: number }[];
  quantity: number;
  mrp: number;
  unitPrice: number;
  gstRate: number;
  lineTotal: number;
  prescriptionRequired: boolean;
}

export interface OrderStatusHistory {
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  staffId: string;
  staffName: string;
  reason: string;
  timestamp: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  shippingAddress: Address;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  taxAmount: number;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  prescriptionRequired: boolean;
  prescriptionId?: string;
  prescriptionStatus: PrescriptionOrderStatus;
  inventoryState: 'Reserved' | 'Deducted' | 'Released';
  trackingNumber?: string;
  deliveryPartnerId?: string;
  notes?: string;
  timeline: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export type PrescriptionStatus =
  | 'Uploaded'
  | 'Pending Review'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Clarification Requested';

export interface PrescriptionExtractedDrug {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  matchedProductId?: string;
  schedule: DrugSchedule;
}

export interface PrescriptionReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRegNo: string;
  action: 'Assigned' | 'Approved' | 'Rejected' | 'Clarification Requested';
  notes: string;
  timestamp: string;
}

export interface Prescription {
  id: string;
  rxNumber: string;
  customerId: string;
  orderId?: string;
  doctorName: string;
  doctorRegNo: string;
  clinicName: string;
  prescriptionDate: string;
  documentReference: string;
  isDemoSample: boolean;
  status: PrescriptionStatus;
  urgency: 'Critical' | 'Standard' | 'Refill';
  containsScheduleH1: boolean;
  assignedPharmacistId?: string;
  assignedPharmacistName?: string;
  extractedDrugs: PrescriptionExtractedDrug[];
  reviewHistory: PrescriptionReview[];
  rejectionReason?: string;
  clarificationRequest?: string;
  uploadedAt: string;
  reviewedAt?: string;
}

export interface Payment {
  id: string;
  transactionId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  method: PaymentMethod;
  gateway: 'Razorpay' | 'PayU' | 'Cashfree' | 'COD Settlement';
  gatewayReference: string;
  amount: number;
  refundedAmount: number;
  status: 'Captured' | 'Authorized' | 'Pending' | 'Failed' | 'Refunded' | 'Partially Refunded';
  isSimulated: boolean;
  payloadJson: Record<string, unknown>;
  createdAt: string;
}

export interface Refund {
  id: string;
  refundCode: string;
  paymentId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  reason: string;
  status: 'Pending Approval' | 'Approved' | 'Processed (Simulated)' | 'Rejected';
  gatewayRefundRef?: string;
  isSimulated: boolean;
  requestedBy: string;
  processedBy?: string;
  createdAt: string;
  processedAt?: string;
}

export interface ReturnRequest {
  id: string;
  returnCode: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  quantity: number;
  refundEligibleAmount: number;
  reason: string;
  evidenceNote: string;
  eligibilityCheck: 'Eligible' | 'Non-Returnable (Cold Chain / Schedule H)' | 'Expired Return Window';
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Form 46 Destroyed' | 'Restocked';
  linkedRefundId?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  requestedAt: string;
  updatedAt: string;
}

export interface DeliveryPartner {
  id: string;
  name: string;
  code: string;
  serviceType: 'Air Cold-Chain' | 'Hyperlocal Express' | 'Surface Pan-India' | 'Internal EV';
  onTimeSlaPercent: number;
  avgDeliveryHours: number;
  activeShipments: number;
  coldChainCapable: boolean;
  status: 'Active' | 'Degraded';
}

export type ShipmentStatus =
  | 'Label Created'
  | 'Picked Up'
  | 'In Transit'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Failed Attempt';

export interface Shipment {
  id: string;
  shipmentCode: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  destinationCity: string;
  pincode: string;
  zone: 'Zone A (Metro)' | 'Zone B (Tier-2)' | 'Zone C (Remote)';
  partnerId: string;
  partnerName: string;
  awbNumber: string;
  deliveryFee: number;
  coldChainRequired: boolean;
  currentTempCelsius?: number;
  status: ShipmentStatus;
  expectedDeliveryDate: string;
  isSimulated: boolean;
  timeline: { status: string; location: string; timestamp: string }[];
  createdAt: string;
}

export interface Doctor {
  id: string;
  name: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  nmcRegNo: string;
  languages: string[];
  consultationFee: number;
  availabilitySlots: string[];
  hubAffiliation: string;
  status: 'Available' | 'In Consultation' | 'Off Duty' | 'Credential Pending';
  rating: number;
  consultationsCount: number;
  avatarUrl?: string;
}

export type ConsultationStatus =
  | 'Requested'
  | 'Scheduled'
  | 'Confirmed'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export interface Consultation {
  id: string;
  consultationCode: string;
  customerId: string;
  customerName: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  scheduledAt: string;
  mode: 'Video' | 'Audio' | 'Chat';
  chiefComplaint: string;
  fee: number;
  paymentStatus: 'Paid' | 'Pending' | 'Refunded';
  status: ConsultationStatus;
  linkedRxId?: string;
  clinicalNotes?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  title: string;
  discountType: 'Percentage' | 'Fixed';
  discountValue: number;
  maxDiscountAmount: number;
  minOrderAmount: number;
  usageLimit: number;
  usedCount: number;
  perCustomerLimit: number;
  excludeDpcoScheduled: boolean;
  categoryIds: string[];
  startDate: string;
  expiryDate: string;
  active: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  channel: 'In-App & Web' | 'WhatsApp (Simulated)' | 'Email (Simulated)' | 'Push (Simulated)';
  targetGroup: string;
  startDate: string;
  endDate: string;
  budget: number;
  attributedRevenue: number;
  conversions: number;
  status: 'Active' | 'Scheduled' | 'Paused' | 'Completed';
}

export interface Banner {
  id: string;
  heading: string;
  subtitle: string;
  ctaText: string;
  destinationUrl: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  placement: 'Hero Top' | 'Mid Chronic Strip' | 'Cart Upsell';
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface ProductReview {
  id: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  rating: number;
  title: string;
  comment: string;
  status: 'Pending' | 'Approved' | 'Hidden' | 'Rejected' | 'Flagged (DMR Act)';
  moderationNote?: string;
  createdAt: string;
}

export type TicketStatus = 'Open' | 'In Progress' | 'Waiting for Customer' | 'Resolved' | 'Closed';

export interface SupportMessage {
  id: string;
  senderType: 'Customer' | 'Staff' | 'Internal Note';
  senderName: string;
  body: string;
  isSimulatedDelivery?: boolean;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  ticketCode: string;
  customerId: string;
  customerName: string;
  relatedOrderNumber?: string;
  category: 'Order Delay' | 'Prescription Clarification' | 'Refund / Payment' | 'Damaged Medicine' | 'Account';
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  subject: string;
  status: TicketStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  category: 'Order' | 'Payment' | 'Prescription' | 'Delivery' | 'Inventory' | 'System';
  title: string;
  message: string;
  targetPath: string;
  channel: 'In-App' | 'Email (Simulated)' | 'SMS (Simulated)' | 'Push (Simulated)';
  read: boolean;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  category: string;
  channel: 'Email' | 'SMS' | 'Push';
  subject: string;
  body: string;
  active: boolean;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: RoleId;
  action: string;
  module: PermissionModule;
  recordId: string;
  result: 'Success' | 'Blocked' | 'Warning';
  metadata: Record<string, unknown>;
  ipAddress: string;
  timestamp: string;
}

export interface BusinessSettings {
  pharmacyName: string;
  legalEntityName: string;
  gstin: string;
  drugLicenseNumber20B: string;
  drugLicenseNumber21B: string;
  supportEmail: string;
  supportPhone: string;
  registeredAddress: string;
  currency: 'INR';
  defaultGstSlab: 5 | 12 | 18;
  freeDeliveryThreshold: number;
  standardShippingFee: number;
  coldChainSurcharge: number;
  requirePharmacistDualSignOffScheduleH1: boolean;
  autoQuarantineExpiredBatches: boolean;
  blockOrderDispatchWithoutRxApproval: boolean;
  returnWindowDays: number;
  allowReturnForColdChain: boolean;
  sessionTimeoutMinutes: number;
  integrations: {
    paymentGatewayMode: 'Demo Simulated' | 'Unconfigured' | 'Connected';
    smsProviderMode: 'Demo Simulated' | 'Unconfigured';
    emailProviderMode: 'Demo Simulated' | 'Unconfigured';
    courierWebhookMode: 'Demo Simulated' | 'Unconfigured';
    abdmHealthIdSync: 'Demo Simulated' | 'Unconfigured';
  };
}
