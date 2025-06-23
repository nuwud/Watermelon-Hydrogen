/**
 * Content Management System for 3D Central Panel
 * Handles loading and transforming Shopify content for 3D display
 */

import { contentTemplates } from './contentTemplates.js';

// Content mapping for your Nuwud Multimedia menu structure
export const NUWUD_CONTENT_MAP = {
  // 1. Home section
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
  'Announcements': {
    type: 'page',
    url: '/pages/announcements', 
    title: 'Announcements',
    description: 'Latest news and updates',
    icon: '📢',
    shape: 'megaphone'
  },
  'My Library': {
    type: 'page',
    url: '/pages/my-library',
    title: 'My Library',
    description: 'Your personal resource collection',
    icon: '📚',
    shape: 'glowing-bookshelf'
  },
  'Settings': {
    type: 'page',
    url: '/pages/settings',
    title: 'Settings',
    description: 'Customize your experience',
    icon: '⚙️',
    shape: 'control-panel'
  },

  // 2. Services (Store #1: Client Projects)
  'Services': {
    type: 'page',
    url: '/pages/services',
    title: 'Services',
    description: 'High-ticket offerings & agency services',
    icon: '🛠️'
  },
  'Web Design (WordPress/Shopify)': {
    type: 'page',
    url: '/pages/web-design',
    title: 'Web Design',
    description: 'WordPress & Shopify development',
    icon: '🌐',
    shape: 'wireframe-browser'
  },
  'SEO & Analytics': {
    type: 'page',
    url: '/pages/seo-analytics',
    title: 'SEO & Analytics',
    description: 'Search optimization & data insights',
    icon: '📊',
    shape: 'bar-graph-tower'
  },
  'Branding & Identity': {
    type: 'page',
    url: '/pages/branding-identity',
    title: 'Branding & Identity',
    description: 'Visual identity & brand strategy',
    icon: '🎨',
    shape: 'paint-palette'
  },
  'Video & Animation': {
    type: 'page',
    url: '/pages/video-animation',
    title: 'Video & Animation',
    description: 'Motion graphics & video production',
    icon: '🎬',
    shape: 'vintage-camera'
  },
  'AI Automation Setup': {
    type: 'page',
    url: '/pages/ai-automation-setup',
    title: 'AI Automation Setup',
    description: 'AI integration & workflow automation',
    icon: '🤖',
    shape: 'ai-crystal-orb'
  },
  'Client Portal': {
    type: 'page',
    url: '/pages/client-portal',
    title: 'Client Portal',
    description: 'Secure client access & project tracking',
    icon: '🔐',
    shape: 'vault-door'
  },

  // 3. Digital Products (Store #2: eCommerce for IP)
  'Digital Products': {
    type: 'page',
    url: '/pages/digital-products',
    title: 'Digital Products',
    description: 'Books, toolkits, guides, and templates',
    icon: '💎'
  },
  'Shopify Hydrogen 3D Guide': {
    type: 'product',
    url: '/pages/shopify-hydrogen-3d-guide',
    title: 'Shopify Hydrogen 3D Guide',
    description: 'Complete guide to 3D Shopify development',
    icon: '📖',
    shape: '3d-book-hydrogen',
    price: '$97'
  },
  'Build Like Nuwud: Systems Book': {
    type: 'product',
    url: '/pages/build-like-nuwud-systems-book',
    title: 'Build Like Nuwud: Systems Book',
    description: 'Complete business systems methodology',
    icon: '📋',
    shape: 'floating-blueprint',
    price: '$197'
  },
  'Watermelon OS Theme (Download)': {
    type: 'product',
    url: '/pages/watermelon-os-theme-download',
    title: 'Watermelon OS Theme',
    description: 'Complete 3D theme package download',
    icon: '🍉',
    shape: 'watermelon-usb',
    price: '$47'
  },
  'eCommerce Templates': {
    type: 'product',
    url: '/pages/ecommerce-templates',
    title: 'eCommerce Templates',
    description: 'Ready-to-use store designs',
    icon: '🛒',
    shape: 'stacked-website-cards',
    price: '$127'
  },
  '3D Product Viewer Kit': {
    type: 'product',
    url: '/pages/3d-product-viewer-kit',
    title: '3D Product Viewer Kit',
    description: 'Three.js product visualization toolkit',
    icon: '📦',
    shape: 'hologram-box',
    price: '$87'
  },
  'Audio + HUD FX Packs': {
    type: 'product',
    url: '/pages/audio-hud-fx-packs',
    title: 'Audio + HUD FX Packs',
    description: 'Sound effects and UI components',
    icon: '🎧',
    shape: 'waveform-emitter',
    price: '$37'
  },

  // 4. Gallery
  'Gallery': {
    type: 'gallery',
    url: '/pages/gallery',
    title: 'Gallery',
    description: 'Portfolio, creativity, and studio work showcase',
    icon: '🎨'
  },
  'Site Launches': {
    type: 'gallery',
    url: '/pages/site-launches',
    title: 'Site Launches',
    description: 'Recently launched websites and projects',
    icon: '🚀',
    shape: '3d-rocket'
  },
  'Client Before & After': {
    type: 'gallery',
    url: '/pages/client-before-after',
    title: 'Client Before & After',
    description: 'Transformation showcases',
    icon: '🔄',
    shape: 'flippable-cube'
  },
  'Brand Designs': {
    type: 'gallery',
    url: '/pages/brand-designs',
    title: 'Brand Designs',
    description: 'Logo and brand identity work',
    icon: '🏷️',
    shape: 'logo-carousel-wheel'
  },
  'Video Reel': {
    type: 'gallery',
    url: '/pages/video-reel',
    title: 'Video Reel',
    description: 'Motion graphics and video portfolio',
    icon: '🎥',
    shape: 'vintage-projector'
  },
  '3D Demos': {
    type: 'gallery',
    url: '/pages/3d-demos',
    title: '3D Demos',
    description: 'Interactive Three.js demonstrations',
    icon: '🌐',
    shape: 'interactive-orb'
  },

  // 5. About
  'About': {
    type: 'page',
    url: '/pages/about',
    title: 'About Nuwud',
    description: 'Our story, values, and team',
    icon: 'ℹ️'
  },
  'Our Mission': {
    type: 'page',
    url: '/pages/our-mission',
    title: 'Our Mission',
    description: 'Empowering digital transformation',
    icon: '❤️',
    shape: '3d-heart'
  },
  'Meet Patrick': {
    type: 'page',
    url: '/pages/meet-patrick',
    title: 'Meet Patrick',
    description: 'Founder and lead developer',
    icon: '👨‍💻',
    shape: 'avatar-bust'
  },
  'Faith & Philosophy': {
    type: 'page',
    url: '/pages/faith-philosophy',
    title: 'Faith & Philosophy',
    description: 'Core beliefs and principles',
    icon: '✝️',
    shape: 'bible-with-light'
  },
  'History': {
    type: 'page',
    url: '/pages/history',
    title: 'History',
    description: 'The Nuwud journey through time',
    icon: '📜',
    shape: 'time-dial'
  },
  'Nuwud\'s Future': {
    type: 'page',
    url: '/pages/nuwud-s-future',
    title: 'Nuwud\'s Future',
    description: 'Vision and roadmap ahead',
    icon: '🔮',
    shape: 'crystal-seed'
  },

  // 6. Contact
  'Contact': {
    type: 'page',
    url: '/pages/contact',
    title: 'Contact',
    description: 'Human, approachable support experience',
    icon: '📞'
  },
  'Start a Project': {
    type: 'page',
    url: '/pages/start-a-project',
    title: 'Start a Project',
    description: 'Begin your digital transformation',
    icon: '✏️',
    shape: '3d-pencil-tablet'
  },
  'Email': {
    type: 'page',
    url: '/pages/email',
    title: 'Email',
    description: 'Direct email communication',
    icon: '📧',
    shape: 'floating-envelope'
  },
  'Chatbot / AI Contact': {
    type: 'page',
    url: '/pages/chatbot-ai-contact',
    title: 'AI Contact',
    description: 'Intelligent chat assistance',
    icon: '🤖',
    shape: 'ai-bot-head'
  },
  'Socials': {
    type: 'page',
    url: '/pages/socials',
    title: 'Social Media',
    description: 'Connect on social platforms',
    icon: '🌍',
    shape: 'globe-with-icons'
  },
  'Office Hours / Map': {
    type: 'page',
    url: '/pages/office-hours-map',
    title: 'Office Hours & Location',
    description: 'Visit us or schedule a meeting',
    icon: '🗺️',
    shape: 'spinning-clock-map'
  },

  // 7. Cart / Account
  'Cart / Account': {
    type: 'cart',
    url: '/pages/cart-account',
    title: 'Cart & Account',
    description: 'Dynamic cart and user settings',
    icon: '🛒'
  },
  'View Cart': {
    type: 'cart',
    url: '/pages/view-cart',
    title: 'View Cart',
    description: 'Review your selected items',
    icon: '🛒',
    shape: '3d-cart-bubbles'
  },
  'Order History': {
    type: 'page',
    url: '/pages/order-history',
    title: 'Order History',
    description: 'Past purchases and downloads',
    icon: '📋',
    shape: 'flipping-receipt'
  },
  'Saved Items / Wishlist': {
    type: 'page',
    url: '/pages/saved-items-wishlist',
    title: 'Wishlist',
    description: 'Saved items for later',
    icon: '💖',
    shape: 'heart-cube'
  },
  'Account Settings': {
    type: 'page',
    url: '/pages/account-settings',
    title: 'Account Settings',
    description: 'Manage your profile and preferences',
    icon: '⚙️',
    shape: '3d-terminal'
  }
};

/**
 * Content Manager Class
 */
export class ContentManager {
  constructor() {
    this.contentCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get content data for a specific menu item
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
      console.log(`[ContentManager] Returning cached content for: ${itemTitle}`);
      return cachedContent.data;
    }

    try {
      // Fetch content based on type
      let contentData;
      switch (contentInfo.type) {
        case 'page':
          contentData = await this.fetchPageContent(contentInfo);
          break;
        case 'product':
          contentData = await this.fetchProductContent(contentInfo);
          break;
        case 'gallery':
          contentData = await this.fetchGalleryContent(contentInfo);
          break;
        case 'dashboard':
          contentData = await this.fetchDashboardContent(contentInfo);
          break;
        case 'cart':
          contentData = await this.fetchCartContent(contentInfo);
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

  async fetchPageContent(contentInfo) {
    // Extract page handle from URL (e.g., "/pages/home" -> "home")
    const pageHandle = contentInfo.url.replace('/pages/', '');
    
    try {
      // Fetch real Shopify page content via API
      const response = await fetch(`/api/page?handle=${encodeURIComponent(pageHandle)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API response not ok: ${response.status}`);
      }

      const apiResult = await response.json();

      if (apiResult.success && apiResult.page) {
        const shopifyPage = apiResult.page;
        return {
          type: 'page',
          title: shopifyPage.title,
          content: this.formatPageContent(shopifyPage),
          rawContent: shopifyPage.body, // Raw HTML content
          summary: shopifyPage.bodySummary,
          seo: shopifyPage.seo,
          icon: contentInfo.icon,
          shape: contentInfo.shape,
          url: contentInfo.url,
          lastUpdated: shopifyPage.updatedAt
        };
      } else {
        console.warn(`[ContentManager] Shopify page not found via API: ${pageHandle}`);
        return this.createFallbackPageContent(contentInfo);
      }
    } catch (error) {
      console.error(`[ContentManager] Error fetching Shopify page via API ${pageHandle}:`, error);
      return this.createFallbackPageContent(contentInfo);
    }
  }

  async fetchProductContent(contentInfo) {
    return {
      type: 'product',
      title: contentInfo.title,
      description: contentInfo.description,
      price: contentInfo.price,
      image: `/assets/products/${contentInfo.title.toLowerCase().replace(/\s+/g, '-')}.jpg`,
      icon: contentInfo.icon,
      shape: contentInfo.shape,
      url: contentInfo.url,
      inStock: true,
      features: this.generateProductFeatures(contentInfo)
    };
  }

  async fetchGalleryContent(contentInfo) {
    return {
      type: 'gallery',
      title: contentInfo.title,
      description: contentInfo.description,
      items: this.generateGalleryItems(contentInfo),
      icon: contentInfo.icon,
      shape: contentInfo.shape
    };
  }

  async fetchDashboardContent(contentInfo) {
    return {
      type: 'dashboard',
      title: contentInfo.title,
      description: contentInfo.description,
      activeProjects: 12,
      completedBuilds: 47,
      happyClients: 156,
      recentActivity: [
        'New website launched for TechCorp',
        'Branding project completed for StartupXYZ',
        'AI automation deployed for ClientABC'
      ],
      quickActions: [
        { id: 'start-project', title: 'Start New Project', icon: '🚀' },
        { id: 'view-portfolio', title: 'View Portfolio', icon: '🎨' },
        { id: 'contact-team', title: 'Contact Team', icon: '💬' },
        { id: 'view-pricing', title: 'View Pricing', icon: '💰' }
      ]
    };
  }

  async fetchCartContent(contentInfo) {
    // This would integrate with Hydrogen's cart system
    return {
      type: 'cart',
      title: contentInfo.title,
      items: [],
      total: '$0.00',
      itemCount: 0,
      recommendedProducts: []
    };
  }

  /**
   * Format Shopify page content for 3D display
   */
  formatPageContent(shopifyPage) {
    // Convert Shopify HTML to a more structured format for 3D display
    const htmlContent = shopifyPage.body;
    
    // Extract key sections from the HTML
    const sections = this.extractContentSections(htmlContent);
    
    return {
      html: htmlContent,
      sections,
      formatted: this.createFormattedContent(sections, shopifyPage),
      wordCount: this.getWordCount(htmlContent),
      readingTime: this.calculateReadingTime(htmlContent)
    };
  }

  /**
   * Extract structured sections from HTML content
   */
  extractContentSections(htmlContent) {
    // This is a simplified parser - you might want to use a proper HTML parser
    const sections = [];
    
    // Extract headings and their content
    const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
    const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
    
    let match;
    while ((match = headingRegex.exec(htmlContent)) !== null) {
      sections.push({
        type: 'heading',
        level: parseInt(match[1]),
        content: match[2].replace(/<[^>]*>/g, ''), // Strip HTML tags
        raw: match[0]
      });
    }
    
    while ((match = paragraphRegex.exec(htmlContent)) !== null) {
      sections.push({
        type: 'paragraph',
        content: match[1].replace(/<[^>]*>/g, ''), // Strip HTML tags
        raw: match[0]
      });
    }
    
    return sections;
  }

  /**
   * Create formatted content for 3D display
   */
  createFormattedContent(sections, shopifyPage) {
    const title = shopifyPage.title;
    const summary = shopifyPage.bodySummary || this.generateSummary(sections);
    
    return {
      title,
      summary,
      mainContent: this.generateMainContentBlocks(sections),
      callToAction: this.extractCallToAction(sections),
      lastUpdated: new Date(shopifyPage.updatedAt).toLocaleDateString()
    };
  }

  /**
   * Create fallback content when Shopify page is not found
   */
  createFallbackPageContent(contentInfo) {
    return {
      type: 'page',
      title: contentInfo.title,
      content: {
        html: this.generatePageContent(contentInfo), // Use existing placeholder generator
        sections: [],
        formatted: {
          title: contentInfo.title,
          summary: contentInfo.description,
          mainContent: [`This page is currently being set up. Content will be available soon.`],
          callToAction: 'Contact us for more information',
          lastUpdated: new Date().toLocaleDateString()
        }
      },
      icon: contentInfo.icon,
      shape: contentInfo.shape,
      url: contentInfo.url,
      isPlaceholder: true
    };
  }

  /**
   * Enhanced content rendering with template system
   */
  renderContentWithTemplate(contentData) {
    // Use the template system for enhanced rendering
    const templatedHtml = contentTemplates.renderContent(contentData);
    
    return {
      ...contentData,
      templatedHtml,
      hasTemplate: true
    };
  }

  /**
   * Get template-aware content data
   */
  async getTemplatedContentData(itemTitle) {
    const contentData = await this.getContentData(itemTitle);
    return this.renderContentWithTemplate(contentData);
  }

  // Utility methods
  getWordCount(htmlContent) {
    const textContent = htmlContent.replace(/<[^>]*>/g, '');
    return textContent.split(/\s+/).filter(word => word.length > 0).length;
  }

  calculateReadingTime(htmlContent) {
    const wordCount = this.getWordCount(htmlContent);
    const wordsPerMinute = 200; // Average reading speed
    return Math.ceil(wordCount / wordsPerMinute);
  }

  generateSummary(sections) {
    const paragraphs = sections.filter(s => s.type === 'paragraph');
    if (paragraphs.length > 0) {
      return paragraphs[0].content.substring(0, 150) + '...';
    }
    return 'Content available in this section.';
  }

  generateMainContentBlocks(sections) {
    const blocks = [];
    sections.forEach(section => {
      if (section.type === 'heading' && section.level <= 3) {
        blocks.push(`## ${section.content}`);
      } else if (section.type === 'paragraph' && section.content.length > 50) {
        blocks.push(section.content);
      }
    });
    
    return blocks.length > 0 ? blocks : ['Content is being prepared for this section.'];
  }

  extractCallToAction(sections) {
    // Look for common CTA patterns
    const ctaKeywords = ['contact', 'learn more', 'get started', 'book now', 'schedule', 'buy now'];
    
    for (const section of sections) {
      const content = section.content.toLowerCase();
      for (const keyword of ctaKeywords) {
        if (content.includes(keyword)) {
          return section.content;
        }
      }
    }
    
    return 'Learn more about our services';
  }

  generatePageContent(contentInfo) {
    const templates = {
      'Our Mission': `
        <h2>Empowering Digital Transformation</h2>
        <p>At Nuwud Multimedia, we believe in the power of technology to transform businesses and lives. Our mission is to bridge the gap between complex technical solutions and real-world business needs.</p>
        
        <h3>Our Core Values</h3>
        <ul>
          <li><strong>Innovation:</strong> Pushing the boundaries of what's possible</li>
          <li><strong>Quality:</strong> Excellence in every pixel and line of code</li>
          <li><strong>Faith:</strong> Guided by strong moral principles</li>
          <li><strong>Partnership:</strong> Your success is our success</li>
        </ul>
        
        <h3>What We Do</h3>
        <p>We specialize in creating immersive digital experiences that combine cutting-edge technology with beautiful design. From 3D web applications to complete brand transformations, we help businesses stand out in the digital landscape.</p>
      `,
      'Meet Patrick': `
        <h2>Patrick - Founder & Lead Developer</h2>
        <p>With over a decade of experience in web development and digital design, Patrick founded Nuwud Multimedia to help businesses leverage the latest technologies for growth.</p>
        
        <h3>Expertise</h3>
        <ul>
          <li>Full-stack development (React, Node.js, Shopify)</li>
          <li>3D web development (Three.js, WebGL)</li>
          <li>Brand strategy and visual identity</li>
          <li>AI automation and workflow optimization</li>
        </ul>
        
        <h3>Philosophy</h3>
        <p>Every project is an opportunity to create something extraordinary. Patrick combines technical expertise with creative vision to deliver solutions that not only work beautifully but also drive real business results.</p>
      `
    };

    return templates[contentInfo.title] || `
      <h2>${contentInfo.title}</h2>
      <p>${contentInfo.description}</p>
      <p>This is a comprehensive section about ${contentInfo.title.toLowerCase()}. Here you'll find detailed information, resources, and insights.</p>
      <h3>Key Features</h3>
      <ul>
        <li>Expert-level implementation</li>
        <li>Custom solutions tailored to your needs</li>
        <li>Ongoing support and maintenance</li>
        <li>Results-driven approach</li>
      </ul>
    `;
  }

  generateProductFeatures(contentInfo) {
    const baseFeatures = [
      'Professional implementation',
      'Full documentation included',
      'Ongoing support',
      'Money-back guarantee'
    ];

    const specificFeatures = {
      'Shopify Hydrogen 3D Guide': [
        'Step-by-step setup instructions',
        'Complete source code examples',
        'Three.js integration tutorials',
        'Performance optimization guides'
      ],
      'Watermelon OS Theme': [
        'Complete 3D theme package',
        'Easy installation',
        'Customizable components',
        'Mobile responsive design'
      ]
    };

    return [...baseFeatures, ...(specificFeatures[contentInfo.title] || [])];
  }

  generateGalleryItems(contentInfo) {
    const galleries = {
      'Site Launches': [
        { title: 'TechCorp Website', image: '/gallery/techcorp.jpg', type: 'website' },
        { title: 'StartupXYZ Platform', image: '/gallery/startupxyz.jpg', type: 'platform' },
        { title: 'E-commerce Store', image: '/gallery/ecommerce.jpg', type: 'store' }
      ],
      '3D Demos': [
        { title: 'Product Visualizer', image: '/gallery/3d-product.jpg', type: '3d-demo' },
        { title: 'Interactive Carousel', image: '/gallery/3d-carousel.jpg', type: '3d-demo' },
        { title: 'Virtual Showroom', image: '/gallery/3d-showroom.jpg', type: '3d-demo' }
      ]
    };

    return galleries[contentInfo.title] || [
      { title: 'Sample Item 1', image: '/gallery/sample1.jpg', type: 'sample' },
      { title: 'Sample Item 2', image: '/gallery/sample2.jpg', type: 'sample' },
      { title: 'Sample Item 3', image: '/gallery/sample3.jpg', type: 'sample' }
    ];
  }

  createFallbackContent(itemTitle) {
    return {
      type: 'page',
      title: itemTitle,
      content: `Content for "${itemTitle}" is being prepared. Please check back soon!`,
      icon: '📄',
      timestamp: Date.now()
    };
  }

  // Clear cache
  clearCache() {
    this.contentCache.clear();
  }
}

// Create default instance
export const contentManager = new ContentManager();
