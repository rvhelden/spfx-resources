import * as vscode from "vscode";

async function handler(path: string, range: vscode.Range) {
  const doc = await vscode.workspace.openTextDocument(path);
  return await vscode.window.showTextDocument(doc, { selection: range });
}

function register() {
  vscode.commands.registerCommand("spfx-resources.open-file", handler);
}

export default register;
