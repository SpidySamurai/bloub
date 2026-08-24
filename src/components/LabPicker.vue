<script setup lang="ts">
import BloubBot from '@/components/BloubBot.vue'
import BotTile from '@/components/BotTile.vue'
import { EXPRESSIONS } from 'bloub-core/expressions'
import { LAB_SHAPES, formeLabOuDefaut } from 'bloub-core/lab'
import { COLORS, SHAPE_BY_ID } from 'bloub-core/skins'
import { t } from '@/i18n'
import { computed, ref, watch } from 'vue'

/**
 * Le choix de verrerie : la meme grille que le personnalisateur, restreinte aux quatre
 * pieces de `LAB_SHAPES`.
 *
 * Ce composant ne depend QUE de `src/bot/` et de la couche i18n — pas de l'etat de
 * l'application, pas du montage, pas de la timeline. C'est deliberé : il doit pouvoir etre
 * emporte tel quel dans un autre projet avec le dossier `bot/`, et n'y demander qu'un
 * `t()`.
 */
const shape = defineModel<string>('shape', { required: true })
const color = defineModel<string>('color', { required: true })
const expression = defineModel<string>('expression', { required: true })

/** Les vignettes sont figees a la meme date que la pose de repos. */
const PREVIEW_AT = 1

/**
 * La forme courante ramenee dans le sous-ensemble.
 *
 * L'etat est partage avec le personnalisateur, qui propose douze formes : arriver ici avec
 * un `squircle` laisserait les quatre cases eteintes et le panneau sans reponse a « laquelle
 * est active ». On corrige la valeur au lieu de l'afficher, une seule fois a l'entree.
 */
watch(
  shape,
  (v) => {
    const dans = formeLabOuDefaut(v)
    if (dans !== v) shape.value = dans
  },
  { immediate: true }
)

const piece = computed(() => SHAPE_BY_ID.get(shape.value))

/**
 * Comment cette piece porte son visage, et pourquoi.
 *
 * Affiche parce que c'est la seule chose qui distingue vraiment les quatre au moment de
 * choisir : la silhouette se voit, le compromis non. Les trois cles correspondent aux trois
 * mecanismes de `BotShape` — il n'y en a pas d'autre a montrer.
 */
type Mecanisme = 'plain' | 'anchored' | 'posed'

const mecanisme = computed<{ cle: Mecanisme; code: string } | null>(() => {
  const f = piece.value
  if (!f) return null
  if (f.yeuxPoses) return { cle: 'posed', code: 'yeuxPoses' }
  if (f.ancreVisage) return { cle: 'anchored', code: 'ancreVisage' }
  return { cle: 'plain', code: '—' }
})

/**
 * Taille d'affichage reelle, reglable.
 *
 * Un declencheur de menu fait 40 px, pas 240 : c'est la que se decide si une silhouette
 * tient, et une maquette qui ne montre que la grande version ne repond pas a la question.
 *
 * Un CURSEUR et non deux tailles figees : ce qu'on cherche est le seuil ou la piece cesse
 * de se lire, et un seuil ne se trouve pas en regardant deux points. Les bornes encadrent
 * l'usage — 16 px est une puce de liste, 72 px un bouton deja genereux.
 */
const TAILLE_MIN = 16
const TAILLE_MAX = 72
const taille = ref(40)

/** Reperes annotes sous la piste : les deux tailles qu'un declencheur prend vraiment. */
const REPERES = [24, 40] as const
</script>

<template>
  <div>
    <h2 class="text-sm font-semibold">{{ t('lab.shape') }}</h2>
    <div class="mt-2 grid grid-cols-4 gap-1.5">
      <BotTile
        v-for="f in LAB_SHAPES"
        :key="f.id"
        :label="t(`shapes.${f.id}`)"
        :selected="f.id === shape"
        :shape="f.id"
        :color="color"
        :expression="expression"
        :frozen-at="PREVIEW_AT"
        @click="shape = f.id"
      />
    </div>

    <h2 class="mt-5 text-sm font-semibold">{{ t('lab.expression') }}</h2>
    <div class="mt-2 grid grid-cols-4 gap-1.5">
      <BotTile
        v-for="e in EXPRESSIONS"
        :key="e.id"
        :label="t(`expressions.${e.id}`)"
        :selected="e.id === expression"
        :shape="shape"
        :color="color"
        :expression="e.id"
        :frozen-at="PREVIEW_AT"
        @click="expression = e.id"
      />
    </div>

    <h2 class="mt-5 text-sm font-semibold">{{ t('lab.color') }}</h2>
    <div class="mt-2 grid grid-cols-6 gap-1.5">
      <button
        v-for="c in COLORS"
        :key="c.id"
        type="button"
        class="flex aspect-square cursor-pointer items-center justify-center rounded-full border-2 transition"
        :class="
          c.id === color ? 'border-[var(--ink)]' : 'border-transparent hover:border-[var(--line)]'
        "
        :aria-label="t(`colors.${c.id}`)"
        :aria-pressed="c.id === color"
        @click="color = c.id"
      >
        <!-- liseré interne : sinon la pastille creme disparait sur fond clair -->
        <span
          class="block h-[78%] w-[78%] rounded-full ring-1 ring-black/10 ring-inset"
          :style="{ background: c.hex }"
        />
      </button>
    </div>

    <!--
      Taille reelle, et non une vignette de plus.

      Les grilles ci-dessus montrent la silhouette a 60 px, ou tout tient. Le declencheur
      d'un menu en fait 40, parfois 24 : c'est la que l'eprouvette perd ses yeux et que la
      fiole devient un triangle. Le panneau doit poser la question avant l'integration, pas
      apres.
    -->
    <h2 class="mt-5 flex items-baseline justify-between gap-2 text-sm font-semibold">
      {{ t('lab.real') }}
      <span class="font-mono text-xs font-normal text-[var(--muted)]">
        {{ t('lab.px', { n: taille }) }}
      </span>
    </h2>
    <div class="mt-2 rounded-xl bg-black/[0.03] px-3 py-3">
      <!--
        La piece est centree dans une boite de la HAUTEUR MAXIMALE, pas ajustee a elle :
        sans cela le panneau entier se decale a chaque cran du curseur, et l'oeil ne peut
        plus comparer deux tailles voisines.
      -->
      <div
        class="flex items-center justify-center"
        :style="{ height: `${TAILLE_MAX}px` }"
      >
        <BloubBot
          :size="taille"
          :shape="shape"
          :color="color"
          :expression="expression"
          :frozen-at="PREVIEW_AT"
        />
      </div>
      <label class="mt-2 block">
        <span class="sr-only">{{ t('lab.size') }}</span>
        <input
          v-model.number="taille"
          type="range"
          :min="TAILLE_MIN"
          :max="TAILLE_MAX"
          step="1"
          class="w-full cursor-pointer accent-[var(--ink)]"
        />
      </label>
      <div class="flex gap-1.5">
        <button
          v-for="px in REPERES"
          :key="px"
          type="button"
          class="cursor-pointer rounded-md px-2 py-0.5 font-mono text-[11px] transition"
          :class="
            taille === px
              ? 'bg-[var(--ink)] text-[var(--paper)]'
              : 'text-[var(--muted)] hover:bg-black/5'
          "
          @click="taille = px"
        >
          {{ t('lab.px', { n: px }) }}
        </button>
      </div>
    </div>

    <dl
      v-if="mecanisme"
      class="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-t border-[var(--line)] pt-3 text-xs"
    >
      <dt class="text-[var(--muted)]">{{ t('lab.eyes') }}</dt>
      <dd>{{ t(`lab.eyes_${mecanisme.cle}` as const) }}</dd>
      <dt class="text-[var(--muted)]">{{ t('lab.exception') }}</dt>
      <dd class="font-mono">{{ mecanisme.code }}</dd>
    </dl>
    <p class="mt-2 text-xs leading-relaxed text-[var(--muted)]">
      {{ t(`lab.why_${mecanisme?.cle ?? 'plain'}` as const) }}
    </p>
  </div>
</template>
