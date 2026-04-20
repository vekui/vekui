import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface RegistryIndex {
  version: number;
  items: string[];
}

interface RegistryItem {
  name: string;
  sourceFiles: string[];
  manifestRef: string;
  tokenRefs: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

async function fileExists(filePath: string): Promise<void> {
  await access(filePath);
}

async function readJson<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

async function main(): Promise<void> {
  const indexPath = path.join(rootDir, "packages/registry/fixtures/index.json");
  const index = await readJson<RegistryIndex>(indexPath);

  for (const relativeItemPath of index.items) {
    const itemPath = path.join(rootDir, relativeItemPath);
    const item = await readJson<RegistryItem>(itemPath);

    await fileExists(path.join(rootDir, item.manifestRef));

    for (const sourceFile of item.sourceFiles) {
      await fileExists(path.join(rootDir, sourceFile));
    }

    for (const tokenRef of item.tokenRefs) {
      await fileExists(path.join(rootDir, tokenRef));
    }

    console.log(`Verified registry item: ${item.name}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
