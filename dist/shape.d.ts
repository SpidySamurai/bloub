import { type ProfileName } from './profiles.js';
export interface Point {
    x: number;
    y: number;
}
/**
 * Une silhouette = un profil radial r(theta) plus une pose.
 *
 * Tout passe par des profils echantillonnes au MEME nombre d'angles : deux
 * formes quelconques ont donc des points qui se correspondent un a un, et le
 * morphing se reduit a une interpolation lineaire des rayons. C'est ce qui
 * rend les transitions propres sans librairie de morphing de path.
 */
export interface Silhouette {
    radii: number[];
    /**
     * Contour echantillonne en POINTS, qui prend le pas sur `radii` quand il est la.
     *
     * `radii` echantillonne en ANGLE : c'est exact et compact tant que le rayon varie
     * lentement d'une muestra a l'autre. Sur une fiole il ne l'est plus — les coins de la
     * base sont a 0,95 du centre de lancer et le milieu a 0,48, donc r saute d'un
     * echantillon au suivant et la cubique de `closedPath` gonfle l'ecart en jupe.
     *
     * Un contour rechantillonne a LONGUEUR D'ARC constante repartit les memes 64 points
     * la ou le trait tourne, pas la ou l'angle avance. Le morphing ne change pas : deux
     * listes de 64 points se correspondent une a une exactement comme deux profils.
     */
    pts?: Point[];
    /** rotation du profil, en radians */
    rot: number;
    /** decalage du centre, en unites de rayon de boule */
    cx: number;
    cy: number;
    /** squash & stretch, applique en repere ecran (apres rotation) */
    sx: number;
    sy: number;
}
export declare function silhouette(name: ProfileName, pose?: Partial<Silhouette>): Silhouette;
/** Cercle parfait : sert de base neutre (point, bulle, cible de fondu). */
export declare function circle(radius: number, pose?: Partial<Silhouette>): Silhouette;
/** Interpolation de deux silhouettes. `out` est reutilise pour eviter d'allouer a 60 fps. */
export declare function blend(a: Silhouette, b: Silhouette, t: number, out?: Silhouette): Silhouette;
/** Projette la silhouette en points ecran. `scale` = rayon de la boule en unites de viewBox. */
export declare function toPoints(s: Silhouette, scale: number, out?: Point[]): Point[];
/**
 * Polyligne fermee -> cubiques Catmull-Rom.
 *
 * Avec 64 points les tangentes centrees suffisent largement : le contour est
 * lisse au pixel pres meme affiche en 600 px, et la chaine reste courte.
 */
export declare function closedPath(pts: Point[], tension?: number): string;
/**
 * Polygone quelconque -> profil radial, par lancer de rayon depuis `center`.
 *
 * Sert a fabriquer les formes qui ne s'expriment pas naturellement en r(theta)
 * (la barre tronconique du "!"). Calcule une seule fois au chargement, jamais
 * dans la boucle de rendu.
 */
export declare function profileFromPolygon(poly: Point[], cx: number, cy: number): number[];
/** Enveloppe convexe de deux cercles : la barre tronconique du "!" vertical. */
export declare function hullOfCircles(x1: number, y1: number, r1: number, x2: number, y2: number, r2v: number, steps?: number): Point[];
/**
 * Rayon du profil dans une direction quelconque, par interpolation entre les
 * deux echantillons voisins.
 *
 * Sert a recaler ce qui est pose "sur" le corps (les yeux, la pastille de
 * notification) quand la silhouette n'est plus un cercle : sans ca, un oeil
 * place a 0.62 rayon sort d'une forme dont le bord est a 0.55 dans cette
 * direction, et le masque le rogne.
 */
export declare function radiusAtAngle(radii: number[], angle: number): number;
/**
 * Superellipse : |x/sx|^n + |y/sy|^n = 1.
 * n = 2 donne une ellipse, n ~ 4 le squircle du personnalisateur.
 */
export declare function superellipseProfile(n: number, sx?: number, sy?: number): number[];
/**
 * Profil radial de l'UNION de disques : r(theta) = la plus lointaine des
 * intersections rayon/cercle. Exact tant que l'origine est dans l'union — c'est
 * ce qui donne les bosses du nuage sans booleen de path.
 */
export declare function unionOfCirclesProfile(circles: Array<{
    x: number;
    y: number;
    r: number;
}>): number[];
/**
 * Polygone a coins arrondis, par somme de Minkowski avec un disque : chaque
 * arete est poussee de `rc` vers l'exterieur, chaque sommet devient un arc de
 * rayon `rc`. Les sommets sont donc a poser au rayon voulu MOINS rc.
 * Attend un polygone en sens horaire (repere ecran, y vers le bas).
 */
export declare function roundedPolygon(verts: Point[], rc: number, arcSteps?: number): Point[];
/** Polygone regulier a coins arrondis, inscrit dans `radius`. */
export declare function regularPolygonProfile(sides: number, radius: number, rc: number, rotationDeg?: number): number[];
/**
 * Etoile a `points` branches, coins arrondis.
 *
 * Meme construction que `regularPolygonProfile`, a ceci pres que les sommets
 * alternent entre `rOuter` (les pointes) et `rInner` (les creux). Une etoile
 * reste etoilee au sens strict — tout rayon parti du centre coupe le contour
 * exactement une fois — donc r(theta) la decrit exactement, comme les formes
 * convexes du reste du fichier.
 *
 * `rc` arrondit pointes ET creux : sans lui les pointes tombent entre deux des
 * 64 angles echantillonnes et s'emoussent au hasard de leur orientation.
 */
export declare function starProfile(points: number, rOuter: number, rInner: number, rc: number, rotationDeg?: number): number[];
/**
 * Rechantillonne un polygone ferme en `PROFILE_SAMPLES` points a LONGUEUR D'ARC constante.
 *
 * C'est l'alternative a `profileFromPolygon` pour les contours ou r(theta) se comporte mal :
 * les points vont la ou le trait est long, pas la ou l'angle avance.
 *
 * Deux calages sans lesquels le morphing partirait en vrille :
 *
 * - **le sens**, ramene a l'horaire ecran (aire signee), qui est celui des angles de
 *   `profileFromPolygon` avec y vers le bas. Deux contours de sens opposes se melangent en
 *   se retournant l'un dans l'autre ;
 * - **l'origine**, ramenee au point le plus proche de la direction +x. L'indice 0 d'un
 *   profil radial est a theta = 0 : sans ce calage, melanger un contour direct et un
 *   profil ferait tourner la forme d'un quart de tour pendant la transition.
 */
export declare function resampleOutline(poly: Point[], samples?: number): Point[];
/** Rayon maximal d'un contour direct : l'equivalent de `Math.max(...radii)`. */
export declare const rayonMax: (pts: Point[]) => number;
/** Polyligne fermee exacte : garde les segments droits (contrairement a closedPath). */
export declare function polyPath(pts: Point[], scale?: number): string;
/** Capsule (stade) centree sur l'origine : la forme exacte des yeux du bot. */
export declare function capsulePath(w: number, h: number): string;
//# sourceMappingURL=shape.d.ts.map