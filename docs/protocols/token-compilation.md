# Vekui Token Compilation Contract

Vekui tokens use a three-layer model so both humans and AI systems can reason about intent and resolution without reading component source code.

## Layers

- `primitive`
  Raw values such as base colors, radii, spacing, or motion constants.
- `semantic`
  Intent-level aliases that point at primitives, such as `semantic.color.action.primary`.
- `component`
  Component-facing resolved tokens, such as `component.pc.button.background`.

## Semantic Rules

- Token paths and token names must be unique within a document.
- Component tokens must declare `component`.
- Non-component tokens must not declare `component`.
- `primitive.*`, `semantic.*`, and `component.*` path namespaces must match token scope.
- `aliasOf` must point at an existing token path.
- Alias graphs must be acyclic.

## Compiler Targets

`vekui theme export --json` now returns compiled outputs for:

- `css-vars`
  Per-mode variable maps and stylesheet strings using the `--vk-*` naming convention.
- `tailwind`
  `theme.extend` fragments grouped by token kind, currently including `colors` and `borderRadius`.
- `pencil`
  Mode-aware token payloads with resolved values for Pencil adapters.
- `figma`
  Mode-aware token payloads with resolved values for Figma variables or sync adapters.
- `json`
  Fully resolved token entries including `resolvedValue` and `dependencyChain`.

## Commands

```bash
corepack pnpm vekui tokens inspect --json
corepack pnpm vekui theme export --json
corepack pnpm vekui validate schema
```
