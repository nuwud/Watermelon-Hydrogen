# 🎯 Shopify GLB Product Integration Analysis

*Updated: June 24, 2025*

## 🔍 Current Situation

You mentioned that **Shopify products now have GLB as the product image available**. This is fantastic! Instead of creating placeholder GLB files, we can use the actual Shopify product GLB data.

## 🛠️ Technical Implementation Needed

### 1. **Update Shopify Product Query**
The current `PRODUCT_FRAGMENT` in `app/lib/fragments.js` only fetches basic image data:

```graphql
featuredImage {
  id
  url
  altText
  width
  height
}
```

**Need to add GLB support** - there are several ways Shopify can store GLB files:

#### Option A: GLB in Product Media
```graphql
media(first: 10) {
  nodes {
    mediaContentType
    ... on Model3d {
      id
      sources {
        url
        mimeType
        format
      }
    }
    ... on MediaImage {
      id
      image {
        url
        altText
      }
    }
  }
}
```

#### Option B: GLB URL in Metafields
```graphql
metafields(identifiers: [
  {namespace: "custom", key: "glb_model"}
  {namespace: "custom", key: "model_3d"}
]) {
  key
  value
  type
}
```

#### Option C: GLB as Featured Image (if direct GLB URL)
```graphql
featuredImage {
  id
  url  # If this is already a .glb URL
  altText
}
```

### 2. **Content Manager Enhancement**
Update `app/utils/contentManager.js` to extract GLB URLs from Shopify product data:

```javascript
// In fetchProductContent()
const productResponse = await fetch(`/api/product?handle=${handle}`);
const data = await productResponse.json();

if (data.success && data.product) {
  // Extract GLB model URL from Shopify data
  const glbUrl = extractGLBFromProduct(data.product);
  
  return {
    type: 'product',
    title: data.product.title,
    handle: data.product.handle,
    glbModel: glbUrl,  // Use actual Shopify GLB URL
    shopifyData: data.product
  };
}
```

### 3. **GLB URL Extraction Logic**
```javascript
function extractGLBFromProduct(product) {
  // Check media for 3D models
  if (product.media?.nodes) {
    for (const media of product.media.nodes) {
      if (media.mediaContentType === 'MODEL_3D' && media.sources) {
        const glbSource = media.sources.find(s => s.format === 'glb' || s.mimeType === 'model/gltf-binary');
        if (glbSource) return glbSource.url;
      }
    }
  }
  
  // Check metafields for GLB URL
  if (product.metafields) {
    const glbMetafield = product.metafields.find(m => 
      (m.key === 'glb_model' || m.key === 'model_3d') && m.value
    );
    if (glbMetafield) return glbMetafield.value;
  }
  
  // Check if featuredImage is a GLB file
  if (product.featuredImage?.url?.endsWith('.glb')) {
    return product.featuredImage.url;
  }
  
  return null; // No GLB found, use fallback
}
```

## 🎯 Questions to Clarify

To implement this correctly, I need to know:

1. **How are GLB files stored in your Shopify products?**
   - As 3D media objects?
   - As metafield URLs?
   - As the featured image URL?
   - Some other way?

2. **Can you show me an example of the GLB data structure?**
   - What does the Shopify API response look like?
   - What's the exact field name/path to the GLB URL?

3. **Are all your digital products using GLB, or just some?**
   - Should we fall back to geometric shapes for non-GLB products?

## 🚀 Implementation Plan

### Phase 1: Query Enhancement (SAFE)
1. **Backup current fragments.js**
2. **Add GLB fields** to PRODUCT_FRAGMENT based on your data structure
3. **Test API response** to see GLB data

### Phase 2: Content Manager Update (LOW RISK)
1. **Add GLB extraction logic** to contentManager.js
2. **Test with one product** to verify GLB URL extraction
3. **Preserve fallback** to existing shape system

### Phase 3: Integration Test (MEDIUM RISK)
1. **Load actual Shopify GLB** in submenu icons
2. **Display GLB in central panel** for products
3. **Verify both systems** work together

## 💡 Immediate Next Steps

**Can you provide:**
1. **Sample GLB product data** from your Shopify API response
2. **Specific field names** where GLB URLs are stored
3. **Example GLB URL** from one of your products

This will let me create the exact integration code needed without guessing the data structure.

---

**Status**: 🟡 Waiting for Shopify GLB data structure details  
**Next**: Update GraphQL query and extraction logic based on your specific setup
