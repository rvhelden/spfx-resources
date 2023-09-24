import { workspace } from "vscode";
import { NamedResource, ProjectItem, ResourcePath } from "../Types";
import * as path from "path";
import * as fs from "fs";
import spfxConfig from "../spfxConfig";

export class ResourceRepository {
  public async getProjects() {
    const projects = new Array<ProjectItem>();

    if (!workspace.workspaceFolders) {
      return projects;
    }

    const packageFiles = await workspace.findFiles("**/package.json", "**/node_modules/**");

    for (const packageFile of packageFiles.sort()) {
      const resources = this.getResourcesFromPackage(path.dirname(packageFile.fsPath));

      if (resources.length > 0) {
        const project = new ProjectItem(packageFile);
        project.namedResources.push(...resources);

        projects.push(project);
      }
    }

    return projects;
  }

  private getResourcesFromPackage(projectFolder: string): NamedResource[] {
    const results = new Array<NamedResource>();

    const configPath = path.join(projectFolder, "config", "config.json");

    if (!fs.existsSync(configPath)) {
      return results;
    }

    const config = spfxConfig.parse(JSON.parse(fs.readFileSync(configPath, "utf8")));

    for (const resourceName in config.localizedResources) {
      const path = config.localizedResources[resourceName];
      if (!path) {
        continue;
      }

      const resourcePath = this.resolveResourcePath(projectFolder, path);

      results.push(new NamedResource(resourceName, resourcePath));
    }

    return results;
  }

  private resolveResourcePath(projectFolder: string, resourcePath: string) {
    const found = this.createResourcePath(projectFolder, resourcePath);

    if (found) {
      return found;
    }

    if (workspace.workspaceFolders) {
      for (const workspaceFolder of workspace.workspaceFolders) {
        const found = this.createResourcePath(workspaceFolder.uri.fsPath, resourcePath);

        if (found) {
          return found;
        }
      }
    }
  }

  private createResourcePath(projectFolder: string, directoryPath: string) {
    const absolutePath = path.join(projectFolder, directoryPath);
    const resourceFolder = path.dirname(absolutePath);

    const type = this.fromNodeModules(resourceFolder) ? "workspace" : "project";
    const root = projectFolder;
    const lib = resourceFolder;
    const src = this.createSrcPath(resourceFolder);

    let definition: string | undefined;

    if (src) {
      const file = fs.readdirSync(src).find((f) => f.endsWith(".d.ts"));
      if (file) {
        definition = path.join(src, file);
      }
    }

    return {
      type,
      root,
      lib,
      src,
      definition,
    } as ResourcePath;
  }

  private createSrcPath(resourcePath: string) {
    const srcResourcePath = resourcePath.replace("lib\\", "src\\");
    if (fs.existsSync(srcResourcePath)) {
      return srcResourcePath;
    }

    return null;
  }

  private fromNodeModules(resourcePath: string) {
    return resourcePath.indexOf("node_modules") !== -1;
  }
}
