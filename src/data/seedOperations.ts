import {
  ActivityLog,
  AppNotification,
  Banner,
  Campaign,
  Consultation,
  Coupon,
  Customer,
  Doctor,
  GoodsReceipt,
  NotificationTemplate,
  Order,
  OrderStatus,
  Payment,
  PaymentMethod,
  Prescription,
  Product,
  ProductReview,
  PurchaseOrder,
  Refund,
  ReturnRequest,
  Shipment,
  StockMovement,
  StockTransfer,
  Supplier,
  SupportTicket,
} from '../types';
import {
  SEED_BATCHES,
  SEED_DELIVERY_PARTNERS,
  SEED_PRODUCTS,
  SEED_SETTINGS,
  SEED_STAFF,
  SEED_WAREHOUSES,
} from './seedCatalog';
import { computePincodeZone } from '../utils/calculations';

const daysAgoIso = (days: number, hoursOffset = 0) =>
  new Date(Date.now() - days * 86400000 - hoursOffset * 3600000).toISOString();
const daysFromNowIso = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString();

const CITIES: { city: string; state: string; pincode: string; wh: string }[] = [
  { city: 'Bengaluru', state: 'Karnataka', pincode: '560038', wh: 'WH-BLR-01' },
  { city: 'Mangaluru', state: 'Karnataka', pincode: '575001', wh: 'WH-BLR-01' },
  { city: 'Mumbai', state: 'Maharashtra', pincode: '400050', wh: 'WH-BOM-02' },
  { city: 'Pune', state: 'Maharashtra', pincode: '411004', wh: 'WH-BOM-02' },
  { city: 'Chennai', state: 'Tamil Nadu', pincode: '600017', wh: 'WH-BLR-01' },
  { city: 'Hyderabad', state: 'Telangana', pincode: '500034', wh: 'WH-HYD-01' },
  { city: 'Kochi', state: 'Kerala', pincode: '682016', wh: 'WH-BLR-01' },
];

const CUSTOMER_NAMES = [
  'Aarav Kulkarni', 'Priyanka Nair', 'Siddharth Rao', 'Kavitha Murthy', 'Rajeshwari Iyer',
  'Vikramaditya Joshi', 'Nandini Menon', 'Harsha Vardhan', 'Deepika Shetty', 'Pranav Deshmukh',
  'Meenakshi Sundaram', 'Raghavendra Bhat', 'Shreya Banerjee', 'Kiran Hegde', 'Sandeep Reddy',
  'Anjali Gopalan', 'Manoj Tiwari', 'Swathi Kamath', 'Nikhil Agarwal', 'Lakshmi Narayanan',
  'Varun Krishnan', 'Pooja Patwardhan', 'Gaurav Malhotra', 'Bhavana Pai', 'Tarun Chatterjee',
  'Shalini Venkataraman', 'Abhishek Deshpande', 'Divya Shenoy', 'Saurabh Kapoor', 'Rekha Krishnan',
  'Vivek Subramanian', 'Padma Suryanarayana',
];

export const SEED_CUSTOMERS: Customer[] = CUSTOMER_NAMES.map((name, idx) => {
  const loc = CITIES[idx % CITIES.length];
  const slug = name.toLowerCase().replace(/[^a-z]+/g, '.');
  const groupId = idx % 4 === 0 ? 'GRP-01' : idx % 5 === 1 ? 'GRP-02' : idx % 6 === 2 ? 'GRP-03' : 'GRP-04';
  return {
    id: `CUS-${String(idx + 1).padStart(3, '0')}`,
    customerCode: `MC-PAT-${4801 + idx}`,
    name,
    email: `${slug}@example.in`,
    phone: `+91 98${String(45000000 + idx * 123456).slice(0, 8)}`,
    age: 26 + ((idx * 3) % 48),
    gender: idx % 2 === 0 ? 'Male' : 'Female',
    city: loc.city,
    groupId,
    chronicTags:
      idx % 3 === 0
        ? ['Type-2 Diabetes', 'Hypertension']
        : idx % 3 === 1
        ? ['Dyslipidemia']
        : ['General Wellness'],
    allergies: idx % 5 === 0 ? ['Penicillin'] : idx % 7 === 0 ? ['Sulfa Drugs'] : ['None Reported'],
    addresses: [
      {
        id: `ADR-${idx + 1}-1`,
        label: 'Home',
        recipientName: name,
        phone: `+91 98${String(45000000 + idx * 123456).slice(0, 8)}`,
        line1: `${12 + idx}, ${idx % 2 === 0 ? '12th Main Road, Indiranagar' : 'MG Road Cross, Sector 4'}`,
        line2: `Near ${loc.city} Metro Station`,
        city: loc.city,
        state: loc.state,
        pincode: loc.pincode,
        isDefault: true,
      },
    ],
    orderCount: 1 + (idx % 6),
    totalSpent: 1200 + idx * 450,
    lastOrderAt: daysAgoIso(idx % 15),
    status: idx === 29 ? 'Blocked' : 'Active',
    registeredAt: daysAgoIso(60 + idx * 5),
  };
});

const SUPPLIER_NAMES = [
  'Sri Sai Pharma Distributors', 'Kaveri MedTech Wholesale', 'Deccan Healthcare Logistics',
  'Sahyadri Cold-Chain Agencies', 'Namma Bengaluru Drug House', 'Apex Ethical Formulations',
  'Western Ghats Pharma Trade', 'Telangana Lifesciences Corp', 'Malabar Clinical Supplies',
  'Mahalaxmi Medical Agency', 'Vardhman Generic Depot', 'Surya Surgical & Diagnostics',
  'Coromandel Pharma Syndicate', 'Indus Biologics Cold Depot', 'Krupa Formulations Pvt Ltd',
];

export const SEED_SUPPLIERS: Supplier[] = SUPPLIER_NAMES.map((name, idx) => {
  const loc = CITIES[idx % CITIES.length];
  return {
    id: `SUP-${String(idx + 1).padStart(3, '0')}`,
    name,
    contactPerson: ['Ramesh Gowda', 'Anil Kulkarni', 'Satish Reddy', 'Mahesh Pillai', 'Girish Kamat'][idx % 5],
    email: `procurement@${name.toLowerCase().replace(/[^a-z]+/g, '')}.in`,
    phone: `+91 97${String(31000000 + idx * 234567).slice(0, 8)}`,
    gstin: `29AA${String.fromCharCode(65 + idx)}CM${1000 + idx}F1Z${(idx % 9) + 1}`,
    drugLicenseNo: `${loc.state.slice(0, 2).toUpperCase()}-20B/${30100 + idx * 17}`,
    city: loc.city,
    address: `Wholesale Pharma Plaza, Unit ${idx + 10}, ${loc.city}`,
    paymentTerms: idx % 3 === 0 ? 'Net 30' : idx % 3 === 1 ? 'Net 15' : 'Net 45',
    suppliedProductIds: SEED_PRODUCTS.filter((_, pIdx) => pIdx % 15 === idx).map((p) => p.id),
    outstandingBalance: idx % 2 === 0 ? 45000 + idx * 7500 : 12000 + idx * 3200,
    rating: Number((4.2 + (idx % 7) * 0.1).toFixed(1)),
    status: 'Active',
    createdAt: daysAgoIso(240 - idx * 5),
  };
});

export const SEED_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-001',
    poNumber: 'PO-MC-2026-0841',
    supplierId: 'SUP-001',
    warehouseId: 'WH-BLR-01',
    items: [
      { productId: 'PRD-001', sku: 'MED-DOLO-650', productName: 'Dolo 650mg Tablet', orderedQty: 1200, receivedQty: 1200, unitCost: 19, gstRate: 12 },
      { productId: 'PRD-004', sku: 'MED-PAND-40', productName: 'Pan-D Capsule PR', orderedQty: 500, receivedQty: 500, unitCost: 122, gstRate: 12 },
    ],
    subtotal: 83800,
    taxAmount: 10056,
    totalAmount: 93856,
    status: 'Received',
    expectedDeliveryDate: daysAgoIso(4),
    notes: 'Fast-moving Diwali seasonal replenishment',
    createdBy: 'USR-005',
    approvedBy: 'USR-001',
    createdAt: daysAgoIso(10),
    updatedAt: daysAgoIso(4),
  },
  {
    id: 'PO-002',
    poNumber: 'PO-MC-2026-0842',
    supplierId: 'SUP-004',
    warehouseId: 'WH-BOM-02',
    items: [
      { productId: 'PRD-010', sku: 'MED-LANT-PEN', productName: 'Lantus SoloStar 100 IU/ml Pen', orderedQty: 120, receivedQty: 0, unitCost: 510, gstRate: 5 },
      { productId: 'PRD-030', sku: 'MED-MIXT-30', productName: 'Human Mixtard 30/70 Penfill 3ml', orderedQty: 60, receivedQty: 0, unitCost: 1020, gstRate: 5 },
    ],
    subtotal: 122400,
    taxAmount: 6120,
    totalAmount: 128520,
    status: 'Approved',
    expectedDeliveryDate: daysFromNowIso(2),
    notes: 'Reefer van 2-8°C validated logger mandatory at receiving dock',
    createdBy: 'USR-005',
    approvedBy: 'USR-007',
    createdAt: daysAgoIso(3),
    updatedAt: daysAgoIso(2),
  },
  {
    id: 'PO-003',
    poNumber: 'PO-MC-2026-0843',
    supplierId: 'SUP-003',
    warehouseId: 'WH-HYD-01',
    items: [
      { productId: 'PRD-003', sku: 'MED-GLYC-GP2', productName: 'Glycomet GP 2 Tablet SR', orderedQty: 400, receivedQty: 0, unitCost: 134, gstRate: 12 },
      { productId: 'PRD-008', sku: 'MED-ATOR-20', productName: 'Atorva 20mg Tablet', orderedQty: 300, receivedQty: 0, unitCost: 152, gstRate: 12 },
    ],
    subtotal: 99200,
    taxAmount: 11904,
    totalAmount: 111104,
    status: 'Pending Approval',
    expectedDeliveryDate: daysFromNowIso(5),
    notes: 'Auto-triggered by reorder threshold monitor',
    createdBy: 'USR-005',
    createdAt: daysAgoIso(1),
    updatedAt: daysAgoIso(1),
  },
  {
    id: 'PO-004',
    poNumber: 'PO-MC-2026-0844',
    supplierId: 'SUP-012',
    warehouseId: 'WH-BLR-01',
    items: [
      { productId: 'PRD-015', sku: 'DEV-ACCU-50S', productName: 'Accu-Chek Active Test Strips (50s)', orderedQty: 180, receivedQty: 100, unitCost: 680, gstRate: 12 },
      { productId: 'PRD-016', sku: 'DEV-OMRN-7120', productName: 'Omron HEM-7120 Automatic BP Monitor', orderedQty: 40, receivedQty: 40, unitCost: 1650, gstRate: 18 },
    ],
    subtotal: 188400,
    taxAmount: 26568,
    totalAmount: 214968,
    status: 'Partially Received',
    expectedDeliveryDate: daysFromNowIso(1),
    notes: '80 boxes of Accu-Chek strips backordered to batch 2',
    createdBy: 'USR-005',
    approvedBy: 'USR-001',
    createdAt: daysAgoIso(6),
    updatedAt: daysAgoIso(1),
  },
];

export const SEED_GOODS_RECEIPTS: GoodsReceipt[] = [
  {
    id: 'GRN-001',
    grnNumber: 'GRN-BLR-2026-0311',
    purchaseOrderId: 'PO-001',
    supplierId: 'SUP-001',
    warehouseId: 'WH-BLR-01',
    invoiceNumber: 'INV/SAI/26-27/9921',
    items: [
      { productId: 'PRD-001', sku: 'MED-DOLO-650', batchNumber: 'MC26-DOLO-991', mfgDate: daysAgoIso(45), expiryDate: daysFromNowIso(650), receivedQty: 1200, damagedQty: 0, unitCost: 19, rackLocation: 'BLR-R1-B1' },
      { productId: 'PRD-004', sku: 'MED-PAND-40', batchNumber: 'MC26-PAND-402', mfgDate: daysAgoIso(30), expiryDate: daysFromNowIso(540), receivedQty: 500, damagedQty: 0, unitCost: 122, rackLocation: 'BLR-R2-B3' },
    ],
    totalReceivedValue: 83800,
    inspectedBy: 'Karthik Rao',
    qcPassed: true,
    notes: 'Seal intact, batch COA verified against CDSCO portal',
    receivedAt: daysAgoIso(4),
  },
  {
    id: 'GRN-002',
    grnNumber: 'GRN-BLR-2026-0312',
    purchaseOrderId: 'PO-004',
    supplierId: 'SUP-012',
    warehouseId: 'WH-BLR-01',
    invoiceNumber: 'INV/SUR/26-27/4418',
    items: [
      { productId: 'PRD-015', sku: 'DEV-ACCU-50S', batchNumber: 'MC26-ACCU-104', mfgDate: daysAgoIso(60), expiryDate: daysFromNowIso(420), receivedQty: 100, damagedQty: 0, unitCost: 680, rackLocation: 'BLR-DEV-A2' },
      { productId: 'PRD-016', sku: 'DEV-OMRN-7120', batchNumber: 'MC26-OMRN-209', mfgDate: daysAgoIso(90), expiryDate: daysFromNowIso(1200), receivedQty: 40, damagedQty: 0, unitCost: 1650, rackLocation: 'BLR-DEV-A4' },
    ],
    totalReceivedValue: 134000,
    inspectedBy: 'Karthik Rao',
    qcPassed: true,
    notes: 'Partial receipt; 80 test strip boxes pending second dispatch',
    receivedAt: daysAgoIso(1),
  },
];

export const SEED_TRANSFERS: StockTransfer[] = [
  {
    id: 'TRF-001',
    transferCode: 'TRF-BLR-BOM-104',
    sourceWarehouseId: 'WH-BLR-01',
    destinationWarehouseId: 'WH-BOM-02',
    productId: 'PRD-001',
    batchId: 'BAT-001',
    quantity: 300,
    status: 'In Transit',
    vehicleInfo: 'KA-01-MC-4421 (Reefer Express)',
    coldChainMonitor: false,
    requestedBy: 'Karthik Rao',
    approvedBy: 'Dr. Priya Sharma',
    notes: 'Balancing Mumbai monsoon demand spike',
    createdAt: daysAgoIso(1),
    updatedAt: daysAgoIso(0, 6),
  },
  {
    id: 'TRF-002',
    transferCode: 'TRF-BOM-HYD-105',
    sourceWarehouseId: 'WH-BOM-02',
    destinationWarehouseId: 'WH-HYD-01',
    productId: 'PRD-010',
    batchId: 'BAT-019',
    quantity: 25,
    status: 'Approved',
    vehicleInfo: 'MH-04-CC-8820 (2-8°C Cold Van)',
    coldChainMonitor: true,
    currentTemp: 4.1,
    requestedBy: 'Vamsi Krishna',
    approvedBy: 'Dr. Priya Sharma',
    notes: 'Critical insulin buffer for Hyderabad hub',
    createdAt: daysAgoIso(0, 12),
    updatedAt: daysAgoIso(0, 4),
  },
  {
    id: 'TRF-003',
    transferCode: 'TRF-HYD-BLR-102',
    sourceWarehouseId: 'WH-HYD-01',
    destinationWarehouseId: 'WH-BLR-01',
    productId: 'PRD-003',
    batchId: 'BAT-005',
    quantity: 150,
    status: 'Received',
    vehicleInfo: 'TS-09-MC-1102',
    coldChainMonitor: false,
    requestedBy: 'Karthik Rao',
    approvedBy: 'Arvind Menon',
    notes: 'Completed inter-hub consolidation',
    createdAt: daysAgoIso(5),
    updatedAt: daysAgoIso(3),
  },
];

export const SEED_STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'MOV-001', productId: 'PRD-001', batchId: 'BAT-001', warehouseId: 'WH-BLR-01', type: 'GRN_RECEIPT', quantityDelta: 1200, previousQty: 3000, newQty: 4200, referenceId: 'GRN-BLR-2026-0311', reason: 'PO-MC-2026-0841 Dock Receipt', staffId: 'USR-005', staffName: 'Karthik Rao', createdAt: daysAgoIso(4) },
  { id: 'MOV-002', productId: 'PRD-004', batchId: 'BAT-007', warehouseId: 'WH-BLR-01', type: 'ORDER_DEDUCT', quantityDelta: -45, previousQty: 335, newQty: 290, referenceId: 'MED-2026-1042', reason: 'Fulfilled Customer Dispatch', staffId: 'USR-006', staffName: 'Neha Verma', createdAt: daysAgoIso(2) },
  { id: 'MOV-003', productId: 'PRD-006', batchId: 'BAT-012', warehouseId: 'WH-HYD-01', type: 'ADJUSTMENT_EXPIRED', quantityDelta: -35, previousQty: 35, newQty: 0, referenceId: 'QUAR-2026-011', reason: 'Rule 65 Expiry Quarantine', notes: 'Moved to Quarantine Bay 01 for Form 46', staffId: 'USR-005', staffName: 'Karthik Rao', createdAt: daysAgoIso(1) },
];

// Build 54 synchronized Orders over the past 30 days + 22 Prescriptions + Payments + Shipments
const ORDER_STATUSES: OrderStatus[] = [
  'Delivered', 'Delivered', 'Delivered', 'Delivered',
  'Out for Delivery', 'Shipped', 'Packed', 'Processing', 'Confirmed', 'Placed', 'Cancelled',
];
const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'UPI', 'Card', 'Net Banking', 'Wallet', 'COD'];

let rxCounter = 0;

export const SEED_ORDERS: Order[] = Array.from({ length: 54 }, (_, idx) => {
  const customer = SEED_CUSTOMERS[idx % SEED_CUSTOMERS.length];
  const loc = CITIES[idx % CITIES.length];
  const p1 = SEED_PRODUCTS[(idx * 3) % SEED_PRODUCTS.length];
  const p2 = SEED_PRODUCTS[(idx * 5 + 1) % SEED_PRODUCTS.length];
  const qty1 = 1 + (idx % 4);
  const qty2 = 1 + ((idx + 1) % 3);
  const b1 =
    SEED_BATCHES.find((b) => b.productId === p1.id && b.warehouseId === loc.wh && b.status !== 'Quarantined') ||
    SEED_BATCHES.find((b) => b.productId === p1.id && b.status !== 'Quarantined') ||
    SEED_BATCHES[0];
  const b2 =
    SEED_BATCHES.find((b) => b.productId === p2.id && b.warehouseId === loc.wh && b.status !== 'Quarantined') ||
    SEED_BATCHES.find((b) => b.productId === p2.id && b.status !== 'Quarantined') ||
    SEED_BATCHES[1];

  const items = [
    {
      id: `OI-${idx}-1`,
      productId: p1.id,
      productName: p1.name,
      sku: p1.sku,
      hsnCode: p1.hsnCode,
      batchId: b1.id,
      batchNumber: b1.batchNumber,
      batchAllocations: [{ batchId: b1.id, batchNumber: b1.batchNumber, quantity: qty1 }],
      quantity: qty1,
      mrp: p1.mrp,
      unitPrice: p1.sellingPrice,
      gstRate: p1.gstRate,
      lineTotal: p1.sellingPrice * qty1,
      prescriptionRequired: p1.prescriptionRequired,
    },
    ...(idx % 2 === 0 && p2.id !== p1.id
      ? [
          {
            id: `OI-${idx}-2`,
            productId: p2.id,
            productName: p2.name,
            sku: p2.sku,
            hsnCode: p2.hsnCode,
            batchId: b2.id,
            batchNumber: b2.batchNumber,
            batchAllocations: [{ batchId: b2.id, batchNumber: b2.batchNumber, quantity: qty2 }],
            quantity: qty2,
            mrp: p2.mrp,
            unitPrice: p2.sellingPrice,
            gstRate: p2.gstRate,
            lineTotal: p2.sellingPrice * qty2,
            prescriptionRequired: p2.prescriptionRequired,
          },
        ]
      : []),
  ];

  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
  const discountAmount = idx % 4 === 0 && subtotal >= 499 ? Math.min(250, Math.round(subtotal * 0.1)) : 0;
  const taxAmount = Math.round(
    items.reduce((s, it) => s + (it.lineTotal * it.gstRate) / (100 + it.gstRate), 0)
  );
  const hasColdChain = items.some((it) => {
    const prod = SEED_PRODUCTS.find((p) => p.id === it.productId);
    return prod?.storageCondition === 'Cold Chain (2-8°C)';
  });
  const baseShip = subtotal >= SEED_SETTINGS.freeDeliveryThreshold ? 0 : SEED_SETTINGS.standardShippingFee;
  const shippingFee = baseShip + (hasColdChain ? SEED_SETTINGS.coldChainSurcharge : 0);
  const totalAmount = Math.max(0, subtotal - discountAmount + shippingFee);

  const rawStatus = ORDER_STATUSES[idx % ORDER_STATUSES.length];
  const rxRequired = items.some((it) => it.prescriptionRequired);
  const rxId = rxRequired ? `RX-${String(++rxCounter).padStart(3, '0')}` : undefined;
  const rxStatus: Order['prescriptionStatus'] = !rxRequired
    ? 'Not Required'
    : rawStatus === 'Placed' || rawStatus === 'Confirmed'
    ? idx % 7 === 0
      ? 'Clarification Requested'
      : 'Pending Review'
    : rawStatus === 'Cancelled' && idx % 11 === 0
    ? 'Rejected'
    : 'Approved';

  const method = PAYMENT_METHODS[idx % PAYMENT_METHODS.length];
  const paymentStatus: Order['paymentStatus'] =
    rawStatus === 'Cancelled'
      ? method === 'COD'
        ? 'Failed'
        : 'Refunded'
      : method === 'COD' && rawStatus !== 'Delivered'
      ? 'Pending'
      : 'Paid';

  const daysBack = Math.floor((idx * 29) / 54);
  const createdAt = daysAgoIso(daysBack, idx % 12);
  const eligiblePartners = hasColdChain
    ? SEED_DELIVERY_PARTNERS.filter((p) => p.coldChainCapable)
    : SEED_DELIVERY_PARTNERS;
  const partner = eligiblePartners[idx % eligiblePartners.length];

  return {
    id: `ORD-${String(idx + 1).padStart(3, '0')}`,
    orderNumber: `MED-2026-${1001 + idx}`,
    customerId: customer.id,
    warehouseId: loc.wh,
    shippingAddress: customer.addresses[0],
    items,
    subtotal,
    discountAmount,
    couponCode: discountAmount > 0 ? 'CARE10' : undefined,
    taxAmount,
    shippingFee,
    totalAmount,
    paymentMethod: method,
    paymentStatus,
    status: rawStatus,
    prescriptionRequired: rxRequired,
    prescriptionId: rxId,
    prescriptionStatus: rxStatus,
    inventoryState:
      rawStatus === 'Cancelled'
        ? 'Released'
        : rawStatus === 'Shipped' || rawStatus === 'Out for Delivery' || rawStatus === 'Delivered'
        ? 'Deducted'
        : 'Reserved',
    trackingNumber:
      rawStatus === 'Shipped' || rawStatus === 'Out for Delivery' || rawStatus === 'Delivered'
        ? `AWB-${partner.code.slice(0, 3)}-${884010 + idx}`
        : undefined,
    deliveryPartnerId: partner.id,
    timeline: [
      {
        previousStatus: null,
        newStatus: 'Placed',
        staffId: 'SYSTEM',
        staffName: 'Storefront Checkout',
        reason: 'Customer placed order',
        timestamp: createdAt,
      },
      ...(rawStatus !== 'Placed'
        ? [
            {
              previousStatus: 'Placed' as OrderStatus,
              newStatus: rawStatus,
              staffId: 'USR-006',
              staffName: 'Neha Verma',
              reason: `Progressed to ${rawStatus}`,
              timestamp: daysAgoIso(Math.max(0, daysBack - 1), idx % 6),
            },
          ]
        : []),
    ],
    createdAt,
    updatedAt: daysAgoIso(Math.max(0, daysBack - 1)),
  };
});

const CLINICS = [
  'Manipal Hospital Specialty Clinic, Bengaluru',
  'Apollo TeleHealth Centre, Hyderabad',
  'Kokilaben Dhirubhai Ambani OPD, Mumbai',
  'Aster Medcity Outpatient Desk, Kochi',
  'MIOT Cardiac Care Clinic, Chennai',
];

const DOCTORS_LIST = [
  { name: 'Dr. Venkatesh Murthy', reg: 'KMC-61204' },
  { name: 'Dr. Kavita Sundaram', reg: 'TCMC-44918' },
  { name: 'Dr. Siddharth Deshpande', reg: 'MMC-2014-8821' },
  { name: 'Dr. Anitha Rajagopal', reg: 'TSMC-52109' },
];

export const SEED_PRESCRIPTIONS: Prescription[] = SEED_ORDERS.filter((o) => o.prescriptionRequired && o.prescriptionId).map((linkedOrder, idx) => {
  const customer = SEED_CUSTOMERS.find((c) => c.id === linkedOrder.customerId) || SEED_CUSTOMERS[idx % SEED_CUSTOMERS.length];
  const doc = DOCTORS_LIST[idx % DOCTORS_LIST.length];
  const rxProducts = linkedOrder.items
    .map((it) => SEED_PRODUCTS.find((p) => p.id === it.productId))
    .filter((p): p is Product => Boolean(p && p.prescriptionRequired));
  const fallbackProd = SEED_PRODUCTS[2 + (idx % 8)];
  const drugs = (rxProducts.length > 0 ? rxProducts : [fallbackProd]).map((p) => ({
    name: p.name,
    dosage: p.strength,
    frequency: idx % 2 === 0 ? '1-0-1 After Food' : '0-0-1 Bedtime',
    duration: '30 Days',
    matchedProductId: p.id,
    schedule: p.schedule,
  }));

  const status: Prescription['status'] =
    linkedOrder.prescriptionStatus === 'Approved'
      ? 'Approved'
      : linkedOrder.prescriptionStatus === 'Rejected'
      ? 'Rejected'
      : linkedOrder.prescriptionStatus === 'Clarification Requested'
      ? 'Clarification Requested'
      : idx % 3 === 0
      ? 'Under Review'
      : 'Pending Review';

  const pharmacist = idx % 2 === 0 ? SEED_STAFF[2] : SEED_STAFF[3];
  const containsH1 = drugs.some((d) => d.schedule === 'Schedule H1' || d.schedule === 'Schedule X');

  return {
    id: linkedOrder.prescriptionId as string,
    rxNumber: `RX-MC-${202600 + idx + 1}`,
    customerId: customer.id,
    orderId: linkedOrder.id,
    doctorName: doc.name,
    doctorRegNo: doc.reg,
    clinicName: CLINICS[idx % CLINICS.length],
    prescriptionDate: daysAgoIso((idx % 12) + 1),
    documentReference: `DEMO-SAMPLE-RX-${String(idx + 1).padStart(3, '0')}.svg`,
    isDemoSample: true,
    status,
    urgency: containsH1 ? 'Critical' : idx % 3 === 0 ? 'Refill' : 'Standard',
    containsScheduleH1: containsH1,
    assignedPharmacistId: status === 'Pending Review' && idx % 2 === 0 ? undefined : pharmacist.id,
    assignedPharmacistName: status === 'Pending Review' && idx % 2 === 0 ? undefined : pharmacist.name,
    extractedDrugs: drugs,
    reviewHistory:
      status === 'Approved' || status === 'Rejected' || status === 'Clarification Requested'
        ? [
            {
              id: `REVH-${idx}`,
              reviewerId: pharmacist.id,
              reviewerName: pharmacist.name,
              reviewerRegNo: pharmacist.registrationNumber || 'KSPC-51904',
              action: status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Clarification Requested',
              notes:
                status === 'Approved'
                  ? 'RMP registration verified, dosage & duration validated against Rule 65.'
                  : status === 'Rejected'
                  ? 'Prescription older than 6 months for Schedule H1 antibiotic.'
                  : 'Doctor signature stamp partially cropped; patient callback requested.',
              timestamp: daysAgoIso(idx % 5),
            },
          ]
        : [],
    rejectionReason: status === 'Rejected' ? 'Expired prescription date (>6 months for Schedule H1).' : undefined,
    clarificationRequest: status === 'Clarification Requested' ? 'Please re-upload full page showing RMP seal & date.' : undefined,
    uploadedAt: linkedOrder.createdAt,
    reviewedAt: status === 'Approved' || status === 'Rejected' ? daysAgoIso(idx % 4) : undefined,
  };
});

export const SEED_PAYMENTS: Payment[] = SEED_ORDERS.map((ord, idx) => {
  const cust = SEED_CUSTOMERS.find((c) => c.id === ord.customerId);
  const gateway: Payment['gateway'] =
    ord.paymentMethod === 'COD'
      ? 'COD Settlement'
      : idx % 3 === 0
      ? 'Razorpay'
      : idx % 3 === 1
      ? 'Cashfree'
      : 'PayU';
  const status: Payment['status'] =
    ord.paymentStatus === 'Refunded'
      ? 'Refunded'
      : ord.paymentStatus === 'Paid'
      ? 'Captured'
      : ord.paymentStatus === 'Failed'
      ? 'Failed'
      : 'Pending';

  return {
    id: `PAY-${String(idx + 1).padStart(3, '0')}`,
    transactionId: `TXN-${gateway.slice(0, 3).toUpperCase()}-${910040 + idx}`,
    orderId: ord.id,
    orderNumber: ord.orderNumber,
    customerId: ord.customerId,
    customerName: cust?.name || 'Patient',
    method: ord.paymentMethod,
    gateway,
    gatewayReference: `pg_sim_${(1040200 + idx).toString(36)}`,
    amount: ord.totalAmount,
    refundedAmount: status === 'Refunded' ? ord.totalAmount : 0,
    status,
    isSimulated: true,
    payloadJson: {
      event: `payment.${status.toLowerCase()}`,
      mode: 'DEMO_SIMULATED',
      gateway,
      order_number: ord.orderNumber,
      amount_paise: ord.totalAmount * 100,
      currency: 'INR',
      method: ord.paymentMethod,
      vpa_or_masked: ord.paymentMethod === 'UPI' ? 'patient@okicici' : '•••• 4242',
    },
    createdAt: ord.createdAt,
  };
});

export const SEED_REFUNDS: Refund[] = SEED_PAYMENTS.filter((p) => p.status === 'Refunded')
  .map((p, idx) => ({
    id: `REF-${String(idx + 1).padStart(3, '0')}`,
    refundCode: `RFND-MC-${401 + idx}`,
    paymentId: p.id,
    orderId: p.orderId,
    orderNumber: p.orderNumber,
    customerId: p.customerId,
    customerName: p.customerName,
    amount: p.amount,
    reason: idx % 2 === 0 ? 'Order cancelled before dispatch' : 'Damaged outer blister strip on arrival',
    status: idx === 0 ? 'Pending Approval' : 'Processed (Simulated)',
    gatewayRefundRef: idx === 0 ? undefined : `rfnd_sim_${800 + idx}`,
    isSimulated: true,
    requestedBy: 'Rohan Nair',
    processedBy: idx === 0 ? undefined : 'Suresh Natarajan',
    createdAt: daysAgoIso(idx + 1),
    processedAt: idx === 0 ? undefined : daysAgoIso(idx),
  }));

const DELIVERED_FOR_RETURN_1 = SEED_ORDERS.find((o) => o.status === 'Delivered' && o.items.some((i) => !i.prescriptionRequired)) || SEED_ORDERS[0];
const DELIVERED_ITEM_1 = DELIVERED_FOR_RETURN_1.items.find((i) => !i.prescriptionRequired) || DELIVERED_FOR_RETURN_1.items[0];
const DELIVERED_FOR_RETURN_2 = SEED_ORDERS.find((o) => o.status === 'Delivered' && o.id !== DELIVERED_FOR_RETURN_1.id) || SEED_ORDERS[3];
const DELIVERED_ITEM_2 = DELIVERED_FOR_RETURN_2.items[0];
const DELIVERED_FOR_RETURN_3 = SEED_ORDERS.find((o) => o.status === 'Delivered' && o.id !== DELIVERED_FOR_RETURN_1.id && o.id !== DELIVERED_FOR_RETURN_2.id) || SEED_ORDERS[11];
const DELIVERED_ITEM_3 = DELIVERED_FOR_RETURN_3.items[0];

export const SEED_RETURNS: ReturnRequest[] = [
  {
    id: 'RET-001',
    returnCode: 'RET-MC-2026-081',
    orderId: DELIVERED_FOR_RETURN_1.id,
    orderNumber: DELIVERED_FOR_RETURN_1.orderNumber,
    customerId: DELIVERED_FOR_RETURN_1.customerId,
    customerName: SEED_CUSTOMERS.find((c) => c.id === DELIVERED_FOR_RETURN_1.customerId)?.name || 'Patient',
    productId: DELIVERED_ITEM_1.productId,
    productName: DELIVERED_ITEM_1.productName,
    quantity: 1,
    refundEligibleAmount: DELIVERED_ITEM_1.unitPrice,
    reason: 'Cuff / pack size mismatch — customer reordered alternate pack',
    evidenceNote: 'Unopened factory seal photo verified',
    eligibilityCheck: 'Eligible',
    status: 'Pending Review',
    requestedAt: daysAgoIso(1),
    updatedAt: daysAgoIso(1),
  },
  {
    id: 'RET-002',
    returnCode: 'RET-MC-2026-082',
    orderId: DELIVERED_FOR_RETURN_2.id,
    orderNumber: DELIVERED_FOR_RETURN_2.orderNumber,
    customerId: DELIVERED_FOR_RETURN_2.customerId,
    customerName: SEED_CUSTOMERS.find((c) => c.id === DELIVERED_FOR_RETURN_2.customerId)?.name || 'Patient',
    productId: DELIVERED_ITEM_2.productId,
    productName: DELIVERED_ITEM_2.productName,
    quantity: 1,
    refundEligibleAmount: DELIVERED_ITEM_2.unitPrice,
    reason: 'Patient doctor switched prescription therapy',
    evidenceNote: 'Cold-chain / Schedule H bio-safety restriction applies',
    eligibilityCheck: 'Non-Returnable (Cold Chain / Schedule H)',
    status: 'Rejected',
    reviewedBy: 'Dr. Priya Sharma',
    reviewNotes: 'Rejected under Rule 65 & Cold-Chain Bio-Safety Policy.',
    requestedAt: daysAgoIso(3),
    updatedAt: daysAgoIso(2),
  },
  {
    id: 'RET-003',
    returnCode: 'RET-MC-2026-083',
    orderId: DELIVERED_FOR_RETURN_3.id,
    orderNumber: DELIVERED_FOR_RETURN_3.orderNumber,
    customerId: DELIVERED_FOR_RETURN_3.customerId,
    customerName: SEED_CUSTOMERS.find((c) => c.id === DELIVERED_FOR_RETURN_3.customerId)?.name || 'Patient',
    productId: DELIVERED_ITEM_3.productId,
    productName: DELIVERED_ITEM_3.productName,
    quantity: 1,
    refundEligibleAmount: DELIVERED_ITEM_3.unitPrice,
    reason: 'Crushed blister pack during transit',
    evidenceNote: 'Delivery unboxing photo confirmed transit damage',
    eligibilityCheck: 'Eligible',
    status: 'Form 46 Destroyed',
    reviewedBy: 'Karthik Rao',
    reviewNotes: 'Approved refund; damaged strip routed to Form 46 bio-disposal.',
    requestedAt: daysAgoIso(4),
    updatedAt: daysAgoIso(3),
  },
];

export const SEED_SHIPMENTS: Shipment[] = SEED_ORDERS.filter(
  (o) => o.status === 'Packed' || o.status === 'Shipped' || o.status === 'Out for Delivery' || o.status === 'Delivered'
).map((ord, idx) => {
  const coldChainRequired = ord.items.some((i) => {
    const prod = SEED_PRODUCTS.find((p) => p.id === i.productId);
    return prod?.storageCondition === 'Cold Chain (2-8°C)';
  });
  const partner =
    SEED_DELIVERY_PARTNERS.find((p) => p.id === ord.deliveryPartnerId && (!coldChainRequired || p.coldChainCapable)) ||
    (coldChainRequired ? SEED_DELIVERY_PARTNERS.find((p) => p.coldChainCapable) : undefined) ||
    SEED_DELIVERY_PARTNERS[0];
  const cust = SEED_CUSTOMERS.find((c) => c.id === ord.customerId);
  const shipStatus: Shipment['status'] =
    ord.status === 'Delivered'
      ? 'Delivered'
      : ord.status === 'Out for Delivery'
      ? 'Out for Delivery'
      : ord.status === 'Shipped'
      ? idx % 6 === 0
        ? 'Failed Attempt'
        : 'In Transit'
      : 'Label Created';
  return {
    id: `SHP-${String(idx + 1).padStart(3, '0')}`,
    shipmentCode: `SHP-MC-${5100 + idx}`,
    orderId: ord.id,
    orderNumber: ord.orderNumber,
    customerId: ord.customerId,
    customerName: cust?.name || 'Patient',
    destinationCity: ord.shippingAddress.city,
    pincode: ord.shippingAddress.pincode,
    zone: computePincodeZone(ord.shippingAddress.pincode),
    partnerId: partner.id,
    partnerName: partner.name,
    awbNumber: ord.trackingNumber || `AWB-${partner.code.slice(0, 3)}-${884010 + idx}`,
    deliveryFee: ord.shippingFee || SEED_SETTINGS.standardShippingFee,
    coldChainRequired,
    currentTempCelsius: coldChainRequired ? 4.3 : undefined,
    status: shipStatus,
    expectedDeliveryDate: daysFromNowIso(shipStatus === 'Delivered' ? 0 : 1),
    isSimulated: true,
    timeline: [
      { status: 'Label Created', location: SEED_WAREHOUSES.find((w) => w.id === ord.warehouseId)?.city || 'Bengaluru', timestamp: ord.createdAt },
      ...(shipStatus !== 'Label Created'
        ? [{ status: shipStatus, location: ord.shippingAddress.city, timestamp: ord.updatedAt }]
        : []),
    ],
    createdAt: ord.createdAt,
  };
});

export const SEED_DOCTORS: Doctor[] = [
  { id: 'DOC-01', name: 'Dr. Venkatesh Murthy', qualification: 'MD (Internal Medicine)', specialization: 'Diabetology & Chronic Care', experienceYears: 14, nmcRegNo: 'KMC-61204', languages: ['English', 'Kannada', 'Hindi'], consultationFee: 499, availabilitySlots: ['09:00 AM - 01:00 PM', '05:00 PM - 08:00 PM'], hubAffiliation: 'WH-BLR-01', status: 'Available', rating: 4.9, consultationsCount: 1420 },
  { id: 'DOC-02', name: 'Dr. Kavita Sundaram', qualification: 'DM (Cardiology)', specialization: 'Preventive Cardiology', experienceYears: 16, nmcRegNo: 'TCMC-44918', languages: ['English', 'Tamil', 'Malayalam'], consultationFee: 799, availabilitySlots: ['10:00 AM - 02:00 PM'], hubAffiliation: 'WH-BLR-01', status: 'In Consultation', rating: 4.9, consultationsCount: 980 },
  { id: 'DOC-03', name: 'Dr. Siddharth Deshpande', qualification: 'MBBS, DNB (Family Med)', specialization: 'General Physician', experienceYears: 9, nmcRegNo: 'MMC-2014-8821', languages: ['English', 'Marathi', 'Hindi'], consultationFee: 349, availabilitySlots: ['08:00 AM - 02:00 PM', '04:00 PM - 09:00 PM'], hubAffiliation: 'WH-BOM-02', status: 'Available', rating: 4.7, consultationsCount: 2150 },
  { id: 'DOC-04', name: 'Dr. Anitha Rajagopal', qualification: 'MD (Dermatology)', specialization: 'Clinical Dermatology', experienceYears: 11, nmcRegNo: 'TSMC-52109', languages: ['English', 'Telugu', 'Hindi'], consultationFee: 599, availabilitySlots: ['11:00 AM - 04:00 PM'], hubAffiliation: 'WH-HYD-01', status: 'Available', rating: 4.8, consultationsCount: 860 },
  { id: 'DOC-05', name: 'Dr. Farhan Qureshi', qualification: 'MD (Pulmonary Medicine)', specialization: 'Respiratory & Asthma', experienceYears: 12, nmcRegNo: 'MMC-2012-4012', languages: ['English', 'Hindi', 'Urdu'], consultationFee: 649, availabilitySlots: ['03:00 PM - 08:00 PM'], hubAffiliation: 'WH-BOM-02', status: 'Off Duty', rating: 4.8, consultationsCount: 640 },
  { id: 'DOC-06', name: 'Dr. Nandita Hegde', qualification: 'MD (Pediatrics)', specialization: 'Pediatrics & Child Care', experienceYears: 8, nmcRegNo: 'KMC-78312', languages: ['English', 'Kannada', 'Tulu'], consultationFee: 449, availabilitySlots: ['09:30 AM - 01:30 PM'], hubAffiliation: 'WH-BLR-01', status: 'Credential Pending', rating: 4.6, consultationsCount: 190 },
];

const FIRST_APPROVED_RX = SEED_PRESCRIPTIONS.find((rx) => rx.status === 'Approved') || SEED_PRESCRIPTIONS[0];

export const SEED_CONSULTATIONS: Consultation[] = [
  { id: 'CON-001', consultationCode: 'TELE-2026-901', customerId: 'CUS-001', customerName: SEED_CUSTOMERS[0].name, doctorId: 'DOC-01', doctorName: 'Dr. Venkatesh Murthy', specialization: 'Diabetology & Chronic Care', scheduledAt: daysFromNowIso(0), mode: 'Video', chiefComplaint: 'Fasting glucose fluctuating 165 mg/dL, dosage review for Glycomet GP2', fee: 499, paymentStatus: 'Paid', status: 'In Progress', createdAt: daysAgoIso(1) },
  { id: 'CON-002', consultationCode: 'TELE-2026-902', customerId: 'CUS-002', customerName: SEED_CUSTOMERS[1].name, doctorId: 'DOC-03', doctorName: 'Dr. Siddharth Deshpande', specialization: 'General Physician', scheduledAt: daysFromNowIso(0), mode: 'Video', chiefComplaint: 'Persistent seasonal allergic rhinitis & throat irritation', fee: 349, paymentStatus: 'Paid', status: 'Confirmed', createdAt: daysAgoIso(0, 6) },
  { id: 'CON-003', consultationCode: 'TELE-2026-903', customerId: 'CUS-005', customerName: SEED_CUSTOMERS[4].name, doctorId: 'DOC-02', doctorName: 'Dr. Kavita Sundaram', specialization: 'Preventive Cardiology', scheduledAt: daysAgoIso(1), mode: 'Video', chiefComplaint: 'BP monitor reading 142/92 mmHg morning average', fee: 799, paymentStatus: 'Paid', status: 'Completed', linkedRxId: FIRST_APPROVED_RX?.id, clinicalNotes: 'Continue Telma 40mg OD; repeat lipid profile in 4 weeks.', createdAt: daysAgoIso(2) },
  { id: 'CON-004', consultationCode: 'TELE-2026-904', customerId: 'CUS-009', customerName: SEED_CUSTOMERS[8].name, doctorId: 'DOC-04', doctorName: 'Dr. Anitha Rajagopal', specialization: 'Clinical Dermatology', scheduledAt: daysFromNowIso(1), mode: 'Chat', chiefComplaint: 'Recurring forearm dermatitis flare-up', fee: 599, paymentStatus: 'Pending', status: 'Requested', createdAt: daysAgoIso(0, 2) },
  { id: 'CON-005', consultationCode: 'TELE-2026-905', customerId: 'CUS-012', customerName: SEED_CUSTOMERS[11].name, doctorId: 'DOC-01', doctorName: 'Dr. Venkatesh Murthy', specialization: 'Diabetology & Chronic Care', scheduledAt: daysFromNowIso(2), mode: 'Audio', chiefComplaint: 'HbA1c follow-up and insulin pen titration', fee: 499, paymentStatus: 'Paid', status: 'Scheduled', createdAt: daysAgoIso(1) },
];

export const SEED_COUPONS: Coupon[] = [
  { id: 'CPN-01', code: 'CARE10', title: '10% Off OTC & Wellness', discountType: 'Percentage', discountValue: 10, maxDiscountAmount: 250, minOrderAmount: 499, usageLimit: 5000, usedCount: 1842, perCustomerLimit: 3, excludeDpcoScheduled: true, categoryIds: ['CAT-04', 'CAT-07'], startDate: daysAgoIso(30), expiryDate: daysFromNowIso(60), active: true },
  { id: 'CPN-02', code: 'CHRONIC15', title: '15% Chronic Refill Advantage', discountType: 'Percentage', discountValue: 15, maxDiscountAmount: 500, minOrderAmount: 1200, usageLimit: 2000, usedCount: 745, perCustomerLimit: 2, excludeDpcoScheduled: true, categoryIds: ['CAT-01', 'CAT-02', 'CAT-03'], startDate: daysAgoIso(15), expiryDate: daysFromNowIso(45), active: true },
  { id: 'CPN-03', code: 'FIRST100', title: '₹100 Flat Off First Order', discountType: 'Fixed', discountValue: 100, maxDiscountAmount: 100, minOrderAmount: 599, usageLimit: 3000, usedCount: 1210, perCustomerLimit: 1, excludeDpcoScheduled: false, categoryIds: [], startDate: daysAgoIso(60), expiryDate: daysFromNowIso(90), active: true },
  { id: 'CPN-04', code: 'DEVICES200', title: '₹200 Off Home Diagnostics', discountType: 'Fixed', discountValue: 200, maxDiscountAmount: 200, minOrderAmount: 1499, usageLimit: 800, usedCount: 215, perCustomerLimit: 2, excludeDpcoScheduled: false, categoryIds: ['CAT-08'], startDate: daysAgoIso(10), expiryDate: daysFromNowIso(25), active: true },
];

export const SEED_CAMPAIGNS: Campaign[] = [
  { id: 'CMP-01', name: 'Monsoon Immunity & Fever Kit', channel: 'In-App & Web', targetGroup: 'All Retail Patients', startDate: daysAgoIso(14), endDate: daysFromNowIso(21), budget: 150000, attributedRevenue: 642000, conversions: 912, status: 'Active' },
  { id: 'CMP-02', name: 'Chronic Diabetes 30-Day Auto-Refill', channel: 'WhatsApp (Simulated)', targetGroup: 'Chronic Care VIP', startDate: daysAgoIso(7), endDate: daysFromNowIso(30), budget: 80000, attributedRevenue: 418500, conversions: 425, status: 'Active' },
  { id: 'CMP-03', name: 'Senior Citizen BP Monitor Bundle', channel: 'Email (Simulated)', targetGroup: 'Senior Citizen Care (60+)', startDate: daysFromNowIso(5), endDate: daysFromNowIso(35), budget: 60000, attributedRevenue: 0, conversions: 0, status: 'Scheduled' },
];

export const SEED_BANNERS: Banner[] = [
  { id: 'BNR-01', heading: '2-Hour Hyperlocal Medicine Delivery', subtitle: 'Bengaluru, Mumbai & Hyderabad cold-chain verified dispatch', ctaText: 'Order Medicines', destinationUrl: '/category/chronic-prescription-care', desktopImageUrl: '', mobileImageUrl: '', placement: 'Hero Top', startDate: daysAgoIso(20), endDate: daysFromNowIso(40), active: true },
  { id: 'BNR-02', heading: 'Flat 15% Off Monthly Chronic Refills', subtitle: 'Valid on non-DPCO wellness & glycemic care orders above ₹1,200', ctaText: 'Use Code CHRONIC15', destinationUrl: '/offers/chronic15', desktopImageUrl: '', mobileImageUrl: '', placement: 'Mid Chronic Strip', startDate: daysAgoIso(10), endDate: daysFromNowIso(25), active: true },
];

export const SEED_REVIEWS: ProductReview[] = [
  { id: 'REV-001', productId: 'PRD-016', productName: 'Omron HEM-7120 Automatic BP Monitor', customerId: 'CUS-001', customerName: SEED_CUSTOMERS[0].name, rating: 5, title: 'Accurate readings & sealed box', comment: 'Matched our clinic mercury sphygmomanometer within 2 mmHg. Fast delivery in Bengaluru.', status: 'Approved', createdAt: daysAgoIso(3) },
  { id: 'REV-002', productId: 'PRD-001', productName: 'Dolo 650mg Tablet', customerId: 'CUS-004', customerName: SEED_CUSTOMERS[3].name, rating: 5, title: 'Long expiry batch delivered', comment: 'Received 2027 expiry batch sealed properly.', status: 'Pending', createdAt: daysAgoIso(1) },
  { id: 'REV-003', productId: 'PRD-037', productName: 'Liv.52 DS Tablet (60s)', customerId: 'CUS-010', customerName: SEED_CUSTOMERS[9].name, rating: 4, title: 'Claims to cure all liver diseases permanently', comment: 'Best miracle cure for every chronic condition without needing a doctor!', status: 'Flagged (DMR Act)', moderationNote: 'Flagged under Drugs & Magic Remedies (Objectionable Advertisements) Act — misleading medical cure claim.', createdAt: daysAgoIso(2) },
  { id: 'REV-004', productId: 'PRD-015', productName: 'Accu-Chek Active Test Strips (50s)', customerId: 'CUS-006', customerName: SEED_CUSTOMERS[5].name, rating: 5, title: 'Genuine Roche strips', comment: 'Verified barcode and long shelf life.', status: 'Pending', createdAt: daysAgoIso(0, 8) },
];

export const SEED_TICKETS: SupportTicket[] = [
  {
    id: 'TKT-001',
    ticketCode: 'SUP-2026-4412',
    customerId: 'CUS-003',
    customerName: SEED_CUSTOMERS[2].name,
    relatedOrderNumber: SEED_ORDERS[2].orderNumber,
    category: 'Prescription Clarification',
    priority: 'Urgent',
    subject: 'Clarification needed on uploaded Manipal clinic prescription',
    status: 'Open',
    assignedStaffId: 'USR-009',
    assignedStaffName: 'Rohan Nair',
    messages: [
      { id: 'MSG-1', senderType: 'Customer', senderName: SEED_CUSTOMERS[2].name, body: 'Hi team, I uploaded my doctor prescription photo 2 hours ago. When will my order ship?', timestamp: daysAgoIso(0, 3) },
      { id: 'MSG-2', senderType: 'Internal Note', senderName: 'Dr. Raghavendra Iyer', body: 'Requested clear scan showing RMP seal & date on right edge.', timestamp: daysAgoIso(0, 2) },
    ],
    createdAt: daysAgoIso(0, 3),
    updatedAt: daysAgoIso(0, 2),
  },
  {
    id: 'TKT-002',
    ticketCode: 'SUP-2026-4413',
    customerId: 'CUS-007',
    customerName: SEED_CUSTOMERS[6].name,
    relatedOrderNumber: SEED_ORDERS[6].orderNumber,
    category: 'Order Delay',
    priority: 'High',
    subject: 'Cold-chain insulin shipment delayed at Bhiwandi hub',
    status: 'In Progress',
    assignedStaffId: 'USR-009',
    assignedStaffName: 'Rohan Nair',
    messages: [
      { id: 'MSG-3', senderType: 'Customer', senderName: SEED_CUSTOMERS[6].name, body: 'Waiting for Lantus pen delivery today morning.', timestamp: daysAgoIso(1) },
      { id: 'MSG-4', senderType: 'Staff', senderName: 'Rohan Nair', body: 'Checked BlueDart cold-chain telemetry (4.1°C stable). Out for priority evening slot.', isSimulatedDelivery: true, timestamp: daysAgoIso(0, 5) },
    ],
    createdAt: daysAgoIso(1),
    updatedAt: daysAgoIso(0, 5),
  },
  {
    id: 'TKT-003',
    ticketCode: 'SUP-2026-4414',
    customerId: 'CUS-008',
    customerName: SEED_CUSTOMERS[7].name,
    relatedOrderNumber: SEED_ORDERS[7].orderNumber,
    category: 'Refund / Payment',
    priority: 'Normal',
    subject: 'Refund status for cancelled order',
    status: 'Waiting for Customer',
    assignedStaffId: 'USR-007',
    assignedStaffName: 'Suresh Natarajan',
    messages: [
      { id: 'MSG-5', senderType: 'Customer', senderName: SEED_CUSTOMERS[7].name, body: 'UPI refund reference requested for cancelled order.', timestamp: daysAgoIso(2) },
    ],
    createdAt: daysAgoIso(2),
    updatedAt: daysAgoIso(1),
  },
];

export const SEED_NOTIFICATIONS: AppNotification[] = [
  { id: 'NOT-01', category: 'Prescription', title: 'Schedule H1 Rx Pending Pharmacist Sign-off', message: '7 prescriptions including Augmentin 625 Duo await RMP clinical verification.', targetPath: '/prescriptions', channel: 'In-App', read: false, createdAt: daysAgoIso(0, 1) },
  { id: 'NOT-02', category: 'Inventory', title: 'Expiring Batches <30 Days Alert', message: '6 active batches across Bengaluru & Mumbai hubs require FEFO clearance.', targetPath: '/batches-and-expiry', channel: 'In-App', read: false, createdAt: daysAgoIso(0, 3) },
  { id: 'NOT-03', category: 'Order', title: 'PO-MC-2026-0842 Ready for Dock Receiving', message: 'Cold-chain insulin shipment arriving at Mumbai Hub BOM-02.', targetPath: '/purchase-orders', channel: 'In-App', read: false, createdAt: daysAgoIso(0, 5) },
  { id: 'NOT-04', category: 'Payment', title: 'Pending Statutory Refund Approval', message: 'Refund RFND-MC-401 awaiting Finance Manager sign-off (Demo Simulated).', targetPath: '/payments', channel: 'In-App', read: true, createdAt: daysAgoIso(1) },
];

export const SEED_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  { id: 'TPL-01', name: 'Prescription Approved Dispatch', category: 'Prescription', channel: 'SMS', subject: 'Healthy Ghar Rx Verified', body: 'Your prescription {{rxNumber}} has been verified by our Registered Pharmacist. Order {{orderNumber}} is now being packed.', active: true },
  { id: 'TPL-02', name: 'Prescription Clarification Required', category: 'Prescription', channel: 'Email', subject: 'Action Needed: Re-upload Clear Prescription ({{rxNumber}})', body: 'Dear {{customerName}}, our pharmacist needs a clearer photo showing the doctor registration number and date.', active: true },
  { id: 'TPL-03', name: 'Cold-Chain Out for Delivery', category: 'Delivery', channel: 'Push', subject: 'Cold-Chain Order Arriving Today', body: 'Your temperature-controlled order {{orderNumber}} is out for delivery via {{carrierName}} (AWB: {{awbNumber}}).', active: true },
];

export const SEED_ACTIVITY_LOGS: ActivityLog[] = [
  { id: 'LOG-001', actorId: 'USR-003', actorName: 'Dr. Raghavendra Iyer', actorRole: 'PHARMACIST', action: 'PRESCRIPTION_APPROVED', module: 'prescriptions', recordId: FIRST_APPROVED_RX?.id || 'RX-001', result: 'Success', metadata: { rxNumber: FIRST_APPROVED_RX?.rxNumber || 'RX-MC-202601', regNo: 'KSPC-51904', scheduleH1: true }, ipAddress: '10.24.18.42', timestamp: daysAgoIso(0, 2) },
  { id: 'LOG-002', actorId: 'USR-005', actorName: 'Karthik Rao', actorRole: 'INVENTORY_MANAGER', action: 'GRN_RECEIVED', module: 'purchase_orders', recordId: 'GRN-BLR-2026-0312', result: 'Success', metadata: { poNumber: 'PO-MC-2026-0844', warehouse: 'WH-BLR-01', valueINR: 134000 }, ipAddress: '10.24.18.19', timestamp: daysAgoIso(1) },
  { id: 'LOG-003', actorId: 'USR-006', actorName: 'Neha Verma', actorRole: 'ORDER_MANAGER', action: 'ORDER_DISPATCHED', module: 'orders', recordId: 'MED-2026-1005', result: 'Success', metadata: { carrier: 'BlueDart MedExpress', hub: 'WH-BLR-01' }, ipAddress: '10.24.18.55', timestamp: daysAgoIso(1, 4) },
  { id: 'LOG-004', actorId: 'USR-007', actorName: 'Suresh Natarajan', actorRole: 'FINANCE_MANAGER', action: 'REFUND_SIMULATED', module: 'refunds', recordId: 'RFND-MC-402', result: 'Success', metadata: { amountINR: 412, mode: 'DEMO_SIMULATED' }, ipAddress: '10.24.19.12', timestamp: daysAgoIso(2) },
  { id: 'LOG-005', actorId: 'USR-001', actorName: 'Dr. Priya Sharma', actorRole: 'SUPER_ADMIN', action: 'BATCH_QUARANTINED', module: 'batches', recordId: 'BAT-012', result: 'Warning', metadata: { reason: 'Rule 65 Expiry Quarantine', qtyMoved: 35 }, ipAddress: '10.24.18.10', timestamp: daysAgoIso(2, 6) },
];
