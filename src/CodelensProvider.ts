import * as vscode from "vscode";

import { CodeLens, CodeLensProvider, EventEmitter, TextDocument } from "vscode";
import { Localization, LocalizationRepository } from "./repositories/LocalizationRepository";

export class CodelensProvider implements CodeLensProvider {
  private _onDidChangeCodeLenses = new EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  private readonly localizationRepository;

  constructor(localizationRepository: LocalizationRepository) {
    this.localizationRepository = localizationRepository;

    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  public async provideCodeLenses(document: TextDocument) {
    const localization = await this.localizationRepository.getLocalization(document);
    if (localization !== undefined) {
      return createLenses(document, localization);
    }
  }
}

function createLenses(document: vscode.TextDocument, localization: Localization) {
  const codeLenses = [
    new CodeLens(localization.range, {
      title: "add language",
      command: "spfx-resources.add-language",
      arguments: [document.fileName],
    }),
  ];

  for (const localizableString of localization.localizableStrings) {
    for (const language of localization.availableLanguages) {
      const translation = localizableString.translations.find((t) => t.language.name === language.name);

      if (translation === undefined) {
        const codeLens = new CodeLens(localizableString.range, {
          title: `add ${language.name}`,
          command: "spfx-resources.add-translation",
          arguments: [localizableString, language],
        });

        codeLenses.push(codeLens);
      } else {
        const codeLens = new CodeLens(localizableString.range, {
          title: language.name,
          tooltip: translation.text,
          command: "spfx-resources.open-file",
          arguments: [language.fileName, translation.textRange],
        });

        codeLenses.push(codeLens);
      }
    }
  }

  return codeLenses;
}
