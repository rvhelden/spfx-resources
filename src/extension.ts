import * as vscode from "vscode";
import { SPFxTreeProvider } from "./SPFxTreeProvider";
import { CodelensProvider } from "./CodelensProvider";
import { LocalizationRepository } from "./repositories/LocalizationRepository";
import registerAddLanguage from "./handlers/AddLanguageHandler";
import registerAddTranslation from "./handlers/AddTranslationHandler";
import registerTranslateAll from "./handlers/TranslateAllHandler";
import registerTranslateFrom from "./handlers/TranslateFromHandler";
import registerTranslateFromTo from "./handlers/TranslateFromToHandler";
import registerEditResource from "./handlers/EditResourceHandler";
import registerRefresh from "./handlers/RefreshHandler";
import registerRemoveTranslation from "./handlers/RemoveTranslationHandler";
import registerOpenFile from "./handlers/OpenFileHandler";
import { TranslationsActionProvider } from "./TranslationsActionProvider";

const resourceSelector = {
  scheme: "file",
  language: "typescript",
  pattern: "**/src/**/loc/*.d.ts",
};

export function activate(context: vscode.ExtensionContext) {
  const localizationRepository = new LocalizationRepository();
  const spfxProvider = new SPFxTreeProvider();

  registerAddLanguage();
  registerTranslateAll();
  registerAddTranslation(localizationRepository);
  registerTranslateFrom(localizationRepository);
  registerTranslateFromTo(localizationRepository);
  registerEditResource();
  registerRefresh(spfxProvider);
  registerRemoveTranslation(localizationRepository);
  registerOpenFile();

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
