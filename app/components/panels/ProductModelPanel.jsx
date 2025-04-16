// app/components/ProductModelPanel.jsx
import {ModelViewer} from '@shopify/hydrogen-react';

export default function ProductModelPanel({modelUrl, onClose}) {
  return (
    <div
      style={{
        width: '360px',
        height: '360px',
        background: '#fff',
        padding: '16px',
        borderRadius: '10px',
        boxShadow: '0 0 12px rgba(0,0,0,0.3)',
      }}
    >
      <ModelViewer
        alt="3D model preview"
        src={modelUrl} // Should be a GLB/GLTF from Shopify product.media or metafield
        interactionPromptThreshold={0}
        disableZoom={false}
        style={{width: '100%', height: '300px'}}
        poster="/placeholder.jpg" // Optional
        shadow-intensity="1"
        camera-controls
        auto-rotate
        ar
      />
      <button
        onClick={onClose}
        style={{
          marginTop: '12px',
          background: '#333',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: '6px',
        }}
      >
        Close
      </button>
    </div>
  );
}
