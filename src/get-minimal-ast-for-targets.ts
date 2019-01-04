// // tslint:disable:no-unsafe-any
// // tslint:disable:no-any
// // tslint:disable:no-shadowed-variable
//
// /**
//  *
//  *
//  * DEPRECATED MODULE
//  *
//  * NOT USED
//  *
//  * NOT EXPORTED
//  *
//  *
//  */
//
// import { DocumentNode, GraphQLList, GraphQLString } from 'graphql';
// import { Kind, ValueNode, visit } from 'graphql';
// import { valueFromAST } from 'graphql/utilities';
// import invariant from 'invariant';
//
// const GraphQLListOfString = new GraphQLList(GraphQLString);
// const stringListFromAST = (astNode?: ValueNode) => valueFromAST(astNode, GraphQLListOfString);
//
// function removeTargetDirective(ast: DocumentNode) {
//   return visit(ast, {
//     [Kind.DIRECTIVE]: (directiveAst, key, parent, path, ancestors) => {
//       // console.log(ancestors[ancestors.length - 1].kind);
//       // returning null will remove node from AST
//       if (directiveAst.name.value === 'target') {
//         return null;
//       }
//     },
//   });
// }
//
// // Find everything with @target directive and build minimal graphql schema
// export default function getMinimalASTForTargets(ast: DocumentNode) {
//   invariant(ast && ast.kind === Kind.DOCUMENT, 'Must provide valid Document AST');
//
//   const getTargetDirective = (def) => {
//     invariant(def.directives, 'def.directives must be defined');
//     const targetDirectives = def.directives
//       .filter((def) => def.name.value === 'target')
//       .map((def) => {
//         return (
//           def.arguments &&
//           def.arguments.reduce((result, arg) => {
//             result[arg.name.value] = stringListFromAST(arg.value);
//
//             return result;
//           }, Object.create(null))
//         );
//       });
//     if (targetDirectives.length === 0) {
//       return null;
//     }
//     if (targetDirectives.length === 1) {
//       const result = targetDirectives[0];
//       invariant(
//         Array.isArray(result.module) && result.module.every((modul) => typeof modul === 'string'),
//         "Directive @target must have 'module' argument of type [String!]!",
//       );
//
//       return result;
//     }
//     invariant(false, 'Multiple @target directives not supported: %s', JSON.stringify(def));
//   };
//
//   class ModuleDef {
//     def: any;
//     defMap: Map<string, any>;
//
//     constructor() {
//       this.def = {
//         ...ast,
//         definitions: [],
//       };
//       this.defMap = new Map();
//     }
//
//     addTypeDefinition(typeDef) {
//       this.def.definitions.push(removeTargetDirective(typeDef));
//       this.defMap.set(typeDef.name.value, typeDef);
//     }
//
//     addTypeFieldDefinition(typeDef, fieldDef) {
//       let regTypeDef = this.defMap.get(typeDef.name.value);
//       if (!regTypeDef) {
//         regTypeDef = {
//           ...typeDef,
//           fields: [],
//         };
//         this.def.definitions.push(regTypeDef);
//         this.defMap.set(typeDef.name.value, regTypeDef);
//       }
//       regTypeDef.fields.push(removeTargetDirective(fieldDef));
//     }
//   }
//
//   const moduleMap = new Map();
//   const getModule = (moduleName) => {
//     let modul = moduleMap.get(moduleName);
//     if (modul) {
//       return modul;
//     }
//     modul = new ModuleDef();
//     moduleMap.set(moduleName, modul);
//
//     return modul;
//   };
//
//   const namedTypeMap = new Map();
//
//   // only two cases of directive locations
//   for (const def of ast.definitions) {
//     switch (def.kind) {
//       case Kind.ENUM_TYPE_DEFINITION:
//       case Kind.SCALAR_TYPE_DEFINITION:
//       case Kind.INTERFACE_TYPE_DEFINITION:
//       case Kind.INPUT_OBJECT_TYPE_DEFINITION: {
//         namedTypeMap.set(def.name.value, def);
//         break;
//       }
//
//       case Kind.OBJECT_TYPE_DEFINITION: {
//         namedTypeMap.set(def.name.value, def);
//         // directives at object definition
//         if (def.directives.length) {
//           const target = getTargetDirective(def);
//           if (target) {
//             target.module.forEach((modul) => {
//               getModule(modul).addTypeDefinition(def);
//             });
//           }
//         }
//
//         for (const field of def.fields) {
//           // directives at field definition
//           if (field.directives.length) {
//             const target = getTargetDirective(field);
//             if (target) {
//               target.module.forEach((modul) => {
//                 getModule(modul).addTypeFieldDefinition(def, field);
//               });
//             }
//           }
//         }
//         break;
//       }
//
//       default:
//         break;
//     }
//   }
//
//   const result = new Map();
//   for (const [target, modul] of moduleMap) {
//     // inject dependencies
//     const addDependencies = (def) =>
//       visit(def, {
//         [Kind.NAMED_TYPE]: (astNode) => {
//           const typeName = astNode.name.value;
//           if (!modul.defMap.has(typeName) && namedTypeMap.has(typeName)) {
//             let dependencyDef = namedTypeMap.get(typeName);
//
//             const descriptionText = [
//               dependencyDef.description && dependencyDef.description.value,
//               '__NOTE__: implicitly imported',
//             ]
//               .filter((x) => x)
//               .join('\n\n');
//
//             const description = {
//               ...(dependencyDef.description || { kind: Kind.STRING }),
//               value: descriptionText,
//               block: true,
//             };
//
//             dependencyDef = {
//               ...dependencyDef,
//               description,
//             };
//             modul.addTypeDefinition(dependencyDef);
//             addDependencies(dependencyDef);
//           }
//         },
//       });
//
//     addDependencies(modul.def);
//     result.set(target, modul.def);
//   }
//
//   return result;
// }
