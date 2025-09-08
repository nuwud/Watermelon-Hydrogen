// Archived from backup/customer-account-graphql/CustomerAddressMutations.js on 2025-09-07
export const UPDATE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressUpdate(
    $address: MailingAddressInput!
    $id: ID!
    $customerAccessToken: String!
 ) {
    customerAddressUpdate(
      address: $address
      id: $id
      customerAccessToken: $customerAccessToken
    ) {
      customerAddress {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;
export const DELETE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressDelete(
    $id: ID!
    $customerAccessToken: String!
  ) {
    customerAddressDelete(id: $id, customerAccessToken: $customerAccessToken) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;
export const CREATE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressCreate(
    $address: MailingAddressInput!
    $customerAccessToken: String!
  ) {
    customerAddressCreate(
      address: $address
      customerAccessToken: $customerAccessToken
    ) {
      customerAddress {
        id
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;
