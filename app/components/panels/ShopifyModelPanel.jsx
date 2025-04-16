// app/components/panels/ShopifyModelPanel.jsx
import {ModelViewer} from '@shopify/hydrogen-react';
//import {useShop} from '@shopify/hydrogen';

export default function ShopifyModelPanel({media, onClose}) {
  //const {storeDomain} = useShop();

  return (
    <div style={{ width: '320px', height: '400px', background: 'white', padding: 16, borderRadius: 12 }}>
      <ModelViewer
        media={media}
        data-storefront-preview="true"
        style={{ width: '100%', height: '320px' }}
        alt="3D Product Preview"
      />
      <button
        onClick={onClose}
        style={{
          marginTop: 16,
          background: '#333',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        Close
      </button>
    </div>
  );
}
