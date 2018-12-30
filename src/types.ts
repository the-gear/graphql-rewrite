// tslint:disable: no-any
// tslint:disable: no-unsafe-any

import {
  ASTNode,
  DefinitionNode,
  DocumentNode,
  GraphQLError,
  Location,
  NameNode,
  Source,
  TypeSystemDefinitionNode,
} from 'graphql';

// diagnostics API, TODO: rethink
export interface Feed {
  (id: string, ...args: Array<unknown>): void;
  push(id: string, ...args: Array<unknown>): Feed;
}

export interface ExtendedLocation extends Location {
  readonly extensions?: ReadonlyArray<Location>;
}

export interface ExtendedDocumentNode extends DocumentNode {
  readonly sources?: ReadonlyArray<Source>;
  readonly errors?: ReadonlyArray<GraphQLError>;
  readonly errorMessages?: ReadonlyArray<string>;
  readonly definitions: ReadonlyArray<ExtendedDefinitionNode>;
  [name: string]: unknown;
}

export type ASTNodeExtensions = {
  readonly isImplicitDep?: boolean;
  readonly isGenerated?: boolean;
  readonly locExtra?: string;
  readonly loc?: ExtendedLocation;
};

export type ExtendedASTNode<T extends ASTNode> = T & ASTNodeExtensions;
export type ExtendedDefinitionNode = ExtendedASTNode<DefinitionNode>;
export type ExtendedTypeSystemDefinitionNode = ExtendedASTNode<TypeSystemDefinitionNode>;

export interface NamedNode {
  readonly loc?: Location;
  readonly name: NameNode;
}

export function isNamedNode(mayBeNode: any): mayBeNode is NamedNode {
  return mayBeNode && mayBeNode.name && mayBeNode.name.value;
}
