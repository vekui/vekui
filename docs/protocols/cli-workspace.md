# Vekui CLI Workspace Contract

The first Vekui CLI surface is intentionally lightweight. It validates protocol artifacts, resolves install plans, and prepares local workspace metadata without silently rewriting application source.

## Commands

- `vekui init [pc|h5]`
- `vekui add <registry-id>`
- `vekui validate [schema|registry]`
- `vekui registry list`
- `vekui tokens inspect [token-document-path]`
- `vekui theme apply <theme-patch-path>`
- `vekui theme export [token-document-path]`
- `vekui sync pencil <registry-id>`

Every command supports `--json` so Studio, adapters, and AI agents can consume the same output.

## Local Files

`vekui init` reserves a small local workspace under `.vekui/`.

- `.vekui/config.json`
  Stores durable workspace preferences such as target platform, install base, default token catalog, and theme patch directory.
- `.vekui/state.json`
  Stores local CLI state such as installed registry ids, applied theme patches, and active sync targets.
- `.vekui/theme-patches/`
  Stores local theme patch artifacts that can later be applied or inspected.

## Dry-Run Behavior

`vekui init --json` is intentionally non-destructive. It returns the planned config and state paths without writing files, which keeps CI and repo verification clean.

## Current Scope

- `init` scaffolds local config and state expectations.
- `add` resolves a source-first install plan from registry metadata.
- `theme apply` validates a theme patch and returns a structured patch summary.
- `theme export` compiles token outputs for css vars, Tailwind, Pencil, Figma, and resolved JSON payloads.
- `sync pencil` exposes the manifest and token binding payload that a Pencil adapter would consume next.
