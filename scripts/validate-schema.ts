import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import type { AnySchemaObject } from "ajv";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const ajv = new Ajv2020({ allErrors: true, strict: false });

async function readJson(filePath: string): Promise<JsonValue> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as JsonValue;
}

async function validatePair(schemaPath: string, payloadPath: string): Promise<void> {
  const schema = (await readJson(schemaPath)) as AnySchemaObject;
  const payload = await readJson(payloadPath);
  const validate = ajv.compile(schema);
  const valid = validate(payload);

  if (!valid) {
    const details = (validate.errors ?? [])
      .map((error: { instancePath?: string; message?: string }) => `${error.instancePath || "/"} ${error.message ?? "validation error"}`)
      .join("\n");
    throw new Error(`Schema validation failed for ${payloadPath}\n${details}`);
  }
}

async function listJsonFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

async function main(): Promise<void> {
  const schemasDir = path.join(rootDir, "packages/schema/schemas");
  const examplesDir = path.join(rootDir, "packages/schema/examples");

  const schemaMap = new Map<string, string>([
    ["token", path.join(schemasDir, "token.schema.json")],
    ["component-manifest", path.join(schemasDir, "component-manifest.schema.json")],
    ["registry-item", path.join(schemasDir, "registry-item.schema.json")],
    ["recipe", path.join(schemasDir, "recipe.schema.json")],
    ["theme-patch", path.join(schemasDir, "theme-patch.schema.json")],
    ["design-mapping", path.join(schemasDir, "design-mapping.schema.json")]
  ]);

  for (const examplePath of await listJsonFiles(examplesDir)) {
    const exampleName = path.basename(examplePath);
    const schemaKey = exampleName.replace(".example.json", "");
    const schemaPath = schemaMap.get(schemaKey);

    if (!schemaPath) {
      throw new Error(`No schema registered for example ${exampleName}`);
    }

    await validatePair(schemaPath, examplePath);
  }

  console.log("Schema fixtures validated successfully.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
