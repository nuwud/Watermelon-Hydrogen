// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/cart
export const CART_QUERY_FRAGMENT = `#graphql
  fragment Money on MoneyV2 {
    currencyCode
    amount
  }
  fragment CartLine on CartLine {
    id
    quantity
    attributes {
      key
      value
    }
    cost {
      totalAmount {
        ...Money
      }
      amountPerQuantity {
        ...Money
      }
      compareAtAmountPerQuantity {
        ...Money
      }
    }
    merchandise {
      ... on ProductVariant {
        id
        availableForSale
        compareAtPrice {
          ...Money
        }
        price {
          ...Money
        }
        requiresShipping
        title
        image {
          id
          url
          altText
          width
          height

        }
        product {
          handle
          title
          id
          vendor
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
  fragment CartLineComponent on ComponentizableCartLine {
    id
    quantity
    attributes {
      key
      value
    }
    cost {
      totalAmount {
        ...Money
      }
      amountPerQuantity {
        ...Money
      }
      compareAtAmountPerQuantity {
        ...Money
      }
    }
    merchandise {
      ... on ProductVariant {
        id
        availableForSale
        compareAtPrice {
          ...Money
        }
        price {
          ...Money
        }
        requiresShipping
        title
        image {
          id
          url
          altText
          width
          height
        }
        product {
          handle
          title
          id
          vendor
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
  fragment CartApiQuery on Cart {
    updatedAt
    id
    appliedGiftCards {
      lastCharacters
      amountUsed {
        ...Money
      }
    }
    checkoutUrl
    totalQuantity
    buyerIdentity {
      countryCode
      customer {
        id
        email
        firstName
        lastName
        displayName
      }
      email
      phone
    }
    lines(first: $numCartLines) {
      nodes {
        ...CartLine
      }
      nodes {
        ...CartLineComponent
      }
    }
    cost {
      subtotalAmount {
        ...Money
      }
      totalAmount {
        ...Money
      }
    }
    note
    attributes {
      key
      value
    }
    discountCodes {
      code
      applicable
    }
  }
`;

const MENU_FRAGMENT = `#graphql
  fragment MenuItem on MenuItem {
    id
    resourceId
    tags
    title
    type
    url
  }
  fragment ChildMenuItem on MenuItem {
    ...MenuItem
  }
  fragment ParentMenuItem on MenuItem {
    ...MenuItem
    items {
      ...ChildMenuItem
    }
  }
  fragment Menu on Menu {
    id
    items {
      ...ParentMenuItem
    }
  }
`;

export const HEADER_QUERY = `#graphql
  fragment Shop on Shop {
    id
    name
    description
    primaryDomain {
      url
    }
    brand {
      logo {
        image {
          url
        }
      }
    }
  }
  query Header(
    $country: CountryCode
    $headerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    shop {
      ...Shop
    }
    menu(handle: $headerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
`;

// Fragment for fetching Shopify page content
export const PAGE_FRAGMENT = `#graphql
  fragment PageBasic on Page {
    id
    title
    handle
    body
    bodySummary
    seo {
      description
      title
    }
    createdAt
    updatedAt
  }
`;

// Query for fetching a single page by handle
export const PAGE_QUERY = `#graphql
  query Page(
    $language: LanguageCode
    $country: CountryCode
    $handle: String!
  ) @inContext(language: $language, country: $country) {
    page(handle: $handle) {
      ...PageBasic
    }
  }
  ${PAGE_FRAGMENT}
`;

// Query for fetching multiple pages by handles
export const PAGES_QUERY = `#graphql
  query Pages(
    $language: LanguageCode
    $country: CountryCode
    $query: String!
  ) @inContext(language: $language, country: $country) {
    pages(first: 50, query: $query) {
      nodes {
        ...PageBasic
      }
    }
  }
  ${PAGE_FRAGMENT}
`;

export const FOOTER_QUERY = `#graphql
  query Footer(
    $country: CountryCode
    $footerMenuHandle: String!
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    menu(handle: $footerMenuHandle) {
      ...Menu
    }
  }
  ${MENU_FRAGMENT}
`;

// Product query fragment and query - Enhanced for 3D models
export const PRODUCT_FRAGMENT = `#graphql
  fragment ProductBasic on Product {
    id
    title
    handle
    description
    productType
    tags
    featuredImage {
      id
      url
      altText
      width
      height
    }
    media(first: 10) {
      nodes {
        ... on MediaImage {
          id
          image {
            url
            altText
            width
            height
          }
        }
        ... on Video {
          id
          sources {
            url
            mimeType
          }
        }
        ... on Model3d {
          id
          sources {
            url
            mimeType
            format
          }
        }
        ... on ExternalVideo {
          id
          embedUrl
        }
      }
    }
    metafields(identifiers: [
      {namespace: "custom", key: "model_3d"},
      {namespace: "custom", key: "video_preview"},
      {namespace: "custom", key: "floating_text"},
      {namespace: "custom", key: "sound_effects"},
      {namespace: "custom", key: "floating_preview"},
      {namespace: "custom", key: "audio_hover"},
      {namespace: "custom", key: "carousel_tooltip"}
    ]) {
      namespace
      key
      value
      type
      reference {
        ... on MediaImage {
          image {
            url
            altText
          }
        }
        ... on Video {
          sources {
            url
            mimeType
          }
        }
        ... on Model3d {
          sources {
            url
            mimeType
            format
          }
        }
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    variants(first: 1) {
      nodes {
        id
        title
        availableForSale
        price {
          amount
          currencyCode
        }
      }
    }
  }
`;

export const PRODUCT_QUERY = `#graphql
  query Product($handle: String!) {
    product(handle: $handle) {
      ...ProductBasic
    }
  }
  ${PRODUCT_FRAGMENT}
`;

// Enhanced collection query for 3D menu integration
export const COLLECTION_PRODUCTS_FRAGMENT = `#graphql
  fragment CollectionProducts on Collection {
    id
    title
    handle
    description
    products(first: 50) {
      nodes {
        ...ProductBasic
      }
    }
  }
  ${PRODUCT_FRAGMENT}
`;

export const COLLECTION_QUERY = `#graphql
  query Collection($handle: String!) {
    collection(handle: $handle) {
      ...CollectionProducts
    }
  }
  ${COLLECTION_PRODUCTS_FRAGMENT}
`;
