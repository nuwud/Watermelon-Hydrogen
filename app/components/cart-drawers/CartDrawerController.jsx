// 🔧 File: app/components/CartDrawerController.jsx
import { useEffect, useCallback } from 'react';
import { useCartUI } from '../context/cart-ui';
import Drawer from './Drawer';
import CartLineItems from './CartLineItems';
import { CartSummary } from './CartSummary';
import SavedItems from './SavedItems';
import FavoriteProducts from './FavoriteProducts';
import { createCartController } from '../../utils/cart-controller-utils';

export default function CartDrawerController({ lines, totalQuantity }) {
  const { activeDrawer, openDrawer } = useCartUI();

  const toggleCartDrawer = useCallback(() => openDrawer('mainCart'), [openDrawer]);
  const openCartDrawer = useCallback(() => openDrawer('mainCart'), [openDrawer]);
  const closeCartDrawer = useCallback(() => openDrawer(null), [openDrawer]);

  useEffect(() => {
    const controller = createCartController(
      toggleCartDrawer,
      openCartDrawer,
      closeCartDrawer,
      activeDrawer === 'mainCart'
    );

    window.drawerController = controller;

    // 🧠 Dispatch the readiness event for Three.js to sync with
    window.dispatchEvent(new Event('drawerControllerReady'));
    console.warn('🧠 drawerController registered and dispatched');

    return () => {
      delete window.drawerController;
    };
  }, [toggleCartDrawer, openCartDrawer, closeCartDrawer, activeDrawer]);

  useEffect(() => {
    const handler = () => openDrawer('mainCart');
    window.addEventListener('cart-toggle-clicked', handler);
    return () => window.removeEventListener('cart-toggle-clicked', handler);
  }, [openDrawer]);

  switch (activeDrawer) {
    case 'favorites':
      return (
        <Drawer id="favorites" title="Favorites">
          <FavoriteProducts />
        </Drawer>
      );
    case 'saved':
      return (
        <Drawer id="saved" title="Saved for Later">
          <SavedItems />
        </Drawer>
      );
    default:
      return (
        <Drawer id="mainCart" title={`Your Cart (${totalQuantity})`}>
          {lines?.length > 0 ? (
            <>
              <CartLineItems lines={lines} />
              <CartSummary totalQuantity={totalQuantity} />
            </>
          ) : (
            <p className="text-center py-6 text-gray-500">Your cart is empty.</p>
          )}
        </Drawer>
      );
  }
}