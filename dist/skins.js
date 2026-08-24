import { PROFILE_SAMPLES } from './profiles.js';
import { hullOfCircles, profileFromPolygon, regularPolygonProfile, rayonMax, resampleOutline, roundedPolygon, starProfile, superellipseProfile, unionOfCirclesProfile } from './shape.js';
/** Ramene le rayon maximal a `max` pour que toutes les formes pesent pareil a l'oeil. */
function normalize(radii, max = 1) {
    const peak = Math.max(...radii);
    if (peak <= 0)
        return radii;
    const k = max / peak;
    return radii.map((r) => r * k);
}
const ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => (i / PROFILE_SAMPLES) * Math.PI * 2);
/** Galet : cercle deforme par deux harmoniques basses, donc irregulier mais lisse. */
const pebble = normalize(ANGLES.map((a) => 1 + 0.075 * Math.cos(2 * a + 0.5) + 0.035 * Math.cos(3 * a + 2.1)), 1.02);
/** Nuage : union de bosses, large en bas, deux lobes en haut. */
const cloud = normalize(unionOfCirclesProfile([
    { x: -0.44, y: 0.2, r: 0.54 },
    { x: 0.46, y: 0.2, r: 0.5 },
    { x: 0.02, y: 0.3, r: 0.6 },
    { x: -0.24, y: -0.3, r: 0.48 },
    { x: 0.3, y: -0.24, r: 0.44 }
]), 1.02);
/** Goutte : gros disque en bas, pointe effilee en haut. */
const droplet = normalize(profileFromPolygon(hullOfCircles(0, 0.28, 0.66, 0, -0.96, 0.05), 0, 0), 1.04);
/** Capsule couchee : enveloppe de deux disques cote a cote. */
const capsule = profileFromPolygon(hullOfCircles(-0.42, 0, 0.62, 0.42, 0, 0.62), 0, 0);
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
const FIOLE_POLY = [
    { x: -0.82, y: 0.48 },
    { x: 0.82, y: 0.48 },
    { x: 0.82, y: 0.24 },
    { x: 0.33, y: -0.74 },
    { x: 0.33, y: -1.04 },
    { x: -0.33, y: -1.04 },
    { x: -0.33, y: -0.74 },
    { x: -0.82, y: 0.24 }
];
/**
 * Fiole : contour DIRECT, pas un profil radial.
 *
 * C'est la forme qui a motive `Silhouette.pts`. En r(theta) les coins de la base tombent a
 * 0,95 du centre de lancer et le milieu a 0,48 : le rayon saute d'un echantillon au suivant
 * et `closedPath` gonflait l'ecart en jupe. Rechantillonne a longueur d'arc, les memes 64
 * points se posent la ou le trait tourne — la base reste plate et le col net.
 */
export const FIOLE_PTS = (() => {
    const brut = resampleOutline(FIOLE_POLY);
    const k = 1.15 / rayonMax(brut);
    return brut.map((p) => ({ x: p.x * k, y: p.y * k }));
})();
/** Rayons equivalents, pour tout ce qui interroge le contour par angle. */
export const FIOLE = profileFromPolygon(FIOLE_PTS.map((p) => ({ x: p.x, y: p.y })), 0, 0);
/** Eprouvette : fond hemispherique, flancs droits, levre plate. */
const EPROUVETTE = (() => {
    const hw = 0.3;
    const yFond = 0.6;
    const pts = [
        { x: -hw, y: -0.9 },
        { x: hw, y: -0.9 },
        { x: hw, y: yFond }
    ];
    // demi-cercle du fond, de droite a gauche en passant par le bas
    for (let i = 1; i < 24; i++) {
        const a = (i / 24) * Math.PI;
        pts.push({ x: Math.cos(a) * hw, y: yFond + Math.sin(a) * hw });
    }
    pts.push({ x: -hw, y: yFond });
    return pts;
})();
export const EPROUVETTE_PROFIL = normalize(profileFromPolygon(roundedPolygon(EPROUVETTE, 0.05), 0, 0), 1.15);
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
const BALLON_R = 0.7;
const BALLON_CY = 0.34;
const BALLON_COL = 0.2;
const BALLON_POLY = (() => {
    // ordonnee ou le flanc du col rencontre la sphere
    const dy = Math.sqrt(BALLON_R * BALLON_R - BALLON_COL * BALLON_COL);
    const yJonction = BALLON_CY - dy;
    const aDroite = Math.atan2(-dy, BALLON_COL);
    const aGauche = Math.atan2(-dy, -BALLON_COL);
    // sens horaire ecran : theta croissant de la jonction droite a la gauche
    const balayage = aGauche + Math.PI * 2 - aDroite;
    const pts = [
        { x: -BALLON_COL, y: -0.85 },
        { x: BALLON_COL, y: -0.85 },
        { x: BALLON_COL, y: yJonction }
    ];
    const pas = 56;
    for (let i = 1; i < pas; i++) {
        const a = aDroite + (i / pas) * balayage;
        pts.push({ x: Math.cos(a) * BALLON_R, y: BALLON_CY + Math.sin(a) * BALLON_R });
    }
    pts.push({ x: -BALLON_COL, y: yJonction });
    return pts;
})();
export const BALLON_PTS = (() => {
    const brut = resampleOutline(BALLON_POLY);
    const k = 1.15 / rayonMax(brut);
    return brut.map((p) => ({ x: p.x * k, y: p.y * k }));
})();
export const BALLON = profileFromPolygon(BALLON_PTS, 0, 0);
export const SHAPES = [
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
];
// Map indexee par `string` et non par `ShapeId` : les appelants interrogent avec
// une valeur relue du localStorage ou d'une prop, donc non validee.
export const SHAPE_BY_ID = new Map(SHAPES.map((s) => [s.id, s]));
export const DEFAULT_SHAPE = 'cercle';
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
export const COLORS = [
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
];
export const COLOR_BY_ID = new Map(COLORS.map((c) => [c.id, c]));
export const DEFAULT_COLOR = 'encre';
/** Melange deux couleurs hex. Sert a la brume de profondeur des particules. */
export function mixHex(from, to, t) {
    const parse = (h) => {
        const v = parseInt(h.slice(1), 16);
        return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
    };
    const a = parse(from);
    const b = parse(to);
    const c = a.map((x, i) => Math.round(x + (b[i] - x) * t));
    return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}
//# sourceMappingURL=skins.js.map