/* eslint-disable @typescript-eslint/naming-convention */
import OpenAI from "openai";
import * as vscode from "vscode";
import { arrayOf, type } from "arktype";
import { ChatCompletionTool } from "openai/resources";

const Translations = type({
  translations: arrayOf(
    type({
      language: "string",
      text: "string",
    })
  ),
});

const systemMessage = `You are a text translator, you translate the text from one language to serveral other languaes. You are given a text in a language and a list of languages to translate it to.`;

export class TranslationRepository {
  public async translate(fromLanguage: string, fromString: string, targetLanguages: string[]) {
    const completion = await this.fetchOpenAI(fromLanguage, fromString, targetLanguages);

    const response = Translations(JSON.parse(completion.choices[0].message.tool_calls![0].function.arguments));
    if (response.problems) {
      for (const problem of response.problems) {
        console.error(problem.toString());
      }

      return [];
    }

    return response.data.translations;
  }

  private async fetchOpenAI(fromLanguage: string, fromString: string, targetLanguages: string[]) {
    const config = vscode.workspace.getConfiguration("spfxresources");
    const apiKey = config.get<string>("openAIKey");

    const openai = new OpenAI({ apiKey });

    return await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: this.createUserMessage(fromLanguage, fromString, targetLanguages),
        },
      ],
      tools: this.createTranslateTool(),
      // eslint-disable-next-line @typescript-eslint/naming-convention
      tool_choice: { type: "function", function: { name: "translate" } },
    });
  }

  private createTranslateTool(): Array<ChatCompletionTool> {
    return [
      {
        type: "function",
        function: {
          name: "translate",
          parameters: {
            type: "object",
            properties: {
              translations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    language: {
                      type: "string",
                    },
                    text: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
      },
    ];
  }

  private createUserMessage(fromLanguage: string, fromString: string, targetLanguages: string[]) {
    return `translate ${fromString} (${fromLanguage}) to the following languages: ${targetLanguages.join(", ")}`;
  }
}
