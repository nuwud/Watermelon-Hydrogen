// app/components/panels/CartPanel3D.jsx
//import React from 'react';

export default function CartPanel3D({ onClose }) {
  return (
    <div style={{ color: 'white', background: '#111', padding: '1rem', borderRadius: '0.5rem' }}>
      <h2>🛒 Cart Panel</h2>
      <p>This is the cart panel placeholder. Hook to Drawer later.</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}
