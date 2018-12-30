/**
 * Type definitions for @the-gear/graphql-ast 0.0.0
 * Project: https://github.com/the-gear/graphql-ast
 * Definitions by: Pavel Lang <https://github.com/langpavel>
 * Definitions: https://github.com/the-gear/graphql-ast
 * TypeScript Version: 3.2
 */

import {
  ExecutionResult,
  getIntrospectionQuery,
  GraphQLSchema,
  graphqlSync,
  IntrospectionQuery,
} from 'graphql';
import { default as expandPaginationOnAST } from './expand-pagination-on-ast';
import { default as loadAndParse } from './load-and-parse';
import { default as mergeExtensionsIntoAST } from './merge-extensions-in-document';
import { ExtendedDocumentNode } from './types';

export { default as parseSources } from './parse-sources';
export { default as mergeDocuments } from './merge-documents';
export { default as mergeExtensionsIntoAST } from './merge-extensions-in-document';
export { default as loadSources } from './load-sources';
export { default as loadAndParse } from './load-and-parse';
export { default as sortDefinitions } from './sort-definitions';
export { default as printTopDefinitions } from './print-top-definitions';
export { default as expandPaginationOnAST } from './expand-pagination-on-ast';
export { default as traverseModules } from './traverse-modules';

export function loadParseAndMerge(glob: string): Promise<ExtendedDocumentNode> {
  return loadAndParse(glob)
    .then(expandPaginationOnAST)
    .then(mergeExtensionsIntoAST);
}

export function runIntrospectionQuery(schema: GraphQLSchema): ExecutionResult<IntrospectionQuery> {
  return graphqlSync(schema, getIntrospectionQuery({ descriptions: true }));
}
