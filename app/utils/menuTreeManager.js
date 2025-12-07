/**
 * Menu Tree Manager
 * Handles hierarchical menu navigation with support for deep nesting
 * Maintains navigation history for back navigation
 */

/**
 * Parse the nuwud-menu-structure-final.json into a navigation-ready tree
 * @param {Object} menuStructure - Raw JSON menu structure
 * @returns {Object} Parsed menu tree with navigation helpers
 */
export function parseMenuTree(menuStructure) {
  if (!menuStructure?.menu) {
    console.warn('[MenuTree] No menu data found, using defaults');
    return getDefaultMenuTree();
  }

  const menuTree = {
    root: {
      id: 'root',
      label: menuStructure.menuName || 'Main Menu',
      children: [],
      parent: null,
      depth: 0
    },
    nodeMap: new Map(), // Fast lookup by ID
    labelMap: new Map() // Lookup by label for backward compatibility
  };

  // Parse each top-level menu item
  menuStructure.menu.forEach((item) => {
    const node = parseMenuItem(item, menuTree.root, 1, menuTree);
    menuTree.root.children.push(node);
  });

  console.warn('[MenuTree] Parsed menu tree:', {
    rootChildren: menuTree.root.children.length,
    totalNodes: menuTree.nodeMap.size
  });

  return menuTree;
}

/**
 * Recursively parse a menu item and its children
 */
function parseMenuItem(item, parent, depth, tree) {
  const node = {
    id: item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    label: item.label,
    url: item.url || null,
    description: item.description || null,
    model3D: item.model3D || null,
    productType: item.productType || null,
    parent,
    depth,
    children: [],
    hasChildren: false
  };

  // Register in lookup maps
  tree.nodeMap.set(node.id, node);
  tree.labelMap.set(node.label, node);

  // Parse children (submenu items)
  if (item.submenu && Array.isArray(item.submenu) && item.submenu.length > 0) {
    node.hasChildren = true;
    item.submenu.forEach((childItem) => {
      const childNode = parseMenuItem(childItem, node, depth + 1, tree);
      node.children.push(childNode);
    });
  }

  return node;
}

/**
 * Get children labels for a menu item (for backward compatibility with current submenu system)
 * @param {Object} menuTree - Parsed menu tree
 * @param {string} parentLabel - Label of the parent item
 * @returns {string[]} Array of child labels
 */
export function getChildLabels(menuTree, parentLabel) {
  const node = menuTree.labelMap.get(parentLabel);
  if (!node || !node.children) return [];
  return node.children.map(child => child.label);
}

/**
 * Check if a menu item has nested children
 * @param {Object} menuTree - Parsed menu tree
 * @param {string} label - Label of the item to check
 * @returns {boolean} True if item has children
 */
export function hasNestedChildren(menuTree, label) {
  const node = menuTree.labelMap.get(label);
  return node?.hasChildren || false;
}

/**
 * Get the full node data for a menu item
 * @param {Object} menuTree - Parsed menu tree
 * @param {string} label - Label of the item
 * @returns {Object|null} Node data or null
 */
export function getNodeByLabel(menuTree, label) {
  return menuTree.labelMap.get(label) || null;
}

/**
 * Get breadcrumb path from root to a node
 * @param {Object} node - The target node
 * @returns {string[]} Array of labels from root to node
 */
export function getBreadcrumbs(node) {
  const path = [];
  let current = node;
  while (current && current.id !== 'root') {
    path.unshift(current.label);
    current = current.parent;
  }
  return path;
}

/**
 * Transform menu tree to flat format for carousel
 * @param {Object} menuTree - Parsed menu tree
 * @returns {Object} { items, submenus } format for carousel
 */
export function transformTreeToCarouselFormat(menuTree) {
  const items = menuTree.root.children.map(node => node.label);
  const submenus = {};

  menuTree.root.children.forEach(node => {
    if (node.children.length > 0) {
      submenus[node.label] = node.children.map(child => child.label);
    } else {
      // Create placeholder submenu with parent item
      submenus[node.label] = [node.label];
    }
  });

  return { items, submenus, menuTree };
}

/**
 * Navigation history manager for back navigation
 */
export class NavigationHistory {
  constructor() {
    this.stack = [];
    this.listeners = [];
  }

  push(node) {
    this.stack.push(node);
    this.notifyListeners();
  }

  pop() {
    const node = this.stack.pop();
    this.notifyListeners();
    return node;
  }

  peek() {
    return this.stack[this.stack.length - 1] || null;
  }

  clear() {
    this.stack = [];
    this.notifyListeners();
  }

  get depth() {
    return this.stack.length;
  }

  canGoBack() {
    return this.stack.length > 1;
  }

  onNavigate(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    const current = this.peek();
    this.listeners.forEach(cb => cb(current, this.stack));
  }
}

/**
 * Default menu tree fallback
 */
function getDefaultMenuTree() {
  return parseMenuTree({
    menuName: 'Default Menu',
    menu: [
      { id: 'home', label: 'Home', submenu: [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'settings', label: 'Settings' }
      ]},
      { id: 'products', label: 'Products', submenu: [
        { id: 'all', label: 'All Products' },
        { id: 'new', label: 'New Arrivals' }
      ]},
      { id: 'about', label: 'About' },
      { id: 'contact', label: 'Contact' }
    ]
  });
}

// Global menu tree instance
let globalMenuTree = null;

/**
 * Initialize the global menu tree
 */
export async function initializeMenuTree() {
  if (globalMenuTree) return globalMenuTree;

  try {
    const response = await fetch('/nuwud-menu-structure-final.json');
    const menuStructure = await response.json();
    globalMenuTree = parseMenuTree(menuStructure);
  } catch (error) {
    console.warn('[MenuTree] Failed to load menu structure:', error);
    globalMenuTree = getDefaultMenuTree();
  }

  // Expose globally for debugging
  if (typeof window !== 'undefined') {
    window.menuTree = globalMenuTree;
  }

  return globalMenuTree;
}

/**
 * Get the global menu tree instance
 */
export function getMenuTree() {
  return globalMenuTree;
}

// Global navigation history instance
let globalNavHistory = null;

/**
 * Create the public API for menu tree operations
 * This is what's exposed as window.menuTree for use in main.client.js
 */
function createMenuTreeAPI() {
  return {
    // Get children of a submenu item (for nested navigation)
    getChildrenOf(parentLabel, childLabel) {
      if (!globalMenuTree) return null;
      
      // Find the parent node first
      const parentNode = globalMenuTree.labelMap.get(parentLabel);
      if (!parentNode) return null;
      
      // Find the child node within parent's children
      const childNode = parentNode.children.find(c => c.label === childLabel);
      if (!childNode || !childNode.children || childNode.children.length === 0) {
        return null;
      }
      
      // Return child labels for submenu creation
      return childNode.children.map(c => c.label);
    },
    
    // Navigation tracking
    pushNavigation(parentLabel, childLabel) {
      if (!globalNavHistory) return;
      const node = globalMenuTree?.labelMap.get(childLabel);
      if (node) {
        globalNavHistory.push({ parentLabel, childLabel, node });
      }
    },
    
    popNavigation() {
      return globalNavHistory?.pop();
    },
    
    resetNavigation() {
      globalNavHistory?.clear();
    },
    
    getNavigationDepth() {
      return globalNavHistory?.depth || 0;
    },
    
    getBreadcrumb() {
      if (!globalNavHistory) return [];
      return globalNavHistory.stack.map(entry => entry.childLabel);
    },
    
    canGoBack() {
      return globalNavHistory?.canGoBack() || false;
    },
    
    // Access to underlying structures for advanced use
    getTree() {
      return globalMenuTree;
    },
    
    getNavHistory() {
      return globalNavHistory;
    }
  };
}

// Override initializeMenuTree to use the new API
const originalInitialize = initializeMenuTree;
export async function initializeMenuTreeWithAPI() {
  await originalInitialize();
  globalNavHistory = new NavigationHistory();
  
  // Replace with API object
  if (typeof window !== 'undefined') {
    window.menuTree = createMenuTreeAPI();
  }
  
  return globalMenuTree;
}
