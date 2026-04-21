# CLI Recipe Add Plan Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `vekui add` recipe-aware so recipe items return a resolved compose/install plan rather than only flat registry metadata.

**Architecture:** Extend the registry layer to extract actionable recipe source-wrapper plan fields from validator-friendly object literals, then surface those fields through the CLI add command in both JSON and text modes. Keep non-recipe behavior compatible and prove it with focused tests.

**Tech Stack:** TypeScript, Node test runner via `tsx --test`, existing registry AST inspection helpers, existing CLI runtime surface

---

## Chunk 1: Add Recipe Plan Extraction In The Registry Layer

### Task 1: Extract Actionable Recipe Add-Plan Fields

**Files:**
- Create: `packages/registry/src/add-plan.ts`
- Modify: `packages/registry/src/index.ts`
- Modify: `packages/registry/src/index.test.ts`

- [ ] **Step 1: Add a typed recipe add-plan shape**

In `packages/registry/src/add-plan.ts`, add exported types for a recipe add-plan payload that can describe:

- install strategy
- install target
- dependency order
- region sequence
- default composition
- scaffold files
- required registry items

Keep the type focused on actionable fields only.

- [ ] **Step 2: Reuse source-export AST inspection**

Implement recipe add-plan extraction in `packages/registry/src/add-plan.ts` by reusing the existing AST/object-literal inspection helpers from the registry layer.

The extractor must support the shipped recipe patterns:

- direct arrays for `dependencyOrder`
- object-literal arrays for `defaultComposition`
- `pcListPageBasicRecipe.requiredBlocks` for `requiredRegistryItems`
- `pcListPageBasicRecipe.regions.map((region) => region.name)` for `regionSequence`

Do not parse prose fields like `compositionNotes`.

- [ ] **Step 3: Add a registry helper for add-plan resolution**

Add an exported helper that resolves a registry item and returns:

- the base registry item data
- recipe plan details when `item.type === "recipe"`
- no recipe plan details for non-recipe items

If a recipe plan cannot be fully resolved for a recipe item, the helper should throw rather than returning a partial recipe plan.

- [ ] **Step 4: Add a registry regression test for recipe plan extraction**

Add or extend `packages/registry/src/index.test.ts` with a focused test that asserts the shipped recipe resolves:

- `dependencyOrder: ["neutral.filter-bar", "pc.table-section"]`
- `requiredRegistryItems: ["neutral.filter-bar", "pc.table-section"]`
- scaffold file `src/recipes/pc-list-page-basic.ts`
- default composition containing `pc.table-section`

- [ ] **Step 5: Run focused registry tests**

Run:

```bash
node --import tsx --test /Users/admin/11/vekui/packages/registry/src/index.test.ts
```

Expected: PASS with the new recipe add-plan test included.

- [ ] **Step 6: Commit**

```bash
git add packages/registry/src/add-plan.ts packages/registry/src/index.ts packages/registry/src/index.test.ts
git commit -m "feat(registry): extract recipe add plans"
```

## Chunk 2: Make `vekui add` Recipe-Aware

### Task 2: Upgrade CLI Add Output

**Files:**
- Modify: `packages/cli/src/index.ts`
- Create: `packages/cli/src/index.test.ts`

- [ ] **Step 1: Add a recipe-aware add payload**

Update `runAddCommand` in `packages/cli/src/index.ts` to consume the new registry helper and build:

- the current base payload for all items
- `itemType` for all items
- an additive `recipePlan` section for recipe items only

- [ ] **Step 2: Upgrade text rendering**

Update the CLI text renderer so recipe items show:

- item type
- dependency refs
- required registry items
- scaffold files
- region sequence
- default composition summary

Keep non-recipe text output simple and compatible.

- [ ] **Step 3: Add CLI tests**

Create `packages/cli/src/index.test.ts` and add tests for:

- `runCli(["add", "recipes.pc.list-page.basic", "--json"])`
- `runCli(["add", "pc.table-section", "--json"])`
- `runCli(["add", "recipes.pc.list-page.basic"])`

Verify:

- recipe output includes `recipePlan`
- recipe output includes `itemType: "recipe"`
- non-recipe output does not include recipe-only fields
- non-recipe output still includes `itemType`
- text output includes readable recipe plan sections

- [ ] **Step 4: Run focused CLI tests**

Run:

```bash
node --import tsx --test /Users/admin/11/vekui/packages/cli/src/index.test.ts
```

Expected: PASS for both recipe and non-recipe add cases.

- [ ] **Step 5: Run full verification**

Run:

```bash
corepack pnpm verify
```

Expected:

- all tests pass
- schema validation passes
- registry smoke passes

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/index.ts packages/cli/src/index.test.ts
git commit -m "feat(cli): surface recipe add plans"
```

## Chunk 3: Review And Close Out

### Task 3: Final Review Gate

**Files:**
- Review only

- [ ] **Step 1: Run spec-compliance review**

Verify the implementation matches `docs/superpowers/specs/2026-04-21-cli-recipe-add-design.md`.

- [ ] **Step 2: Run code-quality review**

Check:

- recipe-only fields are additive, not breaking
- parsing logic stays on actionable fields only
- non-recipe add behavior remains compatible

- [ ] **Step 3: Confirm branch state**

Run:

```bash
git status --short
git log --oneline --decorate -5
```

Expected: clean worktree and a clear commit trail for registry extraction plus CLI output.

Plan complete and saved to `docs/superpowers/plans/2026-04-21-cli-recipe-add.md`. Ready to execute.
