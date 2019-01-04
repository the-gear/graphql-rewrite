import { ASTNode, DefinitionNode, Kind, TypeDefinitionNode, visit } from 'graphql';
import invariant from 'invariant';
import { ExtendedASTNode, ExtendedDocumentNode } from './types';

type ExtendedTypeDefinitionNode = ExtendedASTNode<TypeDefinitionNode>;

function addTypes(
  ast: ExtendedDocumentNode,
  namedTypeMap: Map<string, ExtendedTypeDefinitionNode>,
) {
  for (const def of ast.definitions) {
    switch (def.kind) {
      case Kind.ENUM_TYPE_DEFINITION:
      case Kind.SCALAR_TYPE_DEFINITION:
      case Kind.INTERFACE_TYPE_DEFINITION:
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      case Kind.OBJECT_TYPE_DEFINITION: {
        namedTypeMap.set(def.name.value, def);
        break;
      }
      default:
        break;
    }
  }
}

export default function mergeImplicitDeps(
  ast: ExtendedDocumentNode,
  implicit: ExtendedDocumentNode,
): ExtendedDocumentNode {
  invariant(ast && ast.kind === Kind.DOCUMENT, 'Must provide valid Document AST');

  invariant(
    implicit && implicit.kind === Kind.DOCUMENT,
    'Must provide valid Document AST for implicit deps',
  );

  const namedTypeMap = new Map<string, ExtendedTypeDefinitionNode>();
  addTypes(ast, namedTypeMap);
  const defMap = new Map<string, ExtendedTypeDefinitionNode>(namedTypeMap);
  addTypes(implicit, namedTypeMap);

  const definitions: Array<ExtendedASTNode<DefinitionNode>> = [...ast.definitions];

  // inject dependencies
  const addDependencies = (def: ASTNode) =>
    visit(def, {
      [Kind.NAMED_TYPE]: (astNode) => {
        const typeName = astNode.name.value;
        let dependencyDef = namedTypeMap.get(typeName);
        if (!defMap.has(typeName) && dependencyDef) {
          const descriptionText = [
            dependencyDef.description && dependencyDef.description.value,
            '__NOTE__: Defined in `common`',
          ]
            .filter((x) => x)
            .join('\n\n');

          const description = {
            ...(dependencyDef.description || { kind: Kind.STRING }),
            value: descriptionText,
            block: true,
          };

          dependencyDef = {
            ...dependencyDef,
            description,
            isImplicitDep: true,
          };
          definitions.push(dependencyDef);
          defMap.set(typeName, dependencyDef);
          addDependencies(dependencyDef);
        }
      },
    }) as ExtendedDocumentNode;

  return {
    ...addDependencies(ast),
    definitions,
  };
}
