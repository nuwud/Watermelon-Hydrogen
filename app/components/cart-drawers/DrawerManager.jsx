import CartDrawer from './CartDrawer';
import CartDrawer3D from './CartDrawer3D';
import SavedItems from './SavedItems';
import FavoriteProducts from './FavoriteProducts';

export default function DrawerManager({ mode = 'standard' }) {
  switch (mode) {
    case '3d':
      return <CartDrawer3D />;
    case 'favorites':
      return <FavoriteProducts />;
    case 'saved':
      return <SavedItems />;
    case 'standard':
    default:
      return <CartDrawer />;
  }
}
