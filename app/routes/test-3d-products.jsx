/**
 * Test page to display Shopify products with 3D model data
 * This helps verify what GLB files and product data we have available
 */

import { useState, useEffect } from 'react';
import { json } from '@shopify/remix-oxygen';
import { useLoaderData } from '@remix-run/react';

export async function loader({ request }) {
  try {
    // Fetch collections first
    const collectionsResponse = await fetch(`${new URL(request.url).origin}/api/products-3d?list=collections`);
    const collectionsData = await collectionsResponse.json();
    
    // Fetch all products
    const productsResponse = await fetch(`${new URL(request.url).origin}/api/products-3d?collection=all&limit=20`);
    const productsData = await productsResponse.json();

    return json({
      collections: collectionsData.collections || [],
      products: productsData.products || [],
      success: productsData.success
    });
  } catch (error) {
    console.error('Error in test-3d-products loader:', error);
    return json({ 
      collections: [], 
      products: [], 
      success: false, 
      error: error.message 
    });
  }
}

export default function Test3DProducts() {
  const { collections, products, success, error } = useLoaderData();
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [filteredProducts, setFilteredProducts] = useState(products);

  useEffect(() => {
    if (selectedCollection === 'all') {
      setFilteredProducts(products);
    } else {
      // Filter products by collection (this is a simple filter, in real app you'd fetch by collection)
      const filtered = products.filter(product => 
        product.productType?.toLowerCase().includes(selectedCollection.toLowerCase()) ||
        product.tags?.some(tag => tag.toLowerCase().includes(selectedCollection.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [selectedCollection, products]);

  if (!success) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error Loading Products</h1>
        <p>{error || 'Failed to load products'}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Shopify 3D Products Test Page</h1>
      
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Collections Found ({collections.length})</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setSelectedCollection('all')}
            style={{
              padding: '8px 16px',
              background: selectedCollection === 'all' ? '#007cba' : '#ddd',
              color: selectedCollection === 'all' ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            All Products ({products.length})
          </button>
          {collections.map(collection => (
            <button 
              key={collection.id}
              onClick={() => setSelectedCollection(collection.handle)}
              style={{
                padding: '8px 16px',
                background: selectedCollection === collection.handle ? '#007cba' : '#ddd',
                color: selectedCollection === collection.handle ? 'white' : 'black',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {collection.title}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2>Products ({filteredProducts.length})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px' }}>
          {filteredProducts.map(product => (
            <div key={product.id} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '20px',
              background: 'white'
            }}>
              <h3 style={{ color: '#333', marginTop: 0 }}>{product.title}</h3>
              
              <div style={{ marginBottom: '15px' }}>
                <strong>Handle:</strong> {product.handle}<br/>
                <strong>Type:</strong> {product.productType || 'N/A'}<br/>
                <strong>Tags:</strong> {product.tags?.join(', ') || 'None'}
              </div>

              {product.featuredImage && (
                <div style={{ marginBottom: '15px' }}>
                  <img 
                    src={product.featuredImage.url}
                    alt={product.featuredImage.altText || product.title}
                    style={{ width: '100%', maxWidth: '200px', height: 'auto', borderRadius: '4px' }}
                  />
                </div>
              )}

              <div style={{ 
                background: product.model3D?.glbUrl ? '#e8f5e8' : '#fff3cd', 
                padding: '15px', 
                borderRadius: '6px',
                marginBottom: '15px'
              }}>
                <h4 style={{ margin: '0 0 10px 0', color: product.model3D?.glbUrl ? '#155724' : '#856404' }}>
                  3D Model Data
                </h4>
                <div style={{ fontSize: '14px' }}>
                  <strong>GLB URL:</strong> {product.model3D?.glbUrl || 'Not found'}<br/>
                  <strong>Has GLB:</strong> {product.menuIntegration?.hasGLBModel ? '✅ Yes' : '❌ No'}<br/>
                  <strong>Video Preview:</strong> {product.model3D?.videoUrl || 'None'}<br/>
                  <strong>Audio Effects:</strong> {product.model3D?.audioUrl || 'None'}<br/>
                  <strong>Floating Text:</strong> {product.model3D?.floatingText?.substring(0, 50)}...
                </div>
              </div>

              {product.media?.nodes?.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>Media Files ({product.media.nodes.length})</h4>
                  <div style={{ fontSize: '12px', maxHeight: '150px', overflowY: 'auto' }}>
                    {product.media.nodes.map((media) => (
                      <div key={media.id || `media-${media.mediaContentType}`} style={{ 
                        marginBottom: '8px', 
                        padding: '8px', 
                        background: media.mediaContentType?.includes('MODEL') ? '#e8f5e8' : '#f8f9fa',
                        borderRadius: '4px'
                      }}>
                        <strong>Type:</strong> {media.mediaContentType}<br/>
                        {media.sources && (
                          <div>
                            <strong>Sources:</strong>
                            {media.sources.map((source) => (
                              <div key={`${source.url}-${source.format}`} style={{ marginLeft: '10px', fontSize: '11px' }}>
                                • {source.format || source.mimeType} - {source.url}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.metafields?.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <h4 style={{ margin: '0 0 10px 0' }}>Metafields ({product.metafields.length})</h4>
                  <div style={{ fontSize: '12px', maxHeight: '100px', overflowY: 'auto' }}>
                    {product.metafields.map((field) => (
                      <div key={`${field.namespace}-${field.key}`} style={{ marginBottom: '4px' }}>
                        <strong>{field.namespace}.{field.key}:</strong> {field.value?.substring(0, 50)}...
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.priceRange && (
                <div style={{ 
                  color: '#28a745', 
                  fontWeight: 'bold', 
                  fontSize: '18px',
                  marginTop: '15px'
                }}>
                  ${product.priceRange.minVariantPrice.amount} {product.priceRange.minVariantPrice.currencyCode}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {filteredProducts.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          color: '#666',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <h3>No products found</h3>
          <p>Try selecting a different collection or check if products exist in your Shopify store.</p>
        </div>
      )}
    </div>
  );
}
