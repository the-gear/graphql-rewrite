// tslint:disable:no-console
// tslint:disable:no-magic-numbers

import cherr from 'chalk-stderr';
import glob from 'glob'; // tslint:disable-line: match-default-export-name
import path from 'path';
import { promisify } from 'util';
import expandPaginationOnAST from './expand-pagination-on-ast';
import loadAndParse from './load-and-parse';
import mergeExtensionsIntoAST from './merge-extensions-in-document';
import mergeImplicitDeps from './merge-implicit-deps';
import printTopDefinitions from './print-top-definitions';
import { ExtendedDocumentNode } from './types';

const asyncGlob = promisify(glob);

export interface GraphQLModule {
  name: string;
  moduleGlob: string;
  commonAst: ExtendedDocumentNode;
  moduleAst: ExtendedDocumentNode | null;
  typeDefs: ExtendedDocumentNode | null;
  error: Error | null;
}

export default async function traverseModules(dir: string): Promise<ReadonlyArray<GraphQLModule>>;

export default async function traverseModules<T = void>(
  dir: string,
  moduleCallback?: (modul: GraphQLModule) => Promise<T>,
): Promise<ReadonlyArray<GraphQLModule | T>> {
  // Load common definitions from `schema/common/`
  console.error(cherr.bold.inverse(` ${'COMMON GraphQL Definitions'.padEnd(56)} `));
  const commonRawAst = await loadAndParse(path.join(dir, 'common/**/*.gql'));
  const commonAstWithPagination = expandPaginationOnAST(commonRawAst);
  const commonAst = mergeExtensionsIntoAST(commonAstWithPagination);

  printTopDefinitions(commonRawAst);

  const modulesPath = path.join(dir, 'modules/');
  const moduleDirs = await asyncGlob(path.join(modulesPath, '/*/'));

  const results = [];
  // For each directory matching `schema/modules/*`:
  for (const moduleDir of moduleDirs) {
    const name = path.basename(moduleDir);
    console.error(cherr.bold.inverse(` ${name.padEnd(56)} `));

    // Read all GraphQL definitions
    const moduleGlob = path.join(moduleDir, './**/*.gql');
    const modul: GraphQLModule = {
      name,
      moduleGlob,
      commonAst,
      moduleAst: null,
      typeDefs: null,
      error: null,
    };
    try {
      modul.moduleAst = await loadAndParse(moduleGlob);
      const withPagination = expandPaginationOnAST(modul.moduleAst);
      const merged = mergeExtensionsIntoAST(withPagination);
      modul.typeDefs = mergeImplicitDeps(merged, commonAst);
    } catch (err) {
      modul.error = err as Error;
      console.error(err);
    }
    if (moduleCallback) {
      const result = await moduleCallback(modul);
      if (result) {
        results.push(result);
      }
    } else {
      results.push(modul);
    }
  }

  return results;
}
