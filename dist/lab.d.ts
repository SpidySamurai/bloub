import { type BotShape, type ShapeId } from './skins.js';
/**
 * Le sous-ensemble « verrerie », celui qu'un produit expose a ses utilisateurs.
 *
 * Le catalogue de `skins.ts` est celui du personnalisateur de bloub : douze formes, dont
 * huit qui viennent de la grille d'origine et n'ont rien a voir avec un laboratoire. Une
 * application qui n'en veut que quatre n'a pas a filtrer a la main a chaque endroit ou elle
 * les affiche — elle lit cette liste.
 *
 * C'est une VUE sur le catalogue, pas une copie : les formes restent definies une seule
 * fois, avec leurs exceptions. Ajouter une piece de verrerie ici sans l'avoir mise au
 * catalogue ne compile pas, et en retirer une du catalogue casse ici bruyamment plutot que
 * de rendre une case vide.
 */
export declare const LAB_IDS: readonly ["ballon", "fiole", "eprouvette", "goutte"];
export type LabShapeId = (typeof LAB_IDS)[number];
/**
 * Verifie a l'import que chaque id existe vraiment au catalogue.
 *
 * `SHAPE_BY_ID` est indexee par `string` — elle sert a lire des valeurs non validees, du
 * localStorage ou d'une prop — donc le compilateur ne peut pas garantir ces quatre-la. Le
 * controle se fait donc au chargement, une fois, et il jette : une forme manquante est un
 * defaut de programmation, pas un cas a rattraper au rendu.
 */
export declare const LAB_SHAPES: BotShape[];
/** Le type large du catalogue accepte-t-il cet id ? Sert aux valeurs relues du stockage. */
export declare const estFormeLab: (id: string) => id is LabShapeId;
/**
 * Forme par defaut : le ballon.
 *
 * C'est la seule des quatre qui ne demande aucune exception — sa panse est aussi large
 * qu'un cercle, donc le visage nominal y tient tel quel. Une valeur par defaut doit etre le
 * cas le plus sur, pas le plus joli.
 */
export declare const LAB_DEFAUT: LabShapeId;
/** Garde-fou pour une valeur relue du stockage : rend toujours un id utilisable. */
export declare const formeLabOuDefaut: (id: string | null | undefined) => ShapeId;
//# sourceMappingURL=lab.d.ts.map