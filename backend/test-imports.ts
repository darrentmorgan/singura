// Test imports from clerk-auth
import { requireClerkAuth, optionalClerkAuth, getOrganizationId } from './src/middleware/clerk-auth';

console.log('✅ Imports successful');
console.log('requireClerkAuth:', typeof requireClerkAuth);
console.log('optionalClerkAuth:', typeof optionalClerkAuth);
console.log('getOrganizationId:', typeof getOrganizationId);
