// app/components/cart-drawers/CartHUDDebugPanel.jsx

import { useEffect, useState } from 'react';

export function CartHUDDebugPanel({ hudRef }) {
  const [info, setInfo] = useState({
    mounted: '⏳',
    visible: false,
    hovered: false,
    position: { x: 0, y: 0, z: 0 }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (!hudRef?.current) return;

      const hud = hudRef.current;
      const pos = hud.position;

      setInfo({
        mounted: hud.children.length > 0
          ? hud.children[0].name.includes('Fallback')
            ? '🟥 Fallback'
            : '✅ GLTF'
          : '❌ None',
        visible: hud.visible,
        hovered: hud.userData?.hovered || false,
        position: {
          x: pos.x.toFixed(2),
          y: pos.y.toFixed(2),
          z: pos.z.toFixed(2)
        }
      });
    }, 500); // Update every half second

    return () => clearInterval(interval);
  }, [hudRef]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: 12,
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#00ffcc',
        fontSize: '12px',
        fontFamily: 'monospace',
        padding: '10px',
        borderRadius: '8px',
        zIndex: 99999,
        pointerEvents: 'auto'
      }}
    >
      <strong>🧪 Cart HUD Debug</strong>
      <div>Model: {info.mounted}</div>
      <div>Visible: {info.visible ? '👁️' : '🚫'}</div>
      <div>Hovered: {info.hovered ? '🎯' : '—'}</div>
      <div>Pos: x={info.position.x}, y={info.position.y}, z={info.position.z}</div>
    </div>
  );
}
