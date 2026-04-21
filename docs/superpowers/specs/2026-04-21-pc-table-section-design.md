# PC Table Section Design

**Goal**

Introduce a real source-first `pc.table-section` asset so PC list-page recipes can depend on a truthful, installable result-region surface instead of the temporary `app.result-region` placeholder.

**Why This Exists**

The repository already has a source-first chain for H5 starter assets, a neutral filter bar, and a PC list-page recipe. The main remaining gap on the PC side is the lack of a real result-region asset. That gap forces the current recipe to describe an app-owned placeholder rather than a concrete registrable dependency.

This design closes that gap with the smallest useful PC result-region contract.

## Scope

This change includes:

- a new source-first `pc.table-section` contract in `@vekui/ui-pc`
- a component manifest for `pc.table-section`
- a Pencil design mapping with complete variant coverage
- a registry item and fixture registration
- token fixture additions for the new PC result surface
- a recipe upgrade so `recipes.pc.list-page.basic` can depend on `pc.table-section`

This change does not include:

- a real React table implementation
- data-grid features like sorting, resizing, virtualization, or column schemas
- new CLI commands or install-generation workflows
- broad PC component family expansion beyond this single result-region asset

## Asset Definition

`pc.table-section` is a source-first result-region skeleton for dense PC list pages.

It is intentionally not a full table widget. Its job is to describe the semantic contract of a result area that can host:

- optional section actions above results
- the main table surface
- optional pagination
- an empty-state fallback

The contract should be rich enough for AI assembly and design syncing, while still staying small and stable.

## Contract Shape

The source export should be an exported object-literal contract in `packages/ui-pc/src/table-section.ts`.

It should expose:

- variants
  - `density`: `comfortable | compact`
  - `selection`: `none | single | multiple`
  - `empty-state`: `inline | dedicated`
- slots
  - `toolbar`
  - `table`
  - `pagination`
  - `empty-state`
- states
  - `busy`
  - `empty`
  - `has-selection`
- events
  - `onSelectionChange`
  - `onRowOpen`
- a11y contract
  - table-oriented semantics for the main result region
- token contract
  - at least one new PC table-section surface token
- constraints/composition notes
  - intended for dense result regions below filters

The top-level export shape should stay compatible with the current registry source-export validator.

Slot requiredness for v1 should be:

- `table`: required
- `toolbar`: optional
- `pagination`: optional
- `empty-state`: optional

The intended source/manifest naming alignment for v1 should be:

- manifest variant `empty-state` maps to source key `emptyState`
- manifest event `onSelectionChange` maps to source event `onSelectionChange`
- manifest event `onRowOpen` maps to source event `onRowOpen`

The source contract should keep those fields as direct exported object-literal surfaces rather than hiding them behind helpers.

## Canonical V1 Shape

The v1 source wrapper only needs the current validator-friendly shape below:

```ts
export const pcTableSectionContract = {
  density: "comfortable",
  selection: "none",
  emptyState: "inline",
  slots: [...],
  states: [...],
  events: [...],
  a11y: {...},
  tokenContract: {...},
  constraints: {...},
  composition: {...}
};
```

This is intentionally small. It is a semantic result-section contract, not a render implementation and not a table-library abstraction.

## Manifest And Mapping

The manifest should live at `packages/ui-pc/manifests/table-section.manifest.json`.

It should describe the same variants, states, events, token groups, and composition surfaces as the source contract. The design mapping should live in `packages/adapter-pencil/mappings/pc.table-section.mapping.json` and must fully cover every declared variant value.

The mapping only needs to provide truthful semantic targets for design sync. It does not need visual completeness beyond variant and token coverage.

## Registry Integration

The new registry item should live at `packages/registry/fixtures/items/pc/table-section.json`.

It should:

- use registry id `pc.table-section`
- point at `@vekui/ui-pc`
- point at the new manifest and source export
- declare install target `src/components/ui`
- include `preferredRecipes` pointing at `recipes.pc.list-page.basic`

The registry fixture index should include the new item so `registry:smoke` sees it as a first-class asset.

## Token Additions

The default token fixture should add the minimal component tokens needed by the new manifest and mapping.

The target is a very small truthful token surface, for example:

- `component.pc.table-section.background`
- optionally a border, radius, or row-divider token if the manifest needs them

Tokens should stay consistent with the existing three-layer token model and current export targets.

## Recipe Upgrade

`recipes.pc.list-page.basic` should stop depending on `app.result-region` as its default result surface.

After this change:

- `requiredBlocks` should include `neutral.filter-bar` and `pc.table-section`
- `regions[].accepts` should reference real catalog-backed surfaces
- `regions[].accepts` should explicitly include `pc.table-section`
- the source wrapper should keep `assembly.dependencyOrder`, `defaultComposition`, and `installation.requiredRegistryItems` aligned with the registry item and recipe manifest
- the recipe registry item should keep `dependencyRefs` aligned with that same actionable dependency set
- `app.result-region` should no longer appear as a canonical dependency or default composition surface for this recipe
- composition notes should describe `pc.table-section` as the default shared result-region asset

This is the main user-visible effect of the change: the recipe becomes a truthful, installable list-page starter rather than a partially open placeholder.

## Validation And Testing

The change is complete only when:

- `pc.table-section` passes schema validation
- registry integrity passes with the new item included
- recipe source-wrapper validation still passes after the recipe upgrade
- design mapping coverage passes for all table-section variants
- `corepack pnpm verify` passes

No new testing framework is required. Existing registry and token tests should remain green, and the registry smoke path should cover the new asset chain.

## Risks And Guardrails

Main risks:

- making the contract too small to be useful
- making it too large and table-library-shaped too early
- drifting source contract, manifest, mapping, and recipe dependency surfaces out of sync

Guardrails:

- keep the asset source-first and semantic, not render-heavy
- keep the variant set finite and fully mapped
- keep recipe install authority on real registry ids only
- do not widen scope into CLI generation or full table behavior
