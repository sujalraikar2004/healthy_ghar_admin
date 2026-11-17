import {
  AdminUser,
  Batch,
  Brand,
  BusinessSettings,
  Category,
  CustomerGroup,
  DeliveryPartner,
  InventoryItem,
  Product,
  Warehouse,
} from '../types';

const nowIso = new Date().toISOString();
const daysAgoIso = (days: number) => new Date(Date.now() - days * 86400000).toISOString();
const daysFromNowIso = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

export const SEED_WAREHOUSES: Warehouse[] = [
  {
    id: 'WH-BLR-01',
    code: 'BLR-01',
    name: 'Bengaluru Central Fulfillment Hub',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Plot 42, Peenya Industrial Phase II, Tumkur Road',
    pincode: '560058',
    managerName: 'Karthik Rao',
    phone: '+91 80 4123 8900',
    drugLicenseNo: 'KA-B1-20B/44120 & 21B/44121',
    gstin: '29AABCM1234F1Z5',
    capacityUnits: 120000,
    coldChainEnabled: true,
    temperatureCelsius: 4.2,
    status: 'Active',
  },
  {
    id: 'WH-BOM-02',
    code: 'BOM-02',
    name: 'Mumbai Bhiwandi Cold-Chain Hub',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Logistics Park Bldg C, Dapoda Road, Bhiwandi',
    pincode: '421302',
    managerName: 'Sneha Kulkarni',
    phone: '+91 22 6789 2210',
    drugLicenseNo: 'MH-TZ5-20B/88210 & 21B/88211',
    gstin: '27AABCM1234F1Z9',
    capacityUnits: 95000,
    coldChainEnabled: true,
    temperatureCelsius: 3.8,
    status: 'Active',
  },
  {
    id: 'WH-HYD-01',
    code: 'HYD-01',
    name: 'Hyderabad Genome Valley Depot',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'Phase III Biotech Park, Shameerpet, Medchal',
    pincode: '500078',
    managerName: 'Vamsi Krishna',
    phone: '+91 40 2300 5541',
    drugLicenseNo: 'TS-MD-20B/19402 & 21B/19403',
    gstin: '36AABCM1234F1Z2',
    capacityUnits: 80000,
    coldChainEnabled: true,
    temperatureCelsius: 4.6,
    status: 'Active',
  },
];

export const SEED_STAFF: AdminUser[] = [
  {
    id: 'USR-001',
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@healthyghar.in',
    phone: '+91 98450 11223',
    roleId: 'SUPER_ADMIN',
    title: 'Chief Pharmacist & Ops Director',
    hubId: 'WH-BLR-01',
    status: 'Active',
    registrationNumber: 'KSPC-48219',
    twoFactorEnabled: true,
    lastActiveAt: nowIso,
    createdAt: daysAgoIso(365),
  },
  {
    id: 'USR-002',
    name: 'Arvind Menon',
    email: 'arvind.menon@healthyghar.in',
    phone: '+91 98451 22334',
    roleId: 'ADMIN',
    title: 'VP Pharmacy Operations',
    hubId: 'WH-BLR-01',
    status: 'Active',
    twoFactorEnabled: true,
    lastActiveAt: daysAgoIso(0),
    createdAt: daysAgoIso(300),
  },
  {
    id: 'USR-003',
    name: 'Dr. Raghavendra Iyer',
    email: 'raghavendra.iyer@healthyghar.in',
    phone: '+91 98801 44556',
    roleId: 'PHARMACIST',
    title: 'Lead Clinical Pharmacist (RMP)',
    hubId: 'WH-BLR-01',
    status: 'Active',
    registrationNumber: 'KSPC-51904',
    twoFactorEnabled: true,
    lastActiveAt: daysAgoIso(0),
    createdAt: daysAgoIso(240),
  },
  {
    id: 'USR-004',
    name: 'Meera Deshmukh',
    email: 'meera.deshmukh@healthyghar.in',
    phone: '+91 98204 55667',
    roleId: 'PHARMACIST',
    title: 'Senior Pharmacist — Cold Chain',
    hubId: 'WH-BOM-02',
    status: 'Active',
    registrationNumber: 'MSPC-72310',
    twoFactorEnabled: true,
    lastActiveAt: daysAgoIso(1),
    createdAt: daysAgoIso(200),
  },
  {
    id: 'USR-005',
    name: 'Karthik Rao',
    email: 'karthik.rao@healthyghar.in',
    phone: '+91 99001 66778',
    roleId: 'INVENTORY_MANAGER',
    title: 'Central Inventory & FEFO Lead',
    hubId: 'WH-BLR-01',
    status: 'Active',
    twoFactorEnabled: false,
    lastActiveAt: daysAgoIso(0),
    createdAt: daysAgoIso(180),
  },
  {
    id: 'USR-006',
    name: 'Neha Verma',
    email: 'neha.verma@healthyghar.in',
    phone: '+91 98190 77889',
    roleId: 'ORDER_MANAGER',
    title: 'Fulfillment & 3PL Dispatch Manager',
    hubId: 'WH-BLR-01',
    status: 'Active',
    twoFactorEnabled: true,
    lastActiveAt: daysAgoIso(0),
    createdAt: daysAgoIso(150),
  },
  {
    id: 'USR-007',
    name: 'Suresh Natarajan',
    email: 'suresh.natarajan@healthyghar.in',
    phone: '+91 98400 88990',
    roleId: 'FINANCE_MANAGER',
    title: 'Controller — GST & PG Reconciliation',
    hubId: 'WH-BLR-01',
    status: 'Active',
    twoFactorEnabled: true,
    lastActiveAt: daysAgoIso(0),
    createdAt: daysAgoIso(210),
  },
  {
    id: 'USR-008',
    name: 'Ananya Chatterjee',
    email: 'ananya.chatterjee@healthyghar.in',
    phone: '+91 98301 99001',
    roleId: 'MARKETING_MANAGER',
    title: 'Growth & Retention Lead',
    hubId: 'WH-BOM-02',
    status: 'Active',
    twoFactorEnabled: false,
    lastActiveAt: daysAgoIso(1),
    createdAt: daysAgoIso(120),
  },
  {
    id: 'USR-009',
    name: 'Rohan Nair',
    email: 'rohan.nair@healthyghar.in',
    phone: '+91 98470 10101',
    roleId: 'CUSTOMER_SUPPORT',
    title: 'Patient Care Desk Specialist',
    hubId: 'WH-HYD-01',
    status: 'Active',
    twoFactorEnabled: false,
    lastActiveAt: daysAgoIso(0),
    createdAt: daysAgoIso(90),
  },
  {
    id: 'USR-010',
    name: 'Divya Subramanian',
    email: 'divya.s@healthyghar.in',
    phone: '+91 98840 20202',
    roleId: 'ANALYST',
    title: 'Therapeutic & BI Analyst',
    hubId: 'WH-BLR-01',
    status: 'Active',
    twoFactorEnabled: true,
    lastActiveAt: daysAgoIso(2),
    createdAt: daysAgoIso(80),
  },
];

export const SEED_CATEGORIES: Category[] = [
  { id: 'CAT-01', name: 'Chronic & Prescription Care', slug: 'chronic-prescription-care', parentId: null, description: 'Long-term cardiac, diabetic, thyroid, and hypertension formulations', icon: 'cardiology', displayOrder: 1, status: 'Active', createdAt: daysAgoIso(300) },
  { id: 'CAT-02', name: 'Cardiac & Lipid Control', slug: 'cardiac-lipid-control', parentId: 'CAT-01', description: 'Statins, ARBs, antiplatelets, and beta-blockers', icon: 'favorite', displayOrder: 2, status: 'Active', createdAt: daysAgoIso(290) },
  { id: 'CAT-03', name: 'Diabetes & Glycemic Care', slug: 'diabetes-glycemic-care', parentId: 'CAT-01', description: 'Oral hypoglycemics, gliptins, and cold-chain insulins', icon: 'bloodtype', displayOrder: 3, status: 'Active', createdAt: daysAgoIso(290) },
  { id: 'CAT-04', name: 'OTC, Pain & Fever Relief', slug: 'otc-pain-fever', parentId: null, description: 'Analgesics, antipyretics, ORS hydration, and topical sprays', icon: 'medication', displayOrder: 4, status: 'Active', createdAt: daysAgoIso(280) },
  { id: 'CAT-05', name: 'Gastro & Digestive Care', slug: 'gastro-digestive', parentId: null, description: 'PPIs, antacids, probiotics, and liver care', icon: 'gastroenterology', displayOrder: 5, status: 'Active', createdAt: daysAgoIso(280) },
  { id: 'CAT-06', name: 'Antibiotics & Anti-Infectives', slug: 'antibiotics-anti-infectives', parentId: 'CAT-01', description: 'Schedule H/H1 broad-spectrum oral & topical anti-infectives', icon: 'vaccines', displayOrder: 6, status: 'Active', createdAt: daysAgoIso(270) },
  { id: 'CAT-07', name: 'Vitamins & Wellness Supplements', slug: 'vitamins-wellness', parentId: null, description: 'Calcium, Vitamin D3, Vitamin C, multivitamins, and omega-3', icon: 'nutrition', displayOrder: 7, status: 'Active', createdAt: daysAgoIso(260) },
  { id: 'CAT-08', name: 'Medical Devices & Diagnostics', slug: 'medical-devices', parentId: null, description: 'BP monitors, glucometers, test strips, nebulizers, thermometers', icon: 'monitor_heart', displayOrder: 8, status: 'Active', createdAt: daysAgoIso(250) },
  { id: 'CAT-09', name: 'Respiratory & Allergy Care', slug: 'respiratory-allergy', parentId: null, description: 'Inhalers, antihistamines, nasal sprays, and cough syrups', icon: 'pulmonology', displayOrder: 9, status: 'Active', createdAt: daysAgoIso(240) },
  { id: 'CAT-10', name: 'Dermatology & Skin Care', slug: 'dermatology-skin', parentId: null, description: 'Antifungal creams, medicated cleansers, and sunscreens', icon: 'dermatology', displayOrder: 10, status: 'Active', createdAt: daysAgoIso(230) },
  { id: 'CAT-11', name: 'Surgical & First Aid', slug: 'surgical-first-aid', parentId: null, description: 'Antiseptics, sterile gauze, bandages, and N95 respirators', icon: 'healing', displayOrder: 11, status: 'Active', createdAt: daysAgoIso(220) },
  { id: 'CAT-12', name: 'Ayurvedic & Herbal Care', slug: 'ayurvedic-herbal', parentId: null, description: 'AYUSH-certified herbal immunity and liver formulations', icon: 'spa', displayOrder: 12, status: 'Active', createdAt: daysAgoIso(210) },
];

export const SEED_BRANDS: Brand[] = [
  { id: 'BRD-01', name: 'Micro Labs', slug: 'micro-labs', manufacturerName: 'Micro Labs Ltd', country: 'India', licenseNumber: 'MFG/KA/1998/012', description: 'Leading Indian maker of Dolo 650 and cardiac therapies', featured: true, status: 'Active', createdAt: daysAgoIso(300) },
  { id: 'BRD-02', name: 'USV Pharma', slug: 'usv-pharma', manufacturerName: 'USV Private Limited', country: 'India', licenseNumber: 'MFG/MH/1984/044', description: 'Pioneer in diabetic & cardiovascular care (Glycomet, Ecosprin)', featured: true, status: 'Active', createdAt: daysAgoIso(300) },
  { id: 'BRD-03', name: 'Alkem Laboratories', slug: 'alkem-labs', manufacturerName: 'Alkem Laboratories Ltd', country: 'India', licenseNumber: 'MFG/HP/2001/119', description: 'Gastro, anti-infectives, and multivitamin formulations (Pan-D, Clavam)', featured: true, status: 'Active', createdAt: daysAgoIso(290) },
  { id: 'BRD-04', name: 'Torrent Pharma', slug: 'torrent-pharma', manufacturerName: 'Torrent Pharmaceuticals Ltd', country: 'India', licenseNumber: 'MFG/GJ/1992/071', description: 'Calcium, CNS, and cardiovascular market leader (Shelcal, Chymoral)', featured: true, status: 'Active', createdAt: daysAgoIso(290) },
  { id: 'BRD-05', name: 'Sun Pharma', slug: 'sun-pharma', manufacturerName: 'Sun Pharmaceutical Industries Ltd', country: 'India', licenseNumber: 'MFG/GJ/1983/005', description: 'India’s largest specialty pharmaceutical company (Volini, Pantocid, Rosuvas)', featured: true, status: 'Active', createdAt: daysAgoIso(290) },
  { id: 'BRD-06', name: 'Cipla', slug: 'cipla', manufacturerName: 'Cipla Limited', country: 'India', licenseNumber: 'MFG/MH/1978/002', description: 'Respiratory inhalers, antihistamines, and critical care', featured: true, status: 'Active', createdAt: daysAgoIso(290) },
  { id: 'BRD-07', name: "Dr. Reddy's", slug: 'dr-reddys', manufacturerName: "Dr. Reddy's Laboratories Ltd", country: 'India', licenseNumber: 'MFG/TS/1984/019', description: 'Omez, Atarax, and specialty generics', featured: true, status: 'Active', createdAt: daysAgoIso(280) },
  { id: 'BRD-08', name: 'Abbott India', slug: 'abbott-india', manufacturerName: 'Abbott India Limited', country: 'India', licenseNumber: 'MFG/GA/1995/033', description: 'Thyronorm, Duphaston, Cremaffin, and Digene', featured: true, status: 'Active', createdAt: daysAgoIso(280) },
  { id: 'BRD-09', name: 'GSK India', slug: 'gsk-india', manufacturerName: 'GlaxoSmithKline Pharmaceuticals', country: 'India', licenseNumber: 'MFG/MH/1975/011', description: 'Augmentin, Calpol, and Betnovate dermatology', featured: false, status: 'Active', createdAt: daysAgoIso(270) },
  { id: 'BRD-10', name: 'Glenmark', slug: 'glenmark', manufacturerName: 'Glenmark Pharmaceuticals Ltd', country: 'India', licenseNumber: 'MFG/MH/1997/064', description: 'Telma cardiac range, Candid antifungal, and Ascoril', featured: true, status: 'Active', createdAt: daysAgoIso(270) },
  { id: 'BRD-11', name: 'Sanofi India', slug: 'sanofi-india', manufacturerName: 'Sanofi India Limited', country: 'India', licenseNumber: 'MFG/GA/1991/027', description: 'Lantus insulin, Allegra, and Combiflam', featured: false, status: 'Active', createdAt: daysAgoIso(260) },
  { id: 'BRD-12', name: 'Lupin', slug: 'lupin', manufacturerName: 'Lupin Limited', country: 'India', licenseNumber: 'MFG/MH/1989/052', description: 'Gluconorm, Budamate, and anti-TB/cardiac formulations', featured: false, status: 'Active', createdAt: daysAgoIso(260) },
  { id: 'BRD-13', name: 'Omron Healthcare', slug: 'omron-healthcare', manufacturerName: 'Omron Healthcare India Pvt Ltd', country: 'Japan / India', licenseNumber: 'MD/IMP/2018/409', description: 'Clinical-grade home blood pressure monitors and nebulizers', featured: true, status: 'Active', createdAt: daysAgoIso(250) },
  { id: 'BRD-14', name: 'Accu-Chek', slug: 'accu-chek', manufacturerName: 'Roche Diabetes Care India', country: 'Germany / India', licenseNumber: 'MD/IMP/2017/211', description: 'Blood glucose meters and active diagnostic test strips', featured: true, status: 'Active', createdAt: daysAgoIso(250) },
  { id: 'BRD-15', name: 'Apex Laboratories', slug: 'apex-labs', manufacturerName: 'Apex Laboratories Pvt Ltd', country: 'India', licenseNumber: 'MFG/TN/1988/018', description: 'Zincovit multivitamin & immunity nutraceuticals', featured: false, status: 'Active', createdAt: daysAgoIso(240) },
  { id: 'BRD-16', name: 'Himalaya Wellness', slug: 'himalaya-wellness', manufacturerName: 'Himalaya Wellness Company', country: 'India', licenseNumber: 'AYU/KA/1970/001', description: 'Liv.52, Septilin, and AYUSH botanical healthcare', featured: false, status: 'Active', createdAt: daysAgoIso(240) },
];

type ProductInput = [
  id: string,
  name: string,
  sku: string,
  categoryId: string,
  brandId: string,
  genericName: string,
  composition: string,
  strength: string,
  dosageForm: string,
  packSize: string,
  mrp: number,
  sellingPrice: number,
  costPrice: number,
  gstRate: 0 | 5 | 12 | 18,
  hsnCode: string,
  schedule: Product['schedule'],
  storageCondition: Product['storageCondition'],
  reorderLevel: number,
  dpcoCapped?: boolean
];

const PRODUCT_TUPLES: ProductInput[] = [
  ['PRD-001', 'Dolo 650mg Tablet', 'MED-DOLO-650', 'CAT-04', 'BRD-01', 'Paracetamol', 'Paracetamol IP 650mg', '650mg', 'Tablet', 'Strip of 15 Tablets', 34, 29, 19, 12, '30049099', 'OTC', 'Room Temp (<25°C)', 400, true],
  ['PRD-002', 'Paracetamol 500mg IP Tablet', 'MED-PCM-500', 'CAT-04', 'BRD-09', 'Paracetamol', 'Paracetamol IP 500mg', '500mg', 'Tablet', 'Strip of 15 Tablets', 22, 18, 11, 12, '30049099', 'OTC', 'Room Temp (<25°C)', 350, true],
  ['PRD-003', 'Glycomet GP 2 Tablet SR', 'MED-GLYC-GP2', 'CAT-03', 'BRD-02', 'Glimepiride + Metformin', 'Glimepiride 2mg + Metformin SR 500mg', '2mg/500mg', 'Tablet SR', 'Strip of 15 Tablets', 218, 185, 134, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 250, true],
  ['PRD-004', 'Pan-D Capsule PR', 'MED-PAND-40', 'CAT-05', 'BRD-03', 'Pantoprazole + Domperidone', 'Pantoprazole 40mg + Domperidone 30mg SR', '40mg/30mg', 'Capsule PR', 'Strip of 15 Capsules', 215, 179, 122, 12, '30049099', 'Schedule H', 'Cool & Dry (<20°C)', 320, false],
  ['PRD-005', 'Shelcal 500mg Tablet', 'MED-SHEL-500', 'CAT-07', 'BRD-04', 'Calcium + Vitamin D3', 'Elemental Calcium 500mg + Vitamin D3 250 IU', '500mg', 'Tablet', 'Strip of 15 Tablets', 144, 122, 86, 12, '30045090', 'OTC', 'Room Temp (<25°C)', 220, false],
  ['PRD-006', 'Augmentin 625 Duo Tablet', 'MED-AUGM-625', 'CAT-06', 'BRD-09', 'Amoxicillin + Clavulanic Acid', 'Amoxycillin 500mg + Clavulanic Acid 125mg', '625mg', 'Tablet', 'Strip of 10 Tablets', 223, 192, 140, 12, '30041020', 'Schedule H1', 'Cool & Dry (<20°C)', 180, true],
  ['PRD-007', 'Telma 40mg Tablet', 'MED-TELM-40', 'CAT-02', 'BRD-10', 'Telmisartan', 'Telmisartan IP 40mg', '40mg', 'Tablet', 'Strip of 15 Tablets', 224, 190, 138, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 250, true],
  ['PRD-008', 'Atorva 20mg Tablet', 'MED-ATOR-20', 'CAT-02', 'BRD-05', 'Atorvastatin', 'Atorvastatin IP 20mg', '20mg', 'Tablet', 'Strip of 15 Tablets', 248, 210, 152, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 200, true],
  ['PRD-009', 'Ecosprin 75mg Tablet', 'MED-ECOS-75', 'CAT-02', 'BRD-02', 'Aspirin', 'Aspirin IP 75mg Gastro-Resistant', '75mg', 'Tablet', 'Strip of 14 Tablets', 8, 7, 4, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 500, true],
  ['PRD-010', 'Lantus SoloStar 100 IU/ml Pen', 'MED-LANT-PEN', 'CAT-03', 'BRD-11', 'Insulin Glargine', 'Insulin Glargine r-DNA 100 IU/mL (3mL Pen)', '100 IU/ml', 'Injection Pen', '1 Prefilled Pen (3ml)', 720, 650, 510, 5, '30043110', 'Schedule H', 'Cold Chain (2-8°C)', 90, true],
  ['PRD-011', 'Thyronorm 50mcg Tablet', 'MED-THYR-50', 'CAT-01', 'BRD-08', 'Levothyroxine Sodium', 'Thyroxine Sodium IP 50mcg', '50mcg', 'Tablet', 'Bottle of 120 Tablets', 210, 182, 132, 12, '30043919', 'Schedule H', 'Room Temp (<25°C)', 160, true],
  ['PRD-012', 'Zincovit Multivitamin Tablet', 'MED-ZINC-15', 'CAT-07', 'BRD-15', 'Multivitamins + Zinc', 'Multivitamins, Multiminerals & Grape Seed Extract', 'Standard', 'Tablet', 'Strip of 15 Tablets', 110, 94, 62, 18, '21069099', 'OTC', 'Room Temp (<25°C)', 280, false],
  ['PRD-013', 'Limcee 500mg Vitamin C Chewable', 'MED-LIMC-500', 'CAT-07', 'BRD-08', 'Ascorbic Acid', 'Vitamin C 500mg Orange Chewable', '500mg', 'Chewable Tablet', 'Strip of 15 Tablets', 25, 22, 14, 12, '30045020', 'OTC', 'Room Temp (<25°C)', 400, true],
  ['PRD-014', 'Electral ORS Sachet 21.8g', 'MED-ELEC-ORS', 'CAT-04', 'BRD-06', 'Oral Rehydration Salts', 'WHO Formula ORS Sodium/Potassium/Dextrose', '21.8g', 'Powder Sachet', 'Pack of 5 Sachets', 110, 95, 65, 12, '30049099', 'OTC', 'Room Temp (<25°C)', 300, true],
  ['PRD-015', 'Accu-Chek Active Test Strips (50s)', 'DEV-ACCU-50S', 'CAT-08', 'BRD-14', 'Blood Glucose Strips', 'In-Vitro Blood Glucose Test Strips', '50 Strips', 'Diagnostic Strip', 'Box of 50 Strips', 1049, 899, 680, 12, '38220090', 'Medical Device', 'Cool & Dry (<20°C)', 140, false],
  ['PRD-016', 'Omron HEM-7120 Automatic BP Monitor', 'DEV-OMRN-7120', 'CAT-08', 'BRD-13', 'Digital Sphygmomanometer', 'Upper Arm Oscillometric BP Monitor + Cuff', 'Digital', 'Medical Device', '1 Unit Box', 2490, 2099, 1650, 18, '90189099', 'Medical Device', 'Room Temp (<25°C)', 45, false],
  ['PRD-017', 'Dr. Trust Digital Infrared Thermometer', 'DEV-THRM-IR1', 'CAT-08', 'BRD-13', 'Infrared Thermometer', 'Non-Contact Clinical Forehead Thermometer', 'Digital', 'Medical Device', '1 Unit Box', 1499, 1190, 840, 18, '90251910', 'Medical Device', 'Room Temp (<25°C)', 60, false],
  ['PRD-018', 'Montair LC Tablet', 'MED-MONT-LC', 'CAT-09', 'BRD-06', 'Montelukast + Levocetirizine', 'Montelukast 10mg + Levocetirizine 5mg', '10mg/5mg', 'Tablet', 'Strip of 15 Tablets', 330, 279, 198, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 210, false],
  ['PRD-019', 'Allegra 120mg Tablet', 'MED-ALLG-120', 'CAT-09', 'BRD-11', 'Fexofenadine', 'Fexofenadine Hydrochloride IP 120mg', '120mg', 'Tablet', 'Strip of 10 Tablets', 228, 194, 142, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 170, false],
  ['PRD-020', 'Azithral 500mg Tablet', 'MED-AZTH-500', 'CAT-06', 'BRD-03', 'Azithromycin', 'Azithromycin IP 500mg', '500mg', 'Tablet', 'Strip of 5 Tablets', 132, 114, 82, 12, '30042019', 'Schedule H1', 'Room Temp (<25°C)', 220, true],
  ['PRD-021', 'Volini Pain Relief Spray 60g', 'MED-VOLN-60G', 'CAT-04', 'BRD-05', 'Diclofenac + Methyl Salicylate', 'Diclofenac Diethylamine + Menthol Spray', '60g', 'Topical Spray', 'Can of 60g', 235, 199, 138, 12, '30049099', 'OTC', 'Room Temp (<25°C)', 160, false],
  ['PRD-022', 'Omez 20mg Capsule', 'MED-OMEZ-20', 'CAT-05', 'BRD-07', 'Omeprazole', 'Omeprazole IP 20mg', '20mg', 'Capsule', 'Strip of 20 Capsules', 64, 54, 36, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 300, true],
  ['PRD-023', 'Digene Antacid Mint Gel 450ml', 'MED-DIGE-450', 'CAT-05', 'BRD-08', 'Magaldrate + Simethicone', 'Dried Aluminium Hydroxide + Magnesium Gel', '450ml', 'Oral Gel', 'Bottle of 450ml', 248, 212, 150, 12, '30049099', 'OTC', 'Room Temp (<25°C)', 120, false],
  ['PRD-024', 'Budecort 200mcg Inhaler', 'MED-BUDE-200', 'CAT-09', 'BRD-06', 'Budesonide', 'Budesonide IP 200mcg Metered Dose Inhaler', '200mcg', 'Inhaler', '200 Metered Doses', 385, 332, 250, 12, '30043200', 'Schedule H', 'Room Temp (<25°C)', 85, true],
  ['PRD-025', 'Asthalin 100mcg Inhaler', 'MED-ASTH-100', 'CAT-09', 'BRD-06', 'Salbutamol', 'Salbutamol Sulphate 100mcg HFA Inhaler', '100mcg', 'Inhaler', '200 Metered Doses', 168, 145, 105, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 140, true],
  ['PRD-026', 'Combiflam Tablet', 'MED-COMB-400', 'CAT-04', 'BRD-11', 'Ibuprofen + Paracetamol', 'Ibuprofen 400mg + Paracetamol 325mg', '400mg/325mg', 'Tablet', 'Strip of 20 Tablets', 48, 42, 28, 12, '30049099', 'OTC', 'Room Temp (<25°C)', 320, true],
  ['PRD-027', 'Gluconorm G2 Tablet', 'MED-GLUN-G2', 'CAT-03', 'BRD-12', 'Glimepiride + Metformin', 'Glimepiride 2mg + Metformin 500mg SR', '2mg/500mg', 'Tablet', 'Strip of 15 Tablets', 206, 176, 128, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 150, false],
  ['PRD-028', 'Rosuvas 10mg Tablet', 'MED-ROSU-10', 'CAT-02', 'BRD-05', 'Rosuvastatin', 'Rosuvastatin IP 10mg', '10mg', 'Tablet', 'Strip of 15 Tablets', 274, 232, 168, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 180, true],
  ['PRD-029', 'Telma-H Tablet', 'MED-TLMH-40', 'CAT-02', 'BRD-10', 'Telmisartan + Hydrochlorothiazide', 'Telmisartan 40mg + Hydrochlorothiazide 12.5mg', '40mg/12.5mg', 'Tablet', 'Strip of 15 Tablets', 298, 254, 185, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 140, false],
  ['PRD-030', 'Human Mixtard 30/70 Penfill 3ml', 'MED-MIXT-30', 'CAT-03', 'BRD-08', 'Biphasic Isophane Insulin', 'Human Insulin 40/100 IU Cold-Chain Cartridge', '100 IU/ml', 'Cartridge', 'Pack of 5 x 3ml', 1420, 1280, 1020, 5, '30043110', 'Schedule H', 'Cold Chain (2-8°C)', 55, true],
  ['PRD-031', 'Candid-B Cream 20g', 'MED-CAND-20G', 'CAT-10', 'BRD-10', 'Clotrimazole + Beclometasone', 'Clotrimazole 1% + Beclometasone 0.025%', '20g', 'Topical Cream', 'Tube of 20g', 142, 121, 84, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 130, false],
  ['PRD-032', 'Betnovate-N Skin Cream 25g', 'MED-BETN-25G', 'CAT-10', 'BRD-09', 'Betamethasone + Neomycin', 'Betamethasone Valerate 0.1% + Neomycin 0.5%', '25g', 'Topical Cream', 'Tube of 25g', 62, 54, 38, 12, '30043200', 'Schedule H', 'Room Temp (<25°C)', 160, true],
  ['PRD-033', 'Betadine 10% Antiseptic Solution 100ml', 'MED-BETA-100', 'CAT-11', 'BRD-01', 'Povidone-Iodine', 'Povidone-Iodine IP 10% w/v', '100ml', 'Topical Solution', 'Bottle of 100ml', 124, 106, 74, 12, '30049099', 'OTC', 'Protect from Light', 150, true],
  ['PRD-034', 'Neurobion Forte Tablet', 'MED-NEUR-30', 'CAT-07', 'BRD-08', 'Vitamin B Complex + B12', 'Thiamine + Pyridoxine + Cyanocobalamin', 'Forte', 'Tablet', 'Strip of 30 Tablets', 43, 38, 26, 12, '30045090', 'OTC', 'Room Temp (<25°C)', 340, true],
  ['PRD-035', 'Becosules Capsule', 'MED-BECO-20', 'CAT-07', 'BRD-08', 'B-Complex + Vitamin C', 'Vitamin B-Complex Forte with Vitamin C', 'Forte', 'Capsule', 'Strip of 20 Capsules', 55, 48, 33, 12, '30045090', 'OTC', 'Cool & Dry (<20°C)', 300, true],
  ['PRD-036', 'D-Rise 60K Vitamin D3 Capsule', 'MED-DRIS-60K', 'CAT-07', 'BRD-02', 'Cholecalciferol', 'Cholecalciferol IP 60,000 IU', '60,000 IU', 'Softgel', 'Strip of 4 Capsules', 148, 126, 86, 12, '30045090', 'OTC', 'Cool & Dry (<20°C)', 200, false],
  ['PRD-037', 'Liv.52 DS Tablet (60s)', 'MED-LIV52-DS', 'CAT-12', 'BRD-16', 'Polyherbal Hepatoprotective', 'Himsra + Kasani Ayurvedic Extract', 'Double Strength', 'Tablet', 'Bottle of 60 Tablets', 210, 182, 125, 12, '30049011', 'OTC', 'Room Temp (<25°C)', 160, false],
  ['PRD-038', 'Septilin Tablet (60s)', 'MED-SEPT-60', 'CAT-12', 'BRD-16', 'Guggulu + Guduchi', 'Ayurvedic Immunomodulator Complex', '60s', 'Tablet', 'Bottle of 60 Tablets', 180, 155, 108, 12, '30049011', 'OTC', 'Room Temp (<25°C)', 110, false],
  ['PRD-039', 'Chymoral Forte Tablet', 'MED-CHYM-20', 'CAT-04', 'BRD-04', 'Trypsin + Chymotrypsin', 'Trypsin Chymotrypsin 100,000 AU', '100K AU', 'Tablet', 'Strip of 20 Tablets', 442, 378, 275, 12, '30049099', 'Schedule H', 'Cool & Dry (<20°C)', 120, false],
  ['PRD-040', 'Pantocid 40mg Tablet', 'MED-PANT-40', 'CAT-05', 'BRD-05', 'Pantoprazole', 'Pantoprazole Sodium IP 40mg', '40mg', 'Tablet', 'Strip of 15 Tablets', 165, 140, 96, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 240, true],
  ['PRD-041', 'Pantocid DSR Capsule', 'MED-PNTD-SR', 'CAT-05', 'BRD-05', 'Pantoprazole + Domperidone', 'Pantoprazole 40mg + Domperidone 30mg SR', '40mg/30mg', 'Capsule', 'Strip of 15 Capsules', 210, 178, 124, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 200, false],
  ['PRD-042', 'Clavam 625mg Tablet', 'MED-CLAV-625', 'CAT-06', 'BRD-03', 'Amoxicillin + Clavulanic Acid', 'Amoxycillin 500mg + Clavulanate 125mg', '625mg', 'Tablet', 'Strip of 10 Tablets', 220, 188, 136, 12, '30041020', 'Schedule H1', 'Cool & Dry (<20°C)', 170, true],
  ['PRD-043', 'Taxim-O 200mg Tablet', 'MED-TAXI-200', 'CAT-06', 'BRD-03', 'Cefixime', 'Cefixime IP 200mg', '200mg', 'Tablet', 'Strip of 10 Tablets', 118, 102, 72, 12, '30042019', 'Schedule H1', 'Room Temp (<25°C)', 160, true],
  ['PRD-044', 'Ascoril LS Expectorant Syrup 100ml', 'MED-ASCO-LS', 'CAT-09', 'BRD-10', 'Levosalbutamol + Ambroxol + Guaiphenesin', 'Levosalbutamol 1mg + Ambroxol 30mg + Guaiphenesin 50mg', '100ml', 'Syrup', 'Bottle of 100ml', 129, 110, 76, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 140, false],
  ['PRD-045', 'Dolo-250 Paediatric Suspension 60ml', 'MED-DOLP-250', 'CAT-04', 'BRD-01', 'Paracetamol', 'Paracetamol Paediatric Oral Suspension 250mg/5ml', '60ml', 'Suspension', 'Bottle of 60ml', 48, 42, 28, 12, '30049099', 'OTC', 'Room Temp (<25°C)', 180, true],
  ['PRD-046', 'Omron NE-C28 Compressor Nebulizer', 'DEV-OMRN-NEB', 'CAT-08', 'BRD-13', 'Piston Compressor Nebulizer', 'Aerosol Nebulizer Kit with Adult & Child Masks', 'AC Mains', 'Medical Device', '1 Unit Box', 3150, 2690, 2080, 18, '90192090', 'Medical Device', 'Room Temp (<25°C)', 25, false],
  ['PRD-047', 'Accu-Chek Instant Glucometer Kit', 'DEV-ACCU-KIT', 'CAT-08', 'BRD-14', 'Blood Glucose Meter', 'Glucometer + Softclix Lancing Device + 10 Strips', 'Bluetooth', 'Medical Device', '1 Kit Box', 1549, 1299, 960, 12, '90189099', 'Medical Device', 'Room Temp (<25°C)', 40, false],
  ['PRD-048', 'Alprax 0.25mg Tablet', 'MED-ALPX-025', 'CAT-01', 'BRD-04', 'Alprazolam', 'Alprazolam IP 0.25mg', '0.25mg', 'Tablet', 'Strip of 15 Tablets', 44, 38, 25, 12, '30049099', 'Schedule X', 'Room Temp (<25°C)', 80, true],
  ['PRD-049', 'Atarax 25mg Tablet', 'MED-ATAR-25', 'CAT-09', 'BRD-07', 'Hydroxyzine', 'Hydroxyzine Hydrochloride IP 25mg', '25mg', 'Tablet', 'Strip of 15 Tablets', 96, 82, 56, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 120, false],
  ['PRD-050', 'Sterile Surgical Gauze Swabs (100s)', 'SUR-GAUZ-100', 'CAT-11', 'BRD-06', 'Absorbent Cotton Gauze', '10cm x 10cm 12-Ply Sterile Gauze Swabs', '10x10cm', 'Surgical', 'Box of 100 Swabs', 290, 245, 165, 12, '30059040', 'OTC', 'Room Temp (<25°C)', 100, false],
  ['PRD-051', 'Ecosprin AV 75/10 Capsule', 'MED-ECAV-75', 'CAT-02', 'BRD-02', 'Aspirin + Atorvastatin', 'Aspirin 75mg + Atorvastatin 10mg', '75mg/10mg', 'Capsule', 'Strip of 15 Capsules', 74, 64, 45, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 180, true],
  ['PRD-052', 'Janumet 50/500mg Tablet', 'MED-JANU-500', 'CAT-03', 'BRD-12', 'Sitagliptin + Metformin', 'Sitagliptin 50mg + Metformin 500mg', '50mg/500mg', 'Tablet', 'Strip of 15 Tablets', 345, 298, 224, 12, '30049099', 'Schedule H', 'Room Temp (<25°C)', 110, false],
];

export const SEED_PRODUCTS: Product[] = PRODUCT_TUPLES.map((p, idx) => {
  const [
    id,
    name,
    sku,
    categoryId,
    brandId,
    genericName,
    composition,
    strength,
    dosageForm,
    packSize,
    mrp,
    sellingPrice,
    costPrice,
    gstRate,
    hsnCode,
    schedule,
    storageCondition,
    reorderLevel,
    dpcoCapped = false,
  ] = p;
  const brand = SEED_BRANDS.find((b) => b.id === brandId);
  return {
    id,
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    sku,
    barcode: `89012345${String(10000 + idx)}`,
    shortDescription: `${genericName} (${strength}) — ${packSize}`,
    description: `${name} contains ${composition}. Manufactured by ${brand?.manufacturerName || 'Verified Pharma'} under CDSCO GMP standards. Storage: ${storageCondition}.`,
    categoryId,
    brandId,
    manufacturer: brand?.manufacturerName || 'Healthy Ghar Partner Labs',
    genericName,
    composition,
    strength,
    dosageForm,
    packSize,
    mrp,
    sellingPrice,
    costPrice,
    gstRate,
    hsnCode,
    images: [],
    prescriptionRequired: schedule === 'Schedule H' || schedule === 'Schedule H1' || schedule === 'Schedule X',
    schedule,
    storageCondition,
    isReturnable: storageCondition !== 'Cold Chain (2-8°C)' && schedule !== 'Schedule X',
    dpcoCapped,
    reorderLevel,
    status: 'Active',
    ratingAvg: Number((4.3 + (idx % 7) * 0.1).toFixed(1)),
    reviewCount: 14 + (idx % 38),
    variants: [
      {
        id: `${id}-V1`,
        label: packSize,
        skuSuffix: 'STD',
        mrp,
        sellingPrice,
        costPrice,
        packSize,
      },
    ],
    createdAt: daysAgoIso(180 - idx),
    updatedAt: daysAgoIso(idx % 14),
  };
});

// Generate 65+ realistic batches across all 52 products and 3 warehouses,
// including low-stock SKUs, <30d expiring batches, 30-90d watch batches, and expired/quarantined batches!
export const SEED_BATCHES: Batch[] = SEED_PRODUCTS.flatMap((prod, idx) => {
  const batches: Batch[] = [];
  const wh1 = idx % 3 === 0 ? 'WH-BLR-01' : idx % 3 === 1 ? 'WH-BOM-02' : 'WH-HYD-01';
  const isLowStock = idx % 7 === 2; // ~8 low-stock SKUs
  const isNearExpiry = idx % 9 === 4; // ~6 near-expiry <45d
  const isExpiredQuarantine = idx % 13 === 5; // 4 quarantined / expired batches

  const qty1 = isLowStock ? Math.max(18, Math.floor(prod.reorderLevel * 0.45)) : prod.reorderLevel * 3 + (idx % 4) * 80;
  const expiry1 = isNearExpiry ? daysFromNowIso(22 + (idx % 25)) : daysFromNowIso(220 + idx * 5);

  batches.push({
    id: `BAT-${String(idx * 2 + 1).padStart(3, '0')}`,
    batchNumber: `MC${24 + (idx % 2)}-${prod.sku.slice(-4)}-${101 + idx}`,
    productId: prod.id,
    warehouseId: wh1,
    supplierId: `SUP-${String((idx % 15) + 1).padStart(3, '0')}`,
    manufacturer: prod.manufacturer,
    mfgDate: daysAgoIso(180 + (idx % 60)),
    expiryDate: expiry1,
    receivedQty: qty1 + 120,
    availableQty: qty1,
    reservedQty: idx % 5 === 0 ? 12 : 4,
    damagedQty: idx % 11 === 0 ? 3 : 0,
    costPrice: prod.costPrice,
    mrp: prod.mrp,
    status: isNearExpiry ? 'Expiring Soon' : 'Active',
    rackLocation: `${wh1.slice(3, 6)}-R${(idx % 8) + 1}-B${(idx % 5) + 1}`,
    coldChainTemp: prod.storageCondition === 'Cold Chain (2-8°C)' ? 4.1 : undefined,
    createdAt: daysAgoIso(90),
  });

  if (idx < 18 || isExpiredQuarantine) {
    const expiredDate = isExpiredQuarantine ? daysAgoIso(12 + (idx % 10)) : daysFromNowIso(340 + idx * 4);
    const secondQty = isExpiredQuarantine ? 35 : isLowStock ? 10 : 180 + (idx % 5) * 40;
    batches.push({
      id: `BAT-${String(idx * 2 + 2).padStart(3, '0')}`,
      batchNumber: `MC23-${prod.sku.slice(-4)}-${201 + idx}`,
      productId: prod.id,
      warehouseId: isExpiredQuarantine ? wh1 : 'WH-BLR-01',
      supplierId: `SUP-${String(((idx + 3) % 15) + 1).padStart(3, '0')}`,
      manufacturer: prod.manufacturer,
      mfgDate: daysAgoIso(420),
      expiryDate: expiredDate,
      receivedQty: secondQty + 50,
      availableQty: isExpiredQuarantine ? 0 : secondQty,
      reservedQty: 0,
      damagedQty: isExpiredQuarantine ? secondQty : 0,
      costPrice: prod.costPrice,
      mrp: prod.mrp,
      status: isExpiredQuarantine ? 'Quarantined' : 'Active',
      rackLocation: isExpiredQuarantine ? 'QUARANTINE-BAY-01' : `BLR-R${(idx % 6) + 2}-B3`,
      coldChainTemp: prod.storageCondition === 'Cold Chain (2-8°C)' ? 4.4 : undefined,
      quarantineReason: isExpiredQuarantine ? 'Rule 65 Expiry Quarantine — Pending Form 46 Destruction' : undefined,
      createdAt: daysAgoIso(150),
    });
  }

  return batches;
});

export function deriveInventoryFromBatches(products: Product[], batches: Batch[]): InventoryItem[] {
  const map = new Map<string, InventoryItem>();
  const nowMs = Date.now();
  for (const b of batches) {
    const prod = products.find((p) => p.id === b.productId);
    if (!prod) continue;
    const key = `${b.productId}::${b.warehouseId}`;
    const existing = map.get(key);
    const isBlockedOrExpired =
      b.status === 'Quarantined' || b.status === 'Expired' || new Date(b.expiryDate).getTime() <= nowMs;
    const activeAvail = isBlockedOrExpired ? 0 : b.availableQty;
    if (existing) {
      existing.availableQty += activeAvail;
      existing.reservedQty += b.reservedQty;
      existing.damagedQty += b.damagedQty;
    } else {
      map.set(key, {
        id: `INV-${b.productId}-${b.warehouseId}`,
        productId: b.productId,
        sku: prod.sku,
        warehouseId: b.warehouseId,
        availableQty: activeAvail,
        reservedQty: b.reservedQty,
        damagedQty: b.damagedQty,
        reorderLevel: prod.reorderLevel,
        updatedAt: nowIso,
      });
    }
  }
  return Array.from(map.values());
}

export const SEED_CUSTOMER_GROUPS: CustomerGroup[] = [
  { id: 'GRP-01', name: 'Chronic Care VIP', description: 'Monthly diabetes, cardiac & thyroid refill subscribers', discountPercent: 12, minOrders: 6, badgeColor: 'bg-primary-container text-on-primary' },
  { id: 'GRP-02', name: 'Senior Citizen Care (60+)', description: 'Priority doorstep delivery & pharmacist callback support', discountPercent: 10, minOrders: 1, badgeColor: 'bg-tertiary-fixed text-on-tertiary-fixed' },
  { id: 'GRP-03', name: 'Corporate Wellness Plan', description: 'Bengaluru & Hyderabad tech park partner employees', discountPercent: 15, minOrders: 2, badgeColor: 'bg-secondary-container text-on-secondary-container' },
  { id: 'GRP-04', name: 'Standard Retail Patient', description: 'General OTC & acute prescription shoppers', discountPercent: 0, minOrders: 0, badgeColor: 'bg-surface-container text-on-surface-variant' },
];

export const SEED_DELIVERY_PARTNERS: DeliveryPartner[] = [
  { id: 'DP-01', name: 'BlueDart MedExpress', code: 'BLUEDART', serviceType: 'Air Cold-Chain', onTimeSlaPercent: 98.4, avgDeliveryHours: 18, activeShipments: 34, coldChainCapable: true, status: 'Active' },
  { id: 'DP-02', name: 'Shadowfax Hyperlocal', code: 'SHADOWFAX', serviceType: 'Hyperlocal Express', onTimeSlaPercent: 96.8, avgDeliveryHours: 2.5, activeShipments: 52, coldChainCapable: true, status: 'Active' },
  { id: 'DP-03', name: 'Delhivery Surface Plus', code: 'DELHIVERY', serviceType: 'Surface Pan-India', onTimeSlaPercent: 93.2, avgDeliveryHours: 42, activeShipments: 61, coldChainCapable: false, status: 'Active' },
  { id: 'DP-04', name: 'Ecom Express MedLine', code: 'ECOMEXP', serviceType: 'Surface Pan-India', onTimeSlaPercent: 94.5, avgDeliveryHours: 36, activeShipments: 28, coldChainCapable: false, status: 'Active' },
  { id: 'DP-05', name: 'Healthy Ghar EV Cold Fleet', code: 'HG-EV-FLEET', serviceType: 'Internal EV', onTimeSlaPercent: 99.2, avgDeliveryHours: 1.8, activeShipments: 19, coldChainCapable: true, status: 'Active' },
];

export const SEED_SETTINGS: BusinessSettings = {
  pharmacyName: 'Healthy Ghar Online Pharmacy & Clinical Ops',
  legalEntityName: 'Healthy Ghar HealthTech Private Limited',
  gstin: '29AABCM1234F1Z5',
  drugLicenseNumber20B: 'KA-B1-20B/44120',
  drugLicenseNumber21B: 'KA-B1-21B/44121',
  supportEmail: 'care@healthyghar-ops.in',
  supportPhone: '+91 80 4568 9000',
  registeredAddress: 'Plot 42, Peenya Industrial Phase II, Tumkur Road, Bengaluru, Karnataka - 560058',
  currency: 'INR',
  defaultGstSlab: 12,
  freeDeliveryThreshold: 499,
  standardShippingFee: 49,
  coldChainSurcharge: 75,
  requirePharmacistDualSignOffScheduleH1: true,
  autoQuarantineExpiredBatches: true,
  blockOrderDispatchWithoutRxApproval: true,
  returnWindowDays: 7,
  allowReturnForColdChain: false,
  sessionTimeoutMinutes: 60,
  integrations: {
    paymentGatewayMode: 'Demo Simulated',
    smsProviderMode: 'Demo Simulated',
    emailProviderMode: 'Demo Simulated',
    courierWebhookMode: 'Demo Simulated',
    abdmHealthIdSync: 'Demo Simulated',
  },
};
