import loadSources from './load-sources';
import mergeDocuments from './merge-documents';
import parseSources from './parse-sources';
import sortDefinitions from './sort-definitions';
import { ExtendedDocumentNode } from './types';

export default async function loadAndParse(glob: string): Promise<ExtendedDocumentNode> {
  const sources = await loadSources(glob);
  const parsed = parseSources(sources);
  const merged = mergeDocuments(parsed);

  return sortDefinitions(merged);
}
