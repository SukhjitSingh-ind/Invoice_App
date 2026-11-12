import {
    getInitials,
    getClientAvatarStyle,
    filterClients,
    paginateClients,
    getPageNumbers,
    CLIENTS_PER_PAGE
} from './clientHelpers.js';

console.log('Running Client Helper Tests...');

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`✅ ${message}`);
        passed++;
    } else {
        console.error(`❌ ${message}`);
        failed++;
    }
}

// Initials Tests
assert(getInitials('Acme Corp') === 'AC', 'Two-word name generates two initials');
assert(getInitials('Microsoft') === 'MI', 'Single-word name takes first two letters');
assert(getInitials('Tesla Motors Global') === 'TG', 'Three-word name takes first and last initial');
assert(getInitials('') === 'CL', 'Empty name returns fallback CL');
assert(getInitials('   ') === 'CL', 'Whitespace name returns fallback CL');

// Avatar Style Tests
const style1 = getClientAvatarStyle('Acme', 101);
const style2 = getClientAvatarStyle('Acme', 101);
assert(typeof style1 === 'string' && style1.length > 0, 'Generates avatar style string');
assert(style1 === style2, 'Deterministic style based on name and ID');

// Search & Filtering Tests
const sampleClients = [
    { id: 1, name: 'Acme Corporation', mobile: '9876543210', email: 'billing@acme.com', gstNumber: '27AAAAA0000A1Z5', address: '123 Wall St, New York' },
    { id: 2, name: 'Wayne Enterprises', mobile: '8765432109', email: 'bruce@wayne.com', gstNumber: '', address: 'Gotham City' },
    { id: 3, name: 'Stark Industries', mobile: '7654321098', email: 'tony@stark.com', gstNumber: '07BBBBB1111B2Z6', address: 'Malibu, CA' },
];

assert(filterClients(sampleClients, '').length === 3, 'Empty query returns all clients');
assert(filterClients(sampleClients, '   ').length === 3, 'Whitespace query returns all clients');
assert(filterClients(sampleClients, 'acme').length === 1 && filterClients(sampleClients, 'acme')[0].id === 1, 'Filters by name case-insensitively');
assert(filterClients(sampleClients, '8765432109').length === 1 && filterClients(sampleClients, '8765432109')[0].id === 2, 'Filters by mobile number');
assert(filterClients(sampleClients, 'tony@stark').length === 1, 'Filters by email');
assert(filterClients(sampleClients, '27AAAAA').length === 1, 'Filters by GST number');
assert(filterClients(sampleClients, 'Gotham').length === 1, 'Filters by address');
assert(filterClients(sampleClients, 'nonexistent').length === 0, 'No match returns empty array');

// Pagination Tests
const dummyList25 = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, name: `Client ${i + 1}` }));

// Default page size is 10
assert(CLIENTS_PER_PAGE === 10, 'Default CLIENTS_PER_PAGE is 10');

const p1 = paginateClients(dummyList25, 1, 10);
assert(p1.items.length === 10, 'Page 1 returns 10 items');
assert(p1.items[0].id === 1 && p1.items[9].id === 10, 'Page 1 has items 1 to 10');
assert(p1.startIndex === 0 && p1.endIndex === 10, 'Page 1 start/end indices are 0 and 10');
assert(p1.totalPages === 3, '25 items with page size 10 results in 3 total pages');
assert(p1.hasPrevPage === false, 'Page 1 hasPrevPage is false');
assert(p1.hasNextPage === true, 'Page 1 hasNextPage is true');

const p2 = paginateClients(dummyList25, 2, 10);
assert(p2.items.length === 10, 'Page 2 returns 10 items');
assert(p2.items[0].id === 11 && p2.items[9].id === 20, 'Page 2 has items 11 to 20');
assert(p2.hasPrevPage === true && p2.hasNextPage === true, 'Page 2 has both prev and next page');

const p3 = paginateClients(dummyList25, 3, 10);
assert(p3.items.length === 5, 'Page 3 returns remaining 5 items');
assert(p3.items[0].id === 21 && p3.items[4].id === 25, 'Page 3 has items 21 to 25');
assert(p3.hasPrevPage === true, 'Page 3 hasPrevPage is true');
assert(p3.hasNextPage === false, 'Page 3 hasNextPage is false');

// Clamping out-of-bounds page
const pOver = paginateClients(dummyList25, 99, 10);
assert(pOver.page === 3, 'Page > totalPages clamped to totalPages');
const pUnder = paginateClients(dummyList25, -5, 10);
assert(pUnder.page === 1, 'Page < 1 clamped to 1');

// Empty list pagination
const pEmpty = paginateClients([], 1, 10);
assert(pEmpty.items.length === 0, 'Empty list returns 0 items');
assert(pEmpty.totalItems === 0 && pEmpty.totalPages === 1, 'Empty list has totalItems 0 and totalPages 1');
assert(pEmpty.hasPrevPage === false && pEmpty.hasNextPage === false, 'Empty list has neither prev nor next');

// Page Numbers Generator
const pagesSmall = getPageNumbers(1, 5);
assert(JSON.stringify(pagesSmall) === JSON.stringify([1, 2, 3, 4, 5]), 'Small total pages (<=7) displays all numbers');

const pagesLargeStart = getPageNumbers(2, 10);
assert(JSON.stringify(pagesLargeStart) === JSON.stringify([1, 2, 3, 4, 5, '...', 10]), 'Large pages near start displays ellipsis');

const pagesLargeMiddle = getPageNumbers(6, 10);
assert(JSON.stringify(pagesLargeMiddle) === JSON.stringify([1, '...', 5, 6, 7, '...', 10]), 'Large pages near middle displays two ellipses');

const pagesLargeEnd = getPageNumbers(9, 10);
assert(JSON.stringify(pagesLargeEnd) === JSON.stringify([1, '...', 6, 7, 8, 9, 10]), 'Large pages near end displays starting ellipsis');

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
