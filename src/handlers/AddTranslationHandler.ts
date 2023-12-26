import * as vscode from "vscode";
import { LocalizableString, Language, LocalizationRepository } from "../repositories/LocalizationRepository";

function addTranslationHandler(localizationRepository: LocalizationRepository) {
  return async (localizableString: LocalizableString, language: Language, open?: boolean) => {
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
  };
}

function register(localizationRepository: LocalizationRepository) {
  vscode.commands.registerCommand("spfx-resources.add-translation", addTranslationHandler(localizationRepository));
}

export default register;
