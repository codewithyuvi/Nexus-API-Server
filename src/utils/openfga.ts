import { OpenFgaClient } from '@openfga/sdk';

const storeId = process.env.FGA_STORE_ID;

if (!storeId) {
  throw new Error('FGA_STORE_ID is missing in environment variables');
}

export const fgaClient = new OpenFgaClient({
  apiUrl: process.env.FGA_API_URL || 'http://localhost:8080',
  storeId,
});