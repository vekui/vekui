import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { AnySchemaObject, ErrorObject } from "ajv";
import type { JsonValue } from "./contracts.js";

export const schemaPackage = "@vekui/schema";

export const schemaFileNames = {
  token: "token.schema.json",
  "component-manifest": "component-manifest.schema.json",
  "registry-item": "registry-item.schema.json",
  recipe: "recipe.schema.json",
  "theme-patch": "theme-patch.schema.json",
  "design-mapping": "design-mapping.schema.json"
} as const;

export type SchemaKind = keyof typeof schemaFileNames;

export interface SchemaValidationIssue {
  instancePath: string;
  message: string;
}

export interface SchemaValidationResult {
  kind: SchemaKind;
  schemaPath: string;
  payloadPath: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fallbackWorkspaceRoot = path.resolve(__dirname, "../../..");
const ajv = new Ajv2020({ allErrors: true, strict: false });

export const schemaKinds = Object.freeze(Object.keys(schemaFileNames) as SchemaKind[]);

export function resolveWorkspaceRoot(startDir = process.cwd()): string {
  let currentDir = path.resolve(startDir);

  while (true) {
    if (existsSync(path.join(currentDir, "pnpm-workspace.yaml"))) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      return fallbackWorkspaceRoot;
    }

    currentDir = parentDir;
  }
}

export function resolveSchemaPath(kind: SchemaKind, rootDir = resolveWorkspaceRoot()): string {
  return path.join(rootDir, "packages/schema/schemas", schemaFileNames[kind]);
}

export function resolveExamplePath(kind: SchemaKind, rootDir = resolveWorkspaceRoot()): string {
  return path.join(rootDir, "packages/schema/examples", `${kind}.example.json`);
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

export function formatValidationIssues(errors: ErrorObject[] | null | undefined): SchemaValidationIssue[] {
  return (errors ?? []).map((error) => ({
    instancePath: error.instancePath || "/",
    message: error.message ?? "validation error"
  }));
}

function formatValidationError(payloadPath: string, issues: SchemaValidationIssue[]): string {
  const details = issues.map((issue) => `${issue.instancePath} ${issue.message}`).join("\n");
  return `Schema validation failed for ${payloadPath}\n${details}`;
}

export async function validateJsonFile(kind: SchemaKind, payloadPath: string, rootDir = resolveWorkspaceRoot()): Promise<SchemaValidationResult> {
  const schemaPath = resolveSchemaPath(kind, rootDir);
  const schema = await readJsonFile<AnySchemaObject>(schemaPath);
  const payload = await readJsonFile<JsonValue>(payloadPath);
  const validate = ajv.compile(schema);
  const valid = validate(payload);

  if (!valid) {
    throw new Error(formatValidationError(payloadPath, formatValidationIssues(validate.errors)));
  }

  return {
    kind,
    schemaPath,
    payloadPath
  };
}

export async function validateExampleFixtures(rootDir = resolveWorkspaceRoot()): Promise<SchemaValidationResult[]> {
  const results: SchemaValidationResult[] = [];

  for (const kind of schemaKinds) {
    results.push(await validateJsonFile(kind, resolveExamplePath(kind, rootDir), rootDir));
  }

  return results;
}

export type {
  ComponentManifest,
  DesignMapping,
  JsonValue,
  RecipeDocument,
  RegistryAiHints,
  RegistryInstallMeta,
  RegistryItem,
  RegistryItemType,
  ThemePatch,
  TokenDocument,
  TokenEntry,
  TokenExportTarget,
  TokenKind,
  TokenScope,
  VekuiNamespace,
  VekuiPlatform
} from "./contracts.js";
