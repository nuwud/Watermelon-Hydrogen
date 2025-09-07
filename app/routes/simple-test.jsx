/**
 * Minimal test page to debug the 3D component
 */

import { useState } from 'react';
import ClientOnly from '../components/ClientOnly';
import CentralContentPanelEnhanced from '../components/Carousel3DPro/CentralContentPanelEnhanced.jsx';

export default function SimpleTest() {
  const [showGreenRing, setShowGreenRing] = useState(true);

  // Mock data for testing
  const mockSelectedItem = {
    id: 'test',
    label: 'Test Product',
    shopifyHandle: 'crystal-seed-interactive-3d-genesis-kit'
  };

  const mockShopifyProduct = {
    id: 'gid://shopify/Product/7647564234800',
    title: 'Crystal Seed – Interactive 3D Genesis Kit',
    handle: 'crystal-seed-interactive-3d-genesis-kit',
    glbUrl: 'https://nx40dr-bu.myshopify.com/cdn/shop/3d/models/o/cc50bed7036f7723/PremiumQuality.glb',
    price: { amount: '497.0', currencyCode: 'USD' },
    hasGLBModel: true
  };

  return (
    <div style={{ 
      padding: '20px', 
      background: '#0a0a0a', 
      color: '#00ff96', 
      minHeight: '100vh',
      fontFamily: 'monospace'
    }}>
      <h1>🍉 Simple 3D Test</h1>
      <p>Testing CentralContentPanelEnhanced component directly</p>
      
      <button 
        onClick={() => setShowGreenRing(!showGreenRing)}
        style={{
          background: 'rgba(0, 255, 150, 0.2)',
          border: '1px solid #00ff96',
          color: '#00ff96',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        {showGreenRing ? 'Hide' : 'Show'} Green Ring
      </button>

      <div style={{ 
        width: '100%', 
        height: '600px', 
        border: '1px solid #333',
        borderRadius: '8px'
      }}>
        <ClientOnly fallback={<div style={{ color: 'orange' }}>🌀 Loading 3D Scene…</div>}>
          {() => (
            <CentralContentPanelEnhanced
              selectedItem={mockSelectedItem}
              shopifyProduct={mockShopifyProduct}
              isVisible={true}
              showGreenRing={showGreenRing}
              onContentLoad={(data) => console.log('🍉 Content loaded:', data)}
              onError={(error) => console.error('🍉 Content error:', error)}
            />
          )}
        </ClientOnly>
      </div>
    </div>
  );
}
