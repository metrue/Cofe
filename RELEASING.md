# Releasing the Cofe CLI to npm (as `cici`)

The CLI (`npx cici --dir … | --repo …`) is published to npm under the **`cici`**
package name (repurposed from an older placeholder we own). Auth uses npm
**Trusted Publisher (OIDC)** — no `NPM_TOKEN` secret.

## One-time setup

### 1. npm Trusted Publisher (on npmjs.com)
Package `cici` → **Settings → Trusted Publisher → GitHub Actions**:

| Field | Value |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `metrue` |
| Repository | `Cofe` |
| Workflow filename | `cofe_release.yml` |
| Environment name | *(leave blank)* |
| Allowed actions | ☑ **Allow `npm publish`** |

→ **Set up connection**. This trusts our release workflow to publish via a
short-lived OIDC token; no long-lived secret is stored anywhere.

### 2. Activate the workflow
Move the parked file into place (needs a token with GitHub `workflow` scope):
```bash
git mv ci/cofe_release.yml .github/workflows/cofe_release.yml
git commit -m "ci: activate npm release workflow" && git push
```
The filename **must** stay `cofe_release.yml` to match the Trusted Publisher config.

### 3. Deprecate the old `cici`
The old `cici@0.0.11` is an unrelated 9-year-old package. Mark it deprecated:
```bash
npm deprecate cici@"<0.1.0" "Repurposed as the Cofe blog CLI — see npx cici"
```

## Cutting a release
```bash
npm version patch            # or edit "version" in package.json (must be > latest on npm)
git push && git push --tags
```
Pushing a `v*` tag runs `.github/workflows/cofe_release.yml`, which tests, checks
the tag matches `package.json` version, and runs `npm publish --provenance` via OIDC.

Verify:
```bash
npx cici --dir ~/my-blog
```

## Manual fallback (no CI)
If you'd rather publish by hand (logged in as a `cici` maintainer):
```bash
npm run build:cli
npm publish --provenance --access public
```

## Notes
- `files` ships only `bin/` + `.next/standalone/` (the prebuilt server + bundled
  static/public). `prepack` rebuilds them, so the tarball is always fresh — don't
  commit `.next/`.
- The published binary exposes both `cici` and `cofe` commands (same CLI).
- First Cofe release is `0.1.0` (> the old `cici@0.0.11`).
