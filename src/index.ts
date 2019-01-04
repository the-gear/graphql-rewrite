/**
 * Type definitions for @the-gear/graphql-rewrite 0.0.0
 * Project: https://github.com/the-gear/graphql-rewrite
 * Definitions by: Pavel Lang <https://github.com/langpavel>
 * Definitions: https://github.com/the-gear/graphql-rewrite
 * TypeScript Version: 3.2
 */

import {
  ExecutionResult,
  getIntrospectionQuery,
  GraphQLSchema,
  graphqlSync,
  IntrospectionQuery,
} from 'graphql';

export * from './types';
export { default as firstSourceToken } from './first-source-token';
export { default as mergeDocuments } from './merge-documents';
export { default as mergeExtensionsInDocument } from './merge-extensions-in-document';
export { default as mergeImplicit } from './merge-implicit';
export { default as sortDocument } from './sort-document';
export { default as printKind } from './print-kind';
export { default as expandPaginationOnAST } from './expand-pagination-on-ast';

export function runIntrospectionQuery(schema: GraphQLSchema): ExecutionResult<IntrospectionQuery> {
  return graphqlSync(schema, getIntrospectionQuery({ descriptions: true }));
}
