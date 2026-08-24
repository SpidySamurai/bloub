/**
 * La porte du paquet: ce qu'un produit consomme sans connaitre la disposition des fichiers.
 *
 * Les sous-chemins restent ouverts (`bloub-core/skins`, `bloub-core/cycles`) — l'application
 * bloub s'en sert, et l'editeur de montages a besoin de pieces qui n'ont rien a faire dans
 * la porte d'entree. Ici ne passe que ce qu'il faut pour DESSINER un bot: le moteur, les
 * etats, le catalogue de formes, les expressions, et le repere du viewBox.
 */
export { BotEngine } from './engine'
export type { BotFrame, RenderedEye, Look } from './engine'

export { STATES, STATE_BY_ID, SEQUENCE, POSES } from './states'
export type { StateId, StateDef, Pose, EyeCfg } from './states'

export { SHAPES, SHAPE_BY_ID } from './skins'
export type { ShapeId, BotShape } from './skins'

export { LAB_IDS, LAB_SHAPES, LAB_DEFAUT, estFormeLab, formeLabOuDefaut } from './lab'
export type { LabShapeId } from './lab'

export { EXPRESSIONS, EXPRESSION_BY_ID, DEFAULT_EXPRESSION, blendExpression } from './expressions'
export type { ExpressionId, BotExpression } from './expressions'

export { closedPath, toPoints } from './shape'
export type { Point, Silhouette } from './shape'

export { RAYON, DEMI_VIEWBOX } from './repere'
