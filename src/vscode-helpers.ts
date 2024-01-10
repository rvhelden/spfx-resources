import * as vscode from "vscode";

export async function removeRangeFromDocument(fileName: string, range: vscode.Range) {
  const document = await vscode.workspace.openTextDocument(fileName);

  const edit = new vscode.WorkspaceEdit();
  edit.delete(document.uri, range);
  vscode.workspace.applyEdit(edit);

  await document.save();
}

export async function insertIntoDocument(fileName: string, position: vscode.Position, newText: string) {
  const document = await vscode.workspace.openTextDocument(fileName);

  const edit = new vscode.WorkspaceEdit();
  edit.insert(document.uri, position, newText);
  vscode.workspace.applyEdit(edit);

  await document.save();
}

export async function replaceInDocument(fileName: string, range: vscode.Range, newText: string) {
  const document = await vscode.workspace.openTextDocument(fileName);

  const edit = new vscode.WorkspaceEdit();
  edit.replace(document.uri, range, newText);
  vscode.workspace.applyEdit(edit);

  await document.save();
}
