import Dexie from 'dexie';
import { DATABASE_NAME, TABLE_NAMES } from '../constants/index.js';

export class InvoiceAppDatabase extends Dexie {
    constructor() {
        super(DATABASE_NAME);

        this.version(1).stores({
            [TABLE_NAMES.INVOICES]: 'id, number, date, IsGST, IsIGST, template, recipient.name, recipient.gstNumber',
            [TABLE_NAMES.CLIENTS]: 'id, name, mobile, email, gstNumber, createdAt',
            [TABLE_NAMES.ITEMS]: 'id, name, hsnSac, defaultPrice, createdAt',
            [TABLE_NAMES.COMPANIES]: 'id, name, gstNumber, isDefault',
            [TABLE_NAMES.SETTINGS]: 'key'
        });
    }
}

export const db = new InvoiceAppDatabase();
