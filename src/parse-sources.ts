import cherr from 'chalk-stderr';
import { GraphQLError, Kind, parse, Source } from 'graphql';
import { ExtendedDocumentNode } from './types';

export function parseSource(source: Source): ExtendedDocumentNode {
  try {
    return { sources: [source], ...parse(source) };
  } catch (error) {
    if (error instanceof GraphQLError) {
      const errorMessage = error.locations
        ? `${error.message}${error.locations
            .map(({ line, column }) => `\n  at ${source.name}:${line}:${column}`)
            .join('')}`
        : `${error.message} at ${source.name}`;

      const coloredErrorMessage = error.locations
        ? `${cherr.redBright(error.message)}${error.locations
            .map(
              ({ line, column }) =>
                `\n  at ${cherr.cyanBright(`${source.name}:${line}:${column}`)}`,
            )
            .join('')}`
        : `${error.message} at ${source.name}`;

      // tslint:disable-next-line:no-console
      console.error(`${cherr.whiteBright.bold.bgRed('ERROR:')} ${coloredErrorMessage}`);

      return {
        kind: Kind.DOCUMENT,
        sources: [source],
        definitions: [],
        errors: [error],
        errorMessages: [errorMessage],
      };
    }
    throw error;
  }
}

export default function parseSources(
  sources: ReadonlyArray<Source>,
): ReadonlyArray<ExtendedDocumentNode> {
  return sources.map(parseSource);
}
