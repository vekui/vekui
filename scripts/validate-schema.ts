import { resolveWorkspaceRoot, validateExampleFixtures } from "../packages/schema/src/index.js";

async function main(): Promise<void> {
  await validateExampleFixtures(resolveWorkspaceRoot());

  console.log("Schema fixtures validated successfully.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
