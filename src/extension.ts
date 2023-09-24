import * as vscode from "vscode";
import { SPFxTreeProvider } from "./SPFxTreeProvider";
import { NamedResource } from "./Types";
import { CodelensProvider } from "./CodelensProvider";
import { Language, LocalizableString, LocalizationRepository } from "./repositories/LocalizationRepository";
import ts = require("typescript");
import { createRange, findAll } from "./Typescript";

export function activate(context: vscode.ExtensionContext) {
  const localizationRepository = new LocalizationRepository();

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      {
        scheme: "file",
        language: "typescript",
        pattern: "**/src/**/loc/*.d.ts",
      },
      new CodelensProvider(localizationRepository)
    )
  );

  if (!vscode.workspace.workspaceFolders) {
    return;
  }

  const spfxProvider = new SPFxTreeProvider();
  vscode.window.registerTreeDataProvider("spfx-resource-projects", spfxProvider);

  vscode.commands.registerCommand("spfx-resources.refresh", () => spfxProvider.refresh());

  vscode.commands.registerCommand("spfx-resources.edit-resource", (item: NamedResource) => {
    if (item.resourcePath?.definition != null) {
      return vscode.workspace
        .openTextDocument(item.resourcePath.definition)
        .then((doc) => vscode.window.showTextDocument(doc));
    }
  });

  vscode.commands.registerCommand("spfx-resources.open-file", async (path: string, range: vscode.Range) => {
    console.log("open-file", path, range);
    const doc = await vscode.workspace.openTextDocument(path);
    return await vscode.window.showTextDocument(doc, { selection: range });
  });

  vscode.commands.registerCommand(
    "spfx-resources.add-translation",
    async (localizableString: LocalizableString, language: Language, open?: boolean) => {
      const translation = await vscode.window.showInputBox({ title: "translation", placeHolder: "my translation" });
      if (translation === undefined) {
        return;
      }

      const range = await localizationRepository.addTranslation(localizableString, language, translation);

      if (open) {
        const document = await vscode.workspace.openTextDocument(language.fileName);
        await vscode.window.showTextDocument(document, {
          selection: range,
        });
      }
    }
  );

  vscode.commands.registerCommand("spfx-resources.delete-resource", () => spfxProvider.refresh());

  const tree = vscode.window.createTreeView("spfx-resource-projects", {
    treeDataProvider: spfxProvider,
    showCollapseAll: true,
  });
}
