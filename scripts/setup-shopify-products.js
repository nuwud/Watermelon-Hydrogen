#!/usr/bin/env node

/**
 * Shopify Product Setup Script for Watermelon Hydrogen
 * Creates all the digital products mapped in NUWUD_CONTENT_MAP
 */

const products = [
  {
    title: "Shopify Hydrogen 3D Guide",
    handle: "shopify-hydrogen-3d-guide",
    description: "Complete guide to building immersive 3D e-commerce experiences with Shopify Hydrogen",
    price: "97.00",
    productType: "Digital Download",
    vendor: "Nuwud Multimedia",
    tags: ["hydrogen", "shopify", "3d", "development", "guide"]
  },
  {
    title: "Build Like Nuwud: Systems Book",
    handle: "build-like-nuwud-systems-book", 
    description: "Comprehensive systems approach to building scalable digital experiences",
    price: "197.00",
    productType: "Digital Download",
    vendor: "Nuwud Multimedia",
    tags: ["systems", "development", "architecture", "book"]
  },
  {
    title: "WatermelonOS Theme Download",
    handle: "watermelon-os-theme-download",
    description: "Complete WatermelonOS 3D theme for Shopify stores",
    price: "497.00", 
    productType: "Digital Download",
    vendor: "Nuwud Multimedia",
    tags: ["theme", "watermelon", "3d", "shopify", "template"]
  },
  {
    title: "E-commerce Templates Collection",
    handle: "ecommerce-templates",
    description: "Collection of professional e-commerce templates and components",
    price: "297.00",
    productType: "Digital Download", 
    vendor: "Nuwud Multimedia",
    tags: ["templates", "ecommerce", "collection", "components"]
  },
  {
    title: "3D Product Viewer Kit",
    handle: "3d-product-viewer-kit",
    description: "Complete toolkit for adding 3D product viewing to any store",
    price: "397.00",
    productType: "Digital Download",
    vendor: "Nuwud Multimedia", 
    tags: ["3d", "product", "viewer", "toolkit", "integration"]
  },
  {
    title: "Audio HUD FX Packs",
    handle: "audio-hud-fx-packs",
    description: "Professional audio effects and HUD sounds for immersive interfaces",
    price: "97.00",
    productType: "Digital Download",
    vendor: "Nuwud Multimedia",
    tags: ["audio", "fx", "hud", "sounds", "interface"]
  }
];

console.log('🍉 Watermelon Hydrogen - Product Setup Commands\n');

console.log('Run these commands to create products in your Shopify store:\n');

products.forEach((product, index) => {
  console.log(`# ${index + 1}. ${product.title}`);
  console.log(`shopify app generate product \\`);
  console.log(`  --title="${product.title}" \\`);
  console.log(`  --handle="${product.handle}" \\`);
  console.log(`  --description="${product.description}" \\`);
  console.log(`  --price="${product.price}" \\`);
  console.log(`  --product-type="${product.productType}" \\`);
  console.log(`  --vendor="${product.vendor}" \\`);
  console.log(`  --tags="${product.tags.join(',')}" \\`);
  console.log(`  --published=true\n`);
});

console.log('📝 Alternative: Manual Shopify Admin Setup');
console.log('If CLI commands don\'t work, create these products manually in Shopify Admin:');
console.log('Go to Products → Add product\n');

products.forEach((product, index) => {
  console.log(`${index + 1}. Product: ${product.title}`);
  console.log(`   Handle: ${product.handle}`);
  console.log(`   Price: $${product.price}`);
  console.log(`   Description: ${product.description}`);
  console.log('');
});

console.log('🎯 Next Steps:');
console.log('1. Create these products in Shopify');
console.log('2. Test with: window.contentManager.getContentData("Shopify Hydrogen 3D Guide")');
console.log('3. Verify products load in 3D carousel center panel');
