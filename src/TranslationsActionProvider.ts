import { LocalizableString, LocalizationRepository } from "./repositories/LocalizationRepository";
import { CodeAction, CodeActionKind, CodeActionProvider, Range, Selection, TextDocument } from "vscode";

export class TranslationsActionProvider implements CodeActionProvider {
  public static readonly providedCodeActionKinds = [CodeActionKind.QuickFix];

  private readonly localizationRepository;

  constructor(localizationRepository: LocalizationRepository) {
    this.localizationRepository = localizationRepository;
  }

  public async provideCodeActions(document: TextDocument, range: Range | Selection): Promise<CodeAction[]> {
    const actions = new Array<CodeAction>();

    const localisation = await this.localizationRepository.getLocalization(document.fileName);
    if (localisation === undefined) {
      return actions;
    }

    for (const localizableString of localisation.localizableStrings) {
      if (localizableString.range.contains(range)) {
        actions.push(this.createTranslateFromAction(localizableString));
        actions.push(this.createRemoveAction(localizableString));
      }
    }

    return actions;
  }

  private createRemoveAction(localizableString: LocalizableString): CodeAction {
    const action = new CodeAction("Remove", CodeActionKind.Refactor);
    action.command = {
      command: "spfx-resources.remove-translation",
      arguments: [localizableString],
      title: "Remove translation",
    };

    return action;
  }

  private createTranslateFromAction(localizableString: LocalizableString): CodeAction {
    const action = new CodeAction("Translate from", CodeActionKind.Refactor);
    action.command = {
      command: "spfx-resources.translate-from",
      arguments: [localizableString],
      title: "Translate from",
    };

    return action;
  }
}
