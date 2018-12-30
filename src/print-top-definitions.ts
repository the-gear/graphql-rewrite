// tslint:disable:no-magic-numbers

import cherr from 'chalk-stderr';
import { Location } from 'graphql';
import path from 'path';
import terminalLink from 'terminal-link';
import getRealDefinitionFirstToken from './get-real-definition-first-token';
import printKind from './print-kind';
import { ExtendedDefinitionNode, ExtendedDocumentNode, isNamedNode } from './types';

interface PrintOptions {
  color: boolean;
  rootDir: string;
}

const KIND_LENGTH = 9;
const LINE_LENGTH = 48;
const EXT_PAD = KIND_LENGTH + LINE_LENGTH + 4;

function locLink(loc: Location | null | undefined, options: PrintOptions): string {
  if (!loc) {
    return '';
  }

  const real = getRealDefinitionFirstToken(loc.startToken);
  const url = `vscode://file/${loc.source.name}:${real.line}:${real.column}`;

  const relativeName = path.relative(options.rootDir || '.', loc.source.name);

  return terminalLink(`${relativeName}:${real.line}:${real.column}`, url, {
    fallback(text) {
      return text;
    },
  });
}

function formatDefinitionPosition(def: ExtendedDefinitionNode, options: PrintOptions) {
  const { color } = options;
  const formattedKind = printKind(def.kind).padEnd(KIND_LENGTH);
  let location = def.locExtra || '';
  if (def.loc) {
    location = `* ${locLink(def.loc, options)}`;
    if (def.loc.extensions) {
      location += def.loc.extensions
        .map((extLoc) => {
          return `\n${' + '.padStart(EXT_PAD)}${locLink(extLoc, options)}`;
        })
        .join('');
    }
  }

  let name = '';
  if (isNamedNode(def)) {
    name = def.name.value;
  }

  return [
    color
      ? (def.isImplicitDep ? cherr.yellow : cherr.yellowBright.bold)(formattedKind)
      : formattedKind,
    name.padEnd(LINE_LENGTH),
    color ? cherr.blueBright(location) : location,
  ].join(' ');
}

function printTopDefinitions(document: ExtendedDocumentNode, options: Partial<PrintOptions> = {}) {
  const opts: PrintOptions = {
    color: !!options.color,
    rootDir: typeof options.rootDir !== 'undefined' ? options.rootDir : process.cwd(),
  };

  document.definitions.forEach((def) => {
    // tslint:disable-next-line: no-console
    console.error(formatDefinitionPosition(def, opts));
  });

  return document;
}

export default printTopDefinitions;
