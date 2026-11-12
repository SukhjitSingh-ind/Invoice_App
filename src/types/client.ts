export interface Client {
  id: number;
  name: string;
  mobile: string;
  email: string;
  gstNumber: string;
  address: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: number;
};

export interface ClientPaginationData {
  items: Client[];
  page: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
