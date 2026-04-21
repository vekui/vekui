import { assertRegistryIntegrity } from "../packages/registry/src/index.js";
import { resolveWorkspaceRoot } from "../packages/schema/src/index.js";

async function main(): Promise<void> {
  const results = await assertRegistryIntegrity(resolveWorkspaceRoot());

  for (const result of results) {
    console.log(`Verified registry item: ${result.item.name}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
