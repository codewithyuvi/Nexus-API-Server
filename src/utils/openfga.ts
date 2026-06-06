import { OpenFgaClient, CredentialsMethod } from '@openfga/sdk';

const storeId = process.env.FGA_STORE_ID;

if (!storeId) {
  console.warn('FGA_STORE_ID is missing in environment variables');
}

export const fgaClient = new OpenFgaClient({
  apiUrl: process.env.FGA_API_URL || "https://api.us1.fga.dev",
  storeId: storeId || "",
  ...(process.env.FGA_CLIENT_ID && {
    credentials: {
      method: CredentialsMethod.ClientCredentials,
      config: {
        apiTokenIssuer: "auth.fga.dev",
        apiAudience: "https://api.us1.fga.dev/",
        clientId: process.env.FGA_CLIENT_ID,
        clientSecret: process.env.FGA_CLIENT_SECRET!,
      },
    },
  }),
});