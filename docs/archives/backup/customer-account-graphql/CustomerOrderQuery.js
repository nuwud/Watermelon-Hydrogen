// Archived from backup/customer-account-graphql/CustomerOrderQuery.js on 2025-09-07
export const CUSTOMER_ORDER_QUERY = `#graphql
  fragment OrderMoney on MoneyV2 {
    amount
    currencyCode
  }
  fragment DiscountApplication on DiscountApplication {
    value {
      __typename
      ... on MoneyV2 {
        ...OrderMoney
      }
      ... on PricingPercentageValue {
        percentage
      }
    }
  }
  fragment OrderLineItemFull on OrderLineItem {
    title
    quantity
    originalTotalPrice {
      ...OrderMoney
    }
    discountAllocations {
      allocatedAmount {
        ...OrderMoney
      }
      discountApplication {
        ...DiscountApplication
      }
    }
    variant {
      title
    }
  }
  fragment Order on Order {
    id
    name
    statusUrl
    processedAt
    fulfillmentStatus
    totalTax {
      ...OrderMoney
    }
    totalPrice {
      ...OrderMoney
    }
    shippingAddress {
      name
      formatted(withName: true)
      formattedArea
    }
    discountApplications(first: 100) {
      nodes {
        ...DiscountApplication
      }
    }
    lineItems(first: 100) {
      nodes {
        ...OrderLineItemFull
      }
    }
  }
  query Order($orderId: ID!) {
    node(id: $orderId) {
      ... on Order {
        ...Order
      }
    }
  }
`;
