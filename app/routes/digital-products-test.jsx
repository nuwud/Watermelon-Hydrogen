/**
 * Test page for Digital Products 3D Menu Integration
 * Tests the complete flow from submenu selection to Shopify product display
 */

import { useState } from 'react';
import { json } from '@shopify/remix-oxygen';
import { useLoaderData } from '@remix-run/react';
import Carousel3DSubmenuEnhanced from '~/components/Carousel3DPro/Carousel3DSubmenuEnhanced';
import CentralContentPanelEnhanced from '~/components/Carousel3DPro/CentralContentPanelEnhanced';

export async function loader({ request }) {
  try {
    // Load menu structure
    const menuResponse = await fetch(`${new URL(request.url).origin}/api/test-3d`);
    const menuData = await menuResponse.json();
    
    // Load Shopify products
    const productsResponse = await fetch(`${new URL(request.url).origin}/api/products-3d?collection=all&limit=20`);
    const productsData = await productsResponse.json();

    return json({
      menuStructure: menuData.menuStructure,
      products: productsData.products || [],
      success: menuData.success && productsData.success
    });
  } catch (error) {
    console.error('Error in digital-products-test loader:', error);
    return json({ 
      menuStructure: null, 
      products: [], 
      success: false, 
      error: error.message 
    });
  }
}

export default function DigitalProductsTest() {
  const { menuStructure, products, success, error } = useLoaderData();
  const [selectedSubmenuItem, setSelectedSubmenuItem] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showGreenRing, setShowGreenRing] = useState(false);

  // Find Digital Products submenu
  const digitalProductsMenu = menuStructure?.mainMenu?.find(item => 
    item.id === 'digital-products'
  );

  const submenuItems = digitalProductsMenu?.submenu || [];

  // Handle submenu item selection
  const handleSubmenuItemClick = async (item) => {
    console.log('Submenu item selected:', item);
    setSelectedSubmenuItem(item);
    
    // Find matching Shopify product
    const matchingProduct = products.find(product => 
      product.handle?.includes(item.id) ||
      product.title?.toLowerCase().includes(item.label?.toLowerCase()) ||
      product.tags?.some(tag => tag.toLowerCase().includes(item.id.toLowerCase()))
    );
    
    console.log('Matching Shopify product:', matchingProduct);
    setSelectedProduct(matchingProduct);
  };

  const handleSubmenuItemHover = (item) => {
    console.log('Submenu item hovered:', item?.label || 'none');
  };

  const handleContentLoad = (data) => {
    console.log('Content loaded in central panel:', data);
  };

  const handleContentError = (error) => {
    console.error('Content load error:', error);
  };

  if (!success) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h1>Error Loading Test</h1>
        <p>{error || 'Failed to load test data'}</p>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#00ff96',
      fontFamily: 'Arial, sans-serif',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '15px',
        borderRadius: '8px',
        minWidth: '300px'
      }}>
        <h2 style={{ margin: '0 0 15px 0', color: '#00ff96' }}>
          Digital Products 3D Menu Test
        </h2>
        
        <div style={{ marginBottom: '15px' }}>
          <strong>Menu Items:</strong> {submenuItems.length}<br/>
          <strong>Products:</strong> {products.length}<br/>
          <strong>Selected:</strong> {selectedSubmenuItem?.label || 'None'}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={() => setShowGreenRing(!showGreenRing)}
            style={{
              background: showGreenRing ? '#00ff96' : 'rgba(0, 255, 150, 0.2)',
              color: showGreenRing ? '#000' : '#00ff96',
              border: '1px solid #00ff96',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            {showGreenRing ? 'Hide' : 'Show'} Green Ring
          </button>
        </div>

        {selectedSubmenuItem && (
          <div style={{ 
            background: 'rgba(0, 255, 150, 0.1)', 
            padding: '10px', 
            borderRadius: '4px',
            marginBottom: '15px'
          }}>
            <h4 style={{ margin: '0 0 8px 0' }}>Selected Item:</h4>
            <div style={{ fontSize: '12px' }}>
              <strong>ID:</strong> {selectedSubmenuItem.id}<br/>
              <strong>Label:</strong> {selectedSubmenuItem.label}<br/>
              <strong>GLB Path:</strong> {selectedSubmenuItem.model3D?.glbPath || 'Auto-generated'}
            </div>
          </div>
        )}

        {selectedProduct && (
          <div style={{ 
            background: 'rgba(0, 100, 255, 0.1)', 
            padding: '10px', 
            borderRadius: '4px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#00ddff' }}>Shopify Product:</h4>
            <div style={{ fontSize: '12px' }}>
              <strong>Title:</strong> {selectedProduct.title}<br/>
              <strong>Handle:</strong> {selectedProduct.handle}<br/>
              <strong>Type:</strong> {selectedProduct.productType}<br/>
              <strong>GLB:</strong> {selectedProduct.model3D?.glbUrl ? '✅ Found' : '❌ Not found'}
            </div>
          </div>
        )}
      </div>

      {/* Submenu on the left */}
      <div style={{
        position: 'absolute',
        left: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '300px',
        height: '400px',
        zIndex: 50
      }}>
        <Carousel3DSubmenuEnhanced
          items={submenuItems}
          shopifyProducts={products}
          onItemClick={handleSubmenuItemClick}
          onItemHover={handleSubmenuItemHover}
          selectedMainItem={digitalProductsMenu}
          isVisible={true}
        />
      </div>

      {/* Central content panel */}
      <div style={{
        position: 'absolute',
        right: '20px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '500px',
        height: '600px',
        zIndex: 50
      }}>
        <CentralContentPanelEnhanced
          selectedItem={selectedSubmenuItem}
          shopifyProduct={selectedProduct}
          isVisible={true}
          showGreenRing={showGreenRing}
          onContentLoad={handleContentLoad}
          onError={handleContentError}
        />
      </div>

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '15px 30px',
        borderRadius: '8px',
        textAlign: 'center',
        color: '#00ff96'
      }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          Click on submenu items on the left to see Shopify products displayed in the center panel
        </p>
      </div>
    </div>
  );
}
