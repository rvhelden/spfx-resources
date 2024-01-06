import * as vscode from "vscode";
import * as path from "path";
import { Language, Localization } from "../repositories/LocalizationRepository";

function addLanguage() {
  return async (localization: Localization) => {
    const languageName = await vscode.window.showInputBox({
      title: "Which language do you want to add?",
      placeHolder: "en-us",
    });

    if (languageName === undefined) {
      return;
    }

    const language = await createLanguage(localization, languageName);

    await vscode.commands.executeCommand("spfx-resources.translate-all", localization, language);
  };
}

async function createLanguage(localization: Localization, language: string): Promise<Language> {
  const folder = path.dirname(localization.uri.path);
  const fullPath = path.join(folder, `${language}.js`);

  const edit = new vscode.WorkspaceEdit();
  edit.createFile(vscode.Uri.file(fullPath));
  edit.insert(vscode.Uri.file(fullPath), new vscode.Position(0, 0), "define([], function() { return {}; });");

  await vscode.workspace.applyEdit(edit);

  const document = await vscode.workspace.openTextDocument(fullPath);
  await document.save();

  return {
    name: language,
    fileName: fullPath,
  };
}

async function getFromLanguage(localization: Localization) {
  return await vscode.window.showQuickPick(
    localization.availableLanguages.map((t) => t.name),
    {
      title: "translate from",
    }
  );
}

function register() {
  vscode.commands.registerCommand("spfx-resources.add-language", addLanguage());
}

export default register;
