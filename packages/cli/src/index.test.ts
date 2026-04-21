import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { runCli } from "./index.js";

const repoRoot = path.resolve(import.meta.dirname, "../../..");

class BufferStream {
  #chunks: string[] = [];

  write(chunk: string): void {
    this.#chunks.push(chunk);
  }

  toString(): string {
    return this.#chunks.join("");
  }
}

async function runCliWithBuffers(argv: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const stdout = new BufferStream();
  const stderr = new BufferStream();
  const exitCode = await runCli(argv, {
    cwd: repoRoot,
    stdout,
    stderr
  });

  return {
    exitCode,
    stdout: stdout.toString(),
    stderr: stderr.toString()
  };
}

test('runCli(["add", "recipes.pc.list-page.basic", "--json"]) returns a resolved recipe add plan', async () => {
  const result = await runCliWithBuffers(["add", "recipes.pc.list-page.basic", "--json"]);

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, "");

  const payload = JSON.parse(result.stdout) as {
    itemType: string;
    dependencyRefs: string[];
    recipePlan: {
      installStrategy: string;
      installTarget: string;
      requiredRegistryItems: string[];
      scaffoldFiles: string[];
      regionSequence: string[];
      defaultComposition: Array<{
        region: string;
        children: string[];
      }>;
    };
  };

  assert.equal(payload.itemType, "recipe");
  assert.deepStrictEqual(payload.dependencyRefs, ["neutral.filter-bar", "pc.table-section"]);
  assert.deepStrictEqual(payload.recipePlan.requiredRegistryItems, [
    "neutral.filter-bar",
    "pc.table-section"
  ]);
  assert.deepStrictEqual(payload.recipePlan.scaffoldFiles, ["src/recipes/pc-list-page-basic.ts"]);
  assert.deepStrictEqual(payload.recipePlan.regionSequence, ["body"]);
  assert.deepStrictEqual(payload.recipePlan.defaultComposition, [
    {
      region: "body",
      children: ["neutral.filter-bar", "pc.table-section"]
    }
  ]);
  assert.equal(payload.recipePlan.installStrategy, "compose");
  assert.equal(payload.recipePlan.installTarget, "src/recipes");
});

test('runCli(["add", "pc.table-section", "--json"]) keeps non-recipe payloads additive', async () => {
  const result = await runCliWithBuffers(["add", "pc.table-section", "--json"]);

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, "");

  const payload = JSON.parse(result.stdout) as {
    itemType: string;
    dependencyRefs: string[];
    recipePlan?: unknown;
  };

  assert.equal(payload.itemType, "block");
  assert.deepStrictEqual(payload.dependencyRefs, []);
  assert.equal(Object.hasOwn(payload, "recipePlan"), false);
});

test('runCli(["add", "recipes.pc.list-page.basic"]) renders recipe planning fields in text mode', async () => {
  const result = await runCliWithBuffers(["add", "recipes.pc.list-page.basic"]);

  assert.equal(result.exitCode, 0);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /Item type: recipe/);
  assert.match(result.stdout, /Dependencies: neutral\.filter-bar, pc\.table-section/);
  assert.match(result.stdout, /Required registry items: neutral\.filter-bar, pc\.table-section/);
  assert.match(result.stdout, /Scaffold files: src\/recipes\/pc-list-page-basic\.ts/);
  assert.match(result.stdout, /Region sequence: body/);
  assert.match(result.stdout, /Default composition:/);
  assert.match(result.stdout, /body: neutral\.filter-bar, pc\.table-section/);
});
