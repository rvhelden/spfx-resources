import { EventEmitter, TreeDataProvider, TreeItem } from "vscode";
import { ProjectItem } from "./Types";
import { ResourceRepository } from "./repositories/ResourceRepository";

type Nullable<T> = T | null | undefined | void;

export class SPFxTreeProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new EventEmitter<Nullable<TreeItem>>();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private projects = new Array<ProjectItem>();
  private repository = new ResourceRepository();

  public constructor() {
    this.refresh();
  }

  public refresh(): void {
    this.repository.getProjects().then((projects) => {
      this.projects = projects;
      this._onDidChangeTreeData.fire();
    });
  }

  public getTreeItem(element: TreeItem): TreeItem {
    return element;
  }

  public getChildren(element?: TreeItem): Thenable<any[]> {
    if (!element) {
      return Promise.resolve(this.projects);
    }

    if (element instanceof ProjectItem) {
      return Promise.resolve(element.namedResources);
    }

    return Promise.resolve([]);
  }
}
