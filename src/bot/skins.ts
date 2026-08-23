import { PROFILE_SAMPLES } from './profiles'
import {
  hullOfCircles,
  profileFromPolygon,
  regularPolygonProfile,
  rayonMax,
  resampleOutline,
  roundedPolygon,
  starProfile,
  superellipseProfile,
  unionOfCirclesProfile,
  type Point
} from './shape'

/**
 * Formes et couleurs proposees par le personnalisateur du bot.
 *
 * A la difference des silhouettes d'animation (`profiles.ts`), celles-ci ne sont
 * PAS relevees sur la video : elles sont construites analytiquement d'apres la
 * grille du personnalisateur d'origine. Deux sources distinctes, donc, et c'est
 * volontaire — les etats animes doivent rester fideles a la video, les formes de
 * base sont un choix d'utilisateur.
 */

/**
 * Les identifiants sont enumeres plutot que deduits du tableau : c'est ce qui
 * permet a la couche i18n de verifier A LA COMPILATION que chaque forme a bien
 * sa traduction dans les trois langues (`t(\`shapes.${id}\`)` ne compile que si
 * la cle existe). Un `as const` sur le tableau aurait le meme effet mais
 * rendrait `radii` en lecture seule, alors que le moteur le passe tel quel.
 */
export type ShapeId =
  | 'cercle'
  | 'galet'
  | 'squircle'
  | 'capsule'
  | 'triangle'
  | 'hexagone'
  | 'nuage'
  | 'goutte'
  | 'etoile'
  | 'fiole'
  | 'eprouvette'
  | 'ballon'

export interface BotShape {
  id: ShapeId
  radii: number[]
  /**
   * true = cette silhouette ne porte PAS de visage : le moteur eteint les yeux
   * tant qu'elle est le corps.
   *
   * Ce n'est pas un reglage de gout, c'est une contrainte de geometrie. Les deux
   * yeux vont jusqu'a 0,63 rayon de part et d'autre (mesure sur le rendu : e =
   * 63,0 pour R = 100). A la hauteur des yeux, le col de la fiole n'offre que
   * 0,19 de demi-largeur et l'eprouvette 0,30 : le prorata de `radiusAtAngle` et
   * le decalage d'`eyefit` ne comblent pas un tel ecart, et les yeux sortaient du
   * masque sur 55 combinaisons. Elargir assez pour les faire tenir ne donne plus
   * de la verrerie mais une gousse.
   *
   * Une forme haute et etroite est donc muette, et c'est la bonne reponse : mieux
   * vaut pas de visage qu'un visage rogne.
   */
  sansVisage?: boolean
  /**
   * Contour direct, quand r(theta) rend mal la forme. Cf. `Silhouette.pts`.
   *
   * `radii` reste renseigne meme alors : c'est lui que lisent `radiusAtAngle` (ce qui se
   * pose SUR le corps) et le cadrage d'export. Les deux decrivent le meme contour, seul
   * l'echantillonnage differe.
   */
  pts?: Point[]
  /**
   * Ou le corps est le plus degage, en unites de rayon, quand ce n'est pas l'origine.
   *
   * `eyefit` suppose que le point le plus large est le centre du profil, et c'est vrai de
   * toutes les formes rondes : sa course s'arrete en y amenant la paire. Une fiole est
   * large SOUS l'origine et etroite au-dessus, donc la course visait un endroit ou le
   * visage ne tient pas et le solveur rendait un pis-aller.
   *
   * L'ancre ne pose pas les yeux : elle deplace la CIBLE de la recherche. Le solveur
   * cherche toujours la plus petite translation qui tient, et le resultat reste sa
   * reponse, pas une valeur ecrite a la main.
   */
  ancreVisage?: { x: number; y: number }
  /**
   * Facteur sur l'ecart des yeux, quand le corps est trop etroit pour le visage nominal.
   *
   * Un FACTEUR et non un angle : chaque expression pose deja son propre `split`, et une
   * valeur absolue les aplatirait toutes sur la meme. Ici la forme dit seulement « resserre
   * de tant », et les seize expressions gardent leur ecartement relatif.
   *
   * Ce n'est pas non plus une mise a l'echelle des yeux : `skins.test.ts` verrouille que
   * leur TAILLE ne depend pas de la forme (une version qui les rapetissait sur un corps
   * plat se lisait comme un defaut). Seul l'ecart bouge — la paire se resserre, chaque oeil
   * garde ses dimensions.
   *
   * L'eprouvette a ete essayee sur tout l'intervalle, 0,35 a 0,95 : elle echoue partout
   * (5,1 / 7,3 / 3,7 / 4,5 / 4,7 unites dehors sur `wide`) et le rendu montre pourquoi —
   * les deux yeux fusionnent en une tache. Un corps de 81 unites de large ne loge pas deux
   * gelules de 87 de haut, quel que soit leur ecartement. Elle reste `sansVisage`.
   */
  ecartVisage?: number
  /**
   * Dessiner les yeux SUR le corps, cernes, au lieu de les percer dedans.
   *
   * Le percage est la regle et ce qui donne le volume : l'oeil se fait rogner tout seul au
   * bord de la silhouette. Mais un trou ne sait QUE se faire rogner — sur un corps plus
   * etroit que la paire, les deux gelules se rejoignent en une tache et il ne reste plus de
   * visage. C'est ce qui condamnait l'eprouvette : 81 unites de large pour des gelules de
   * 87 de haut sur `wide`, et aucun ecartement n'y changeait rien.
   *
   * Pose et cerne, l'oeil garde sa forme entiere et deborde du bord au lieu d'y disparaitre.
   * On echange un peu de volume contre un visage qui tient : c'est le bon marche quand
   * l'autre option est pas de visage du tout.
   */
  yeuxPoses?: boolean
}

/** Ramene le rayon maximal a `max` pour que toutes les formes pesent pareil a l'oeil. */
function normalize(radii: number[], max = 1): number[] {
  const peak = Math.max(...radii)
  if (peak <= 0) return radii
  const k = max / peak
  return radii.map((r) => r * k)
}

const ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => (i / PROFILE_SAMPLES) * Math.PI * 2)

/** Galet : cercle deforme par deux harmoniques basses, donc irregulier mais lisse. */
const pebble = normalize(
  ANGLES.map((a) => 1 + 0.075 * Math.cos(2 * a + 0.5) + 0.035 * Math.cos(3 * a + 2.1)),
  1.02
)

/** Nuage : union de bosses, large en bas, deux lobes en haut. */
const cloud = normalize(
  unionOfCirclesProfile([
    { x: -0.44, y: 0.2, r: 0.54 },
    { x: 0.46, y: 0.2, r: 0.5 },
    { x: 0.02, y: 0.3, r: 0.6 },
    { x: -0.24, y: -0.3, r: 0.48 },
    { x: 0.3, y: -0.24, r: 0.44 }
  ]),
  1.02
)

/** Goutte : gros disque en bas, pointe effilee en haut. */
const droplet = normalize(
  profileFromPolygon(hullOfCircles(0, 0.28, 0.66, 0, -0.96, 0.05), 0, 0),
  1.04
)

/** Capsule couchee : enveloppe de deux disques cote a cote. */
const capsule = profileFromPolygon(hullOfCircles(-0.42, 0, 0.62, 0.42, 0, 0.62), 0, 0)

/*
 * Verrerie de laboratoire — HORS de `SHAPES`, et ce n'est pas un oubli.
 *
 * Les profils eux-memes sont valides : tout rayon parti du centre de lancer coupe
 * le contour exactement une fois, verifie sur les 64 angles, donc le morphing les
 * traite comme n'importe quelle autre forme.
 *
 * Ce qu'elles ne peuvent pas porter, c'est un VISAGE ; le detail est sur
 * `BotShape.sansVisage`.
 *
 * Elles portent donc `sansVisage` au catalogue : le moteur eteint les yeux tant
 * qu'elles sont le corps, au lieu de les laisser deborder.
 */

/**
 * Fiole d'Erlenmeyer : cone qui se resserre jusqu'au col, puis col droit.
 *
 * Le cone rejoint le col A SA LARGEUR, sans epaulement horizontal : c'est ce qui
 * evite un sommet rentrant, que l'arrondi de `roundedPolygon` traiterait en
 * boucle vers l'interieur.
 */
/*
 * Sommets NUS, sans `roundedPolygon` : la somme de Minkowski laisse de petites boucles aux
 * sommets, que `profileFromPolygon` masquait en ne gardant que l'intersection la plus
 * lointaine. Un contour direct, lui, les passe telles quelles au trace — elles sortaient en
 * pointes aux epaules et aux coins de la base.
 *
 * L'arrondi vient d'ailleurs : `closedPath` trace des cubiques Catmull-Rom, et sur un
 * contour rechantillonne a longueur d'arc il y a assez de points dans chaque coin pour
 * l'adoucir tout seul.
 */
const FIOLE_POLY: Point[] = [
  { x: -0.82, y: 0.48 },
  { x: 0.82, y: 0.48 },
  { x: 0.82, y: 0.24 },
  { x: 0.33, y: -0.74 },
  { x: 0.33, y: -1.04 },
  { x: -0.33, y: -1.04 },
  { x: -0.33, y: -0.74 },
  { x: -0.82, y: 0.24 }
]

/**
 * Fiole : contour DIRECT, pas un profil radial.
 *
 * C'est la forme qui a motive `Silhouette.pts`. En r(theta) les coins de la base tombent a
 * 0,95 du centre de lancer et le milieu a 0,48 : le rayon saute d'un echantillon au suivant
 * et `closedPath` gonflait l'ecart en jupe. Rechantillonne a longueur d'arc, les memes 64
 * points se posent la ou le trait tourne — la base reste plate et le col net.
 */
export const FIOLE_PTS = (() => {
  const brut = resampleOutline(FIOLE_POLY)
  const k = 1.15 / rayonMax(brut)
  return brut.map((p) => ({ x: p.x * k, y: p.y * k }))
})()

/** Rayons equivalents, pour tout ce qui interroge le contour par angle. */
export const FIOLE = profileFromPolygon(
  FIOLE_PTS.map((p) => ({ x: p.x, y: p.y })),
  0,
  0
)

/** Eprouvette : fond hemispherique, flancs droits, levre plate. */
const EPROUVETTE = (() => {
  const hw = 0.3
  const yFond = 0.6
  const pts: Point[] = [
    { x: -hw, y: -0.9 },
    { x: hw, y: -0.9 },
    { x: hw, y: yFond }
  ]
  // demi-cercle du fond, de droite a gauche en passant par le bas
  for (let i = 1; i < 24; i++) {
    const a = (i / 24) * Math.PI
    pts.push({ x: Math.cos(a) * hw, y: yFond + Math.sin(a) * hw })
  }
  pts.push({ x: -hw, y: yFond })
  return pts
})()

export const EPROUVETTE_PROFIL = normalize(profileFromPolygon(roundedPolygon(EPROUVETTE, 0.05), 0, 0), 1.15)

/**
 * Ballon a fond rond : une sphere et un col droit.
 *
 * Contour direct comme la fiole, et pour la meme raison — le col est etroit et loin du
 * centre, donc sous-echantillonne en r(theta). Le trace part du haut du col, descend un
 * flanc jusqu'a la sphere, en fait le tour, et remonte l'autre.
 *
 * Contrairement a l'eprouvette, celui-la PORTE un visage, et SANS aucune exception : la
 * panse est aussi large qu'un cercle, donc le visage nominal y tient tel quel.
 *
 * Tout tient au COL, et par un detour : `normalize` ramene le rayon MAXIMAL a 1,15, et ce
 * maximum est la pointe du col. Un col long rapetisse donc la panse. A -1,02 elle tombait a
 * 0,59 de demi-largeur, sous les ~0,66 qu'il faut pour loger les deux yeux, et il fallait
 * alors une ancre pour rattraper — qui elle-meme faisait sauter le visage d'une expression
 * a l'autre (21,3 d'ecart pour un plafond de 14), parce que le solveur d'`eyefit` sort au
 * premier tour des que le visage tient deja : certaines expressions recevaient zero et
 * d'autres vingt unites.
 *
 * A -0,85 la panse reste assez large et il n'y a plus rien a rattraper. La bonne proportion
 * a remplace l'exception, ce qui est toujours preferable.
 */
const BALLON_R = 0.7
const BALLON_CY = 0.34
const BALLON_COL = 0.2

const BALLON_POLY: Point[] = (() => {
  // ordonnee ou le flanc du col rencontre la sphere
  const dy = Math.sqrt(BALLON_R * BALLON_R - BALLON_COL * BALLON_COL)
  const yJonction = BALLON_CY - dy
  const aDroite = Math.atan2(-dy, BALLON_COL)
  const aGauche = Math.atan2(-dy, -BALLON_COL)
  // sens horaire ecran : theta croissant de la jonction droite a la gauche
  const balayage = aGauche + Math.PI * 2 - aDroite

  const pts: Point[] = [
    { x: -BALLON_COL, y: -0.85 },
    { x: BALLON_COL, y: -0.85 },
    { x: BALLON_COL, y: yJonction }
  ]
  const pas = 56
  for (let i = 1; i < pas; i++) {
    const a = aDroite + (i / pas) * balayage
    pts.push({ x: Math.cos(a) * BALLON_R, y: BALLON_CY + Math.sin(a) * BALLON_R })
  }
  pts.push({ x: -BALLON_COL, y: yJonction })
  return pts
})()

export const BALLON_PTS = (() => {
  const brut = resampleOutline(BALLON_POLY)
  const k = 1.15 / rayonMax(brut)
  return brut.map((p) => ({ x: p.x * k, y: p.y * k }))
})()

export const BALLON = profileFromPolygon(BALLON_PTS, 0, 0)

export const SHAPES: BotShape[] = [
  { id: 'cercle', radii: new Array(PROFILE_SAMPLES).fill(1) },
  { id: 'galet', radii: pebble },
  // 1.15 et pas 1.02 : sur une superellipse le rayon maximal est la diagonale,
  // donc normaliser dessus donne une forme qui parait plus petite que le cercle.
  { id: 'squircle', radii: normalize(superellipseProfile(4.2), 1.15) },
  { id: 'capsule', radii: capsule },
  // -90deg : un sommet vers le haut de l'ecran (y est oriente vers le bas)
  { id: 'triangle', radii: regularPolygonProfile(3, 1.12, 0.34, -90) },
  // 0deg : sommets a gauche et a droite, donc aretes du haut et du bas plates
  { id: 'hexagone', radii: regularPolygonProfile(6, 1.04, 0.26, 0) },
  { id: 'nuage', radii: cloud },
  { id: 'goutte', radii: droplet },
  /*
   * -90deg : une pointe vers le haut (y est oriente vers le bas).
   *
   * Creux a 0.70 et pas au 0.382 de l'etoile a cinq branches classique : plus
   * creux, les flancs deviennent trop etroits pour le visage. A 0.53 les yeux
   * de `wide` sortaient du masque a chacune des seize expressions, et a 0.66 la
   * correction d'`eyefit` oscillait de 14,2 entre expressions (plafond 14).
   * 0.68 passe tout juste ; 0.70 garde de la marge. `skins.test.ts` tient les
   * deux bornes.
   *
   * Pic ramene a 1.15, celui du squircle : c'est le maximum du catalogue, dont
   * `DEMI_CADRE` (export.ts) se deduit — le depasser recadrerait TOUS les
   * exports pour loger les pointes de celle-ci seule.
   */
  { id: 'etoile', radii: normalize(starProfile(5, 1.15, 0.7, 0.14, -90), 1.15) },
  { id: 'fiole', radii: FIOLE, pts: FIOLE_PTS, ancreVisage: { x: 0, y: 0.62 } },
  { id: 'eprouvette', radii: EPROUVETTE_PROFIL, yeuxPoses: true },
  { id: 'ballon', radii: BALLON, pts: BALLON_PTS }
]

// Map indexee par `string` et non par `ShapeId` : les appelants interrogent avec
// une valeur relue du localStorage ou d'une prop, donc non validee.
export const SHAPE_BY_ID = new Map<string, BotShape>(SHAPES.map((s) => [s.id, s]))
export const DEFAULT_SHAPE = 'cercle'

export type ColorId =
  | 'encre'
  | 'creme'
  | 'brun'
  | 'rouge'
  | 'orange'
  | 'ambre'
  | 'vert'
  | 'turquoise'
  | 'bleu'
  | 'violet'
  | 'rose'
  | 'gris'
  | 'citron'
  | 'sapin'
  | 'cyan'
  | 'indigo'
  | 'prune'
  | 'ardoise'

export interface BotColor {
  id: ColorId
  hex: string
}

/*
 * Palette du personnalisateur d'origine, plus six teintes ajoutees.
 *
 * L'ordre est celui de la GRILLE (six par ligne) : les teintes suivent le cercle
 * chromatique et les neutres ferment la marche. Ce n'est pas cosmetique — la
 * grille se lit alors comme un spectre, et une couleur rangee ailleurs se
 * cherche a l'oeil.
 *
 * Les six ajouts comblent les trous mesures de la palette d'origine : 111deg
 * sans rien entre `ambre` (42deg) et `vert` (153deg), puis les creux
 * turquoise -> bleu (44deg), bleu -> violet (47deg) et violet -> rose (63deg).
 * `ardoise` ne comble pas un trou de teinte mais de VALEUR : les neutres
 * sautaient de L4 (`encre`) a L64 (`gris`).
 *
 * Contrainte tenue : l'ecart perceptuel minimal de la palette (deltaE76) reste
 * celui de la palette d'origine, 19,2 entre `vert` et `turquoise`. Aucune paire
 * ajoutee ne descend en dessous — c'est ce qui a fait passer `indigo` de
 * #384ddc (17,3 avec `violet`, donc plus serre que tout ce qui existait) a
 * #2246d3.
 */
export const COLORS: BotColor[] = [
  { id: 'encre', hex: '#0a0a0c' },
  { id: 'brun', hex: '#8b5e3c' },
  { id: 'rouge', hex: '#e8483f' },
  { id: 'orange', hex: '#f08a24' },
  { id: 'ambre', hex: '#f0b429' },
  { id: 'citron', hex: '#9ed039' },

  { id: 'sapin', hex: '#389f45' },
  { id: 'vert', hex: '#3ecf8e' },
  { id: 'turquoise', hex: '#2fbfa0' },
  { id: 'cyan', hex: '#29b9d6' },
  { id: 'bleu', hex: '#3b93f0' },
  { id: 'indigo', hex: '#2246d3' },

  { id: 'violet', hex: '#8b5cf6' },
  { id: 'prune', hex: '#b64acf' },
  { id: 'rose', hex: '#e152b0' },
  { id: 'ardoise', hex: '#495769' },
  { id: 'gris', hex: '#a3a3a3' },
  { id: 'creme', hex: '#f1efe9' }
]

export const COLOR_BY_ID = new Map<string, BotColor>(COLORS.map((c) => [c.id, c]))
export const DEFAULT_COLOR = 'encre'

/** Melange deux couleurs hex. Sert a la brume de profondeur des particules. */
export function mixHex(from: string, to: string, t: number): string {
  const parse = (h: string) => {
    const v = parseInt(h.slice(1), 16)
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
  }
  const a = parse(from)
  const b = parse(to)
  const c = a.map((x, i) => Math.round(x + (b[i]! - x) * t))
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`
}
