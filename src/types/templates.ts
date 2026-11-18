export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  previewColor: string;
  layout: 'classic' | 'modern';
  paperClass: string;
}

export interface DbInvoiceTemplate {
  id?: number;
  name: string;
  key?: string;
  isDefault: boolean;
  isBuiltIn: boolean;
  html: string;
  css: string;
  updatedAt: Date;
}
