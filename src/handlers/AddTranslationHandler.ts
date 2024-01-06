import * as vscode from "vscode";
import { LocalizableString, Language, LocalizationRepository } from "../repositories/LocalizationRepository";

function addTranslationHandler(localizationRepository: LocalizationRepository) {
  return async (localizableString: LocalizableString, language: Language) => {
    if (localizableString.resources.length > 0) {
      await vscode.commands.executeCommand("spfx-resources.translate-from-to", localizableString, language);
    } else {
      await createNew(localizationRepository, localizableString, language);
    }
  };
}

async function createNew(
  localizationRepository: LocalizationRepository,
  localizableString: LocalizableString,
  language: Language
) {
  const translation = await vscode.window.showInputBox({ title: "translation", placeHolder: "my translation" });
  if (translation !== undefined) {
    await localizationRepository.addOrUpdate(localizableString, language, translation);
  }
}

function register(localizationRepository: LocalizationRepository) {
  vscode.commands.registerCommand("spfx-resources.add-translation", addTranslationHandler(localizationRepository));
}

export default register;
