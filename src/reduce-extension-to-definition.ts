import {
  ASTKindToNode,
  EnumTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  Kind,
  Location,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  SchemaDefinitionNode,
  TypeSystemExtensionNode,
  UnionTypeDefinitionNode,
} from 'graphql';
import invariant from 'invariant';
import { ExtendedASTNode, ExtendedDefinitionNode, ExtendedLocation } from './types';

export interface ASTExtensionKindToDefinitionNode {
  SchemaExtension: SchemaDefinitionNode;
  ScalarTypeExtension: ScalarTypeDefinitionNode;
  ObjectTypeExtension: ObjectTypeDefinitionNode;
  InterfaceTypeExtension: InterfaceTypeDefinitionNode;
  UnionTypeExtension: UnionTypeDefinitionNode;
  EnumTypeExtension: EnumTypeDefinitionNode;
  InputObjectTypeExtension: InputObjectTypeDefinitionNode;
}

type IntoDefinitionReducer = (
  def: ExtendedDefinitionNode,
  ext: TypeSystemExtensionNode,
) => ExtendedDefinitionNode;

type DefinitionKindReducerMap = {
  [kind: string]: IntoDefinitionReducer;
};

function reduceLocation(
  loc: ExtendedLocation | undefined,
  loc2: Location | undefined,
): ExtendedLocation | undefined {
  if (!loc) return loc2;
  if (!loc2) return loc;

  return {
    ...loc,
    extensions: loc && loc.extensions ? [...loc.extensions, loc2] : [loc2],
  };
}

// TODO: this is common generic
function mayMergeArrays<T>(
  a: ReadonlyArray<T> | undefined,
  b: ReadonlyArray<T> | undefined,
): ReadonlyArray<T> | undefined {
  if (!b) return a;
  if (!a) return b;

  return [...a, ...b];
}

// TODO: this is common generic
function mergeArrays<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T> | undefined): ReadonlyArray<T> {
  if (!b) return a;
  if (!a) return b;

  return [...a, ...b];
}

const reducers: {
  [ExtensionKind in TypeSystemExtensionNode['kind']]: (
    def: ExtendedASTNode<ASTExtensionKindToDefinitionNode[ExtensionKind]>,
    ext: ASTKindToNode[ExtensionKind],
  ) => ExtendedASTNode<ASTExtensionKindToDefinitionNode[ExtensionKind]>
} = {
  [Kind.SCHEMA_EXTENSION]: (def, ext) => {
    return {
      ...def,
      directives: mayMergeArrays(def.directives, ext.directives),
      operationTypes: mergeArrays(def.operationTypes, ext.operationTypes),
      loc: reduceLocation(def.loc, ext.loc),
    };
  },

  [Kind.SCALAR_TYPE_EXTENSION]: (def, ext) => {
    return {
      ...def,
      directives: mayMergeArrays(def.directives, ext.directives),
      loc: reduceLocation(def.loc, ext.loc),
    };
  },

  [Kind.OBJECT_TYPE_EXTENSION]: (def, ext) => {
    return {
      ...def,
      interfaces: mayMergeArrays(def.interfaces, ext.interfaces),
      directives: mayMergeArrays(def.directives, ext.directives),
      fields: mayMergeArrays(def.fields, ext.fields),
      loc: reduceLocation(def.loc, ext.loc),
    };
  },

  [Kind.INTERFACE_TYPE_EXTENSION]: (def, ext) => {
    return {
      ...def,
      directives: mayMergeArrays(def.directives, ext.directives),
      fields: mayMergeArrays(def.fields, ext.fields),
      loc: reduceLocation(def.loc, ext.loc),
    };
  },

  [Kind.UNION_TYPE_EXTENSION]: (def, ext) => {
    return {
      ...def,
      directives: mayMergeArrays(def.directives, ext.directives),
      types: mayMergeArrays(def.types, ext.types),
      loc: reduceLocation(def.loc, ext.loc),
    };
  },

  [Kind.ENUM_TYPE_EXTENSION]: (def, ext) => {
    return {
      ...def,
      directives: mayMergeArrays(def.directives, ext.directives),
      values: mayMergeArrays(def.values, ext.values),
      loc: reduceLocation(def.loc, ext.loc),
    };
  },

  [Kind.INPUT_OBJECT_TYPE_EXTENSION]: (def, ext) => {
    return {
      ...def,
      directives: mayMergeArrays(def.directives, ext.directives),
      fields: mayMergeArrays(def.fields, ext.fields),
      loc: reduceLocation(def.loc, ext.loc),
    };
  },
};

export default function reduceExtensionToDefinition(
  def: ExtendedDefinitionNode,
  ext: TypeSystemExtensionNode,
): ExtendedDefinitionNode {
  const reducer: IntoDefinitionReducer = (reducers as DefinitionKindReducerMap)[ext.kind];

  invariant(reducer, 'Unhandled type for merge: %s into %s', ext.kind, def.kind);

  return reducer(def, ext);
}
