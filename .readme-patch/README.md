# .readme-patch

This folder keeps your profile stats fresh. It was added by **Patch your profile**.

- **What runs:** `.github/workflows/update-readme.yml` runs every day at 20:34 UTC (and whenever you press *Run workflow* in the Actions tab).
- **What it does:** it reads your public GitHub data, rebuilds `README.md`, `banner*.svg` and `cards/*.svg` from `config.json`, and commits only if something changed.
- **What it uses:** the generator in this folder (`cli.js` and `js/`), which is plain JavaScript you can read. No third-party actions, no secrets, no outside servers: it only talks to `api.github.com`.
- **Permissions:** it can write to this repository's contents and nothing else.

## Changing how your profile looks

`README.md` and the images are rewritten every day, so edits made to them by hand will be replaced. Change `config.json` instead, or open the Patch your profile page and publish again.

The files it manages are `README.md`, `banner.svg`, `banner-light.svg` and every `.svg` inside `cards/`. Older ones it no longer produces are removed. Nothing else in the repository is ever touched, so keep your own images elsewhere (or as other file types).

## Stopping it

Delete `.github/workflows/update-readme.yml` (and `update-universe.yml`, if the 3D universe is on), or open the **Actions** tab and disable the workflows. Your README and images stay as they are.

## Good to know

- GitHub pauses scheduled workflows in a public repository after 60 days without activity. If that happens, re-enable it in the Actions tab.
- If GitHub's data can't be read on a given day, the run stops without changing anything, so you never get a half-empty profile.
- Commits made by the workflow come from `github-actions[bot]` and don't count towards your contribution graph.
