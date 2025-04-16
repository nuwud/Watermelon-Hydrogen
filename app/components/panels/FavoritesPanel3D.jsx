// app/components/FavoritesPanel3D.jsx
//import React from 'react';

export default function FavoritesPanel3D({ onClose }) {
  return (
    <div
      style={{
        width: '320px',
        height: '220px',
        background: 'rgba(255, 255, 255, 0.95)',
        color: '#222',
        padding: '20px',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        textAlign: 'center',
      }}
    >
      <h2 style={{ marginBottom: '10px' }}>Your Favorites</h2>
      <p style={{ fontSize: '14px' }}>
        Placeholder for saved or liked items.
      </p>
      <button
        onClick={onClose}
        style={{
          marginTop: '20px',
          background: '#0077ff',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          color: 'white',
        }}
      >
        Close
      </button>
    </div>
  );
}
