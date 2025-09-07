/**
 * Simple test endpoint to verify client-side API calls
 */

import { json } from '@shopify/remix-oxygen';

export async function loader() {
  return json({
    success: true,
    message: 'Client API test successful',
    timestamp: new Date().toISOString()
  });
}
