import type { App, TFile } from "obsidian";

export interface MockVaultOptions {
  files?: Map<string, string>;
  modifyCallback?: (file: TFile, content: string) => void;
}

export const createMockApp = (options: MockVaultOptions = {}): App => {
  const files = options.files || new Map<string, string>();

  const vault = {
    read: async (file: TFile): Promise<string> => {
      return files.get(file.path) || "";
    },
    modify: async (file: TFile, content: string): Promise<void> => {
      files.set(file.path, content);
      options.modifyCallback?.(file, content);
    },
    getAbstractFileByPath: (path: string) => {
      if (files.has(path)) {
        return { path, extension: "md" } as TFile;
      }
      return null;
    },
  };

  const workspace = {
    getActiveFile: () => null,
  };

  return { vault, workspace } as unknown as App;
};

export const createMockFile = (path: string): TFile => {
  return { path, extension: "md" } as unknown as TFile;
};
