import * as vscode from "vscode";
import { LocalizableString, LocalizationRepository } from "../repositories/LocalizationRepository";
import { TranslationRepository } from "../repositories/TranslationRepository";

class TranslateFrom {
  constructor(
    private localizationRepository: LocalizationRepository,
    private translationRepository: TranslationRepository
  ) {}

  public async execute(localizableString: LocalizableString) {
    const fromLanguage = await this.getFromLanguage(localizableString);
    if (fromLanguage === undefined) {
      return;
    }

    const translations = await this.translateString(localizableString, fromLanguage);
    if (translations === undefined) {
      return;
    }

    for (const translation of translations) {
      const language = localizableString.translations.find((t) => t.language.name === translation.language);
      if (language === undefined) {
        continue;
      }

      language.text = translation.text;
    }

    await this.localizationRepository.updateTranslation(localizableString);
  }

  private async getFromLanguage(localizableString: LocalizableString) {
    return await vscode.window.showQuickPick(
      localizableString.translations.map((t) => t.language.name),
      {
        title: "translate from",
      }
    );
  }

  private async translateString(localizableString: LocalizableString, fromLanguage: string) {
    const sourceString = localizableString.translations.find((t) => t.language.name === fromLanguage);
    if (sourceString === undefined) {
      return;
    }

    const targetLanguages = localizableString.translations
      .filter((t) => t.language.name !== fromLanguage)
      .map((t) => t.language.name);

    return await this.translationRepository.translate(fromLanguage, sourceString.text, targetLanguages);
  }
}

function register(localizationRepository: LocalizationRepository) {
  const handler = new TranslateFrom(localizationRepository, new TranslationRepository());

  vscode.commands.registerCommand("spfx-resources.translate-from", handler.execute.bind(handler));
}

export default register;
