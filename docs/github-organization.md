# GitHub Organization Bootstrap

The `vekui` GitHub organization must be created manually in the GitHub web UI.

## Required Organization Defaults

- Plan: GitHub Free
- Base permissions: None
- Visibility default: Public
- At least two Owners
- Require 2FA for organization members

## Required Teams

- `core`
- `maintainers`

## Repository Defaults

- Repository: `vekui`
- Default branch: `main`
- Merge strategy: squash only
- Auto-delete branches: enabled
- Linear history: enabled

## Branch Protection for `main`

- pull requests required
- one approval required
- latest review required
- conversations resolved
- CODEOWNERS review enabled
- force push disabled
- delete disabled
