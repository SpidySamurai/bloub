import { SHAPE_BY_ID } from './skins.js';
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
export const LAB_IDS = ['ballon', 'fiole', 'eprouvette', 'goutte'];
/**
 * Verifie a l'import que chaque id existe vraiment au catalogue.
 *
 * `SHAPE_BY_ID` est indexee par `string` — elle sert a lire des valeurs non validees, du
 * localStorage ou d'une prop — donc le compilateur ne peut pas garantir ces quatre-la. Le
 * controle se fait donc au chargement, une fois, et il jette : une forme manquante est un
 * defaut de programmation, pas un cas a rattraper au rendu.
 */
export const LAB_SHAPES = LAB_IDS.map((id) => {
    const forme = SHAPE_BY_ID.get(id);
    if (!forme)
        throw new Error(`lab: la forme "${id}" n'est pas au catalogue`);
    return forme;
});
/** Le type large du catalogue accepte-t-il cet id ? Sert aux valeurs relues du stockage. */
export const estFormeLab = (id) => LAB_IDS.includes(id);
/**
 * Forme par defaut : le ballon.
 *
 * C'est la seule des quatre qui ne demande aucune exception — sa panse est aussi large
 * qu'un cercle, donc le visage nominal y tient tel quel. Une valeur par defaut doit etre le
 * cas le plus sur, pas le plus joli.
 */
export const LAB_DEFAUT = 'ballon';
/** Garde-fou pour une valeur relue du stockage : rend toujours un id utilisable. */
export const formeLabOuDefaut = (id) => id && estFormeLab(id) ? id : LAB_DEFAUT;
//# sourceMappingURL=lab.js.map