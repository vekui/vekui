# Vekui

> Build UI systems AI can understand.

Vekui is a source-first UI system for PC and H5, built for AI-driven design and assembly.

## Why Vekui

Vekui is not a traditional UI library. It is designed to make UI assets understandable by both humans and AI systems.

- Source-first distribution for local ownership and deep customization
- Independent PC and H5 component systems with shared design protocols
- Shared tokens, manifests, recipes, and adapter contracts
- Token Studio and theme patches for structured customization
- Pencil-first design integration with a Figma compatibility path

## What's Inside

- Components
- Tokens
- Studio
- Recipes
- Adapters

## Monorepo Structure

```text
apps/       Product surfaces such as docs, studio, and playgrounds
packages/   Shared protocols, runtimes, components, adapters, and tooling
templates/  Starter templates for app consumers
examples/   Small examples and smoke-test fixtures
```

## Getting Started

```bash
corepack pnpm install
corepack pnpm verify
corepack pnpm vekui validate --json
corepack pnpm vekui registry list
corepack pnpm vekui tokens inspect
```

## V1 Focus

- Schema-first foundation for tokens, component manifests, registry items, recipes, and design mappings
- Source-first registry and CLI bootstrap
- Independent PC and H5 package surfaces
- Token Studio groundwork
- Pencil adapter groundwork

## Current CLI Surface

- `vekui validate`
- `vekui validate schema`
- `vekui validate registry`
- `vekui registry list`
- `vekui tokens inspect [token-document-path]`

All commands support `--json` for machine-readable output.
