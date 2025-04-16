import { useDrawerContext } from '../context/drawer-context';

export default function CartToggleButtons() {
  const { openDrawer } = useDrawerContext();

  return (
    <div>
      <button onClick={() => openDrawer('mainCart')}>Cart</button>
      <button onClick={() => openDrawer('favorites')}>Favorites</button>
      <button onClick={() => openDrawer('saved')}>Saved</button>
    </div>
  );
}
