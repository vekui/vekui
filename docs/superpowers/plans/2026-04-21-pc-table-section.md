# PC Table Section Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real source-first `pc.table-section` asset and upgrade the PC list-page recipe to depend on it truthfully.

**Architecture:** Build one new PC source-first asset chain end to end: source contract, manifest, Pencil mapping, registry item, and token references. Then upgrade the existing PC list-page recipe so its install-authority surfaces and default composition point at `pc.table-section` instead of `app.result-region`.

**Tech Stack:** TypeScript, JSON schema fixtures, pnpm, existing Vekui registry and token compiler contracts

---

## Chunk 1: Add `pc.table-section` As A Real Source-First Asset

### Task 1: Create The PC Table Section Asset Chain

**Files:**
- Create: `packages/ui-pc/src/table-section.ts`
- Create: `packages/ui-pc/manifests/table-section.manifest.json`
- Create: `packages/adapter-pencil/mappings/pc.table-section.mapping.json`
- Create: `packages/registry/fixtures/items/pc/table-section.json`
- Modify: `packages/ui-pc/src/index.ts`
- Modify: `packages/registry/fixtures/index.json`
- Modify: `packages/tokens/fixtures/default.tokens.json`

- [ ] **Step 1: Write the new source-first contract**

Create `packages/ui-pc/src/table-section.ts` as an exported object-literal contract with focused, finite surfaces:

```ts
export interface PcTableSectionContract {
  density: "comfortable" | "compact";
  selection: "none" | "single" | "multiple";
  emptyState: "inline" | "dedicated";
  slots: /* toolbar/table/pagination/empty-state */;
  states: /* busy/empty/has-selection */;
  events: /* selection + row-open style events */;
  a11y: /* table region semantics */;
  tokenContract: /* component.pc.table-section.* */;
  constraints: /* dense-result-region guidance */;
  composition: /* recommended ordering */;
}

export const pcTableSectionContract: PcTableSectionContract = { ... };
```

- [ ] **Step 2: Add the matching manifest**

Create `packages/ui-pc/manifests/table-section.manifest.json` with:

- id `pc.table-section`
- platform `pc`
- category and family for a dense result section
- variants for `density`, `selection`, `empty-state`
- states `busy`, `empty`, `has-selection`
- token group matching the new component token paths
- design mapping ref pointing at `packages/adapter-pencil/mappings/pc.table-section.mapping.json`

- [ ] **Step 3: Add complete Pencil variant coverage**

Create `packages/adapter-pencil/mappings/pc.table-section.mapping.json` with:

- `componentId: "pc.table-section"`
- at least one truthful token binding
- full `variantMappings` coverage for every enum value in the manifest

Run:

```bash
corepack pnpm exec tsx packages/cli/src/bin.ts validate registry
```

Expected: no missing variant-coverage errors for `pc.table-section`.

- [ ] **Step 4: Register the new asset**

Create `packages/registry/fixtures/items/pc/table-section.json` with:

- registry id `pc.table-section`
- source export `pcTableSectionContract`
- manifest/source/token refs aligned with the new files
- install target `src/components/ui`
- `preferredRecipes: ["recipes.pc.list-page.basic"]`

Modify `packages/registry/fixtures/index.json` to include the new file path.

- [ ] **Step 5: Add minimal truthful tokens**

Modify `packages/tokens/fixtures/default.tokens.json` to add the smallest component token surface needed by the new manifest and mapping, for example:

- `component.pc.table-section.background`
- optional border/radius/divider tokens if referenced by the manifest

Run:

```bash
corepack pnpm schema:validate
```

Expected: schema fixtures validate successfully.

- [ ] **Step 6: Export from `ui-pc`**

Modify `packages/ui-pc/src/index.ts` so the package exports `pcTableSectionContract` alongside existing exports.

- [ ] **Step 7: Commit the asset-chain chunk**

```bash
git add packages/ui-pc/src/table-section.ts \
  packages/ui-pc/manifests/table-section.manifest.json \
  packages/adapter-pencil/mappings/pc.table-section.mapping.json \
  packages/registry/fixtures/items/pc/table-section.json \
  packages/registry/fixtures/index.json \
  packages/tokens/fixtures/default.tokens.json \
  packages/ui-pc/src/index.ts
git commit -m "feat(pc): add table section source asset"
```

## Chunk 2: Upgrade The PC List Recipe To Use The Real Result Surface

### Task 2: Repoint `pc.list-page.basic` At `pc.table-section`

**Files:**
- Modify: `packages/recipes/fixtures/pc.list-page.basic.json`
- Modify: `packages/recipes/src/pc-list-page-basic.ts`
- Modify: `packages/registry/fixtures/items/recipes/pc.list-page.basic.json`
- Modify: `packages/schema/examples/recipe.example.json`

- [ ] **Step 1: Update the recipe fixture**

Modify `packages/recipes/fixtures/pc.list-page.basic.json` so:

- `requiredBlocks` includes `neutral.filter-bar` and `pc.table-section`
- `regions[].accepts` references catalog-backed surfaces instead of `app.result-region`
- layout/interaction rules mention `pc.table-section` as the default result region

- [ ] **Step 2: Update the recipe source wrapper**

Modify `packages/recipes/src/pc-list-page-basic.ts` so:

- `dependencyOrder` includes `neutral.filter-bar` then `pc.table-section`
- `defaultComposition` uses `pc.table-section`
- `installation.requiredRegistryItems` stays aligned with `manifest.requiredBlocks`
- `compositionNotes` describe `pc.table-section` as the shared default result region

- [ ] **Step 3: Update recipe registry metadata**

Modify `packages/registry/fixtures/items/recipes/pc.list-page.basic.json` so:

- `dependencyRefs` includes `neutral.filter-bar` and `pc.table-section`
- adaptation notes reflect the real installable table-section dependency
- hash is bumped

- [ ] **Step 4: Keep examples truthful**

Modify `packages/schema/examples/recipe.example.json` so the example matches the shipped recipe contract.

- [ ] **Step 5: Run full verification**

Run:

```bash
corepack pnpm verify
```

Expected:

- `tests` pass
- `Validated 6 schema fixtures.` or updated count if fixtures increase
- `Verified 7 registry items.` or updated count reflecting the new asset

- [ ] **Step 6: Commit the recipe-upgrade chunk**

```bash
git add packages/recipes/fixtures/pc.list-page.basic.json \
  packages/recipes/src/pc-list-page-basic.ts \
  packages/registry/fixtures/items/recipes/pc.list-page.basic.json \
  packages/schema/examples/recipe.example.json
git commit -m "feat(recipes): use pc table section in list recipe"
```

## Chunk 3: Review And Close Out

### Task 3: Final Review Gate

**Files:**
- Review only

- [ ] **Step 1: Run a spec-compliance review**

Verify the implementation still matches `docs/superpowers/specs/2026-04-21-pc-table-section-design.md`.

- [ ] **Step 2: Run a code-quality review**

Check for:

- source/manifest/mapping drift
- token contract drift
- recipe dependency/install-authority drift
- missing variant coverage

- [ ] **Step 3: Confirm branch state**

Run:

```bash
git status --short
git log --oneline --decorate -5
```

Expected: no unintended uncommitted changes and a clear commit trail for the new asset chain.

Plan complete and saved to `docs/superpowers/plans/2026-04-21-pc-table-section.md`. Ready to execute.
