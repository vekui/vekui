import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  readJsonFile,
  resolveWorkspaceRoot,
  validateJsonFile,
  validateExampleFixtures,
  type ComponentManifest,
  type DesignMapping,
  type SchemaValidationResult,
  type TokenDocument,
  type ThemePatch
} from "../../schema/src/index.js";
import {
  assertRegistryIntegrity,
  resolveRegistryItem,
  summarizeRegistry,
  type RegistrySummary,
  type RegistryVerificationResult
} from "../../registry/src/index.js";
import {
  assertTokenDocumentSemantics,
  compileTokenDocument,
  inspectTokenDocument,
  loadTokenDocument,
  resolveDefaultTokenDocumentPath,
  type TokenInspection
} from "../../tokens/src/index.js";

interface OutputStream {
  write(chunk: string): unknown;
}

export interface CliRuntime {
  cwd?: string;
  stdout?: OutputStream;
  stderr?: OutputStream;
}

interface ValidatePayload {
  workspaceRoot: string;
  schema: {
    count: number;
    validated: Array<Pick<SchemaValidationResult, "kind" | "payloadPath">>;
  };
  registry: RegistrySummary | null;
}

type InitPlatform = "pc" | "h5";

interface VekuiConfig {
  platform: InitPlatform;
  installBase: string;
  themePatchDirectory: string;
  registryCatalog: string;
  defaultTokens: string;
}

interface VekuiState {
  installed: string[];
  appliedThemePatches: string[];
  syncTargets: {
    pencil: string[];
  };
}

interface ThemeExportPayload {
  workspaceRoot: string;
  filePath: string;
  exportTargets: Record<string, string[]>;
  outputs: {
    cssVars: unknown;
    tailwind: unknown;
    pencil: unknown;
    figma: unknown;
    json: unknown;
  };
}

function writeLine(output: OutputStream, message = ""): void {
  output.write(`${message}\n`);
}

function printHelp(output: OutputStream): void {
  writeLine(output, "Vekui CLI");
  writeLine(output, "");
  writeLine(output, "Commands:");
  writeLine(output, "  vekui init [pc|h5] [--json]");
  writeLine(output, "  vekui add <registry-id> [--json]");
  writeLine(output, "  vekui validate [schema|registry] [--json]");
  writeLine(output, "  vekui registry list [--json]");
  writeLine(output, "  vekui tokens inspect [token-document-path] [--json]");
  writeLine(output, "  vekui theme apply <theme-patch-path> [--json]");
  writeLine(output, "  vekui theme export [token-document-path] [--json]");
  writeLine(output, "  vekui sync pencil <registry-id> [--json]");
}

function relativeToRoot(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath) || ".";
}

function writeJson(output: OutputStream, payload: object): void {
  writeLine(output, JSON.stringify(payload, null, 2));
}

function installBaseForPlatform(platform: InitPlatform): string {
  return platform === "pc" ? "src/components/ui" : "src/components/mobile";
}

function resolveLocalStatePaths(rootDir: string): {
  configDir: string;
  configPath: string;
  statePath: string;
  themePatchDir: string;
} {
  const configDir = path.join(rootDir, ".vekui");
  return {
    configDir,
    configPath: path.join(configDir, "config.json"),
    statePath: path.join(configDir, "state.json"),
    themePatchDir: path.join(configDir, "theme-patches")
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await readFile(filePath, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function writeJsonFile(filePath: string, payload: object): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function ensureJsonFile(filePath: string, payload: object): Promise<"created" | "preserved"> {
  if (await fileExists(filePath)) {
    return "preserved";
  }

  await writeJsonFile(filePath, payload);
  return "created";
}

function renderInitText(
  output: OutputStream,
  payload: {
    workspaceRoot: string;
    platform: InitPlatform;
    configPath: string;
    statePath: string;
    themePatchDir: string;
    installBase: string;
    configStatus: string;
    stateStatus: string;
  }
): void {
  writeLine(output, `Initialized Vekui workspace for ${payload.platform}.`);
  writeLine(output, `Config: ${payload.configPath} (${payload.configStatus})`);
  writeLine(output, `State: ${payload.statePath} (${payload.stateStatus})`);
  writeLine(output, `Theme patches: ${payload.themePatchDir}`);
  writeLine(output, `Install base: ${payload.installBase}`);
}

function renderAddText(
  output: OutputStream,
  payload: {
    registryId: string;
    sourcePackage: string;
    sourceExport: string;
    installTargets: string[];
    sourceFiles: string[];
    manifestRef: string;
    tokenRefs: string[];
    peerDependencies: string[];
  }
): void {
  writeLine(output, `Add plan for ${payload.registryId}`);
  writeLine(output, `Source package: ${payload.sourcePackage}`);
  writeLine(output, `Source export: ${payload.sourceExport}`);
  writeLine(output, `Install targets: ${payload.installTargets.join(", ")}`);
  writeLine(output, `Source files: ${payload.sourceFiles.join(", ")}`);
  writeLine(output, `Manifest: ${payload.manifestRef}`);
  writeLine(output, `Token docs: ${payload.tokenRefs.join(", ")}`);
  writeLine(output, `Peer deps: ${payload.peerDependencies.join(", ")}`);
}

function renderThemeApplyText(
  output: OutputStream,
  payload: {
    filePath: string;
    id: string;
    target: string;
    platform: string;
    scope: string;
    opCount: number;
  }
): void {
  writeLine(output, `Validated theme patch ${payload.id}`);
  writeLine(output, `Path: ${payload.filePath}`);
  writeLine(output, `Target: ${payload.target}`);
  writeLine(output, `Platform: ${payload.platform}`);
  writeLine(output, `Scope: ${payload.scope}`);
  writeLine(output, `Operations: ${payload.opCount}`);
}

function renderThemeExportText(output: OutputStream, payload: ThemeExportPayload): void {
  writeLine(output, `Token export plan for ${payload.filePath}`);

  for (const [target, tokens] of Object.entries(payload.exportTargets)) {
    writeLine(output, `${target}: ${tokens.join(", ")}`);
  }

  writeLine(
    output,
    `Compiled outputs: css-vars, tailwind, pencil, figma, json`
  );
}

function renderPencilSyncText(
  output: OutputStream,
  payload: {
    registryId: string;
    manifestId: string;
    mappingRef: string;
    bindingCount: number;
    variantCount: number;
    tokenRefs: string[];
  }
): void {
  writeLine(output, `Pencil sync payload for ${payload.registryId}`);
  writeLine(output, `Manifest: ${payload.manifestId}`);
  writeLine(output, `Mapping: ${payload.mappingRef}`);
  writeLine(output, `Token docs: ${payload.tokenRefs.join(", ")}`);
  writeLine(output, `Bindings: ${payload.bindingCount}`);
  writeLine(output, `Variants: ${payload.variantCount}`);
}

function renderValidateText(
  output: OutputStream,
  rootDir: string,
  scope: "all" | "schema" | "registry",
  schemaResults: SchemaValidationResult[],
  registryResults: RegistryVerificationResult[]
): void {
  writeLine(output, `Workspace: ${rootDir}`);

  if (scope === "all" || scope === "schema") {
    writeLine(output, `Validated ${schemaResults.length} schema fixtures.`);
  }

  if (scope === "all" || scope === "registry") {
    writeLine(output, `Verified ${registryResults.length} registry items.`);
  }
}

function renderRegistryText(output: OutputStream, results: RegistryVerificationResult[]): void {
  for (const result of results) {
    writeLine(
      output,
      `${result.item.id} (${result.item.type}) -> ${result.item.sourcePackage} -> ${result.item.install.targets.join(", ")}`
    );
  }
}

function renderTokenInspectionText(output: OutputStream, inspection: TokenInspection, filePath: string): void {
  writeLine(output, `Token document: ${inspection.name}`);
  writeLine(output, `Path: ${filePath}`);
  writeLine(output, `Modes: ${inspection.modeCount}`);
  writeLine(output, `Tokens: ${inspection.tokenCount}`);
  writeLine(output, `Layers: ${JSON.stringify(inspection.layers)}`);
  writeLine(output, `Aliases: ${inspection.aliasCount}`);
  writeLine(output, `Scopes: ${JSON.stringify(inspection.scopes)}`);
  writeLine(output, `Platforms: ${JSON.stringify(inspection.platforms)}`);
  writeLine(output, `Export targets: ${JSON.stringify(inspection.exportTargets)}`);
  writeLine(
    output,
    `Components: ${inspection.componentIds.length > 0 ? inspection.componentIds.join(", ") : "none"}`
  );
}

async function runValidateCommand(
  scope: "all" | "schema" | "registry",
  rootDir: string,
  jsonOutput: boolean,
  stdout: OutputStream
): Promise<void> {
  const schemaResults = scope === "registry" ? [] : await validateExampleFixtures(rootDir);
  const registryResults = scope === "schema" ? [] : await assertRegistryIntegrity(rootDir);

  if (scope === "all" || scope === "schema") {
    const exampleTokenDocument = await readJsonFile<TokenDocument>(
      path.join(rootDir, "packages/schema/examples/token.example.json")
    );
    const defaultTokenDocument = await loadTokenDocument(resolveDefaultTokenDocumentPath(rootDir));

    assertTokenDocumentSemantics(exampleTokenDocument);
    assertTokenDocumentSemantics(defaultTokenDocument);
  }

  if (jsonOutput) {
    const payload: ValidatePayload = {
      workspaceRoot: rootDir,
      schema: {
        count: schemaResults.length,
        validated: schemaResults.map((result) => ({
          kind: result.kind,
          payloadPath: relativeToRoot(rootDir, result.payloadPath)
        }))
      },
      registry: scope === "schema" ? null : summarizeRegistry(registryResults)
    };

    writeJson(stdout, payload);
    return;
  }

  renderValidateText(stdout, rootDir, scope, schemaResults, registryResults);
}

async function runInitCommand(
  platform: InitPlatform,
  rootDir: string,
  jsonOutput: boolean,
  stdout: OutputStream
): Promise<void> {
  const paths = resolveLocalStatePaths(rootDir);
  const installBase = installBaseForPlatform(platform);
  const config: VekuiConfig = {
    platform,
    installBase,
    themePatchDirectory: ".vekui/theme-patches",
    registryCatalog: "vekui",
    defaultTokens: "vekui-default"
  };
  const state: VekuiState = {
    installed: [],
    appliedThemePatches: [],
    syncTargets: {
      pencil: []
    }
  };
  let configStatus = "planned";
  let stateStatus = "planned";

  if (!jsonOutput) {
    await mkdir(paths.configDir, { recursive: true });
    await mkdir(paths.themePatchDir, { recursive: true });
    await mkdir(path.join(rootDir, installBase), { recursive: true });

    configStatus = await ensureJsonFile(paths.configPath, config);
    stateStatus = await ensureJsonFile(paths.statePath, state);
  }

  const payload = {
    workspaceRoot: rootDir,
    platform,
    configPath: relativeToRoot(rootDir, paths.configPath),
    statePath: relativeToRoot(rootDir, paths.statePath),
    themePatchDir: relativeToRoot(rootDir, paths.themePatchDir),
    installBase,
    configStatus,
    stateStatus
  };

  if (jsonOutput) {
    writeJson(stdout, payload);
    return;
  }

  renderInitText(stdout, payload);
}

async function runAddCommand(registryId: string, rootDir: string, jsonOutput: boolean, stdout: OutputStream): Promise<void> {
  const result = await resolveRegistryItem(registryId, rootDir);
  const payload = {
    workspaceRoot: rootDir,
    registryId: result.item.id,
    sourcePackage: result.item.sourcePackage,
    sourceExport: result.item.sourceExport,
    installTargets: result.item.install.targets,
    requiredDirectories: result.item.install.requiredDirectories,
    sourceFiles: result.item.sourceFiles,
    manifestRef: result.item.manifestRef,
    tokenRefs: result.item.tokenRefs,
    peerDependencies: result.item.peerDependencyHints,
    dependencyRefs: result.item.dependencyRefs,
    aiHints: result.item.aiHints
  };

  if (jsonOutput) {
    writeJson(stdout, payload);
    return;
  }

  renderAddText(stdout, payload);
}

async function runThemeApplyCommand(
  patchPathArg: string,
  cwd: string,
  rootDir: string,
  jsonOutput: boolean,
  stdout: OutputStream
): Promise<void> {
  const patchPath = path.resolve(cwd, patchPathArg);
  await validateJsonFile("theme-patch", patchPath, rootDir);
  const patchDocument = await readJsonFile<ThemePatch>(patchPath);
  const payload = {
    workspaceRoot: rootDir,
    filePath: relativeToRoot(rootDir, patchPath),
    id: patchDocument.id,
    target: patchDocument.target,
    platform: patchDocument.platform,
    scope: patchDocument.scope,
    opCount: patchDocument.ops.length,
    previewHints: patchDocument.previewHints,
    ops: patchDocument.ops
  };

  if (jsonOutput) {
    writeJson(stdout, payload);
    return;
  }

  renderThemeApplyText(stdout, payload);
}

async function runThemeExportCommand(
  tokenDocumentPathArg: string | undefined,
  cwd: string,
  rootDir: string,
  jsonOutput: boolean,
  stdout: OutputStream
): Promise<void> {
  const tokenDocumentPath = tokenDocumentPathArg
    ? path.resolve(cwd, tokenDocumentPathArg)
    : resolveDefaultTokenDocumentPath(rootDir);
  const document = await loadTokenDocument(tokenDocumentPath);
  assertTokenDocumentSemantics(document);
  const compiled = compileTokenDocument(document);
  const exportTargets = Object.fromEntries(
    [...new Set(document.tokens.flatMap((token) => token.exportTargets))]
      .sort((left, right) => left.localeCompare(right))
      .map((target) => [
        target,
        document.tokens
          .filter((token) => token.exportTargets.includes(target))
          .map((token) => token.path)
          .sort((left, right) => left.localeCompare(right))
      ])
  );
  const payload: ThemeExportPayload = {
    workspaceRoot: rootDir,
    filePath: relativeToRoot(rootDir, tokenDocumentPath),
    exportTargets,
    outputs: {
      cssVars: compiled.cssVars,
      tailwind: compiled.tailwind,
      pencil: compiled.pencil,
      figma: compiled.figma,
      json: compiled.json
    }
  };

  if (jsonOutput) {
    writeJson(stdout, payload);
    return;
  }

  renderThemeExportText(stdout, payload);
}

async function runPencilSyncCommand(
  registryId: string,
  rootDir: string,
  jsonOutput: boolean,
  stdout: OutputStream
): Promise<void> {
  const registryItem = await resolveRegistryItem(registryId, rootDir);
  const manifestPath = path.join(rootDir, registryItem.item.manifestRef);
  const manifest = await readJsonFile<ComponentManifest>(manifestPath);
  const mappingPath = path.join(rootDir, manifest.designMappingRef);
  await validateJsonFile("design-mapping", mappingPath, rootDir);
  const mapping = await readJsonFile<DesignMapping>(mappingPath);

  if (mapping.tool !== "pencil") {
    throw new Error(`Registry item ${registryId} does not expose a pencil mapping.`);
  }

  const payload = {
    workspaceRoot: rootDir,
    registryId: registryItem.item.id,
    manifestId: manifest.id,
    manifestRef: registryItem.item.manifestRef,
    mappingRef: relativeToRoot(rootDir, mappingPath),
    tokenRefs: registryItem.item.tokenRefs,
    bindingCount: mapping.tokenBindings.length,
    variantCount: manifest.variants.length,
    tokenBindings: mapping.tokenBindings,
    syncRules: mapping.syncRules
  };

  if (jsonOutput) {
    writeJson(stdout, payload);
    return;
  }

  renderPencilSyncText(stdout, payload);
}

export async function runCli(argv = process.argv.slice(2), runtime: CliRuntime = {}): Promise<number> {
  const stdout = runtime.stdout ?? process.stdout;
  const stderr = runtime.stderr ?? process.stderr;
  const cwd = runtime.cwd ?? process.cwd();
  const jsonOutput = argv.includes("--json");
  const positionalArgs = argv.filter((argument) => argument !== "--json");
  const [command, subcommand, ...rest] = positionalArgs;

  try {
    if (!command || command === "help" || command === "--help" || command === "-h") {
      printHelp(stdout);
      return 0;
    }

    const rootDir = resolveWorkspaceRoot(cwd);

    if (command === "init") {
      const platform = subcommand === "h5" ? "h5" : "pc";
      await runInitCommand(platform, rootDir, jsonOutput, stdout);
      return 0;
    }

    if (command === "add") {
      if (!subcommand) {
        throw new Error("Usage: vekui add <registry-id>");
      }

      await runAddCommand(subcommand, rootDir, jsonOutput, stdout);
      return 0;
    }

    if (command === "validate") {
      const scope = subcommand === "schema" || subcommand === "registry" ? subcommand : "all";
      await runValidateCommand(scope, rootDir, jsonOutput, stdout);
      return 0;
    }

    if (command === "registry" && subcommand === "list") {
      const results = await assertRegistryIntegrity(rootDir);

      if (jsonOutput) {
        writeJson(stdout, {
          workspaceRoot: rootDir,
          summary: summarizeRegistry(results),
          items: results.map((result) => ({
            id: result.item.id,
            name: result.item.name,
            namespace: result.item.namespace,
            platform: result.item.platform,
            type: result.item.type,
            sourcePackage: result.item.sourcePackage,
            sourceExport: result.item.sourceExport,
            manifestRef: result.item.manifestRef,
            install: result.item.install,
            itemPath: result.itemPath
          }))
        });
      } else {
        renderRegistryText(stdout, results);
      }

      return 0;
    }

    if (command === "tokens" && subcommand === "inspect") {
      const tokenDocumentPath = rest[0]
        ? path.resolve(cwd, rest[0])
        : resolveDefaultTokenDocumentPath(rootDir);
      const document = await loadTokenDocument(tokenDocumentPath);
      assertTokenDocumentSemantics(document);
      const inspection = inspectTokenDocument(document);

      if (jsonOutput) {
        writeJson(stdout, {
          workspaceRoot: rootDir,
          filePath: relativeToRoot(rootDir, tokenDocumentPath),
          inspection
        });
      } else {
        renderTokenInspectionText(stdout, inspection, tokenDocumentPath);
      }

      return 0;
    }

    if (command === "theme" && subcommand === "apply") {
      const patchPathArg = rest[0];

      if (!patchPathArg) {
        throw new Error("Usage: vekui theme apply <theme-patch-path>");
      }

      await runThemeApplyCommand(patchPathArg, cwd, rootDir, jsonOutput, stdout);
      return 0;
    }

    if (command === "theme" && subcommand === "export") {
      await runThemeExportCommand(rest[0], cwd, rootDir, jsonOutput, stdout);
      return 0;
    }

    if (command === "sync" && subcommand === "pencil") {
      const registryId = rest[0];

      if (!registryId) {
        throw new Error("Usage: vekui sync pencil <registry-id>");
      }

      await runPencilSyncCommand(registryId, rootDir, jsonOutput, stdout);
      return 0;
    }

    writeLine(stderr, `Unknown command: ${positionalArgs.join(" ")}`);
    printHelp(stderr);
    return 1;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    writeLine(stderr, message);
    return 1;
  }
}
