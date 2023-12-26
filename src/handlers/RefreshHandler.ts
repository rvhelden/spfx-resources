import * as vscode from "vscode";
import { SPFxTreeProvider } from "../SPFxTreeProvider";

function register(spfxProvider: SPFxTreeProvider) {
  vscode.commands.registerCommand("spfx-resources.refresh", () => spfxProvider.refresh());
}

export default register;
