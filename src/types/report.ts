export interface ItemSalesReportEntry {
  itemName: string;
  totalQuantity: number;
  totalRevenue: number;
  timesSold: number;
  priceInstances: Array<{ price: number; date?: string; invoiceNumber?: string }>;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
}

export interface ClientPurchaseItem {
  itemName: string;
  quantity: number;
  totalCost: number;
}

export interface ClientPurchaseReportEntry {
  clientName: string;
  totalInvoices: number;
  totalSpent: number;
  itemsPurchased: ClientPurchaseItem[];
}

export interface SummaryStats {
  totalInvoices: number;
  totalRevenue: number;
  totalTax: number;
  totalReceivables: number;
  paidCount: number;
  unpaidCount: number;
}
