// tslint:disable:no-console

import { Kind, Source } from 'graphql';
import invariant from 'invariant';
import { ExtendedDocumentNode } from './types';

// TODO: this is common generic
function joinArrays<T>(a?: ReadonlyArray<T>, b?: ReadonlyArray<T>): ReadonlyArray<T> | undefined {
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }

  return [...a, ...b];
}

export default function mergeDocuments(
  parsedDocuments: ReadonlyArray<ExtendedDocumentNode>,
): ExtendedDocumentNode {
  const out: ExtendedDocumentNode = parsedDocuments.reduce(
    (result, document) => {
      invariant(
        document.kind === 'Document',
        'mergeDocuments can only accept GraphQL AST DocumentNode array. Received %s item',
        document.kind,
      );

      if (document.errors) {
        const file: string =
          (document.sources && document.sources[0] && document.sources[0].name) || '???';
        console.error(
          `WARINIG: File '${file}' will be skipped due to parse error`,
          (document.errorMessages || document.errors).join('\n  '),
        );

        return result;
      }

      return {
        sources: joinArrays(result.sources, document.sources),
        kind: 'Document',
        definitions: joinArrays(result.definitions, document.definitions),
        errors: joinArrays(result.errors, document.errors),
        errorMessages: joinArrays(result.errorMessages, document.errorMessages),
      } as ExtendedDocumentNode;
    },
    {
      kind: Kind.DOCUMENT as 'Document',
      sources: [] as ReadonlyArray<Source>,
      definitions: [],
    } as ExtendedDocumentNode,
  );

  return out;
}
