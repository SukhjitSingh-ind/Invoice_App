import { getInitials, getClientAvatarStyle, filterClients } from './clientHelpers.js';

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

console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed`);
if (failed > 0) process.exit(1);
