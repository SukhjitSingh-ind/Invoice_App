export interface InvoiceTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  previewColor: string;
  layout: 'classic' | 'modern';
  paperClass: string;
}
