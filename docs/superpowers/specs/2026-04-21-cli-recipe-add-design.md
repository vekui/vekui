# CLI Recipe Add Plan Design

**Goal**

Upgrade `vekui add <registry-id>` so recipe items return a resolved compose/install plan instead of only echoing flat registry metadata.

## Why This Exists

The repository now has a truthful recipe chain for `recipes.pc.list-page.basic`, including:

- registry dependencies
- source-wrapper installation metadata
- default composition order
- scaffold file intent

But the CLI still treats recipes like any other registry item and only prints:

- source package
- export name
- install targets
- manifest path
- token refs

That leaves the recipe system technically present but operationally opaque.

## Scope

This feature adds recipe-aware planning to `vekui add`.

It includes:

- richer extraction of actionable recipe source-wrapper fields
- richer JSON and text output for recipe items
- regression tests for the new CLI/registry add-plan flow

It does not include:

- writing files into the user workspace
- code generation
- automatic dependency installation
- CLI subcommands beyond `vekui add`

## Desired User Outcome

When a user runs:

```bash
vekui add recipes.pc.list-page.basic --json
```

the CLI should return a resolved plan that clearly communicates:

- this registry item is a recipe
- which registry items it depends on
- which registry items are required for installation authority
- which scaffold files the recipe expects
- the default composition order inside the recipe body

For non-recipe items, `vekui add` should remain compatible with the current lightweight behavior.

## Design Approach

The registry package already parses source exports using AST-based object-literal inspection for validation. This feature should extend that same strategy instead of creating a parallel runtime loader.

For recipe items only, the registry layer should extract these fields from the source wrapper when they are present as validator-friendly literals or existing validator-friendly reference expressions:

- `assembly.installStrategy`
- `assembly.installTarget`
- `assembly.dependencyOrder`
- `assembly.regionSequence`
- `assembly.defaultComposition`
- `installation.scaffoldFiles`
- `installation.requiredRegistryItems`

The extractor must support the recipe patterns already shipped in the repository, including:

- direct string arrays such as `dependencyOrder: ["neutral.filter-bar", "pc.table-section"]`
- object-literal arrays such as `defaultComposition`
- manifest-backed references such as `requiredRegistryItems: pcListPageBasicRecipe.requiredBlocks`
- manifest-derived region sequences such as `pcListPageBasicRecipe.regions.map((region) => region.name)`

This extracted structure should then be exposed to the CLI as an add-plan payload.

If a recipe item passes registry integrity overall but one or more add-plan fields cannot be statically resolved, the CLI should fail closed for recipe planning:

- `vekui add <recipe-id>` should throw an error instead of returning a partial `recipePlan`
- non-recipe items are unaffected by this rule

## Output Shape

`vekui add` should continue returning the current common fields for all registry items.

For recipe items, it should add an exact recipe-specific section in JSON output:

- `itemType`
- `dependencyRefs`
- `recipePlan.installStrategy`
- `recipePlan.installTarget`
- `recipePlan.requiredRegistryItems`
- `recipePlan.scaffoldFiles`
- `recipePlan.regionSequence`
- `recipePlan.defaultComposition`

Canonical JSON behavior:

- all current base keys remain present for every item
- `itemType` must always be present and mirror the registry item type
- `recipePlan` must be present for recipe items
- `recipePlan` must be omitted for non-recipe items

Canonical recipe JSON example:

```json
{
  "workspaceRoot": "/workspace",
  "registryId": "recipes.pc.list-page.basic",
  "itemType": "recipe",
  "sourcePackage": "@vekui/recipes",
  "sourceExport": "pcListPageBasicRecipeSource",
  "installTargets": ["src/recipes"],
  "requiredDirectories": ["src/recipes"],
  "sourceFiles": ["packages/recipes/src/pc-list-page-basic.ts"],
  "manifestRef": "packages/recipes/fixtures/pc.list-page.basic.json",
  "tokenRefs": ["packages/tokens/fixtures/default.tokens.json"],
  "peerDependencies": ["react", "react-dom"],
  "dependencyRefs": ["neutral.filter-bar", "pc.table-section"],
  "aiHints": { "...": "existing payload stays additive" },
  "recipePlan": {
    "installStrategy": "compose",
    "installTarget": "src/recipes",
    "requiredRegistryItems": ["neutral.filter-bar", "pc.table-section"],
    "scaffoldFiles": ["src/recipes/pc-list-page-basic.ts"],
    "regionSequence": ["body"],
    "defaultComposition": [
      {
        "region": "body",
        "children": ["neutral.filter-bar", "pc.table-section"]
      }
    ]
  }
}
```

Canonical non-recipe JSON example:

```json
{
  "workspaceRoot": "/workspace",
  "registryId": "pc.table-section",
  "itemType": "block",
  "sourcePackage": "@vekui/ui-pc",
  "sourceExport": "pcTableSectionContract",
  "installTargets": ["src/components/ui"],
  "requiredDirectories": ["src/components/ui"],
  "sourceFiles": ["packages/ui-pc/src/table-section.ts"],
  "manifestRef": "packages/ui-pc/manifests/table-section.manifest.json",
  "tokenRefs": ["packages/tokens/fixtures/default.tokens.json"],
  "peerDependencies": ["react", "react-dom"],
  "dependencyRefs": [],
  "aiHints": { "...": "existing payload stays additive" }
}
```

The text renderer should also become recipe-aware. It should show the extra recipe plan fields in a readable order after the shared registry metadata.

Canonical text behavior for recipe items should include:

- `Item type`
- `Dependencies`
- `Required registry items`
- `Scaffold files`
- `Region sequence`
- `Default composition`

## Compatibility Rules

- Existing non-recipe `vekui add` behavior must remain valid.
- Existing JSON consumers should not lose current keys.
- Recipe-specific keys should only appear when the registry item is actually a recipe.
- `itemType` should be additive and present for all items.

## Testing

This feature should add focused tests rather than relying only on manual inspection.

At minimum:

- one registry-level test proving recipe source-wrapper plan extraction works on the shipped `pc.list-page.basic` asset
- one CLI-level test proving `runCli(["add", "recipes.pc.list-page.basic", "--json"])` returns the richer recipe plan payload
- one CLI-level test proving a non-recipe item still returns the simpler base shape without recipe-only fields
- one CLI-level text-mode test proving `runCli(["add", "recipes.pc.list-page.basic"])` renders the recipe plan fields readably

## Risks And Guardrails

Main risks:

- duplicating source-wrapper parsing logic in a brittle way
- accidentally tying CLI behavior to prose-only recipe fields
- breaking non-recipe `add` compatibility

Guardrails:

- only extract actionable fields from `assembly` and `installation`
- reuse existing registry inspection helpers where possible
- keep the CLI payload additive for recipe items, not disruptive for all items
