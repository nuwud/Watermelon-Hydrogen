import { useEffect } from 'react';
import { useCartUI } from '~/components/context/cart-ui';
import { createCartController } from '~/utils/cart-controller-utils';

export default function CartDrawerInjector() {
  const { toggleCart, isCartOpen } = useCartUI();

  useEffect(() => {
    const controller = createCartController(
      () => toggleCart(),
      () => { if (!isCartOpen) toggleCart(); },
      () => { if (isCartOpen) toggleCart(); },
      isCartOpen
    );

    window.drawerController = controller;
    window.dispatchEvent(new Event('drawerControllerReady'));
    console.warn('[CartDrawerInjector] ✅ Registered drawerController and dispatched drawerControllerReady.');

    return () => {
      delete window.drawerController;
      console.warn('[CartDrawerInjector] 🧹 Cleaned up drawerController.');
    };
  }, [toggleCart, isCartOpen]);

  return null; // This component does not render anything
}
