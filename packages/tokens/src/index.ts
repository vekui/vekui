import path from "node:path";
import {
  readJsonFile,
  resolveWorkspaceRoot,
  type JsonValue,
  type TokenDocument,
  type TokenEntry,
  type TokenExportTarget,
  type VekuiPlatform
} from "../../schema/src/index.js";

export const defaultTokenDocumentRelativePath = "packages/tokens/fixtures/default.tokens.json";

export interface TokenInspection {
  name: string;
  modeCount: number;
  tokenCount: number;
  scopes: Record<string, number>;
  platforms: Record<string, number>;
  exportTargets: Record<string, number>;
  componentIds: string[];
  layers: Record<string, number>;
  aliasCount: number;
}

export interface TokenSemanticIssue {
  tokenPath: string;
  message: string;
}

export interface ResolvedTokenEntry extends TokenEntry {
  resolvedValue: JsonValue;
  dependencyChain: string[];
}

export interface CompiledCssVarsOutput {
  byMode: Record<string, Record<string, string>>;
  stylesheets: Record<string, string>;
}

export interface CompiledTailwindOutput {
  extend: Record<string, Record<string, string>>;
}

export interface CompiledDesignTokenOutput {
  collection: string;
  mode: string;
  name: string;
  path: string;
  value: string;
}

export interface CompiledTokenOutputs {
  cssVars: CompiledCssVarsOutput;
  tailwind: CompiledTailwindOutput;
  pencil: CompiledDesignTokenOutput[];
  figma: CompiledDesignTokenOutput[];
  json: ResolvedTokenEntry[];
}

function incrementCounter(counter: Record<string, number>, key: string): void {
  counter[key] = (counter[key] ?? 0) + 1;
}

function sortCounter(counter: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(counter).sort(([left], [right]) => left.localeCompare(right)));
}

function kebabCase(input: string): string {
  return input.replace(/\./g, "-");
}

function stringifyTokenValue(value: JsonValue): string {
  if (typeof value === "string") {
    return value;
  }

  return JSON.stringify(value);
}

function toCssVarName(tokenPath: string): string {
  return `--vk-${kebabCase(tokenPath)}`;
}

function toTailwindTokenKey(tokenPath: string): string {
  return kebabCase(tokenPath);
}

function tailwindBucketForKind(kind: TokenEntry["kind"]): string {
  switch (kind) {
    case "color":
      return "colors";
    case "radius":
      return "borderRadius";
    case "space":
    case "size":
      return "spacing";
    case "shadow":
      return "boxShadow";
    case "opacity":
      return "opacity";
    case "duration":
      return "transitionDuration";
    case "easing":
      return "transitionTimingFunction";
    case "z-index":
      return "zIndex";
    case "border":
      return "borderWidth";
    case "typography":
      return "fontSize";
  }
}

function ensureObjectBucket(
  container: Record<string, Record<string, string>>,
  key: string
): Record<string, string> {
  container[key] ??= {};
  return container[key];
}

function validateComponentToken(token: TokenEntry): TokenSemanticIssue[] {
  const issues: TokenSemanticIssue[] = [];

  if (token.scope === "component" && !token.component) {
    issues.push({
      tokenPath: token.path,
      message: "component-scoped tokens must declare component."
    });
  }

  if (token.scope !== "component" && token.component) {
    issues.push({
      tokenPath: token.path,
      message: "only component-scoped tokens may declare component."
    });
  }

  if (token.scope === "component" && !token.path.startsWith("component.")) {
    issues.push({
      tokenPath: token.path,
      message: "component-scoped tokens must live under the component.* path namespace."
    });
  }

  if (token.scope === "primitive" && !token.path.startsWith("primitive.")) {
    issues.push({
      tokenPath: token.path,
      message: "primitive-scoped tokens must live under the primitive.* path namespace."
    });
  }

  if (token.scope === "semantic" && !token.path.startsWith("semantic.")) {
    issues.push({
      tokenPath: token.path,
      message: "semantic-scoped tokens must live under the semantic.* path namespace."
    });
  }

  return issues;
}

function resolveTokenValue(
  tokenPath: string,
  tokenMap: Map<string, TokenEntry>,
  seen = new Set<string>()
): { value: JsonValue; chain: string[] } {
  if (seen.has(tokenPath)) {
    throw new Error(`Circular token alias detected at ${tokenPath}`);
  }

  const token = tokenMap.get(tokenPath);

  if (!token) {
    throw new Error(`Unknown token reference: ${tokenPath}`);
  }

  if (token.aliasOf) {
    const nextSeen = new Set(seen);
    nextSeen.add(tokenPath);
    const resolved = resolveTokenValue(token.aliasOf, tokenMap, nextSeen);
    return {
      value: resolved.value,
      chain: [tokenPath, ...resolved.chain]
    };
  }

  if (token.value === undefined) {
    throw new Error(`Token ${tokenPath} must declare value or aliasOf.`);
  }

  return {
    value: token.value,
    chain: [tokenPath]
  };
}

export function resolveDefaultTokenDocumentPath(rootDir = resolveWorkspaceRoot()): string {
  return path.join(rootDir, defaultTokenDocumentRelativePath);
}

export async function loadTokenDocument(filePath = resolveDefaultTokenDocumentPath()): Promise<TokenDocument> {
  return readJsonFile<TokenDocument>(filePath);
}

export function listTokensByPlatform(
  document: TokenDocument,
  platform: VekuiPlatform | "neutral"
): TokenEntry[] {
  return document.tokens.filter(
    (token) => token.platforms.includes(platform) || token.platforms.includes("shared")
  );
}

export function collectTokenSemanticIssues(document: TokenDocument): TokenSemanticIssue[] {
  const issues: TokenSemanticIssue[] = [];
  const tokenMap = new Map<string, TokenEntry>();
  const tokenNames = new Set<string>();

  for (const token of document.tokens) {
    if (tokenMap.has(token.path)) {
      issues.push({
        tokenPath: token.path,
        message: "token paths must be unique within a token document."
      });
    }

    if (tokenNames.has(token.name)) {
      issues.push({
        tokenPath: token.path,
        message: "token names must be unique within a token document."
      });
    }

    tokenMap.set(token.path, token);
    tokenNames.add(token.name);
    issues.push(...validateComponentToken(token));
  }

  for (const token of document.tokens) {
    if (token.aliasOf && !tokenMap.has(token.aliasOf)) {
      issues.push({
        tokenPath: token.path,
        message: `alias target ${token.aliasOf} does not exist.`
      });
    }
  }

  for (const token of document.tokens) {
    try {
      resolveTokenValue(token.path, tokenMap);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push({
        tokenPath: token.path,
        message
      });
    }
  }

  return issues;
}

export function assertTokenDocumentSemantics(document: TokenDocument): void {
  const issues = collectTokenSemanticIssues(document);

  if (issues.length > 0) {
    const details = issues.map((issue) => `- ${issue.tokenPath}: ${issue.message}`).join("\n");
    throw new Error(`Token semantics validation failed\n${details}`);
  }
}

export function resolveTokenDocument(document: TokenDocument): ResolvedTokenEntry[] {
  assertTokenDocumentSemantics(document);
  const tokenMap = new Map(document.tokens.map((token) => [token.path, token]));

  return document.tokens.map((token) => {
    const resolved = resolveTokenValue(token.path, tokenMap);

    return {
      ...token,
      resolvedValue: resolved.value,
      dependencyChain: resolved.chain
    };
  });
}

export function inspectTokenDocument(document: TokenDocument): TokenInspection {
  const scopes: Record<string, number> = {};
  const platforms: Record<string, number> = {};
  const exportTargets: Record<string, number> = {};
  const layers: Record<string, number> = {};
  const componentIds = new Set<string>();
  let aliasCount = 0;

  for (const token of document.tokens) {
    incrementCounter(scopes, token.scope);
    incrementCounter(layers, token.scope);

    for (const platform of token.platforms) {
      incrementCounter(platforms, platform);
    }

    for (const exportTarget of token.exportTargets) {
      incrementCounter(exportTargets, exportTarget);
    }

    if (token.component) {
      componentIds.add(token.component);
    }

    if (token.aliasOf) {
      aliasCount += 1;
    }
  }

  return {
    name: document.name,
    modeCount: document.modes.length,
    tokenCount: document.tokens.length,
    scopes: sortCounter(scopes),
    platforms: sortCounter(platforms),
    exportTargets: sortCounter(exportTargets),
    componentIds: Array.from(componentIds).sort(),
    layers: sortCounter(layers),
    aliasCount
  };
}

function compileCssVars(tokens: ResolvedTokenEntry[], modes: string[]): CompiledCssVarsOutput {
  const vars = Object.fromEntries(
    modes.map((mode) => [mode, {} as Record<string, string>])
  ) as Record<string, Record<string, string>>;

  for (const token of tokens.filter((entry) => entry.exportTargets.includes("css-vars"))) {
    for (const mode of modes) {
      vars[mode][toCssVarName(token.path)] = stringifyTokenValue(token.resolvedValue);
    }
  }

  const stylesheets = Object.fromEntries(
    Object.entries(vars).map(([mode, declarations]) => {
      const body = Object.entries(declarations)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => `  ${name}: ${value};`)
        .join("\n");

      return [
        mode,
        `[data-vk-theme="${mode}"] {\n${body}\n}`
      ];
    })
  );

  return {
    byMode: vars,
    stylesheets
  };
}

function compileTailwind(tokens: ResolvedTokenEntry[]): CompiledTailwindOutput {
  const extend: Record<string, Record<string, string>> = {};

  for (const token of tokens.filter((entry) => entry.exportTargets.includes("tailwind"))) {
    const bucket = tailwindBucketForKind(token.kind);
    const entries = ensureObjectBucket(extend, bucket);
    entries[toTailwindTokenKey(token.path)] = `var(${toCssVarName(token.path)})`;
  }

  return { extend };
}

function compileDesignToolTokens(
  tokens: ResolvedTokenEntry[],
  target: Extract<TokenExportTarget, "pencil" | "figma">
): CompiledDesignTokenOutput[] {
  return tokens
    .filter((entry) => entry.exportTargets.includes(target))
    .flatMap((token) =>
      ["light", "dark"].map((mode) => ({
        collection: "vekui-default",
        mode,
        name: token.name,
        path: token.path,
        value: stringifyTokenValue(token.resolvedValue)
      }))
    );
}

export function compileTokenDocument(document: TokenDocument): CompiledTokenOutputs {
  const resolvedTokens = resolveTokenDocument(document);

  return {
    cssVars: compileCssVars(resolvedTokens, document.modes),
    tailwind: compileTailwind(resolvedTokens),
    pencil: compileDesignToolTokens(resolvedTokens, "pencil").map((entry) => ({
      ...entry,
      collection: document.name
    })),
    figma: compileDesignToolTokens(resolvedTokens, "figma").map((entry) => ({
      ...entry,
      collection: document.name
    })),
    json: resolvedTokens.filter((entry) => entry.exportTargets.includes("json"))
  };
}
