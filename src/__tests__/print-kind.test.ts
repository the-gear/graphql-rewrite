import { readFileSync } from 'fs';
import { parse } from 'graphql';
import { resolve } from 'path';
import printKind from '../print-kind';

const source = readFileSync(resolve(__dirname, './complex.gql'), 'utf8');

describe('print-kind', () => {
  it('works', () => {
    const document = parse(source);
    expect(
      document.definitions.map((def) => `${def.kind} ~> ${printKind(def.kind)}`).join('\n'),
    ).toMatchSnapshot();
  });
});
