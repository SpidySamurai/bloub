# bloub-core

Le moteur de [bloub](https://github.com/SpidySamurai/bloub) : une forme noire qui se
transforme entre 14 etats, deux formes blanches pour les yeux, et rien d'autre. Pas de
bibliotheque d'animation, pas de framework, **aucune dependance d'execution**.

```bash
# depuis le depot public, sans compte ni jeton : le lockfile fige le commit
pnpm add github:SpidySamurai/bloub#<sha-de-core-dist>
```

Le paquet n'est pas encore sur npm — la publication y demande une double authentification que
le compte n'a pas. La branche **`core-dist`** porte donc le paquet a la racine, construit,
tel qu'il partirait au registre : `tools/publier-core.sh` la met a jour et affiche le sha a
installer. Passer a npm plus tard ne changera qu'une ligne chez le consommateur.

```ts
import { BotEngine, LAB_SHAPES, closedPath, toPoints } from 'bloub-core'

const engine = new BotEngine()
const frame = engine.sample(1.2) // fonction PURE du temps
```

`engine.sample(t)` ne lit aucune horloge : la meme date rend la meme image. C'est ce qui
permet de figer un etat, de rejouer un montage, de tester sans DOM — et, pour qui l'integre,
de piloter le rendu depuis la boucle de son propre framework.

## Ce qu'il y a dedans

La porte d'entree (`bloub-core`) expose de quoi DESSINER un bot : le moteur, les etats, le
catalogue de formes, les expressions et le repere du viewBox. Les sous-chemins restent
ouverts pour le reste :

| Import | Ce qu'il donne |
|---|---|
| `bloub-core` | `BotEngine`, `STATES`, `SHAPES`, `EXPRESSIONS`, `LAB_SHAPES`, `closedPath`, `toPoints` |
| `bloub-core/skins` | le catalogue complet des formes et des couleurs |
| `bloub-core/lab` | la verrerie de laboratoire seule — ballon, fiole, eprouvette, goutte |
| `bloub-core/cycles` | les montages : blocs, durees, bornes |
| `bloub-core/shape` | la geometrie : profils radiaux, melange, chemin ferme |
| `bloub-core/math` | easings, bruit boucle, generateur pseudo-aleatoire |

## Pourquoi les nombres ont l'air arbitraires

Ils sont **mesures**, pas choisis : la video de reference a ete decoupee a 10 images par
seconde et chaque etat releve sur les images. Arrondir les constantes casse la ressemblance,
qui est la seule chose que ce code essaie de reussir. Le detail vit dans
[`docs/measurements.md`](https://github.com/SpidySamurai/bloub/blob/main/docs/measurements.md)
du depot.

## Origine

Ce paquet est extrait d'un **fork** de [`jeremy-prt/bloub`](https://github.com/jeremy-prt/bloub),
de Jeremy Perret, sous licence MIT — l'avis de licence et le copyright d'origine sont
conserves tels quels dans [`LICENSE`](LICENSE). Le fork ajoute la verrerie de laboratoire
(`ballon`, `fiole`, `eprouvette`, `goutte`) et de quoi poser un visage sur une forme qui
n'est pas ronde : contour echantillonne a longueur d'arc constante, et une ancre de visage
qui deplace la cible du solveur sans toucher au resultat.
