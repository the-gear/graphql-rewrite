import fs from 'fs';
import glob from 'glob'; // tslint:disable-line:match-default-export-name
import { Source } from 'graphql';
import invariant from 'invariant';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);
const asyncGlob = promisify(glob);

export default async function loadSources(
  globPattern: string,
): Promise<ReadonlyArray<import('graphql').Source>> {
  invariant(globPattern, 'globPattern is required');

  const fullPaths = await asyncGlob(globPattern, {});

  return Promise.all(
    fullPaths.map(async (fullPath) => new Source(await readFile(fullPath, 'utf-8'), fullPath)),
  );
}
