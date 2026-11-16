import { Invoice, InvoiceParty, InvoiceCustomization, DiscountType } from './invoice';
import { BankDetails } from './common';

export interface RawJsonClient {
  name?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  gst?: string;
  gstin?: string;
  state?: string;
}

export interface RawJsonItem {
  id?: number | string;
  description?: string;
  name?: string;
  title?: string;
  quantity?: number | string;
  qty?: number | string;
  price?: number | string;
  rate?: number | string;
  unitPrice?: number | string;
  amount?: number | string;
  hsnSac?: string;
  hsn?: string;
  sac?: string;
  unit?: string;
  gstRate?: number | string;
  taxRate?: number | string;
  gst?: number | string;
}

export interface RawJsonInvoice {
  invoiceNumber?: string | number;
  number?: string | number;
  date?: string;
  issueDate?: string;
  invoiceDate?: string;
  dueDate?: string;
  client?: RawJsonClient;
  recipient?: RawJsonClient;
  customer?: RawJsonClient;
  billTo?: RawJsonClient;
  sender?: RawJsonClient;
  company?: RawJsonClient;
  vendor?: RawJsonClient;
  template?: string;
  templateId?: string;
  items?: RawJsonItem[];
  lineItems?: RawJsonItem[];
  invoiceItems?: RawJsonItem[];
  isGST?: boolean;
  gst?: boolean;
  isIGST?: boolean;
  igst?: boolean;
  placeOfSupply?: string;
  currency?: string;
  notes?: string;
  note?: string;
  termsAndConditions?: string;
  terms?: string;
  paymentInfo?: string;
  paymentDetails?: string;
  bankDetails?: Partial<BankDetails>;
  bank?: Partial<BankDetails>;
  received?: number | string;
  paidAmount?: number | string;
  amountPaid?: number | string;
  discountType?: DiscountType;
  discountValue?: number | string;
  discountLabel?: string;
  discount?: number | string | {
    type?: DiscountType;
    value?: number | string;
    label?: string;
  };
  customization?: InvoiceCustomization;
  [key: string]: unknown;
}

export interface ParseResult {
  success: boolean;
  rawParsed: RawJsonInvoice | null;
  extractedInvoice: Partial<Invoice> | null;
  hasClient: boolean;
  hasTemplate: boolean;
  rawTemplateId?: string;
  errors: string[];
  warnings: string[];
}

export interface ResolutionOptions {
  extractedData: Partial<Invoice> | null;
  manualClient?: InvoiceParty | null;
  manualTemplateId?: string | null;
  defaultTemplateId?: string;
  senderProfile?: Partial<InvoiceParty> | null;
  bankDetailsFallback?: Partial<BankDetails> | null;
  nextInvoiceNumberFallback?: string;
}

export type ClientSource = 'manual' | 'json' | 'none';
export type TemplateSource = 'manual' | 'json' | 'default';

export interface ResolvedInvoiceResult {
  invoice: Invoice;
  clientSource: ClientSource;
  templateSource: TemplateSource;
  clientName: string;
  templateName: string;
}
