import * as vscode from "vscode";
import { LocalizableString, LocalizationRepository } from "./repositories/LocalizationRepository";

export class TranslationsActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

  private readonly localizationRepository;

  constructor(localizationRepository: LocalizationRepository) {
    this.localizationRepository = localizationRepository;
  }

  public async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.CodeAction[]> {
    const actions = new Array<vscode.CodeAction>();

    const localisation = await this.localizationRepository.getLocalization(document.fileName);
    if (localisation === undefined) {
      return actions;
    }

    for (const localizableString of localisation.localizableStrings) {
      if (localizableString.range.contains(range)) {
        actions.push(this.createCommandCodeAction(localizableString));
      }
    }

    return actions;
  }

  private createCommandCodeAction(localizableString: LocalizableString): vscode.CodeAction {
    const action = new vscode.CodeAction("Translate from", vscode.CodeActionKind.Refactor);
    action.command = {
      command: "spfx-resources.translate-from",
      arguments: [localizableString],
      title: "Translate from",
    };
    action.isPreferred = true;
    return action;
  }
}
