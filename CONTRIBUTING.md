# Contributing to Vekui

Thanks for helping build Vekui.

## Development Model

Vekui is a source-first monorepo. Contributions should align with the repository structure and protocol-first philosophy.

- `packages/schema` owns shared protocol definitions
- `packages/tokens` owns canonical token fixtures and compilation targets
- `packages/registry` owns source distribution metadata and smoke fixtures
- `packages/ui-*` and `packages/primitives-*` own platform implementations
- `packages/adapter-*` own design-tool integrations

## Local Setup

```bash
corepack pnpm install
corepack pnpm verify
```

## Contribution Rules

- Prefer small pull requests with one clear goal
- Update manifests, token contracts, and registry metadata alongside implementation changes
- Add or update validation fixtures when protocol shapes change
- Keep package boundaries clear and platform-specific behavior explicit

## Pull Requests

Every pull request should explain:

- what changed
- why it changed
- what area it affects
- how it was verified
- what follow-up work remains

