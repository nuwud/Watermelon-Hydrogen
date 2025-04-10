// utils/loadFont.js
export const loadFontJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load font: ${response.statusText}`);
    return await response.json();
  };
  