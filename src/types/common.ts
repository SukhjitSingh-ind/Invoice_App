export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
}

export type ValidationErrors = Record<string, string>;
