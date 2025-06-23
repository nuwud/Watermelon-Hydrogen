// app\components\cart-drawers\CartToggle3D.jsx
import { useEffect } from 'react';
import { SceneRegistry } from '../../utils/cart/SceneRegistry';
import { createCartToggleSphere } from '../../utils/cart/initCartToggleSphere';

export default function CartToggle3D({ position = [3, 1.5, 0] }) {
  useEffect(() => {
    SceneRegistry.onSceneReady((scene) => {
      const existing = scene.getObjectByName('CartToggleSphere');
      if (!existing) {
        const sphere = createCartToggleSphere(position);
        scene.add(sphere);
      }
    });
  }, [position]);

  return null; // This component is side-effect only
}
