import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "687e9b4fb476f543ec6862cd", 
  requiresAuth: true // Ensure authentication is required for all operations
});
