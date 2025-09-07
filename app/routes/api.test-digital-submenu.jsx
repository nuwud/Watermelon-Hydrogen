/**
 * API Route: Test Digital Products Submenu Integration
 * Demonstrates the connection between menu structure and Shopify products
 */

import { json } from '@shopify/remix-oxygen';

export async function loader({ context }) {
  try {
    // Load menu structure
    const menuStructure = await import('../../../nuwud-menu-structure.json');
    
    // Find Digital Products submenu
    const digitalProductsMenu = menuStructure.default.menuStructure.items.find(
      item => item.id === 'digital_products'
    );

    if (!digitalProductsMenu?.submenu) {
      return json({
        success: false,
        error: 'Digital Products submenu not found',
        menuItems: []
      });
    }

    // Extract submenu items with their Shopify handles
    const submenuItems = digitalProductsMenu.submenu.map(item => ({
      id: item.id,
      label: item.label,
      shopifyHandle: item.shopifyHandle,
      glbPath: item.model3D?.glbPath,
      url: item.url,
      metafields: item.metafields
    }));

    // Fetch all Shopify products directly using the storefront API
    // Instead of making a recursive API call
    const { storefront } = context;
    
    const ALL_PRODUCTS_QUERY = `#graphql
      query AllProducts {
        products(first: 50) {
          nodes {
            id
            title
            handle
            description
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            media(first: 5) {
              nodes {
                ... on Model3d {
                  id
                  sources {
                    url
                    mimeType
                    format
                  }
                }
              }
            }
          }
        }
      }
    `;

    const { products } = await storefront.query(ALL_PRODUCTS_QUERY);

    if (!products?.nodes) {
      return json({
        success: false,
        error: 'Failed to fetch Shopify products',
        menuItems: submenuItems,
        shopifyProducts: []
      });
    }

    // Map submenu items to Shopify products
    const mappedItems = submenuItems.map(menuItem => {
      const shopifyProduct = products.nodes.find(p => p.handle === menuItem.shopifyHandle);
      
      return {
        ...menuItem,
        shopifyProduct: shopifyProduct ? {
          id: shopifyProduct.id,
          title: shopifyProduct.title,
          handle: shopifyProduct.handle,
          description: shopifyProduct.description,
          glbUrl: shopifyProduct.media?.nodes?.find(m => m.sources?.some(s => s.format === 'glb'))?.sources?.find(s => s.format === 'glb')?.url,
          price: shopifyProduct.priceRange?.minVariantPrice,
          hasGLBModel: shopifyProduct.media?.nodes?.some(m => m.sources?.some(s => s.format === 'glb'))
        } : null,
        hasShopifyMatch: !!shopifyProduct,
        glbUrlSource: shopifyProduct?.media?.nodes?.find(m => m.sources?.some(s => s.format === 'glb')) ? 'shopify' : 
                     menuItem.glbPath ? 'menu' : 'fallback'
      };
    });

    return json({
      success: true,
      totalMenuItems: submenuItems.length,
      totalShopifyProducts: products.nodes.length,
      matchedItems: mappedItems.filter(item => item.hasShopifyMatch).length,
      unmatchedItems: mappedItems.filter(item => !item.hasShopifyMatch).length,
      mappedItems,
      analysis: {
        allMenuItemsHaveShopifyHandles: submenuItems.every(item => item.shopifyHandle),
        allShopifyProductsHaveGLB: products.nodes.every(p => p.media?.nodes?.some(m => m.sources?.some(s => s.format === 'glb'))),
        menuGLBPaths: submenuItems.map(item => ({ id: item.id, glbPath: item.glbPath })),
        shopifyGLBUrls: products.nodes.map(p => ({ 
          handle: p.handle, 
          glbUrl: p.media?.nodes?.find(m => m.sources?.some(s => s.format === 'glb'))?.sources?.find(s => s.format === 'glb')?.url 
        }))
      }
    });

  } catch (error) {
    console.error('Error testing digital submenu integration:', error);
    
    return json({
      success: false,
      error: error.message,
      menuItems: [],
      shopifyProducts: []
    }, { status: 500 });
  }
}
