/**
 * Test page for Digital Products 3D Menu Integration
 * Demonstrates the live Shopify product GLB integration
 */

import { useState, useEffect } from 'react';
import ClientOnly from '../components/ClientOnly';
import CentralContentPanelEnhanced from '../components/Carousel3DPro/CentralContentPanelEnhanced.jsx';

export default function DigitalProducts3DTest() {
  return (
    <ClientOnly fallback={
      <div className="digital-products-test loading">
        <h1>Loading Digital Products 3D Menu...</h1>
        <div className="loading-spinner"></div>
      </div>
    }>
      {() => <DigitalProducts3DTestClient />}
    </ClientOnly>
  );
}

function DigitalProducts3DTestClient() {
  const [submenuItems, setSubmenuItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [shopifyProduct, setShopifyProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGreenRing, setShowGreenRing] = useState(true);

  // Load digital products submenu
  const loadDigitalProductsSubmenu = async () => {
    try {
      console.log('🍉 Fetching from /api/test-digital-submenu...');
      // Use the working test API endpoint directly
      const response = await fetch('/api/test-digital-submenu');
      console.log('🍉 API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('🍉 API response data:', data);
      
      if (!data.success) {
        throw new Error('Failed to load digital submenu integration');
      }

      console.log('🍉 Returning mapped items:', data.mappedItems?.length || 0);
      // Return the mapped items from the API response
      return data.mappedItems || [];
    } catch (error) {
      console.error('🍉 Error in loadDigitalProductsSubmenu:', error);
      return [];
    }
  };

  // Load digital products submenu on component mount
  useEffect(() => {
    const loadSubmenu = async () => {
      try {
        console.log('🍉 Starting to load submenu...');
        setLoading(true);
        const items = await loadDigitalProductsSubmenu();
        console.log('🍉 Submenu items loaded:', items);
        setSubmenuItems(items);
        
        // Auto-select first item for demo
        if (items.length > 0) {
          console.log('🍉 Auto-selecting first item:', items[0]);
          setSelectedItem(items[0]);
          setShopifyProduct(items[0].shopifyProduct);
        } else {
          console.warn('🍉 No items loaded from submenu');
        }
      } catch (error) {
        console.error('🍉 Error loading digital products submenu:', error);
      } finally {
        console.log('🍉 Setting loading to false');
        setLoading(false);
      }
    };

    loadSubmenu();
  }, []);

  // Handle item selection from submenu
  const handleItemClick = (item) => {
    setSelectedItem(item);
    setShopifyProduct(item.shopifyProduct);
  };

  const handleContentLoad = (data) => {
    console.log('Content loaded:', data);
  };

  const handleError = (error) => {
    console.error('Content error:', error);
  };

  if (loading) {
    return (
      <div className="digital-products-test loading">
        <h1>Loading Digital Products 3D Menu...</h1>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="digital-products-test">
      <h1>Digital Products 3D Menu Test</h1>
      <p>Testing live Shopify product integration with GLB models</p>
      
      {/* Admin Controls */}
      <div className="admin-controls">
        <button 
          onClick={() => setShowGreenRing(!showGreenRing)}
          className="toggle-btn"
        >
          {showGreenRing ? 'Hide' : 'Show'} Green Ring
        </button>
        <div className="status">
          Items loaded: {submenuItems.length} | 
          Selected: {selectedItem?.label || 'None'} |
          Has Shopify Data: {shopifyProduct ? 'Yes' : 'No'}
        </div>
      </div>

      {/* Display current selection info */}
      {selectedItem && (
        <div className="selection-info">
          <h3>{selectedItem.label}</h3>
          {selectedItem.shopifyProduct && (
            <div className="shopify-info">
              <p><strong>Shopify Title:</strong> {selectedItem.shopifyProduct.title}</p>
              <p><strong>GLB URL:</strong> {selectedItem.shopifyProduct.glbUrl || 'Not found'}</p>
              <p><strong>Price:</strong> {selectedItem.shopifyProduct.price ? `$${selectedItem.shopifyProduct.price.amount}` : 'N/A'}</p>
              <p><strong>Available:</strong> {selectedItem.shopifyProduct.isAvailable ? 'Yes' : 'No'}</p>
            </div>
          )}
        </div>
      )}

      {/* 3D Components Layout */}
      <div className="layout-3d">
        {/* Submenu on the left */}
        <div className="submenu-section">
          <h3>Digital Products Submenu</h3>
          <div className="simple-submenu">
            {submenuItems.map((item, index) => (
              <button
                key={item.id || index}
                className={`menu-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                onClick={() => handleItemClick(item)}
                type="button"
              >
                <div className="item-title">{item.label}</div>
                {item.shopifyProduct && (
                  <div className="item-info">
                    <span className="glb-status">
                      {item.shopifyProduct.glbUrl ? '🟢 GLB' : '🔴 No GLB'}
                    </span>
                    <span className="price">
                      ${item.shopifyProduct.price?.amount || '0.00'}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Central content panel on the right */}
        <div className="content-section">
          <h3>3D Product Display</h3>
          <ClientOnly fallback={<div style={{ color: 'orange' }}>🌀 Loading 3D Scene…</div>}>
            {() => (
              <CentralContentPanelEnhanced
                selectedItem={selectedItem}
                shopifyProduct={shopifyProduct}
                isVisible={true}
                showGreenRing={showGreenRing}
                onContentLoad={handleContentLoad}
                onError={handleError}
              />
            )}
          </ClientOnly>
        </div>
      </div>

      {/* Debug Info */}
      <div className="debug-section">
        <h3>Debug Information</h3>
        <details>
          <summary>Submenu Items ({submenuItems.length})</summary>
          <pre>{JSON.stringify(submenuItems, null, 2)}</pre>
        </details>
        
        {selectedItem && (
          <details>
            <summary>Selected Item</summary>
            <pre>{JSON.stringify(selectedItem, null, 2)}</pre>
          </details>
        )}
        
        {shopifyProduct && (
          <details>
            <summary>Shopify Product</summary>
            <pre>{JSON.stringify(shopifyProduct, null, 2)}</pre>
          </details>
        )}
      </div>

      {/* Styling */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .digital-products-test {
          padding: 20px;
          font-family: 'Courier New', monospace;
          background: #0a0a0a;
          color: #00ff96;
          min-height: 100vh;
        }

        .digital-products-test.loading {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(0, 255, 150, 0.3);
          border-top: 3px solid #00ff96;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .admin-controls {
          background: rgba(0, 255, 150, 0.1);
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border: 1px solid #00ff96;
        }

        .toggle-btn {
          background: rgba(0, 255, 150, 0.2);
          border: 1px solid #00ff96;
          color: #00ff96;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 15px;
        }

        .toggle-btn:hover {
          background: rgba(0, 255, 150, 0.4);
        }

        .status {
          display: inline-block;
          font-size: 12px;
        }

        .selection-info {
          background: rgba(0, 100, 200, 0.1);
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
          border: 1px solid #00ddff;
        }

        .shopify-info {
          margin-top: 10px;
          font-size: 12px;
        }

        .shopify-info p {
          margin: 5px 0;
        }

        .layout-3d {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 20px;
          margin: 20px 0;
          min-height: 600px;
        }

        .submenu-section, .content-section {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid #333;
          border-radius: 8px;
          padding: 15px;
        }

        .submenu-section h3, .content-section h3 {
          margin-top: 0;
          color: #00ff96;
          font-size: 16px;
        }

        .simple-submenu {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .menu-item {
          background: rgba(0, 255, 150, 0.1);
          border: 1px solid rgba(0, 255, 150, 0.3);
          border-radius: 6px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #00ff96;
          text-align: left;
          width: 100%;
        }

        .menu-item:hover {
          background: rgba(0, 255, 150, 0.2);
          border-color: #00ff96;
        }

        .menu-item.selected {
          background: rgba(0, 255, 150, 0.3);
          border-color: #00ff96;
          box-shadow: 0 0 10px rgba(0, 255, 150, 0.5);
        }

        .item-title {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .item-info {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          opacity: 0.8;
        }

        .glb-status {
          margin-right: 10px;
        }

        .debug-section {
          margin-top: 40px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 8px;
        }

        .debug-section details {
          margin: 10px 0;
        }

        .debug-section summary {
          cursor: pointer;
          font-weight: bold;
          color: #ffaa00;
        }

        .debug-section pre {
          background: rgba(0, 0, 0, 0.7);
          padding: 10px;
          border-radius: 4px;
          font-size: 10px;
          overflow-x: auto;
          max-height: 300px;
          overflow-y: auto;
        }
        `
      }} />
    </div>
  );
}
