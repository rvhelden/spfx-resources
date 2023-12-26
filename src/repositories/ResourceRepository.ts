import { workspace } from "vscode";
import { NamedResource, ProjectItem, ResourcePath } from "../Types";
import * as path from "path";
import * as fs from "fs";
import { type, narrow, Problems, Type } from "arktype";

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

    const config = spfxConfig(JSON.parse(fs.readFileSync(configPath, "utf8")));
    if (config.data === undefined || config.problems !== undefined) {
      for (const problem of config.problems) {
        console.error(problem.toString());
      }

      return results;
    }

    for (const resourceName in config.data.localizedResources) {
      const path = config.data.localizedResources[resourceName];

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

const spfxConfig = type({
  localizedResources: record(type("string")),
});

export function record<K extends string, V>(valueType: Type<V>): Type<Record<K, V>> {
  return narrow(type("object"), (data, problems): data is Record<K, V> => {
    return Object.entries(data).every(([k, v]) => {
      const valueCheck = valueType(v);

      if (valueCheck.problems) {
        for (const problem of valueCheck.problems) {
          problems.addProblem(problem);
        }

        return false;
      }

      if (valueCheck.data !== v) {
        (data as any)[k] = valueCheck.data;
      }

      return true;
    });
  }) as any;
}
