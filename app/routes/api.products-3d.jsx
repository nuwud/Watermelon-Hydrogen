/**
 * API Route: Shopify Products for 3D Menu
 * Fetches Shopify products with 3D model metadata for menu integration
 */

import { json } from '@shopify/remix-oxygen';
import { COLLECTION_QUERY } from '../lib/fragments.js';

export async function loader({ request, context }) {
  const { storefront } = context;
  const url = new URL(request.url);
  const collection = url.searchParams.get('collection') || 'all';
  const limit = parseInt(url.searchParams.get('limit') || '50');

  try {
    let products = [];

    if (collection === 'all') {
      // Fetch products from multiple collections for the 3D menu
      const collections = [
        'digital-products',
        'services',
        'web-design',
        'branding',
        'video-animation',
        'ai-automation'
      ];

      const collectionPromises = collections.map(async (collectionHandle) => {
        try {
          const result = await storefront.query(COLLECTION_QUERY, {
            variables: { handle: collectionHandle }
          });
          return result?.collection?.products?.nodes || [];
        } catch (error) {
          console.warn(`Failed to fetch collection ${collectionHandle}:`, error);
          return [];
        }
      });

      const collectionResults = await Promise.all(collectionPromises);
      products = collectionResults.flat();
    } else {
      // Fetch specific collection
      const result = await storefront.query(COLLECTION_QUERY, {
        variables: { handle: collection }
      });
      products = result?.collection?.products?.nodes || [];
    }

    // Limit results
    products = products.slice(0, limit);

    // Process products for 3D menu integration
    const processedProducts = products.map(product => {
      // Extract 3D model URLs from metafields and media
      const model3D = extract3DModelData(product);

      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        description: product.description,
        productType: product.productType,
        tags: product.tags,
        priceRange: product.priceRange,
        featuredImage: product.featuredImage,
        media: product.media,
        metafields: product.metafields,
        variants: product.variants,
        model3D,
        // Additional 3D menu specific data
        menuIntegration: {
          hasGLBModel: !!model3D.glbUrl,
          hasVideoPreview: !!model3D.videoUrl,
          hasAudioEffects: !!model3D.audioUrl,
          floatingText: model3D.floatingText,
          tooltipText: model3D.tooltipText
        }
      };
    });

    return json({
      success: true,
      products: processedProducts,
      total: processedProducts.length,
      collection,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching Shopify products for 3D menu:', error);

    return json({
      success: false,
      error: error.message,
      products: [],
      total: 0
    }, { status: 500 });
  }
}

/**
 * Extract 3D model data from Shopify product
 */
function extract3DModelData(product) {
  const model3D = {
    glbUrl: null,
    videoUrl: null,
    audioUrl: null,
    floatingText: null,
    tooltipText: null
  };

  // 1. Check metafields for 3D data
  if (product.metafields) {
    product.metafields.forEach(field => {
      if (field.namespace === 'custom') {
        switch (field.key) {
          case 'model_3d':
            if (field.reference?.sources) {
              // Handle Model3d reference
              const glbSource = field.reference.sources.find(source =>
                source.format === 'glb' || source.mimeType === 'model/gltf-binary'
              );
              if (glbSource) {
                model3D.glbUrl = glbSource.url;
              }
            } else if (field.value && (field.value.includes('.glb') || field.value.includes('.gltf'))) {
              // Handle direct URL
              model3D.glbUrl = field.value;
            }
            break;

          case 'video_preview':
            if (field.reference?.sources) {
              model3D.videoUrl = field.reference.sources[0]?.url;
            } else if (field.value) {
              model3D.videoUrl = field.value;
            }
            break;

          case 'sound_effects':
          case 'audio_hover':
            if (field.value) {
              model3D.audioUrl = field.value;
            }
            break;

          case 'floating_text':
            model3D.floatingText = field.value;
            break;

          case 'carousel_tooltip':
            model3D.tooltipText = field.value;
            break;
        }
      }
    });
  }

  // 2. Check media for GLB/GLTF files
  if (!model3D.glbUrl && product.media?.nodes) {
    const glbMedia = product.media.nodes.find(media => {
      if (media.sources) {
        return media.sources.some(source =>
          source.format === 'glb' ||
          source.mimeType === 'model/gltf-binary' ||
          source.url.includes('.glb') ||
          source.url.includes('.gltf')
        );
      }
      return false;
    });

    if (glbMedia?.sources) {
      const glbSource = glbMedia.sources.find(source =>
        source.format === 'glb' || source.mimeType === 'model/gltf-binary'
      );
      if (glbSource) {
        model3D.glbUrl = glbSource.url;
      }
    }
  }

  // 3. Generate fallback GLB path based on product handle
  if (!model3D.glbUrl) {
    const productHandle = product.handle || 'default';
    if (product.productType === 'Digital Download' || product.tags?.includes('digital')) {
      model3D.glbUrl = `/assets/models/digital-products/${productHandle}.glb`;
    } else if (product.tags?.includes('service')) {
      model3D.glbUrl = `/assets/models/services/${productHandle}.glb`;
    } else {
      model3D.glbUrl = `/assets/models/products/${productHandle}.glb`;
    }
  }

  // 4. Generate fallback text content
  if (!model3D.floatingText) {
    model3D.floatingText = product.description ? 
      product.description.substring(0, 100) + '...' : 
      `Explore ${product.title}`;
  }

  if (!model3D.tooltipText) {
    model3D.tooltipText = product.title;
  }

  return model3D;
}

// Handle POST requests for custom product queries
export async function action({ request, context }) {
  const { storefront } = context;

  try {
    const body = await request.json();
    const { productHandles = [], menuStructure = null } = body;

    if (menuStructure) {
      // Map menu structure to products
      const menuItems = menuStructure.menu || [];
      const allProductHandles = [];

      // Extract product handles from menu structure
      menuItems.forEach(item => {
        if (item.id) allProductHandles.push(item.id);
        if (item.submenu) {
          item.submenu.forEach(subitem => {
            if (subitem.id) allProductHandles.push(subitem.id);
          });
        }
      });

      // Fetch products by handles
      const products = await fetchProductsByHandles(storefront, allProductHandles);

      return json({
        success: true,
        products,
        mappedItems: mapProductsToMenuStructure(products, menuStructure)
      });
    }

    // Fetch specific product handles
    if (productHandles.length > 0) {
      const products = await fetchProductsByHandles(storefront, productHandles);
      return json({
        success: true,
        products
      });
    }

    return json({
      success: false,
      error: 'No valid request data provided'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in products API action:', error);
    return json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function fetchProductsByHandles(storefront, handles) {
  const products = [];

  for (const handle of handles) {
    try {
      const result = await storefront.query(`
        query Product($handle: String!) {
          product(handle: $handle) {
            id
            title
            handle
            description
            productType
            tags
            featuredImage {
              id
              url
              altText
              width
              height
            }
            media(first: 10) {
              nodes {
                ... on Model3d {
                  id
                  sources {
                    url
                    mimeType
                    format
                  }
                }
                ... on Video {
                  id
                  sources {
                    url
                    mimeType
                  }
                }
              }
            }
            metafields(identifiers: [
              {namespace: "custom", key: "model_3d"},
              {namespace: "custom", key: "video_preview"},
              {namespace: "custom", key: "floating_text"},
              {namespace: "custom", key: "carousel_tooltip"}
            ]) {
              namespace
              key
              value
              type
              reference {
                ... on Model3d {
                  sources {
                    url
                    mimeType
                    format
                  }
                }
              }
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              nodes {
                id
                title
                availableForSale
              }
            }
          }
        }
      `, {
        variables: { handle }
      });

      if (result?.product) {
        products.push(result.product);
      }
    } catch (error) {
      console.warn(`Failed to fetch product ${handle}:`, error);
    }
  }

  return products;
}

function mapProductsToMenuStructure(products, menuStructure) {
  // Map products to menu items based on handles/IDs
  const productMap = {};
  products.forEach(product => {
    productMap[product.handle] = product;
  });

  const mappedMenu = menuStructure.menu.map(item => ({
    ...item,
    product: productMap[item.id] || null,
    submenu: item.submenu?.map(subitem => ({
      ...subitem,
      product: productMap[subitem.id] || null
    })) || []
  }));

  return mappedMenu;
}