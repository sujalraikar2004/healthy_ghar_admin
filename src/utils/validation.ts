import { z } from 'zod';

export const emailSchema = z.string().trim().email('Enter a valid email address');
export const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const gstinSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid 15-character GSTIN format');

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Medicine / product name is required'),
    sku: z.string().trim().min(3, 'Unique SKU code is required'),
    genericName: z.string().trim().min(2, 'Generic salt / molecule name is required'),
    composition: z.string().trim().min(2, 'Active composition is required'),
    strength: z.string().trim().min(1, 'Strength is required (e.g. 650mg)'),
    dosageForm: z.string().trim().min(2, 'Dosage form is required'),
    packSize: z.string().trim().min(1, 'Pack size is required'),
    categoryId: z.string().min(1, 'Category selection is required'),
    brandId: z.string().min(1, 'Brand / Manufacturer is required'),
    mrp: z.number().positive('MRP must be greater than ₹0'),
    sellingPrice: z.number().positive('Selling price must be greater than ₹0'),
    costPrice: z.number().nonnegative('Cost price cannot be negative'),
    hsnCode: z.string().trim().min(4, 'Valid HSN code is required'),
    reorderLevel: z.number().int().nonnegative('Reorder level must be 0 or higher'),
  })
  .refine((data) => data.sellingPrice <= data.mrp, {
    message: 'Selling price cannot exceed printed MRP under DPCO rules',
    path: ['sellingPrice'],
  });

export const supplierFormSchema = z.object({
  name: z.string().trim().min(2, 'Supplier legal name is required'),
  contactPerson: z.string().trim().min(2, 'Contact person name is required'),
  email: emailSchema,
  phone: indianPhoneSchema,
  gstin: gstinSchema,
  drugLicenseNo: z.string().trim().min(4, 'Drug License number is required'),
  city: z.string().trim().min(2, 'City is required'),
  address: z.string().trim().min(5, 'Registered address is required'),
});

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Coupon code must be at least 3 characters')
      .max(20, 'Coupon code max 20 characters')
      .regex(/^[A-Z0-9_-]+$/, 'Use uppercase letters, numbers, - or _ only'),
    title: z.string().trim().min(3, 'Title is required'),
    discountValue: z.number().positive('Discount value must be > 0'),
    maxDiscountAmount: z.number().nonnegative('Max discount must be >= 0'),
    minOrderAmount: z.number().nonnegative('Minimum order must be >= 0'),
    usageLimit: z.number().int().positive('Usage limit must be at least 1'),
    startDate: z.string().min(1, 'Start date is required'),
    expiryDate: z.string().min(1, 'Expiry date is required'),
  })
  .refine((d) => new Date(d.expiryDate) >= new Date(d.startDate), {
    message: 'Expiry date must be on or after start date',
    path: ['expiryDate'],
  });

export function validatePositiveInt(val: number, fieldName: string): string | null {
  if (!Number.isFinite(val) || val <= 0 || !Number.isInteger(val)) {
    return `${fieldName} must be a positive whole number`;
  }
  return null;
}
