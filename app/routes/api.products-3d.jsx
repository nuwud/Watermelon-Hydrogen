/**
 * API Route: Shopify Products for 3D Menu (Simplified)
 * Fetches Shopify products with 3D model metadata for menu integration
 */

import { json } from '@shopify/remix-oxygen';

export async function loader({ request, context }) {
  const { storefront } = context;
  const url = new URL(request.url);
  const collection = url.searchParams.get('collection') || 'all';
  const handle = url.searchParams.get('handle');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const listCollections = url.searchParams.get('list') === 'collections';

  try {
    // If requested, list all collections
    if (listCollections) {
      const COLLECTIONS_QUERY = `#graphql
        query Collections {
          collections(first: 50) {
            nodes {
              id
              title
              handle
              description
              products(first: 1) {
                nodes {
                  id
                }
              }
            }
          }
        }
      `;

      const { collections } = await storefront.query(COLLECTIONS_QUERY);
      return json({ collections: collections.nodes });
    }

    // Simple product query without fragments for now
    const SIMPLE_PRODUCT_QUERY = `#graphql
      query Collection($handle: String!) {
        collection(handle: $handle) {
          id
          title
          handle
          description
          products(first: 50) {
            nodes {
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
              media(first: 20) {
                nodes {
                  ... on Model3d {
                    id
                    mediaContentType
                    sources {
                      url
                      mimeType
                      format
                      filesize
                    }
                  }
                  ... on MediaImage {
                    id
                    mediaContentType
                    image {
                      url
                      altText
                      width
                      height
                    }
                  }
                  ... on Video {
                    id
                    mediaContentType
                    sources {
                      url
                      mimeType
                      format
                      height
                      width
                    }
                  }
                }
              }
              metafields(identifiers: [
                {namespace: "custom", key: "model_3d"},
                {namespace: "custom", key: "video_preview"},
                {namespace: "custom", key: "floating_text"},
                {namespace: "custom", key: "sound_effects"},
                {namespace: "custom", key: "floating_preview"},
                {namespace: "custom", key: "audio_hover"},
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
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    `;

    // Add a direct all products query
    const ALL_PRODUCTS_QUERY = `#graphql
      query AllProducts($first: Int!) {
        products(first: $first) {
          nodes {
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
                ... on ExternalVideo {
                  id
                  originUrl
                  embedUrl
                }
                ... on MediaImage {
                  id
                  image {
                    url
                    altText
                  }
                }
              }
            }
            metafields(identifiers: [
              {namespace: "custom", key: "model_3d"},
              {namespace: "custom", key: "video_preview"},
              {namespace: "custom", key: "floating_text"},
              {namespace: "custom", key: "sound_effects"},
              {namespace: "custom", key: "floating_preview"},
              {namespace: "custom", key: "audio_hover"},
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
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    `;

    let products = [];

    // If requested, get a specific product by handle
    if (handle) {
      const PRODUCT_BY_HANDLE_QUERY = `#graphql
        query Product($handle: String!) {
          product(handle: $handle) {
            id
            title
            handle
            description
            productType
            tags
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            featuredImage {
              id
              url
              altText
              width
              height
            }
            media(first: 20) {
              nodes {
                ... on Model3d {
                  id
                  sources {
                    url
                    mimeType
                    format
                  }
                }
                ... on MediaImage {
                  id
                  image {
                    url
                    altText
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
              {namespace: "custom", key: "3d_model_url"},
              {namespace: "custom", key: "floating_text"},
              {namespace: "custom", key: "tooltip_text"},
              {namespace: "custom", key: "audio_hover"},
              {namespace: "custom", key: "video_preview"},
              {namespace: "custom", key: "animation_loop"},
              {namespace: "custom", key: "render_priority"}
            ]) {
              namespace
              key
              value
            }
            variants(first: 5) {
              nodes {
                id
                title
                availableForSale
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      `;

      const { product } = await storefront.query(PRODUCT_BY_HANDLE_QUERY, {
        variables: { handle }
      });

      if (!product) {
        return json({
          success: false,
          error: `Product with handle "${handle}" not found`,
          products: [],
          total: 0
        });
      }

      // Process the single product with 3D data
      const processedProduct = extract3DModelData(product);
      
      return json({
        success: true,
        products: [processedProduct],
        total: 1,
        collection: 'single',
        handle,
        generatedAt: new Date().toISOString()
      });
    }

    if (collection === 'all-direct') {
      // Direct query for all products
      try {
        const result = await storefront.query(ALL_PRODUCTS_QUERY, {
          variables: { first: limit }
        });
        products = result?.products?.nodes || [];
      } catch (error) {
        console.error('Failed to fetch all products directly:', error);
        return json({ success: false, error: error.message, products: [], total: 0 });
      }
    } else if (collection === 'all') {
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
          const result = await storefront.query(SIMPLE_PRODUCT_QUERY, {
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
      const result = await storefront.query(SIMPLE_PRODUCT_QUERY, {
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
  if (product.metafields && Array.isArray(product.metafields)) {
    product.metafields.forEach(field => {
      if (field && field.namespace === 'custom') {
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
