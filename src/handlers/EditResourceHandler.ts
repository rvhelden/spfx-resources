import * as vscode from "vscode";
import { NamedResource } from "../Types";

function handler(item: NamedResource) {
  if (item.resourcePath?.definition != null) {
    return vscode.workspace
      .openTextDocument(item.resourcePath.definition)
      .then((doc) => vscode.window.showTextDocument(doc));
  }
}

function register() {
  vscode.commands.registerCommand("spfx-resources.edit-resource", handler);
}

export default register;
