// app\components\cart-drawers\CartDrawer3D.jsx
import { useEffect, useState, useCallback } from 'react';
import { useCart } from '@shopify/hydrogen';
import { useCartUI } from '../context/cart-ui';
import { setDrawerController } from './CartDrawerController'; // Assuming this path is correct
import CartLineItems from './CartLineItems';
import { CartSummary } from './CartSummary';
import FavoriteProducts from './FavoriteProducts';
import SavedItems from './SavedItems';
import ClientOnly from '../ClientOnly'; // Corrected path assuming ClientOnly is in parent dir

console.warn("🛠️ CartDrawer3D.jsx module loaded");

export default function CartDrawer3D() {
  const { lines, totalQuantity } = useCart();
  const { activeDrawer, openDrawer } = useCartUI();
  const [isOpen, setIsOpen] = useState(false);

  // Memoize functions to ensure stable references for the controller
  const openCartDrawerInternal = useCallback(() => {
    // Check previous state to avoid unnecessary updates if already open
    setIsOpen(prev => {
        if (!prev) {
            console.warn('CartDrawer3D: openCartDrawerInternal called, setting isOpen to true');
        } else {
            console.warn('CartDrawer3D: openCartDrawerInternal called, but already open');
        }
        return true; // Always return true to ensure it opens
    });
  }, []); // Empty dependency array: function is stable

  const closeCartDrawerInternal = useCallback(() => {
    // Check previous state to avoid unnecessary updates if already closed
    setIsOpen(prev => {
        if (prev) {
            console.warn('CartDrawer3D: closeCartDrawerInternal called, setting isOpen to false');
        } else {
            console.warn('CartDrawer3D: closeCartDrawerInternal called, but already closed');
        }
        return false; // Always return false to ensure it closes
    });
  }, []); // Empty dependency array: function is stable

  const handleToggle = useCallback(() => {
    setIsOpen(prev => {
        console.warn(`CartDrawer3D: handleToggle called, changing isOpen from ${prev} to ${!prev}`);
        return !prev;
    });
  }, []); // Empty dependency array: function is stable

  // Effect to register the controller ONCE on mount
  useEffect(() => {
    console.warn("🧠 CartDrawer3D Mount useEffect firing");
    console.warn('Registering drawer controller');
    const controller = {
      toggleCartDrawer: handleToggle,
      openCartDrawer: openCartDrawerInternal,
      closeCartDrawer: closeCartDrawerInternal,
    };
    // Assuming setDrawerController is stable (imported function)
    setDrawerController(controller);

    // Dispatch the event
    window.dispatchEvent(new CustomEvent('drawerControllerReady'));
    console.warn('Dispatched drawerControllerReady event');

    // Cleanup function (optional but good practice)
    return () => {
        console.warn('Cleaning up drawer controller registration');
        // If setDrawerController(null) or similar cleanup is needed, do it here
        // e.g., delete window.drawerController;
    };
    // Run only once on mount: empty dependency array
  }, [handleToggle, openCartDrawerInternal, closeCartDrawerInternal]);

  // Log for rendering check
  console.warn("🧩 CartDrawer3D.jsx rendering with isOpen =", isOpen);

  return (
    <ClientOnly>
      {isOpen && (
        <div className="fixed top-0 right-0 z-50 bg-white w-full max-w-md h-full shadow-xl overflow-y-auto p-4">
          <button onClick={handleToggle} className="absolute top-2 right-2 text-2xl">&times;</button>
          <div className="flex space-x-2 mb-4">
            <button onClick={() => openDrawer('mainCart')}>Cart ({totalQuantity})</button>
            <button onClick={() => openDrawer('favorites')}>Favorites</button>
            <button onClick={() => openDrawer('saved')}>Saved</button>
          </div>

          {activeDrawer === 'mainCart' && (
            <>
              <CartLineItems lines={lines} />
              <CartSummary />
            </>
          )}
          {activeDrawer === 'favorites' && <FavoriteProducts />}
          {activeDrawer === 'saved' && <SavedItems />}
        </div>
      )}
    </ClientOnly>
  );
}
