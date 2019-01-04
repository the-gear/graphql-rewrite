import { DefinitionNode, Kind } from 'graphql';
import { ExtendedDocumentNode, isNamedNode } from './types';

const sortKeyByKind: { [name in DefinitionNode['kind']]: number } = {
  [Kind.DIRECTIVE_DEFINITION]: 1,
  [Kind.ENUM_TYPE_DEFINITION]: 2,
  [Kind.ENUM_TYPE_EXTENSION]: 2,
  [Kind.SCALAR_TYPE_DEFINITION]: 3,
  [Kind.SCALAR_TYPE_EXTENSION]: 3,
  [Kind.INPUT_OBJECT_TYPE_DEFINITION]: 4,
  [Kind.INPUT_OBJECT_TYPE_EXTENSION]: 4,
  [Kind.INTERFACE_TYPE_DEFINITION]: 5,
  [Kind.INTERFACE_TYPE_EXTENSION]: 5,
  [Kind.OBJECT_TYPE_DEFINITION]: 6,
  [Kind.OBJECT_TYPE_EXTENSION]: 6,
  [Kind.UNION_TYPE_DEFINITION]: 7,
  [Kind.UNION_TYPE_EXTENSION]: 7,
  [Kind.SCHEMA_DEFINITION]: 8,
  [Kind.SCHEMA_EXTENSION]: 8,

  [Kind.FRAGMENT_DEFINITION]: 9,
  [Kind.OPERATION_DEFINITION]: 10,
};

const typeKeys: ReadonlyArray<string> = Object.keys(sortKeyByKind);

function makeComparator<T>(
  ...selectors: Array<(obj: T) => number | string>
): (a: T, b: T) => number {
  return (a, b) => {
    for (const selector of selectors) {
      const valA = selector(a);
      const valB = selector(b);
      if (valA < valB) {
        return -1;
      }
      if (valA > valB) {
        return 1;
      }
    }

    return 0;
  };
}

// At first, this will sort by kind.
// Second criteria is ASCII name
// Third is order of keys in this POJO map ;-)
export default function sortDocument(document: ExtendedDocumentNode): ExtendedDocumentNode {
  const definitions = [...document.definitions];
  definitions.sort(
    makeComparator(
      (def) => sortKeyByKind[def.kind] || 0,
      (def) => (isNamedNode(def) ? def.name.value : ''),
      (def) => typeKeys.indexOf(def.kind),
      (def) => (def.loc && def.loc.source && def.loc.source.name) || '',
      (def) => (def.loc && def.loc.start) || 0,
    ),
  );

  return {
    ...document,
    definitions,
  };
}
