import { TAU, lerp, r2 } from './math.js'
import { PROFILES, PROFILE_SAMPLES, type ProfileName } from './profiles.js'

export interface Point {
  x: number
  y: number
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
  radii: number[]
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
  pts?: Point[]
  /** rotation du profil, en radians */
  rot: number
  /** decalage du centre, en unites de rayon de boule */
  cx: number
  cy: number
  /** squash & stretch, applique en repere ecran (apres rotation) */
  sx: number
  sy: number
}

const ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => (i / PROFILE_SAMPLES) * TAU)
const COS = ANGLES.map(Math.cos)
const SIN = ANGLES.map(Math.sin)

export function silhouette(name: ProfileName, pose: Partial<Silhouette> = {}): Silhouette {
  return {
    radii: [...PROFILES[name]],
    rot: 0,
    cx: 0,
    cy: 0,
    sx: 1,
    sy: 1,
    ...pose
  }
}

/** Cercle parfait : sert de base neutre (point, bulle, cible de fondu). */
export function circle(radius: number, pose: Partial<Silhouette> = {}): Silhouette {
  return {
    radii: new Array(PROFILE_SAMPLES).fill(radius),
    rot: 0,
    cx: 0,
    cy: 0,
    sx: 1,
    sy: 1,
    ...pose
  }
}

/** Contour local d'une silhouette, quelle que soit sa representation. */
function localPoints(s: Silhouette): Point[] {
  if (s.pts) return s.pts
  return s.radii.map((r, i) => ({ x: r * (COS[i] ?? 0), y: r * (SIN[i] ?? 0) }))
}

/** Interpolation de deux silhouettes. `out` est reutilise pour eviter d'allouer a 60 fps. */
export function blend(a: Silhouette, b: Silhouette, t: number, out?: Silhouette): Silhouette {
  const dst = out ?? { radii: new Array<number>(PROFILE_SAMPLES), rot: 0, cx: 0, cy: 0, sx: 1, sy: 1 }
  if (a.pts || b.pts) {
    // Des qu'un des deux est un contour direct, on melange en POINTS : c'est la seule
    // representation que les deux savent prendre, et l'aller-retour est exact pour un
    // profil radial (r,theta -> x,y ne perd rien).
    const pa = localPoints(a)
    const pb = localPoints(b)
    const pts = dst.pts ?? new Array<Point>(PROFILE_SAMPLES)
    for (let i = 0; i < PROFILE_SAMPLES; i++) {
      const x = lerp(pa[i]?.x ?? 0, pb[i]?.x ?? 0, t)
      const y = lerp(pa[i]?.y ?? 0, pb[i]?.y ?? 0, t)
      const p = pts[i] ?? { x: 0, y: 0 }
      p.x = x
      p.y = y
      pts[i] = p
    }
    dst.pts = pts
    // `radii` reste renseigne : `radiusAtAngle` s'en sert pour poser ce qui vit SUR le
    // corps, et il n'a pas a savoir comment le contour est stocke.
    for (let i = 0; i < PROFILE_SAMPLES; i++) {
      dst.radii[i] = Math.hypot(pts[i]!.x, pts[i]!.y)
    }
  } else {
    dst.pts = undefined
    for (let i = 0; i < PROFILE_SAMPLES; i++) {
      dst.radii[i] = lerp(a.radii[i] ?? 1, b.radii[i] ?? 1, t)
    }
  }
  // Rotation par le chemin le plus court : evite de faire un tour complet
  // quand on passe par exemple de +170deg a -170deg.
  let dRot = b.rot - a.rot
  while (dRot > Math.PI) dRot -= TAU
  while (dRot < -Math.PI) dRot += TAU
  dst.rot = a.rot + dRot * t
  dst.cx = lerp(a.cx, b.cx, t)
  dst.cy = lerp(a.cy, b.cy, t)
  dst.sx = lerp(a.sx, b.sx, t)
  dst.sy = lerp(a.sy, b.sy, t)
  return dst
}

/** Projette la silhouette en points ecran. `scale` = rayon de la boule en unites de viewBox. */
export function toPoints(s: Silhouette, scale: number, out: Point[] = []): Point[] {
  const cr = Math.cos(s.rot)
  const sr = Math.sin(s.rot)
  const src = s.pts
  for (let i = 0; i < PROFILE_SAMPLES; i++) {
    let x: number
    let y: number
    if (src) {
      x = src[i]?.x ?? 0
      y = src[i]?.y ?? 0
    } else {
      const r = s.radii[i] ?? 1
      x = r * (COS[i] ?? 0)
      y = r * (SIN[i] ?? 0)
    }
    // rotation puis squash en repere ecran, puis translation
    const rx = x * cr - y * sr
    const ry = x * sr + y * cr
    const p = out[i] ?? { x: 0, y: 0 }
    p.x = (rx * s.sx + s.cx) * scale
    p.y = (ry * s.sy + s.cy) * scale
    out[i] = p
  }
  out.length = PROFILE_SAMPLES
  return out
}

/**
 * Polyligne fermee -> cubiques Catmull-Rom.
 *
 * Avec 64 points les tangentes centrees suffisent largement : le contour est
 * lisse au pixel pres meme affiche en 600 px, et la chaine reste courte.
 */
export function closedPath(pts: Point[], tension = 1 / 6): string {
  const n = pts.length
  if (n < 3) return ''
  const first = pts[0]!
  let d = `M${r2(first.x)} ${r2(first.y)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]!
    const p1 = pts[i]!
    const p2 = pts[(i + 1) % n]!
    const p3 = pts[(i + 2) % n]!
    const c1x = p1.x + (p2.x - p0.x) * tension
    const c1y = p1.y + (p2.y - p0.y) * tension
    const c2x = p2.x - (p3.x - p1.x) * tension
    const c2y = p2.y - (p3.y - p1.y) * tension
    d += `C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(p2.x)} ${r2(p2.y)}`
  }
  return `${d}Z`
}

/**
 * Polygone quelconque -> profil radial, par lancer de rayon depuis `center`.
 *
 * Sert a fabriquer les formes qui ne s'expriment pas naturellement en r(theta)
 * (la barre tronconique du "!"). Calcule une seule fois au chargement, jamais
 * dans la boucle de rendu.
 */
export function profileFromPolygon(poly: Point[], cx: number, cy: number): number[] {
  const radii = new Array<number>(PROFILE_SAMPLES).fill(0)
  const n = poly.length
  for (let k = 0; k < PROFILE_SAMPLES; k++) {
    const dx = COS[k] ?? 0
    const dy = SIN[k] ?? 0
    let best = 0
    for (let i = 0; i < n; i++) {
      const a = poly[i]!
      const b = poly[(i + 1) % n]!
      const ex = b.x - a.x
      const ey = b.y - a.y
      const den = dx * ey - dy * ex
      if (Math.abs(den) < 1e-9) continue
      const px = a.x - cx
      const py = a.y - cy
      const t = (px * ey - py * ex) / den // distance le long du rayon
      const u = (px * dy - py * dx) / den // position sur le segment
      if (t > best && u >= 0 && u <= 1) best = t
    }
    radii[k] = best
  }
  return radii
}

/** Enveloppe convexe de deux cercles : la barre tronconique du "!" vertical. */
export function hullOfCircles(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2v: number,
  steps = 96
): Point[] {
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.hypot(dx, dy) || 1e-6
  // angle des tangentes externes communes
  const base = Math.atan2(dy, dx)
  const spread = Math.acos(Math.max(-1, Math.min(1, (r1 - r2v) / dist)))
  const pts: Point[] = []
  // arc du grand cercle
  for (let i = 0; i <= steps / 2; i++) {
    const a = base + spread + ((TAU - 2 * spread) * i) / (steps / 2)
    pts.push({ x: x1 + Math.cos(a) * r1, y: y1 + Math.sin(a) * r1 })
  }
  // arc du petit cercle
  for (let i = 0; i <= steps / 2; i++) {
    const a = base - spread + ((2 * spread) * i) / (steps / 2)
    pts.push({ x: x2 + Math.cos(a) * r2v, y: y2 + Math.sin(a) * r2v })
  }
  return pts
}

/**
 * Rayon du profil dans une direction quelconque, par interpolation entre les
 * deux echantillons voisins.
 *
 * Sert a recaler ce qui est pose "sur" le corps (les yeux, la pastille de
 * notification) quand la silhouette n'est plus un cercle : sans ca, un oeil
 * place a 0.62 rayon sort d'une forme dont le bord est a 0.55 dans cette
 * direction, et le masque le rogne.
 */
export function radiusAtAngle(radii: number[], angle: number): number {
  const n = radii.length
  const t = ((((angle / TAU) % 1) + 1) % 1) * n
  const i = Math.floor(t)
  return lerp(radii[i % n] ?? 1, radii[(i + 1) % n] ?? 1, t - i)
}

/**
 * Superellipse : |x/sx|^n + |y/sy|^n = 1.
 * n = 2 donne une ellipse, n ~ 4 le squircle du personnalisateur.
 */
export function superellipseProfile(n: number, sx = 1, sy = 1): number[] {
  return ANGLES.map((_, i) => {
    const c = Math.abs((COS[i] ?? 0) / sx) ** n
    const s = Math.abs((SIN[i] ?? 0) / sy) ** n
    return (c + s) ** (-1 / n)
  })
}

/**
 * Profil radial de l'UNION de disques : r(theta) = la plus lointaine des
 * intersections rayon/cercle. Exact tant que l'origine est dans l'union — c'est
 * ce qui donne les bosses du nuage sans booleen de path.
 */
export function unionOfCirclesProfile(circles: Array<{ x: number; y: number; r: number }>): number[] {
  const out = new Array<number>(PROFILE_SAMPLES).fill(0)
  for (let i = 0; i < PROFILE_SAMPLES; i++) {
    const dx = COS[i] ?? 0
    const dy = SIN[i] ?? 0
    let best = 0
    for (const c of circles) {
      const b = dx * c.x + dy * c.y
      const disc = b * b - (c.x * c.x + c.y * c.y - c.r * c.r)
      if (disc < 0) continue
      const t = b + Math.sqrt(disc)
      if (t > best) best = t
    }
    out[i] = best
  }
  return out
}

/**
 * Polygone a coins arrondis, par somme de Minkowski avec un disque : chaque
 * arete est poussee de `rc` vers l'exterieur, chaque sommet devient un arc de
 * rayon `rc`. Les sommets sont donc a poser au rayon voulu MOINS rc.
 * Attend un polygone en sens horaire (repere ecran, y vers le bas).
 */
export function roundedPolygon(verts: Point[], rc: number, arcSteps = 10): Point[] {
  const n = verts.length
  const out: Point[] = []
  const normal = (a: Point, b: Point) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    // sens horaire + y vers le bas : la normale sortante est (dy, -dx)
    return Math.atan2(-dx / len, dy / len)
  }
  for (let i = 0; i < n; i++) {
    const prev = verts[(i - 1 + n) % n]!
    const cur = verts[i]!
    const next = verts[(i + 1) % n]!
    const a0 = normal(prev, cur)
    const a1 = normal(cur, next)
    let d = a1 - a0
    while (d > Math.PI) d -= TAU
    while (d < -Math.PI) d += TAU
    for (let k = 0; k <= arcSteps; k++) {
      const a = a0 + (d * k) / arcSteps
      out.push({ x: cur.x + Math.cos(a) * rc, y: cur.y + Math.sin(a) * rc })
    }
  }
  return out
}

/** Polygone regulier a coins arrondis, inscrit dans `radius`. */
export function regularPolygonProfile(
  sides: number,
  radius: number,
  rc: number,
  rotationDeg = 0
): number[] {
  const rot = (rotationDeg * Math.PI) / 180
  const verts = Array.from({ length: sides }, (_, i) => {
    // sens horaire a l'ecran : theta croissant avec y vers le bas
    const a = rot + (i / sides) * TAU
    return { x: Math.cos(a) * (radius - rc), y: Math.sin(a) * (radius - rc) }
  })
  return profileFromPolygon(roundedPolygon(verts, rc), 0, 0)
}

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
export function starProfile(
  points: number,
  rOuter: number,
  rInner: number,
  rc: number,
  rotationDeg = 0
): number[] {
  const rot = (rotationDeg * Math.PI) / 180
  const n = points * 2
  const verts = Array.from({ length: n }, (_, i) => {
    // sens horaire a l'ecran, comme regularPolygonProfile
    const a = rot + (i / n) * TAU
    const r = (i % 2 === 0 ? rOuter : rInner) - rc
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  })
  return profileFromPolygon(roundedPolygon(verts, rc), 0, 0)
}

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
export function resampleOutline(poly: Point[], samples = PROFILE_SAMPLES): Point[] {
  // sens horaire ecran = aire signee positive avec y vers le bas
  let aire = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    aire += a.x * b.y - b.x * a.y
  }
  const src = aire < 0 ? [...poly].reverse() : poly

  const n = src.length
  const long: number[] = []
  let total = 0
  for (let i = 0; i < n; i++) {
    const a = src[i]!
    const b = src[(i + 1) % n]!
    total += Math.hypot(b.x - a.x, b.y - a.y)
    long.push(total)
  }

  const out: Point[] = []
  let seg = 0
  for (let k = 0; k < samples; k++) {
    const cible = (k / samples) * total
    while (seg < n - 1 && long[seg]! < cible) seg++
    const avant = seg === 0 ? 0 : long[seg - 1]!
    const a = src[seg]!
    const b = src[(seg + 1) % n]!
    const d = long[seg]! - avant
    const u = d > 0 ? (cible - avant) / d : 0
    out.push({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) })
  }

  // origine ramenee au point le plus proche de la direction +x
  let best = 0
  let bestA = Infinity
  for (let i = 0; i < out.length; i++) {
    const p = out[i]!
    const ang = Math.abs(Math.atan2(p.y, p.x))
    if (ang < bestA) {
      bestA = ang
      best = i
    }
  }
  return [...out.slice(best), ...out.slice(0, best)]
}

/** Rayon maximal d'un contour direct : l'equivalent de `Math.max(...radii)`. */
export const rayonMax = (pts: Point[]) => Math.max(...pts.map((p) => Math.hypot(p.x, p.y)))

/** Polyligne fermee exacte : garde les segments droits (contrairement a closedPath). */
export function polyPath(pts: Point[], scale = 1): string {
  if (pts.length < 3) return ''
  let d = ''
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!
    d += `${i === 0 ? 'M' : 'L'}${r2(p.x * scale)} ${r2(p.y * scale)}`
  }
  return `${d}Z`
}

/** Capsule (stade) centree sur l'origine : la forme exacte des yeux du bot. */
export function capsulePath(w: number, h: number): string {
  const hw = Math.max(w, 0.01) / 2
  const hh = Math.max(h, 0.01) / 2
  const r = Math.min(hw, hh)
  return (
    `M${r2(-hw)} ${r2(-hh + r)}` +
    `A${r2(r)} ${r2(r)} 0 0 1 ${r2(-hw + r)} ${r2(-hh)}` +
    `L${r2(hw - r)} ${r2(-hh)}` +
    `A${r2(r)} ${r2(r)} 0 0 1 ${r2(hw)} ${r2(-hh + r)}` +
    `L${r2(hw)} ${r2(hh - r)}` +
    `A${r2(r)} ${r2(r)} 0 0 1 ${r2(hw - r)} ${r2(hh)}` +
    `L${r2(-hw + r)} ${r2(hh)}` +
    `A${r2(r)} ${r2(r)} 0 0 1 ${r2(-hw)} ${r2(hh - r)}Z`
  )
}
