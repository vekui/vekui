import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, cp, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { ComponentManifest, RecipeDocument, RegistryItem } from "../../schema/src/index.js";
import { assertRegistryIntegrity } from "./index.js";

const repoRoot = path.resolve(import.meta.dirname, "../../..");
const packagesRoot = path.join(repoRoot, "packages");

async function createTempWorkspace(): Promise<string> {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "vekui-registry-"));
  await cp(packagesRoot, path.join(tempRoot, "packages"), { recursive: true });
  return tempRoot;
}

async function updateJsonFile<T extends object>(
  rootDir: string,
  relativePath: string,
  updater: (current: T) => T
): Promise<void> {
  const filePath = path.join(rootDir, relativePath);
  const current = JSON.parse(await readFile(filePath, "utf8")) as T;
  const next = updater(current);
  await writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

async function writeJsonFile<T extends object>(rootDir: string, relativePath: string, payload: T): Promise<void> {
  const filePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

test("assertRegistryIntegrity accepts app-owned recipe result surfaces", async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    await updateJsonFile<RecipeDocument>(workspaceRoot, "packages/recipes/fixtures/pc.list-page.basic.json", (recipe) => ({
      ...recipe,
      regions: [
        {
          ...recipe.regions[0],
          accepts: ["neutral.filter-bar", "app.result-region"]
        }
      ]
    }));

    await assertRegistryIntegrity(workspaceRoot);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("assertRegistryIntegrity accepts app-owned component composition children", async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    await updateJsonFile<ComponentManifest>(workspaceRoot, "packages/ui-h5/manifests/sheet.manifest.json", (manifest) => ({
      ...manifest,
      composition: {
        ...manifest.composition,
        recommendedChildren: ["app.sheet-actions"]
      }
    }));

    await assertRegistryIntegrity(workspaceRoot);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("assertRegistryIntegrity rejects preferredRecipes that are not recipe registry items", async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    await updateJsonFile<RegistryItem>(workspaceRoot, "packages/registry/fixtures/items/pc/button.json", (item) => ({
      ...item,
      aiHints: {
        ...item.aiHints,
        preferredRecipes: ["pc.button"]
      }
    }));

    await assert.rejects(
      () => assertRegistryIntegrity(workspaceRoot),
      /preferredRecipe pc\.button/
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("assertRegistryIntegrity rejects duplicate registry ids with conflicting item paths", async () => {
  const workspaceRoot = await createTempWorkspace();

  try {
    const duplicateItemPath = "packages/registry/fixtures/items/pc/button-copy.json";
    const originalItem = JSON.parse(
      await readFile(
        path.join(workspaceRoot, "packages/registry/fixtures/items/pc/button.json"),
        "utf8"
      )
    ) as RegistryItem;

    await writeJsonFile(workspaceRoot, duplicateItemPath, originalItem);
    await updateJsonFile<{ version: number; items: string[] }>(
      workspaceRoot,
      "packages/registry/fixtures/index.json",
      (index) => ({
        ...index,
        items: [...index.items, duplicateItemPath]
      })
    );

    await assert.rejects(() => assertRegistryIntegrity(workspaceRoot), (error: unknown) => {
      assert.match(String(error), /Duplicate registry id pc\.button/);
      assert.match(String(error), /packages\/registry\/fixtures\/items\/pc\/button\.json/);
      assert.match(String(error), /packages\/registry\/fixtures\/items\/pc\/button-copy\.json/);
      return true;
    });
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
