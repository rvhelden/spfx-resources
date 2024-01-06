import * as vscode from "vscode";
import { Language, Localization } from "../repositories/LocalizationRepository";

function translateAll() {
  return async (localization: Localization, language: Language | undefined) => {
    const fromLanguage = await getFromLanguage(localization);
    if (fromLanguage === undefined) {
      return;
    }

    for (const localizableString of localization.localizableStrings) {
      if (language === undefined) {
        await vscode.commands.executeCommand("spfx-resources.translate-from", localizableString, fromLanguage);
      } else {
        await vscode.commands.executeCommand(
          "spfx-resources.translate-from-to",
          localizableString,
          language,
          fromLanguage
        );
      }
    }
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
  vscode.commands.registerCommand("spfx-resources.translate-all", translateAll());
}

export default register;
