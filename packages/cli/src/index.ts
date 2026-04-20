import path from "node:path";
import {
  resolveWorkspaceRoot,
  validateExampleFixtures,
  type SchemaValidationResult
} from "../../schema/src/index.js";
import {
  assertRegistryIntegrity,
  summarizeRegistry,
  type RegistrySummary,
  type RegistryVerificationResult
} from "../../registry/src/index.js";
import {
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

function writeLine(output: OutputStream, message = ""): void {
  output.write(`${message}\n`);
}

function printHelp(output: OutputStream): void {
  writeLine(output, "Vekui CLI");
  writeLine(output, "");
  writeLine(output, "Commands:");
  writeLine(output, "  vekui validate [schema|registry] [--json]");
  writeLine(output, "  vekui registry list [--json]");
  writeLine(output, "  vekui tokens inspect [token-document-path] [--json]");
}

function relativeToRoot(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath) || ".";
}

function writeJson(output: OutputStream, payload: object): void {
  writeLine(output, JSON.stringify(payload, null, 2));
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
      `${result.item.platform}/${result.item.name} (${result.item.type}) -> ${result.item.manifestRef}`
    );
  }
}

function renderTokenInspectionText(output: OutputStream, inspection: TokenInspection, filePath: string): void {
  writeLine(output, `Token document: ${inspection.name}`);
  writeLine(output, `Path: ${filePath}`);
  writeLine(output, `Modes: ${inspection.modeCount}`);
  writeLine(output, `Tokens: ${inspection.tokenCount}`);
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
            name: result.item.name,
            namespace: result.item.namespace,
            platform: result.item.platform,
            type: result.item.type,
            manifestRef: result.item.manifestRef,
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

    writeLine(stderr, `Unknown command: ${positionalArgs.join(" ")}`);
    printHelp(stderr);
    return 1;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    writeLine(stderr, message);
    return 1;
  }
}
