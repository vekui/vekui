import { access } from "node:fs/promises";
import path from "node:path";
import { readJsonFile, resolveWorkspaceRoot } from "../../schema/src/index.js";

export const registryFixturePath = "packages/registry/fixtures/index.json";

export interface RegistryIndex {
  version: number;
  items: string[];
}

export interface RegistryItem {
  name: string;
  namespace: string;
  platform: string;
  type: string;
  sourceFiles: string[];
  manifestRef: string;
  tokenRefs: string[];
  dependencyRefs: string[];
  peerDependencyHints: string[];
  installTargetHints: string[];
  compatibility: Record<string, string>;
  hash: string;
}

export interface RegistryRefCheck {
  path: string;
  exists: boolean;
}

export interface RegistryVerificationResult {
  itemPath: string;
  item: RegistryItem;
  manifest: RegistryRefCheck;
  sourceFiles: RegistryRefCheck[];
  tokenRefs: RegistryRefCheck[];
  valid: boolean;
}

export interface RegistrySummary {
  itemCount: number;
  namespaces: Record<string, number>;
  platforms: Record<string, number>;
  types: Record<string, number>;
}

function incrementCounter(counter: Record<string, number>, key: string): void {
  counter[key] = (counter[key] ?? 0) + 1;
}

function sortCounter(counter: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(counter).sort(([left], [right]) => left.localeCompare(right)));
}

async function checkRelativePath(rootDir: string, relativePath: string): Promise<RegistryRefCheck> {
  try {
    await access(path.join(rootDir, relativePath));
    return { path: relativePath, exists: true };
  } catch {
    return { path: relativePath, exists: false };
  }
}

function formatInvalidResult(result: RegistryVerificationResult): string {
  const missingRefs = [
    result.manifest,
    ...result.sourceFiles,
    ...result.tokenRefs
  ].filter((reference) => !reference.exists);

  const missingLines = missingRefs.map((reference) => `- ${reference.path}`).join("\n");

  return `${result.item.platform}/${result.item.name} is missing referenced files\n${missingLines}`;
}

export function resolveRegistryIndexPath(rootDir = resolveWorkspaceRoot()): string {
  return path.join(rootDir, registryFixturePath);
}

export async function loadRegistryIndex(rootDir = resolveWorkspaceRoot()): Promise<RegistryIndex> {
  return readJsonFile<RegistryIndex>(resolveRegistryIndexPath(rootDir));
}

export async function loadRegistryItems(rootDir = resolveWorkspaceRoot()): Promise<RegistryVerificationResult[]> {
  const index = await loadRegistryIndex(rootDir);

  return Promise.all(
    index.items.map(async (relativeItemPath) => {
      const absoluteItemPath = path.join(rootDir, relativeItemPath);
      const item = await readJsonFile<RegistryItem>(absoluteItemPath);
      const manifest = await checkRelativePath(rootDir, item.manifestRef);
      const sourceFiles = await Promise.all(item.sourceFiles.map((sourceFile) => checkRelativePath(rootDir, sourceFile)));
      const tokenRefs = await Promise.all(item.tokenRefs.map((tokenRef) => checkRelativePath(rootDir, tokenRef)));
      const valid = manifest.exists && sourceFiles.every((reference) => reference.exists) && tokenRefs.every((reference) => reference.exists);

      return {
        itemPath: relativeItemPath,
        item,
        manifest,
        sourceFiles,
        tokenRefs,
        valid
      };
    })
  );
}

export async function assertRegistryIntegrity(rootDir = resolveWorkspaceRoot()): Promise<RegistryVerificationResult[]> {
  const results = await loadRegistryItems(rootDir);
  const invalidResults = results.filter((result) => !result.valid);

  if (invalidResults.length > 0) {
    throw new Error(invalidResults.map((result) => formatInvalidResult(result)).join("\n\n"));
  }

  return results;
}

export function summarizeRegistry(results: RegistryVerificationResult[]): RegistrySummary {
  const namespaces: Record<string, number> = {};
  const platforms: Record<string, number> = {};
  const types: Record<string, number> = {};

  for (const result of results) {
    incrementCounter(namespaces, result.item.namespace);
    incrementCounter(platforms, result.item.platform);
    incrementCounter(types, result.item.type);
  }

  return {
    itemCount: results.length,
    namespaces: sortCounter(namespaces),
    platforms: sortCounter(platforms),
    types: sortCounter(types)
  };
}
