// app/components/cart-drawers/CartDrawerMount.jsx

import ClientOnly from '../ClientOnly';
import { useEffect } from 'react';
import { mountDrawerToDOM } from './CartDrawerRenderer';

export default function CartDrawerMount() {
  return (
    <ClientOnly>
      <DrawerBoot />
    </ClientOnly>
  );
}

function DrawerBoot() {
  useEffect(() => {
    console.log('[CartDrawerMount] Mounting drawer from client...');
    mountDrawerToDOM();
  }, []);

  return null;
}
