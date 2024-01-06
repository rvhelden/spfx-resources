import * as vscode from "vscode";
import { SPFxTreeProvider } from "./SPFxTreeProvider";
import { CodelensProvider } from "./CodelensProvider";
import { LocalizationRepository } from "./repositories/LocalizationRepository";
import registerAddTranslation from "./handlers/AddTranslationHandler";
import registerTranslateFrom from "./handlers/TranslateFromHandler";
import registerTranslateFromTo from "./handlers/TranslateFromToHandler";
import registerEditResource from "./handlers/EditResourceHandler";
import registerRefresh from "./handlers/RefreshHandler";
import registerOpenFile from "./handlers/OpenFileHandler";
import registerDeleteResource from "./handlers/DeleteResourceHandler";
import { TranslationsActionProvider } from "./TranslationsActionProvider";

const resourceSelector = {
  scheme: "file",
  language: "typescript",
  pattern: "**/src/**/loc/*.d.ts",
};

export function activate(context: vscode.ExtensionContext) {
  const localizationRepository = new LocalizationRepository();
  const spfxProvider = new SPFxTreeProvider();

  registerAddTranslation(localizationRepository);
  registerTranslateFrom(localizationRepository);
  registerTranslateFromTo(localizationRepository);
  registerEditResource();
  registerRefresh(spfxProvider);
  registerOpenFile();
  registerDeleteResource(spfxProvider);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(resourceSelector, new CodelensProvider(localizationRepository))
  );

  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      resourceSelector,
      new TranslationsActionProvider(localizationRepository),
      {
        providedCodeActionKinds: TranslationsActionProvider.providedCodeActionKinds,
      }
    )
  );

  if (!vscode.workspace.workspaceFolders) {
    return;
  }

  vscode.window.registerTreeDataProvider("spfx-resource-projects", spfxProvider);

  const tree = vscode.window.createTreeView("spfx-resource-projects", {
    treeDataProvider: spfxProvider,
    showCollapseAll: true,
  });
}
