import * as vscode from "vscode";
import { AzureTranslationService } from "./AzureTranslationService";
import { OpenAITranslationService } from "./OpenAITranslationService";

export interface ITranslationService {
  translate(
    fromLanguage: string,
    fromString: string,
    targetLanguages: string[]
  ): Promise<{ language: string; text: string }[]>;
}

export class TranslationServiceFactory {
  static getService(): ITranslationService {
    const serviceChoice = vscode.workspace.getConfiguration("spfxresources").get<string>("translationService", "Azure");

    if (serviceChoice === "OpenAI") {
      return new OpenAITranslationService();
    } else {
      return new AzureTranslationService();
    }
  }
}
