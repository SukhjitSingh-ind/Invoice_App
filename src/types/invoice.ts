import { BankDetails } from './common';

export interface InvoiceParty {
  name: string;
  address: string;
  phone?: string;
  mobile?: string;
  email?: string;
  gstNumber?: string;
  state?: string;
}

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  price: number;
  hsnSac?: string;
  unit?: string;
  gstRate?: number;
}

export interface InvoiceCustomization {
  backgroundColor?: string;
  fontColor?: string;
  backgroundImage?: string;
}

export type DiscountType = 'fixed' | 'percentage';

export interface Invoice {
  id: number;
  number: string;
  date: string;
  sender: InvoiceParty;
  recipient: InvoiceParty;
  placeOfSupply?: string;
  items: InvoiceItem[];
  currency: string;
  notes?: string;
  termsAndConditions?: string;
  paymentInfo?: string;
  bankDetails: BankDetails;
  isGST: boolean;
  isIGST: boolean;
  gstRate?: number;
  cgst?: number;
  sgst?: number;
  received: number;
  discountType: DiscountType;
  discountValue: number;
  discountLabel?: string;
  customization?: InvoiceCustomization;
  template?: string;
}

export interface InvoiceTotals {
  subtotal: number;
  taxAmount: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  preDiscountTotal: number;
  discountAmount: number;
  total: number;
  balance: number;
}
