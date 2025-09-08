// Archived from backup/customer-account-graphql/CustomerUpdateMutation.js on 2025-09-07
export const CUSTOMER_UPDATE_MUTATION = `#graphql
  mutation customerUpdate(
    $customer: CustomerUpdateInput!
    $customerAccessToken: String!
  ){
    customerUpdate(customer: $customer, customerAccessToken: $customerAccessToken) {
      customer {
        firstName
        lastName
        email
        phone
      }
      customerUserErrors {
        field
        message
      }
    }
  }
`;
