# Vekui Source Registry Contract

The Vekui registry is source-first. Registry metadata should be rich enough for an installer, a Studio surface, or an AI agent to understand what gets copied, where it lands, and what protocol artifacts it depends on.

## Namespace Rules

| Namespace | Platform | Intended artifacts | Default install target |
| --- | --- | --- | --- |
| `pc` | `pc` | desktop UI components and primitives | `src/components/ui` |
| `h5` | `h5` | mobile and touch-first UI components | `src/components/mobile` |
| `neutral` | `shared` | cross-platform blocks and shared presentation units | `src/components/neutral` |
| `recipes` | `pc` / `h5` / `shared` | assembly recipes and starter compositions | `src/recipes` |

## Required Metadata

Each registry item should declare:

- `id`: registry-facing identifier. Non-recipe items should usually match the manifest id.
- `sourcePackage`: the owning monorepo package, such as `@vekui/ui-pc`.
- `sourceExport`: the primary source symbol a generator or AI agent should look for first.
- `sourceFiles`: source artifacts that must be available to install or inspect the item.
- `manifestRef` and `manifestId`: links to the canonical schema-backed protocol artifact.
- `tokenRefs`: token documents needed to satisfy manifest token contracts and design mappings.
- `install`: strategy plus explicit install targets and required directories.
- `aiHints`: intent keywords, adaptation notes, and preferred recipes for assembly flows.

## Smoke Validation Expectations

Registry validation does more than check file existence. The smoke flow now verifies:

1. The registry item itself matches `registry-item.schema.json`.
2. The referenced manifest matches the correct schema.
3. Token documents validate against `token.schema.json`.
4. Design mappings validate and point back to the same manifest id.
5. Manifest token contracts and design mapping token bindings are covered by the referenced token documents.
6. Namespace, platform, source package, and install-target conventions stay aligned.

## Commands

```bash
corepack pnpm vekui validate registry
corepack pnpm vekui registry list
corepack pnpm vekui registry list --json
```
