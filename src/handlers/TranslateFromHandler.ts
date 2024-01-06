import * as vscode from "vscode";
import { LocalizableString, LocalizationRepository } from "../repositories/LocalizationRepository";
import { TranslationRepository } from "../repositories/TranslationRepository";

class TranslateFrom {
  constructor(
    private localizationRepository: LocalizationRepository,
    private translationRepository: TranslationRepository
  ) {}

  public async execute(localizableString: LocalizableString, fromLanguage: string | undefined) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Translating ${localizableString.name}`,
      },
      async () => {
        await this.translate(localizableString, fromLanguage);
      }
    );
  }

  private async translate(localizableString: LocalizableString, fromLanguage: string | undefined) {
    if (fromLanguage === undefined) {
      fromLanguage = await this.getFromLanguage(localizableString);
      if (fromLanguage === undefined) {
        return;
      }
    }

    const translations = await this.translateString(localizableString, fromLanguage);
    if (translations === undefined) {
      return;
    }

    for (const translation of translations) {
      const targetLanguage = localizableString.availableLanguages.find((t) => t.name === translation.language);
      if (targetLanguage !== undefined) {
        await this.localizationRepository.addOrUpdate(localizableString, targetLanguage, translation.text);
      }
    }
  }

  private async getFromLanguage(localizableString: LocalizableString) {
    return await vscode.window.showQuickPick(
      localizableString.resources.map((t) => t.language.name),
      {
        title: "translate from",
      }
    );
  }

  private async translateString(localizableString: LocalizableString, fromLanguage: string) {
    const sourceString = localizableString.resources.find((t) => t.language.name === fromLanguage);
    if (sourceString === undefined) {
      return;
    }

    const targetLanguages = localizableString.availableLanguages
      .filter((t) => t.name !== fromLanguage)
      .map((t) => t.name);

    return await this.translationRepository.translate(fromLanguage, sourceString.text, targetLanguages);
  }
}

function register(localizationRepository: LocalizationRepository) {
  const handler = new TranslateFrom(localizationRepository, new TranslationRepository());

  vscode.commands.registerCommand("spfx-resources.translate-from", handler.execute.bind(handler));
}

export default register;
