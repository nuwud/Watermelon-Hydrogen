# Shopify Pages Setup for 3D Content System

## Quick Setup Guide

### 1. Create Pages in Shopify Admin

Go to your Shopify Admin → Online Store → Pages → Add page

Create pages with these handles (matching your menu items):

```
- Handle: "home" → Title: "Welcome Home"
- Handle: "about" → Title: "About Us" 
- Handle: "gallery" → Title: "Our Gallery"
- Handle: "services" → Title: "Our Services"
- Handle: "digital-products" → Title: "Digital Products"
- Handle: "contact" → Title: "Contact Us"
```

### 2. Page Content Format

Each page just needs:
- **Title**: Display title
- **Content**: Rich text content (HTML/Markdown supported)

Example page content:
```html
<h2>Welcome to Our Gallery</h2>
<p>Explore our amazing collection of digital art and 3D experiences.</p>
<ul>
  <li>Interactive 3D Models</li>
  <li>Virtual Reality Experiences</li>
  <li>Digital Art Collections</li>
</ul>
```

### 3. No Template File Needed

❌ **You do NOT need**:
- Custom Liquid templates
- Special snippet files  
- Complex template modifications

✅ **The system automatically**:
- Fetches page content via GraphQL
- Formats it for 3D display
- Handles fallbacks for missing content

### 4. Content Flow

```
Shopify Page → GraphQL API → Content Manager → 3D Central Panel
```

1. **Shopify Admin**: Create page with handle "gallery"
2. **Menu Click**: User clicks "Gallery" in 3D carousel
3. **API Fetch**: System calls `/api/page?handle=gallery`
4. **Content Display**: Content appears in 3D central panel

### 5. Testing Your Pages

Use the browser console:

```javascript
// Test if page exists
await fetch('/api/page?handle=gallery').then(r => r.json())

// Test content loading
await window.contentManager.getContentData('Gallery')

// Test 3D display
window.centralPanel.loadContent('page', { 
  title: 'Gallery', 
  content: '<h2>Test Content</h2>' 
})
```

### 6. Troubleshooting

**Problem**: Content not loading
- ✅ Check page exists in Shopify admin
- ✅ Verify handle matches menu item name (case-insensitive)
- ✅ Check browser network tab for API errors

**Problem**: Empty content displayed  
- ✅ Add content to page body in Shopify admin
- ✅ Check page is published, not draft

**Problem**: Menu item has no submenu
- ✅ Check `main.js` submenus object includes your item
- ✅ Verify menu item name matches Shopify page handle

## Ready to Test!

After creating pages in Shopify, the 3D system will automatically fetch and display content when users interact with the carousel.
