import Dexie from 'dexie';

export class InvoiceAppDatabase extends Dexie {
    constructor() {
        super('InvoiceAppDB');

        this.version(1).stores({
            invoices: 'id, number, date, IsGST, IsIGST, template, recipient.name, recipient.gstNumber',
            clients: 'id, name, mobile, email, gstNumber, createdAt',
            items: 'id, name, hsnSac, defaultPrice, createdAt',
            companies: 'id, name, gstNumber, isDefault',
            settings: 'key'
        });
    }
}

export const db = new InvoiceAppDatabase();
