/**
 * Shopify Product Integration for 3D Menu System
 * Fetches and processes Shopify products for the 3D menu
 */

/**
 * Fetch Shopify product by handle for menu integration
 * @param {string} handle - Product handle from Shopify
 * @returns {Promise<Object|null>} Product data or null if not found
 */
export async function fetchShopifyProductByHandle(handle) {
  if (!handle) return null;

  try {
    const response = await fetch(`/api/products-3d?collection=all-direct`);
    const data = await response.json();
    
    if (!data.success || !data.products) {
      console.warn('Failed to fetch products from API');
      return null;
    }

    // Find product by handle
    const product = data.products.find(p => p.handle === handle);
    
    if (!product) {
      console.warn(`Product with handle "${handle}" not found`);
      return null;
    }

    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
      productType: product.productType,
      price: product.priceRange?.minVariantPrice,
      isAvailable: product.variants?.nodes?.[0]?.availableForSale,
      featuredImage: product.featuredImage,
      glbUrl: product.model3D?.glbUrl,
      videoUrl: product.model3D?.videoUrl,
      audioUrl: product.model3D?.audioUrl,
      floatingText: product.model3D?.floatingText,
      tooltipText: product.model3D?.tooltipText,
      hasGLBModel: product.menuIntegration?.hasGLBModel,
      tags: product.tags,
      metafields: product.metafields,
      media: product.media
    };
  } catch (error) {
    console.error(`Error fetching product "${handle}":`, error);
    return null;
  }
}

/**
 * Load Digital Products submenu with live Shopify data
 * @returns {Promise<Array>} Enhanced digital products submenu
 */
export async function loadDigitalProductsSubmenu() {
  try {
    // Fetch menu structure
    const menuResponse = await fetch('/api/test-3d');
    const menuData = await menuResponse.json();
    
    if (!menuData.success) {
      throw new Error('Failed to load menu structure');
    }

    // Find Digital Products submenu
    const digitalProductsMenu = menuData.menuStructure?.mainMenu?.find(
      item => item.id === 'digital_products'
    );

    if (!digitalProductsMenu?.submenu) {
      throw new Error('Digital Products submenu not found');
    }

    // Enhance each submenu item with Shopify data
    const enhancedSubmenu = await Promise.all(
      digitalProductsMenu.submenu.map(async (item) => {
        if (!item.shopifyHandle) {
          return item;
        }

        const shopifyProduct = await fetchShopifyProductByHandle(item.shopifyHandle);
        
        return {
          ...item,
          shopifyProduct,
          // Update GLB path if available from Shopify
          model3D: {
            ...item.model3D,
            glbPath: shopifyProduct?.glbUrl || item.model3D?.glbPath
          }
        };
      })
    );

    return enhancedSubmenu;
  } catch (error) {
    console.error('Error loading Digital Products submenu:', error);
    return [];
  }
}

/**
 * Extract GLB URL from various Shopify product sources
 * @param {Object} shopifyProduct - Raw Shopify product data
 * @returns {string|null} GLB URL or null
 */
export function extractGLBFromShopifyProduct(shopifyProduct) {
  if (!shopifyProduct) return null;

  // Check processed model3D data first
  if (shopifyProduct.model3D?.glbUrl) {
    return shopifyProduct.model3D.glbUrl;
  }

  // Check GLB URL directly
  if (shopifyProduct.glbUrl) {
    return shopifyProduct.glbUrl;
  }

  // Check metafields
  if (shopifyProduct.metafields) {
    const model3DField = shopifyProduct.metafields.find(field => 
      field?.namespace === 'custom' && field?.key === 'model_3d'
    );
    
    if (model3DField?.reference?.sources) {
      const glbSource = model3DField.reference.sources.find(source => 
        source.format === 'glb' || source.mimeType === 'model/gltf-binary'
      );
      if (glbSource?.url) return glbSource.url;
    }
    
    if (model3DField?.value && model3DField.value.includes('.glb')) {
      return model3DField.value;
    }
  }

  // Check media nodes
  if (shopifyProduct.media?.nodes) {
    const glbMedia = shopifyProduct.media.nodes.find(media => 
      media.sources?.some(source => 
        source.format === 'glb' || 
        source.mimeType === 'model/gltf-binary' ||
        source.url?.includes('.glb')
      )
    );
    
    if (glbMedia?.sources) {
      const glbSource = glbMedia.sources.find(source => 
        source.format === 'glb' || source.mimeType === 'model/gltf-binary'
      );
      if (glbSource?.url) return glbSource.url;
    }
  }

  return null;
}

/**
 * Create content data for 3D display
 * @param {Object} menuItem - Menu item
 * @param {Object} shopifyProduct - Shopify product data
 * @returns {Object} Content data for 3D rendering
 */
export function createContentDataFor3D(menuItem, shopifyProduct = null) {
  const title = shopifyProduct?.title || menuItem.label || 'Product';
  const description = shopifyProduct?.description || menuItem.description || '';
  
  // Determine GLB URL priority: Shopify > Menu Structure > Fallback
  let glbUrl = null;
  if (shopifyProduct) {
    glbUrl = extractGLBFromShopifyProduct(shopifyProduct);
  }
  if (!glbUrl && menuItem.model3D?.glbPath) {
    glbUrl = menuItem.model3D.glbPath;
  }
  if (!glbUrl) {
    glbUrl = `/assets/models/products/${menuItem.id}.glb`;
  }

  return {
    title,
    description,
    glbUrl,
    price: shopifyProduct?.price,
    productType: shopifyProduct?.productType,
    isAvailable: shopifyProduct?.isAvailable,
    tags: shopifyProduct?.tags,
    shopifyHandle: menuItem.shopifyHandle,
    menuItem,
    shopifyProduct,
    metafields: {
      ...menuItem.metafields,
      ...(shopifyProduct?.metafields || {})
    }
  };
}
