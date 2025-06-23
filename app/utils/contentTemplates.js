/**
 * Content Template System for Dynamic Shopify Pages
 * Provides specialized templates for different content types
 */

export class ContentTemplateManager {
  constructor() {
    this.templates = new Map();
    this.registerDefaultTemplates();
  }

  /**
   * Register default templates for common content types
   */
  registerDefaultTemplates() {
    // Page template for standard Shopify pages
    this.registerTemplate('page', {
      name: 'Standard Page',
      description: 'Default template for Shopify pages',
      render: this.renderPageTemplate.bind(this),
      supports: ['page', 'article', 'blog']
    });

    // Product template for product pages
    this.registerTemplate('product', {
      name: 'Product Display',
      description: 'Template for product information',
      render: this.renderProductTemplate.bind(this),
      supports: ['product']
    });

    // Gallery template for image collections
    this.registerTemplate('gallery', {
      name: 'Image Gallery',
      description: 'Template for image collections',
      render: this.renderGalleryTemplate.bind(this),
      supports: ['gallery', 'collection']
    });

    // Dashboard template for interactive dashboards
    this.registerTemplate('dashboard', {
      name: 'Interactive Dashboard',
      description: 'Template for dashboard content',
      render: this.renderDashboardTemplate.bind(this),
      supports: ['dashboard', 'admin']
    });

    // Cart template for shopping cart content
    this.registerTemplate('cart', {
      name: 'Shopping Cart',
      description: 'Template for cart and checkout',
      render: this.renderCartTemplate.bind(this),
      supports: ['cart', 'checkout']
    });
  }

  /**
   * Register a new template
   */
  registerTemplate(id, template) {
    this.templates.set(id, template);
  }

  /**
   * Get the best template for content type
   */
  getTemplate(contentType) {
    // Direct match first
    if (this.templates.has(contentType)) {
      return this.templates.get(contentType);
    }

    // Find template that supports this content type
    for (const [, template] of this.templates) {
      if (template.supports && template.supports.includes(contentType)) {
        return template;
      }
    }

    // Default to page template
    return this.templates.get('page');
  }

  /**
   * Render content using appropriate template
   */
  renderContent(contentData) {
    const template = this.getTemplate(contentData.type);
    if (!template) {
      console.warn(`No template found for content type: ${contentData.type}`);
      return this.renderFallbackTemplate(contentData);
    }

    try {
      return template.render(contentData);
    } catch (error) {
      console.error('Template rendering error:', error);
      return this.renderFallbackTemplate(contentData);
    }
  }

  /**
   * Standard page template
   */
  renderPageTemplate(data) {
    const content = data.content?.formatted || data.content;
    
    return `
      <div class="content-template page-template">
        <header class="content-header">
          <h1 class="content-title">${data.title}</h1>
          ${content?.summary ? `<p class="content-summary">${content.summary}</p>` : ''}
          ${this.renderPageMeta(data)}
        </header>
        
        <main class="content-body">
          ${this.renderPageContent(content)}
        </main>
        
        ${this.renderPageActions(data)}
      </div>
    `;
  }

  /**
   * Product template
   */
  renderProductTemplate(data) {
    return `
      <div class="content-template product-template">
        <header class="product-header">
          <h1 class="product-title">${data.title}</h1>
          ${data.price ? `<div class="product-price">${data.price}</div>` : ''}
        </header>
        
        <main class="product-body">
          ${data.description ? `<div class="product-description">${data.description}</div>` : ''}
          ${this.renderProductFeatures(data)}
        </main>
        
        <footer class="product-actions">
          <button class="cta-button product-cta" data-action="view-product">
            View Product Details
          </button>
          ${data.url ? `<button class="secondary-button" data-action="open-page" data-url="${data.url}">
            Open Full Page
          </button>` : ''}
        </footer>
      </div>
    `;
  }

  /**
   * Gallery template
   */
  renderGalleryTemplate(data) {
    return `
      <div class="content-template gallery-template">
        <header class="gallery-header">
          <h1 class="gallery-title">${data.title}</h1>
          ${data.description ? `<p class="gallery-description">${data.description}</p>` : ''}
        </header>
        
        <main class="gallery-body">
          ${this.renderGalleryGrid(data)}
        </main>
        
        <footer class="gallery-actions">
          <button class="cta-button" data-action="view-gallery">
            View Full Gallery
          </button>
        </footer>
      </div>
    `;
  }

  /**
   * Dashboard template
   */
  renderDashboardTemplate(data) {
    return `
      <div class="content-template dashboard-template">
        <header class="dashboard-header">
          <h1 class="dashboard-title">${data.title}</h1>
        </header>
        
        <main class="dashboard-body">
          ${this.renderDashboardStats(data)}
          ${this.renderDashboardActions(data)}
          ${data.recentActivity ? this.renderActivityFeed(data.recentActivity) : ''}
        </main>
      </div>
    `;
  }

  /**
   * Cart template
   */
  renderCartTemplate(data) {
    return `
      <div class="content-template cart-template">
        <header class="cart-header">
          <h1 class="cart-title">${data.title}</h1>
          ${data.itemCount ? `<div class="cart-count">${data.itemCount} items</div>` : ''}
          ${data.total ? `<div class="cart-total">${data.total}</div>` : ''}
        </header>
        
        <main class="cart-body">
          ${data.items && data.items.length > 0 ? 
            this.renderCartItems(data.items) : 
            '<p class="empty-cart">Your cart is empty</p>'
          }
        </main>
        
        <footer class="cart-actions">
          <button class="cta-button" data-action="view-cart">
            View Full Cart
          </button>
          ${data.items && data.items.length > 0 ? `
            <button class="secondary-button" data-action="checkout">
              Proceed to Checkout
            </button>
          ` : ''}
        </footer>
      </div>
    `;
  }

  /**
   * Helper methods for template components
   */
  renderPageMeta(data) {
    const meta = [];
    if (data.content?.readingTime) meta.push(`${data.content.readingTime} min read`);
    if (data.content?.wordCount) meta.push(`${data.content.wordCount} words`);
    if (data.lastUpdated) meta.push(`Updated: ${new Date(data.lastUpdated).toLocaleDateString()}`);
    
    return meta.length > 0 ? `
      <div class="content-meta">
        ${meta.map(item => `<span class="meta-item">${item}</span>`).join('')}
      </div>
    ` : '';
  }

  renderPageContent(content) {
    if (!content) return '';
    
    if (content.mainContent && Array.isArray(content.mainContent)) {
      return content.mainContent.map(block => `<p class="content-block">${block}</p>`).join('');
    }
    
    if (content.html) {
      // Sanitize and format HTML content for 3D display
      return this.sanitizeHtml(content.html);
    }
    
    return '<p>Content not available</p>';
  }

  renderPageActions(data) {
    if (!data.url && !data.content?.callToAction) return '';
    
    return `
      <footer class="content-actions">
        ${data.content?.callToAction ? `
          <button class="cta-button" data-action="cta">
            ${data.content.callToAction}
          </button>
        ` : ''}
        ${data.url ? `
          <button class="secondary-button" data-action="open-page" data-url="${data.url}">
            View Full Page
          </button>
        ` : ''}
      </footer>
    `;
  }

  renderProductFeatures(data) {
    if (!data.features && !data.description) return '';
    
    return `
      <div class="product-features">
        ${data.features ? data.features.map(feature => 
          `<div class="feature-item">✓ ${feature}</div>`
        ).join('') : ''}
      </div>
    `;
  }

  renderGalleryGrid(data) {
    if (!data.items || !Array.isArray(data.items)) {
      return '<p class="no-gallery">No gallery items available</p>';
    }
    
    return `
      <div class="gallery-grid">
        ${data.items.slice(0, 6).map(item => `
          <div class="gallery-item" data-url="${item.url || '#'}">
            <div class="gallery-preview">${item.title || 'Gallery Item'}</div>
          </div>
        `).join('')}
        ${data.items.length > 6 ? `
          <div class="gallery-more">+${data.items.length - 6} more</div>
        ` : ''}
      </div>
    `;
  }

  renderDashboardStats(data) {
    const stats = [
      { label: 'Active Projects', value: data.activeProjects || 0 },
      { label: 'Completed Builds', value: data.completedBuilds || 0 },
      { label: 'Happy Clients', value: data.happyClients || 0 }
    ];
    
    return `
      <div class="dashboard-stats">
        ${stats.map(stat => `
          <div class="stat-card">
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderDashboardActions(data) {
    if (!data.quickActions || !Array.isArray(data.quickActions)) return '';
    
    return `
      <div class="dashboard-actions">
        ${data.quickActions.map(action => `
          <button class="action-card" data-action="${action.id}">
            <span class="action-icon">${action.icon || '🔧'}</span>
            <span class="action-title">${action.title}</span>
          </button>
        `).join('')}
      </div>
    `;
  }

  renderActivityFeed(activities) {
    if (!Array.isArray(activities)) return '';
    
    return `
      <div class="activity-feed">
        <h3>Recent Activity</h3>
        <ul class="activity-list">
          ${activities.slice(0, 3).map(activity => `
            <li class="activity-item">${activity}</li>
          `).join('')}
        </ul>
      </div>
    `;
  }

  renderCartItems(items) {
    return `
      <div class="cart-items">
        ${items.slice(0, 3).map(item => `
          <div class="cart-item">
            <span class="item-title">${item.title || item.name}</span>
            <span class="item-quantity">×${item.quantity || 1}</span>
            ${item.price ? `<span class="item-price">${item.price}</span>` : ''}
          </div>
        `).join('')}
        ${items.length > 3 ? `
          <div class="cart-more">+${items.length - 3} more items</div>
        ` : ''}
      </div>
    `;
  }

  sanitizeHtml(html) {
    // Basic HTML sanitization for 3D display
    // Remove scripts, forms, and complex elements
    return html
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<form[^>]*>.*?<\/form>/gi, '')
      .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
      .replace(/<object[^>]*>.*?<\/object>/gi, '')
      .replace(/<embed[^>]*>/gi, '')
      .substring(0, 2000); // Limit length for 3D display
  }

  renderFallbackTemplate(data) {
    return `
      <div class="content-template fallback-template">
        <h1>${data.title || 'Content'}</h1>
        <p>${data.description || 'Content is being prepared...'}</p>
        ${data.url ? `
          <button class="cta-button" data-action="open-page" data-url="${data.url}">
            View Full Page
          </button>
        ` : ''}
      </div>
    `;
  }
}

// Create and export default instance
export const contentTemplates = new ContentTemplateManager();
