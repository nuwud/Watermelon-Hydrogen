/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as CustomerAccountAPI from '@shopify/hydrogen/customer-account-api-types';

export type PlaceholderQueryQueryVariables = CustomerAccountAPI.Exact<{
  [key: string]: never;
}>;

export type PlaceholderQueryQuery = {__typename: 'QueryRoot'};

export type CustomerAccountPlaceholderQueryVariables =
  CustomerAccountAPI.Exact<{[key: string]: never}>;

export type CustomerAccountPlaceholderQuery = {__typename: 'QueryRoot'};

interface GeneratedQueryTypes {
  'query PlaceholderQuery {\n  __typename\n}': {
    return: PlaceholderQueryQuery;
    variables: PlaceholderQueryQueryVariables;
  };
  '\n  query CustomerAccountPlaceholder {\n    __typename\n  }\n': {
    return: CustomerAccountPlaceholderQuery;
    variables: CustomerAccountPlaceholderQueryVariables;
  };
}

interface GeneratedMutationTypes {}

declare module '@shopify/hydrogen' {
  interface CustomerAccountQueries extends GeneratedQueryTypes {}
  interface CustomerAccountMutations extends GeneratedMutationTypes {}
}
