#!/usr/bin/env bash
#
# Publie `core/` sur la branche `core-dist`, ou le paquet occupe la RACINE.
#
# Pourquoi une branche et pas npm : npm exige une double authentification pour publier, et
# le depot, lui, est deja public. Un consommateur peut donc installer le moteur sans compte
# et sans jeton — `pnpm add github:SpidySamurai/bloub#<sha>` — et son lockfile fige le
# commit, donc l'installation reste reproductible.
#
# Pourquoi la racine : ni npm ni pnpm ne savent installer un SOUS-DOSSIER d'un depot git.
# La branche porte donc le paquet seul, tel qu'il partirait au registre.
#
# Ce qui est publie est le tarball de `pnpm pack`, pas le dossier `core/` : c'est lui qui
# applique `publishConfig`, donc les `exports` pointent `dist/` et non la source. `npm pack`
# ne le fait pas — s'en servir publierait un paquet dont personne ne peut rien importer.
#
# Usage : tools/publier-core.sh   (depuis n'importe ou dans le depot)
set -euo pipefail

racine=$(git rev-parse --show-toplevel)
cd "$racine"

if [ -n "$(git status --porcelain)" ]; then
  echo "arbre sale : publie depuis un arbre propre, sinon on ne sait pas ce qui part" >&2
  exit 1
fi

source_sha=$(git rev-parse --short HEAD)
source_branche=$(git rev-parse --abbrev-ref HEAD)

pnpm --filter bloub-core build

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"; git worktree remove --force "$arbre" 2>/dev/null || true' EXIT

(cd core && pnpm pack --pack-destination "$tmp" >/dev/null)
tar -xzf "$tmp"/bloub-core-*.tgz -C "$tmp"
version=$(node -p "require('$tmp/package/package.json').version")

arbre=$(mktemp -d)
git fetch origin core-dist --quiet 2>/dev/null || true

if git show-ref --verify --quiet refs/remotes/origin/core-dist; then
  git worktree add --force "$arbre" -B core-dist origin/core-dist --quiet
else
  git worktree add --force --detach "$arbre" --quiet
  git -C "$arbre" switch --orphan core-dist --quiet
fi

# Le contenu est REMPLACE, jamais fusionne : la branche doit etre le paquet et rien d'autre.
find "$arbre" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -R "$tmp"/package/. "$arbre"/

git -C "$arbre" add -A
if git -C "$arbre" diff --cached --quiet; then
  echo "rien a publier : la branche porte deja ce contenu"
  exit 0
fi

git -C "$arbre" commit --quiet -m "core-dist: bloub-core ${version} depuis ${source_branche} ${source_sha}"
git -C "$arbre" push --quiet -u origin core-dist

publie_sha=$(git -C "$arbre" rev-parse HEAD)
echo "publie : bloub-core ${version} sur core-dist"
echo "a installer avec : pnpm add github:SpidySamurai/bloub#${publie_sha}"
