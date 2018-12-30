import {
  ArgumentNode,
  DirectiveNode,
  FieldDefinitionNode,
  GraphQLError,
  Kind,
  NamedTypeNode,
  parse,
  TypeNode,
  valueFromASTUntyped,
  visit,
} from 'graphql';
import invariant from 'invariant';
import { ExtendedDefinitionNode, ExtendedDocumentNode } from './types';

interface CreateConnectionOptions {
  connection?: string;
  edge?: string;
  directions?: 'BOTH' | 'FORWARD' | 'BACKWARD';
}

function objectFromArgumentNodes(
  args?: ReadonlyArray<ArgumentNode>,
): { [name: string]: unknown } | undefined {
  if (!args) {
    return undefined;
  }

  return args.reduce((result: { [name: string]: unknown }, arg: ArgumentNode) => {
    if (arg.value.kind === Kind.VARIABLE) {
      throw new GraphQLError('Directives does not support variables', arg.value);
    }

    result[arg.name.value] = valueFromASTUntyped(arg.value) as unknown;

    return result;
  }, {});
}

function addArgument(
  field: FieldDefinitionNode,
  argName: string,
  argType: string,
  argDescription: string,
): FieldDefinitionNode {
  return {
    ...field,
    arguments: [
      ...(field.arguments || []),
      {
        kind: Kind.INPUT_VALUE_DEFINITION,
        description: {
          kind: Kind.STRING,
          value: argDescription,
          block: true,
        },
        name: {
          kind: Kind.NAME,
          value: argName,
        },
        type: {
          kind: Kind.NAMED_TYPE,
          name: {
            kind: Kind.NAME,
            value: argType,
          },
        },
        directives: [],
      },
    ],
  };
}

function addForwardPaginationArgs(field: FieldDefinitionNode): FieldDefinitionNode {
  let outField: FieldDefinitionNode = field;
  outField = addArgument(outField, 'first', 'Int', 'Forward pagination limit');
  outField = addArgument(outField, 'after', 'String', 'Forward pagination cursor');

  return outField;
}

function addBackwardPaginationArgs(field: FieldDefinitionNode): FieldDefinitionNode {
  let outField: FieldDefinitionNode = field;
  outField = addArgument(outField, 'last', 'Int', 'Backward pagination limit');
  outField = addArgument(outField, 'before', 'String', 'Backward pagination cursor');

  return outField;
}

interface BuildConnectionOptions extends CreateConnectionOptions {
  node: string;
  connection: string;
  edge: string;
  isNonNullInner: boolean;
  isNonNullOuter: boolean;
}

interface ConnectionTypes extends ExtendedDocumentNode {
  connectionType: TypeNode;
}

function buildConnectionTypes(opts: BuildConnectionOptions): ConnectionTypes {
  const src = `
  type ${opts.edge} {
    cursor: String!
    node: ${opts.node}${opts.isNonNullInner ? '!' : ''}
  }

  type ${opts.connection} {
    edges: [${opts.edge}${opts.isNonNullInner ? '!' : ''}]${opts.isNonNullOuter ? '!' : ''}
    pageInfo: PageInfo!
  }
`;

  const ast = parse(src, {
    noLocation: true,
  });

  const nullableConnectionType: NamedTypeNode = {
    kind: Kind.NAMED_TYPE,
    name: { kind: Kind.NAME, value: opts.connection },
  };

  return {
    ...opts,
    kind: Kind.DOCUMENT,
    definitions: ast.definitions.map((def) => ({
      ...def,
      isGenerated: true,
      locExtra: '(@pagination)',
    })),
    connectionType: opts.isNonNullOuter
      ? { kind: Kind.NON_NULL_TYPE, type: nullableConnectionType }
      : nullableConnectionType,
  };
}

function expandPaginationOnAST(ast: ExtendedDocumentNode): ExtendedDocumentNode {
  // tslint:disable-next-line: no-unsafe-any
  invariant(ast && ast.kind === Kind.DOCUMENT, 'Must provide valid Document AST');

  const connections: Map<string, ReturnType<typeof buildConnectionTypes>> = new Map();

  function createConnection(
    inField: FieldDefinitionNode,
    paginationArgs: CreateConnectionOptions = {},
  ): FieldDefinitionNode {
    let field: FieldDefinitionNode = inField;
    const fieldName: string = field.name.value;
    let nodeType: TypeNode = field.type;
    // for `nodes`
    let isNonNullOuter = false;
    let isNonNullInner = false;

    // unwrap outer non null
    if (nodeType.kind === Kind.NON_NULL_TYPE) {
      nodeType = nodeType.type;
      isNonNullOuter = true;
    }

    // unwrap list
    if (nodeType.kind === Kind.LIST_TYPE) {
      nodeType = nodeType.type;
    } else {
      const nodeTypeNameOrKind: string = nodeType.name ? nodeType.name.value : nodeType.kind;
      throw new Error(
        `You should use @pagination directive exclusively with List Type:
Like \`${fieldName}(...): [${nodeTypeNameOrKind}]\``,
      );
    }

    // unwrap inner non null
    if (nodeType.kind === Kind.NON_NULL_TYPE) {
      nodeType = nodeType.type;
      isNonNullInner = true;
      // TODO: Warn
    }

    if (nodeType.kind !== Kind.NAMED_TYPE) {
      throw new Error(`Expected namet type, found "${nodeType.kind}"`);
    }

    const node = nodeType.name.value;

    const connection = paginationArgs.connection || `${node}Connection`;

    const edge = paginationArgs.edge || `${node}Edge`;

    const directions = paginationArgs.directions || 'BOTH';
    if (!['BOTH', 'FORWARD', 'BACKWARD'].includes(directions)) {
      throw new Error(`Invalid direction in @pagination: ${directions}`);
    }

    if (directions === 'BOTH' || directions === 'FORWARD') {
      field = addForwardPaginationArgs(field);
    }
    if (directions === 'BOTH' || directions === 'BACKWARD') {
      field = addBackwardPaginationArgs(field);
    }

    let connectionTypes = connections.get(connection);
    if (connectionTypes) {
      // reuse type
      const errors = [];
      if (connectionTypes.node !== node) {
        errors.push(
          `Connection ${connection} used for incompatible types: ${
            connectionTypes.node
          } and ${node}`,
        );
      }
      if (connectionTypes.edge !== edge) {
        errors.push(
          `Connection ${connection} used for incompatible types: ${
            connectionTypes.edge
          } and ${edge}`,
        );
      }
      if (connectionTypes.isNonNullInner !== isNonNullInner) {
        errors.push('Inconsistent inner non null');
      }
      if (connectionTypes.isNonNullOuter !== isNonNullOuter) {
        errors.push('Inconsistent outer non null');
      }
      if (errors.length) {
        throw new Error(
          `Directive @pagination on field ${fieldName} error: \n  ${errors.join('\n  ')}`,
        );
      }
    } else {
      // create new connectionTypes type
      connectionTypes = buildConnectionTypes({
        connection,
        edge,
        node,
        isNonNullInner,
        isNonNullOuter,
      });
      connections.set(connection, connectionTypes);
    }
    field = {
      ...field,
      type: connectionTypes.connectionType,
    };

    return field;
  }

  let currentFieldDefinition: FieldDefinitionNode | null = null;
  let currentPaginationDirective: DirectiveNode | null = null;

  const astWithoutPaginationDirectives: ExtendedDocumentNode = visit(ast, {
    [Kind.DIRECTIVE]: (directiveAst, key, parent, path) => {
      // skip
      if (directiveAst.name.value !== 'pagination') {
        return false;
      }

      invariant(
        currentFieldDefinition,
        '@pagination directive used out of allowed scope: %s',
        path,
      );
      currentPaginationDirective = directiveAst;

      // delete
      return null;
    },
    [Kind.FIELD_DEFINITION]: {
      enter: (fieldAst) => {
        invariant(!currentPaginationDirective, '@pagination directive used out of allowed scope');
        currentFieldDefinition = fieldAst;
      },
      leave: (fieldAst) => {
        if (currentPaginationDirective) {
          const transformedField = createConnection(
            fieldAst,
            objectFromArgumentNodes(currentPaginationDirective.arguments),
          );
          currentPaginationDirective = null;

          return transformedField;
        }
      },
    },
    [Kind.DOCUMENT]: {
      leave: (document) => {
        const connectionDefinitions: ExtendedDefinitionNode[] = [];
        for (const { definitions } of connections.values()) {
          definitions.forEach((def) => connectionDefinitions.push(def));
        }

        return {
          ...document,
          definitions: [...document.definitions, ...connectionDefinitions],
        } as ExtendedDocumentNode;
      },
    },
  }) as ExtendedDocumentNode;

  return astWithoutPaginationDirectives;
}

export default expandPaginationOnAST;
