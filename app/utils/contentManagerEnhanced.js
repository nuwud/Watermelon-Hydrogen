/**
 * Enhanced Content Manager for Watermelon Hydrogen
 * Handles real Shopify integration with fallback to dummy content
 */

export const NUWUD_CONTENT_MAP = {
  // 1. Home & Dashboard
  'Home': {
    type: 'page',
    url: '/pages/home',
    title: 'Nuwud Multimedia Hub',
    description: 'The hub for navigating Nuwud\'s ecosystem',
    icon: '🏠',
    shape: 'rotating-compass'
  },
  'Dashboard': {
    type: 'dashboard',
    url: '/pages/dashboard',
    title: 'Dashboard',
    description: 'Your command center with 3D HUD panel',
    icon: '🧭',
    shape: 'rotating-compass'
  },

  // 2. Digital Products - The main eCommerce items
  'Shopify Hydrogen 3D Guide': {
    type: 'product',
    url: '/products/shopify-hydrogen-3d-guide',
    handle: 'shopify-hydrogen-3d-guide',
    title: 'Shopify Hydrogen 3D Guide',
    description: 'Complete guide to 3D Shopify development',
    icon: '📖',
    shape: '3d-book-hydrogen',
    price: '$97'
  },
  'Build Like Nuwud: Systems Book': {
    type: 'product',
    url: '/products/build-like-nuwud-systems-book',
    handle: 'build-like-nuwud-systems-book',
    title: 'Build Like Nuwud: Systems Book',
    description: 'Complete business systems methodology',
    icon: '📋',
    shape: 'floating-blueprint',
    price: '$197'
  },
  'Watermelon OS Theme (Download)': {
    type: 'product',
    url: '/products/watermelon-os-theme-download',
    handle: 'watermelon-os-theme-download',
    title: 'Watermelon OS Theme',
    description: 'Complete 3D theme package download',
    icon: '🍉',
    shape: 'watermelon-usb',
    price: '$47'
  },
  'eCommerce Templates': {
    type: 'product',
    url: '/products/ecommerce-templates',
    handle: 'ecommerce-templates',
    title: 'eCommerce Templates',
    description: 'Ready-to-use store designs',
    icon: '🛒',
    shape: 'stacked-website-cards',
    price: '$127'
  },
  '3D Product Viewer Kit': {
    type: 'product',
    url: '/products/3d-product-viewer-kit',
    handle: '3d-product-viewer-kit',
    title: '3D Product Viewer Kit',
    description: 'Three.js product visualization toolkit',
    icon: '📦',
    shape: 'hologram-box',
    price: '$87'
  },
  'Audio + HUD FX Packs': {
    type: 'product',
    url: '/products/audio-hud-fx-packs',
    handle: 'audio-hud-fx-packs',
    title: 'Audio + HUD FX Packs',
    description: 'Sound effects and UI components',
    icon: '🎧',
    shape: 'waveform-emitter',
    price: '$37'
  },

  // 3. Cart & Account
  'View Cart': {
    type: 'cart',
    url: '/cart',
    title: 'View Cart',
    description: 'Review your selected items',
    icon: '🛒',
    shape: '3d-cart-bubbles'
  },
  'Cart / Account': {
    type: 'cart',
    url: '/cart',
    title: 'Cart & Account',
    description: 'Dynamic cart and user settings',
    icon: '🛒'
  },

  // 4. Services & Pages
  'Services': {
    type: 'page',
    url: '/pages/services',
    title: 'Services',
    description: 'High-ticket offerings & agency services',
    icon: '🛠️'
  },
  'About': {
    type: 'page',
    url: '/pages/about',
    title: 'About Nuwud',
    description: 'Our story, values, and team',
    icon: 'ℹ️'
  },
  'Contact': {
    type: 'page',
    url: '/pages/contact',
    title: 'Contact',
    description: 'Human, approachable support experience',
    icon: '📞'
  },
  'Gallery': {
    type: 'gallery',
    url: '/pages/gallery',
    title: 'Gallery',
    description: 'Portfolio, creativity, and studio work showcase',
    icon: '🎨'
  }
};

/**
 * Enhanced Content Manager Class with real Shopify integration
 */
export class ContentManager {
  constructor() {
    this.contentCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.isDebugMode = typeof window !== 'undefined' && window.location.search.includes('debug=true');
  }

  /**
   * Get content data for a specific menu item with real Shopify integration
   */
  async getContentData(itemTitle) {
    const contentInfo = NUWUD_CONTENT_MAP[itemTitle];
    
    if (!contentInfo) {
      console.warn(`[ContentManager] No content mapping found for: ${itemTitle}`);
      return this.createFallbackContent(itemTitle);
    }

    // Check cache first
    const cacheKey = `${contentInfo.type}_${itemTitle}`;
    const cachedContent = this.contentCache.get(cacheKey);
    
    if (cachedContent && Date.now() - cachedContent.timestamp < this.cacheTimeout) {
      if (this.isDebugMode) console.log(`[ContentManager] Returning cached content for: ${itemTitle}`);
      return cachedContent.data;
    }

    try {
      let contentData;
      
      switch (contentInfo.type) {
        case 'product':
          contentData = await this.fetchProductContent(contentInfo);
          break;
        case 'cart':
          contentData = await this.fetchCartContent(contentInfo);
          break;
        case 'page':
          contentData = await this.fetchPageContent(contentInfo);
          break;
        case 'gallery':
          contentData = await this.fetchGalleryContent(contentInfo);
          break;
        case 'dashboard':
          contentData = await this.fetchDashboardContent(contentInfo);
          break;
        default:
          contentData = this.createFallbackContent(itemTitle);
      }

      // Cache the result
      this.contentCache.set(cacheKey, {
        data: contentData,
        timestamp: Date.now()
      });

      return contentData;
    } catch (error) {
      console.error(`[ContentManager] Error fetching content for ${itemTitle}:`, error);
      return this.createFallbackContent(itemTitle);
    }
  }

  /**
   * Fetch real Shopify product data with fallback to dummy content
   */
  async fetchProductContent(contentInfo) {
    const productHandle = contentInfo.handle || 
                          contentInfo.url.replace('/products/', '') ||
                          contentInfo.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    try {
      // Try to fetch from Shopify product API
      const response = await fetch(`/products/${encodeURIComponent(productHandle)}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const productData = await response.json();
        
        if (this.isDebugMode) {
          console.log(`[ContentManager] Fetched real product data for: ${productHandle}`, productData);
        }
        
        return {
          type: 'product',
          title: productData.product.title,
          content: this.formatProductContent(productData.product, contentInfo),
          handle: productData.product.handle,
          id: productData.product.id,
          price: productData.product.selectedOrFirstAvailableVariant?.price,
          compareAtPrice: productData.product.selectedOrFirstAvailableVariant?.compareAtPrice,
          description: productData.product.description,
          descriptionHtml: productData.product.descriptionHtml,
          images: productData.product.images,
          selectedVariant: productData.product.selectedOrFirstAvailableVariant,
          icon: contentInfo.icon,
          shape: contentInfo.shape,
          isShopifyProduct: true,
          shopifyData: productData.product
        };
      } else {
        if (this.isDebugMode) {
          console.warn(`[ContentManager] Product API returned ${response.status} for ${productHandle}, using dummy content`);
        }
        return this.createDummyProductContent(contentInfo);
      }
    } catch (error) {
      console.warn(`[ContentManager] Error fetching product ${productHandle}:`, error);
      return this.createDummyProductContent(contentInfo);
    }
  }

  /**
   * Fetch real cart data with integration to Shopify cart
   */
  async fetchCartContent(contentInfo) {
    try {
      // Check for global cart data from Hydrogen
      if (typeof window !== 'undefined') {
        // Try multiple sources for cart data
        const cartSources = [
          window.cartData,
          window.hydrogenCart,
          window.__HYDROGEN_CART__
        ];
        
        for (const cartData of cartSources) {
          if (cartData && cartData.lines) {
            if (this.isDebugMode) {
              console.log('[ContentManager] Found real cart data:', cartData);
            }
            
            return {
              type: 'cart',
              title: contentInfo.title,
              content: this.formatCartContent(cartData),
              items: cartData.lines || [],
              total: cartData.cost?.totalAmount || '$0.00',
              itemCount: cartData.totalQuantity || 0,
              cartId: cartData.id,
              checkoutUrl: cartData.checkoutUrl,
              isEmpty: !cartData.lines || cartData.lines.length === 0,
              isShopifyCart: true,
              cartData
            };
          }
        }
      }
      
      // Fallback to dummy cart
      if (this.isDebugMode) {
        console.log('[ContentManager] No real cart data found, using dummy content');
      }
      return this.createDummyCartContent(contentInfo);
      
    } catch (error) {
      console.warn('[ContentManager] Error fetching cart content:', error);
      return this.createDummyCartContent(contentInfo);
    }
  }

  /**
   * Create realistic dummy product content for development
   */
  createDummyProductContent(contentInfo) {
    return {
      type: 'product',
      title: contentInfo.title,
      content: this.formatDummyProductContent(contentInfo),
      handle: contentInfo.handle || contentInfo.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      price: contentInfo.price || '$0.00',
      description: contentInfo.description,
      icon: contentInfo.icon,
      shape: contentInfo.shape,
      isShopifyProduct: false,
      isDummy: true
    };
  }

  /**
   * Create realistic dummy cart content
   */
  createDummyCartContent(contentInfo) {
    return {
      type: 'cart',
      title: contentInfo.title,
      content: this.formatDummyCartContent(),
      items: [
        {
          id: 'dummy-1',
          title: 'Shopify Hydrogen 3D Guide',
          price: '$97.00',
          quantity: 1,
          image: null
        },
        {
          id: 'dummy-2', 
          title: 'Build Like Nuwud: Systems Book',
          price: '$197.00',
          quantity: 1,
          image: null
        }
      ],
      total: '$294.00',
      itemCount: 2,
      isEmpty: false,
      isShopifyCart: false,
      isDummy: true
    };
  }

  /**
   * Format real Shopify product content for 3D display
   */
  formatProductContent(product, contentInfo) {
    const formattedPrice = product.selectedOrFirstAvailableVariant?.price 
      ? `$${product.selectedOrFirstAvailableVariant.price.amount}`
      : contentInfo.price || 'Price TBD';

    return `
      <div class="product-content shopify-product">
        <div class="product-header">
          <span class="product-icon">${contentInfo.icon}</span>
          <h2>${product.title}</h2>
          <div class="product-price">${formattedPrice}</div>
          <span class="shopify-badge">Live Product</span>
        </div>
        
        <div class="product-description">
          ${product.descriptionHtml || product.description || contentInfo.description}
        </div>
        
        <div class="product-actions">
          <button class="add-to-cart-btn" data-variant-id="${product.selectedOrFirstAvailableVariant?.id}">
            Add to Cart
          </button>
          <button class="view-product-btn" data-handle="${product.handle}">
            View Details
          </button>
        </div>
        
        <div class="product-meta">
          <p><strong>SKU:</strong> ${product.selectedOrFirstAvailableVariant?.sku || 'N/A'}</p>
          <p><strong>Type:</strong> Digital Product</p>
          <p><strong>Delivery:</strong> Instant Download</p>
          <p><strong>Category:</strong> ${contentInfo.shape || 'Digital Resource'}</p>
        </div>
      </div>
    `;
  }

  /**
   * Format dummy product content for development
   */
  formatDummyProductContent(contentInfo) {
    return `
      <div class="product-content dummy-product">
        <div class="product-header">
          <span class="product-icon">${contentInfo.icon}</span>
          <h2>${contentInfo.title}</h2>
          <div class="product-price">${contentInfo.price || 'Coming Soon'}</div>
          <span class="dummy-badge">Demo Mode</span>
        </div>
        
        <div class="product-description">
          <p>${contentInfo.description}</p>
          <p><em>This is a preview of an upcoming product. Create the real product in Shopify Admin to see live data.</em></p>
        </div>
        
        <div class="product-actions">
          <button class="add-to-cart-btn" disabled>
            Coming Soon
          </button>
          <button class="notify-btn">
            Notify When Available
          </button>
        </div>
        
        <div class="product-meta">
          <p><strong>Status:</strong> In Development</p>
          <p><strong>Expected:</strong> Soon</p>
          <p><strong>Category:</strong> ${contentInfo.shape || 'Digital Resource'}</p>
        </div>
        
        <div class="dev-instructions">
          <h4>🔧 For Developers:</h4>
          <p>Create this product in Shopify Admin with handle: <code>${contentInfo.handle}</code></p>
          <p>Then this will automatically load real product data.</p>
        </div>
      </div>
    `;
  }

  /**
   * Format real cart content with full functionality
   */
  formatCartContent(cartData) {
    if (!cartData.lines || cartData.lines.length === 0) {
      return `
        <div class="cart-content empty-cart">
          <div class="cart-header">
            <span class="cart-icon">🛒</span>
            <h2>Your Cart</h2>
            <span class="live-badge">Live Cart</span>
          </div>
          
          <div class="empty-cart-message">
            <p>Your cart is currently empty</p>
            <button class="browse-products-btn">Browse Products</button>
          </div>
        </div>
      `;
    }

    const itemsHtml = cartData.lines.map(line => `
      <div class="cart-item" data-line-id="${line.id}">
        <div class="item-image">
          ${line.merchandise.image ? 
            `<img src="${line.merchandise.image.url}" alt="${line.merchandise.image.altText || line.merchandise.title}" />` : 
            '<div class="placeholder-image">📦</div>'
          }
        </div>
        <div class="item-details">
          <h4>${line.merchandise.product.title}</h4>
          <p class="item-variant">${line.merchandise.title}</p>
          <div class="item-price">
            ${line.cost.amountPerQuantity.amount} ${line.cost.amountPerQuantity.currencyCode}
          </div>
        </div>
        <div class="item-quantity">
          <button class="qty-decrease" data-line-id="${line.id}">-</button>
          <span class="qty-number">${line.quantity}</span>
          <button class="qty-increase" data-line-id="${line.id}">+</button>
        </div>
        <div class="item-total">
          ${line.cost.totalAmount.amount} ${line.cost.totalAmount.currencyCode}
        </div>
        <button class="remove-item" data-line-id="${line.id}">×</button>
      </div>
    `).join('');

    return `
      <div class="cart-content live-cart">
        <div class="cart-header">
          <span class="cart-icon">🛒</span>
          <h2>Your Cart (${cartData.totalQuantity})</h2>
          <span class="live-badge">Live Cart</span>
        </div>
        
        <div class="cart-items">
          ${itemsHtml}
        </div>
        
        <div class="cart-summary">
          <div class="subtotal">
            <span>Subtotal:</span>
            <span>${cartData.cost.subtotalAmount.amount} ${cartData.cost.subtotalAmount.currencyCode}</span>
          </div>
          ${cartData.cost.totalTaxAmount ? `
            <div class="tax">
              <span>Tax:</span>
              <span>${cartData.cost.totalTaxAmount.amount} ${cartData.cost.totalTaxAmount.currencyCode}</span>
            </div>
          ` : ''}
          <div class="total">
            <span><strong>Total:</strong></span>
            <span><strong>${cartData.cost.totalAmount.amount} ${cartData.cost.totalAmount.currencyCode}</strong></span>
          </div>
        </div>
        
        <div class="cart-actions">
          <button class="checkout-btn" data-checkout-url="${cartData.checkoutUrl}">
            Proceed to Checkout
          </button>
          <button class="continue-shopping-btn">
            Continue Shopping
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Format dummy cart content for development
   */
  formatDummyCartContent() {
    return `
      <div class="cart-content dummy-cart">
        <div class="cart-header">
          <span class="cart-icon">🛒</span>
          <h2>Your Cart (2)</h2>
          <span class="dummy-badge">Demo Mode</span>
        </div>
        
        <div class="cart-items">
          <div class="cart-item">
            <div class="item-image placeholder-image">📖</div>
            <div class="item-details">
              <h4>Shopify Hydrogen 3D Guide</h4>
              <p class="item-variant">Digital Download</p>
              <div class="item-price">$97.00</div>
            </div>
            <div class="item-quantity">
              <span class="qty-number">1</span>
            </div>
            <div class="item-total">$97.00</div>
          </div>
          
          <div class="cart-item">
            <div class="item-image placeholder-image">📋</div>
            <div class="item-details">
              <h4>Build Like Nuwud: Systems Book</h4>
              <p class="item-variant">Digital Download</p>
              <div class="item-price">$197.00</div>
            </div>
            <div class="item-quantity">
              <span class="qty-number">1</span>
            </div>
            <div class="item-total">$197.00</div>
          </div>
        </div>
        
        <div class="cart-summary">
          <div class="subtotal">
            <span>Subtotal:</span>
            <span>$294.00</span>
          </div>
          <div class="total">
            <span><strong>Total:</strong></span>
            <span><strong>$294.00</strong></span>
          </div>
        </div>
        
        <div class="cart-actions">
          <button class="checkout-btn" disabled>
            Checkout (Demo Mode)
          </button>
          <button class="continue-shopping-btn">
            Continue Shopping
          </button>
        </div>
        
        <div class="dev-instructions">
          <h4>🔧 For Developers:</h4>
          <p>This is demo cart content. The real cart will appear when:</p>
          <ul>
            <li>Products are added to cart via AddToCartButton</li>
            <li>Cart data is available in window.cartData</li>
            <li>Hydrogen's useCart() hook provides data</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Fallback page content
   */
  async fetchPageContent(contentInfo) {
    return {
      type: 'page',
      title: contentInfo.title,
      content: `
        <div class="page-content">
          <h2>${contentInfo.title}</h2>
          <p>${contentInfo.description}</p>
          <p><em>Page content will be loaded from Shopify when available.</em></p>
        </div>
      `,
      icon: contentInfo.icon,
      shape: contentInfo.shape
    };
  }

  /**
   * Gallery content
   */
  async fetchGalleryContent(contentInfo) {
    return {
      type: 'gallery',
      title: contentInfo.title,
      content: `
        <div class="gallery-content">
          <h2>${contentInfo.title}</h2>
          <p>${contentInfo.description}</p>
          <p><em>Gallery items will be loaded when available.</em></p>
        </div>
      `,
      icon: contentInfo.icon,
      shape: contentInfo.shape
    };
  }

  /**
   * Dashboard content
   */
  async fetchDashboardContent(contentInfo) {
    return {
      type: 'dashboard',
      title: contentInfo.title,
      content: `
        <div class="dashboard-content">
          <h2>${contentInfo.title}</h2>
          <p>${contentInfo.description}</p>
          <div class="dashboard-stats">
            <div class="stat">
              <span class="stat-value">5</span>
              <span class="stat-label">Active Projects</span>
            </div>
            <div class="stat">
              <span class="stat-value">$1,234</span>
              <span class="stat-label">Revenue This Month</span>
            </div>
          </div>
        </div>
      `,
      icon: contentInfo.icon,
      shape: contentInfo.shape
    };
  }

  /**
   * Create fallback content
   */
  createFallbackContent(itemTitle) {
    return {
      type: 'page',
      title: itemTitle,
      content: `
        <div class="fallback-content">
          <h2>${itemTitle}</h2>
          <p>Content for "${itemTitle}" is being prepared. Please check back soon!</p>
        </div>
      `,
      icon: '📄',
      timestamp: Date.now()
    };
  }

  /**
   * Clear content cache
   */
  clearCache() {
    this.contentCache.clear();
    console.log('[ContentManager] Cache cleared');
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus() {
    return {
      size: this.contentCache.size,
      keys: Array.from(this.contentCache.keys()),
      timeout: this.cacheTimeout
    };
  }
}

// Create and export default instance
export const contentManager = new ContentManager();

// Make available globally for admin panel
if (typeof window !== 'undefined') {
  window.contentManager = contentManager;
  window.NUWUD_CONTENT_MAP = NUWUD_CONTENT_MAP;
}
