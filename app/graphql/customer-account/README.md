# Customer Account GraphQL

This directory is intentionally empty. Customer account GraphQL files have been temporarily disabled and moved to the `/backup/customer-account-graphql/` directory due to compatibility issues with the current Shopify schema.

## Migration Status

Customer account features are currently mocked to prevent build errors. The original GraphQL files are preserved in the backup directory for future migration when:

1. The Shopify Customer Account API schema is updated
2. The Hydrogen framework provides better customer account integration
3. A proper migration strategy is developed

## Files Moved to Backup

- CustomerDetailsQuery.js
- CustomerOrdersQuery.js  
- CustomerOrderQuery.js
- CustomerUpdateMutation.js
- CustomerAddressMutations.js

## Current Implementation

All customer account routes now use mock data to allow the application to build and run successfully while preserving the UI structure for future implementation.
