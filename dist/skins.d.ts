import { type Point } from './shape.js';
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
export type ShapeId = 'cercle' | 'galet' | 'squircle' | 'capsule' | 'triangle' | 'hexagone' | 'nuage' | 'goutte' | 'etoile' | 'fiole' | 'eprouvette' | 'ballon';
export interface BotShape {
    id: ShapeId;
    radii: number[];
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
    sansVisage?: boolean;
    /**
     * Contour direct, quand r(theta) rend mal la forme. Cf. `Silhouette.pts`.
     *
     * `radii` reste renseigne meme alors : c'est lui que lisent `radiusAtAngle` (ce qui se
     * pose SUR le corps) et le cadrage d'export. Les deux decrivent le meme contour, seul
     * l'echantillonnage differe.
     */
    pts?: Point[];
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
    ancreVisage?: {
        x: number;
        y: number;
    };
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
    ecartVisage?: number;
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
    yeuxPoses?: boolean;
}
/**
 * Fiole : contour DIRECT, pas un profil radial.
 *
 * C'est la forme qui a motive `Silhouette.pts`. En r(theta) les coins de la base tombent a
 * 0,95 du centre de lancer et le milieu a 0,48 : le rayon saute d'un echantillon au suivant
 * et `closedPath` gonflait l'ecart en jupe. Rechantillonne a longueur d'arc, les memes 64
 * points se posent la ou le trait tourne — la base reste plate et le col net.
 */
export declare const FIOLE_PTS: {
    x: number;
    y: number;
}[];
/** Rayons equivalents, pour tout ce qui interroge le contour par angle. */
export declare const FIOLE: number[];
export declare const EPROUVETTE_PROFIL: number[];
export declare const BALLON_PTS: {
    x: number;
    y: number;
}[];
export declare const BALLON: number[];
export declare const SHAPES: BotShape[];
export declare const SHAPE_BY_ID: Map<string, BotShape>;
export declare const DEFAULT_SHAPE = "cercle";
export type ColorId = 'encre' | 'creme' | 'brun' | 'rouge' | 'orange' | 'ambre' | 'vert' | 'turquoise' | 'bleu' | 'violet' | 'rose' | 'gris' | 'citron' | 'sapin' | 'cyan' | 'indigo' | 'prune' | 'ardoise';
export interface BotColor {
    id: ColorId;
    hex: string;
}
export declare const COLORS: BotColor[];
export declare const COLOR_BY_ID: Map<string, BotColor>;
export declare const DEFAULT_COLOR = "encre";
/** Melange deux couleurs hex. Sert a la brume de profondeur des particules. */
export declare function mixHex(from: string, to: string, t: number): string;
//# sourceMappingURL=skins.d.ts.map