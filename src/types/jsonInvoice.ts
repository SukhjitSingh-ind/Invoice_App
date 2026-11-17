import { Invoice, InvoiceItem, InvoiceParty, InvoiceCustomization, DiscountType } from './invoice';
import { BankDetails } from './common';

export interface RawJsonClient {
  name?: string;
  mobile?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
  state?: string;
}

export interface RawJsonItem {
  id?: number | string;
  description?: string;
  quantity?: number | string;
  price?: number | string;
  hsnSac?: string;
  unit?: string;
  gstRate?: number | string;
}

/**
 * Standard JSON invoice schema for user import.
 * Uses strictly one agreed property name per concept with no legacy aliases.
 */
export interface RawJsonInvoice {
  invoiceNumber?: string | number;
  issueDate?: string;
  dueDate?: string;
  template?: string;
  currency?: string;
  notes?: string;
  termsAndConditions?: string;
  paymentInfo?: string;

  IsGST?: boolean;
  IsIGST?: boolean;
  placeOfSupply?: string;

  client?: RawJsonClient;
  sender?: RawJsonClient;
  items?: RawJsonItem[];
  bankDetails?: Partial<BankDetails>;

  received?: number | string;
  discountType?: DiscountType;
  discountValue?: number | string;
  discountLabel?: string;
  customization?: InvoiceCustomization;

  [key: string]: unknown;
}

/**
 * Normalized invoice structure produced by parsing raw JSON.
 * Exactly matches domain properties with no redundant aliases.
 */
export interface NormalizedInvoice {
  id?: number | string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  sender?: InvoiceParty | null;
  client?: InvoiceParty | null;
  template?: string;
  items: InvoiceItem[];
  IsGST: boolean;
  IsIGST: boolean;
  placeOfSupply: string;
  currency: string;
  notes: string;
  termsAndConditions: string;
  paymentInfo: string;
  bankDetails?: BankDetails;
  received: number;
  discountType: DiscountType;
  discountValue: number;
  discountLabel: string;
  customization?: InvoiceCustomization;
}

export interface ParseResult {
  success: boolean;
  rawParsed: RawJsonInvoice | null;
  extractedInvoice: Partial<NormalizedInvoice> | null;
  hasClient: boolean;
  hasTemplate: boolean;
  rawTemplateId?: string;
  errors: string[];
  warnings: string[];
}

export interface ResolutionOptions {
  extractedData: Partial<NormalizedInvoice> | null;
  manualClient?: InvoiceParty | null;
  manualTemplateId?: string | null;
  manualIsGST?: boolean | null;
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
