import { BankDetails } from './common';

export interface ValidationSettings {
  requireInvoiceNumber: boolean;
  requireClientName: boolean;
  requireClientMobile: boolean;
  priceGreaterThanZero: boolean;
  quantityGreaterThanZero: boolean;
  requireItemDescription: boolean;
}

export interface DisplaySettings {
  showLogo: boolean;
  showQrCode: boolean;
  showUnit: boolean;
}

export interface PaymentSettings {
  upiId: string;
  payeeName: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  address: string;
  state: string;
  phone: string;
  email: string;
  gstNumber: string;
  bankDetails: BankDetails;
  logo?: string;
}

export interface AppSettings {
  validation: ValidationSettings;
  display: DisplaySettings;
  payment: PaymentSettings;
  companyProfiles: CompanyProfile[];
  activeProfileId: string;
}
