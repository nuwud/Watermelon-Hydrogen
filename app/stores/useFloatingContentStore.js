// app/stores/useFloatingContentStore.js
import { create } from 'zustand';

export const useFloatingContentStore = create((set) => ({
  activeContentId: null, // e.g., 'cart', 'about', 'product-xyz'
  setActiveContentId: (id) => set({ activeContentId: id }),
  clearActiveContentId: () => set({ activeContentId: null }),
}));