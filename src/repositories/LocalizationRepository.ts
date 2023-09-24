import * as path from "path";
import * as vscode from "vscode";
import * as fs from "fs";
import * as ts from "typescript";
import { createRange, findAll } from "../Typescript";

export type Language = {
  name: string;
  fileName: string;
};

export type Translation = {
  language: Language;
  assignmentRange: vscode.Range;
  nameRange: vscode.Range;
  textRange: vscode.Range;
  name: string;
  text: string;
};

export type LocalizableString = {
  range: vscode.Range;
  name: string;
  translations: Translation[];
};

export type Localization = {
  availableLanguages: Language[];
  localizableStrings: LocalizableString[];
  range: vscode.Range;
  uri: vscode.Uri;
  created: Date;
};

export class LocalizationRepository {
  private readonly translationsCache = new Map<string, { version: number; translations: Translation[] }>();
  private readonly sourceFileCache = new Map<string, { version: number; sourceFile: ts.SourceFile }>();

  public async getLocalization(document: vscode.TextDocument) {
    const source = this.parseFile(document);
    const interfaces = this.getInterfaceDeclarations(source);
    const declaration = interfaces.find((i) => i.name.text.endsWith("Strings"));

    if (declaration !== undefined) {
      const availableLanguages = this.availableLanguages(document);

      return {
        availableLanguages,
        localizableStrings: await this.getLocalizableStrings(availableLanguages, source),
        range: createRange(source, declaration.name),
        uri: document.uri,
        created: new Date(),
      } as Localization;
    }

    return undefined;
  }

  public async addTranslation(
    localizableString: LocalizableString,
    language: Language,
    translation: string
  ): Promise<vscode.Range | undefined> {
    const document = await vscode.workspace.openTextDocument(language.fileName);

    const source = this.parseFile(document);
    const lastPropertyAssignment = findAll(source, ts.isPropertyAssignment).pop();
    if (lastPropertyAssignment === undefined) {
      return undefined;
    }

    const range = createRange(source, lastPropertyAssignment);

    const text = `,\n\t\t${localizableString.name}: "${translation}"`;

    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, range.end, text);

    await vscode.workspace.applyEdit(edit);
    await document.save();

    return new vscode.Range(
      new vscode.Position(range.start.line + 1, 2),
      new vscode.Position(range.start.line + 1, text.length - 1)
    );
  }

  private async getLocalizableStrings(languages: Language[], source: ts.SourceFile) {
    const translations = await this.getTranslations(languages);

    const properties = this.getPropertySignatures(source);

    const localizableStrings = new Array<LocalizableString>();

    for (const signature of properties) {
      const name = signature.name.getText(source);

      const localizableString: LocalizableString = {
        range: createRange(source, signature),
        name,
        translations: translations.filter((t) => t.name === name),
      };

      localizableStrings.push(localizableString);
    }

    return localizableStrings;
  }

  public availableLanguages(document: vscode.TextDocument) {
    const folder = path.dirname(document.uri.fsPath);
    const files = fs.readdirSync(path.dirname(document.uri.fsPath));

    const languages = new Array<Language>();

    for (const fileName of files.filter((file) => file.endsWith(".js"))) {
      const language = fileName.split(".")[0];
      const fullPath = path.join(folder, fileName);

      languages.push({
        name: language,
        fileName: fullPath,
      });
    }

    return languages;
  }

  private getOrAddCacheEntry(document: vscode.TextDocument) {
    let entry = this.translationsCache.get(document.fileName);
    let isCreated = false;

    if (entry?.version !== document.version) {
      isCreated = true;
      entry ??= {
        version: document.version,
        translations: [],
      };

      entry.translations.length = 0;

      this.translationsCache.set(document.fileName, entry);
    }

    return {
      isCreated,
      entry,
    };
  }

  private async getTranslations(languages: Language[]) {
    const translations = new Array<Translation>();

    for (const language of languages) {
      const document = await vscode.workspace.openTextDocument(language.fileName);

      const cacheEntry = this.getOrAddCacheEntry(document);
      if (!cacheEntry.isCreated) {
        translations.push(...cacheEntry.entry.translations);
        continue;
      }

      const source = this.parseFile(document);
      const properties = this.getPropertyAssignments(source);

      for (const assignment of properties) {
        const name = (assignment.name as ts.StringLiteral).text;
        const text = (assignment.initializer as ts.StringLiteral).text;

        const translation: Translation = {
          language: language,
          assignmentRange: createRange(source, assignment),
          textRange: createRange(source, assignment),
          nameRange: createRange(source, assignment),
          name,
          text,
        };

        cacheEntry.entry.translations.push(translation);
        translations.push(translation);
      }
    }

    return translations;
  }

  private parseFile(document: vscode.TextDocument) {
    let entry = this.sourceFileCache.get(document.fileName);
    if (entry?.version === document.version) {
      return entry.sourceFile;
    }

    entry = {
      version: document.version,
      sourceFile: ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest),
    };

    this.sourceFileCache.set(document.fileName, entry);

    return entry.sourceFile;
  }

  private getPropertyAssignments(source: ts.SourceFile) {
    return findAll<ts.PropertyAssignment>(source, ts.isPropertyAssignment);
  }

  private getPropertySignatures(source: ts.SourceFile) {
    return findAll<ts.PropertySignature>(source, ts.isPropertySignature);
  }

  private getInterfaceDeclarations(source: ts.SourceFile) {
    return findAll<ts.InterfaceDeclaration>(source, ts.isInterfaceDeclaration);
  }
}
