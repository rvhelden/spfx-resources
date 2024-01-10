import * as ts from "typescript";
import * as vscode from "vscode";

export function findAll<T extends ts.Node>(node: ts.Node, predicate: (node: ts.Node) => node is T) {
  const nodes = new Array<T>();

  if (predicate(node)) {
    nodes.push(node);
  }

  node.forEachChild((child) => {
    const found = findAll<T>(child, predicate);
    nodes.push(...found);
  });

  return nodes as T[];
}

export function createRange(source: ts.SourceFile, node: ts.Node) {
  const start = source.getLineAndCharacterOfPosition(node.getStart(source));
  const end = source.getLineAndCharacterOfPosition(node.getEnd());

  return new vscode.Range(
    new vscode.Position(start.line, start.character),
    new vscode.Position(end.line, end.character)
  );
}

export function getPropertyAssignments(source: ts.SourceFile) {
  return findAll<ts.PropertyAssignment>(source, ts.isPropertyAssignment);
}

export function getObjectLiteralExpression(source: ts.SourceFile) {
  return findAll<ts.ObjectLiteralExpression>(source, ts.isObjectLiteralExpression);
}

export function getPropertySignatures(source: ts.SourceFile) {
  return findAll<ts.PropertySignature>(source, ts.isPropertySignature);
}

export function getInterfaceDeclarations(source: ts.SourceFile) {
  return findAll<ts.InterfaceDeclaration>(source, ts.isInterfaceDeclaration);
}
