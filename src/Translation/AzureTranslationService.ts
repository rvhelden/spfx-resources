/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { arrayOf, type } from "arktype";
import { ITranslationService } from "./TranslationService";

export class AzureTranslationService implements ITranslationService {
  public async translate(
    fromLanguage: string,
    fromString: string,
    targetLanguages: string[]
  ): Promise<{ language: string; text: string }[]> {
    const config = vscode.workspace.getConfiguration("spfxresources");
    const apiKey = config.get<string>("azure-subscriptionKey");
    const endpoint = config.get<string>("azure-endpoint", "https://api.cognitive.microsofttranslator.com/");

    const result = await fetch(
      `${endpoint}/translate?api-version=3.0&from=${fromLanguage}&to=${targetLanguages.join("&to=")}`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey ?? "",
          "Content-type": "application/json",
        },
        body: JSON.stringify([{ text: fromString }]),
      }
    );

    const response = AzureTranslations(await result.json());

    if (response.problems) {
      for (const problem of response.problems) {
        console.error(problem.toString());
      }

      return [];
    }

    return response.data[0].translations.map((x) => ({
      language: targetLanguages.find((l) => l.startsWith(x.to)) ?? x.to,
      text: x.text,
    }));
  }
}

const AzureTranslations = arrayOf(
  type({
    translations: arrayOf(
      type({
        text: "string",
        to: "string",
      })
    ),
  })
);
