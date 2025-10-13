/**
 * API Route for Checkout Session Creation
 * Creates a Shopify checkout session from the current cart
 * @see https://shopify.dev/docs/api/storefront
 */

import {json} from '@shopify/remix-oxygen';

/**
 * POST /api/checkout-session
 * Creates a checkout session and returns the checkout URL
 * @param {ActionFunctionArgs}
 */
export async function action({request, context}) {
  if (request.method !== 'POST') {
    return json(
      {success: false, error: 'Method not allowed'}, 
      {status: 405}
    );
  }

  const {cart} = context;

  try {
    // Parse request body
    const body = await request.json();
    const {cartId} = body;

    if (!cartId) {
      return json(
        {success: false, error: 'Cart ID is required'}, 
        {status: 400}
      );
    }

    // Get the current cart data
    const cartData = await cart.get();

    if (!cartData || !cartData.lines || cartData.lines.length === 0) {
      return json(
        {success: false, error: 'Cart is empty'}, 
        {status: 400}
      );
    }

    // Shopify cart already includes checkoutUrl
    if (cartData.checkoutUrl) {
      return json({
        success: true,
        checkoutUrl: cartData.checkoutUrl,
        checkoutId: cartData.id,
        totalQuantity: cartData.totalQuantity,
        totalAmount: cartData.cost?.totalAmount,
      });
    }

    // If no checkoutUrl, something is wrong with the cart
    return json(
      {
        success: false, 
        error: 'No checkout URL available for this cart'
      }, 
      {status: 500}
    );

  } catch (error) {
    console.error('[API Checkout Session] Error:', error);
    return json(
      {
        success: false, 
        error: 'Failed to create checkout session',
        details: error.message
      }, 
      {status: 500}
    );
  }
}

/**
 * GET is not supported - return method not allowed
 */
export async function loader() {
  return json(
    {success: false, error: 'Use POST to create checkout session'}, 
    {status: 405}
  );
}

/** @typedef {import('@shopify/remix-oxygen').ActionFunctionArgs} ActionFunctionArgs */
