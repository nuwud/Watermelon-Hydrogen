import { createContext, useContext, useState } from 'react';

// Cart UI Context (now includes drawer functionality)
const CartUIContext = createContext();

export const useCartUI = () => useContext(CartUIContext);

export const CartUIProvider = ({ children }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(null);
  
  const toggleCart = () => setIsCartOpen((prev) => !prev);
  const toggleDrawer = (id) => setOpenDrawer((prev) => (prev === id ? null : id));

  return (
    <CartUIContext.Provider value={{ 
      isCartOpen, 
      toggleCart,
      openDrawer,
      toggleDrawer
    }}>
      {children}
    </CartUIContext.Provider>
  );
};

// Core drawer hooks
export function useDrawer() {
  return useContext(CartUIContext);
}

export function useDrawerState() {
  const { openDrawer } = useContext(CartUIContext);
  return openDrawer;
}

export function useToggleDrawer() {
  const { toggleDrawer } = useContext(CartUIContext);
  return toggleDrawer;
}

export function useDrawerOpen(id) {
  const { openDrawer } = useContext(CartUIContext);
  return openDrawer === id;
}

export function useDrawerToggle(id) {
  const { toggleDrawer } = useContext(CartUIContext);
  return () => toggleDrawer(id);
}

export function useDrawerClose() {
  const { toggleDrawer } = useContext(CartUIContext);
  return () => toggleDrawer(null);
}

// Cart UI Provider
export function CartUIProviderWrapper({ children }) {
  return (
    <CartUIProvider>
      {children}
    </CartUIProvider>
  );
}
