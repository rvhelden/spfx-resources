import * as path from "path";
import * as vscode from "vscode";
import * as fs from "fs";
import * as ts from "typescript";
import { createRange, findAll } from "../Typescript";
import { PropertyAssignment, SourceFile } from "typescript";

export type Language = {
  name: string;
  fileName: string;
};

export type Resource = {
  language: Language;
  assignmentRange: vscode.Range;
  nameRange: vscode.Range;
  textRange: vscode.Range;
  name: string;
  text: string;
};

export type LocalizableString = {
  availableLanguages: Language[];
  range: vscode.Range;
  name: string;
  uri: vscode.Uri;
  resources: Resource[];
};

export type Localization = {
  availableLanguages: Language[];
  localizableStrings: LocalizableString[];
  range: vscode.Range;
  uri: vscode.Uri;
  created: Date;
};

export class LocalizationRepository {
  private readonly translationsCache = new Map<string, Resource[]>();
  private readonly sourceFileCache = new Map<string, ts.SourceFile>();

  private _onDidChange = new vscode.EventEmitter<void>();
  public readonly onDidChange = this._onDidChange.event;

  constructor() {
    vscode.workspace.onDidChangeTextDocument((e) => {
      let hasChanged = false;

      if (this.translationsCache.has(e.document.fileName)) {
        //console.log(`Clearing translations cache for ${e.document.fileName}`);
        this.translationsCache.delete(e.document.fileName);
        hasChanged = true;
      }

      if (this.sourceFileCache.has(e.document.fileName)) {
        //console.log(`Clearing sourceFile cache for ${e.document.fileName}`);
        this.sourceFileCache.delete(e.document.fileName);
        hasChanged = true;
      }

      if (hasChanged) {
        this._onDidChange.fire();
      }
    });
  }

  public async getLocalization(fileName: string): Promise<Localization | undefined> {
    const source = await this.parseFile(fileName);
    const interfaces = this.getInterfaceDeclarations(source);
    const declaration = interfaces.find((i) => i.name.text.endsWith("Strings"));

    if (declaration !== undefined) {
      const availableLanguages = this.availableLanguages(fileName);

      return {
        availableLanguages,
        localizableStrings: await this.getLocalizableStrings(availableLanguages, source),
        range: createRange(source, declaration.name),
        uri: vscode.Uri.file(fileName),
        created: new Date(),
      } as Localization;
    }

    return undefined;
  }

  public async addOrUpdate(localizableString: LocalizableString, language: Language, translation: string) {
    const source = await this.parseFile(language.fileName);
    const entry = this.findResourceEntry(source, localizableString.name);

    if (entry === undefined) {
      return await this.addTranslation(source, language, localizableString.name, translation);
    } else {
      return await this.updateTranslation(source, entry, language, translation);
    }
  }

  private getInsertAt(source: ts.SourceFile) {
    const resources = this.getResourceEntries(source);
    let node: ts.Node | undefined = resources.pop();
    if (node !== undefined) {
      return {
        at: "end",
        position: createRange(source, node).end,
      } as const;
    }

    node = this.getObjectLiteralExpression(source).pop();
    if (node !== undefined) {
      const position = createRange(source, node).start;
      return {
        at: "start",
        position: position.with({ character: position.character + 1 }),
      } as const;
    }

    return undefined;
  }

  private async addTranslation(
    source: SourceFile,
    language: Language,
    name: string,
    translation: string
  ): Promise<vscode.Range | undefined> {
    const insert = this.getInsertAt(source);

    if (insert === undefined) {
      vscode.window.showErrorMessage("Could not find a place to add the translation");
      return;
    }

    const text = `\n\t\t${name}: "${translation}"`;

    const document = await vscode.workspace.openTextDocument(language.fileName);

    const edit = new vscode.WorkspaceEdit();
    if (insert.at === "end") {
      edit.insert(document.uri, insert.position, `\n, ${text}`);
    } else {
      edit.insert(document.uri, insert.position, `\n${text}`);
    }

    await vscode.workspace.applyEdit(edit);
    await document.save();

    return new vscode.Range(
      new vscode.Position(insert.position.line + 1, 2),
      new vscode.Position(insert.position.line + 1, text.length - 1)
    );
  }

  private async updateTranslation(
    source: SourceFile,
    entry: PropertyAssignment,
    language: Language,
    translation: string
  ) {
    const document = await vscode.workspace.openTextDocument(language.fileName);

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, createRange(source, entry.initializer), `"${translation}"`);

    await vscode.workspace.applyEdit(edit);
    await document.save();
  }

  private async getLocalizableStrings(languages: Language[], source: ts.SourceFile): Promise<LocalizableString[]> {
    const translations = await this.getTranslations(languages);

    const properties = this.getPropertySignatures(source);

    const localizableStrings = new Array<LocalizableString>();

    for (const signature of properties) {
      const name = signature.name.getText(source);

      const localizableString: LocalizableString = {
        availableLanguages: languages,
        range: createRange(source, signature),
        name,
        uri: vscode.Uri.file(source.fileName),
        resources: translations.filter((t) => t.name === name),
      };

      localizableStrings.push(localizableString);
    }

    return localizableStrings;
  }

  private availableLanguages(fileName: string) {
    const folder = path.dirname(fileName);
    const files = fs.readdirSync(path.dirname(fileName));

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

  private getOrAddCacheEntry(fileName: string) {
    let entry = this.translationsCache.get(fileName);
    let isCreated = false;

    if (entry === undefined) {
      isCreated = true;
      entry = [];
      this.translationsCache.set(fileName, entry);
    }

    return {
      isCreated,
      translations: entry,
    };
  }

  private async getTranslations(languages: Language[]) {
    const translations = new Array<Resource>();

    for (const language of languages) {
      const cacheEntry = this.getOrAddCacheEntry(language.fileName);
      if (!cacheEntry.isCreated) {
        translations.push(...cacheEntry.translations);
        continue;
      }

      const source = await this.parseFile(language.fileName);
      const resources = this.getResourceEntries(source);

      for (const resource of resources) {
        const name = (resource.name as ts.StringLiteral).text;
        const text = (resource.initializer as ts.StringLiteral).text;

        const translation: Resource = {
          language: language,
          assignmentRange: createRange(source, resource),
          textRange: createRange(source, resource),
          nameRange: createRange(source, resource),
          name,
          text,
        };

        cacheEntry.translations.push(translation);
        translations.push(translation);
      }
    }

    return translations;
  }

  private async parseFile(fileName: string) {
    let entry = this.sourceFileCache.get(fileName);
    if (entry !== undefined) {
      return entry;
    }

    const document = await vscode.workspace.openTextDocument(fileName);
    const sourceFile = ts.createSourceFile(document.fileName, document.getText(), ts.ScriptTarget.Latest);

    this.sourceFileCache.set(document.fileName, sourceFile);

    return sourceFile;
  }

  private findResourceEntry(source: ts.SourceFile, name: string) {
    return this.getResourceEntries(source).find((p) => (p.name as ts.StringLiteral).text === name);
  }

  private getResourceEntries(source: ts.SourceFile) {
    return findAll<ts.PropertyAssignment>(source, ts.isPropertyAssignment);
  }

  private getObjectLiteralExpression(source: ts.SourceFile) {
    return findAll<ts.ObjectLiteralExpression>(source, ts.isObjectLiteralExpression);
  }

  private getPropertySignatures(source: ts.SourceFile) {
    return findAll<ts.PropertySignature>(source, ts.isPropertySignature);
  }

  private getInterfaceDeclarations(source: ts.SourceFile) {
    return findAll<ts.InterfaceDeclaration>(source, ts.isInterfaceDeclaration);
  }
}
