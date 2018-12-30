import {
  ASTKindToNode,
  DefinitionNode,
  GraphQLError,
  isTypeSystemDefinitionNode,
  isTypeSystemExtensionNode,
  Kind,
  TypeSystemDefinitionNode,
  TypeSystemExtensionNode,
} from 'graphql';
import invariant from 'invariant';
import reduceExtensionToDefinition from './reduce-extension-to-definition';
import { ExtendedDefinitionNode, ExtendedDocumentNode } from './types';

type TypeSystemDefinitionOrExtensionNode = TypeSystemDefinitionNode | TypeSystemExtensionNode;
type DefinitionNodeKeyResolver<T> = ((def: DefinitionNode) => T) | undefined;
type DefinitionNodeMap<T> = { [kind: string]: DefinitionNodeKeyResolver<T> };
type TypeSystemDefinitionOrExtensionNodeMap<T> = {
  [K in TypeSystemDefinitionOrExtensionNode['kind']]: (def: ASTKindToNode[K]) => T
};

const byKindGetKey: TypeSystemDefinitionOrExtensionNodeMap<string> = {
  [Kind.SCHEMA_DEFINITION]: () => 'schema',
  [Kind.SCALAR_TYPE_DEFINITION]: (def) => `scalar ${def.name.value}`,
  [Kind.OBJECT_TYPE_DEFINITION]: (def) => `type ${def.name.value}`,
  [Kind.INTERFACE_TYPE_DEFINITION]: (def) => `interface ${def.name.value}`,
  [Kind.UNION_TYPE_DEFINITION]: (def) => `union ${def.name.value}`,
  [Kind.ENUM_TYPE_DEFINITION]: (def) => `enum ${def.name.value}`,
  [Kind.INPUT_OBJECT_TYPE_DEFINITION]: (def) => `input ${def.name.value}`,
  [Kind.DIRECTIVE_DEFINITION]: (def) => `directive ${def.name.value}`,

  [Kind.SCHEMA_EXTENSION]: () => 'schema',
  [Kind.SCALAR_TYPE_EXTENSION]: (def) => `scalar ${def.name.value}`,
  [Kind.OBJECT_TYPE_EXTENSION]: (def) => `type ${def.name.value}`,
  [Kind.INTERFACE_TYPE_EXTENSION]: (def) => `interface ${def.name.value}`,
  [Kind.UNION_TYPE_EXTENSION]: (def) => `union ${def.name.value}`,
  [Kind.ENUM_TYPE_EXTENSION]: (def) => `enum ${def.name.value}`,
  [Kind.INPUT_OBJECT_TYPE_EXTENSION]: (def) => `input ${def.name.value}`,
};

function getKey(def: DefinitionNode): string | null {
  invariant(def, 'Definition expected');
  // tslint:disable-next-line: no-unsafe-any
  const getKeyByNode = (byKindGetKey as DefinitionNodeMap<string>)[def.kind];

  if (!getKeyByNode) {
    return null;
  }

  return getKeyByNode(def);
}

export default function mergeExtensionsIntoAST(inAst: ExtendedDocumentNode): ExtendedDocumentNode {
  invariant(inAst.kind === 'Document', 'Document node required');
  const definitions = new Map<string, ExtendedDefinitionNode>();
  const extensions = new Map<string, TypeSystemExtensionNode[]>();

  // collect definitions and extensions
  inAst.definitions.forEach((def) => {
    const typeName = getKey(def);

    if (!typeName) {
      return;
    }

    if (isTypeSystemExtensionNode(def)) {
      const extensionsForType = extensions.get(typeName);
      if (extensionsForType) {
        extensionsForType.push(def as TypeSystemExtensionNode);
      } else {
        extensions.set(typeName, [def as TypeSystemExtensionNode]);
      }
    } else if (isTypeSystemDefinitionNode(def)) {
      invariant(
        !definitions.has(typeName),
        'Schema cannot contain multiple definitions: "%s"',
        typeName,
      );
      definitions.set(typeName, def as TypeSystemDefinitionNode);
    }
  });

  for (const [key, extDefs] of extensions) {
    const def = definitions.get(key);
    if (def) {
      definitions.set(key, extDefs.reduce(reduceExtensionToDefinition, def));
    } else {
      throw new GraphQLError(`Cannot extend unrecognized '${key}' with:`, extDefs);
      // throw new Error(
      //   `Cannot extend unrecognized '${key}' with: ${extDefs
      //     .map((d) => `\n  ${d.loc.source.name}`)
      //     .join('')}`,
      // );
    }
  }

  return {
    ...inAst,
    definitions: [...definitions.values()],
  };
}
