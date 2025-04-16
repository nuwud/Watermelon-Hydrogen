// app/components/AboutPanel3D.jsx
//import React from 'react';

export default function AboutPanel3D({ onClose }) {
  return (
    <div
      style={{
        width: '300px',
        height: '200px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '16px',
        borderRadius: '12px',
        textAlign: 'center',
        depth: '0.5',
        mathDepth: '0.5',
      }}
    >
      <h2 style={{ marginBottom: '10px' }}>About WatermelonOS</h2>
      <p style={{ fontSize: '14px' }}>
        This is a demo About panel rendered inside the carousel’s center using Drei Html.
      </p>
      <button
        onClick={onClose}
        style={{
          marginTop: '16px',
          background: '#ff3366',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '6px',
          cursor: 'pointer',
          color: 'white',
          depth: '0.5',
          mathDepth: '0.5',
        }}
      >
        Close
      </button>
    </div>
  );
}
