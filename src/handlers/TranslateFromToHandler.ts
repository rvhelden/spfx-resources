import * as vscode from "vscode";
import { Language, LocalizableString, LocalizationRepository } from "../repositories/LocalizationRepository";
import { TranslationRepository } from "../repositories/TranslationRepository";

class TranslateFromTo {
  constructor(
    private localizationRepository: LocalizationRepository,
    private translationRepository: TranslationRepository
  ) {}

  public async execute(
    localizableString: LocalizableString,
    targetLanguage: Language,
    fromLanguage: string | undefined
  ) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Translating ${localizableString.name} to ${targetLanguage.name}`,
      },
      async () => {
        await this.translate(localizableString, targetLanguage, fromLanguage);
      }
    );
  }

  private async translate(
    localizableString: LocalizableString,
    targetLanguage: Language,
    fromLanguage: string | undefined
  ) {
    if (fromLanguage === undefined) {
      fromLanguage = await this.getFromLanguage(localizableString);
      if (fromLanguage === undefined) {
        return;
      }
    }

    const translation = await this.translateString(localizableString, fromLanguage, targetLanguage);
    if (translation === undefined) {
      return;
    }

    await this.localizationRepository.addOrUpdate(localizableString, targetLanguage, translation.text);
  }

  private async getFromLanguage(localizableString: LocalizableString) {
    return await vscode.window.showQuickPick(
      localizableString.resources.map((t) => t.language.name),
      {
        title: "translate from",
      }
    );
  }

  private async translateString(localizableString: LocalizableString, fromLanguage: string, targetLanguage: Language) {
    const sourceString = localizableString.resources.find((t) => t.language.name === fromLanguage);
    if (sourceString !== undefined) {
      const translations = await this.translationRepository.translate(fromLanguage, sourceString.text, [
        targetLanguage.name,
      ]);
      return translations.pop();
    }

    return undefined;
  }
}

function register(localizationRepository: LocalizationRepository) {
  const handler = new TranslateFromTo(localizationRepository, new TranslationRepository());

  vscode.commands.registerCommand("spfx-resources.translate-from-to", handler.execute.bind(handler));
}

export default register;
