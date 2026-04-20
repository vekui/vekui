# Vekui Schema Surfaces

Vekui keeps its AI-facing protocol layer in `packages/schema`. Each JSON schema is meant to stay implementation-agnostic, source-first, and machine-readable.

## Surfaces

### `token`

Defines the portable token document used by runtime theming, Tailwind export, design adapters, and theme patches.

- `semantic` tokens are shared design intent.
- `component` tokens are resolved per component family and must declare `component`.
- `alias` tokens point at another token path via `aliasOf`.

### `component-manifest`

Defines a component or primitive contract that AI systems can inspect without reading the source implementation.

- `id` follows `pc.*`, `h5.*`, or `neutral.*`.
- `tokenContract` is the stable list of token paths the component expects.
- `designMappingRef` points at the adapter-facing mapping artifact.

### `recipe`

Defines an assembly recipe for pages, flows, and block compositions.

- Recipe ids can stay platform-aware like `pc.list-page.basic`.
- `regions` describe what a layout zone accepts.
- `recommendedTokens` links layout intent back to token decisions.

### `design-mapping`

Defines how a manifest maps into external design tools such as Pencil and Figma.

- `componentId` must match the owning manifest id.
- `tokenBindings` should reference token paths that exist in the attached token documents.
- Variant, slot, and state mappings stay tool-specific while the component contract remains tool-agnostic.

### `theme-patch`

Defines structured theme overrides suitable for global theming and component-scoped token adjustments.

- `target` distinguishes global vs component-scoped changes.
- `ops` is intentionally patch-like so Studio and AI agents can reason about diffs.
- `previewHints` helps Studio decide what to render after a patch is applied.

### `registry-item`

Defines how a source-distributed artifact is exposed through the Vekui registry.

- `sourcePackage`, `sourceExport`, and `sourceFiles` map registry metadata back to the codebase.
- `manifestId` and `manifestRef` connect install metadata back to the canonical protocol artifact.
- `install` explains where source files land in consuming apps.
- `aiHints` gives assembly-oriented hints that are still stable enough for tooling.

## Validation

Use these commands to validate the protocol layer:

```bash
corepack pnpm vekui validate schema
corepack pnpm vekui validate --json
```
