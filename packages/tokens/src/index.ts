import path from "node:path";
import { readJsonFile, resolveWorkspaceRoot, type JsonValue } from "../../schema/src/index.js";

export const defaultTokenDocumentRelativePath = "packages/tokens/fixtures/default.tokens.json";

export interface TokenEntry {
  name: string;
  path: string;
  kind: string;
  scope: string;
  platforms: string[];
  exportTargets: string[];
  value?: JsonValue;
  aliasOf?: string;
  component?: string;
}

export interface TokenDocument {
  name: string;
  modes: string[];
  tokens: TokenEntry[];
}

export interface TokenInspection {
  name: string;
  modeCount: number;
  tokenCount: number;
  scopes: Record<string, number>;
  platforms: Record<string, number>;
  exportTargets: Record<string, number>;
  componentIds: string[];
}

function incrementCounter(counter: Record<string, number>, key: string): void {
  counter[key] = (counter[key] ?? 0) + 1;
}

function sortCounter(counter: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(counter).sort(([left], [right]) => left.localeCompare(right)));
}

export function resolveDefaultTokenDocumentPath(rootDir = resolveWorkspaceRoot()): string {
  return path.join(rootDir, defaultTokenDocumentRelativePath);
}

export async function loadTokenDocument(filePath = resolveDefaultTokenDocumentPath()): Promise<TokenDocument> {
  return readJsonFile<TokenDocument>(filePath);
}

export function listTokensByPlatform(document: TokenDocument, platform: string): TokenEntry[] {
  return document.tokens.filter(
    (token) => token.platforms.includes(platform) || token.platforms.includes("shared")
  );
}

export function inspectTokenDocument(document: TokenDocument): TokenInspection {
  const scopes: Record<string, number> = {};
  const platforms: Record<string, number> = {};
  const exportTargets: Record<string, number> = {};
  const componentIds = new Set<string>();

  for (const token of document.tokens) {
    incrementCounter(scopes, token.scope);

    for (const platform of token.platforms) {
      incrementCounter(platforms, platform);
    }

    for (const exportTarget of token.exportTargets) {
      incrementCounter(exportTargets, exportTarget);
    }

    if (token.component) {
      componentIds.add(token.component);
    }
  }

  return {
    name: document.name,
    modeCount: document.modes.length,
    tokenCount: document.tokens.length,
    scopes: sortCounter(scopes),
    platforms: sortCounter(platforms),
    exportTargets: sortCounter(exportTargets),
    componentIds: Array.from(componentIds).sort()
  };
}
