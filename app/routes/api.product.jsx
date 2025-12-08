/**
 * API Route for Product Data
 * Provides JSON product data for the content manager
 */

import {data} from 'react-router';
import {PRODUCT_QUERY} from '~/lib/fragments';

/**
 * @param {LoaderFunctionArgs}
 */
export async function loader({request, context}) {
  const {storefront} = context;
  const url = new URL(request.url);
  const handle = url.searchParams.get('handle');

  if (!handle) {
    return data({
      success: false,
      error: 'Product handle is required'
    }, {status: 400});
  }

  try {
    const {product} = await storefront.query(PRODUCT_QUERY, {
      variables: {
        handle,
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    });

    if (!product?.id) {
      return data({
        success: false,
        error: `Product not found: ${handle}`
      }, {status: 404});
    }

    // Return simplified product data for content manager
    return data({
      success: true,
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        descriptionHtml: product.descriptionHtml,
        images: product.images,
        selectedOrFirstAvailableVariant: product.selectedOrFirstAvailableVariant,
        variants: product.variants,
        options: product.options,
        tags: product.tags,
        vendor: product.vendor,
        productType: product.productType,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }
    });

  } catch (error) {
    console.error('[API] Error fetching product:', error);
    return data({
      success: false,
      error: `Failed to fetch product: ${error.message}`
    }, {status: 500});
  }
}

/** @typedef {import('@shopify/remix-oxygen').LoaderFunctionArgs} LoaderFunctionArgs */
