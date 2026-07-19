# Releasing `@metrue/cofe` to npm

The CLI (`npx @metrue/cofe --dir … | --repo …`) only works once the package is
published to npm. This is a one-time setup, then tag-to-release.

## Package name

Published as **`@metrue/cofe`** (scoped). The bare name `cofe` is already taken on
public npm (a placeholder at `0.0.0`), so we scope under the `@metrue` account.
The binary is still `cofe` — `npx @metrue/cofe …`, or just `cofe …` when installed
globally. If you later confirm `npmjs.com/package/cofe` is free/yours, revert
`name` in `package.json` to `cofe` to get the shorter `npx cofe`.

Scoped packages are private by default; `publishConfig.access: "public"` (already
set in `package.json`) makes the publish public.

## Option A — one-off manual publish (fastest)

From a clean checkout, logged into npm as a maintainer of the `@metrue` scope:

```bash
npm login                       # if not already
npm run build:cli               # builds .next/standalone + copies static/public
npm publish --access public     # prepack also runs build:cli; --access public for the scope
```

Then verify from anywhere:

```bash
npx @metrue/cofe --dir ~/my-blog
```

## Option B — automated tag-based releases (CI)

1. **Activate the workflow** — move the parked file into place (needs a token with
   GitHub `workflow` scope, which the assistant's push token lacked):
   ```bash
   git mv ci/cofe_release.yml .github/workflows/cofe_release.yml
   git commit -m "ci: activate npm release workflow" && git push
   ```
2. **Add the secret** — repo → Settings → Secrets → Actions → `NPM_TOKEN`
   (an npm **automation** token with publish rights to `@metrue`).
3. **Release** — bump `version` in `package.json`, commit, then tag:
   ```bash
   npm version patch          # or edit package.json + commit
   git push && git push --tags
   ```
   The workflow (`on: push tags 'v*'`) runs tests, checks the tag matches
   `package.json` version, and runs `npm publish --provenance --access public`.

## Notes

- `files` in `package.json` ships only `bin/` and `.next/standalone/` (the
  prebuilt server + bundled static/public). `prepack` rebuilds them, so the
  tarball is always fresh — don't commit `.next/`.
- First release is `0.1.0`. Bump per semver thereafter.
