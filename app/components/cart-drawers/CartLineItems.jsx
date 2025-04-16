import { useCart } from '@shopify/hydrogen-react';

export default function CartLineItems() {
  const { lines } = useCart();

  return (
    <ul>
      {lines?.map((line) => (
        <li key={line.id}>{line.merchandise.title}</li>
      ))}
    </ul>
  );
}
// Compare this snippet from app/components/cart-drawers/CartDrawer.jsx:
// import CartDrawer3D from './CartDrawer3D';
// import Drawer from './Drawer';
// import SavedItems from './SavedItems';
// import FavoriteProducts from './FavoriteProducts';
// import CartLineItems from './CartLineItems';
// import CartSummary from '../CartSummary';
// // import { useState } from 'react';
// // import { useCart } from '@shopify/hydrogen/client';
//
// export default function CartDrawer() {
//   return (
//     <CartDrawer3D>
//       <Drawer id="mainCart" title="Your Cart">
//         <CartLineItems />
//         <CartSummary />
//       </Drawer>                              
//       <Drawer id="favorites" title="Favorites">
//         <FavoriteProducts />
//       </Drawer>
//       <Drawer id="saved" title="Saved for Later">
//         <SavedItems />
//       </Drawer>
//     </CartDrawer3D>
//   );
// }                                            