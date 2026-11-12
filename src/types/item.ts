export interface PriceHistoryEntry {
  price: number;
  date: string;
  invoiceId?: number;
}

export interface CatalogItem {
  id: number;
  name: string;
  description: string;
  defaultPrice: number;
  hsnSac: string;
  unit: string;
  gstRate: number;
  priceHistory?: PriceHistoryEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export type CatalogItemInput = Omit<CatalogItem, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: number;
};
