import * as path from "path";
import { TreeItem, TreeItemCollapsibleState, Uri } from "vscode";

export class NamedResource extends TreeItem {
  public readonly resourcePath: ResourcePath | undefined;

  constructor(name: string, resourcePath: ResourcePath | undefined) {
    super(name, TreeItemCollapsibleState.None);

    this.command = {
      command: "spfx-resources.edit-resource",
      title: "Edit Resource",
      arguments: [this],
    };

    this.contextValue = "NamedResource";

    this.resourcePath = resourcePath;

    if (!resourcePath) {
      this.iconPath = path.join(__filename, "..", "..", "assets/not-found.svg");
    } else if (resourcePath.type === "workspace") {
      this.iconPath = path.join(__filename, "..", "..", "assets/module.svg");
    } else {
      this.iconPath = path.join(__filename, "..", "..", "assets/flag.svg");
    }

    if (resourcePath) {
      this.description = path.relative(
        resourcePath.root,
        resourcePath.src ?? resourcePath.lib
      );

      if (resourcePath.definition) {
        this.tooltip = path.relative(
          resourcePath.root,
          resourcePath.definition
        );
      }
    }
  }
}

export type ResourcePath = {
  type: "workspace" | "project";
  root: string;
  definition: string | undefined;
  lib: string;
  src: string;
};

export class ProjectItem extends TreeItem {
  public readonly namedResources = new Array<NamedResource>();

  constructor(uri: Uri) {
    super(
      path.basename(path.dirname(uri.fsPath)),
      TreeItemCollapsibleState.Collapsed
    );

    this.contextValue = "ProjectItem";

    this.tooltip = uri.path;
    this.iconPath = path.join(__filename, "..", "..", "assets/folder.svg");
  }
}
