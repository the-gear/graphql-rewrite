import { DefinitionNode } from 'graphql';

const kindToName: { [name in DefinitionNode['kind']]: string } = {
  DirectiveDefinition: 'directive',
  EnumTypeDefinition: 'enum',
  EnumTypeExtension: 'extend enum',
  ScalarTypeDefinition: 'scalar',
  ScalarTypeExtension: 'extend scalar',
  InterfaceTypeDefinition: 'interface',
  InterfaceTypeExtension: 'extend interface',
  ObjectTypeDefinition: 'type',
  ObjectTypeExtension: 'extend type',
  UnionTypeDefinition: 'union',
  UnionTypeExtension: 'extend union',
  InputObjectTypeDefinition: 'input',
  InputObjectTypeExtension: 'extend input',
  SchemaDefinition: 'schema',
  SchemaExtension: 'extend schema',
  FragmentDefinition: 'fragment',
  OperationDefinition: 'operation',
};

export default function printKind(kind: DefinitionNode['kind']): string {
  return kindToName[kind] || `[${kind}]`;
}
