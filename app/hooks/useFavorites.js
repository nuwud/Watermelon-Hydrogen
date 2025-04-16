import { useState, useEffect } from 'react';

export default function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    const stored = localStorage.getItem('favorites');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = (product) => {
    setFavorites((prev) => [...prev, product]);
  };

  const removeFavorite = (productId) => {
    setFavorites((prev) => prev.filter((item) => item.id !== productId));
  };

  return { favorites, addFavorite, removeFavorite };
}
