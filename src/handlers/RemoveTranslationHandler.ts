import * as vscode from "vscode";
import { LocalizableString, LocalizationRepository } from "../repositories/LocalizationRepository";
import { removeRangeFromDocument } from "../vscode-helpers";

function removeTranslationHandler(localizationRepository: LocalizationRepository) {
  return async (localizableString: LocalizableString) => {
    await localizationRepository.remove(localizableString);

    const sourceRange = localizableString.range;
    const range = sourceRange.with({
      end: sourceRange.end.with({
        line: sourceRange.end.line + 1,
        character: sourceRange.start.character,
      }),
    });

    removeRangeFromDocument(localizableString.uri.fsPath, range);
  };
}

function register(localizationRepository: LocalizationRepository) {
  vscode.commands.registerCommand(
    "spfx-resources.remove-translation",
    removeTranslationHandler(localizationRepository)
  );
}

export default register;
