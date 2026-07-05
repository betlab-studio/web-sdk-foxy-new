# No Mercy at Down - Plan d'Implémentation

> Ce document sert de guide pour transformer le projet cactus-cash en no-mercy-at-down.
> Il peut être réutilisé comme template pour d'autres projets de slot.

> ⚠️ **DOCUMENT VIVANT — en constante évolution.** À **chaque imprécision rencontrée** ou **nouvel élément important** découvert pendant la construction (général, réutilisable pour tous les projets), **l'ajouter ou mettre à jour ici**. Garder le contenu généraliste (pas de specifics propres à un seul jeu — ceux-là vont dans le `CLAUDE.md` du projet concerné).

---

## 📋 TABLE DES MATIÈRES

### Règles & Références Critiques
- [⚠️ RÈGLE CRITIQUE - À SUIVRE POUR CHAQUE PHASE](#️-règle-critique---à-suivre-pour-chaque-phase)
- [⚠️ SOURCE DE VÉRITÉ - MOTEUR MATH (rgs/config.ts)](#️-source-de-vérité---moteur-math-rgsconfigts)
- [⚠️ BOOTSTRAP D'UN NOUVEAU PROJET DEPUIS UN APP EXISTANT](#️-bootstrap-dun-nouveau-projet-depuis-un-app-existant)
- [⚠️ DÉTECTION DES TYPES D'AFFICHAGE (LAYOUT)](#️-détection-des-types-daffichage-layout)
- [⚠️ RESPONSIVE LAYOUT - POSITIONNEMENT D'ÉLÉMENTS](#️-responsive-layout---positionnement-déléments-sur-lécran)
- [⚠️ BOOK EVENTS - Documentation](#️-book-events---documentation)
- [⚠️ SCALE DES ASSETS SPINE](#️-scale-des-assets-spine)
- [⚠️ FORMAT DES PATHS DANS ASSETS.TS](#️-format-des-paths-dans-assetsts-critique)
- [⚠️ SHARED ATLAS POUR ANIMATIONS SPINE](#️-shared-atlas-pour-animations-spine)
- [⚠️ SPINE TRACKS - ANIMATIONS MULTI-COUCHES](#️-spine-tracks---animations-multi-couches)
- [⚠️ TIMESCALE - DÉLAIS ET VITESSE D'ANIMATION](#️-timescale---délais-et-vitesse-danimation)
- [⚠️ POSITIONNEMENT DES ÉLÉMENTS SUR LA GRILLE](#️-positionnement-des-éléments-sur-la-grille-de-symboles)
- [⚠️ QUESTIONS CRITIQUES À POSER POUR CHAQUE NOUVEAU PROJET](#️-questions-critiques-à-poser-pour-chaque-nouveau-projet)
- [⚠️ SOCIAL MODE - MOTS INTERDITS](#️-social-mode---mots-interdits-critique)
- [⚠️ TURBO MODE - LIFECYCLE DU SKIP ET TRANSITION BONUS](#️-turbo-mode---lifecycle-du-skip-et-transition-bonus)
- [⚠️ SKIP MECHANICS - STOP / WIN GROUPS / DUELS](#️-skip-mechanics---stop--win-groups--duels)
- [⚠️ SVELTE $EFFECT ET DÉPENDANCES RÉACTIVES](#️-svelte-effect-et-dépendances-réactives)

### Phases d'Implémentation
- [Résumé du Jeu](#résumé-du-jeu)
- [Phase 1 - Configuration de Base](#phase-1---configuration-de-base)
- [Phase 2 - Assets](#phase-2---assets)
- [Phase 3 - Event Handlers](#phase-3---event-handlers)
- [Phase 4 - Composants UI](#phase-4---composants-ui)
- [Phase 5 - Features Spécifiques](#phase-5---features-spécifiques)
- [Phase 6 - Polish](#phase-6---polish)

### Features Documentées
- [Paylines (Lignes Gagnantes)](#paylines-lignes-gagnantes) - Animation des lignes
- [⚠️ BONUS INTRO/OUTRO ET WIN TEXTS](#️-bonus-introoutro-et-win-texts) - Écrans bonus
- [⚠️ WIN AMOUNTS - AFFICHAGE DES MONTANTS](#️-win-amounts---affichage-des-montants-sur-le-board) - Montants sur le board
- [⚠️ DIMMING DES SYMBOLES](#️-dimming-des-symboles---obscurcissement-avec-fade) - Obscurcissement avec fade
- [⚠️ TRANSITION BONUS - ANIMATION DU BOARD](#️-transition-bonus---animation-du-board-optionnel) - Animation board (optionnel)
- [⚠️ REPLAY MODE](#️-replay-mode---lecture-dun-bet-enregistré) - Lecture d'un bet enregistré

### Documents Liés
- `BACKEND_EVENTS_SPEC.md` - Documentation complète des events backend
- `BUG_LINENUMBER_BOUNTY.md` - Bug connu: lineNumber manquant en mode Bounty

---

## ⚠️ RÈGLE CRITIQUE - À SUIVRE POUR CHAQUE PHASE

> **AVANT de commencer une phase ou d'écrire du code:**
> 1. **DEMANDER** quels assets/fichiers utiliser pour cette phase
> 2. **LISTER** les fichiers existants dans le dossier concerné (`ls -R`)
> 3. **CONFIRMER** avec l'utilisateur avant d'écrire le code
>
> **NE JAMAIS** supposer quels assets existent ou comment ils doivent être utilisés.
> Chaque jeu a ses propres conventions et nommages.

---

## ⚠️ SOURCE DE VÉRITÉ - MOTEUR MATH (rgs/config.ts)

> **AVANT de remplir `src/game/rgs/config.ts` (Phase 1), TROUVER et LIRE le projet moteur math du jeu.**
>
> Chaque jeu front a un projet math jumeau (sibling) nommé `<jeu>-math` (ex: `no-mercy-at-dawn-math`, `royale-cake-math`), situé à côté du monorepo web-sdk (ex: `stake_engine_projects/<jeu>-math`).
>
> **`rgs/config.ts` du front DOIT être un miroir de la config du moteur.** Sinon le play RGS en live ET le replay cassent : les clés de mode et ids de symboles doivent matcher **exactement**.

Fichiers du moteur à lire et leur correspondance front :

| Fichier moteur | Contenu | → Front (`rgs/config.ts`) |
|---|---|---|
| `index.ts` → `defineGameModes` | clés + coûts des bet modes | `betModes` |
| `index.ts` → `defineSymbols` | ids symboles + `pays` + `properties` | `symbols` (paytable + special_properties) |
| `index.ts` → `createSlotGame` | `maxWinX`, `scatterToFreespins` | maxWin, triggers FS |
| `src/paylines.ts` | les paylines | `paylines` |
| `src/reels.ts` | poids symboles par reel set | (info ; padding front = visuel seulement) |
| `src/onHandleGameFlow.ts` | book events émis | types + handlers (Phase 3) |

> **Identifiants couplés au moteur — NE JAMAIS deviner, toujours copier du moteur** : clés de bet mode (envoyées à RGS), ids de symboles, `special_properties`.

### Bet mode plumbing (général)

- `config.betModes` keys = chaînes de mode envoyées au RGS → **doivent matcher les `gameModes` du moteur** (souvent lowercase : `base`, `ante`, `bonus1`…).
- `BetMode = keyof typeof config.betModes` (`types.ts`).
- `betModeMeta` (`config/betModeMeta.ts`) = métadonnées UI. Lookup via `stateMeta.betModeMeta[key.toUpperCase()] ?? [key.toLowerCase()]` (`state-shared/stateBet.svelte.ts`) → **tolère la casse**. Le champ `mode` de chaque entrée = la clé moteur.
- ⚠️ Garder identiques : `config.betModes` keys, les `mode` de `betModeMeta`, et la clé envoyée à RGS.

### paddingReels (général)

- `config.paddingReels` keyed par gameType (`GameType = keyof typeof config.paddingReels`, ex: `basegame`/`freegame`).
- = **filler visuel pendant le spin** (board-reveal `paddingPositions` indexe dedans), PAS un résultat. Le vrai board vient des book events.
- Peut être remplacé par des strips compacts (assez de symboles pour couvrir les indices `paddingPositions`). N'utiliser que des symboles présents dans `config.symbols`.

---

## ⚠️ BOOTSTRAP D'UN NOUVEAU PROJET DEPUIS UN APP EXISTANT

> Méthode pour démarrer un nouveau jeu front à partir d'un app fonctionnel du monorepo (code de base).

1. **Copier** l'app source → `apps/<nouveau>`, en **excluant** : `.git`, `.svelte-kit`, `.turbo`, `build`, `node_modules` (+ gros `.md` dupliqués si besoin). Préserver les docs déjà présents dans le dossier cible.
2. **Renommer** dans `package.json` : `name` + port `dev` (chaque app a un port unique — éviter la collision).
3. `pnpm install` à la **racine du monorepo** (le workspace `apps/*` inclut auto le nouveau dossier).
4. `pnpm dev` et vérifier le boot (HTTP 200) avant d'adapter quoi que ce soit.

### Dépendances workspace + updates SDK

- Les deps de l'app sont `workspace:*` → elles **suivent automatiquement** les packages SDK (`packages/*`). Une mise à jour SDK ne nécessite **pas** de toucher le `package.json` de l'app, juste `pnpm install`.
- Le runtime **Spine** vit dans `packages/pixi-svelte` (`@esotericsoftware/spine-*`), pas dans l'app. Consommé via `pixi-svelte: workspace:*`. → Une "nouvelle version de Spine dans le SDK" ne change rien côté app.

### Dev = pas de type-check

- Le dev server (esbuild) **ne type-check pas**. On peut changer la couche config (unions `SymbolName`/`BetMode`) et booter même si des composants features réfèrent encore d'anciens symboles/modes — ces erreurs n'apparaissent qu'au `build`/`lint`. → **Adapter la config d'abord, nettoyer les features ensuite.**

---

## ⚠️ DÉTECTION DES TYPES D'AFFICHAGE (LAYOUT)

> **Le système de layout détecte automatiquement 4 modes d'affichage.**
> Il est important de comprendre comment chaque mode est détecté pour adapter les composants.

### Types de Layout

| Layout | Détection | Cas d'usage |
|--------|-----------|-------------|
| `desktop` | Écran large, ratio > 1.3, grande taille | PC, grand écran |
| `portrait` | Ratio < 0.8 (plus haut que large) | Mobile vertical |
| `landscape` | Ratio > 1.3 + petite taille (< 480px) | **Popout windows** (400x225, 800x450) |
| `tablet` | Ratio entre 0.8 et 1.3 (presque carré) | Tablette, fenêtre carrée |

### Comment détecter dans les composants

```typescript
const context = getContext();

// Récupérer le type de layout
const layoutType = $derived(context.stateLayoutDerived.layoutType());
// Retourne: 'desktop' | 'portrait' | 'tablet' | 'landscape'

// Détections spécifiques
const isPortrait = $derived(layoutType === 'portrait');   // Mobile vertical
const isPopout = $derived(layoutType === 'landscape');    // Popout windows
const isTablet = $derived(layoutType === 'tablet');       // Tablette/carré

// Ancien helper (inclut portrait ET tablet)
const isMobile = $derived(context.stateLayoutDerived.isStacked());
```

### ⚠️ Attention: `isStacked()` vs détection précise

- `isStacked()` retourne `true` pour **portrait ET tablet**
- Pour distinguer portrait/tablet/popout, utiliser `layoutType()` directement

### Breakpoints de détection

```typescript
// Ratio (width / height)
const RATIO_WIDE = 1.3;    // Au-dessus = longWidth (desktop ou landscape)
const RATIO_TALL = 0.8;    // En-dessous = longHeight (portrait)
                           // Entre les deux = almostSquare (tablet)

// Taille (plus petite dimension)
const SIZE_MOBILE = 480;   // En-dessous = mobile/smallMobile → landscape
```

---

## ⚠️ RESPONSIVE LAYOUT - POSITIONNEMENT D'ÉLÉMENTS SUR L'ÉCRAN

> **Pattern pour positionner et scaler des éléments de manière responsive.**
> Ce pattern s'adapte automatiquement à toutes les résolutions (desktop, mobile, popout S/L).

### Principe

1. **Définir une largeur de référence** (ex: 1200px pour desktop)
2. **Calculer un scale factor** basé sur la taille réelle du canvas
3. **Multiplier toutes les valeurs** (positions, tailles de police, scales) par ce factor
4. **Ajustements mobile** si nécessaire (multiplicateur de scale, offset Y)

### ⚠️ IMPORTANT: `canvasSizes` vs `mainLayout`

| Propriété | Usage | Quand utiliser |
|-----------|-------|----------------|
| `canvasSizes()` | Taille réelle du canvas en pixels | **Centrage et scaling** (change avec popout S/L) |
| `mainLayout()` | Zone de jeu "virtuelle" | Positionnement relatif au board |

**Toujours utiliser `canvasSizes()` pour le responsive scaling!**

### Template de code

```typescript
// ===========================================
// === RESPONSIVE LAYOUT CONFIG
// ===========================================
// Largeur de référence (toutes les valeurs BASE sont conçues pour cette largeur)
const REFERENCE_WIDTH = 1200;

// Valeurs de base (conçues à REFERENCE_WIDTH = 1200px)
const BASE_SPINE_SCALE = 0.3;
const BASE_OFFSET_Y = -50;
const BASE_TITLE_FONT_SIZE = 42;
const BASE_TITLE_Y = -20;
const BASE_DESC_FONT_SIZE = 20;
const BASE_DESC_Y = 55;
const BASE_MAX_WIDTH = 400;

// Ajustements mobile
const MOBILE_SCALE_MULTIPLIER = 2.5;  // Les éléments sont trop petits sur mobile sinon
const MOBILE_OFFSET_Y = -100;          // Décalage vertical sur mobile

// ===========================================
// === LAYOUT CALCULATION
// ===========================================
const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());
const isMobile = $derived(context.stateLayoutDerived.isStacked());

// Objet layout avec scale responsive
const layout = $derived.by(() => {
    // Scale factor basé sur la largeur réelle du canvas
    let scale = canvasSizes.width / REFERENCE_WIDTH;

    // Boost du scale sur mobile
    if (isMobile) {
        scale *= MOBILE_SCALE_MULTIPLIER;
    }

    return {
        x: canvasSizes.width * 0.5,   // Centre X
        y: canvasSizes.height * 0.5 + (isMobile ? MOBILE_OFFSET_Y : 0),  // Centre Y + offset mobile
        scale,
    };
});

// Raccourci pour le scale factor
const s = $derived(layout.scale);

// ===========================================
// === SCALED VALUES (base * scale)
// ===========================================
const spineScale = $derived(BASE_SPINE_SCALE * s);
const offsetY = $derived(BASE_OFFSET_Y * s);
const titleFontSize = $derived(Math.round(BASE_TITLE_FONT_SIZE * s));
const titleY = $derived(BASE_TITLE_Y * s);
const descFontSize = $derived(Math.round(BASE_DESC_FONT_SIZE * s));
const descY = $derived(BASE_DESC_Y * s);
const maxWidth = $derived(BASE_MAX_WIDTH * s);
```

### ⚠️ STRUCTURE CRITIQUE - Container Parent + SpineProvider + Enfants

**RÈGLE FONDAMENTALE:** Le SpineProvider applique son `scale` à TOUS ses enfants. Pour éviter que les autres éléments (textes, montants, sprites) héritent du scale du spine:

1. **Container parent** : Gère le positionnement global (`x`, `y`)
2. **SpineProvider** : À l'intérieur du Container, **SANS position x/y**, uniquement `scale`
3. **Autres éléments** : Au **MÊME NIVEAU** que le SpineProvider (pas à l'intérieur!)

```svelte
<!-- ✅ CORRECT : Enfants au même niveau que SpineProvider -->
<Container x={layout.x} y={layout.y + spineOffsetY}>
    <!-- Spine animation (pas de position, juste scale) -->
    <SpineProvider key="mySpine" scale={spineScale}>
        <SpineTrack trackIndex={0} animationName="idle" loop={true} />
    </SpineProvider>

    <!-- Texte/montant AU MÊME NIVEAU que SpineProvider -->
    <Container y={amountY}>
        <WinAmountSprites amount={formattedAmount} scale={amountScale} />
    </Container>
</Container>
```

```svelte
<!-- ❌ INCORRECT : Enfants À L'INTÉRIEUR du SpineProvider -->
<SpineProvider key="mySpine" scale={spineScale} x={layout.x} y={layout.y}>
    <SpineTrack trackIndex={0} animationName="idle" loop={true} />

    <!-- ❌ Ce Container hérite du scale du spine! -->
    <Container y={amountY}>
        <WinAmountSprites amount={formattedAmount} scale={amountScale} />
    </Container>
</SpineProvider>
```

**Pourquoi c'est important:**
- Le SpineProvider est un Container PixiJS qui applique `scale` à tous ses enfants
- Si on met un élément à `y={200}` dans un SpineProvider avec `scale={0.3}`, il sera effectivement à `y={60}`
- En mettant les éléments au même niveau que le SpineProvider, ils partagent le système de coordonnées du Container parent sans être affectés par le scale du spine

**Référence:** Voir `FreeSpinOutro.svelte` pour un exemple complet.

### Comportement du scaling

| Résolution | Scale Factor | Exemple (font 42px) |
|------------|--------------|---------------------|
| Desktop 1200px | 1.0 | 42px |
| Desktop 1920px | 1.6 | 67px |
| Popout L 800px | 0.67 | 28px |
| Popout S 400px | 0.33 | 14px |
| Mobile 375px | 0.31 × 2.5 = 0.78 | 33px |

### Positionnement en pourcentage (bords de l'écran)

Pour les éléments qui doivent être positionnés par rapport aux bords de l'écran (ex: "Click to continue" en bas), utiliser des **pourcentages** au lieu de valeurs fixes:

```typescript
// Click to continue sprite (positioned from bottom of screen)
const BASE_CLICK_SCALE = 0.4;
const BASE_CLICK_BOTTOM_PERCENT = 0.1; // 10% from bottom of screen

// Mobile adjustments
const MOBILE_CLICK_SCALE = 1;
const MOBILE_CLICK_BOTTOM_PERCENT = 0.08; // 8% from bottom on mobile

// Calcul responsive
const baseScale = $derived(canvasSizes.width / REFERENCE_WIDTH);
const clickScale = $derived((isMobile ? MOBILE_CLICK_SCALE : BASE_CLICK_SCALE) * baseScale);
const clickBottomPercent = $derived(isMobile ? MOBILE_CLICK_BOTTOM_PERCENT : BASE_CLICK_BOTTOM_PERCENT);
const clickY = $derived(canvasSizes.height * (1 - clickBottomPercent));
```

```svelte
<Sprite
    key="pressContinue"
    x={canvasSizes.width * 0.5}
    y={clickY}
    anchor={0.5}
    scale={clickScale}
/>
```

**Avantages:**
- S'adapte automatiquement à toutes les résolutions (popout S, L, desktop, mobile)
- Pas besoin de valeurs spécifiques par type d'écran
- Position proportionnelle à la taille de l'écran

### ⚠️ Le `layoutType` "desktop" couvre PLUSIEURS ratios → mode "wideDesktop" (plein écran + barre navigateur)

> **Piège réel.** Un même `layoutType` (ex. `desktop`) couvre **plusieurs ratios** d'écran. Le `mainLayout` desktop est figé à **1920×1080** et le jeu est cadré par `scale = min(cw/1920, ch/1080)`. Si le ratio n'est **pas** 16:9, le jeu est **letterboxé** : il rétrécit selon la dimension limitante et est centré.

**Cas concret** : plein écran **avec la barre du navigateur** (Chrome) → canvas **1920×911** (pas 1080), ratio **2.11**. Toujours `layoutType = desktop`, mais le jeu se cadre par la **hauteur** → `scale = 911/1080 = 0.843`, le board rétrécit ~16% et est centré horizontalement. Les valeurs de placement calibrées pour 1920×1080 ne collent plus.

**Détecter ce sous-mode** (desktop plus large que 16:9 = hauteur réduite) :
```typescript
const canvasRatio = $derived(context.stateLayoutDerived.canvasRatio());
const isWideDesktop = $derived(layoutType === 'desktop' && canvasRatio > 16 / 9 + 0.02); // ε garde 1080 exact en "desktop"
```

**Deux familles d'éléments, deux traitements** :

**A. Élément collé au board (full asset : mascotte, badge sur la grille…)** → **espace board** (`mainLayout`, dans un `<MainContainer>`). Il scale/bouge avec le board à tous les ratios automatiquement. Ajouter une **branche `wideDesktop`** seulement si on veut affiner son placement quand l'écran est court. Réf : `Character.svelte`.

> ⚠️ **Exception MOBILE (portrait) pour un élément board placé HORS de la grille** (mascotte sur le côté/au-dessus). En portrait le board est cadré sur la **largeur** (`scale = cw/1080`), donc l'espace board virtuel (1920 de haut) **déborde verticalement** : sur un tél **plus court**, le bas (ou le haut) du virtuel est hors écran → un élément board-space calibré pour le grand tél **sort de l'écran** sur les plus petits. Fix : sur mobile **uniquement**, basculer cet élément en **espace écran** — `scale ∝ canvas.height`, position en **% du canvas** → il tient toujours, quel que soit le tél. Conséquence : son `<MainContainer>` est retiré en mobile (il rend en coords canvas) et un mount conditionnel sépare mobile (sans MainContainer) / desktop (avec). Réf : `Character.svelte` (branche `isMobile`).

**B. Décor collé au BORD écran, surtout si l'asset est un CROP PARTIEL (rock de coin, cadre…)** → **espace écran** (`canvasSizes`), ancré au vrai coin. Un asset partiel **ne doit PAS** aller en espace board (le letterbox le rentrerait à l'intérieur, révélant le bord du crop) ni être scalé par un simple `canvas.width/REFERENCE_WIDTH`. Donner **un jeu de valeurs `{scale, margins}` PAR mode** (desktop / wideDesktop / popout), calibrés indépendamment. Réf : `Rock.svelte`.

```typescript
// B — décor de coin, partiel : espace écran + valeurs par mode
const MODE = $derived.by(() => {
    if (isPopout)      return { scale: 0.5,  right: -0.05, bottom: -0.05 };
    if (isWideDesktop) return { scale: 0.6,  right:  0.0,  bottom: -0.15 }; // 1920x911 (barre navigateur)
    return                    { scale: 0.6,  right: -0.04, bottom: -0.07 }; // 1920x1080
});
const x = $derived(canvas.width  * (1 - MODE.right));   // ancré au VRAI coin écran
const y = $derived(canvas.height * (1 - MODE.bottom));
const scale = $derived(MODE.scale * (canvas.width / 1920)); // facteur=1 aux cibles 1920-larges → MODE.scale = scale visible
```

> **Pourquoi pas un fit-scale unique (`mainLayout().scale`) pour tout ?** Ça marche pour un élément qui doit rester proportionnel au board, mais **pas** pour un crop partiel qui doit toucher le vrai bord écran : sa position ET sa taille diffèrent réellement entre 1080 et 911, pas seulement d'un facteur. D'où **un mode par ratio**, calibré à la main.

### Exemple complet

Voir `src/components/freespin/FreeSpinAnimation.svelte` pour une implémentation complète.

---

## ⚠️ BOOK EVENTS - Documentation

> **📄 Voir `BACKEND_EVENTS_SPEC.md` pour la documentation complète des events.**
>
> Ce fichier contient:
> - Structure TypeScript de chaque event
> - Flux détaillés (base game, free spins, bounty mode)
> - Logique backend (anticipation, paddingPositions)
> - Checklist de validation

**Fichiers à modifier pour les events:**
- `src/game/types/typesBookEvent.ts` - Définition des types
- `src/game/handlers/bookEventHandlerMap.ts` - Handlers pour chaque event

### Migration des event types (ancien → nouveau format RGS)

Ce projet a migré d'un ancien format d'events vers un nouveau format. Voici le mapping complet :

| Ancien event (supprimé) | Nouvel event (actif) | Rôle |
|------------------------|---------------------|------|
| `freeSpinTrigger` | `fs-triggered` | Déclenche les free spins |
| `updateFreeSpin` | `update-fs-amount` | Met à jour le compteur FS |
| _(pas d'équivalent)_ | `show-fs-total-win` | Outro fin de bonus (animation + montant final) |

**⚠️ `setTotalWin` n'a PAS été migré — il est toujours envoyé par le backend :**

| Event | Statut | Rôle |
|-------|--------|------|
| `setTotalWin` | ✅ **Toujours actif** | Met à jour le HUD cumulatif à **chaque spin** en free spins |
| `show-fs-total-win` | ✅ Nouvel event | Outro de fin de bonus (une seule fois, à la fin) |

Ces deux events coexistent : `setTotalWin` = update HUD par spin, `show-fs-total-win` = animation finale.

**Ne pas supprimer `setTotalWin` !** Le backend l'envoie toujours en free spins.

### Snapshot de reprise de bonus (`createBonusSnapshot`)

Quand le joueur rafraîchit la page en cours de bonus, `createBonusSnapshot` rejoue les derniers events clés pour restaurer l'état :

```typescript
const lastFreeSpinTriggerEvent = findLastBookEvent('fs-triggered');
const lastUpdateFreeSpinEvent  = findLastBookEvent('update-fs-amount');
const lastSetTotalWinEvent     = findLastBookEvent('setTotalWin') ?? findLastBookEvent('show-fs-total-win');
const lastUpdateGlobalMultEvent = findLastBookEvent('updateGlobalMult');
```

Les types réservés pour le snapshot sont dans `BOOK_EVENT_TYPES_TO_RESERVE_FOR_SNAPSHOT` dans `utils.ts`.

---

## ⚠️ SCALE DES ASSETS SPINE

> **TOUJOURS mettre `scale: 1` dans assets.ts pour les Spine**
>
> ```typescript
> // ✅ CORRECT
> board: {
>   type: 'spine',
>   src: {
>     atlas: new URL('...', import.meta.url).href,
>     skeleton: new URL('...', import.meta.url).href,
>     scale: 1,  // TOUJOURS 1
>   },
> },
>
> // ❌ INCORRECT - ne pas faire ça
> board: {
>   type: 'spine',
>   src: { ..., scale: 2 },  // Cause des problèmes de dimensionnement
> },
> ```
>
> **Pourquoi ?**
> - Le `scale` dans assets.ts affecte la taille du skeleton au chargement
> - Un `scale: 2` double la taille, forçant à compenser avec des scales bizarres (0.5, 0.32, etc.) dans les composants
> - Avec `scale: 1`, le Spine est chargé à sa taille native et on ajuste avec `width`/`height`/`scale` dans les composants
>
> **Dimensionnement dans les composants:**
> - Utiliser `width={valeur}` ou `height={valeur}` pour adapter à une taille cible
> - Le SpineProvider calculera automatiquement le scale proportionnel

---

## ⚠️ FORMAT DES PATHS DANS ASSETS.TS (CRITIQUE)

> **TOUS les paths dans `assets.ts` doivent ABSOLUMENT utiliser le format `../../assets/*`**
>
> ```typescript
> // ✅ CORRECT
> logo: {
>   type: 'sprite',
>   src: new URL('../../assets/logo/logo.webp', import.meta.url).href,
> },
>
> // ❌ INCORRECT - NE JAMAIS FAIRE ÇA
> logo: {
>   type: 'sprite',
>   src: new URL('../../static/assets/logo/logo.webp', import.meta.url).href,  // PAS de static!
> },
> ```
>
> **Structure attendue:**
> - Le dossier `assets/` doit être à la racine de l'app (au même niveau que `src/`)
> - Les sous-dossiers contiennent les assets par catégorie (ex: `assets/export_final/`, `assets/fonts/`, `assets/audio/`)
>
> **Exemples de paths corrects:**
> - `../../assets/export_final/logo/logo.webp`
> - `../../assets/fonts/arial_rounded/Arial Rounded Bold.ttf`
> - `../../assets/audio/sounds.json`

---

## ⚠️ SHARED ATLAS POUR ANIMATIONS SPINE

> **AVANT de configurer des animations Spine, DEMANDER:**
> 1. Est-ce que certains Spines ont besoin d'injection de séquences (ex: `one_pixel` → `bande_light`) ?
> 2. Est-ce que certains Spines ont besoin d'injection de régions (ex: chiffres pour multiplicateurs) ?
>
> **Pattern d'injection de séquences (bande_light):**
> - Les animations Spine peuvent avoir des slots `one_pixel0` à `one_pixel30`
> - Ces slots doivent être remplacés par les frames `band_light_0` à `band_light_30` d'un atlas partagé
> - Utiliser `sharedAtlasManager.loadSpine({ injectSequences: ['one_pixel'] })`
>
> **Symboles nécessitant l'injection bande_light dans ce projet:**
> - H1 (ring), H2 (rock), H3 (sword), H4 (faux), H5 (axe)
> - S (scatter), VS (vs symbol)
> - W (wild) n'a PAS besoin d'injection
>
> **RÈGLE CRITIQUE - Spines avec injection vs assets.ts:**
>
> Les Spines qui ont besoin d'injection NE DOIVENT PAS être dans `assets.ts`.
> Ils doivent être chargés via des Loaders dédiés avec `SharedAtlasManager`.
>
> | Spine | Injection | Loader |
> |-------|-----------|--------|
> | Symboles (H1-H5, S, VS) | one_pixel (bande_light) | SymbolsLoader.svelte |
> | Animation VS | X2_R, X3_R... (pack_number) | VSExpandLoader.svelte |
> | Win texts | Aucune | assets.ts (OK) |
> | Anticipation | Aucune | assets.ts (OK) |
> | Bonus intro/outro | À vérifier | À déterminer |
>
> **Erreur typique si non respecté:**
> ```
> Error: Region not found in atlas: one_pixel0 (sequence: one_pixel)
> Error: Region not found in atlas: X2_R (region attachment: X2_R)
> ```
>
> **Comment vérifier si un Spine a besoin d'injection:**
> 1. Regarder le fichier `.atlas` - contient-il toutes les régions ?
> 2. Si une région manque (ex: one_pixel, X2_R), elle doit être injectée
> 3. Créer un Loader dédié qui utilise `sharedAtlasManager.loadSpine()`
>
> **Comment trouver QUELLE région injecter (sans deviner) :** scanner les skeletons `.json` pour les noms d'attachments/régions absents de l'atlas du skeleton. Ex (Node) : parcourir `skins[].attachments[slot][name]`, retenir `path||name`, comparer aux régions de l'`.atlas`. Le **nom de la cible** = ce que le runtime résout (souvent l'attachment, pas le slot ; une séquence `one_pixel` résout `one_pixel0,1,…`).

### Plusieurs sources → MÊME cible (sélection par symbole)

> **Cas :** des symboles différents veulent la même région cible (ex. tous cherchent `one_pixel`) mais depuis des **atlas sources différents** (ex. `bande_light` vs `sphere_light`).
>
> Le mapping global du manager est keyé par `targetBaseName` → deux atlas sur la même cible **collisionnent** (l'un écrase l'autre). Pour lever l'ambiguïté, `loadSpine` accepte une **source explicite par appel** :
>
> ```typescript
> // Enregistrer les 2 atlas, MÊME targetBaseName 'one_pixel'
> await sharedAtlasManager.registerSharedAtlas('bande_light',  { atlasPath, imagePath, sequences:[{ sourceBaseName:'band_light_',   targetBaseName:'one_pixel', frameCount:31 }] });
> await sharedAtlasManager.registerSharedAtlas('sphere_light', { atlasPath, imagePath, sequences:[{ sourceBaseName:'sphere_light_', targetBaseName:'one_pixel', frameCount:37 }] });
>
> // Choisir la source par symbole via { target, from }
> await sharedAtlasManager.loadSpine({ …, injectSequences:[{ target:'one_pixel', from:'sphere_light' }] }); // casque, boule_elec
> await sharedAtlasManager.loadSpine({ …, injectSequences:[{ target:'one_pixel', from:'bande_light'  }] }); // cartes, star, bonus
> ```
>
> - `injectSequences` accepte `string` (legacy : 1ʳᵉ source enregistrée pour la cible) **ou** `{ target, from }` (source pinée par nom d'atlas enregistré). Rétrocompatible.
> - Type `SequenceInjection` exporté depuis `pixi-svelte`.
> - Implémentation : `packages/pixi-svelte/src/lib/SharedAtlasManager.ts` (`findAtlasForSequence(target, fromName?)`).
>
> **⚠️ Pas que les symboles** : n'importe quel spine peut référencer `one_pixel` (perso/character, **win-text max**, effets…). Si son `.atlas` n'a pas la région → l'erreur `Region not found: one_pixel0` apparaît, et si chargé via `assets.ts` (AssetsLoader) ça **bloque `stateApp.loaded`** → stuck au loading. → charger ces spines via `SymbolsLoader`/`SharedAtlasManager` avec injection, **jamais** dans `assets.ts`.
> **Choisir band vs sphere sans deviner** : lire le **`count` de la séquence `one_pixel`** dans le skeleton `.json` (`skins[].attachments[slot].one_pixel.sequence.count`). **31 → band_light**, **37 → sphere_light**. (Space Mania : poisson=37→sphere ; max_win=31→band ; cartes L1-5/star/bonus=31→band ; casque/boule_elec=37→sphere.)

---

## ⚠️ SPINE TRACKS - ANIMATIONS MULTI-COUCHES

> **AVANT de configurer des animations Spine, DEMANDER:**
> 1. Est-ce que certaines animations utilisent plusieurs tracks (couches superposées) ?
> 2. Si oui, quels sont les noms des animations pour chaque track ?
>
> **Concept des tracks:**
> - Un Spine peut jouer plusieurs animations simultanément sur des tracks différents
> - Track 0 = couche de base, Track 1 = couche au-dessus, etc.
> - Chaque track peut avoir sa propre animation avec son propre loop/timeScale
>
> **Exemple d'utilisation:**
> ```svelte
> <SpineProvider key="monAnimation" scale={0.5} x={100} y={100}>
>   <SpineTrack trackIndex={0} animationName="background" loop={true} />
>   <SpineTrack trackIndex={1} animationName="effects" loop={true} />
> </SpineProvider>
> ```
>
> **Animations avec tracks dans ce projet:**
>
> | Animation | Track 0 | Track 1 | Notes |
> |-----------|---------|---------|-------|
> | Background | `animation_idle` | `fire` | Bonus: `animation_idle_bonus` + `fire_bonus` |
> | Anticipation | `anticipation` | `new` | Les deux en loop |
> | Symboles | `animation` | - | Un seul track |
>
> **Comment identifier les tracks d'un Spine:**
> 1. Demander au graphiste/animateur
> 2. Ouvrir le fichier `.json` et chercher les noms d'animations
> 3. Tester avec un seul track et voir si l'animation est complète

---

## ⚠️ TIMESCALE - DÉLAIS ET VITESSE D'ANIMATION

> **AVANT d'ajouter un délai (`setTimeout`, `await new Promise`), TOUJOURS DEMANDER:**
> Est-ce que ce délai doit être affecté par le mode turbo (timeScale) ?

### Fonctionnement de `timeScale`

`stateBetDerived.timeScale()` retourne un multiplicateur de vitesse:
- **Mode normal**: `1`
- **Mode turbo**: `2`

```typescript
// Définition dans state-shared/stateBet.svelte.ts
const timeScale = () => (stateBet.isTurbo ? 2 : 1);
```

### Usage pour les animations Spine

Pour les animations Spine, `timeScale` est un **multiplicateur** (2 = 2x plus rapide):

```svelte
<SpineTrack
    trackIndex={0}
    animationName="animation"
    timeScale={stateBetDerived.timeScale()}  // 2 en turbo = animation 2x plus rapide
/>
```

### Usage pour les délais (`setTimeout`)

Pour les délais, `timeScale` doit être un **diviseur** (2 = délai 2x plus court):

```typescript
// ✅ CORRECT - diviser par timeScale pour réduire le délai en turbo
const delay = BASE_DELAY_MS / stateBetDerived.timeScale();
await new Promise((resolve) => setTimeout(resolve, delay));

// ❌ INCORRECT - multiplier augmente le délai en turbo!
const delay = BASE_DELAY_MS * stateBetDerived.timeScale();
```

### Exemple concret

```typescript
const FIRST_DUEL_DELAY_MS = 1000;
const NEXT_DUEL_DELAY_MS = 200;

// Calcul du délai adapté au mode de vitesse
const baseDelay = isFirstDuel ? FIRST_DUEL_DELAY_MS : NEXT_DUEL_DELAY_MS;
const delay = baseDelay / stateBetDerived.timeScale();

// Résultat:
// Mode normal (timeScale=1): 1000ms / 1 = 1000ms
// Mode turbo (timeScale=2):  1000ms / 2 = 500ms
```

### Import

```typescript
import { stateBetDerived } from 'state-shared';
```

---

## ⚠️ POSITIONNEMENT DES ÉLÉMENTS SUR LA GRILLE DE SYMBOLES

> **Cette section explique comment positionner correctement des éléments (effets, animations, overlays) sur la grille de symboles.**
>
> Exemples d'éléments concernés : Anticipation, Duels, VS Expand, Paylines, etc.

### Principe de base

Tous les éléments qui doivent être alignés avec la grille de symboles doivent :
1. Être dans un `<MainContainer>` dans `Game.svelte`
2. Utiliser `boardLayout()` pour la position de base
3. Appliquer les mêmes offsets/scales que `BoardContainer.svelte` (ou similaires)

### Structure dans Game.svelte

```svelte
<!-- Dans Game.svelte - chaque élément sur la grille a son propre MainContainer -->
<MainContainer>
    <Board />
    <StickyWildsOverlay />
    <Anticipations />
</MainContainer>

<MainContainer>
    <PaylineOverlay />
</MainContainer>

<MainContainer>
    <Duels />
</MainContainer>
```

**⚠️ IMPORTANT:** Un composant positionné sur la grille DOIT être dans un `<MainContainer>`. Sans ça, le positionnement sera incorrect.

### Pattern de positionnement dans le composant

```svelte
<script lang="ts">
    import { Container } from 'pixi-svelte';
    import { getContext } from '../../game/state/context';

    const context = getContext();

    // ===========================================
    // === COPIER LES OFFSETS DE BoardContainer.svelte ===
    // ===========================================
    const OFFSET_DESKTOP = { x: 5, y: 17 };
    const SCALE_DESKTOP = 1.0;

    const OFFSET_MOBILE = { x: 6, y: 48 };
    const SCALE_MOBILE = 1.05;

    const OFFSET_POPOUT = { x: 5, y: 20 };
    const SCALE_POPOUT = 1.13;

    // Layout detection
    const layoutType = $derived(context.stateLayoutDerived.layoutType());
    const isPortrait = $derived(layoutType === 'portrait');
    const isPopout = $derived(layoutType === 'landscape');

    const offset = $derived(
        isPortrait ? OFFSET_MOBILE :
        isPopout ? OFFSET_POPOUT :
        OFFSET_DESKTOP
    );
    const scale = $derived(
        isPortrait ? SCALE_MOBILE :
        isPopout ? SCALE_POPOUT :
        SCALE_DESKTOP
    );
</script>

<Container
    x={context.stateGameDerived.boardLayout().x + offset.x}
    y={context.stateGameDerived.boardLayout().y + offset.y}
    scale={scale}
    pivot={context.stateGameDerived.boardLayout().pivot}
>
    <!-- Contenu positionné sur la grille -->
</Container>
```

**⚠️ IMPORTANT - Détection du layout:**
- Toujours utiliser `layoutType()` qui retourne `'desktop'`, `'portrait'` ou `'landscape'`
- **NE PAS** utiliser `isStacked()` qui est une détection 2-way (desktop vs mobile) et ne gère pas le mode popout/landscape

### Quelle source d'offsets/scales utiliser ?

| Source | Quand l'utiliser |
|--------|------------------|
| **BoardContainer.svelte** | Référence principale - contient les valeurs calibrées pour la grille |
| **Anticipations.svelte** | Si votre élément doit être aligné comme l'anticipation |
| **Duels.svelte** | Si votre élément doit être aligné comme les duels |

**Règle générale:** Copier les valeurs de `BoardContainer.svelte` comme point de départ, puis ajuster si nécessaire.

### Quel scale utiliser ?

Il y a deux approches :

**1. Scale propre (recommandé pour la plupart des cas)**
```typescript
const scale = $derived(
    isPortrait ? SCALE_MOBILE :
    isPopout ? SCALE_POPOUT :
    SCALE_DESKTOP
);
// ...
<Container scale={scale} ... />
```

**2. Scale du boardLayout**
```typescript
<Container scale={context.stateGameDerived.boardLayout().scale} ... />
```

→ Utiliser l'approche 1 (scale propre) pour être cohérent avec `BoardContainer`.

### Mode Debug pour le positionnement

Pour faciliter le positionnement d'un nouvel élément, ajouter un mode debug :

```svelte
<script lang="ts">
    // DEBUG: Set to true to always show element for positioning
    const DEBUG_ALWAYS_SHOW = false;

    // ... reste du code ...
</script>

<!-- Afficher si condition réelle OU debug activé -->
{#if DEBUG_ALWAYS_SHOW || conditionReelle}
    <Container ...>
        <MonElement />
    </Container>
{/if}
```

**⚠️ IMPORTANT pour les composants de debug séparés (ex: DuelDebug.svelte):**

Le composant de debug DOIT être dans un `<MainContainer>` dans `Game.svelte`, exactement comme le composant réel :

```svelte
<!-- Game.svelte -->
<!-- Composant réel -->
<MainContainer>
    <Duels />
</MainContainer>

<!-- Composant debug (même wrapper!) -->
<MainContainer>
    <DuelDebug />
</MainContainer>
```

Sans le `<MainContainer>`, le debug ne sera pas positionné au même endroit que le composant réel.

### Checklist pour un nouvel élément sur la grille

- [ ] Le composant est dans un `<MainContainer>` dans `Game.svelte`
- [ ] Les offsets sont copiés de `BoardContainer.svelte` (ajuster si nécessaire)
- [ ] Les scales sont copiés de `BoardContainer.svelte`
- [ ] Le Container utilise `boardLayout().x`, `boardLayout().y`, et `boardLayout().pivot`
- [ ] Un mode `DEBUG_ALWAYS_SHOW` est disponible pour le positionnement
- [ ] Le composant de debug (si séparé) est aussi dans un `<MainContainer>`
- [ ] Testé sur desktop, mobile (portrait), et popout (landscape)

---

## ⚠️ Z-ORDER : `sortableChildren` + zIndex EXPLICITE vs ordre de montage (gotcha réutilisable)

> **Symptôme typique** : tout est bien empilé au lancement, mais **dès qu'on change de format d'affichage** (desktop ↔ mobile ↔ popout) un élément **passe devant un autre** (ex. un décor de coin / rock saute par-dessus le HUD). On dirait que les zIndex sont « ignorés ».

### Cause

Dans pixi-svelte, le z-order d'un `Container` suit l'**ordre des enfants dans le tableau pixi** (= ordre d'`addChild`), **PAS** la position logique Svelte — **sauf** si le parent a **`sortableChildren={true}`** (alors pixi trie par `zIndex`).

Or un enfant **monté conditionnellement** (`{#if isMobile}…`, overlay on-demand) est **ajouté en dernier** (`addChild` append) quand son bloc (re)monte. Un **swap de layout** remonte ces branches → elles passent **au-dessus** des frères montés avant → l'empilement « par ordre de montage » est cassé. Idem pour les overlays qui montent à la volée (paylines, anticipations) : ils s'ajoutent en dernier = au-dessus.

### Fix

**Le conteneur qui mélange des enfants montés conditionnellement / à la volée doit être `sortableChildren={true}`, ET chaque couche doit porter un `zIndex` EXPLICITE.** L'ordre de (re)montage devient alors sans effet.

- Le conteneur **racine du jeu** (celui de `Game.svelte` qui contient board / hud / character / rock / overlays / panels) est un cas classique : il a des branches `{#if isMobile}`/`{#if !isMobile}` → **toujours** le passer en `sortableChildren` + zIndex par couche.
- Pour les composants qui **ne forwardent pas forcément** `zIndex` à leur root, **wrapper** chaque couche dans un `<Container zIndex={n}>` (zéro hypothèse sur le forward, un wrapper neutre `x=0,y=0` ne décale rien) :

```svelte
<Container sortableChildren={true}>
  <Container zIndex={0}><MainContainer><BoardFrame /></MainContainer></Container>
  <Container zIndex={1}><MainContainer sortableChildren={true}><Board /> …</MainContainer></Container>
  <Container zIndex={2}><Rock /></Container>          <!-- décor de coin, au-dessus du board -->
  {#if !isMobile}<Container zIndex={3}><Character /></Container>{/if}
  <Container zIndex={7}><HudPixi /></Container>        <!-- hud au-dessus du décor -->
  <Container zIndex={20}><FreeSpinIntro /></Container> <!-- splashs tout devant -->
</Container>
```

- **Documenter le barème** des zIndex en commentaire (back→front) au-dessus du conteneur — il devient la source de vérité de l'empilement.
- Un élément dont le z **dépend du layout** (ex. mascotte **derrière** le board en mobile, **devant** en desktop) = deux branches `{#if}` avec **deux zIndex différents** (ex. `-1` vs `3`), pas un seul.
- Les conteneurs **imbriqués** (ex. board interne) gardent leur propre `sortableChildren` + zIndex locaux ; les deux niveaux coexistent sans interférence.
- Un enfant qui pose **lui-même** son zIndex (ex. effet de fond à `-100`) reste correct sous `sortableChildren` ; lui passer aussi le `zIndex` en prop sécurise le cas où il ne le poserait pas.

### Règle

> Dès qu'un conteneur a **au moins un enfant monté conditionnellement ou à la volée** et que l'empilement compte → `sortableChildren={true}` + **zIndex explicite sur chaque enfant** (wrapper si besoin). Ne **jamais** se reposer sur l'ordre de montage : il change au remount (layout swap, mount on-demand).

---

## ⚠️ QUESTIONS CRITIQUES À POSER POUR CHAQUE NOUVEAU PROJET

> **AVANT de commencer à configurer les composants, DEMANDER:**
>
> ### 1. Transition entre base game et bonus
> - **Question**: Est-ce qu'il y a une animation de transition entre le jeu de base et le bonus ?
> - **Si oui**: Quel asset utiliser ? (ex: `transition/transition.json`)
> - **Si non**: Commenter le composant `Transition.svelte` dans `Game.svelte`
>
> **Pour no-mercy-at-down**: ❌ Pas de transition - composant commenté
>
> ### 2. Background bonus
> - **Question**: Est-ce qu'il y a un background différent pour le bonus ?
> - **Options possibles**:
>   - Image statique différente (ex: `background_bonus.webp`)
>   - Même Spine avec animation différente (ex: `backgroundSpine` avec animation `bonus`)
>   - Pas de différence
>
> **Pour no-mercy-at-down**: Le background utilise le Spine `backgroundSpine` avec une animation différente pour le bonus (pas une image séparée)
>
> ### 3. Composants spécifiques au jeu d'origine
> - **Question**: Y a-t-il des composants du jeu d'origine (ex: cactus-cash) qui ne s'appliquent pas ?
> - **Action**: Les supprimer ou les commenter avec TODO
>
> **Pour no-mercy-at-down**: `CactusCharacter.svelte` supprimé (spécifique à cactus-cash)
>
> ### 4. HUD (Layout)
> - **Question**: Voulez-vous reprendre l'ancien HUD du projet d'origine ou le refaire avec de nouveaux assets ?
>
> **Option A - Reprendre l'ancien HUD temporairement:**
> - Copier/référencer les assets HUD du projet d'origine dans `assets.ts` avec un commentaire TODO
> - Permet de tester le jeu rapidement avant de refaire le HUD
>
> **Option B - Refaire le HUD avec nouveaux assets:**
> - Lister les assets disponibles dans le dossier layout (ex: `static/assets/export_final/layout/`)
> - Modifier `src/components/hud/HudPixi.svelte` pour utiliser les nouveaux assets
> - Ajuster les positions et tailles des éléments
>
> **Éléments à personnaliser lors d'une refonte layout:**
> - [ ] Polices (fichiers dans `static/fonts/`, déclarées dans CSS/assets)
> - [ ] Style popup Auto Bet (composant `HudAutoPlayPanel`)
> - [ ] Style popup Select Bet (composant `HudBetPanel`)
> - [ ] Layout mobile (responsive, drawer, positionnement des boutons)
>
> **Checklist des assets HUD nécessaires:**
> | Asset | Fichier | Notes |
> |-------|---------|-------|
> | Play | play.webp, play_hover.webp | |
> | Play paused | ? | Réutiliser un autre asset ? |
> | Auto replay | auto_replay.webp | |
> | Stop autoplay | stop_autoplay.webp, stop_autoplay_hover.webp | |
> | Bonus | bonus.webp, bonus_hover.webp, bonus_disabled.webp | |
> | Speed | speed_button.webp, super_speed_button.webp | |
> | Volume | volume_button.webp, volume_icon.webp | |
> | Info | info_button.webp | |
> | Menu | menu.webp | |
> | Home | home_button.webp | |
> | Arrows | arrow_up.webp, arrow_down.webp | |
> | Background | background_layout.webp | |
> | Background mobile | background_layout_mobile.webp | Ou réutiliser desktop ? |
> | Popup | popup.webp, popup_free_spin.webp | |
> | Progress bar | barre_progression_vide.webp, barre_progression_pleine.webp | |
>
> **Questions à poser:**
> - Y a-t-il des assets manquants ?
> - Peut-on réutiliser certains assets pour plusieurs boutons ? (ex: stop_autoplay pour play_paused)
> - Utilise-t-on les mêmes assets pour mobile et desktop ?
>
> **⚠️ IMPORTANT - Ne pas dupliquer les assets dans assets.ts:**
> - Chaque fichier doit être déclaré UNE SEULE FOIS dans assets.ts
> - La réutilisation se fait dans le code (HudPixi.svelte) en utilisant la même clé
> ```typescript
> // ❌ MAUVAIS - déclare le même fichier deux fois
> hudStopAutoplay: { src: 'stop_autoplay.webp' },
> hudPlayPaused: { src: 'stop_autoplay.webp' },  // Duplique le chargement!
>
> // ✅ BON - déclare une fois, réutilise la clé
> // assets.ts:
> hudStopAutoplay: { src: 'stop_autoplay.webp' }
>
> // HudPixi.svelte:
> <Sprite key="hudStopAutoplay" />  // pour stop autoplay
> <Sprite key="hudStopAutoplay" />  // pour play paused aussi
> ```
>
> **Pour no-mercy-at-down**:
> - Phase 1: Ancien HUD temporaire (`static/assets/hud/` de cactus-cash)
> - Phase 2: Refonte avec nouveaux assets (`static/assets/export_final/layout/`)
> - `play_paused` → réutilise `stop_autoplay`
> - Assets mobile → mêmes que desktop
>
> ### 4b. Sons temporaires
> - **Question**: Voulez-vous utiliser temporairement les anciens sons du projet d'origine ?
> - **Si oui**: Activer l'asset `sound` dans `assets.ts` et le `onMount` dans `EnableSound.svelte` avec un commentaire TODO
> - **Si non**: Commenter le code audio jusqu'à ce que les nouveaux sons soient disponibles
>
> **Pour no-mercy-at-down**:
> - Sons: Utilise temporairement `static/assets/audio/sounds.json` (cactus-cash)
>
> ### 5. Configuration du Background
> - **Question**: Le background est-il statique (image) ou animé (Spine) ?
> - **Si statique**: Utiliser un `<Sprite>` avec scale calculé pour couvrir l'écran
> - **Si Spine**: Utiliser `<SpineProvider>` avec `width={canvasSizes.width}` ou `height={canvasSizes.height}`
>
> - **Question**: Y a-t-il plusieurs animations à superposer (ex: idle + effets) ?
> - **Si oui**: Utiliser le système multi-track de Spine:
>   ```svelte
>   <SpineProvider key="backgroundSpine" ...>
>     <SpineTrack trackIndex={0} animationName="animation_idle" loop />
>     <SpineTrack trackIndex={1} animationName="fire" loop />
>   </SpineProvider>
>   ```
> - Les tracks sont superposés (track 0 = base, track 1+ = overlays)
>
> - **Question**: Y a-t-il des animations différentes pour le bonus ?
> - **Si oui**: Changer dynamiquement les noms d'animation selon `stateGame.gameType`
>
> **Pour no-mercy-at-down**:
> - Background Spine avec 4 animations: `animation_idle`, `fire`, `animation_idle_bonus`, `fire_bonus`
> - Mode normal: Track 0 = `animation_idle`, Track 1 = `fire`
> - Mode bonus: Track 0 = `animation_idle_bonus`, Track 1 = `fire_bonus`
> - Dimensionnement: `width={canvasSizes.width}` pour couvrir la largeur
>
> ### 6. Configuration du Board Frame et de la Grille de Symboles
>
> **⚠️ TRÈS IMPORTANT: Utiliser BoardDebugGrid pour le placement !**
>
> Le composant `BoardDebugGrid.svelte` affiche une grille de debug par-dessus le board:
> - **Lignes rouges**: les cellules de la grille
> - **Points cyan**: les centres des symboles
> - **Rectangle vert**: la zone visible (lignes visibles sans padding)
>
> **Activer le debug grid:**
> ```svelte
> <!-- Dans Board.svelte -->
> import BoardDebugGrid from './BoardDebugGrid.svelte';
>
> <BoardContainer>
>   <BoardBase />
>   <BoardDebugGrid />  <!-- Activer pendant le placement -->
> </BoardContainer>
> ```
>
> **⚠️ Ne pas oublier de commenter/supprimer BoardDebugGrid en production !**
>
> ---
>
> **Ordre de configuration:**
> 1. D'abord placer/dimensionner le board frame (desktop → mobile → popout)
> 2. Ensuite adapter la grille de symboles pour qu'elle rentre dedans (desktop → mobile → popout)
>
> **⚠️ ASTUCE HOT RELOAD:**
> - Modifier les fichiers `.svelte` = hot reload rapide (pas de redémarrage)
> - Modifier les fichiers `$state` (stateGame.svelte.ts) ou `constants.ts` = redémarrage complet
> - **Toujours mettre les constantes de placement dans les fichiers `.svelte` !**
>
> ---
>
> #### 6.1 Board Frame (`src/components/board/BoardFrame.svelte`)
>
> Le board frame (cadre du board) est dimensionné indépendamment de la grille.
> **3 configurations**: Desktop, Mobile (portrait), Popout (landscape).
>
> ```typescript
> // Layout detection
> const layoutType = $derived(context.stateLayoutDerived.layoutType());
> const isPortrait = $derived(layoutType === 'portrait');
> const isPopout = $derived(layoutType === 'landscape');
>
> // ===========================================
> // === BOARD SIZE CONFIG (adjust here)
> // ===========================================
> // Desktop: percentage of mainLayout.height
> const BOARD_SIZE_DESKTOP = 1.185;
> const BOARD_OFFSET_X_DESKTOP = 5;
>
> // Mobile (portrait): vertical phone layout
> const BOARD_SIZE_MOBILE = 0.56;
> const BOARD_OFFSET_X_MOBILE = 5;
>
> // Popout (landscape): small window (400x225, 800x450)
> const BOARD_SIZE_POPOUT = 1.185;
> const BOARD_OFFSET_X_POPOUT = 5;
>
> // Select config based on layout type
> const boardSize = $derived(
>   isPortrait ? BOARD_SIZE_MOBILE :
>   isPopout ? BOARD_SIZE_POPOUT :
>   BOARD_SIZE_DESKTOP
> );
> const boardOffsetX = $derived(
>   isPortrait ? BOARD_OFFSET_X_MOBILE :
>   isPopout ? BOARD_OFFSET_X_POPOUT :
>   BOARD_OFFSET_X_DESKTOP
> );
> const boardWidth = $derived(mainLayout.height * boardSize);
>
> // Asset key: mobile uses different board asset
> const boardKey = $derived(isPortrait ? 'boardMobile' : 'board');
> ```
>
> ---
>
> #### 6.2 Grille de symboles (`src/components/board/BoardContainer.svelte`)
>
> La grille doit être placée à l'intérieur du board frame. On contrôle:
> - **OFFSET**: décalage X/Y pour aligner la grille avec le cadre
> - **SCALE**: échelle de la grille (important pour mobile/popout)
>
> ```typescript
> // Layout detection
> const layoutType = $derived(context.stateLayoutDerived.layoutType());
> const isPortrait = $derived(layoutType === 'portrait');
> const isPopout = $derived(layoutType === 'landscape');
>
> // ===========================================
> // === GRID PLACEMENT CONFIG (adjust here)
> // ===========================================
> // Desktop
> const OFFSET_DESKTOP = { x: 5, y: 17 };
> const SCALE_DESKTOP = 1.0;
>
> // Mobile (portrait)
> const OFFSET_MOBILE = { x: 6, y: 48 };
> const SCALE_MOBILE = 1.05;
>
> // Popout (landscape)
> const OFFSET_POPOUT = { x: 5, y: 20 };
> const SCALE_POPOUT = 1.13;
>
> // Select config based on layout type
> const offset = $derived(
>   isPortrait ? OFFSET_MOBILE :
>   isPopout ? OFFSET_POPOUT :
>   OFFSET_DESKTOP
> );
> const scale = $derived(
>   isPortrait ? SCALE_MOBILE :
>   isPopout ? SCALE_POPOUT :
>   SCALE_DESKTOP
> );
> ```
>
> **⚠️ IMPORTANT:** Si vous utilisez `scale` dans BoardContainer, assurez-vous que
> `stateGame.svelte.ts` a `mobileBoardScale = 1` pour éviter un double scaling.
>
> ---
>
> #### 6.3 Méthodologie de placement
>
> **Étape 1: Desktop**
> 1. Activer `BoardDebugGrid`
> 2. Ajuster `BOARD_SIZE_DESKTOP` dans BoardFrame.svelte jusqu'à ce que le cadre soit à la bonne taille
> 3. Ajuster `OFFSET_DESKTOP` dans BoardContainer.svelte pour aligner la grille (points cyan) avec le cadre
> 4. Vérifier que le rectangle vert (zone visible) est bien centré dans le cadre
>
> **Étape 2: Mobile (portrait)**
> 1. Passer en vue mobile portrait (DevTools: ex. iPhone 14 Pro)
> 2. Ajuster `BOARD_SIZE_MOBILE` dans BoardFrame.svelte
> 3. Ajuster `SCALE_MOBILE` dans BoardContainer.svelte pour que la grille corresponde au cadre
> 4. Ajuster `OFFSET_MOBILE` pour aligner précisément
>
> **Étape 3: Popout (landscape)**
> 1. Redimensionner la fenêtre en format paysage petit (ex: 800x450 ou 400x225)
> 2. Ajuster `BOARD_SIZE_POPOUT` dans BoardFrame.svelte
> 3. Ajuster `SCALE_POPOUT` dans BoardContainer.svelte
> 4. Ajuster `OFFSET_POPOUT` pour aligner précisément
>
> **Étape 4: Finalisation**
> 1. Commenter/supprimer `BoardDebugGrid` dans Board.svelte
> 2. Tester sur différentes tailles d'écran (desktop, mobile, popout)
>
> ---
>
> #### 6.4 Alignement des Symboles Static/Animation (`src/game/config/constants.ts`)
>
> **Problème:** Quand un symbole passe de l'état `static` (sprite) à `win` (Spine animation),
> il peut y avoir un décalage visuel si les tailles/positions ne correspondent pas.
>
> **⚠️ TRÈS IMPORTANT: Utiliser SymbolDebug pour l'alignement !**
>
> Le composant `SymbolDebug.svelte` alterne automatiquement entre `static` et `win`
> pour visualiser le décalage.
>
> ---
>
> **Activer SymbolDebug** (`src/components/Game.svelte`):
> ```svelte
> // Ligne ~28: Décommenter l'import
> import SymbolDebug from './symbol/SymbolDebug.svelte';
>
> // Ligne ~210: Décommenter le composant (dans le template, après <FreeSpinOutro />)
> <SymbolDebug />
> ```
>
> **Pour désactiver rapidement:** Mettre `DEBUG_ENABLED = false` dans SymbolDebug.svelte (hot reload, pas de redémarrage!)
>
> **Pour désactiver complètement:** Remettre les commentaires `//` devant l'import et `<!-- -->` autour du composant.
>
> **Configurer le symbole à tester** (`src/components/symbol/SymbolDebug.svelte`):
> ```typescript
> const DEBUG_ENABLED = true;     // Toggle rapide pour activer/désactiver le debug
> const SYMBOL_NAME = 'L1';       // Changer pour tester chaque symbole (L1-L5, H1-H5, W, S, VS)
> const DEBUG_SCALE = 6;          // Scale pour plus de précision (1 = normal, 4-6 = zoomé)
> const TOGGLE_INTERVAL = 500;    // Intervalle d'alternance static/spine (ms)
> ```
>
> **⚠️ ASTUCE HOT RELOAD:** Ajuster les valeurs directement dans SymbolDebug (pas de redémarrage!):
> ```typescript
> // LOCAL OVERRIDES - Modifier ici, puis copier dans constants.ts quand c'est bon
> const STATIC_SIZE = { width: 1, height: 1 };    // sizeRatios du static
> const STATIC_OFFSET = { x: 0, y: 0 };           // offset du static
> const WIN_SIZE = { width: 0.513, height: 0.513 };   // sizeRatios du spine
> const WIN_OFFSET = { x: 0, y: 0 };              // offset du spine
> ```
>
> **Fonctionnement:**
> - Le composant affiche static et spine **superposés à la même position**
> - Alterne automatiquement entre les deux à l'intervalle configuré
> - Le spine est **figé** (frozen=true, timeScale=0) pour comparer les tailles sans animation
> - Les overrides sont passés via `debugOverrides` au composant Symbol
>
> **Indicateur visuel:** Un point coloré en haut à gauche indique l'asset affiché:
> - 🟢 **Vert** = static (sprite)
> - 🔴 **Rouge** = spine (figé)
>
> ---
>
> **Paramètres à ajuster** (`src/game/config/constants.ts`):
>
> ```typescript
> // Symbole static (sprite)
> const h1Static = {
>   type: 'sprite',
>   assetKey: 'H1_static',
>   sizeRatios: { width: 1, height: 1 },  // Taille relative à SYMBOL_SIZE
> };
>
> // Symbole win (Spine animation)
> const h1Win = {
>   type: 'spine',
>   assetKey: 'H1_spine',
>   animationName: 'animation',
>   sizeRatios: { width: 0.5, height: 0.5 },  // Ajuster pour correspondre au static
>   offset: { x: 0, y: 0 },                    // Ajuster si décalage de position
> };
> ```
>
> | Paramètre | Description |
> |-----------|-------------|
> | `sizeRatios.width/height` | Échelle du symbole relative à `SYMBOL_SIZE` |
> | `offset.x` | Décalage horizontal (positif = droite) |
> | `offset.y` | Décalage vertical (positif = bas) |
>
> ---
>
> **Méthodologie d'alignement:**
>
> 1. Activer `SymbolDebug` dans Game.svelte (import + composant)
> 2. Mettre `DEBUG_ENABLED = true` dans SymbolDebug.svelte
> 3. Configurer `SYMBOL_NAME` pour le symbole à ajuster
> 4. Observer le décalage entre static et win (alternance automatique)
> 5. Ajuster `WIN_SIZE` dans SymbolDebug jusqu'à ce que la taille corresponde (hot reload!)
> 6. Si décalage de position, ajuster `WIN_OFFSET` ou `STATIC_OFFSET`
> 7. **Copier les valeurs finales dans constants.ts** (cause un redémarrage)
> 8. Répéter pour chaque symbole (Low L1-L5, High H1-H5, Special W/S/VS)
> 9. **Mettre `DEBUG_ENABLED = false`** quand terminé
>
> ---
>
> **Autres paramètres utiles:**
>
> - `SYMBOL_SIZE`: contrôle l'espacement entre les symboles (la grille)
>   - Pour rapprocher les symboles sans les réduire: diminuer `SYMBOL_SIZE`
>   - Pour agrandir visuellement les symboles: augmenter `sizeRatios`

---

#### 6.5 Crossfade des Transitions Static/Animation (`src/components/symbol/Symbol.svelte`)

> **Problème:** Les sprites static et les animations Spine peuvent avoir de légères différences visuelles (quelques pixels). Un changement instantané rend ces différences visibles.

> **Solution:** Un crossfade automatique entre static et animation pour masquer les différences.

> ---

> **Fonctionnement:**

> **Sprite → Spine (static → win):**
> 1. Sprite fade out (alpha 1→0)
> 2. Spine fade in (alpha 0→1), **figé à frame 0**
> 3. Après le fade: animation démarre

> **Spine → Sprite (win → postWinStatic):**
> 1. Spine fade out (alpha 1→0), **figé à la dernière frame**
> 2. Sprite fade in (alpha 0→1)
> 3. Après le fade: sprite affiché

> ---

> **Configuration** (`src/components/symbol/Symbol.svelte` ligne ~34):
> ```typescript
> const FADE_DURATION = 150; // ms - durée du crossfade
> ```

> ---

> **Fichiers impliqués:**
> - `Symbol.svelte` - logique de crossfade avec `tweened` de Svelte
> - `SymbolSprite.svelte` - prop `alpha`
> - `SymbolSpine.svelte` - prop `alpha`
> - `SymbolSpineMain.svelte` - prop `alpha` sur SpineProvider

### 7. Effets Spéciaux / Animations de Symboles

> **Question**: Y a-t-il des animations/effets spéciaux liés aux symboles ?
> - Exemples: duel entre symboles, expansion de colonne, transformation, effet de collecte, etc.
>
> **Si oui, demander:**
> 1. Quel(s) asset(s) Spine utiliser ?
> 2. L'animation doit-elle être positionnée sur la grille de symboles ?
> 3. Y a-t-il besoin d'injection d'atlas (chiffres, multiplicateurs, etc.) ?
>
> **📄 Pour le positionnement sur la grille:** Voir la section **"⚠️ POSITIONNEMENT DES ÉLÉMENTS SUR LA GRILLE DE SYMBOLES"** plus haut dans ce document.
>
> **⏱️ Timing des animations (si l'utilisateur demande un délai):**
>
> Si l'animation doit démarrer avec un délai (ex: après que les rouleaux s'arrêtent), ajouter une constante configurable **dans le fichier .svelte** pour bénéficier du hot reload:
>
> ```typescript
> // Dans le composant .svelte (ex: Duels.svelte)
> // ===========================================
> // === TIMING CONFIG (hot reload friendly)
> // ===========================================
> const EFFECT_START_DELAY_MS = 500; // Délai avant l'animation
>
> // Dans le subscriber de l'event
> context.eventEmitter.subscribeOnMount({
>     effectPlay: async ({ data }) => {
>         await new Promise((resolve) => setTimeout(resolve, EFFECT_START_DELAY_MS));
>         // ... déclencher l'animation
>     },
> });
> ```
>
> **Pourquoi dans le .svelte ?** Les fichiers `.svelte` ont le hot reload rapide, contrairement à `constants.ts` qui nécessite un restart complet.
>
> **Pour no-mercy-at-down** (Animation Duel):
> - Asset: `animation_vs_plus_anticipation/animation_vs.json`
> - Loader: `VSExpandLoader.svelte` (charge avec injection pack_multi + pack_number)
> - Composants: `Duels.svelte` (container), `DuelAnimation.svelte` (animation), `DuelMultiplierSlots.svelte` (attachments)
> - Scale: `0.1`
> - Position: `getSymbolX(column)` pour X, `SYMBOL_SIZE * 2.5` pour Y
> - Timing: `DUEL_START_DELAY_MS = 500` dans `Duels.svelte` (délai après arrêt des rouleaux)

### 8. Mapping des Assets HUD

> **Assets HUD déclarés dans `assets.ts`:**
> ```typescript
> hudBackground       → background_layout.webp
> hudBackgroundMobile → background_layout_mobile.webp
> hudPlay             → play.webp
> hudPlayHover        → play_hover.webp
> hudAutoReplay       → auto_replay.webp
> hudStopAutoplay     → stop_autoplay.webp
> hudStopAutoplayHover→ stop_autoplay_hover.webp
> hudArrowUp          → arrow_up.webp
> hudArrowDown        → arrow_down.webp
> hudMenu             → menu.webp
> hudVolumeButton     → volume_button.webp
> hudVolumeIcon       → volume_icon.webp
> hudInfoButton       → info_button.webp
> hudHomeButton       → home_button.webp
> hudSpeedButton      → speed_button.webp
> hudSuperSpeedButton → super_speed_button.webp
> hudBonus            → bonus.webp
> hudBonusHover       → bonus_hover.webp
> hudBonusDisabled    → bonus_disabled.webp
> hudPopup            → popup.webp
> hudPopupFreeSpin    → popup_free_spin.webp
> hudProgressBarEmpty → barre_progression_vide.webp
> hudProgressBarFull  → barre_progression_pleine.webp
> ```
>
> **Réutilisation des assets (même clé, multiple usages):**
> | Usage | Clé utilisée |
> |-------|-------------|
> | Bouton Play (en jeu) | `hudStopAutoplay` / `hudStopAutoplayHover` |
> | Bouton Stop Autoplay | `hudStopAutoplay` / `hudStopAutoplayHover` |
> | Icône vitesse (éclairs) | `hudSpeedButton` |
> | Volume musique (popup) | `hudVolumeIcon` |
> | Volume SFX (popup) | `hudVolumeButton` |
>
> **Fichiers modifiés lors de la refonte HUD:**
> - `src/components/hud/HudPixi.svelte` - Composant principal
> - `src/components/hud/HudSpeedButton.svelte` - Bouton vitesse
> - `src/components/hud/HudVolumePopover.svelte` - Popup volume desktop
> - `src/components/hud/HudMobileMenu.svelte` - Menu mobile
>
> **Pattern pour le bouton speed (desktop):**
> - Fond: `Graphics` rond avec couleur hover
> - Icônes: 1/2/3 × `hudSpeedButton` selon le niveau

---

## ⚠️ SOCIAL MODE - MOTS INTERDITS (CRITIQUE)

> **À CHAQUE FOIS qu'on ajoute du texte dans le jeu, IL FAUT VÉRIFIER si un mot interdit est présent et le remplacer par le mot autorisé en mode social.**
>
> **C'est TRÈS IMPORTANT pour la conformité légale du jeu.**

**Comment vérifier le mode social:**
```typescript
const social = $derived(context.stateUrlDerived.social());

// Exemple d'utilisation
const buttonText = $derived(social ? 'GET' : 'BUY');
const description = $derived(social ? 'Get 10 Free Spins' : 'Win 10 Free Spins');
```

**Liste complète des mots interdits et leurs remplacements:**

| Mot/Phrase Interdit | Remplacement |
|---------------------|--------------|
| `bet` | `play` |
| `bets` | `plays` |
| `bet/s` | `play/s` |
| `betting` | `play / playing` |
| `total bet` | `total play` |
| `rebet` | `respin` |
| `stake` | `play amount` |
| `wager` | `play` |
| `gamble` | `play` |
| `place your bets` | `come and play / join in the game` |
| `buy` | `play` |
| `bought` | `instantly triggered` |
| `purchase` | `play` |
| `buy bonus` | `get bonus` |
| `bonus buy` | `bonus / feature` |
| `at the cost of` | `for` |
| `cost of` | `can be played for` |
| `pay` | `win` |
| `pays` | `wins` |
| `paid` | `won` |
| `payer` | `winner` |
| `pay out` | `win / won` |
| `paid out` | `won` |
| `pays out` | `win` |
| `win feature` | `play feature` |
| `cash` | `coins` |
| `money` | `coins` |
| `currency` | `token` |
| `credit` | `balance` |
| `fund` | `balance` |
| `deposit` | `get coins` |
| `withdraw` | `redeem` |
| `be awarded to player's accounts` | `appear in player's accounts` |

**Checklist à suivre pour chaque texte ajouté:**
- [ ] Le texte contient-il un mot de la liste ci-dessus ?
- [ ] Si oui, utiliser `$derived` avec `context.stateUrlDerived.social()` pour afficher le bon texte
- [ ] Tester en mode social (`?social=true` dans l'URL)

---

## ⚠️ CONVERSION ATLAS → JSON POUR SPRITESHEETS

> **Pour les assets de type spritesheet (symboles statiques, pack chiffres, etc.):**
>
> Les fichiers `.atlas` (format Spine) doivent être convertis en `.json` (format PixiJS spritesheet).
>
> **Format Atlas Spine:**
> ```
> static_symbols.webp
> size:1828,916
> filter:Linear,Linear
> scale:0.1
> high_axe
> bounds:4,612,300,300
> ```
>
> **Format JSON PixiJS attendu:**
> ```json
> {
>   "frames": {
>     "high_axe": {
>       "frame": { "x": 4, "y": 612, "w": 300, "h": 300 },
>       "sourceSize": { "w": 300, "h": 300 },
>       "spriteSourceSize": { "x": 0, "y": 0, "w": 300, "h": 300 }
>     }
>   },
>   "meta": {
>     "image": "static_symbols.webp",
>     "size": { "w": 1828, "h": 916 },
>     "scale": "1"
>   }
> }
> ```
>
> **Fichiers à convertir:**
> - `symboles_static/static_symbols.atlas` → `static_symbols.json`
> - `pack_chiffres/pack_number.atlas` → `pack_number.json` (si utilisé comme spritesheet, sinon SharedAtlasManager)
>
> ---
>
> ### Mapping des champs libgdx → PixiJS
>
> Une région libgdx :
> ```
> <nom_region>
> bounds:x,y,w,h            # position + taille dans l'atlas
> offsets:ox,oy,ow,oh       # (optionnel) trim : décalage + taille ORIGINALE (avant trim)
> rotate:90                 # (optionnel) région tournée
> ```
>
> | libgdx | PixiJS | Règle |
> |--------|--------|-------|
> | `bounds:x,y,w,h` | `frame: {x,y,w,h}` | copie directe |
> | (pas d'`offsets`) | `trimmed:false`, `sourceSize:{w,h}`, `spriteSourceSize:{0,0,w,h}` | région pleine |
> | `offsets:ox,oy,ow,oh` | `trimmed:true`, `sourceSize:{w:ow,h:oh}`, `spriteSourceSize:{x:ox,y:oy,w:bw,h:bh}` | `sourceSize` = taille ORIGINALE (`ow,oh`) ; `spriteSourceSize` = offset libgdx (`ox,oy`) + taille troncée (`bw,bh` des bounds) |
> | `rotate:90`/`true` | `rotated:true` | sinon `false` |
> | header `size:w,h` | `meta.size:{w,h}` | |
> | header `scale:` (ou absent) | `meta.scale` (`"1"` par défaut) | **pas** appliqué aux coords |
> | 1ʳᵉ ligne (nom image) | `meta.image` | **garder l'extension réelle** (`.png` ou `.webp`) |
>
> > ⚠️ `pma:true` dans le header (premultiplied alpha) → ignoré côté JSON, la texture vient du `.png`/`.webp`.
> > ⚠️ `meta.image` doit pointer le **vrai** fichier image à côté du `.json` (même nom que dans l'`.atlas`).
>
> ### Convertisseur réutilisable (Node, tous projets)
>
> Script `atlas2json.mjs` — parse n'importe quel `.atlas` libgdx → spritesheet PixiJS. Lance : `node atlas2json.mjs <in.atlas> <out.json>`.
>
> ```js
> import { readFileSync, writeFileSync } from 'node:fs';
> const [, , inPath, outPath] = process.argv;
> const lines = readFileSync(inPath, 'utf8').split(/\r?\n/);
> const HEADER_KEYS = new Set(['size', 'format', 'filter', 'repeat', 'pma', 'scale']);
> const image = lines[0].trim();
> const meta = { scale: '1' };
> const frames = {};
> let i = 1;
> for (; i < lines.length; i++) {
>   const line = lines[i];
>   if (line.trim() === '') continue;
>   const idx = line.indexOf(':');
>   if (idx === -1) break; // 1ʳᵉ région
>   const key = line.slice(0, idx).trim();
>   if (!HEADER_KEYS.has(key)) break;
>   const val = line.slice(idx + 1).trim();
>   if (key === 'size') { const [w, h] = val.split(',').map((n) => parseInt(n, 10)); meta.size = { w, h }; }
>   else if (key === 'scale') meta.scale = val;
> }
> const nums = (s) => s.split(',').map((n) => parseInt(n.trim(), 10));
> while (i < lines.length) {
>   const name = lines[i].trim(); i++;
>   if (name === '') continue;
>   const attrs = {};
>   while (i < lines.length && lines[i].includes(':')) { const l = lines[i]; const k = l.indexOf(':'); attrs[l.slice(0, k).trim()] = l.slice(k + 1).trim(); i++; }
>   if (!attrs.bounds) continue;
>   const [bx, by, bw, bh] = nums(attrs.bounds);
>   const rotated = attrs.rotate === 'true' || attrs.rotate === '90';
>   let trimmed = false, sourceSize = { w: bw, h: bh }, spriteSourceSize = { x: 0, y: 0, w: bw, h: bh };
>   if (attrs.offsets) { const [ox, oy, ow, oh] = nums(attrs.offsets); trimmed = true; sourceSize = { w: ow, h: oh }; spriteSourceSize = { x: ox, y: oy, w: bw, h: bh }; }
>   frames[name] = { frame: { x: bx, y: by, w: bw, h: bh }, rotated, trimmed, spriteSourceSize, sourceSize };
> }
> writeFileSync(outPath, JSON.stringify({ frames, meta: { image, size: meta.size, scale: meta.scale } }, null, '\t') + '\n');
> ```
>
> **Après conversion** : déclarer en `type: 'sprites'` dans `assets.ts` (clé = ex. `staticSymbols`), pointer le `.json`. Le loader pixi-svelte (`PROCESS_METHOD_MAP.sprites = rawAsset.textures`) éclate le spritesheet : **chaque nom de frame devient une clé dans `loadedAssets`**, donc `<Sprite key="<nom_region>">` la résout directement. → Dans `SYMBOL_INFO_MAP`, les `assetKey` static = **noms de régions** de l'atlas (pas `H1_static` si l'atlas nomme par thème).

---

## Résumé du Jeu

- **Grid**: 5 colonnes x 5 lignes
- **Paylines**: 15 lignes
- **Max Win**: 12,500x
- **Symboles**: L1-L5 (low), H1-H5 (high), W (Wild), S (Scatter), VS (VS Symbol)
- **Modes**: BASE (1x), ANTE (3x), BONUS (100x), BOUNTY (200x)
- **Free Spins**:
  - Classique (3 Scatters) → Sticky Wilds
  - Bounty (4+ Scatters) → VS Expand + Duel avec multiplicateurs additifs

---

## Phase 1 - Configuration de Base

> ⚠️ **Les valeurs ci-dessous sont des EXEMPLES (no-mercy).** Pour chaque nouveau jeu, dériver paylines / paytable / symboles / bet modes du **moteur math** — voir [⚠️ SOURCE DE VÉRITÉ - MOTEUR MATH](#️-source-de-vérité---moteur-math-rgsconfigts).

### 1.1 Board Config
- [ ] **Fichier**: `src/game/config/constants.ts`
- [ ] Passer `REELS` de 5 à 5 (inchangé)
- [ ] Passer `ROWS` de 3 à 5
- [ ] Ajuster `SYMBOL_SIZE` (à régler manuellement avec SymbolDebug)
- [ ] Ajuster `BOARD_WIDTH` et `BOARD_HEIGHT`
- [ ] Mettre à jour `initialBoard` pour 5x5

### 1.2 Symbols Mapping
- [ ] **Fichier**: `src/game/config/constants.ts`
- [ ] Définir les 13 symboles:
  ```
  Low:     L1 (10), L2 (J), L3 (Q), L4 (K), L5 (A)
  High:    H1 (ring), H2 (rock), H3 (sword), H4 (faux), H5 (axe)
  Special: W (Wild), S (Scatter), VS (VS Symbol)
  ```

### 1.3 Symbol Info Map
- [ ] **Fichier**: `src/game/config/constants.ts`
- [ ] Mapper chaque symbole à ses états:
  - `static`: sprite statique (atlas: `static_symbols`)
  - `spin`: même que static
  - `land`: animation Spine (atlas: `nmad`, json: `low_symbol_*.json` / `high_symbol_*.json`)
  - `win`: animation Spine
  - `postWinStatic`: sprite statique

### 1.4 Paylines
- [ ] **Fichier**: `src/game/rgs/config.ts`
- [ ] Remplacer les 20 paylines par les 15 nouvelles:
  ```javascript
  paylines: [
    [0, 0, 0, 0, 0],  // 1: Top row
    [1, 1, 1, 1, 1],  // 2: Second row
    [2, 2, 2, 2, 2],  // 3: Middle row
    [3, 3, 3, 3, 3],  // 4: Fourth row
    [4, 4, 4, 4, 4],  // 5: Bottom row
    [0, 1, 2, 1, 0],  // 6: V shape
    [4, 3, 2, 3, 4],  // 7: Inverted V
    [1, 0, 0, 0, 1],  // 8: Inverted U top
    [3, 4, 4, 4, 3],  // 9: U bottom
    [0, 0, 1, 2, 2],  // 10: Descending step
    [4, 4, 3, 2, 2],  // 11: Ascending step
    [1, 2, 2, 2, 1],  // 12: Small V
    [3, 2, 2, 2, 3],  // 13: Small inverted V
    [0, 1, 0, 1, 0],  // 14: Top zigzag
    [4, 3, 4, 3, 4],  // 15: Bottom zigzag
  ]
  ```

### 1.5 Paytable
- [ ] **Fichier**: `src/game/rgs/config.ts`
- [ ] Définir les paiements:
  ```
  W:  5x=40
  H1: 3x=4,  4x=20, 5x=40
  H2: 3x=2,  4x=10, 5x=20
  H3: 3x=2,  4x=10, 5x=20
  H4: 3x=1,  4x=5,  5x=10
  H5: 3x=1,  4x=5,  5x=10
  L5: 3x=0.2, 4x=1, 5x=2
  L4: 3x=0.2, 4x=1, 5x=2
  L3: 3x=0.2, 4x=1, 5x=2
  L2: 3x=0.2, 4x=1, 5x=2
  L1: 3x=0.2, 4x=1, 5x=2
  S:  scatter
  VS: special (bounty only)
  ```

### 1.6 Bet Modes
- [ ] **Fichier**: `src/game/config/betModeMeta.ts`
- [ ] Copier pattern de royale-cake
- [ ] Définir 4 modes:
  - `BASE`: 1x, normal
  - `ANTE`: 3x, type='activate', 3x plus de chances FS
  - `BONUS`: 100x, type='buy', Classique FS
  - `BOUNTY`: 200x, type='buy', Bounty FS

---

## Phase 2 - Assets

### 2.0 Shared Atlas Manager (IMPORTANT)
> **Pattern copié de royale-cake** - Permet d'injecter des régions d'un atlas partagé dans plusieurs Spine animations.
>
> **Note**: La classe `SharedAtlasManager` vient du package `pixi-svelte` du SDK. Dans l'app, on crée un wrapper qui re-exporte + crée le singleton.

- [ ] **Fichiers à créer** (copier structure de royale-cake):

  **`src/game/spine/SharedAtlasManager.ts`**:
  ```typescript
  export {
    SharedAtlasManager,
    type LoadSkeletonOptions,
    type SequenceMapping,
    type RegionMapping,
    type SharedAtlasConfig,
  } from 'pixi-svelte';
  import { SharedAtlasManager } from 'pixi-svelte';

  // Global singleton for this app
  export const sharedAtlasManager = new SharedAtlasManager();
  ```

  **`src/game/spine/index.ts`**:
  ```typescript
  export {
    SharedAtlasManager,
    sharedAtlasManager,
    type LoadSkeletonOptions,
    type SequenceMapping,
    type SharedAtlasConfig,
  } from './SharedAtlasManager';
  ```

  **`src/game/spine/sharedAtlasConfig.ts`** - Config spécifique à l'app

  **`src/components/SymbolsLoader.svelte`** - Charge les symboles avec injection

- [ ] **Configurations à définir dans `sharedAtlasConfig.ts`**:
  ```typescript
  import type { SharedAtlasConfig } from './SharedAtlasManager';
  import assets from '../assets';

  // Configuration pour les chiffres (duel + intro bonus)
  export const NUMBERS_CONFIG: SharedAtlasConfig = {
    atlasPath: assets.packNumberAtlas.src,
    imagePath: assets.packNumberImage.src,
    regions: [
      { sourceName: '0' }, { sourceName: '1' }, { sourceName: '2' },
      { sourceName: '3' }, { sourceName: '4' }, { sourceName: '5' },
      { sourceName: '6' }, { sourceName: '7' }, { sourceName: '8' },
      { sourceName: '9' },
    ],
  };

  // Si les symboles high ont besoin d'injection (effet de lumière, etc.)
  // Ajouter la config correspondante ici (ex: BANDE_LIGHT_CONFIG)
  ```

- [ ] **Symboles nécessitant Shared Atlas** (à vérifier avec les assets):
  ```typescript
  export const SYMBOLS_NEEDING_INJECTION = [
    'high_symbol_axe',
    'high_symbol_faux',
    'high_symbol_sword',
    'high_symbol_rock',
    'high_symbol_ring',
    // + potentiellement wild, scatter, vs
  ] as const;
  ```

- [ ] **SymbolsLoader.svelte** - Charge les symboles avec injection:
  ```typescript
  import { sharedAtlasManager } from '../game/spine';
  import { NUMBERS_CONFIG } from '../game/spine/sharedAtlasConfig';

  // 1. Enregistrer l'atlas partagé
  await sharedAtlasManager.registerSharedAtlas('numbers', NUMBERS_CONFIG);

  // 2. Charger les Spine avec injection
  const skeletonData = await sharedAtlasManager.loadSpine({
    atlasPath: SYMBOLS_ATLAS,
    imagePath: SYMBOLS_IMAGE,
    skeletonPath: symbolJsonPath,
    injectRegions: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    scale: 2,
  });

  // 3. Marquer comme initialisé
  sharedAtlasManager.setInitialized();
  ```

### 2.1 Assets Registry
- [ ] **Fichier**: `src/game/assets.ts`
- [ ] Nettoyer les anciens assets cactus-cash
- [ ] Référencer tous les assets de `static/assets/export_final/`

### 2.2 Symboles Statiques
- [ ] **Fichier**: `src/game/rgs/config.ts`
- [ ] Atlas: `symboles_static/static_symbols.atlas`
- [ ] Image: `symboles_static/static_symbols.webp`

### 2.3 Symboles Animés (Spine) - Via SymbolsLoader
- [ ] **Fichier**: `src/components/SymbolsLoader.svelte`
- [ ] Atlas partagé: `symboles/nmad.atlas`
- [ ] Image: `symboles/nmad.png`
- [ ] JSON par symbole:
  - `low_symbol_10.json`, `low_symbol_J.json`, `low_symbol_Q.json`, `low_symbol_K.json`, `low_symbol_A.json`
  - `high_symbol_axe.json`, `high_symbol_faux.json`, `high_symbol_sword.json`, `high_symbol_rock.json`, `high_symbol_ring.json`
  - `special_symbol_wild.json`, `special_symbol_scatter.json`, `special_symbol_vs.json`
- [ ] Utiliser `sharedAtlasManager.loadSpine()` pour les symboles high
- [ ] Injecter les régions nécessaires (chiffres, effets de lumière, etc.)

### 2.4 Background Animé
- [ ] **Fichier**: `src/game/assets.ts`
- [ ] Atlas: `background_animation/nmad.atlas`
- [ ] Images: `nmad.png`, `nmad_2.png`, `nmad_3.png`, `nmad_4.png`
- [ ] JSON: `background_animation/background.json`

### 2.5 Board Frame
- [ ] **Fichier**: `src/game/assets.ts`
- [ ] Atlas: `board_animation/nmad.atlas`
- [ ] Image: `board_animation/nmad.png`
- [ ] JSON: `board_animation/board.json`

### 2.6 Win Texts
- [ ] **Fichier**: `src/game/assets.ts`
- [ ] Atlas: `text_win/nmad.atlas`
- [ ] Image: `text_win/nmad.png`
- [ ] JSON: `nice_win.json`, `mega_win.json`, `epic_win.json`, `mythic_win.json`, `max_win.json`

### 2.7 Layout / HUD
- [ ] **Fichier**: `src/game/assets.ts`
- [ ] Référencer tous les assets de `layout/`:
  - Boutons: `play.webp`, `play_hover.webp`, `stop_autoplay.webp`, etc.
  - Backgrounds: `background_layout.webp`, `background_layout_mobile.webp`
  - Icons: `volume_button.webp`, `menu.webp`, `info_button.webp`, etc.
  - Bonus: `bonus.webp`, `bonus_hover.webp`
  - Popups: `popup.webp`, `popup_free_spin.webp`

### 2.8 Loading Screen
- [ ] **Fichier**: `src/game/assets.ts`
- [ ] `loading/full.webp`
- [ ] `loading/empty.webp`
- [ ] `loading/contour_loading_bar.webp`

### 2.9 Logo
- [ ] **Fichier**: `src/game/assets.ts`
- [ ] `logo/logo.webp`

### 2.10 Intro/Outro Bonus
- [ ] **Fichier**: `src/game/assets.ts`
- [ ] Atlas: `outro_intro_bonus/nmad.atlas`
- [ ] Image: `outro_intro_bonus/nmad.png`
- [ ] JSON: `intro_bonus.json`, `outro_bonus.json`

### 2.11 VS + Anticipation
- [ ] **Fichier**: `src/game/assets.ts`
- [ ] Atlas: `animation_vs_plus_anticipation/nmad.atlas`
- [ ] Image: `animation_vs_plus_anticipation/nmad.png`
- [ ] JSON: `animation_vs.json`, `anticipation.json`

### 2.12 Pack Chiffres (pour Duel)
- [ ] **Fichier**: `src/game/assets.ts`
- [ ] Atlas: `pack_chiffres/pack_number.atlas`
- [ ] Image: `pack_chiffres/pack_number.webp`

---

## Phase 3 - Event Handlers

> **📄 Voir `BACKEND_EVENTS_SPEC.md` pour la documentation complète des events et leur structure.**

### 3.1 Types et Handlers
- [ ] **Fichier**: `src/game/types/typesBookEvent.ts` - Définir les types
- [ ] **Fichier**: `src/game/handlers/bookEventHandlerMap.ts` - Implémenter les handlers

**Events à implémenter:**
| Event | Description |
|-------|-------------|
| `board-reveal` | Affiche le résultat du spin |
| `show-wins` | Affiche les combinaisons gagnantes |
| `fs-triggered` | Déclenche les free spins |
| `update-fs-amount` | Met à jour le compteur FS |
| `vsPositions` | Positions VS détectées (bounty) |
| `vs-expand` | Animation expansion VS (bounty) |
| `duel` | Animation duel (bounty) |
| `total-multiplier` | Multiplicateur total (bounty) |
| `newStickyWilds` | Nouveaux sticky wilds (classique) |
| `show-fs-spin-win` | Gain du spin FS |
| `show-fs-total-win` | Gain total FS (outro) |
| `show-final-win` | Gain final (big win) |

### 3.2 Win Levels
- [ ] **Fichier**: `src/game/config/winLevelMap.ts`
- [ ] Adapter les seuils:
  ```
  Level 0: nothing (0x)
  Level 1: nice (10x - 19x)
  Level 2: mega/big (20x - 49x)
  Level 3: epic (50x - 99x)
  Level 4: mythic/legendary (100x - 12499x)
  Level 5: max (12500x)
  ```

---

## Phase 4 - Composants UI

### 4.1 Background
- [ ] **Fichier**: `src/components/Background.svelte`
- [ ] Deux patterns possibles selon les assets livrés :

> **🔁 Pattern réutilisable — Background statique vs animé**
>
> **A. Statique** (pattern royale-cake / Space Mania) — un seul `.webp` plein écran, éventuellement + une couche `rock`/foreground en `.webp` à alpha :
> - Monté **hors `MainContainer`** (espace canvas, pas board), via `canvasSizes()`.
> - Fit "cover" : `scale = Math.max(canvas.width / IMG_W, canvas.height / IMG_H)`, `anchor 0.5`, centré.
> - `Rectangle` noir backstop en `zIndex:-4`, bg en `-3`, foreground rock en `-2`.
> - Asset : `type: 'sprite'`, `preload: true`. Pas de spine.
> ```svelte
> <Rectangle {...canvas} backgroundColor={0x000000} zIndex={-4} />
> <Sprite key="gameBackground" anchor={0.5} x={canvas.width/2} y={canvas.height/2} scale={bgScale} zIndex={-3} />
> <Sprite key="bgRock"        anchor={0.5} x={canvas.width/2} y={canvas.height/2} scale={bgScale} zIndex={-2} />
> ```
> **B. Spine animé** (pattern no-mercy) — deux `SpineProvider` (base/bonus) en crossfade alpha (`Tween`), `animationName` par gameType. Utiliser **seulement si** des skeletons de fond sont livrés.
>
> Choisir A si le graphiste ne livre que des `.webp` de fond ; B si un skeleton de background existe.

### 4.1bis Transition (pattern royale-cake — À REPRODUIRE 1:1)

> **🔁 Pattern réutilisable — Transition plein écran (wipe)**
>
> **Toujours faire comme royale-cake** (pas comme no-mercy : no-mercy joue le son dans le contrôleur et a une géométrie différente). Un **seul skeleton, une seule animation `'animation'`** ; les 3 moments (intro / base→bonus / bonus→base) jouent la **même** anim — c'est le flux autour qui change.
>
> **Asset** (`assets.ts`) : `transition` = `type:'spine'`, atlas + skeleton du dossier `transition/`. `scale` selon l'art (royale=2 ; convention projet =1).
>
> **2 composants** :
> - `TransitionAnimation.svelte` — renderer. `SpineProvider key="transition"`, `zIndex={1000}`, 1 `SpineTrack` trackIndex 0 `animationName='animation'`, listener `complete → oncomplete`. Pas de backdrop noir (le wipe couvre tout par son art).
>   - ⚠️ **Sizing = scale UNIFORME (une seule dimension), JAMAIS width+height.** Donner **`height` seul** (comme royale : `x=w/2, y=h*0.3, height=h*0.56`) → le `SpineProvider` scale l'art **uniformément** et **préserve son aspect**. 🚨 **Ne JAMAIS poser `width` ET `height` en même temps** (`width=canvas.w*k, height=canvas.h*k`) : ça scale les 2 axes indépendamment → **l'art est étiré / déformé**, invisible sur desktop 16:9 (w et h proches) mais **flagrant en portrait mobile** (`w ≪ h`). Bug vécu Space Mania.
>   - **Couverture** : l'AABB transi a souvent du **vide autour de l'art** → fitter à la hauteur exacte rend l'art trop petit. Booster : `height = canvas.height * HEIGHT_FILL` avec `HEIGHT_FILL > 1` (un gros boost garantit aussi que la **largeur** est couverte, puisque le scale est uniforme). Centrer (`x=w/2, y=h/2`). **Calibrer `HEIGHT_FILL` à l'œil** (hot reload, `DEBUG=true` dans `Transition.svelte` puis `false`). Si l'art du projet est calibré (comme royale) → pas de boost, juste `height=h*0.56`. Space Mania : transi 4383×3009, **`HEIGHT_FILL = 2.5`** (height only).
> - `Transition.svelte` — contrôleur. Exporte `EmitterEventTransition = { type: 'transition' }`. `subscribeOnMount({ transition: async () => { transitioning = true; await waitForResolve(r => oncomplete = r); } })`. `{#if transitioning}{#key animationKey}<TransitionAnimation oncomplete={handleComplete}/>`. **Async-bloquant** : le `broadcastAsync` ne résout qu'au `complete` de la spine. **Aucun son ici.**
>
> **Montage** : `<Transition />` = **dernier enfant de `<App>`**, hors des branches `{#if loading}` (dispo pendant le loading pour l'intro). zIndex 1000 → au-dessus de tout.
>
> **Type emitter** : ajouter `EmitterEventTransition` à l'union dans `typesEmitterEvent.ts`.
>
> **Pattern de déclenchement (identique aux 3 sites)** :
> ```ts
> // (option) await broadcastAsync({ type: 'uiHide' })
> broadcast({ type: 'soundOnce', name: 'sfx_transition' });        // son au CALL SITE
> const p = broadcastAsync({ type: 'transition' });                 // démarre le wipe
> await new Promise(r => setTimeout(r, 1300));                       // attendre que ça couvre (fixe, NON turbo-scalé)
> stateGame.gameType = 'freegame';                                  // swap CACHÉ derrière le wipe (+ bg/musique)
> await p;                                                           // attendre la fin (uncover)
> ```
> - **Intro** : depuis `LoadingScreen` (sur "press to continue") → après le sleep 1300, appeler `props.onloaded()` (révèle le board pré-monté en `alpha 0`) puis `await p`.
> - **base→bonus / bonus→base** : depuis `bookEventHandlerMap.ts`. bonus→base swap aussi la musique (`bgm_main`).
> - ⚠️ **PAS de transition sur retrigger FS** (déjà en freegame).
> - 🚨 **Anti-freeze au reveal — PRÉ-MONTER TOUT le visuel invisible pendant le loading.** Si on gate tout le contenu de jeu sur `{#if allAssetsLoaded && !showLoadingScreen}`, alors **tout monte d'un coup** au moment où le loading disparaît = **pendant le wipe** → gros freeze (board + hud + char + effets + spines se construisent en un frame). Fix royale-cake = **découper en deux** :
>   - **Visuel** (board, hud, char, rock, effets, logo, overlays…) → `{#if allAssetsLoaded}` **enveloppé** dans `<Container alpha={showLoadingScreen ? 0 : 1}>`. Il se **construit derrière le loading screen** (alpha 0), donc au reveal il est **déjà monté** → juste `alpha→1`, zéro freeze. (Les effets lourds type Effekseer/WebGPU se construisent aussi pendant le loading = bonus.)
>   - **Logique de démarrage** (`<OnMount onmount={handleGameStart}/>` qui lance l'anim board, `<ResumeBet/>`, et `<Sound/>` qui exige le geste pour l'audio) → reste sous `{#if allAssetsLoaded && !showLoadingScreen}` = ne se déclenche **qu'au reveal**. Ne PAS pré-monter ça (sinon spin/son partent pendant le loading).
>   - Réf : `Game.svelte` (Space Mania + royale-cake). ⚠️ Vérifier que les composants visuels pré-montés ne lancent **pas** d'anim/son dans leur propre `onMount` (l'anim board doit être déclenchée par `handleGameStart`, pas par le mount du `Board`).
>
> **Statut Space Mania** : système (asset + 2 composants royale-exact + montage + type) en place. **Câblage des 3 call-sites en attente** : intro = rework loading-flow ; base↔bonus = handlers Phase 3.

### 4.1ter ❓ QUESTION À POSER À L'USER — Page de règles / flux de lancement

> Demander **dès le début** : *le projet a-t-il une page de règles (rules page) entre le loading et le jeu, ou pas ?*
>
> - **Avec rules page** (no-mercy) : `LoadingScreen.onloaded` → `showLoadingScreen=false` + `showRulesPage=true` → `<RulesPage oncontinue=...>` → puis le contenu de jeu. Le clic sur la page débloque l'AudioContext (geste utilisateur requis pour le son).
> - **Sans rules page** (royale-cake / **Space Mania**) : `LoadingScreen.onloaded` → `showLoadingScreen=false` → **contenu de jeu direct**. Pas de `showRulesPage`, pas d'import `RulesPage`, gate de contenu = `allAssetsLoaded && !showLoadingScreen`. (Le déblocage audio se fait alors au 1er clic / via le press-to-continue du loading.)
>
> Retirer proprement : la variable `showRulesPage`, l'import + le mount `RulesPage`, et `&& !showRulesPage` dans la gate.
>
> ⚠️ **Gotcha AudioContext** : si on retire la rules page SANS mettre le **press-to-continue** du loading, le son auto-play (musique dans `Sound.svelte`) part **sans geste utilisateur** → bloqué Chrome (`The AudioContext was not allowed to start`). Le modèle royale exige le press-to-continue : `LoadingScreen` montre un sprite `pressContinue` pulsant quand `isAllLoaded`, + `<PressToContinue onpress={startTransition}/>` (`OnPressFullScreen` + `OnHotkey Space`). Le clic/Espace = le geste qui débloque l'AudioContext ; `startTransition` enchaîne sfx + transition intro + `onloaded`. `<Sound/>` doit être monté **après** `!showLoadingScreen` (donc après le geste).

### 4.2 Board
- [ ] **Fichier**: `src/components/board/Board.svelte`
- [ ] Adapter pour 5 lignes au lieu de 3
- [ ] Vérifier le calcul des positions

### 4.3 BoardFrame

> **❓ QUESTION À POSER À L'USER EN DÉBUT DE PROJET — Type de board-reveal**
>
> Avant de câbler `BoardFrame`, **demander quel modèle de reveal** le projet utilise (dépend des assets livrés) :
>
> - **Modèle A — entrée/sortie animée (no-mercy)** : le board a 2 anims `animation_start` (descente) / `animation_end` (remontée). `BoardFrame` a une state-machine `hidden→animating_start→visible→animating_end`, broadcast `boardReady` à la fin de `animation_start`. Reveal base↔bonus = ces anims. **PAS de transition plein écran.**
> - **Modèle B — board permanent + transition (royale-cake)** : le board n'a **pas** d'anim d'entrée/sortie. Soit un `Sprite` statique (royale), soit un **Spine qui loope une seule anim `animation`** (Space Mania). Il est **toujours affiché**. Le reveal intro + base↔bonus est fait par la **Transition plein écran** (cf §4.1bis). Le swap `gameType`/bg se fait **caché derrière le wipe** (au point de couverture ~1300ms).
>
> **Câblage Modèle B** (Space Mania) :
> - `BoardFrame` : rendu toujours, `<SpineTrack animationName="animation" loop={true} />`. `boardKey='board'` (skeleton unique, pas de split mobile).
> - Garder les events `boardAnimationStart`/`boardAnimationEnd` MAIS les résoudre **instantanément** (broadcast `boardReady`/`boardNotReady` direct, **aucune** anim) — le flux game-start + handlers bonus les broadcast encore, donc ne pas les supprimer.
> - Le board n'a **pas** de gate "attendre la descente" : seul `allAssetsLoaded` + les promesses `enhancedBoard.preSpin/spin` gardent le spin.
> - `Anticipation` : 1 seul track `animationName="animation"` loop (pas `anticipation`+`new` de no-mercy).
> - ⚠️ Vérifier les **noms d'anim réels** du skeleton livré (`payline` = `1..15`, `board`/`anticipation` = `animation` en Space Mania) avant de câbler — ne jamais supposer.

### 4.3bis ⚠️ Version Spine — runtime vs exports (gotcha réutilisable)

> Le runtime (`@esotericsoftware/spine-pixi-v8` + `spine-core`, voir `package.json`) et **chaque skeleton exporté doivent être compatibles en version**. Vérifier le champ `skeleton.spine` de chaque `.json` :
> ```bash
> python -c "import json,glob;[print(json.load(open(f))['skeleton'].get('spine','?'),f) for f in glob.glob('static/assets/**/*.json',recursive=True) if isinstance(json.load(open(f)).get('skeleton'),dict)]"
> ```
> - Un runtime **4.3** lit le **4.3** et rétro-lit le **4.2 sans path constraints**. Mais un skeleton **4.2 AVEC path constraints** **désync** sur un runtime 4.3 → erreur `Path constraint not found: <nom>` dans `readAnimation` (le parser lit un mauvais compteur). Symptôme typique de version mismatch.
> - Pendant la **beta 4.3**, le format JSON a changé **entre patches** (4.3.08 / 4.3.17 ≠ 4.3.3) — viser **une seule version** runtime + tous les exports.
> - **Action si erreurs** : aligner. Soit bumper le runtime sur la version des exports, soit réexporter tous les skeletons sur la version du runtime. Ne pas mélanger.
> - Space Mania : runtime **4.3.3** ; assets réels **4.3.08/4.3.17** (OK structurellement) ; les `export_final` **4.2.43 avec path constraints** (payline/anticipation) plantaient → résolus en repointant vers les vrais assets 4.3.

### 4.4 Symbol
- [ ] **Fichier**: `src/components/symbol/Symbol.svelte`
- [ ] Vérifier compatibilité avec nouveaux symboles
- [ ] Tester avec SymbolDebug pour ajuster les tailles

### 4.5 StickyWildsOverlay
- [ ] **Fichier**: `src/components/board/StickyWildsOverlay.svelte`
- [ ] Adapter pour grille 5x5
- [ ] Utiliser nouvel asset sticky wild

### 4.5bis FreeSpinCounter ("free spins left")

> **🔁 Pattern réutilisable — compteur FS (royale-cake)**
>
> Copier `royale-cake/components/freespin/FreeSpinCounter.svelte` tel quel. Affiche un fond + 2 chiffres (dizaines/unités) du nb de FS restants.
> - **Assets** : `freeSpinsLeft` (`type:'sprite'`, fond/label) + `numbers` (`type:'sprites'` → spritesheet pixi `numbers.json`, frames `roulette_0..9` + `roulette_comma/dot/x`). Les clés chiffres = `` `roulette_${digit}` `` (résolues par le loader sprites).
> - **State local** : `show`/`current`/`total` mis à jour par les events `freeSpinCounterShow`/`Hide`/`Update{current,total}` (déjà broadcast par `bookEventHandlerMap`). `freeSpinsLeft = max(0, total-current)`.
> - **Type** : exporter `EmitterEventFreeSpinCounter` + l'ajouter à l'union `typesEmitterEvent.ts`.
> - **Montage** : `<FreeSpinCounter/>` dans `Game.svelte` (près de FreeSpinIntro/Outro). Placement responsive (mobile/popout/desktop) + `frameScale` calibrable.
> - ⚠️ Si le `.atlas` libgdx des chiffres n'est pas déjà converti, le convertir en spritesheet pixi `.json` (cf §CONVERSION ATLAS). Space Mania : `numbers/numbers.json` déjà au format pixi.

### 4.6 HudPixi
- [ ] **Fichier**: `src/components/hud/HudPixi.svelte`

> **🔁 Pattern réutilisable — Porter le HUD depuis un projet frère**
>
> Le HUD se **copie depuis un projet existant** (`royale-cake-front/src/components/hud/`) plutôt que réécrit. Fichiers : `HudPixi.svelte` (composition top-level montée par `Game.svelte`) + sous-panneaux `HudBetPanel`, `HudAutoPlayPanel`, `HudVolumePopover`, `HudMobileMenu`, `HudSpeedButton`.
>
> **Découplage assets ↔ code** : le code et les assets peuvent venir de projets différents. Ex Space Mania = code royale-cake + assets PNG cactus-cash (`static/assets/hud/`). Les clés `assets.ts` (`hudPlay`, `hudBonus`, `hudArrowUp`, …, ~31 clés) restent identiques ; seul le `src` pointe vers les PNG du projet.
>
> **State local requis** (`game/state/stateGame.svelte.ts`) : `stateSpeed{level}` (0/1/2 normal/fast/turbo), `stateSpin{stopRequested, savedIsTurbo}`, `stateHudPopup{isOpen, buyBonusOpen}`. Déjà présents si dérivé de no-mercy.
>
> **Adaptations obligatoires lors du portage** (sinon ne compile pas / faux comportement) :
> 1. **Win affiché** : remplacer toute source spécifique (royale = `tumbleWinState.amount`, tumble) par `stateBet.winBookEventAmount` formaté via `bookEventAmountToCurrencyString`. Capper à `min(win, maxWinAmount)`.
> 2. **Bannière mode activable** : ne pas hardcoder le texte. Dériver de `stateBetDerived.activeBetMode()?.text?.title` (`betModeMeta` expose `text.title`) → `` `${title} ACTIVATED` ``. Gère plusieurs toggles (ante, feature) génériquement. `handleDisableFeature` = reset `activeBetModeKey='BASE'`.
> 3. **Max win** : remplacer la constante du projet source par le `maxWin`/`maxWinX` cible (Space Mania = 12500).
> 4. Couleurs/magic-numbers de layout = placeholders, calibrer ensuite.
> 5. Drop tout import du projet source non résolu ici (refs character, `stateMeta` inutilisé…).
>
> **`AutoSpinMessagePopup`** (modal pixi gold de royale) : ne PAS porter si le projet a déjà un `info/AutoSpinMessageModal.svelte` (HTML) fonctionnel — il gère aussi `source:'manual'` que la version pixi ignore. Sinon le porter nécessite d'ajouter les méthodes i18n (`ok`/`lossLimitReached`/…) absentes.

### 4.7 BuyBonusPanel

> **🔁 Pattern réutilisable — panneau d'achat de bonus**
>
> 1 carte par mode achetable/activable, **piloté par `betModeMeta`** (pas de valeurs en dur). Structure : sélection (cartes côte-à-côte desktop / scroll vertical mobile) → popup de confirmation → bouton d'achat. Bet-selector (+/-) + croix intégrés.
> - **Demander à l'user combien de cartes + quel mode chaque carte** (Space Mania = 4 : `ante`/`feature`/`bonus1`/`bonus2`). NE PAS supposer le mapping art↔mode.
> - **Assets** : 1 image **sélection** (small) + 1 image **confirmation** (big) par carte → clés `buyBonusCard<Mode>` / `buyBonusCardConfirm<Mode>`. (Convention small=buy / big=confirm.)
> - **Coûts** : `stateMeta.betModeMeta[key].costMultiplier * stateBet.betAmount`. **Textes** (title/description/dialog/button) : depuis `betModeMeta[key].text` — pas de strings dupliqués.
> - **Dispatch** (`handleConfirm`) : `stateBet.activeBetModeKey = <key>` puis brancher sur `stateBetDerived.activeBetMode()?.type` : `'buy'` → `broadcast({type:'bet'})` ; `'activate'` → set `autoSpinsLossLimitText`/`autoSpinsSingleWinLimitText = INFINITY_MARK`. (Le `type` de chaque mode est dans `betModeMeta` : ante/feature=`activate`, bonus1/bonus2=`buy`.) ⚠️ **Vérifier que les clés dispatchées existent** dans `rgs/config.ts`/`betModeMeta` (bug classique hérité : émettre `bonus`/`bounty` inexistants).
> - **Social** : `stateUrlDerived.social()` → swap `bet`→`play`, `buy`→`get` dans tout texte.
> - **Calibration** : largeur/hauteur d'art carte = constantes placeholder (`CARD_SPACING`, `CARD_IMG_HEIGHT`), à régler à l'œil (hot reload). **Placement du texte (titre/desc/prix) : NE PAS empiler des offsets Y en dur** — utiliser le système flexbox `<Flex>` (cf. §4.7bis) : 1 « box » par carte, le stack se distribue tout seul + reflow i18n.

**Structure des assets Buy Bonus:**
- [ ] Vérifier les assets disponibles dans `buy_bonus/` ou `layout/`
- [ ] Assets nécessaires pour chaque mode:
  | Asset | Exemple fichier | Usage |
  |-------|-----------------|-------|
  | Card mode 1 | `popup_mode1.webp` | Carte de sélection |
  | Card mode 2 | `popup_mode2.webp` | Carte de sélection |
  | Card mode 3 | `popup_mode3.webp` | Carte de sélection |
  | Confirm mode 1 | `confirmation_mode1.webp` | Carte de confirmation |
  | Confirm mode 2 | `confirmation_mode2.webp` | Carte de confirmation |
  | Confirm mode 3 | `confirmation_mode3.webp` | Carte de confirmation |
  | Close button | `croix.webp` | Fermer le panel |

- [ ] Déclarer les assets dans `assets.ts`:
  ```typescript
  buyBonusCardMode1: { type: 'sprite', src: new URL('.../popup_mode1.webp', import.meta.url).href },
  buyBonusCardMode2: { type: 'sprite', src: new URL('.../popup_mode2.webp', import.meta.url).href },
  buyBonusCardMode3: { type: 'sprite', src: new URL('.../popup_mode3.webp', import.meta.url).href },
  buyBonusCardConfirmMode1: { type: 'sprite', src: new URL('.../confirmation_mode1.webp', import.meta.url).href },
  // etc.
  buyBonusClose: { type: 'sprite', src: new URL('.../croix.webp', import.meta.url).href },
  ```

**Configuration des modes (3 typiquement):**
- [ ] Mode ANTE (multiplicateur mise, ex: 3x) - type `activate`
- [ ] Mode Bonus standard (achat direct, ex: 100x) - type `buy`
- [ ] Mode Bonus premium (achat direct, ex: 200x) - type `buy`

**Textes et descriptions:**
- [ ] Définir les textes pour chaque mode:
  ```typescript
  const TEXTS = {
    MODE1: { title: 'NOM MODE 1', desc: 'Description...', btnText: 'SPIN' },
    MODE2: { title: 'NOM MODE 2', desc: 'Description...', btnText: 'BUY' },
    MODE3: { title: 'NOM MODE 3', desc: 'Description...', btnText: 'BUY' },
  };
  ```

**Support Social Mode (obligatoire):**
- [ ] **VOIR SECTION "SOCIAL MODE - MOTS INTERDITS" CI-DESSUS**
- [ ] Vérifier tous les textes du panel contre la liste des mots interdits
- [ ] Utiliser `context.stateUrlDerived.social()` pour conditionner les textes

**Polices (à adapter selon le projet):**
- [ ] Titre des cartes: police bold du projet (ex: 'Arial Rounded')
- [ ] Descriptions: police normale (ex: 'Segoe UI')
- [ ] Vérifier les polices chargées dans `assets.ts` et leur nom exact

### 4.7bis ⭐ Placement de texte en flexbox (`@pixi/layout` + `<Flex>`) — RÉUTILISABLE

> **Problème générique** : du texte (titre/desc/prix, boutons, labels) posé **par-dessus une image** dont la zone blanche **diffère d'une carte/popup à l'autre**, et qui doit **reflow en i18n** (17 langues : titres allemands ~1.8× plus longs, arabe, CJK). Des offsets Y en dur (`y = bottom - 170`) cassent : ils supposent une longueur de texte fixe → collision titre/desc dès qu'une langue déborde, et il faut re-régler par carte ET par langue. **Ne jamais empiler des offsets Y en dur pour un stack de texte multi-langue.**
>
> **Solution SDK (flexbox Yoga)** : `@pixi/layout` (moteur Yoga, le même que React Native) branché dans `pixi-svelte`. On définit **une box par carte** ; le flexbox distribue le stack tout seul et reflow automatiquement.

**Setup (une fois, dans le SDK `pixi-svelte`) :**
- **Deps** : `@pixi/layout` + peer `yoga-layout` dans `packages/pixi-svelte/package.json` (versions alignées, ex. `3.2.1` ; `@pixi/layout` peer = `pixi.js ^8`).
- **Init** : `import '@pixi/layout';` (side-effect) **en tête de `InitialiseApplication.svelte`** — applique les mixins Yoga sur `Container`/`Sprite`/`Text` **avant** toute création d'objet PIXI. Ajoute la prop `layout`.
- **Binding gratuit** : `propsSyncEffect` de pixi-svelte fait `target[key] = props[key]` pour **toute** prop → un `<Container layout={...}>` pose `container.layout`. Marche sur `Container`/`Text`/`Sprite` sans wrapper spécial.
- **Wrapper `<Flex>`** (`pixi-svelte/src/lib/components/Flex.svelte`, exporté depuis l'index) : `Container` avec défaut `{ display:'flex', flexDirection:'column' }` ; la prop `layout` du caller **merge** par-dessus. C'est l'asset réutilisable (le lib = juste le moteur).

**Pattern d'usage (stack de texte dans une box par carte) :**
```svelte
<Flex
  x={-flexW / 2}                                  {/* box centrée sur la carte */}
  y={cardBottomY - card.box.topFromBottom}         {/* haut de la box, mesuré du bas de l'art */}
  layout={{ width: flexW, height: card.box.height, justifyContent: 'space-between', alignItems: 'center' }}
>
  <Text anchor={0} layout={true} text={title} style={titleStyle} />
  <Text anchor={0} layout={true} text={desc}  style={descStyle} />
  <Text anchor={0} layout={true} text={price} style={priceStyle} />
</Flex>
```
- **Config par carte** : une seule box `{ topFromBottom, height }` par carte (regroupées dans un bloc `🎛️ CONFIG` en haut du composant) → c'est le SEUL truc à calibrer pour compenser les zones blanches inégales. `topFromBottom` = distance bas-de-l'art → haut-de-box (↑ = box monte) ; `height` = hauteur (↑ = items plus écartés via `space-between`).
- **Largeur** = fraction de la largeur d'art (`flexW = ART_W * scale * 0.82`) → sert aussi de `wordWrapWidth` (le texte wrap dedans).
- **Responsive** : les valeurs de box sont en unités « display desktop » ; multiplier par le facteur d'échelle mobile (`oS`) / confirm (`cS`). Une box **partagée** desktop+mobile suffit en général (se propage proportionnellement).
- ⚠️ **Anchor vs Yoga** : Yoga positionne depuis le **top-left**. Sur les enfants `<Text>` mettre `anchor={0}` (pas `0.5`) + centrage via `alignItems:'center'` (Flex) et `align:'center'` (style). Un `anchor={0.5}` sous layout décale le texte d'une demi-hauteur.
- **`justifyContent`** : `'space-between'` = titre collé haut / prix collé bas / desc au milieu (idéal reflow). Alternatives : `'center'` + `gap`, `'flex-start'` + `gap`.

**Première implé** : `space-mania-front` BuyBonusPanel (cartes sélection desktop+mobile + popup confirm). Réutiliser ce pattern pour tout stack de texte sur art (popups, win dialogs, HUD labels).

### 4.8 FreeSpinIntro
- [ ] **Fichier**: `src/components/freespin/FreeSpinIntro.svelte`
- [ ] Utiliser `outro_intro_bonus/intro_bonus.json`
- [ ] Afficher le mode (Classique ou Bounty)
- [ ] Intégrer les slots chiffres pour le nombre de FS

### 4.9 FreeSpinOutro
- [ ] **Fichier**: `src/components/freespin/FreeSpinOutro.svelte`
- [ ] Utiliser `outro_intro_bonus/outro_bonus.json`
- [ ] Afficher le gain total

### 4.10 FreeSpinCounter
- [ ] **Fichier**: `src/components/freespin/FreeSpinCounter.svelte`
- [ ] Adapter pour les 2 modes
- [ ] Utiliser `layout/popup_free_spin.webp`

### 4.10bis ⭐ Flux du RETRIGGER (free spins) — RÉUTILISABLE

> **🛑 AVANT de coder le retrigger : DEMANDER À L'USER ce qu'on fait.** Le comportement visuel du retrigger n'est **pas** déductible : ça varie par jeu (petit overlay « +X » discret, vs. rejouer l'anim d'intro bonus complète, vs. rien). **Ne jamais décider seul.** Deux choses à clarifier avec l'user :
> 1. **La RÈGLE math** : retrigger par scatter (chaque scatter +N) OU seuil (≥K scatters → +N flat) ? → c'est une règle **math** (`scatterToFreespins[FREE_SPINS]` + gate dans `onHandleGameFlow`), pas front. Vérifier que math ⟷ spec ⟷ InfoModal concordent (bug vécu Space Mania : math faisait « +5 par scatter » alors que voulu « ≥3 scatters → +5 flat »).
> 2. **Le COMPORTEMENT visuel** : quoi afficher, et **quel nombre** (le montant ajouté, ex. +5, OU le nouveau total) ?

**Pattern de référence (royale-cake `fs-retriggered`) — rejoue l'intro bonus :**
1. **Anim WIN des scatters** : dim des autres symboles + animer les symboles scatter (leur anim win), attendre la fin. (royale ajoute un overlay sombre + une pose perso.)
2. **Splash intro bonus, SANS transition** (on est déjà en freegame — pas de wipe base→bonus) : `uiHide` → `freeSpinIntroShow` → `freeSpinIntroUpdate` (press-to-continue) → `freeSpinIntroHide`.
3. **Restore** : compteur FS remis à jour + `uiShow`.

**Implé Space Mania (`fs-retrigger` handler) :**
- Le splash `FreeSpinAnimation` **rend `stateUi.freeSpinCounterTotal`** → pour afficher le montant ajouté, poser `stateUi.freeSpinCounterTotal = bookEvent.extraSpins` **avant** `freeSpinIntroShow`, puis le remettre à `bookEvent.totalFs` (nouveau grand total) après `freeSpinIntroHide` + `freeSpinCounterUpdate`.
- ⚠️ Space Mania affiche **le montant ajouté (+5)** dans l'intro (choix user), pas le nouveau total (léger écart vs royale qui montre `fs`). **→ toujours reconfirmer ce choix avec l'user.**
- Pas de transition (déjà freegame) ; l'ancien overlay « +X » (`showRetriggerOverlay`) est remplacé par le splash.
- Single-digit : `FreeSpinNumberSlots` affiche 2 chiffres → « 05 » pour 5 (masquer le tens si 0 si voulu).

### 4.11 Win Animations
- [ ] **Fichier**: `src/components/win/Win.svelte`
- [ ] Pointer vers nouveaux assets `text_win/`
- [ ] Mapper les niveaux: nice, mega, epic, mythic, max

### 4.12 ⭐ Board juice (mouvements du board : pop / bounce / shake) — RÉUTILISABLE

> **🛑 AVANT de coder : DEMANDER À L'USER quand il veut des effets ET de quel type.** Le juice du board (les petits mouvements « à la Stake ») n'est **pas** déductible — ça se décide **avec** l'user, jamais seul :
> 1. **QUAND** (moments déclencheurs) : combinaison gagnante, gros win (seuil), arrêt des reels, impact laser/expand, atterrissage multiplicateur, trigger bonus… (liste à cocher avec l'user).
> 2. **QUEL TYPE** : `pop` (scale depuis le centre), `bounce` (impulsion positionnelle), `shake`…
> 3. **PORTÉE** : cadre + grille ensemble, ou grille seule.
>
> ⚠️ **Piège vécu (Space Mania)** : un effet qui semble une bonne idée peut être **gênant en jeu** (ex. un settle-bounce à *chaque* spin = fatigant). → proposer, **faire tester**, retirer si ça gêne. Ne pas imposer.

**Archi (propre, réutilisable) :**
- **State** `stateBoardMotion.svelte.ts` : des **springs Svelte** partagés (`boardScale` défaut 1, `boardOffset` défaut {0,0}) + helpers `boardPop(intensity)` / `boardBounce(dy)` / `boardShake(...)`. Le spring donne le rebond/overshoot naturel **sans courbes à régler**.
- **Wrapper** `BoardMotion.svelte` : un `<Container>` monté **DANS un `<MainContainer>`** (board-space), `pivot = boardLayout()` (= centre board), `x/y = centre + $boardOffset`, `scale = $boardScale`, `sortableChildren`. Il enveloppe le **bloc board** (frame + grille passés en `children`) → pop **depuis le centre**, tout bouge ensemble. Board-space pur (pas de math canvas).
- **Montage** : fusionner frame + grille sous **UNE** `<MainContainer><BoardMotion>` (frame `zIndex 0`, grille `zIndex 1` en interne). Les décors HORS board (rock écran, perso, hud) restent **dehors** → ne bougent pas.
- **Triggers** : appeler les helpers depuis les handlers existants (aucune réécriture). Ex. `boardPop(...)` par **win group** dans la boucle `playWinSequence` (intensité selon `group.totalFinalPayout`).

**🎛️ Réglage du `pop` (smooth) :**
- 🚨 **Ne PAS faire un `.set(peak, { hard: true })`** (saut instantané) puis retour : ça donne un pop **sec/brutal**. Faire **ease UP** (`boardScale.set(1 + intensity)`, sans `hard`) → **hold** `POP_HOLD_MS` → **ease DOWN** (`set(1)`), avec un `clearTimeout` du pop précédent.
- Knobs : `intensity` (amplitude, ex. 0.03→0.06 selon win level) · `POP_HOLD_MS` (temps au peak, ↑ = plus lent/smooth) · spring `stiffness` (↓ = plus doux) · `damping` (↑ = moins de wobble). Repère smooth : `stiffness 0.06`, `damping 0.65`, `POP_HOLD_MS ~180`.
- Réf : `stateBoardMotion.svelte.ts` + `BoardMotion.svelte` (Space Mania).

---

## Phase 5 - Features Spécifiques

### 5.0 — PATTERN EXPAND (RÉUTILISABLE — à lire avant TOUTE feature d'expansion)

Toute feature où des cellules deviennent Wild via une animation (VS-expand de no-mercy, Remplisseur/laser Vaisseau de Space Mania, futur jeu avec expansion, sticky-expand, etc.) suit **ce pattern**. Ne pas réinventer, ne pas décider seul d'un autre fonctionnement.

#### 🚨 Règle d'or — EXPAND = ANIMATION SEULE, JAMAIS de mutation du board
- Le handler de l'event d'expand **ne doit JAMAIS muter le board** : **pas** de `rawSymbol.name = 'W'`, **pas** de changement de `symbolState` sur les cellules expand.
- **Le visuel des Wilds = uniquement l'art du spine** de l'animation d'expand. Muter le board ⇒ des sprites Wild qui **poppent** par-dessus/à la place des symboles d'origine = **BUG visuel**.
- **Le calcul des gains = `isWild`** porté par chaque `EnrichedCombinationPosition` de `show-wins` (le math envoie déjà l'info). Le front n'a **pas** besoin que le board contienne les `W`.

#### Mécanisme de référence (no-mercy — l'expand porté par le SYMBOLE)
Utilisé quand l'anim d'expand tient dans **une seule animation** jouée par le symbole spécial lui-même :
1. **`board-reveal`** : `clearVSExpand()` puis `setVSExpandColumns(bookEvent.expandedVS)` — stocke juste *quelles colonnes vont s'expand* (state `stateVSExpand.columnsToExpand`). N'anime rien.
2. **`onSymbolLand`** (au land de chaque reel) : si `rawSymbol.name === 'VS'` ET sa colonne est dans `columnsToExpand` → trouver le symbole VS du reel → `vsSymbol.symbolState = 'win'`. Le spine *win* du symbole **EST** le visuel de la colonne wild expand. (Déclenché on-land, pas à la fin du spin.)
3. **`vs-expand` handler** : **no-op total** (l'anim est déjà partie on-land ; l'event existe pour l'ordre/compat).
4. Board **jamais muté**. Nettoyage de l'overlay/expand au prochain `board-reveal` (et `clearVSExpand()` à la transition bonus).

#### Variante multi-phase / dépendante de la position (Space Mania — overlay dédié)
À utiliser **uniquement** quand l'anim d'expand **ne tient pas** dans une seule `animationName` du symbole (machine de phases, longueur dépendant de la position, etc.). Ex. laser Vaisseau : phases `Onland → Start → laserstart{n} → idle` avec `n` = nb de lignes sous le Remplisseur ; **idle = 2 tracks simultanés** (track0 `Idle` + track1 `laseridle{n}`).
- Un **overlay spine dédié** par colonne (`FillExpand.svelte` container + `FillLaser.svelte` machine de phases), pattern repris de `Duels.svelte`/`DuelAnimation.svelte`.
- **Trigger ON LAND** (comme le VS no-mercy) : `board-reveal` `setFillPending(expandedColumns)` AVANT le spin ; `onSymbolLand` déclenche `triggerFillLaser(col, fromRow)` quand le Remplisseur atterrit dans une colonne pending. → démarre pendant l'arrêt des reels (pas de latence post-spin).
- **Gate des wins = handler `await` (analogue du `duel`)** : `stateFillExpand.isBlockingSpin=true; await waitFillLaser(column); =false`. Comme les events `fill-expand` sont séquentiels avant `show-wins`, **tous** les lasers ont fini leur intro avant les paylines/wins. `onFillLaserReady(column)` (appelé quand le laser atteint idle) résout l'attente ; `waitFillLaser` résout immédiatement si déjà prêt / pas de laser (jamais de hang).
- **Skip** (§SKIP MECHANICS) : `FillExpand` capture `columnsToSkip` (Set des colonnes actives) sur `stopButtonClick` → `FillLaser` saute **direct à idle** (pas de SKIP_TO_TIME) → `onFillLaserReady` débloque. Bouton play : check `stateFillExpand.isBlockingSpin` (comme `stateDuel.isBlockingSpin`).
- **Disparition au nouveau spin = FADE-OUT** (comme no-mercy `fadeOutDuels`/`clearDuels`, jamais de clear instantané) : `board-reveal` `fadeOutFillLasers()` → `FadeContainer` par laser (200ms) → `clearFadedFillLaser()` au complete. Transition bonus = clear dur. Collision (colonne re-expand pendant le fade) gérée dans `triggerFillLaser` (remove old + add fresh, comme `duelPlay`).
- **La règle d'or reste identique** : board **jamais** muté. Cellules `fromRow..bas` rétrécies (scale→0) pendant `laserstart`.
- Positionnement board-space via `BoardContainer` + `getSymbolX/getSymbolY` (voir section POSITIONNEMENT). `SCALE`/`OFFSET` = placeholders à calibrer avec un debug live.

#### Côté MATH — participation = NIVEAU COLONNE (jamais case-exacte)
Pour décider *quelles* colonnes s'expand, le moteur évalue les wins sur un board temp où tous les candidats expand, puis garde une colonne si **une position gagnante quelconque tombe sur cette colonne** (`sym.reelIndex === column`), comme `canFormWinningCombination` de no-mercy. **NE PAS** tester la case exacte du symbole spécial (`reelIndex === col && posIndex === row`) : les combos gagnantes sont **ancrées à gauche et contiguës** (reels 0..K-1), donc une combo qui justifie la colonne C traverse forcément toutes les colonnes D<C dont elle dépend → elles participent aussi → ensemble cohérent. Le test case-exacte casse cette cohérence : une colonne peut s'expand grâce au wild d'un autre filler **non appliqué** (sa propre case ne gagnait pas) → colonne expand **sans aucune ligne gagnante** = BUG. (Bug réel rencontré sur space-mania, corrigé en alignant sur no-mercy.)

#### Checklist avant d'implémenter un expand
- [ ] Lu le handler équivalent dans `no-mercy-at-down-frontend` (`vs-expand`, `board-reveal`, `onSymbolLand`).
- [ ] Confirmé que `show-wins` porte `isWild` (sinon demander au math) → **aucune** mutation board nécessaire.
- [ ] Choisi le mécanisme : symbole (1 anim) **ou** overlay dédié (multi-phase) — justifié.
- [ ] Si ambigu sur le rendu attendu : **demander**, ne pas deviner.

### 5.1 VSExpandOverlay (NOUVEAU)
- [ ] **Fichier**: `src/components/effects/VSExpandOverlay.svelte`
- [ ] Créer composant pour animation VS expand
- [ ] Utiliser `animation_vs_plus_anticipation/animation_vs.json`
- [ ] Overlay sur la colonne concernée

### 5.2 Duel (NOUVEAU)
- [ ] **Fichiers**: `src/components/effects/Duels.svelte` (container), `DuelAnimation.svelte` (animation)
- [ ] Créer composant pour le duel
- [ ] Utiliser l'animation de duel
- [ ] Gérer la séquence: intro → affichage multis → résultat

> **Positionnement** (`Duels.svelte`):
> - Utiliser le même pattern que `Anticipations.svelte` (voir section "POSITIONNEMENT DES ÉLÉMENTS SUR LA GRILLE DE SYMBOLES")
> - Configurer `OFFSET_*` et `SCALE_*` pour chaque layout (desktop, portrait, popout)
> - Utiliser `layoutType()` pour la détection 3-way (pas `isStacked()` qui est 2-way)
>
> **Debug**: Créer `DuelDebug.svelte` avec `DEBUG_ENABLED = true` pour positionner

### 5.3 DuelNumberAttachments (NOUVEAU)
- [ ] **Fichier**: `src/components/effects/DuelNumberAttachments.svelte`
- [ ] Copier pattern de royale-cake `FreeSpinNumberAttachments.svelte`
- [ ] Utiliser Shared Atlas avec `pack_chiffres/pack_number.atlas`
- [ ] Afficher les multiplicateurs dans les slots Spine
- [ ] Logique:
  ```typescript
  // Charger l'animation duel avec injection des chiffres
  const skeletonData = await sharedAtlasManager.loadSpine({
    atlasPath: DUEL_ATLAS,
    imagePath: DUEL_IMAGE,
    skeletonPath: DUEL_SKELETON,
    injectRegions: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    scale: 2,
  });

  // Dans le composant, setter les attachments
  spine.skeleton.setAttachment('outlaw1_tens', String(tens1));
  spine.skeleton.setAttachment('outlaw1_ones', String(ones1));
  spine.skeleton.setAttachment('outlaw2_tens', String(tens2));
  spine.skeleton.setAttachment('outlaw2_ones', String(ones2));
  ```

### 5.4 Anticipation
- [ ] **Fichiers**: `src/components/effects/Anticipation.svelte`, `Anticipations.svelte`
- [ ] Asset: anticipation spine (ex: `anticipation.json`)
- [ ] Déclenché automatiquement sur les reels avec `reel.reelState.anticipating = true`

> **Positionnement** (`Anticipation.svelte`):
> ```typescript
> // Scale X et Y séparément pour ajuster la taille
> const SCALE = { x: 0.4, y: 0.4 };
> // Y position: centre de la grille (ex: SYMBOL_SIZE * 2.5 pour 5 rows)
> const Y_POSITION = SYMBOL_SIZE * 2.5;
> // X position: automatique avec getSymbolX(reel.reelIndex)
> ```

> **Offsets par layout** (`Anticipations.svelte`):
> - Voir section "POSITIONNEMENT DES ÉLÉMENTS SUR LA GRILLE DE SYMBOLES" pour le pattern complet
> - Configurer `OFFSET_*` et `SCALE_*` pour chaque layout (desktop, portrait, popout)
> - Utiliser `layoutType()` pour la détection 3-way (pas `isStacked()` qui est 2-way)
>
> **Debug**: Mettre `DEBUG_ALWAYS_SHOW = true` dans `Anticipations.svelte` pour positionner

---

## Phase 6 - Polish

### 6.1 LoadingScreen
- [ ] **Fichier**: `src/components/LoadingScreen.svelte`
- [ ] Utiliser assets `loading/`
- [ ] Afficher le logo

> **QUESTIONS À POSER:**
> 1. Voulez-vous une page de règles (RulesPage) entre le loading et le jeu ?
> 2. Voulez-vous des transitions smooth (fade in/out) entre les écrans ?

#### 6.1.1 Configuration des Assets LoadingScreen

**Assets nécessaires dans assets.ts:**
```typescript
// Logo
loadingLogo: {
  type: 'sprite',
  src: new URL('../../assets/.../logo.webp', import.meta.url).href,
  preload: true,  // IMPORTANT: preload pour afficher pendant le chargement
},
// Background statique pendant le loading
loadingBackground: {
  type: 'sprite',
  src: new URL('../../assets/.../background_static.webp', import.meta.url).href,
  preload: true,
},
// Press to continue
pressContinue: {
  type: 'sprite',
  src: new URL('../../assets/.../click_continue.webp', import.meta.url).href,
  preload: true,
},
// Progress bar
progressBarFrame: {
  type: 'sprite',
  src: new URL('../../assets/.../contour_loading_bar.webp', import.meta.url).href,
  preload: true,
},
progressBarBackground: {
  type: 'sprite',
  src: new URL('../../assets/.../empty.webp', import.meta.url).href,
  preload: true,
},
progressBarFull: {
  type: 'sprite',
  src: new URL('../../assets/.../full.webp', import.meta.url).href,
  preload: true,
},
```

#### 6.1.2 Dimensionnement Dynamique (IMPORTANT)

> **RÈGLE CRITIQUE - Ne jamais hardcoder les dimensions !**
>
> Les dimensions doivent être lues depuis les textures chargées, pas hardcodées.

**❌ MAUVAIS - Dimensions hardcodées:**
```typescript
const barWidth = 500;  // NON!
const bgWidth = 1920;  // NON!
```

**✅ BON - Dimensions depuis les textures:**
```typescript
// Pour la progress bar
const progressBarTexture = $derived(context.stateApp.loadedAssets?.progressBarFull);
const barWidth = $derived(progressBarTexture?.width ?? 0);
const barHeight = $derived(progressBarTexture?.height ?? 0);

// Pour le background
const bgTexture = $derived(context.stateApp.loadedAssets?.loadingBackground);
const bgOriginalWidth = $derived(bgTexture?.width ?? 1920);
const bgOriginalHeight = $derived(bgTexture?.height ?? 1080);
```

#### 6.1.3 Scale vs Width pour les Sprites

> **RÈGLE CRITIQUE - Ne pas mélanger `width` et `scale` !**
>
> Ces deux propriétés se surchargent. Utiliser l'une OU l'autre, pas les deux.

**❌ MAUVAIS - Conflit width/scale:**
```svelte
<Sprite
  key="loadingLogo"
  width={300}      <!-- Définit une largeur -->
  scale={0.75}     <!-- SURCHARGE la largeur! -->
/>
```

**✅ BON - Utiliser uniquement scale:**
```svelte
<Sprite
  key="loadingLogo"
  anchor={0.5}
  y={logo.y}
  scale={logo.scale}  <!-- SEULEMENT scale -->
/>
```

#### 6.1.4 Progress Bar avec Masque

**Pattern de la progress bar:**
```svelte
<Container y={progressBarContainer.y} scale={progressBarContainer.scale}>
  <!-- Background (derrière) -->
  <Sprite key="progressBarBackground" anchor={0.5} />

  <!-- Progress bar avec masque -->
  <Container>
    <Sprite key="progressBarFull" anchor={0.5} />
    <Rectangle
      isMask
      x={-barWidth / 2}
      y={-barHeight / 2}
      width={progressMaskWidth}
      height={barHeight}
    />
  </Container>

  <!-- Frame (devant) -->
  <Sprite key="progressBarFrame" anchor={0.5} />
</Container>
```

**Calcul du masque:**
```typescript
const progressMaskWidth = $derived(barWidth * (progress / 100));
```

#### 6.1.5 Background Cover (plein écran)

**Pour que le background couvre tout l'écran (comme CSS background-size: cover):**

```typescript
const canvasSizes = $derived(context.stateLayoutDerived.canvasSizes());

// Dimensions depuis la texture
const bgTexture = $derived(context.stateApp.loadedAssets?.loadingBackground);
const bgOriginalWidth = $derived(bgTexture?.width ?? 1920);
const bgOriginalHeight = $derived(bgTexture?.height ?? 1080);

// Scale pour couvrir (Math.max = cover, Math.min = contain)
const bgScale = $derived.by(() => {
  const scaleX = canvasSizes.width / bgOriginalWidth;
  const scaleY = canvasSizes.height / bgOriginalHeight;
  return Math.max(scaleX, scaleY);  // COVER
});
```

```svelte
<Sprite
  key="loadingBackground"
  x={canvasSizes.width / 2}
  y={canvasSizes.height / 2}
  anchor={0.5}
  scale={bgScale}
  zIndex={-10}
/>
```

#### 6.1.6 Offset Mobile pour le Background (Optionnel)

**Si le background doit être décalé sur mobile (ex: montrer une partie spécifique):**

```typescript
const BG_MOBILE_OFFSET_X = -0.5; // -1 à 1 (0 = centré)

const bgPosition = $derived.by(() => {
  const scaledWidth = bgOriginalWidth * bgScale;
  const overflow = scaledWidth - canvasSizes.width;

  if (isMobile && overflow > 0) {
    const offsetX = -overflow * BG_MOBILE_OFFSET_X;
    return {
      x: canvasSizes.width / 2 + offsetX,
      y: canvasSizes.height / 2
    };
  }

  return {
    x: canvasSizes.width / 2,
    y: canvasSizes.height / 2
  };
});
```

---

### 6.1b RulesPage (OPTIONNEL)

> **Question à poser:** Voulez-vous une page de règles entre le loading screen et le jeu ?
>
> Cette page affiche les règles du jeu (généralement 3 cartes) et permet à l'utilisateur
> de comprendre le jeu avant de commencer.

- [ ] **Fichier**: `src/components/RulesPage.svelte`
- [ ] Demander si l'utilisateur veut cette page
- [ ] Si oui, créer le composant

#### Assets Nécessaires

```typescript
// Dans assets.ts
cardRules: {
  type: 'sprite',
  src: new URL('../../assets/.../card_rules.webp', import.meta.url).href,
},
// Réutiliser le logo du loading screen
// loadingLogo: déjà déclaré
```

#### Structure du Composant

```svelte
<script lang="ts">
  import { Container, Sprite, Text } from 'pixi-svelte';
  import { FadeContainer } from 'components-pixi';
  import { MainContainer } from 'components-layout';
  import { getContext } from '../game/state/context';
  import PressToContinue from './PressToContinue.svelte';

  type Props = {
    oncontinue: () => void;
  };

  const props: Props = $props();
  const context = getContext();

  // Fade transition
  const FADE_DURATION = 500;
  let isVisible = $state(true);

  function handleContinue() {
    isVisible = false; // Trigger fade out
  }

  const mainLayout = $derived(context.stateLayoutDerived.mainLayout());
  const isMobile = $derived(context.stateLayoutDerived.isStacked());
</script>

<FadeContainer
  show={isVisible}
  duration={FADE_DURATION}
  oncomplete={() => { if (!isVisible) props.oncontinue(); }}
>
  <MainContainer>
    <!-- Logo -->
    <Sprite key="loadingLogo" ... />

    <!-- Cards -->
    {#each cardPositions as pos, index}
      <Container x={pos.x} y={pos.y}>
        <Sprite key="cardRules" anchor={0.5} scale={cardScale} />
        <Text text={cardTexts[index]} ... />
      </Container>
    {/each}
  </MainContainer>

  <PressToContinue onpress={handleContinue} />
</FadeContainer>
```

#### Layout Desktop (3 cartes en ligne horizontale)

```typescript
// Desktop: 3 cartes alignées horizontalement
const desktopCardGap = 400;        // Espacement entre les cartes
const desktopCardOffsetY = 50;     // Offset Y global
const desktopSideCardOffsetY = 70; // Offset Y supplémentaire pour cartes latérales

const desktopCardPositions = $derived([
  { x: mainLayout.width / 2 - desktopCardGap, y: mainLayout.height / 2 + desktopCardOffsetY + desktopSideCardOffsetY },
  { x: mainLayout.width / 2, y: mainLayout.height / 2 + desktopCardOffsetY },
  { x: mainLayout.width / 2 + desktopCardGap, y: mainLayout.height / 2 + desktopCardOffsetY + desktopSideCardOffsetY },
]);
```

#### Layout Mobile (2 cartes en haut, 1 centrée en bas)

```typescript
// Mobile: 2 cartes en haut, 1 centrée en bas
const mobileCardGapX = 375;    // Gap horizontal entre les 2 cartes du haut
const mobileCardGapY = 400;    // Gap vertical entre les 2 lignes
const mobileFirstRowY = 550;   // Position Y de la première ligne

const mobileCardPositions = $derived([
  { x: mainLayout.width / 2 - mobileCardGapX / 2, y: mobileFirstRowY },
  { x: mainLayout.width / 2 + mobileCardGapX / 2, y: mobileFirstRowY },
  { x: mainLayout.width / 2, y: mobileFirstRowY + mobileCardGapY },
]);
```

#### Configuration Responsive

```typescript
// Sélection automatique selon le device
const cardPositions = $derived(isMobile ? mobileCardPositions : desktopCardPositions);
const cardScale = $derived(isMobile ? 0.45 : 0.45);

// Logo: position différente selon le device
const logoConfig = $derived(isMobile
  ? { x: mainLayout.width / 2, y: 150, scale: 0.6 }      // Haut de l'écran sur mobile
  : { x: mainLayout.width / 2, y: cardPositions[1].y - 325, scale: 0.4 }  // Au-dessus de la carte centrale
);
```

#### Intégration dans Game.svelte

```svelte
<script>
  let showRulesPage = $state(false);

  // Après le loading screen, afficher les rules
  // LoadingScreen.onloaded => showRulesPage = true
</script>

<!-- Loading screen -->
{#if context.stateLayout.showLoadingScreen}
  <LoadingScreen
    onloaded={() => {
      context.stateLayout.showLoadingScreen = false;
      showRulesPage = true;  // Afficher RulesPage après
    }}
  />
{/if}

<!-- Rules page (entre loading et jeu) -->
{#if showRulesPage}
  <RulesPage oncontinue={() => (showRulesPage = false)} />
{/if}

<!-- Game content (après rules) -->
{#if allAssetsLoaded && !context.stateLayout.showLoadingScreen && !showRulesPage}
  <!-- Contenu du jeu -->
{/if}
```

---

### 6.1c Transitions Smooth entre Écrans (OPTIONNEL)

> **Question à poser:** Voulez-vous des transitions smooth (fade in/out) entre les écrans ?
>
> Par défaut, les transitions entre LoadingScreen → RulesPage → Game sont "brutales".
> On peut ajouter des fade out/fade in pour une expérience plus fluide.

- [ ] Demander si l'utilisateur veut des transitions smooth
- [ ] Si oui, implémenter avec FadeContainer

#### Pattern Fade Transition

**Principe:**
1. L'écran commence visible (`isVisible = true`)
2. Quand l'utilisateur clique, on fade out (`isVisible = false`)
3. À la fin du fade out, on appelle le callback `oncontinue` / `onloaded`

```svelte
<script lang="ts">
  const FADE_DURATION = 500; // Durée du fade en ms
  let isVisible = $state(true);

  function handleContinue() {
    isVisible = false; // Déclenche le fade out
  }
</script>

<FadeContainer
  show={isVisible}
  duration={FADE_DURATION}
  oncomplete={() => { if (!isVisible) props.oncontinue(); }}
>
  <!-- Contenu de l'écran -->

  <PressToContinue onpress={handleContinue} />
</FadeContainer>
```

**IMPORTANT:** Le callback `oncomplete` est appelé à CHAQUE fin de transition (fade in ET fade out).
Il faut donc vérifier `if (!isVisible)` pour ne pas appeler `oncontinue` après le fade in initial.

#### Implémentation dans LoadingScreen.svelte

```svelte
<script lang="ts">
  type Props = {
    onloaded: () => void;
    loadingProgress?: number;
    allLoaded?: boolean;
  };

  const props: Props = $props();
  const FADE_DURATION = 500;
  let isVisible = $state(true);

  function handleContinue() {
    isVisible = false;
  }
</script>

<!-- Logo et progress bar -->
<FadeContainer show={isVisible} duration={FADE_DURATION}>
  <MainContainer>
    <!-- Logo, progress bar... -->
  </MainContainer>
</FadeContainer>

<!-- Press to continue (apparaît quand allLoaded) -->
<FadeContainer
  show={isAllLoaded && isVisible}
  duration={FADE_DURATION}
  oncomplete={() => { if (!isVisible) props.onloaded(); }}
>
  <MainContainer>
    <Sprite key="pressContinue" ... />
  </MainContainer>
  <PressToContinue onpress={handleContinue} />
</FadeContainer>
```

#### Implémentation dans RulesPage.svelte

```svelte
<script lang="ts">
  type Props = {
    oncontinue: () => void;
  };

  const props: Props = $props();
  const FADE_DURATION = 500;
  let isVisible = $state(true);

  function handleContinue() {
    isVisible = false;
  }
</script>

<FadeContainer
  show={isVisible}
  duration={FADE_DURATION}
  oncomplete={() => { if (!isVisible) props.oncontinue(); }}
>
  <MainContainer>
    <!-- Logo et cartes -->
  </MainContainer>

  <PressToContinue onpress={handleContinue} />
</FadeContainer>
```

#### Flux Complet avec Transitions

```
┌─────────────────────────────────────────────────────────────┐
│  FLOW DES ÉCRANS AVEC TRANSITIONS                           │
│                                                             │
│  1. LoadingScreen (visible)                                 │
│     ├── Progress bar loading...                             │
│     └── [CLICK] quand allLoaded                            │
│                                                             │
│  2. LoadingScreen FADE OUT (500ms)                         │
│     └── oncomplete → showLoadingScreen = false             │
│                    → showRulesPage = true                   │
│                                                             │
│  3. RulesPage FADE IN (automatique, 500ms)                 │
│     ├── Logo + 3 cartes affichés                           │
│     └── [CLICK]                                            │
│                                                             │
│  4. RulesPage FADE OUT (500ms)                             │
│     └── oncomplete → showRulesPage = false                 │
│                                                             │
│  5. Game content visible                                    │
│     ├── Background animé (Spine)                           │
│     ├── Board animation start                              │
│     └── Board fade in                                      │
└─────────────────────────────────────────────────────────────┘
```

#### Checklist Transitions Smooth

- [ ] Importer `FadeContainer` de `components-pixi`
- [ ] Ajouter `isVisible = $state(true)` dans chaque écran
- [ ] Wrapper le contenu dans `<FadeContainer show={isVisible} duration={FADE_DURATION}>`
- [ ] Vérifier `if (!isVisible)` dans le callback `oncomplete`
- [ ] Tester les transitions sur desktop ET mobile

---

### 6.2 InfoModal
- [ ] **Fichier**: `src/components/info/InfoModal.svelte`
- [ ] Utiliser `rules/rules_cards.webp`
- [ ] Ajouter les textes de règles

### 6.3 Transitions
- [ ] **Fichier**: `src/components/effects/Transition.svelte`
- [ ] Adapter si nécessaire pour les transitions base → bonus

---

## Ordre d'Implémentation

```
[ ] 1. Phase 1 (Config de base)           → Le jeu compile
[ ] 2. Phase 2.0 (Shared Atlas Manager)   → Infrastructure de chargement Spine
[ ] 3. Phase 2.1-2.3 (Symboles)           → Symboles visibles (via SymbolsLoader)
[ ] 4. Phase 4.2-4.4 (Board)              → Board 5x5 fonctionnel
[ ] 5. Phase 2.4-2.6 (BG/Frame/Win)       → Visuels en place
[ ] 6. Phase 3.1-3.3 (Events base)        → Spins fonctionnels
[ ] 7. Phase 4.6-4.7 (HUD/BuyBonus)       → Interface complète
[ ] 8. Phase 4.8-4.10 (Free Spins)        → Bonus basique
[ ] 9. Phase 5.1-5.4 (VS/Duel)            → Features Bounty (avec number injection)
[ ] 10. Phase 6 (Polish)                  → Finitions
```

---

## Notes Techniques

### Pattern à copier de royale-cake:

| Pattern | Fichier source (royale-cake) | Usage dans no-mercy |
|---------|------------------------------|---------------------|
| Mode ANTE | `src/game/config/betModeMeta.ts` | Bet mode 3x |
| Shared Atlas Manager | `src/game/spine/SharedAtlasManager.ts` | Wrapper + singleton (classe vient de `pixi-svelte`) |
| Shared Atlas Config | `src/game/spine/sharedAtlasConfig.ts` | Config des régions à injecter |
| SymbolsLoader | `src/components/SymbolsLoader.svelte` | Chargement symboles avec injection |
| Number Attachments | `src/components/freespin/FreeSpinNumberAttachments.svelte` | Chiffres dans duel/intro |
| Buy Bonus Panel | `src/components/bonus/BuyBonusPanel.svelte` | Panel multi-bonus |

### Shared Atlas - Comment ça marche:

```
┌─────────────────────────────────────────────────────────────┐
│  Architecture                                               │
│                                                             │
│  pixi-svelte (SDK)                                          │
│    └── SharedAtlasManager (classe)                          │
│                                                             │
│  app/src/game/spine/                                        │
│    ├── SharedAtlasManager.ts  → re-export + singleton       │
│    ├── sharedAtlasConfig.ts   → NUMBERS_CONFIG, etc.        │
│    └── index.ts               → re-export tout              │
│                                                             │
│  app/src/components/                                        │
│    └── SymbolsLoader.svelte   → utilise sharedAtlasManager  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Utilisation                                                │
│                                                             │
│  1. sharedAtlasManager.registerSharedAtlas('numbers', cfg)  │
│     → Charge pack_number.atlas avec régions 0-9             │
│                                                             │
│  2. sharedAtlasManager.loadSpine({ injectRegions: [...] })  │
│     → Charge le skeleton Spine                              │
│     → Injecte les régions de l'atlas partagé               │
│     → Les slots "tens" et "ones" peuvent afficher 0-9      │
│                                                             │
│  3. spine.skeleton.setAttachment('tens', '5')               │
│     → Affiche le chiffre 5 dans le slot "tens"             │
└─────────────────────────────────────────────────────────────┘
```

### Symboles nécessitant Shared Atlas:
- **Tous les symboles high** (H1-H5) : pour les effets de lumière ou autres
- **Animation duel** : pour afficher les multiplicateurs (chiffres 0-9)
- **Intro bonus** : pour afficher le nombre de free spins (chiffres 0-9)

### Références assets:
- Tous les nouveaux assets sont dans: `static/assets/export_final/`

---

## Paylines (Lignes Gagnantes)

> **Feature**: Afficher une animation de ligne sur les combinaisons gagnantes.

### Structure de l'Asset Spine

L'asset Spine `payline` contient **une animation par payline** (nommées "1", "2", ..., "15").

**Fichiers requis:**
```
static/assets/export_final/payline/
├── nmad.atlas      # Atlas avec la texture de ligne
├── nmad.png        # Texture (ligne + glow)
└── payline.json    # Skeleton avec les animations 1-15
```

**Structure du Skeleton:**
- Bones de référence pour chaque case : `case_A0` à `case_E4` (5 colonnes × 5 rows)
- Chaque animation déplace les bones pour former la payline correspondante
- Le path `path_payline` dessine la ligne entre les points

**Analyse de l'atlas:**
```
nmad.png
size:1196,51
payline/payline
bounds:2,2,1192,47
```

### Étape 1: Déclarer l'Asset

**Fichier**: `src/game/assets.ts`

```typescript
// =========================================================================
// PAYLINE (Spine animation - one animation per payline: "1", "2", ..., "15")
// =========================================================================
payline: {
    type: 'spine',
    src: {
        atlas: new URL('../../assets/export_final/payline/nmad.atlas', import.meta.url).href,
        skeleton: new URL('../../assets/export_final/payline/payline.json', import.meta.url).href,
        scale: 1,
    },
},
```

### Étape 2: Créer le State

**Fichier**: `src/game/state/stateGame.svelte.ts`

```typescript
// Payline data with line number and symbol count for masking
export type PaylineData = {
    lineNumber: number; // Payline number (1-15)
    symbolCount: number; // Number of symbols in the combination (3, 4, or 5)
};

// Payline state - manages active paylines display
export const statePaylines = $state({
    activePaylines: [] as PaylineData[], // Array of payline data to display
    isVisible: false, // Whether paylines should be shown
});

// Show paylines (called from show-wins handler)
export const showPaylines = (paylines: PaylineData[]) => {
    statePaylines.activePaylines = paylines;
    statePaylines.isVisible = true;
};

// Hide paylines (called before next spin)
export const hidePaylines = () => {
    statePaylines.isVisible = false;
    statePaylines.activePaylines = [];
};
```

### Étape 3: Créer le Composant PaylineOverlay

**Fichier**: `src/components/effects/PaylineOverlay.svelte`

```svelte
<script lang="ts">
    import { Container, SpineProvider, SpineTrack, Graphics, Rectangle } from 'pixi-svelte';
    import { getContext } from '../../game/state/context';
    import { SYMBOL_SIZE } from '../../game/config/constants';
    import { statePaylines, type PaylineData } from '../../game/state/stateGame.svelte';

    // DEBUG CONFIG
    const DEBUG_ENABLED = false;
    const DEBUG_PAYLINES: PaylineData[] = [
        { lineNumber: 1, symbolCount: 5 },
        { lineNumber: 6, symbolCount: 3 },
    ];
    const DEBUG_SHOW_GRID = false;

    // POSITIONING CONFIG
    // Scale = SYMBOL_SIZE / espacement_entre_colonnes_dans_spine
    const SCALE_DESKTOP = SYMBOL_SIZE / 129;
    const OFFSET_DESKTOP = { x: 0, y: 0 };

    // ... (même config pour mobile/popout)

    const context = getContext();

    // Layout detection
    const layoutType = $derived(context.stateLayoutDerived.layoutType());
    const isPortrait = $derived(layoutType === 'portrait');
    const isPopout = $derived(layoutType === 'landscape');

    // Board dimensions
    const boardWidth = SYMBOL_SIZE * 5;
    const boardHeight = SYMBOL_SIZE * 5;
    const boardCenterX = boardWidth / 2;
    const boardCenterY = boardHeight / 2;

    // Paylines to show
    const paylinesToShow = $derived(
        DEBUG_ENABLED ? DEBUG_PAYLINES : statePaylines.activePaylines
    );
    const isVisible = $derived(DEBUG_ENABLED || statePaylines.isVisible);
</script>

{#if isVisible}
    <Container
        x={context.stateGameDerived.boardLayout().x + boardOffset.x}
        y={context.stateGameDerived.boardLayout().y + boardOffset.y}
        scale={boardScale}
        pivot={context.stateGameDerived.boardLayout().pivot}
    >
        {#each paylinesToShow as payline}
            {@const maskWidth = SYMBOL_SIZE * payline.symbolCount}
            <Container>
                <!-- Masque pour couper la ligne au bon endroit -->
                <Rectangle isMask x={0} y={0} width={maskWidth} height={boardHeight} />

                <!-- Animation de la payline -->
                <SpineProvider
                    key="payline"
                    x={boardCenterX + offset.x}
                    y={boardCenterY + offset.y}
                    scale={paylineScale}
                >
                    <SpineTrack
                        trackIndex={0}
                        animationName={String(payline.lineNumber)}
                        loop={false}
                    />
                </SpineProvider>
            </Container>
        {/each}
    </Container>
{/if}
```

**Points importants:**
- Le **masque** (`Rectangle isMask`) coupe l'animation après la dernière colonne gagnante
- `symbolCount = 3` → masque largeur = `SYMBOL_SIZE * 3` → colonnes 0-2 visibles
- `loop={false}` → l'animation joue une seule fois

### Étape 4: Ajouter dans Game.svelte

**Fichier**: `src/components/Game.svelte`

```svelte
<script>
    import PaylineOverlay from './effects/PaylineOverlay.svelte';
</script>

<!-- Dans le template, APRÈS le Board pour être par-dessus les symboles -->
<MainContainer>
    <Board />
    <StickyWildsOverlay />
    <Anticipations />
</MainContainer>

<!-- Payline overlay (above symbols) -->
<MainContainer>
    <PaylineOverlay />
</MainContainer>
```

### Étape 5: Connecter au Handler show-wins

**Fichier**: `src/game/handlers/bookEventHandlerMap.ts`

> **📄 Voir la section [WIN AMOUNTS - Gestion du Blocage des Spins](#81-important-gestion-du-blocage-des-spins) pour l'implémentation complète du handler `show-wins`.**
>
> Le handler `show-wins` gère à la fois :
> - L'affichage des paylines via `WinAmounts.svelte`
> - Le dimming des symboles non-gagnants
> - Le blocage conditionnel (base game vs bonus mode)

```typescript
import { showPaylines, hidePaylines } from '../state/stateGame.svelte';

// Dans le handler 'board-reveal' (nouveau spin)
'board-reveal': async (bookEvent) => {
    hidePaylines(); // Cacher les paylines du spin précédent
    // ... reste du code
},

// Dans le handler 'show-wins' - Les paylines sont gérées par WinAmounts
// qui appelle showPaylines() pour chaque groupe de combinaisons
// Voir la section WIN AMOUNTS pour le code complet
```

### Étape 6: Mettre à jour les Types (optionnel)

**Fichier**: `src/game/types/typesBookEvent.ts`

```typescript
type WinCombination = {
    kind: number;           // Nombre de symboles dans la combinaison
    lineNumber?: number;    // Numéro de la payline (1-15)
    baseSymbol: { ... };
    symbols: WinCombinationSymbol[];
    payout?: number;
};
```

### Positionnement de l'Asset

**Calcul du scale:**
```
Spine: ~129px entre chaque colonne
Board: SYMBOL_SIZE entre chaque colonne

scale = SYMBOL_SIZE / 129
```

**Pour ajuster le positionnement:**
1. Mettre `DEBUG_ENABLED = true` et `DEBUG_SHOW_GRID = true`
2. Lancer le jeu et observer l'alignement
3. Ajuster `OFFSET_DESKTOP`, `OFFSET_MOBILE`, etc. si nécessaire
4. Remettre `DEBUG_ENABLED = false` une fois terminé

### Flux selon le Mode

**Mode A - Tout en même temps:**
```
spin → stopWinLoop() → hidePaylines()
       ↓
show-wins
  → showPaylines(ALL combinations)
  → animer TOUS les symboles
  → afficher montant total
       ↓
prochain spin → cleanup
```

**Mode B - Par payline (séquentiel):**
```
spin → stopWinLoop() → hidePaylines()
       ↓
show-wins
  → Pour CHAQUE combo:
    ├── showPaylines([combo])
    ├── animer symboles de la combo
    ├── afficher montant
    └── délai
       ↓
prochain spin → cleanup
```

**Mode D - Par groupe de multiplicateur:**
```
spin → stopWinLoop() → hidePaylines()
       ↓
show-wins → showWinAmounts
  → Pour CHAQUE groupe:
    ├── showPaylines(group.combinations)
    ├── animer symboles du groupe
    ├── afficher montant (avec fusion si multi)
    └── délai
       ↓
prochain spin → cleanup
```

### Checklist Implémentation Paylines

**Assets:**
- [ ] Créer l'asset Spine avec animations "1" à "15" (une par payline)
- [ ] Copier les fichiers dans `static/assets/export_final/payline/`
- [ ] Déclarer l'asset dans `src/game/assets.ts`

**Code:**
- [ ] Ajouter `PaylineData`, `statePaylines`, `showPaylines`, `hidePaylines` dans `stateGame.svelte.ts`
- [ ] Créer `src/components/effects/PaylineOverlay.svelte`
- [ ] Ajouter `<PaylineOverlay />` dans `Game.svelte` (dans son propre MainContainer, après Board)
- [ ] Dans `stopWinLoop()`: appeler `hidePaylines()` pour cleanup
- [ ] Dans handler `show-wins`: appeler `showPaylines()` selon le mode choisi

**Tests:**
- [ ] Tester avec `DEBUG_ENABLED = true` pour vérifier le positionnement
- [ ] Tester le masquage avec différents `symbolCount` (3, 4, 5)
- [ ] Désactiver le debug une fois terminé

### Particularités:
- Les multiplicateurs en Bounty sont ADDITIFS (pas multiplicatifs)
- Le duel se fait un par un, de gauche à droite
- Même animation intro/outro pour les 2 modes bonus (textes différents)
- Background dynamique (animation Spine)

---

## ⚠️ BONUS INTRO/OUTRO ET WIN TEXTS

> **Cette section explique comment implémenter les animations d'intro/outro de bonus et les textes de win avec affichage de montants.**

### 1. Spritesheets pour Chiffres (pack_number)

**Concept:**
Pour afficher des montants ou compteurs, on utilise un spritesheet de chiffres (0-9) + symboles (point, virgule, X).

**Structure des assets:**
```
pack_chiffres/
├── pack_number.atlas    # Format Spine (à convertir)
├── pack_number.webp     # Image source
└── pack_number.json     # Format PixiJS (créé après conversion)
```

**Conversion .atlas → .json:**

Le format `.atlas` (Spine) doit être converti en `.json` (PixiJS spritesheet).

Format Atlas Spine:
```
pack_number.webp
size:1782,1484
filter:Linear,Linear
scale:0.3
0_R
bounds:4,744,250,366
1_R
bounds:4,374,250,366
```

Format JSON PixiJS attendu:
```json
{
  "frames": {
    "0_R": {
      "frame": { "x": 4, "y": 744, "w": 250, "h": 366 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 250, "h": 366 },
      "sourceSize": { "w": 250, "h": 366 }
    }
  },
  "meta": {
    "image": "pack_number.webp",
    "format": "RGBA8888",
    "size": { "w": 1782, "h": 1484 },
    "scale": "1"
  }
}
```

**Convention de nommage des clés:**
- Chiffres: `0_R`, `1_R`, ... `9_R` (R = Rouge/Red, B = Bleu/Blue)
- Point: `Point_rouge`, `Point_blanc`
- Virgule: `virgule_rouge`, `virgule_blanc`
- X (multiplicateur): `X_R`, `X_B`

**Déclaration dans assets.ts:**
```typescript
// Spritesheet format pour affichage direct via <Sprite>
packNumber: {
  type: 'sprites',
  src: new URL('../../assets/.../pack_number.json', import.meta.url).href,
},

// Si besoin d'injection dans des Spine (SharedAtlasManager), ajouter aussi:
packNumberAtlas: {
  type: 'sprite',
  src: new URL('../../assets/.../pack_number.atlas', import.meta.url).href,
},
packNumberImage: {
  type: 'sprite',
  src: new URL('../../assets/.../pack_number.webp', import.meta.url).href,
},
```

### 2. Composant FreeSpinNumberSlots (Affichage des Chiffres)

**Pattern:** Afficher des chiffres avec des Sprites simples (pas d'injection Spine).

```svelte
<!-- FreeSpinNumberSlots.svelte -->
<script lang="ts">
  import { Container, Sprite } from 'pixi-svelte';

  type Props = {
    tens: number;      // Dizaines
    ones: number;      // Unités
    scale?: number;
    x?: number;
    y?: number;
    gap?: number;      // Espacement entre les chiffres
  };

  const props: Props = $props();

  // Clé du sprite selon le chiffre (adapter selon votre naming)
  function getDigitKey(digit: number): string {
    return `${digit}_R`;  // Ex: "5_R" pour le chiffre 5 rouge
  }
</script>

<Container x={props.x ?? 0} y={props.y ?? 0} zIndex={100}>
  <Sprite
    key={getDigitKey(props.tens)}
    x={-(props.gap ?? 10)}
    anchor={{ x: 0.5, y: 0.5 }}
    scale={props.scale ?? 0.5}
  />
  <Sprite
    key={getDigitKey(props.ones)}
    x={(props.gap ?? 10)}
    anchor={{ x: 0.5, y: 0.5 }}
    scale={props.scale ?? 0.5}
  />
</Container>
```

> 🔁 **Rendre le mapping chiffre→sprite paramétrable** (réutilisable entre jeux qui ont des sheets différents) : ajouter une prop optionnelle `keyFor?: (digit:number)=>string` (défaut = naming du projet source). Ex. Space Mania passe `(d)=>`bfnum_${d}`` (sheet `numbersBoardFreespins`) ; un autre jeu garde `${d}_R`. Ne PAS dupliquer le composant par sheet.

### 2bis. ⭐ Verrouiller un number-slot (ou tout overlay) SUR un spine — sans réglage par layout

> **Problème réutilisable.** On veut afficher un nombre (compteur FS, multiplicateur, montant…) **à un endroit précis de l'art d'un spine** (une plaque, un cartouche cuit dans le skeleton) — et qu'il reste **bien placé ET à la bonne taille** quelle que soit la taille/position du spine (responsive, mobile, popout, changement de `BASE_SPINE_SCALE`). Sans technique, on recalibre l'offset du nombre pour CHAQUE layout → fragile.

**Deux mécanismes, selon que le skeleton expose ou non un slot pour le chiffre :**

**A. Le skeleton a un slot/bone dédié au nombre → attachment Spine (le vrai « collé au spine »).**
Le chiffre **ride sur un bone** via `skeleton.setAttachment(slot, region)` (cf. §5.3 DuelNumberAttachments / `FreeSpinNumberAttachments`). Position/échelle/rotation suivent l'animation du bone automatiquement. Nécessite l'**injection des régions chiffres** dans l'atlas du spine (SharedAtlasManager, cf. §SHARED ATLAS). À privilégier quand le slot existe.

**B. Le skeleton n'a PAS de slot chiffre (texte/plaque cuits dans l'art) → overlay en ESPACE LOCAL du spine.**
On rend l'overlay (Sprites du nombre) **dans un `<Container>` qui porte le MÊME scale que le `SpineProvider`**, et on l'offsette en **unités-skeleton (px locaux)**. Comme l'overlay partage l'échelle du spine, **position ET taille se mettent à l'échelle ensemble** → **une seule série de constantes**, valable partout.

```svelte
<!-- Le spine et l'overlay partagent le même Container parent (même origine).
     spineScale = BASE_SPINE_SCALE * responsiveFactor. -->
<Container x={layout.x} y={layout.y}>
  <SpineProvider key="bonusIntro" scale={spineScale}>
    <SpineTrack trackIndex={0} animationName="animation" loop />
  </SpineProvider>

  <!-- Overlay nombre : MÊME scale que le spine → vit dans l'espace local du skeleton.
       NUMBER_LOCAL_* sont en px-skeleton, mesurés une fois (offset origine→plaque). -->
  <Container scale={spineScale}>
    <FreeSpinNumberSlots
      tens={tens} ones={ones}
      x={NUMBER_LOCAL_X} y={NUMBER_LOCAL_Y}
      gap={NUMBER_LOCAL_GAP} scale={NUMBER_LOCAL_SCALE}
      keyFor={(d)=>`bfnum_${d}`}
    />
  </Container>
</Container>
```

**Règles / pièges :**
- ❌ **Ne PAS** scaler l'overlay par le facteur responsive `s` seul (`x = BASE_X * s`) pendant que le spine est à `spineScale = BASE_SPINE_SCALE * s` : les deux **se découplent** (l'overlay ne suit pas `BASE_SPINE_SCALE`, ni un offset spine mobile) → recalibrage par layout. **Toujours** lier l'overlay à `spineScale`.
- Les constantes `NUMBER_LOCAL_*` sont en **px du skeleton** (pas px écran). Calibrer **une fois** avec un `DEBUG` (valeur fixe affichée en continu), puis ça tient sur tous les layouts.
- ⚠️ Ceci **contredit volontairement** la note §RESPONSIVE LAYOUT « enfants AU MÊME NIVEAU que le SpineProvider, pas dedans » : cette note vise les éléments qu'on **ne veut PAS** scaler avec le spine (titres/montants indépendants). Ici on veut **l'inverse** — verrouiller sur l'art du spine — donc on partage son scale **exprès**.
- L'overlay reste un **sibling** du `SpineProvider` (pas un enfant) : on réplique le transform du spine (`scale={spineScale}`) au lieu de l'imbriquer, ce qui évite les surprises si le `SpineProvider` applique anchor/offset interne.

**Choisir A vs B :** ouvrir le `.json` du skeleton, chercher un slot/bone au nom évocateur (`tens`,`ones`,`number`,`mult`…). Présent → **A** (attachment). Absent (que des `Calque…`/art) → **B** (overlay espace-local). Space Mania bonus intro = **B** (l'art contient « YOU JUST WON [ ] FREE SPINS », pas de slot chiffre).

### 3. Composant WinAmountSprites (Affichage des Montants)

**Pattern:** Afficher un montant formaté (ex: "1,234.56") avec des sprites.

```svelte
<!-- WinAmountSprites.svelte -->
<script lang="ts">
  import { Container, Sprite } from 'pixi-svelte';

  interface Props {
    amount: string;    // Montant formaté (ex: "1,234.56")
    scale?: number;
    spacing?: number;
  }

  let { amount, scale = 0.5, spacing = 10 }: Props = $props();

  // Mapping caractère → clé sprite (adapter selon votre naming)
  const charToFrame: Record<string, string> = {
    '0': '0_R', '1': '1_R', '2': '2_R', '3': '3_R', '4': '4_R',
    '5': '5_R', '6': '6_R', '7': '7_R', '8': '8_R', '9': '9_R',
    ',': 'virgule_rouge',
    '.': 'Point_rouge',
    'x': 'X_R', 'X': 'X_R',
  };

  // Largeur de chaque caractère (ajuster selon vos sprites)
  const FRAME_WIDTH = 250;

  // Calcul des positions pour centrer
  const characters = $derived.by(() => {
    const chars = [];
    let currentX = 0;
    const gap = spacing * scale;

    for (const char of amount) {
      const frame = charToFrame[char];
      if (frame) {
        const width = FRAME_WIDTH * scale;
        chars.push({ frame, x: currentX + width / 2 });
        currentX += width + gap;
      } else if (char === ' ') {
        currentX += 30 * scale;
      }
    }

    // Centrer
    const totalWidth = currentX - gap;
    return chars.map(c => ({ ...c, x: c.x - totalWidth / 2 }));
  });
</script>

<Container>
  {#each characters as { frame, x }}
    <Sprite key={frame} {x} anchor={{ x: 0.5, y: 0.5 }} {scale} />
  {/each}
</Container>
```

### 4. Structure des Composants Bonus

```
src/components/freespin/
├── FreeSpinIntro.svelte        # Container + events
├── FreeSpinAnimation.svelte    # Spine animation + FreeSpinNumberSlots
├── FreeSpinNumberSlots.svelte  # Affichage chiffres (tens/ones)
├── FreeSpinOutro.svelte        # Container + WinAmountSprites
└── ...

src/components/effects/
├── RetriggerOverlay.svelte     # Affiche +X sur les scatters lors d'un retrigger
└── ...
```

**FreeSpinAnimation.svelte:**
```svelte
<SpineProvider
  key="bonusIntro"           <!-- Clé de l'asset Spine dans assets.ts -->
  width={PANEL_SIZES.width * 0.75}
  x={PANEL_SIZES.width * 0.5}
  y={PANEL_SIZES.height * 0.4}
>
  <SpineTrack
    trackIndex={0}
    animationName="animation_idle"   <!-- Nom de l'animation dans le JSON -->
    loop={true}
  />
  <!-- Overlay des chiffres -->
  <FreeSpinNumberSlots
    tens={Math.floor(freeSpinsCount / 10)}
    ones={freeSpinsCount % 10}
    scale={0.3}
    x={371} y={320} gap={28}   <!-- Position à ajuster selon le Spine -->
  />
</SpineProvider>
```

### 5. Win Texts (Animations de Victoire)

**Configuration dans winLevelMap.ts:**

```typescript
// winLevelMap.ts - SEULEMENT les données, pas le layout
export const winLevelMap = {
  0: { level: 0, alias: 'nothing', type: 'none', ... },
  1: {
    level: 1,
    alias: 'nice',           // Alias générique
    type: 'small',           // small | medium | big
    text: 'NICE WIN',        // Texte affiché (si pas d'animation)
    presentDuration: 2000,   // Durée d'affichage en ms
    sound: { sfx: 'sfx_nice_win', bgm: undefined },
    animation: {
      assetKey: 'winNice',   // Clé dans assets.ts
      intro: 'animation_start',
      idle: 'animation_idle',
      outro: undefined,
    },
  },
  // ... autres niveaux
};
```

**IMPORTANT - Layout dans le composant, pas dans la config:**

```typescript
// ❌ MAUVAIS - ne pas mettre scale/offset dans winLevelMap
animation: {
  assetKey: 'winNice',
  scale: 0.15,        // NON!
  offsetY: -100,      // NON!
}

// ✅ BON - mettre scale/offset dans WinAnimation.svelte
// WinAnimation.svelte
const DESKTOP_SCALE = 0.15;
const DESKTOP_OFFSET_Y = -100;
const MOBILE_SCALE = 0.08;
const MOBILE_OFFSET_Y = -80;
```

**WinAnimation.svelte:**
```svelte
<script lang="ts">
  // Layout dans le composant (facile à ajuster)
  const DESKTOP_OFFSET_Y = -75;
  const DESKTOP_SCALE = 0.3;
  const MOBILE_OFFSET_Y = -80;
  const MOBILE_SCALE = 0.08;

  const isMobile = $derived(context.stateLayoutDerived.isStacked());
  const spineScale = $derived(isMobile ? MOBILE_SCALE : DESKTOP_SCALE);
  const offsetY = $derived(isMobile ? MOBILE_OFFSET_Y : DESKTOP_OFFSET_Y);

  // Centrer sur l'écran
  const centerX = $derived(context.stateLayoutDerived.canvasSizes().width * 0.5);
  const centerY = $derived(context.stateLayoutDerived.canvasSizes().height * 0.5);
</script>

<SpineProvider
  scale={spineScale}
  x={centerX}
  y={centerY + offsetY}
  key={props.animationMap.assetKey}
>
  <SpineTrack ... />
</SpineProvider>
```

### 6. Flux des Events Bonus

```
fs-triggered / show-fs-total-win Flow:

1. fs-triggered
   → freeSpinIntroShow
   → freeSpinIntroUpdate (avec nombre de FS)
   → freeSpinIntroHide
   → Transition vers freegame

2. show-fs-total-win
   → skipWinAfterOutro = true  // Skip le show-final-win qui suit
   → freeSpinOutroShow
   → freeSpinOutroCountUp (avec montant total)
   → freeSpinOutroHide
   → Transition vers basegame

3. show-final-win (si présent après show-fs-total-win)
   → SKIP car skipWinAfterOutro = true
   → Reset flag
```

**Pourquoi skip show-final-win après l'outro?**
- L'outro affiche déjà le gain total
- `show-final-win` viendrait après et serait redondant
- Le RGS envoie les deux events, on skip le deuxième

### 6.1 Free Spins Retrigger (fs-retrigger)

Quand des scatters apparaissent pendant les free spins, ils ajoutent des spins supplémentaires.

**Event backend:**
```typescript
{
    type: 'fs-retrigger';
    scatterCount: number;     // Nombre de scatters (1-5)
    extraSpins: number;       // Spins ajoutés (ex: scatterCount × 2)
    totalFs: number;          // Nouveau total
    positions: { reel: number; row: number }[];
}
```

**Flux d'animation:**
```
fs-retrigger
   → Dimmer les symboles non-scatter (stateWinLoop.positions)
   → Jouer son scatter (sfx_scatter_04)
   → Animer les symboles scatter
   → Afficher "+X" sur chaque scatter (RetriggerOverlay)
   → Attendre fin animation (showRetriggerOverlay)
   → Masquer overlay (hideRetriggerOverlay)
   → Mettre à jour compteur FS (freeSpinCounterUpdate)
```

**RetriggerOverlay.svelte:**

Ce composant affiche "+X" (ex: "+2") sur chaque position de scatter avec la même animation que WinAmount:

```typescript
// Configuration (identique à WinAmount)
const DISPLAY_SCALE = 0.1;
const APPEAR_SCALE_FROM = 0.5;
const APPEAR_DURATION_MS = 150;
const CONTAINER_SCALE_END = 1.1;
const CONTAINER_MOVE_UP_PX = 50;
const CONTAINER_ANIM_DURATION = 1500;
const FADE_OUT_DELAY_MS = 800;
const FADE_OUT_DURATION_MS = 300;
```

**State (stateGame.svelte.ts):**

```typescript
// Retrigger state
export const stateRetrigger = $state({
    positions: [] as { reel: number; row: number }[],
    extraSpins: 0,
    isVisible: false,
    animationCompleteResolver: null as (() => void) | null,
});

// Show retrigger overlay - returns Promise
export const showRetriggerOverlay = (
    positions: { reel: number; row: number }[],
    extraSpins: number
): Promise<void> => { ... };

// Hide retrigger overlay
export const hideRetriggerOverlay = () => { ... };

// Called by component when animation completes
export const onRetriggerComplete = () => { ... };
```

**Sprites requis (pack_number):**

Le caractère `+` doit être mappé dans `WinAmountSprites.svelte`:

```typescript
const charToFrame: Record<string, string> = {
    // ... chiffres 0-9 ...
    '+': 'plus_R',  // Pour le retrigger (+2, +4, etc.)
};
```

### 7. Checklist Implémentation

- [ ] Convertir `pack_number.atlas` → `pack_number.json`
- [ ] Déclarer `packNumber` (type: 'sprites') dans assets.ts
- [ ] Créer/adapter `FreeSpinNumberSlots.svelte` avec les bonnes clés
- [ ] Créer/adapter `WinAmountSprites.svelte` avec les bonnes clés
- [ ] Déclarer les Spine intro/outro dans assets.ts (`bonusIntro`, `bonusOutro`)
- [ ] Vérifier les noms d'animation dans les JSON Spine
- [ ] Configurer `winLevelMap.ts` avec les bons assetKeys
- [ ] Layout (scale, offset) dans les composants, PAS dans la config
- [ ] Ajouter `skipWinAfterOutro` dans bookEventHandlerMap pour éviter double affichage

---

## ⚠️ WIN AMOUNTS - AFFICHAGE DES MONTANTS SUR LE BOARD

> **Cette section explique comment afficher les gains sur le board. Plusieurs approches sont possibles selon les besoins du projet.**
>
> **📄 Sections liées:**
> - [Paylines](#paylines-lignes-gagnantes) - Les paylines s'affichent via `WinAmounts`
> - [DIMMING DES SYMBOLES](#️-dimming-des-symboles---obscurcissement-avec-fade) - Obscurcissement des symboles non-gagnants
> - Section 8.1 ci-dessous - **IMPORTANT: Gestion du blocage des spins**

### 1. Choix du Mode d'Affichage

**Question à poser au client/designer:** Comment voulez-vous afficher les gains ?

```
┌─────────────────────────────────────────────────────────────┐
│  MODE A: TOUT EN MÊME TEMPS                                 │
│                                                             │
│  → Tous les symboles gagnants s'animent ensemble            │
│  → Toutes les paylines s'affichent ensemble                 │
│  → Un seul montant total affiché                            │
│  → Simple et rapide                                         │
├─────────────────────────────────────────────────────────────┤
│  MODE B: PAR PAYLINE (séquentiel)                           │
│                                                             │
│  → Payline 1: symboles + payline + montant                  │
│  → Payline 2: symboles + payline + montant                  │
│  → etc.                                                     │
│  → Classique, montre chaque ligne gagnante                  │
├─────────────────────────────────────────────────────────────┤
│  MODE C: PAR SYMBOLE (séquentiel)                           │
│                                                             │
│  → Tous les L3 d'abord (combos + montant total L3)          │
│  → Puis tous les H1 (combos + montant total H1)             │
│  → etc.                                                     │
│  → Montre l'importance de chaque symbole                    │
├─────────────────────────────────────────────────────────────┤
│  MODE D: PAR GROUPE DE MULTIPLICATEUR (séquentiel)          │
│                                                             │
│  → Groupe sans multi: symboles + paylines + montant         │
│  → Groupe avec x5: symboles + paylines + "100 x5 = 500"    │
│  → etc.                                                     │
│  → Idéal pour jeux avec multiplicateurs (VS, wilds, etc.)   │
└─────────────────────────────────────────────────────────────┘
```

**Éléments optionnels à décider:**
- [ ] Afficher les montants sur le board ? (ou juste dans le HUD)
- [ ] Afficher les paylines ? (animations Spine)
- [ ] Dimming des symboles non-gagnants ?
- [ ] Animation de fusion (montant × multi → résultat) ?
- [ ] Boucle d'animation en attente du prochain spin ?

### 1.1 Exemple: Mode D (Par Groupe de Multiplicateur)

Ce mode est utilisé pour les jeux avec des multiplicateurs (VS, sticky wilds, etc.):

```
┌─────────────────────────────────────────────────────────────┐
│  Groupe 1 (sans multi) :                                    │
│    → Symboles du groupe s'animent                           │
│    → Paylines du groupe s'affichent                         │
│    → "150.00" apparaît au centre des symboles              │
│                                                             │
│  Groupe 2 (avec multi x5) :                                │
│    → Symboles du groupe s'animent                           │
│    → Paylines du groupe s'affichent                         │
│    → "50.00 x5" apparaît → fusion → "250.00"               │
│                                                             │
│  Groupe 3 (avec multi x3) :                                │
│    → Symboles du groupe s'animent                           │
│    → "20.00 x3" apparaît → "60.00"                         │
└─────────────────────────────────────────────────────────────┘
```

### 2. Structure des Données (Types)

**Fichier**: `src/game/types/typesBookEvent.ts`

La structure de base est la même pour tous les modes:

```typescript
// Position d'un symbole dans une combinaison
export type EnrichedCombinationPosition = {
    reel: number;      // Colonne (0-4)
    row: number;       // Ligne (0-4)
    isWild: boolean;   // Si c'est un wild
};

// Une combinaison gagnante
export type EnrichedCombination = {
    kind: number;                            // Nombre de symboles (3, 4, ou 5)
    baseSymbol: string;                      // ID du symbole (ex: "L3", "H1")
    positions: EnrichedCombinationPosition[];
    payout: number;                          // Gain de cette combinaison
    lineNumber: number;                      // Numéro de payline (1-15) pour animation
};
```

**Structure selon le mode choisi:**

```typescript
// MODE A/B: Liste simple de combinaisons
type BookEventShowWins_Simple = {
    type: 'show-wins';
    combinations: EnrichedCombination[];  // Toutes les combos
    totalPayout: number;
};

// MODE C: Groupé par symbole (frontend peut regrouper lui-même)
// → Utiliser la structure simple, le frontend groupe par baseSymbol

// MODE D: Groupé par multiplicateur (backend pré-groupe)
type WinGroup = {
    multiplierSources: number[];   // Colonnes VS qui donnent le multi
    multiplier: number;            // 1 si pas de multi, sinon le multiplicateur
    combinations: EnrichedCombination[];
    groupPayout: number;           // Somme AVANT multiplicateur
    groupFinalPayout: number;      // groupPayout × multiplier
};

type BookEventShowWins_Grouped = {
    type: 'show-wins';
    winGroups: WinGroup[];
    totalFinalPayout: number;
};
```

**⚠️ IMPORTANT: Conversion des Payout en Montants Réels**

Les champs `groupPayout` et `groupFinalPayout` sont envoyés par le backend en **unités de mise (multiplicateurs)**, pas en montants réels. Par exemple, `groupPayout: 5.5` signifie 5.5× la mise.

**Dans `WinAmounts.svelte`, il faut convertir ces valeurs avant de les afficher:**

```typescript
import { stateBet } from 'state-shared';

// Dans displayGroups(), lors de la création du displayGroup:
const displayGroup: DisplayGroup = {
    id: groupIdCounter++,
    x: pos.x,
    y: pos.y,
    // Convertir de multiplicateur vers montant réel
    groupPayout: group.groupPayout * stateBet.betAmount,
    groupFinalPayout: group.groupFinalPayout * stateBet.betAmount,
    multiplier: group.multiplier,
};
```

**Exemple:**
- Backend envoie: `groupFinalPayout: 22176` (multiplicateur)
- Bet amount: `10,000,000,000` IDR
- Montant réel affiché: `22176 × 10,000,000,000 = 221,760,000,000,000` IDR

> ⚠️ Sans cette conversion, les montants affichés seront incorrects (ex: "22,176.00" au lieu de "221,760,000,000,000.00").

**Note: Format des Events Win (Alignement Cactus Cash)**

Les events de win utilisent deux formats différents selon le mode:

| Event | Champ | Format | Mode Normal | Mode Replay |
|-------|-------|--------|-------------|-------------|
| `show-wins` | `groupPayout`, `groupFinalPayout` | Multiplicateur direct | `× betAmount` | `× betAmount` |
| `show-final-win` | `amount` | Multiplicateur × 100 | Direct (cap appliqué) | Direct (sans conversion) |
| `setTotalWin` | `amount` | Multiplicateur × 100 | `capToMaxWin()` | Direct (sans conversion) |
| `show-fs-spin-win` | `amount` | Multiplicateur × 100 | Direct (cap appliqué) | Direct (sans conversion) |
| `show-fs-total-win` | `amount` | Multiplicateur × 100 | `capToMaxWin()` | Direct (sans conversion) |

Le format `amount = multiplier × 100` est aligné sur Cactus Cash pour compatibilité replay.

**Important:** Pour les events `amount` (`show-final-win`, `setTotalWin`, `show-fs-spin-win`, `show-fs-total-win`), `amount` est déjà en book units (`multiplier × 100`) dans les **deux modes** (normal et replay). Il ne doit JAMAIS être multiplié par `betAmount` côté handler. Le rendu via `bookEventAmountToCurrencyString` applique automatiquement `wageredBetAmount` au moment de l'affichage.

> ⚠️ **Bug historique (fix 2026-05):** `show-final-win` et `show-fs-spin-win` faisaient `bookEvent.amount × stateBet.betAmount` en mode normal. Cela double-appliquait le facteur bet (le rendu re-multiplie par `wageredBetAmount`). Invisible quand `betAmount === 1` (devise classique), mais en mode social où `betAmount ≈ 200` (tokens), le HUD et le popup big-win affichaient **200× la valeur correcte**. Le bonus (`setTotalWin`) n'avait jamais ce bug car il stocke `amount` directement via `capToMaxWin`. Voir Changelog 2026-05 "Social mode win display".

> ⚠️ **Bug max win cap (fix 2026-05):** `capToMaxWin` calculait `bet × MAX_WIN_MULTIPLIER × BOOK_AMOUNT_MULTIPLIER` (incluait `betAmount`). Comme les book amounts sont bet-independent et que le rendu applique `wageredBetAmount`, le `bet` était double-appliqué côté cap. Visible quand `bet < 1` : ex à `bet = 0.01`, le cap collapse à `12 500` book units → HUD plafonné à **1.25 GC** au lieu de **125 GC** (= 12500× bet). Mode replay n'avait jamais le bug car il utilisait déjà `MAX_WIN_MULTIPLIER * BOOK_AMOUNT_MULTIPLIER` direct (sans `bet`). Fix : suppression de `bet` dans `capToMaxWin` (alignement sur la formule replay). Voir Changelog 2026-05 "Max win cap bet-double".

> ⚠️ Seul `show-wins` (`groupPayout` / `groupFinalPayout`) doit être multiplié par `betAmount` côté frontend (cf. `WinAmounts.svelte:216-217`), parce que ces champs sont des **multiplicateurs purs** (pas en book units) et que `WinAmount.svelte` les rend sans appliquer `wageredBetAmount`.

**Choix de la structure:**
| Mode | Structure Backend | Regroupement |
|------|-------------------|--------------|
| A (tout ensemble) | Simple ou Grouped | Frontend ignore les groupes |
| B (par payline) | Simple | Frontend itère sur combinations |
| C (par symbole) | Simple | Frontend groupe par baseSymbol |
| D (par multiplicateur) | Grouped | Backend pré-groupe par multiplier |

### 3. Structure des Composants

```
src/components/win/
├── WinAmountSingle.svelte   # Container pour affichage séquentiel (1 groupe à la fois)
├── WinAmount.svelte         # Un montant individuel avec animation
└── WinAmountSprites.svelte  # Affichage du montant avec sprites chiffres
```

**📄 Pour `WinAmountSprites.svelte`:** Voir la section **"⚠️ BONUS INTRO/OUTRO ET WIN TEXTS"** → **"3. Composant WinAmountSprites"** pour le pattern d'affichage des chiffres avec sprites.

---

## 🎯 SYSTÈME DE GROUPEMENT DES ANIMATIONS (Animation Groups)

> **Cette section explique le système modulaire de groupement des combinaisons gagnantes pour l'animation.**
>
> Le système permet de choisir comment les combinaisons gagnantes sont affichées :
> - **Mode `individual`**: Chaque combinaison s'anime séparément
> - **Mode `shared-positions`**: Les combinaisons qui partagent des symboles s'animent ensemble
> - **Mode `all-at-once`**: Toutes les combinaisons s'affichent en même temps (pas de séquence)

### 3.1 Types de Données

**Fichier**: `src/game/state/stateGame.svelte.ts`

```typescript
// Données d'une combinaison pour l'affichage séquentiel
export type CombinationForDisplay = {
    positions: { reel: number; row: number }[];  // Positions des symboles (avec padding +1)
    lineNumber: number;                           // Numéro de payline (1-15)
    payout: number;                               // Gain avant multiplicateur
    multiplier: number;                           // Multiplicateur (1 si aucun)
    finalPayout: number;                          // Gain après multiplicateur
    baseSymbol: string;                           // Symbole de base (ex: 'L3', 'H1')
};

// Groupe d'animations - plusieurs combinaisons animées ensemble
export type AnimationGroup = {
    positions: { reel: number; row: number }[];  // Union de toutes les positions (pour dimming)
    paylines: PaylineData[];                      // Toutes les paylines à afficher
    totalPayout: number;                          // Somme des payouts (avant multiplier)
    totalFinalPayout: number;                     // Somme des payouts finaux (après multiplier)
    multiplier: number;                           // Multiplicateur commun
    combinations: CombinationForDisplay[];        // Combinaisons originales (pour référence)
};
```

### 3.2 Configuration du Mode de Groupement

**Fichier**: `src/game/handlers/bookEventHandlerMap.ts`

```typescript
// ============================================
// WIN SEQUENCE - Configuration
// ============================================
const SYMBOL_STAGGER_DELAY_MS = 100; // Délai entre chaque symbole (gauche → droite)

// Mode de groupement - CHANGER CETTE VALEUR pour switcher le comportement
type GroupingMode = 'individual' | 'shared-positions';
const GROUPING_MODE: GroupingMode = 'shared-positions';
```

**Modes disponibles:**

| Mode | Comportement | Utilisation |
|------|--------------|-------------|
| `individual` | Chaque combinaison a son propre groupe | Animation détaillée, plus longue |
| `shared-positions` | Combinaisons qui partagent des positions sont groupées | Animation plus courte, logique |

### 3.3 Stratégies de Groupement

**Stratégie 1: Individual (chaque combo séparément)**

```typescript
function groupCombinationsIndividually(combinations: CombinationForDisplay[]): AnimationGroup[] {
    return combinations.map(combo => ({
        positions: [...combo.positions],
        paylines: [{ lineNumber: combo.lineNumber, symbolCount: combo.positions.length }],
        totalPayout: combo.payout,
        totalFinalPayout: combo.finalPayout,
        multiplier: combo.multiplier,
        combinations: [combo],
    }));
}
```

**Stratégie 2: Shared-Positions (groupement intelligent)**

Cette stratégie utilise l'algorithme **Union-Find** pour grouper les combinaisons qui:
1. Partagent au moins une position (symbole en commun)
2. Ont le même multiplicateur
3. Ont le même symbole de base (évite de grouper des symboles différents via Wild)

```typescript
function groupCombinationsBySharedPositions(combinations: CombinationForDisplay[]): AnimationGroup[] {
    if (combinations.length === 0) return [];

    // Helper: vérifie si deux combinaisons partagent une position
    const sharePosition = (a: CombinationForDisplay, b: CombinationForDisplay): boolean => {
        for (const posA of a.positions) {
            for (const posB of b.positions) {
                if (posA.reel === posB.reel && posA.row === posB.row) {
                    return true;
                }
            }
        }
        return false;
    };

    // Union-Find pour le groupement
    const parent: number[] = combinations.map((_, i) => i);

    const find = (i: number): number => {
        if (parent[i] !== i) {
            parent[i] = find(parent[i]); // Path compression
        }
        return parent[i];
    };

    const union = (i: number, j: number): void => {
        const rootI = find(i);
        const rootJ = find(j);
        if (rootI !== rootJ) {
            parent[rootI] = rootJ;
        }
    };

    // Grouper les combinaisons qui respectent les 3 conditions
    for (let i = 0; i < combinations.length; i++) {
        for (let j = i + 1; j < combinations.length; j++) {
            if (combinations[i].multiplier === combinations[j].multiplier &&
                combinations[i].baseSymbol === combinations[j].baseSymbol &&
                sharePosition(combinations[i], combinations[j])) {
                union(i, j);
            }
        }
    }

    // Construire les groupes
    const groupsMap = new Map<number, CombinationForDisplay[]>();
    for (let i = 0; i < combinations.length; i++) {
        const root = find(i);
        if (!groupsMap.has(root)) {
            groupsMap.set(root, []);
        }
        groupsMap.get(root)!.push(combinations[i]);
    }

    // Convertir en AnimationGroup[]
    const groups: AnimationGroup[] = [];
    for (const combos of groupsMap.values()) {
        // Union des positions (dédupliquées)
        const positionsSet = new Map<string, { reel: number; row: number }>();
        for (const combo of combos) {
            for (const pos of combo.positions) {
                const key = `${pos.reel},${pos.row}`;
                if (!positionsSet.has(key)) {
                    positionsSet.set(key, { reel: pos.reel, row: pos.row });
                }
            }
        }

        // Paylines
        const paylines: PaylineData[] = combos.map(combo => ({
            lineNumber: combo.lineNumber,
            symbolCount: combo.positions.length,
        }));

        // Totaux
        const totalPayout = combos.reduce((sum, c) => sum + c.payout, 0);
        const totalFinalPayout = combos.reduce((sum, c) => sum + c.finalPayout, 0);

        groups.push({
            positions: Array.from(positionsSet.values()),
            paylines,
            totalPayout,
            totalFinalPayout,
            multiplier: combos[0].multiplier,
            combinations: combos,
        });
    }

    return groups;
}
```

**Fonction de sélection:**

```typescript
function groupCombinations(combinations: CombinationForDisplay[]): AnimationGroup[] {
    switch (GROUPING_MODE) {
        case 'individual':
            return groupCombinationsIndividually(combinations);
        case 'shared-positions':
            return groupCombinationsBySharedPositions(combinations);
        default:
            return groupCombinationsIndividually(combinations);
    }
}
```

### 3.4 Séquence d'Animation (playWinSequence)

**Fichier**: `src/game/handlers/bookEventHandlerMap.ts`

```typescript
async function playWinSequence(
    combinations: CombinationForDisplay[],
    signal: AbortSignal
): Promise<void> {
    const groups = groupCombinations(combinations);

    // Son de loop pour les séquences longues (> 2 groupes)
    const shouldPlayIncreaseSfx = groups.length > 2;
    if (shouldPlayIncreaseSfx) {
        eventEmitter.broadcast({ type: 'soundLoop', name: 'sfx_win_amount_increase' });
    }

    for (const group of groups) {
        if (signal.aborted) {
            if (shouldPlayIncreaseSfx) eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_win_amount_increase' });
            return;
        }

        // ⚠️ Reset skip flag au début de CHAQUE groupe — ne jamais laisser fuiter entre groupes
        stateWinLoop.skipGroupRequested = false;

        // 0. Sons de win pour ce groupe
        eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_win' });
        // Son spécial selon le montant (optionnel selon les assets disponibles)
        if (group.totalFinalPayout >= 50) {
            eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_epic_win_winAmount' });
        } else if (group.totalFinalPayout >= 10) {
            eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_big_win_winAmount' });
        }

        // 1. Définir les positions de CE groupe (dimme tous les autres symboles)
        const filteredPositions = filterDuelColumns(group.positions);
        stateWinLoop.positions = filteredPositions;

        // 2. Afficher les paylines de ce groupe
        showPaylines(group.paylines);

        // 3. Animer les symboles UN PAR UN (gauche → droite) avec stagger
        // WinAmount est lancé 2 symboles avant la fin pour un chevauchement visuel
        const sortedPositions = [...filteredPositions].sort((a, b) => a.reel - b.reel);
        let winAmountPromise: Promise<void> | null = null;

        for (let i = 0; i < sortedPositions.length; i++) {
            if (signal.aborted || stateWinLoop.skipGroupRequested) break;

            const pos = sortedPositions[i];
            eventEmitter.broadcast({
                type: 'boardWithAnimateSymbols',
                symbolPositions: [pos],
            });

            // Lancer WinAmount 2 symboles avant la fin (chevauchement visuel)
            if (i === sortedPositions.length - 3) {
                winAmountPromise = showWinAmountGroup(group);
            }

            // Délai stagger ANNULABLE par requestSkipCurrentGroup()
            if (i < sortedPositions.length - 1) {
                const staggerDelay = SYMBOL_STAGGER_DELAY_MS / stateBetDerived.timeScale();
                await new Promise<void>(r => {
                    const t = setTimeout(r, staggerDelay);
                    stateWinLoop.skipGroupResolve = () => { clearTimeout(t); r(); };
                });
                stateWinLoop.skipGroupResolve = null;
            }
        }

        // 4. Attendre WinAmount — SAUF si skip (hideWinAmountGroup déjà appelé par requestSkipCurrentGroup)
        if (!stateWinLoop.skipGroupRequested) {
            await (winAmountPromise ?? showWinAmountGroup(group));
        }

        if (signal.aborted) return;

        // 5. Cleanup — toujours exécuté (skip ou non)
        hidePaylines();
        hideWinAmountGroup();

        // 6. Reset les Wilds pour ré-animation dans le groupe suivant
        resetWildsToStatic();
    }

    // Après la séquence: enlever le dimming
    if (!signal.aborted) {
        stateWinLoop.positions = [];
    }
}
```

### 3.5 Gestion des Wilds Multi-Combinaisons

**Problème:** Un Wild peut faire partie de plusieurs combinaisons gagnantes (avec différents symboles). Si on ne reset pas son état, il ne s'anime qu'une fois.

**Solution:** La fonction `resetWildsToStatic` remet SEULEMENT les Wilds en état `static`, sans toucher aux autres symboles (qui doivent rester en `postWinStatic`).

```typescript
// Dans stateGame.svelte.ts
export const resetWildsToStatic = () => {
    stateGame.board.forEach((reel) => {
        reel.reelState.symbols.forEach((symbol) => {
            if (symbol.rawSymbol?.name === 'W' &&
                (symbol.symbolState === 'win' || symbol.symbolState === 'postWinStatic')) {
                symbol.symbolState = 'static';
            }
        });
    });
};
```

**Pourquoi cette distinction:**
- **Symboles normaux (L1, H1, etc.)**: Restent en `postWinStatic` après leur animation
- **Wilds**: Reviennent en `static` pour pouvoir rejouer leur animation dans le groupe suivant

### 3.6 Système de Callback Promise avec Animation ID (oncomplete)

**Problème:** En free spins, le spin suivant ne doit pas démarrer avant la fin de l'animation de win.

**Solution:** `showWinAmountGroup` retourne une Promise qui se résout quand l'animation est terminée.

---

#### ⚠️ PROBLÈME CRITIQUE: Race Condition avec Composants Async

**Le bug:** Quand un composant Svelte est unmount (remplacé par un nouveau), son code async **continue de s'exécuter**. Si l'ancien composant appelle `oncomplete()`, il résout la Promise du **nouveau** groupe, pas celle de son propre groupe.

**Symptôme:** Les animations de win sont "coupées" - le groupe suivant démarre avant que l'animation précédente soit terminée.

**Exemple du problème:**
```
Groupe 1 démarre → WinAmount A mount
Groupe 1 termine → appel showWinAmountGroup(groupe 2)
                 → WinAmount A unmount (mais async continue!)
                 → WinAmount B mount
                 → WinAmount A.oncomplete() résout la Promise de groupe 2 ❌
```

---

#### ✅ SOLUTION: Animation ID Pattern

Chaque groupe reçoit un `animationId` unique. Le composant capture cet ID au mount et le passe à `oncomplete()`. Seul le composant avec le bon ID peut résoudre la Promise.

**Dans stateGame.svelte.ts:**

```typescript
export const stateWinAmountGroup = $state({
    currentGroup: null as AnimationGroup | null,
    isVisible: false,
    animationCompleteResolver: null as (() => void) | null,
    animationId: 0,  // ← ID unique pour chaque groupe
});

// Afficher un groupe et retourner une Promise
export const showWinAmountGroup = (group: AnimationGroup): Promise<void> => {
    // IMPORTANT: Incrémenter l'ID AVANT de créer la Promise
    stateWinAmountGroup.animationId++;
    return new Promise((resolve) => {
        stateWinAmountGroup.animationCompleteResolver = resolve;
        stateWinAmountGroup.currentGroup = group;
        stateWinAmountGroup.isVisible = true;
    });
};

// Appelé par le composant - DOIT passer l'animationId capturé au mount
export const onWinAmountGroupCompleteWithId = (animationId: number) => {
    // Ignorer si ce n'est pas le bon groupe (ancien composant)
    if (animationId !== stateWinAmountGroup.animationId) {
        return; // ← Ignorer les appels des anciens composants
    }
    if (stateWinAmountGroup.animationCompleteResolver) {
        stateWinAmountGroup.animationCompleteResolver();
        stateWinAmountGroup.animationCompleteResolver = null;
    }
};

export const hideWinAmountGroup = () => {
    stateWinAmountGroup.isVisible = false;
    stateWinAmountGroup.currentGroup = null;
    // Résoudre si l'animation a été interrompue
    if (stateWinAmountGroup.animationCompleteResolver) {
        stateWinAmountGroup.animationCompleteResolver();
        stateWinAmountGroup.animationCompleteResolver = null;
    }
};
```

**Dans WinAmountSingle.svelte:**

```svelte
<script lang="ts">
    import WinAmount from './WinAmount.svelte';
    import BoardContainer from '../board/BoardContainer.svelte';
    import { stateWinAmountGroup, onWinAmountGroupCompleteWithId } from '../../game/state/stateGame.svelte';
    import { getGroupDisplayPosition } from '../../game/utils/winAmountUtils';

    let currentGroup = $derived(stateWinAmountGroup.currentGroup);
    let isVisible = $derived(stateWinAmountGroup.isVisible);
    // Passer l'animationId au composant WinAmount
    let animationId = $derived(stateWinAmountGroup.animationId);

    // Clé unique pour forcer le remount à chaque nouveau groupe
    let groupKey = $state(0);
    let lastGroupRef = null;

    $effect(() => {
        if (currentGroup && currentGroup !== lastGroupRef) {
            groupKey++;
            lastGroupRef = currentGroup;
        }
    });

    // Calculer la position d'affichage
    // IMPORTANT: Soustraire 1 au row car les positions ont +1 pour le padding
    const displayPosition = $derived.by(() => {
        if (!currentGroup) return { x: 0, y: 0 };
        const positionsWithoutPadding = currentGroup.positions.map(p => ({
            reel: p.reel,
            row: p.row - 1,  // Retirer le padding
        }));
        return getGroupDisplayPosition(positionsWithoutPadding);
    });
</script>

{#if isVisible && currentGroup}
    {#key groupKey}
        <BoardContainer>
            <WinAmount
                x={displayPosition.x}
                y={displayPosition.y}
                groupPayout={...}
                groupFinalPayout={...}
                multiplier={currentGroup.multiplier}
                {animationId}
                oncomplete={onWinAmountGroupCompleteWithId}
            />
        </BoardContainer>
    {/key}
{/if}
```

**Dans WinAmount.svelte:**

```svelte
<script lang="ts">
    interface Props {
        x: number;
        y: number;
        groupPayout: number;
        groupFinalPayout: number;
        multiplier: number;
        animationId: number;  // ← ID reçu du parent
        oncomplete?: (animationId: number) => void;
    }

    let { animationId, oncomplete = () => {}, ...rest }: Props = $props();

    // CRITIQUE: Capturer l'ID au moment du mount
    // Ne pas utiliser $derived car l'ID peut changer pendant l'async
    const capturedAnimationId = animationId;

    const runAnimation = async () => {
        // ... animations ...

        // Passer l'ID capturé, PAS la prop réactive
        oncomplete(capturedAnimationId);
    };
</script>
```

---

#### 🚫 ERREURS À NE PAS FAIRE

1. **NE PAS utiliser la prop réactive dans oncomplete:**
   ```typescript
   // ❌ MAUVAIS - animationId peut avoir changé
   oncomplete(animationId);

   // ✅ BON - utiliser la valeur capturée au mount
   const capturedAnimationId = animationId;
   oncomplete(capturedAnimationId);
   ```

2. **NE PAS oublier d'incrémenter l'ID avant la Promise:**
   ```typescript
   // ❌ MAUVAIS - l'ID est le même que le groupe précédent
   return new Promise((resolve) => {
       stateWinAmountGroup.animationId++;  // Trop tard!
       // ...
   });

   // ✅ BON - incrémenter AVANT
   stateWinAmountGroup.animationId++;
   return new Promise((resolve) => {
       // ...
   });
   ```

3. **NE PAS ignorer le problème des composants async unmount:**
   - En Svelte (et React), l'unmount d'un composant n'arrête PAS le code async en cours
   - Les `setTimeout`, `await`, et Promises continuent après l'unmount
   - C'est pourquoi l'Animation ID pattern est nécessaire

### 3.7 Intégration du TimeScale (Mode Turbo)

**⚠️ IMPORTANT:** Toutes les durées et délais doivent être divisés par `stateBetDerived.timeScale()` pour supporter le mode turbo.

**Dans bookEventHandlerMap.ts:**

```typescript
// Délai stagger
const staggerDelay = SYMBOL_STAGGER_DELAY_MS / stateBetDerived.timeScale();
await new Promise(r => setTimeout(r, staggerDelay));
```

**Dans WinAmount.svelte:**

```typescript
import { stateBetDerived } from 'state-shared';

const runAnimation = async () => {
    const ts = stateBetDerived.timeScale(); // Récupérer une fois au début

    // Toutes les durées divisées par timeScale
    await containerScale.set(1, { duration: APPEAR_DURATION_MS / ts });
    containerScale.set(CONTAINER_SCALE_END, { duration: CONTAINER_ANIM_DURATION / ts });
    containerY.set(-CONTAINER_MOVE_UP_PX, { duration: CONTAINER_ANIM_DURATION / ts });

    if (hasMultiplier) {
        await new Promise(resolve => setTimeout(resolve, FUSION_DELAY_MS / ts));
        // ... autres animations avec / ts
    }

    await containerAlpha.set(0, { duration: FADE_OUT_DURATION_MS / ts });
    oncomplete();
};
```

### 3.8 Handler show-wins (Base Game vs Free Spins vs Bonus Trigger)

**⚠️ CAS IMPORTANT: Trigger de Bonus (fs-triggered)**

Quand un bonus est déclenché (`fs-triggered` dans la liste des events), les animations de win DOIVENT se terminer AVANT l'animation des scatters. Sinon, l'animation scatter coupe les animations de win.

**Contexte disponible:**
Le handler `show-wins` reçoit `bookEvents` (liste de tous les events du spin) dans le contexte. Cela permet de détecter si un bonus va être déclenché.

```typescript
'show-wins': async (
    bookEvent: BookEventOfType<'show-wins'>,
    { bookEvents }: BookEventContext  // ← Liste de tous les events
) => {
    if (!bookEvent.winGroups || bookEvent.winGroups.length === 0) {
        return;
    }

    const combinations = extractCombinationsForDisplay(bookEvent.winGroups);
    if (combinations.length === 0) return;

    stateWinLoop.abortController = new AbortController();
    const signal = stateWinLoop.abortController.signal;

    // Détecter si un bonus va être déclenché
    const hasBonusTrigger = bookEvents.some(
        (e) => e.type === 'fs-triggered' || e.type === 'freeSpinTrigger'
    );

    // Stocker la Promise pour que d'autres handlers puissent l'await
    const sequencePromise = playWinSequence(combinations, signal);
    stateWinLoop.sequencePromise = sequencePromise;

    // Quand attendre la fin des animations:
    // 1. En free spins (prochain spin auto)
    // 2. Quand un bonus va être déclenché (animation scatter)
    // 3. En autoplay (skip pendant spin ne doit pas couper les win amounts)
    // Non-autoplay base game sans bonus: fire and forget (joueur relance manuellement)
    const shouldAwait = stateGame.gameType === 'freegame'
        || hasBonusTrigger
        || stateBetDerived.hasAutoBetCounter();

    if (shouldAwait) {
        await sequencePromise;
    }
},
```

**État supplémentaire pour sequencePromise:**

```typescript
// Dans stateGame.svelte.ts
export const stateWinLoop = $state({
    positions: [] as { reel: number; row: number }[],
    abortController: null as AbortController | null,
    sequencePromise: null as Promise<void> | null,  // ← Pour await depuis d'autres handlers
});
```

**Handler fs-triggered (attend la fin des wins):**

```typescript
'fs-triggered': async (bookEvent: BookEventOfType<'fs-triggered'>) => {
    // Attendre la fin des animations de win si elles sont en cours
    if (stateWinLoop.sequencePromise) {
        await stateWinLoop.sequencePromise;
    }

    // Maintenant lancer l'animation des scatters
    stateWinLoop.positions = bookEvent.positions.map(p => ({
        reel: p.reel,
        row: p.row + 1,  // +1 pour le padding
    }));
    // ... reste de l'animation scatter
},
```

**Handler show-final-win (big win en base game — attend la fin des wins):**

⚠️ **Cas symétrique à `fs-triggered`** : en base game (hors bonus, hors autoplay), `show-wins` lance les animations en **fire-and-forget** (`shouldAwait = false`). Si `show-final-win` enchaîne immédiatement la big win, l'overlay coupe les animations de winGroup en cours.

**❌ Ancienne version (buggée) — `setTimeout` arbitraire :**

```typescript
if (isBigWin) {
    stateSpin.isBigWinPlaying = true;
    stateSpin.hadBigWin = true;
    if (stateGame.gameType !== 'freegame') {
        // ❌ Délai arbitraire — coupe les anims si elles durent plus de 1s
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}
```

**✅ Version correcte — `await sequencePromise` AVANT de set le flag :**

```typescript
'show-final-win': async (bookEvent) => {
    // ... calcul displayAmount, winLevelData, etc.

    const isBigWin = bookEvent.winLevel >= 1;

    // En base game, show-wins est fire-and-forget. Attendre la fin des anims
    // de winGroup AVANT de set isBigWinPlaying, pour que le skip wingroup reste
    // disponible pendant l'attente.
    // En freegame, show-wins await déjà → sequencePromise déjà resolved.
    if (isBigWin && stateGame.gameType !== 'freegame' && stateWinLoop.sequencePromise) {
        await stateWinLoop.sequencePromise;
    }

    if (isBigWin) {
        stateSpin.isBigWinPlaying = true;  // bloque uniquement l'overlay big-win lui-même
        stateSpin.hadBigWin = true;
    }

    // ... fade musique, winShow, winUpdate, winHide, etc.
},
```

**Pourquoi `isBigWinPlaying = true` APRÈS le await :**

- `SpinStopOverlay` guard (`if (isBigWinPlaying) return`) bloque les clics. Si le flag est set AVANT l'await, le skip wingroup est bloqué pendant toute la durée des anims → joueur ne peut plus skip les wingroups (bug observé).
- Pendant l'await, la machine xstate est en `play` → HudPixi click broadcast `stopButtonClick` (pas un nouveau spin) → Board.svelte appelle `requestSkipCurrentGroup`. Donc skip OK, respin impossible.
- Le flag protège uniquement l'overlay big-win (winShow → winUpdate → winHide) qui suit.

**Matrice de comportement :**

| Scénario | sequencePromise au moment du await | Effet |
|----------|-------------------------------------|-------|
| Base big win sans bonus | running (fire-and-forget) | Attend vraie fin → **fix** |
| Base big win + bonus trigger | resolved (show-wins a awaited car hasBonusTrigger) | Instant |
| Autoplay base big win | resolved (show-wins a awaited car hasAutoBetCounter) | Instant |
| Freegame big win | branch skipped (gameType === 'freegame') | Aucun await |
| winLevel 0 (small win) | `isBigWin === false` → bloc entier skipped | Aucun await |

---

#### 🚫 ERREUR À NE PAS FAIRE

**NE PAS utiliser setTimeout pour "attendre" les animations:**
```typescript
// ❌ MAUVAIS - timing arbitraire, ne fonctionne pas
await new Promise(r => setTimeout(r, 2000));
// L'animation peut être plus courte ou plus longue!

// ✅ BON - utiliser la Promise qui se résout quand l'animation est vraiment finie
await stateWinLoop.sequencePromise;
```

### 3.9 Mode "All At Once" (Toutes les Animations Simultanément)

Pour afficher toutes les combinaisons en même temps (sans séquence), il faut modifier le handler `show-wins`:

```typescript
// Configuration
const SEQUENTIAL_MODE = false; // true = séquentiel, false = tout en même temps

'show-wins': async (bookEvent: BookEventOfType<'show-wins'>) => {
    if (!bookEvent.winGroups || bookEvent.winGroups.length === 0) {
        return;
    }

    const combinations = extractCombinationsForDisplay(bookEvent.winGroups);
    if (combinations.length === 0) return;

    eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_win' });

    if (SEQUENTIAL_MODE) {
        // Mode séquentiel (existant)
        stateWinLoop.abortController = new AbortController();
        const signal = stateWinLoop.abortController.signal;

        if (stateGame.gameType === 'freegame') {
            await playWinSequence(combinations, signal);
        } else {
            playWinSequence(combinations, signal);
        }
    } else {
        // Mode "All At Once" - toutes les animations en même temps
        const allPositions = combinations.flatMap(c => c.positions);
        const uniquePositions = deduplicatePositions(allPositions);
        const filteredPositions = filterDuelColumns(uniquePositions);

        // Afficher toutes les paylines
        const allPaylines: PaylineData[] = combinations.map(c => ({
            lineNumber: c.lineNumber,
            symbolCount: c.positions.length,
        }));
        showPaylines(allPaylines);

        // Dimmer les symboles non-gagnants
        stateWinLoop.positions = filteredPositions;
        stateWinLoop.abortController = new AbortController();

        // Animer tous les symboles en même temps
        eventEmitter.broadcast({
            type: 'boardWithAnimateSymbols',
            symbolPositions: filteredPositions,
        });

        // Afficher le win total (optionnel)
        // eventEmitter.broadcast({ type: 'showWinAmounts', winGroups: bookEvent.winGroups });

        // En free spins: attendre avant de continuer
        if (stateGame.gameType === 'freegame') {
            const delay = stateBet.isTurbo ? 1000 : 2000;
            await new Promise(r => setTimeout(r, delay));
        }
    }
},
```

### 3.10 Positionnement du WinAmount

**Fichier**: `src/game/utils/winAmountUtils.ts`

```typescript
import { SYMBOL_SIZE } from '../config/constants';

export type GridPosition = { reel: number; row: number };
export type PixelPosition = { x: number; y: number };

// Convertir position grille → pixels
export const getSymbolX = (reel: number): number => SYMBOL_SIZE * reel + SYMBOL_SIZE / 2;
export const getSymbolY = (row: number): number => SYMBOL_SIZE * row + SYMBOL_SIZE / 2;

// Calculer le centre géométrique d'un groupe de positions
export function getGroupDisplayPosition(positions: GridPosition[]): PixelPosition {
    if (positions.length === 0) {
        return { x: 0, y: 0 };
    }

    const sumX = positions.reduce((sum, pos) => sum + getSymbolX(pos.reel), 0);
    const sumY = positions.reduce((sum, pos) => sum + getSymbolY(pos.row), 0);

    return {
        x: sumX / positions.length,
        y: sumY / positions.length,
    };
}
```

**⚠️ IMPORTANT - Offset de Padding:**
- Les positions dans `AnimationGroup` ont +1 sur le `row` (padding pour l'animation de spin)
- Dans `WinAmountSingle.svelte`, il faut soustraire 1 au row avant de calculer la position d'affichage
- Si vous ne faites pas ça, le win amount sera affiché une case trop bas

### 3.11 Placement dans Game.svelte

Le composant `WinAmountSingle` doit être APRÈS les éléments qu'il doit survoler :

```svelte
<!-- VS Duel animations (bounty mode) -->
<MainContainer>
    <Duels />
</MainContainer>

<!-- Win amounts display (centered on combinations, above duels) -->
<MainContainer>
    <WinAmountSingle />
</MainContainer>
```

### 3.12 Animation de Fusion (WinAmount.svelte)

**Phases de l'animation:**

```
1. APPEAR      → Le montant et le multiplicateur apparaissent côte à côte
2. SHOWING     → Pause pour laisser le joueur voir
3. CONVERGING  → Montant et multi convergent vers le centre + fade out + scale down
4. RESULT      → Le résultat final apparaît (pop in)
5. FADEOUT     → Tout disparaît en fade
6. DONE        → Animation terminée, callback oncomplete()
```

**Configuration hot-reload dans le composant:**

```typescript
// WinAmount.svelte
// ===========================================
// === WIN AMOUNT CONFIG (hot reload)
// ===========================================

// Display scale
const DISPLAY_SCALE = 0.1;             // Scale de base

// Container animation
const CONTAINER_SCALE_END = 1.1;       // Scale final
const CONTAINER_MOVE_UP_PX = 50;       // Monte de X pixels
const CONTAINER_ANIM_DURATION = 1500;  // Durée montée

// Appear animation
const APPEAR_DURATION_MS = 150;
const APPEAR_SCALE_FROM = 0.5;

// Fusion animation (if multiplier)
const FUSION_DELAY_MS = 400;           // Délai avant fusion
const FUSION_CONVERGENCE_MS = 150;     // Durée convergence
const FUSION_SCALE_END = 0.7;          // Scale pendant convergence
const FUSION_RESULT_APPEAR_MS = 100;   // Durée apparition résultat

// Fade out
const FADE_OUT_DELAY_MS = 800;
const FADE_OUT_DURATION_MS = 300;

// Spacing (amount + multiplier)
const CHAR_WIDTH = 250;                // Largeur d'un caractère
const CHAR_SPACING = 10;               // Espacement entre caractères
const GAP_BETWEEN_AMOUNT_AND_MULTI = 20;
```

**⚠️ IMPORTANT:** Toutes les durées doivent être divisées par `stateBetDerived.timeScale()` pour le mode turbo.

### 3.13 Formatage des Montants

```typescript
const formatAmount = (amount: number): string => {
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Exemples:
// 15 → "15.00"
// 1000 → "1,000.00"
// 12500000000 → "12,500,000,000.00"
```

### 3.14 Checklist Implémentation Animation Groups

**Types et État:**
- [ ] Ajouter `CombinationForDisplay` dans `stateGame.svelte.ts`
- [ ] Ajouter `AnimationGroup` dans `stateGame.svelte.ts`
- [ ] Ajouter `stateWinAmountGroup` state avec Promise resolver **ET animationId**
- [ ] Ajouter `showWinAmountGroup()` qui incrémente `animationId` avant la Promise
- [ ] Ajouter `hideWinAmountGroup()`
- [ ] Ajouter `onWinAmountGroupCompleteWithId(animationId)` qui vérifie l'ID
- [ ] Ajouter `resetWildsToStatic()` pour ré-animation des Wilds
- [ ] Ajouter `stateWinLoop.sequencePromise` pour await depuis `fs-triggered`

**Composants:**
- [ ] Créer `WinAmountSingle.svelte` (container avec {#key} pour remount)
- [ ] Passer `animationId` de `stateWinAmountGroup` au composant `WinAmount`
- [ ] Créer/adapter `WinAmount.svelte` avec:
  - [ ] Prop `animationId: number`
  - [ ] Capturer `animationId` au mount (`const capturedId = animationId`)
  - [ ] Passer `capturedId` à `oncomplete()` (PAS la prop réactive)
- [ ] Créer `WinAmountSprites.svelte` (affichage des chiffres)
- [ ] Créer `src/game/utils/winAmountUtils.ts` avec `getGroupDisplayPosition()`

**Handler show-wins:**
- [ ] Ajouter `extractCombinationsForDisplay()` pour extraire les combos
- [ ] Ajouter `groupCombinations()` avec mode configurable (GROUPING_MODE)
- [ ] Ajouter `groupCombinationsIndividually()` (stratégie 1)
- [ ] Ajouter `groupCombinationsBySharedPositions()` avec Union-Find (stratégie 2)
- [ ] Ajouter `playWinSequence()` avec support AbortSignal
- [ ] Stocker la Promise dans `stateWinLoop.sequencePromise`
- [ ] Détecter `hasBonusTrigger` via `bookEvents.some(e => e.type === 'fs-triggered')`
- [ ] Calculer `shouldAwait = freegame || hasBonusTrigger || hasAutoBetCounter()`
- [ ] Si `shouldAwait`: `await sequencePromise` — sinon fire and forget
- [ ] ⚠️ Ne pas utiliser `isTurbo` dans cette condition — flag surchargé (permanent + skip temporaire)

**Handler fs-triggered:**
- [ ] Await `stateWinLoop.sequencePromise` avant l'animation scatter

**TimeScale:**
- [ ] Diviser tous les délais par `stateBetDerived.timeScale()` dans `playWinSequence`
- [ ] Diviser toutes les durées dans `WinAmount.svelte`

**Skip et Turbo:**
- [ ] Ajouter `skipGroupResolve` et `skipGroupRequested` dans `stateWinLoop`
- [ ] Implémenter `requestSkipCurrentGroup()` dans `stateGame.svelte.ts`
- [ ] Appeler `requestSkipCurrentGroup()` dans `stopButtonClick` handler de `Board.svelte`
- [ ] Reset `stateWinLoop.skipGroupRequested = false` au début de chaque groupe dans `playWinSequence`
- [ ] WinAmount lancé 2 symboles avant la fin du stagger (`i === sortedPositions.length - 3`)
- [ ] Stagger delay annulable via `skipGroupResolve`
- [ ] Guard `hideWinAmountGroup()` idempotent (appel multiple = no-op)
- [ ] `SpinStopOverlay` et `handlePlay` font le même save+force-turbo sur click
- [ ] `handlePlay` vérifie `stateDuel.activeDuels.length > 0` en plus de `!isIdle`

**Tests:**
- [ ] Tester mode `individual` (chaque combo séparée)
- [ ] Tester mode `shared-positions` (groupement intelligent)
- [ ] Tester avec Wild multi-combinaisons (doit ré-animer)
- [ ] Tester skip en base game (clic overlay ou bouton play)
- [ ] Tester skip pendant stagger (avant WinAmount lancé, pendant WinAmount, après)
- [ ] Tester free spins (animation complète avant prochain spin)
- [ ] Tester mode turbo (animations accélérées)
- [ ] **Tester bonus trigger avec gains**: animation win DOIT finir avant scatter animation
- [ ] **Tester plusieurs groupes rapides**: chaque groupe doit avoir son animation complète (pas de skip)
- [ ] **Tester turbo + skip**: restore correct du turbo après spin avec skip

---

## ⚠️ DIMMING DES SYMBOLES - OBSCURCISSEMENT AVEC FADE

> **Cette section explique comment obscurcir les symboles non-gagnants pendant l'affichage des gains, avec des transitions fluides.**
>
> **📄 Sections liées:**
> - [WIN AMOUNTS - AFFICHAGE DES MONTANTS](#️-win-amounts---affichage-des-montants-sur-le-board) - Le handler `show-wins` active le dimming
> - [Paylines](#paylines-lignes-gagnantes) - Les paylines s'affichent en même temps que le dimming

### 1. Concept

Quand des combinaisons gagnantes sont affichées, les symboles **non-gagnants** sont obscurcis (alpha réduit) pour mettre en valeur les symboles gagnants.

```
┌─────────────────────────────────────────────────────────────┐
│  COMPORTEMENT                                               │
│                                                             │
│  1. Gains affichés                                          │
│     → Symboles gagnants: alpha = 1 (pleine luminosité)      │
│     → Symboles non-gagnants: alpha = 0.3 (obscurcis)        │
│     → Transition: fade in rapide (100ms)                    │
│                                                             │
│  2. Fin de l'affichage des gains                            │
│     → Tous les symboles: alpha = 1                          │
│     → Transition: fade out plus lent (400ms)                │
│                                                             │
│  3. Nouveau spin lancé                                      │
│     → Clear immédiat (pas de fade)                          │
└─────────────────────────────────────────────────────────────┘
```

### 2. État Global pour le Dimming

**Fichier**: `src/game/state/stateGame.svelte.ts`

```typescript
// Positions des symboles gagnants (pour dimming des autres)
export const stateWinLoop = $state({
    positions: [] as { reel: number; row: number }[],
    abortController: null as AbortController | null,
    // Promise pour que fs-triggered puisse await la fin des animations
    sequencePromise: null as Promise<void> | null,
    // Skip du groupe courant (1 groupe à la fois, pas toute la séquence)
    skipGroupResolve: null as (() => void) | null,  // Annule le stagger delay en cours
    skipGroupRequested: false,                       // Flag pour sortir du stagger loop
});

// Appelé au début d'un nouveau spin — nettoie tout l'état de win
export const stopWinLoop = () => {
    if (stateWinLoop.abortController) {
        stateWinLoop.abortController.abort();
        stateWinLoop.abortController = null;
    }
    stateWinLoop.positions = [];  // Clear dimming immédiatement
    stateWinLoop.sequencePromise = null;
    stateWinLoop.skipGroupRequested = false;
    stateWinLoop.skipGroupResolve = null;
    hidePaylines();
    hideWinAmountGroup();  // Résoudre toute Promise en attente

    // Reset symboles à static
    stateGame.board.forEach((reel) => {
        reel.reelState.symbols.forEach((symbol) => {
            symbol.symbolState = 'static';
        });
    });
};

// Skip le groupe courant sans interrompre toute la séquence
// Appelé par le bouton Stop (Board.svelte) via stopButtonClick
export const requestSkipCurrentGroup = () => {
    if (stateWinLoop.sequencePromise === null) return; // Pas de séquence en cours
    stateWinLoop.skipGroupRequested = true;
    if (stateWinLoop.skipGroupResolve) {
        stateWinLoop.skipGroupResolve(); // Annuler le stagger delay
        stateWinLoop.skipGroupResolve = null;
    }
    hideWinAmountGroup(); // Résoudre la Promise winAmount immédiatement
};
```

### 3. Composant ReelSymbol avec Fade

**Fichier**: `src/components/symbol/ReelSymbol.svelte`

```svelte
<script lang="ts">
    import { Container } from 'pixi-svelte';
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';
    import { stateWinLoop } from '../../game/state/stateGame.svelte';

    // ===========================================
    // === DIMMING CONFIG (hot reload)
    // ===========================================
    const DIM_ALPHA = 0.3;           // Alpha pour symboles non-gagnants
    const DIM_FADE_IN_MS = 100;      // Fade rapide vers obscurci
    const DIM_FADE_OUT_MS = 400;     // Fade plus lent vers clair

    type Props = {
        reelIndex: number;
        rowIndex: number;
        reelSymbol: ReelSymbol;
    };

    const props: Props = $props();

    // Ce symbole est-il dans les positions gagnantes?
    const isWinningSymbol = $derived(
        stateWinLoop.positions.some(
            (pos) => pos.reel === props.reelIndex && pos.row === props.rowIndex
        )
    );

    // Doit-on obscurcir ce symbole?
    const shouldDim = $derived(
        stateWinLoop.positions.length > 0 && !isWinningSymbol
    );

    // Alpha animé avec tweened
    const dimAlpha = tweened(1);

    // Mettre à jour l'alpha quand shouldDim change
    $effect(() => {
        if (shouldDim) {
            dimAlpha.set(DIM_ALPHA, { duration: DIM_FADE_IN_MS, easing: cubicOut });
        } else {
            dimAlpha.set(1, { duration: DIM_FADE_OUT_MS, easing: cubicOut });
        }
    });
</script>

<!-- Utiliser $dimAlpha pour accéder à la valeur du store -->
<Container alpha={$dimAlpha}>
    <Symbol ... />
</Container>
```

### 4. Utilisation de `tweened` pour les Fades

**Import et création:**
```typescript
import { tweened } from 'svelte/motion';
import { cubicOut } from 'svelte/easing';

// Créer un store tweened avec valeur initiale
const alpha = tweened(1);
const scale = tweened(1, { duration: 300, easing: cubicOut });
```

**Modification avec options:**
```typescript
// Changer la valeur avec animation
alpha.set(0.3, { duration: 100, easing: cubicOut });

// Changer immédiatement (pas d'animation)
alpha.set(1, { duration: 0 });

// Attendre la fin de l'animation
await alpha.set(0.5, { duration: 200 });
```

**Accès à la valeur dans le template:**
```svelte
<!-- Utiliser $ pour accéder au store -->
<Container alpha={$alpha} scale={$scale}>
```

**Easings disponibles:**
```typescript
import {
    linear,
    cubicIn, cubicOut, cubicInOut,
    quadIn, quadOut, quadInOut,
    elasticIn, elasticOut,
    bounceIn, bounceOut
} from 'svelte/easing';
```

### 5. Activation du Dimming

**Dans le handler `show-wins`:**

```typescript
// bookEventHandlerMap.ts
'show-wins': async (bookEvent) => {
    // Extraire toutes les positions gagnantes
    const allPositions: Position[] = [];
    for (const group of bookEvent.winGroups) {
        for (const combo of group.combinations) {
            for (const pos of combo.positions) {
                allPositions.push({ reel: pos.reel, row: pos.row });
            }
        }
    }

    // Dédupliquer et ajuster pour le padding
    const uniquePositions = allPositions.filter(
        (pos, index, self) =>
            index === self.findIndex((p) => p.reel === pos.reel && p.row === pos.row)
    );
    const adjustedPositions = uniquePositions.map(pos => ({
        ...pos,
        row: pos.row + 1  // +1 pour le padding
    }));

    // Activer le dimming
    stateWinLoop.positions = adjustedPositions;

    // ... afficher les montants ...
};
```

### 6. Désactivation du Dimming

**Option A: Après un délai (quand animations symboles finissent):**
```typescript
// WinAmounts.svelte
const DELAY_BEFORE_CLEAR_DIMMING_MS = 800;

const handleGroupComplete = (groupId: number) => {
    activeGroups = activeGroups.filter((g) => g.id !== groupId);

    if (activeGroups.length === 0) {
        // Attendre que les animations de symboles finissent
        setTimeout(() => {
            stateWinLoop.positions = [];
        }, DELAY_BEFORE_CLEAR_DIMMING_MS);
    }
};
```

**Option B: Au prochain spin (dans stopWinLoop):**
```typescript
// stateGame.svelte.ts
export const stopWinLoop = () => {
    // ... autres cleanup ...
    stateWinLoop.positions = [];  // Clear immédiat, pas de fade
};
```

### 7. Checklist Implémentation

- [ ] Ajouter `stateWinLoop.positions` dans `stateGame.svelte.ts`
- [ ] Modifier `ReelSymbol.svelte`:
  - [ ] Importer `tweened`, `cubicOut`, `stateWinLoop`
  - [ ] Ajouter props `reelIndex` et `rowIndex`
  - [ ] Calculer `isWinningSymbol` et `shouldDim`
  - [ ] Créer `dimAlpha` avec `tweened(1)`
  - [ ] Ajouter `$effect` pour mettre à jour l'alpha
  - [ ] Wrapper le symbole dans `<Container alpha={$dimAlpha}>`
- [ ] Modifier `BoardBase.svelte` pour passer `rowIndex` à `ReelSymbol`
- [ ] Dans handler `show-wins`: extraire positions et set `stateWinLoop.positions`
- [ ] Ajouter cleanup dans `stopWinLoop()` et/ou après affichage des montants
- [ ] Ajuster les valeurs `DIM_ALPHA`, `DIM_FADE_IN_MS`, `DIM_FADE_OUT_MS`

---

## ⚠️ TRANSITION BONUS - ANIMATION DU BOARD (OPTIONNEL)

> **Cette section décrit une alternative à la transition classique.**
> Certains jeux utilisent une animation du board (montée/descente) au lieu d'une transition standard (fade/wipe).

### Choix du Type de Transition

**Question à poser:** Le jeu utilise-t-il une transition classique ou une animation du board pour les bonus ?

| Type | Description | Quand l'utiliser |
|------|-------------|------------------|
| **Transition classique** | Effet de fade/wipe entre les écrans | La plupart des jeux |
| **Animation du board** | Le board monte/descend pour révéler l'intro/outro | Si le Spine du board a des animations `animation_start`/`animation_end` |

### Animation du Board - Comment ça marche

**Prérequis:** Le Spine du board doit avoir ces animations:
- `animation_start` - Le board descend (apparaît)
- `animation_end` - Le board monte (disparaît)

**Machine d'état dans BoardFrame.svelte:**
```typescript
type BoardAnimState = 'hidden' | 'animating_start' | 'visible' | 'animating_end';

// hidden: board en haut (non affiché)
// animating_start: joue animation_start (le board descend)
// visible: board en bas (garde la pose finale)
// animating_end: joue animation_end (le board monte)
```

**Events émis:**
```typescript
// Faire descendre le board
await context.eventEmitter.broadcastAsync({ type: 'boardAnimationStart' });

// Faire monter le board
await context.eventEmitter.broadcastAsync({ type: 'boardAnimationEnd' });
```

### Grille de Symboles - Fade In/Out

Pour éviter que les symboles soient visibles pendant l'animation du board, on ajoute un fade:

**Events dans Board.svelte:**
```typescript
export type EmitterEventBoard =
  | { type: 'boardFadeIn' }   // Fade in (async)
  | { type: 'boardFadeOut' }  // Fade out (async)
  // ... autres events
```

**Implémentation:**
```svelte
<script lang="ts">
  import { FadeContainer } from 'components-pixi';

  // Grille commence cachée
  let show = $state(false);
  let onFadeComplete = $state(() => {});
  const FADE_DURATION = 300;

  context.eventEmitter.subscribeOnMount({
    boardFadeIn: async () => {
      show = true;
      await waitForResolve((resolve) => (onFadeComplete = resolve));
    },
    boardFadeOut: async () => {
      show = false;
      await waitForResolve((resolve) => (onFadeComplete = resolve));
    },
  });
</script>

<FadeContainer {show} duration={FADE_DURATION} oncomplete={() => onFadeComplete()}>
  <!-- BoardContext et BoardBase ici -->
</FadeContainer>
```

### Séquence Complète

**1. Démarrage du jeu (Game.svelte):**
```typescript
const handleGameStart = async () => {
  await waitForTimeout(BOARD_START_DELAY_MS); // 1-2 secondes
  await context.eventEmitter.broadcastAsync({ type: 'boardAnimationStart' });
  await context.eventEmitter.broadcastAsync({ type: 'boardFadeIn' });
};
```

**2. Avant bonus intro/outro (bookEventHandlerMap.ts):**
```typescript
// Fade out grille AVANT animation du board
await eventEmitter.broadcastAsync({ type: 'boardFadeOut' });

// Board monte
await eventEmitter.broadcastAsync({ type: 'boardAnimationEnd' });

// Afficher intro/outro...
```

**3. Après click sur intro/outro:**
```typescript
// Board descend
await eventEmitter.broadcastAsync({ type: 'boardAnimationStart' });

// Fade in grille APRÈS animation du board
await eventEmitter.broadcastAsync({ type: 'boardFadeIn' });

// Continuer le jeu...
```

### Flux Complet Bonus

```
┌─────────────────────────────────────────────────────────────┐
│  AVANT INTRO BONUS                                          │
│                                                             │
│  1. boardFadeOut      → Grille disparaît (300ms)           │
│  2. boardAnimationEnd → Board monte (~4s selon animation)   │
│  3. freeSpinIntroShow → Afficher intro                      │
│  4. [CLICK]           → Utilisateur clique                  │
│  5. freeSpinIntroHide                                       │
│  6. boardAnimationStart → Board descend (~4s)               │
│  7. boardFadeIn        → Grille apparaît (300ms)           │
│  8. [FREE SPINS...]                                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  AVANT OUTRO BONUS                                          │
│                                                             │
│  1. boardFadeOut       → Grille disparaît (300ms)          │
│  2. boardAnimationEnd  → Board monte (~4s)                  │
│  3. freeSpinOutroShow  → Afficher outro                     │
│  4. [CLICK]            → Utilisateur clique                 │
│  5. freeSpinOutroHide                                       │
│  6. boardAnimationStart → Board descend (~4s)               │
│  7. boardFadeIn         → Grille apparaît (300ms)          │
│  8. [RETOUR BASE GAME]                                      │
└─────────────────────────────────────────────────────────────┘
```

### Checklist Implémentation Animation Board

**Si vous utilisez une animation du board au lieu d'une transition:**

- [ ] Vérifier que le Spine `board` a les animations `animation_start` et `animation_end`
- [ ] Ajouter les events `boardAnimationStart` et `boardAnimationEnd` dans `BoardFrame.svelte`
- [ ] Implémenter la machine d'état (`hidden`, `animating_start`, `visible`, `animating_end`)
- [ ] Ajouter les events `boardFadeIn` et `boardFadeOut` dans `Board.svelte`
- [ ] Wrapper le contenu de Board dans `<FadeContainer>`
- [ ] Grille commence cachée (`show = false`)
- [ ] Ajouter `handleGameStart` dans `Game.svelte` avec délai + `boardAnimationStart` + `boardFadeIn`
- [ ] Dans `bookEventHandlerMap.ts`, pour chaque handler bonus (`fs-triggered`, `freeSpinTrigger`, `show-fs-total-win`, `freeSpinEnd`):
  - [ ] Ajouter `boardFadeOut` AVANT `boardAnimationEnd`
  - [ ] Ajouter `boardFadeIn` APRÈS `boardAnimationStart`

**Si vous utilisez une transition classique:**

- [ ] Utiliser le composant `Transition.svelte` existant
- [ ] Ne pas implémenter la machine d'état dans `BoardFrame.svelte`
- [ ] La grille reste toujours visible (`show = true`)

---

## ⚠️ RESUME BET MID-BONUS — CLASSIFICATION SDK ET TIMING DU `end-round`

### 1. Le problème

Quand un joueur quitte au milieu d'un bonus (free spins en cours) et se reconnecte, le bonus doit reprendre depuis l'event où il s'est arrêté. Si le SDK appelle `/wallet/end-round` AVANT que tous les events du bonus soient joués, le RGS marque le round comme inactif → resume impossible.

**Symptôme:** player quit mid-bonus → reconnect → `authenticate` retourne `active: false` → resume échoue → le jeu repart d'un nouveau spin.

### 2. Comment le SDK décide du timing du `end-round`

Le SDK (`packages/utils-xstate/createPrimaryMachines.ts`) classe chaque bet en 3 catégories :

```typescript
BET_TYPE_METHODS_MAP = {
    noWin:          { newGame: noop,             endGame: noop },
    singleRoundWin: { newGame: requestEndRound,  endGame: balance-flush },
    bonusWin:       { newGame: noop,             endGame: requestEndRound },
}
```

- **`singleRoundWin`** → `end-round` appelé au début du PROCHAIN `newGame` (= au moment du `/wallet/play` suivant).
- **`bonusWin`** → `end-round` appelé en `endGame` (= APRÈS que `onPlayGame` ait joué tous les book events).

### 3. La classification `getBetType`

```typescript
const getBetType = ({ bet }) => {
    const isBonusGame = checkIsBonusGame(bet);  // ← prédicat custom passé par le frontend
    if (bet.active === true) {
        if (isBonusGame) return 'bonusWin';
    }
    if (bet.payoutMultiplier > 0) {
        if (isBonusGame) return 'bonusWin';
        return 'singleRoundWin';
    }
    return 'noWin';
};
```

`checkIsBonusGame` est fourni par le frontend via `createPrimaryMachines<Bet>({ checkIsBonusGame: ... })`.

### 4. ❌ Bug rencontré — predicate filtre le mauvais event type

Avant fix, `actor.ts` importait le prédicate legacy:

```typescript
import { checkIsMultipleRevealEvents } from 'utils-book';  // ❌ filtre type === 'reveal'
checkIsBonusGame: (bet) => checkIsMultipleRevealEvents({ bookEvents: bet.state }),
```

`checkIsMultipleRevealEvents` compte les events `type === 'reveal'`. Mais le backend no-mercy émet `type === 'board-reveal'` (comme Royale Cake). Donc le predicate retournait **toujours `false`** → `isBonusGame === false` → bonus classé `singleRoundWin` → `end-round` appelé au début du prochain spin (= immédiatement après le spin trigger du bonus) → RGS marque round inactive AVANT que le joueur joue un seul free spin → resume impossible.

### 5. ✅ Fix — predicate inline filtrant `board-reveal`

```typescript
// actor.ts
import type { Bet, BookEvent } from '../types/typesBookEvent';

const checkIsMultipleBoardRevealEvents = ({ bookEvents }: { bookEvents: BookEvent[] }) => {
    const revealEventCount = bookEvents.filter((bookEvent) => bookEvent.type === 'board-reveal').length;
    return revealEventCount > 1;
};

const primaryMachines = createPrimaryMachines<Bet>({
    onResumeGameActive: (betToResume) => convertTorResumableBet(betToResume),
    onResumeGameInactive: (betToResume) => {
        const lastRevealEvent = _.findLast(
            betToResume.state,
            (bookEvent) => bookEvent?.type === 'board-reveal',  // ← aussi 'board-reveal' (pas 'reveal')
        );
        if (lastRevealEvent) stateGameDerived.enhancedBoard.settle(lastRevealEvent.board);
    },
    // ...
    checkIsBonusGame: (bet) => checkIsMultipleBoardRevealEvents({ bookEvents: bet.state }),
});
```

### 6. Pourquoi un predicate inline (pas import depuis utils-book)

`utils-book/checkIsMultipleRevealEvents` filtre `'reveal'` (legacy). Notre backend émet `'board-reveal'`. Royale Cake fait pareil — predicate inline filtrant `'board-reveal'`. Tant que `utils-book` n'est pas updaté pour filtrer les deux types, garder inline.

### 7. Résultat

- Bonus bet → `bookEvents` contient plusieurs `'board-reveal'` (trigger spin + chaque FS) → predicate `true` → classe `bonusWin` → `end-round` appelé en `endGame` (= après outro bonus).
- Player quit mid-bonus → `onPlayGame` jamais terminé → `end-round` jamais appelé → RGS `active: true` → `authenticate` après reconnect retourne `active: true` → frontend déclenche `resumeGame` → resume continue depuis l'event sauvegardé.

### 8. Timing du `resumeBet` broadcast après reconnect

`ResumeBet.svelte` set seulement `stateBet.activeBetModeKey` sur mount. Le broadcast `resumeBet` (qui déclenche `RESUME_BET` xstate) est fait dans `Game.svelte handleGameStart` APRÈS l'animation board (descend + fade in). Sinon le spin animation du resume joue sur grille invisible.

```typescript
// Game.svelte
const handleGameStart = async () => {
    await waitForTimeout(BOARD_START_DELAY_MS);
    await context.eventEmitter.broadcastAsync({ type: 'boardAnimationStart' });
    await context.eventEmitter.broadcastAsync({ type: 'boardFadeIn' });

    // Resume après animation board pour que les anims jouent sur grille visible
    if (!isReplayMode && stateBet.betToResume?.active) {
        context.eventEmitter.broadcast({ type: 'resumeBet' });
    }
};
```

### 9. Note: AudioContext et resume

Le browser exige un user gesture pour démarrer l'AudioContext. Si le loading screen passe directement au resume (sans rules page intermédiaire), les sons sont bloqués jusqu'au premier click utilisateur. Solution: garder la RulesPage active même en mode resume (click "Continue" = user gesture = AudioContext démarre).

```typescript
// LoadingScreen onloaded
onloaded={() => {
    context.stateLayout.showLoadingScreen = false;
    // Toujours afficher rules page pour unlock AudioContext
    showRulesPage = true;
}}
```

### 10. Checklist Resume Bet

- [ ] `checkIsBonusGame` predicate filtre le bon event type (`'board-reveal'` pour no-mercy)
- [ ] `onResumeGameInactive` cherche aussi `'board-reveal'` (pas `'reveal'`)
- [ ] `resumeBet` broadcast après `handleGameStart` (pas onMount de ResumeBet)
- [ ] RulesPage affichée même en resume mode (unlock AudioContext)
- [ ] Vérifier après reconnect mid-bonus : `bet.active === true` dans authenticate response

---

## ⚠️ REPLAY MODE - LECTURE D'UN BET ENREGISTRÉ

Le mode replay permet de rejouer un bet enregistré pour visualiser le résultat.

### 1. Activation du Mode Replay

Le mode replay est activé via le paramètre URL `mode=replay`:

```
?mode=replay&currency=IDR
```

**Détection dans le code:**
```typescript
const isReplayMode = stateUi.config.mode === 'replay';
```

### 2. Données Requises dans `stateBet.betToResume`

Le backend doit fournir ces champs dans l'objet `betToResume`:

```typescript
{
    // Métadonnées du bet
    mode: string;              // "BASE", "ANTE", "BUY_CLASSIQUE", "BUY_BOUNTY"
    payoutMultiplier: number;  // Multiplicateur total du gain (ex: 12500 pour max win)

    // Montants
    betAmount: number;         // Mise de base
    wageredBetAmount: number;  // Mise réelle (utilisé pour l'affichage)

    // Book events à rejouer
    state: BookEvent[];        // Array des events du bet
}
```

**Utilisation dans `ReplayOverlay.svelte`:**

| Champ | Utilisation |
|-------|-------------|
| `mode` | Affichage du mode de jeu + récupération du `costMultiplier` depuis `stateMeta.betModeMeta` |
| `payoutMultiplier` | Calcul et affichage du gain total |
| `wageredBetAmount` | Affichage de la mise de base |
| `state` | Book events rejoués par les handlers |

### 3. Format des Book Events

Les book events dans `state` doivent utiliser le **format Cactus Cash** (aligné avec le mode normal):

| Event | Champ | Format |
|-------|-------|--------|
| `show-final-win` | `amount` | Multiplicateur × 100 |
| `setTotalWin` | `amount` | Multiplicateur × 100 |
| `show-fs-spin-win` | `amount` | Multiplicateur × 100 |
| `show-fs-total-win` | `amount` | Multiplicateur × 100 |
| `show-wins` | `groupPayout`, `groupFinalPayout` | Multiplicateur direct |

**Exemple de `setTotalWin` en replay:**
```typescript
{
    type: "setTotalWin",
    amount: 1250000  // = 12500x × 100
}
```

**⚠️ Conversion frontend (identique en mode normal et replay):**

`amount` est toujours en book units (`multiplier × 100`). On le stocke **directement** sans multiplication par `betAmount`. Le rendu (`bookEventAmountToCurrencyString`) applique `wageredBetAmount` au moment de l'affichage.

```typescript
// Mode replay et mode normal: amount est en format multiplier × 100
if (stateUi.config.mode === 'replay') {
    const maxMultiplierAmount = MAX_WIN_MULTIPLIER * BOOK_AMOUNT_MULTIPLIER;
    stateBet.winBookEventAmount = Math.min(bookEvent.amount, maxMultiplierAmount);
} else {
    stateBet.winBookEventAmount = capToMaxWin(bookEvent.amount);
}

// capToMaxWin doit utiliser la même formule bet-independent que replay :
//   maxWinInBookUnits = MAX_WIN_MULTIPLIER * BOOK_AMOUNT_MULTIPLIER   // 1 250 000
// PAS `bet * MAX_WIN_MULTIPLIER * BOOK_AMOUNT_MULTIPLIER` — le rendu applique déjà
// `wageredBetAmount`, donc inclure `bet` dans le cap collapse la valeur quand bet < 1.
```

> ⚠️ **Ne PAS faire `bookEvent.amount × stateBet.betAmount`.** Le rendu re-multiplie déjà par `wageredBetAmount`. En mode social (`betAmount ≈ 200` tokens), cela donne une valeur 200× trop grande. En mode normal classique (`betAmount = 1`), le bug est invisible.

> ⚠️ **Ne PAS inclure `betAmount` dans le cap.** `capToMaxWin` doit caper en book units bet-independent (`MAX_WIN_MULTIPLIER × BOOK_AMOUNT_MULTIPLIER`). Inclure `bet` (ancienne formule `bet × MAX × 100`) cape à `12500` book units pour `bet = 0.01` → HUD plafonné à **1.25 GC** au lieu de **125 GC**. Bug invisible pour `bet ≥ 1`, visible dès que `bet < 1`.

Cette logique est identique à Cactus Cash et s'applique aux handlers:
- `show-final-win`
- `setTotalWin`
- `show-fs-spin-win`
- `show-fs-total-win`

### 4. Paramètre Currency

La devise doit être passée en paramètre URL car elle n'est pas dans les données du bet:

```
?mode=replay&currency=IDR
```

**Récupération dans `ReplayOverlay.svelte`:**
```typescript
onMount(() => {
    if (isReplayMode) {
        const urlParams = new URLSearchParams(window.location.search);
        const currency = urlParams.get('currency');
        if (currency) {
            stateBet.currency = currency;
        }
    }
});
```

### 5. Flux du Replay

```
1. Page chargée avec ?mode=replay
   ↓
2. ReplayOverlay affiché (panneau avec infos du bet)
   ↓
3. User clique "START REPLAY"
   ↓
4. Book events rejoués via playBet()
   ↓
5. Event 'replayEnded' émis à la fin
   ↓
6. ReplayOverlay affiche "PLAY AGAIN"
```

### 6. Composants Impliqués

```
src/components/replay/
└── ReplayOverlay.svelte    # Panneau d'info + boutons Play/Play Again

src/game/
├── utils.ts                # playBet(), convertTorResumableBet()
└── handlers/
    └── bookEventHandlerMap.ts  # Handlers des events (avec conditions replay comme Cactus Cash)
```

### 7. Spécificités HUD en Mode Replay

- **Balance**: Masquée (pas de solde en replay)
- **Bouton Play**: Masqué (pas de nouveau bet)
- **Bouton Bonus Buy**: Masqué
- **WIN et BET**: Affichés en read-only

---

---

## ⚠️ TURBO MODE - LIFECYCLE DU SKIP ET TRANSITION BONUS

> **Cette section explique la gestion complète du mode turbo lors des skips et des transitions bonus.**
> C'est un des systèmes les plus sensibles aux edge-cases — lire entièrement avant de modifier.

### 1. Deux Variables Distinctes

Il y a **deux `savedIsTurbo`** dans le code — ils ont des rôles différents :

| Variable | Fichier | Portée | Rôle |
|----------|---------|--------|------|
| `stateSpin.savedIsTurbo` | `stateGame.svelte.ts` | Par spin (null = pas de skip en cours) | Sauvegarde avant force-turbo pour skip |
| `savedIsTurbo` (module) | `bookEventHandlerMap.ts` | Par bonus (lifecycle complet) | Sauvegarde avant transition bonus |

**⚠️ Ne pas confondre les deux. Ils servent à des choses différentes.**

### 2. Lifecycle de `stateSpin.savedIsTurbo` (skip par spin)

```
Joueur clique Stop (overlay ou bouton play pendant spin) :
    → stateSpin.savedIsTurbo = stateBet.isTurbo  (capture valeur originale)
    → stateBet.isTurbo = true                    (force turbo pour accélérer)
    → stopButtonClick broadcast

board-reveal reçu (AVANT spin()) :
    → allReelsStopped = board.every(r => r.reelState.motion === 'stopped')
    → SI allReelsStopped && savedIsTurbo !== null :  ← ⚠️ condition critique
          stateBet.isTurbo = stateSpin.savedIsTurbo || stateSpeed.level >= 2
          stateSpin.savedIsTurbo = null
          stateSpin.stopRequested = false
    → SINON (reels spinning/bouncing = click pendant preSpin) :
          Ne rien faire — le skip doit porter sur le spin en cours

Spin termine (reveal — ancien format) :
    → stateBet.isTurbo = stateSpin.savedIsTurbo || stateSpeed.level >= 2
    → stateSpin.savedIsTurbo = null
    → stateSpin.stopRequested = false
```

**⚠️ CRITIQUE — Restore avec `|| stateSpeed.level >= 2`:**

```typescript
// ✅ CORRECT — respecte le niveau de vitesse sélectionné par l'utilisateur
stateBet.isTurbo = stateSpin.savedIsTurbo || stateSpeed.level >= 2;

// ❌ INCORRECT — écrase le turbo si l'utilisateur était en level 2
stateBet.isTurbo = stateSpin.savedIsTurbo;
```

Sans le `|| stateSpeed.level >= 2`, si l'utilisateur avait le niveau de vitesse à 2 (turbo) AVANT de cliquer stop, le restore le mettrait en non-turbo puisque `savedIsTurbo` capture l'état AVANT le force-turbo.

### 3. Lifecycle de `savedIsTurbo` module (transition bonus)

```
Bonus déclenché (fs-triggered ou freeSpinTrigger) :
    → savedSpeedLevel = stateSpeed.level
    → savedIsTurbo = stateSpin.savedIsTurbo !== null
                     ? stateSpin.savedIsTurbo      // ⚠️ Capture la valeur ORIGINALE si skip en cours
                     : stateBet.isTurbo            // Valeur normale sinon
    → stateSpeed.level = 0
    → stateBet.isTurbo = false
    → stateSpin.savedIsTurbo = null               // ⚠️ Clear l'orphan: empêche le 1er board-reveal
    → stateSpin.stopRequested = false               //    du bonus de re-engager turbo via la branche
                                                    //    restore (cf. Scenario C ci-dessous).

Bonus termine (freeSpinEnd ou show-fs-total-win) :
    → stateSpeed.level = savedSpeedLevel
    → stateBet.isTurbo = savedIsTurbo
    → stateSpin.savedIsTurbo = null               // ⚠️ Nettoyer pour éviter conflits
```

**⚠️ CRITIQUE — Scenario A (bonus trigger + skip actif) :**

Si le joueur clique Stop juste avant le bonus trigger :
1. `stateSpin.savedIsTurbo = false` (valeur originale, turbo non activé)
2. `stateBet.isTurbo = true` (forcé pour le skip)
3. `board-reveal` s'exécute → restore avec `stateSpin.savedIsTurbo = null`
4. Mais... `freeSpinTrigger` capture `stateBet.isTurbo` (= true, la valeur forcée !)

Sans le guard `stateSpin.savedIsTurbo !== null ? ... : stateBet.isTurbo`, le bonus serait restauré avec `isTurbo = true` même si le joueur n'avait pas activé le turbo.

```typescript
// ✅ CORRECT — capture la valeur AVANT le force-turbo si skip en cours
savedIsTurbo = stateSpin.savedIsTurbo !== null
    ? stateSpin.savedIsTurbo
    : stateBet.isTurbo;

// ❌ INCORRECT — peut capturer la valeur forcée pendant un skip
savedIsTurbo = stateBet.isTurbo;
```

**⚠️ CRITIQUE — Scenario C (orphan `stateSpin.savedIsTurbo` ressuscite le turbo dans le bonus) :**

Si on capture l'orphan sans le clear, le 1er `board-reveal` du bonus le voit non-null et restore turbo :

```
1. Joueur turbo ON (speed level 2) → stateBet.isTurbo = true
2. Click stop pendant le pre-bonus spin
   → stateSpin.savedIsTurbo = true (capture original)
   → stateBet.isTurbo = true (force, no-op ici)
3. fs-triggered :
   → savedIsTurbo (module) = stateSpin.savedIsTurbo = true ✓ (capture original)
   → stateBet.isTurbo = false ✓
   → stateSpeed.level = 0 ✓ (HUD montre turbo OFF)
   → ⚠️ stateSpin.savedIsTurbo TOUJOURS = true (orphan !)
4. 1er board-reveal du bonus :
   → allReelsStopped = true (reels settle pendant l'intro)
   → stateSpin.savedIsTurbo !== null → ENTRE dans la branche restore
   → stateBet.isTurbo = true || (0 ≥ 2) = true ✗
5. Tous les spins bonus tournent en turbo, alors que le HUD montre level 0.
```

**Fix :** clear `stateSpin.savedIsTurbo = null` + `stateSpin.stopRequested = false` immédiatement après le bloc de capture/reset dans `fs-triggered`. Voir Changelog 2026-05 "Turbo leak into bonus".

### 4. ⚠️ BUG — Click pendant animation post-spin (duel/win group/retrigger) → spin suivant en turbo

**Symptôme :** Cliquer pendant un duel, une animation de win group ou un retrigger force le spin SUIVANT en mode turbo, même si l'utilisateur n'avait pas activé le turbo.

**Cause :** L'ancien code réinitialisait `savedIsTurbo` APRÈS `enhancedBoard.spin()` dans `board-reveal`. Si le clic survenait PENDANT une animation post-spin (reels déjà stopped), voici la séquence :

```
Clic pendant animation retrigger/duel :
    → savedIsTurbo = false, isTurbo = true

board-reveal du SPIN EN COURS :
    → spin() lit isTurbo=true → globalSpinType='fast' → spin rapide ✅

// ❌ (ancien code) : restore après spin()
    → savedIsTurbo = null, isTurbo = false  ← trop tard !

board-reveal du SPIN SUIVANT :
    → spin() lit isTurbo=true (jamais restauré avant spin!) → spin rapide ✗
```

**Fix :** Déplacer le restore AVANT `spin()` dans `board-reveal`, avec condition `allReelsStopped` :

```typescript
// ✅ CORRECT — dans board-reveal, AVANT spin()
const allReelsStopped = stateGame.board.every(r => r.reelState.motion === 'stopped');
if (allReelsStopped && stateSpin.savedIsTurbo !== null) {
    stateBet.isTurbo = stateSpin.savedIsTurbo || stateSpeed.level >= 2;
    stateSpin.savedIsTurbo = null;
    stateSpin.stopRequested = false;
}
await stateGameDerived.enhancedBoard.spin({ ... });
```

**Pourquoi `allReelsStopped` ?** Le clic peut survenir dans deux contextes distincts :

| Contexte du clic | `allReelsStopped` | Comportement attendu |
|---|---|---|
| Pendant animation post-spin (duel/win group/retrigger) | `true` | Reset avant spin → spin normal |
| Pendant preSpin (reels spinning/bouncing) | `false` | Conserver le skip → spin fast |

Sans cette condition, le double-click (premier clic = lance le spin, deuxième = skip) ne fonctionnerait pas : le restore effacerait le skip du premier clic avant que `spin()` ne le lise.

**Cleanup du `savedIsTurbo` après un click pendant preSpin :**

Si `allReelsStopped = false`, le reset est skippé. `savedIsTurbo` reste non-null après spin. Il sera nettoyé au **prochain `board-reveal`** (où `allReelsStopped = true`), ce qui restaure l'état avant le deuxième spin. Un seul spin fast, ensuite normal ✅.

### 6. `stateSpin.savedIsTurbo` orphelin (cas Big Win)

Si le joueur clique pendant le big win (quand `isBigWinPlaying = true`) :
- `SpinStopOverlay` retourne immédiatement (guard `isBigWinPlaying`)
- Le bouton play HUD peut quand même déclencher un save+force-turbo
- `board-reveal` a déjà été exécuté → il ne nettoiera PAS ce `savedIsTurbo`
- Au prochain clic Play en idle, `handlePlay` le détecte et le nettoie :

```typescript
// Dans HudPixi.svelte handlePlay — côté idle start:
if (stateSpin.savedIsTurbo !== null) {
    stateBet.isTurbo = stateSpin.savedIsTurbo || stateSpeed.level >= 2;
    stateSpin.savedIsTurbo = null;
}
```

### 7. `stateSpin.stopRequested` vs `stateSpin.savedIsTurbo`

| Flag | Usage |
|------|-------|
| `stopRequested` | Indique au spin system de stopper immédiatement |
| `savedIsTurbo` | Indique que le turbo a été forcé et doit être restauré |

Ces deux flags peuvent être non-null en même temps. `stopRequested` est resetté à `false` dans `board-reveal`/`reveal`. `savedIsTurbo` est resetté à `null` en même temps.

### 8. Checklist

- [ ] Le restore du turbo utilise toujours `|| stateSpeed.level >= 2`
- [ ] La capture bonus utilise `stateSpin.savedIsTurbo !== null ? ... : stateBet.isTurbo`
- [ ] `freeSpinEnd` / `show-fs-total-win` appelle `stateSpin.savedIsTurbo = null` après la restore
- [ ] `SpinStopOverlay.handleClick` vérifie `isBigWinPlaying` avant de sauvegarder
- [ ] `SpinStopOverlay.handleClick` fait le même save+force-turbo que `handlePlay`
- [ ] Le restore dans `board-reveal` se fait AVANT `spin()` avec guard `allReelsStopped` (évite que le spin suivant hérite du turbo forcé pour un skip post-spin)

---

## ⚠️ SKIP MECHANICS - STOP / WIN GROUPS / DUELS

> **Cette section explique le système de skip à un clic pour le spin, les animations de win et les duels.**

### 1. Principe général

**1 clic = stop + skip + accélération.**

Le clic sur l'overlay ou le bouton Play pendant un spin :
1. Stoppe le spin (reels s'arrêtent immédiatement)
2. Skip le groupe de win courant
3. Force le mode turbo pour accélérer les animations restantes

### 2. Points d'entrée du Skip

**SpinStopOverlay.svelte** (clic sur le board) :
```typescript
const handleClick = () => {
    if (isIdle) return;
    if (stateSpin.isBigWinPlaying) return; // ⚠️ Guard big win
    stateSpin.stopRequested = true;
    if (stateSpin.savedIsTurbo === null) {
        stateSpin.savedIsTurbo = stateBet.isTurbo;
        stateBet.isTurbo = true;
    }
    context.eventEmitter.broadcast({ type: 'stopButtonClick' });
};
```

**HudPixi.svelte — handlePlay** (bouton play pendant spin) :
```typescript
const handlePlay = () => {
    // Traiter comme stop si jeu non idle OU si un event duel est activement en cours
    if (!isIdle || stateDuel.isBlockingSpin) {
        stateSpin.stopRequested = true;
        if (stateSpin.savedIsTurbo === null) {
            stateSpin.savedIsTurbo = stateBet.isTurbo;
            stateBet.isTurbo = true;
        }
        context.eventEmitter.broadcast({ type: 'stopButtonClick' });
    } else {
        // Idle start — nettoyer tout savedIsTurbo orphelin
        if (stateSpin.savedIsTurbo !== null) {
            stateBet.isTurbo = stateSpin.savedIsTurbo || stateSpeed.level >= 2;
            stateSpin.savedIsTurbo = null;
        }
        context.eventEmitter.broadcast({ type: 'bet' });
    }
};
```

**⚠️ IMPORTANT:** Le bouton play doit vérifier `stateDuel.isBlockingSpin` (et non `activeDuels.length > 0`) car les duels s'exécutent quand `isIdle = true` (le jeu est techniquement idle pendant les duels).

**Pourquoi `isBlockingSpin` et pas `activeDuels.length > 0` :**
- `activeDuels.length > 0` reste vrai APRÈS la fin du spin (duel en boucle idle) → bloquait la machine
- `isBlockingSpin` est `true` uniquement pendant le `await duelPlay` dans le handler `duel`
- Une fois l'intro terminée (duel en idle loop), `isBlockingSpin = false` → le joueur peut relancer
- Au prochain spin, `onNewGameStart` appelle `fadeOutDuels()` → les duels disparaissent avec un fade naturel

**Implémentation dans `bookEventHandlerMap.ts` :**
```typescript
'duel': async (bookEvent) => {
    const duelData = { ... };
    stateDuel.isBlockingSpin = true;
    await eventEmitter.broadcastAsync({ type: 'duelPlay', duelData });
    stateDuel.isBlockingSpin = false;
},
```

**Reset dans `clearDuels()` :** `isBlockingSpin` est aussi remis à `false` dans `clearDuels()` pour les cas limites (bonus trigger pendant un duel).

### 3. Abonnés à `stopButtonClick`

**Board.svelte** :
```typescript
stopButtonClick: () => {
    context.stateGameDerived.enhancedBoard.stop(); // Stop le spin
    requestSkipCurrentGroup();                      // Skip le groupe de win courant
},
```

**Duels.svelte** :
```typescript
stopButtonClick: () => {
    // ⚠️ Seulement les duels ACTUELLEMENT ACTIFS (pas les futurs)
    const newSkips = stateDuel.activeDuels
        .map((d) => d.column)
        .filter((c) => !columnsToSkip.has(c));
    if (newSkips.length > 0) {
        columnsToSkip = new Set([...columnsToSkip, ...newSkips]);
        context.eventEmitter.broadcast({ type: 'soundStop', name: 'sfx_versus' });
    }
},
```

### 4. Skip des Win Groups

**Fonctionnement :**
- `requestSkipCurrentGroup()` annule le stagger delay courant via `skipGroupResolve()`
- `hideWinAmountGroup()` résout immédiatement la Promise WinAmount
- `skipGroupRequested = true` indique à `playWinSequence` de passer au groupe suivant
- **Seul le groupe courant est sauté** — les autres groupes s'animent normalement

**⚠️ AUTOPLAY — `show-wins` doit être awaited**

En autoplay, `sequencePromise` doit être awaited (condition `hasAutoBetCounter()`). Sans ça :
- Clic pendant le spin → `isTurbo = true` → `playBet` retourne immédiatement → spin suivant démarre → `stopWinLoop()` coupe les win amounts avant qu'ils apparaissent

**⚠️ Ne pas utiliser `isTurbo` dans la condition `shouldAwait`** — `isTurbo` est temporairement forcé à `true` lors d'un skip (flag surchargé), ce qui exclurait à tort l'await et couperait les win amounts. Utiliser uniquement `hasAutoBetCounter()`, `gameType`, `hasBonusTrigger`.

**⚠️ CRITIQUE — Le flag doit être reset au début de chaque groupe :**
```typescript
// Dans playWinSequence, au début de chaque iteration
stateWinLoop.skipGroupRequested = false;
// Sans ce reset, le flag du groupe précédent saute aussi le suivant !
```

**⚠️ CRITIQUE — WinAmount lancé avant la fin du stagger :**

Le WinAmount est lancé 2 symboles avant la fin (`i === sortedPositions.length - 3`). Si skip survient PENDANT le stagger, `hideWinAmountGroup()` résout la Promise WinAmount qui a déjà été créée. Puis dans le code :
```typescript
if (!stateWinLoop.skipGroupRequested) {
    await (winAmountPromise ?? showWinAmountGroup(group));
    //  ↑ Skippé car skipGroupRequested = true
}
// Cleanup toujours exécuté :
hideWinAmountGroup(); // Appel idempotent (no-op si déjà résolu)
```

### 5. Skip des Duels

**Approche par colonne** (`Set<number>`) :
```typescript
// ✅ CORRECT — Set par colonne pour éviter que les futurs duels soient skippés
let columnsToSkip = $state(new Set<number>());

stopButtonClick: () => {
    // Capturer SEULEMENT les colonnes actives au moment du clic
    const newSkips = stateDuel.activeDuels.map(d => d.column)...
    columnsToSkip = new Set([...columnsToSkip, ...newSkips]);
},

// Reset quand fade out termine
handleFadeComplete: () => {
    columnsToSkip = new Set();
}
```

**⚠️ ERREUR CLASSIQUE — Utiliser un boolean global :**
```typescript
// ❌ MAUVAIS — skip tous les futurs duels aussi
let skipDuels = $state(false);
stopButtonClick: () => { skipDuels = true; }
// → Le duel suivant du prochain spin sera aussi skippé !
```

**Protection anti-retour arrière** (`performance.now()`) :

Le skip d'un duel ne doit pas faire sauter l'animation en arrière si elle est déjà passée le point de skip :

```typescript
// Dans DuelAnimation.svelte
const SKIP_TO_TIME = 1.5; // Frame 45 à 30fps = fin de win_start

let winStartTimestamp = 0;
let winStartTimeScale = 1;

$effect(() => {
    if (phase === 'win_start' && winStartTimestamp === 0) {
        winStartTimestamp = performance.now();
        winStartTimeScale = stateBetDerived.timeScale();
    }
});

$effect(() => {
    if (props.skip && !skipApplied && phase !== 'win_idle') {
        skipApplied = true;
        if (phase === 'start') {
            phase = 'win_start';
            shouldJump = true;
        } else {
            // Vérifier si l'animation est déjà passée le point de skip
            const wallElapsed = (performance.now() - winStartTimestamp) / 1000;
            if (wallElapsed * winStartTimeScale < SKIP_TO_TIME) {
                shouldJump = true;
            }
            // Sinon: ne pas sauter (éviter un retour arrière)
        }
    }
});

// trackTime appliqué seulement si shouldJump est vrai
const trackTime = $derived(shouldJump && phase === 'win_start' ? SKIP_TO_TIME : undefined);
```

### 6. Reset du `isFirstDuel` lors d'un clearDuels() direct

**Problème:** `clearDuels()` appelé directement (transition bonus) ne déclenche pas `handleFadeComplete`, donc `isFirstDuel` et `fadedOutCount` ne sont pas reset.

**Fix (Duels.svelte) :**
```typescript
// Reset via $effect quand activeDuels devient vide sans passer par le fade
$effect(() => {
    if (stateDuel.activeDuels.length === 0 && !stateDuel.shouldFadeOut) {
        isFirstDuel = true;
        columnsToSkip = new Set();
        fadedOutCount = 0;
    }
});
```

### 7. Guard Big Win

Le skip doit être bloqué pendant le big win (l'animation doit se jouer entièrement) :

```typescript
// SpinStopOverlay — doit retourner si big win
if (stateSpin.isBigWinPlaying) return;

// HudPixi bouton play — pas de guard actuellement (comportement acceptable)
// Le savedIsTurbo orphelin est nettoyé au prochain clic idle
```

### 8. Checklist

- [ ] `SpinStopOverlay` et `handlePlay` font le même save+force-turbo
- [ ] `handlePlay` vérifie `stateDuel.isBlockingSpin` (duels pendant isIdle) — PAS `activeDuels.length > 0`
- [ ] `stopButtonClick` dans `Board.svelte` appelle AUSSI `requestSkipCurrentGroup()`
- [ ] `stateWinLoop.skipGroupRequested = false` au début de chaque groupe dans `playWinSequence`
- [ ] `columnsToSkip` est un `Set<number>`, pas un boolean global
- [ ] `handleFadeComplete` reset `columnsToSkip = new Set()` à la fin du fade out
- [ ] `$effect` reset dans `Duels.svelte` pour le `clearDuels()` direct
- [ ] `performance.now()` protection dans `DuelAnimation` pour éviter retour arrière

---

## ⚠️ SVELTE $EFFECT ET DÉPENDANCES RÉACTIVES

> **Règles critiques pour les `$effect` qui contiennent du code async.**

### 1. Principe : tout appel synchrone dans `$effect` est une dépendance

Svelte 5 suit toutes les lectures réactives qui s'exécutent **synchronement** dans un `$effect`. Si une fonction appelée depuis `$effect` lit une valeur réactive (comme `stateBetDerived.timeScale()`), cette valeur devient une dépendance du `$effect`.

```typescript
// ❌ PROBLÈME — timeScale() est lu synchronement dans runAnimation()
// qui est appelé depuis $effect → timeScale devient une dépendance
// → Si isTurbo change (ex: clic stop), l'animation redémarre !
$effect(() => {
    if (stateRetrigger.isVisible) {
        runAnimation(); // lit timeScale() synchronement à l'intérieur
    }
});
```

**Symptôme :** L'animation +X du retrigger recommence quand le joueur clique stop (qui force isTurbo = true).

### 2. Fix : `untrack()`

Envelopper l'appel dans `untrack()` pour que les lectures réactives à l'intérieur **ne soient pas trackées** par le `$effect` parent :

```typescript
import { untrack } from 'svelte';

// ✅ CORRECT — runAnimation() ne devient pas une dépendance
$effect(() => {
    if (stateRetrigger.isVisible && stateRetrigger.positions.length > 0) {
        untrack(() => runAnimation());
    } else {
        phase = 'idle';
    }
});
```

**Note importante :** Seul l'appel est wrappé dans `untrack()` — la condition `stateRetrigger.isVisible` est toujours trackée (on veut que l'effect se relance quand `isVisible` change).

### 3. Pattern général pour les animations async dans `$effect`

```typescript
const runAnimation = async () => {
    // ✅ Capturer timeScale UNE FOIS au début (pas dans $effect)
    const ts = stateBetDerived.timeScale();

    // Utiliser ts pour toutes les durées
    await containerScale.set(1, { duration: APPEAR_DURATION_MS / ts });
    // ...
};

$effect(() => {
    if (conditionDeStart) {
        // ✅ untrack pour éviter de tracker tout ce que runAnimation lit
        untrack(() => runAnimation());
    } else {
        phase = 'idle';
    }
});
```

### 4. Règle : capturer timeScale au début, pas en cours d'animation

```typescript
// ✅ BON — timeScale fixé au début de l'animation
const runAnimation = async () => {
    const ts = stateBetDerived.timeScale(); // Capture une seule fois
    await step1({ duration: 150 / ts });
    await step2({ duration: 800 / ts });
    // Si isTurbo change pendant l'animation, ça ne change rien (ts est capturé)
};

// ❌ MAUVAIS — timeScale lu à chaque étape, peut varier pendant l'animation
const runAnimation = async () => {
    await step1({ duration: 150 / stateBetDerived.timeScale() }); // lu maintenant
    await step2({ duration: 800 / stateBetDerived.timeScale() }); // peut être différent !
};
```

### 5. Cas où `untrack` N'est PAS nécessaire

- Lectures réactives **après** un `await` : elles ne sont plus trackées par le `$effect` (Svelte ne peut pas tracker après une suspension async)
- Lectures dans des callbacks/Promises créées de manière asynchrone

```typescript
$effect(() => {
    if (condition) {
        // Synchrone → tracké ✓
        const value = someState.value;

        someAsyncFn().then(() => {
            // Après await → PAS tracké (ok)
            const ts = stateBetDerived.timeScale();
        });
    }
});
```

---

## ⚠️ GATING : ANIMATIONS UI RÉACTIVES ↔ CHAÎNE D'EVENTS ASYNC

> **Généraliste, réutilisable.** Dès qu'une animation **pilotée par un composant réactif** (count-up, intro de laser/overlay, reveal de multiplicateurs, fusion…) doit **bloquer la chaîne de book events** (un handler `await` une promesse résolue quand l'anim finit) ET qu'elle est **skippable**, on tombe sur une famille de races/deadlocks. Cette section décrit l'architecture correcte et les pièges, indépendamment du jeu. (Cas concret Space Mania : reveal des multiplicateurs de colonne + gate des lasers Vaisseau ; analogue no-mercy : duels.)

### 1. Le pattern de "gate"

Un handler de book event doit attendre une animation qui vit dans un composant Svelte :

```typescript
// State partagé (module) = le pont entre la couche handler (async) et la couche UI (réactive)
state = { running: false, resolvers: [] as (() => void)[] }
export const startAnim = () => { state.running = true; }                  // handler, AVANT le spin
export const markAnimDone = () => {                                       // composant, anim finie
    if (!state.running) return;                                          // idempotent (cf. §2.B)
    state.running = false;
    state.resolvers.forEach(r => r()); state.resolvers = [];
}
export const waitAnim = (): Promise<void> => new Promise(res => {         // handler, await le gate
    if (!state.running) { res(); return; }
    state.resolvers.push(res);
});
```

```typescript
// Handler : bloque jusqu'à la fin de l'anim (ou son skip)
'some-event': async () => { await waitAnim(); /* …suite (paylines, wins) */ }
```

**Règle d'or :** l'état du gate **partagé entre la couche async (handlers) et la couche réactive (composants)** doit être **possédé par du state partagé** et **muté synchroniquement par le handler aux points de décision** — JAMAIS dérivé/reseté à l'intérieur d'un `$effect` de composant, où l'ordre de flush est non déterministe.

### 2. Les 4 pièges (root causes généralisées)

Ces 4 bugs ont chacun bloqué la machine. Ils se ressemblent dans toutes les machines.

**A. Flag latché lu à deux instants du même flush → état « moitié-skip / moitié-normal » → deadlock.**
Si une décision par-séquence (ex. `skip`) vit dans le `$state` d'un composant et est **écrite par l'effect parent** pendant que les **enfants la lisent** : quand les enfants tournent AVANT le parent (l'ordre parent→enfant n'est PAS garanti quand les deux dépendent de la même clé réactive), ils lisent une valeur **périmée/latchée**, puis le parent la bascule en cours de flush → moitié des éléments en mode skip, moitié en normal → aucun ne signale sa fin → gate jamais relâché.
→ **Fix : décider ce flag UNE fois, SYNCHRONIQUEMENT, dans le handler** (avant tout `$effect`), dans du **state partagé**. Tout le flush lit alors **une seule valeur stable**. L'effect parent ne fait que la **lire**.

**B. Suivi de complétion qui race avec un reset réactif.**
Si la libération du gate dépend de callbacks enfant→parent (`onDone`) ALORS que l'accumulateur de complétion (compteur/Set des éléments finis) est **reseté réactivement dans le MÊME flush** : les enfants signalent avant que le parent ne reset → l'accumulateur contient les valeurs du tour précédent → la condition « tous finis » n'est jamais (ou est faussement) atteinte.
→ **Fix : relâcher le gate de façon déterministe depuis le propriétaire** (parent/handler), **synchroniquement** pour le cas skip ; rendre `markAnimDone()` **idempotent** (`if (!running) return`) pour que parent ET callbacks puissent l'appeler sans se battre. Ne pas faire dépendre la libération de l'ordre des callbacks enfants.

**C. Effect de skip qui ne se relance pas car sa dépendance ne change pas.**
Un `$effect` gardé sur un flag réactif (`if (!skip || done) return`) ne **re-tourne pas** si la valeur ne change pas d'une itération à l'autre (flag **latché** `true→true`, ou `done` resté `false`). L'anim n'est alors jamais skippée pour la nouvelle séquence.
→ **Fix : keyer l'effect sur le token par-itération** (`spinKey`/nonce) — `void props.spinKey;` en tête — pour qu'il **se ré-évalue à chaque séquence**, indépendamment des autres deps. Et **ne pas gater sur un flag d'état mutable** (ex. `done`) dont l'ordre de reset est incertain : utiliser un **garde par-clé** (`let appliedForKey = -1; if (appliedForKey === key) return; appliedForKey = key;`).

**D. La garde « nouvelle action vs stop » doit inclure TOUTES les anims bloquantes.**
Le bouton play décide « nouveau spin » vs « stop/skip » via `isIdle` + des flags de blocage. **Toute** animation qui peut tourner pendant que la machine xstate lit déjà `idle` (laser, reveal, fusion…) doit figurer dans la garde — sinon un clic pendant l'anim **lance une nouvelle action** au lieu de la skipper.

```typescript
// ❌ incomplet — manque l'anim de reveal
if (isIdle && !state.laserBlocking) { bet() } else { stop() }
// ✅ inclut TOUTES les anims bloquantes
if (isIdle && !state.laserBlocking && !state.revealRunning) { bet() } else { stop() }
```

> **Spécifique TURBO :** ce bug est souvent **invisible en vitesse normale** et n'apparaît qu'en **turbo**. Raison : les reels/handlers sont accélérés (`/timeScale`) mais les anims UI ne le sont pas toujours (un count-up à durée fixe reste lent) → la machine atteint `idle` **pendant** que l'anim joue encore. Pire sur les **branches sans event de gating** (ex. spin sans expand → aucun `isBlockingSpin` posé → rien ne couvre la fenêtre de l'anim). Toujours tester le skip **en turbo** ET sur les spins **sans win / sans feature**.

### 3. Process de debug (race/timing réactif) — NE PAS deviner

Les bugs de ce type ne se résolvent pas « à la lecture ». Trois corrections « logiques » d'affilée peuvent échouer parce que le modèle mental de l'ordre de flush est faux. Méthode qui a marché :

1. **Instrumenter chaque point de gate** avec des logs **greppables** (un tag commun, ex. `[GATE]`) : transitions d'état, **mise en file / résolution** des promesses (`QUEUED` vs `IMMEDIATE` vs `RELEASE`), **entrée d'effect** (avec la valeur des flags lus), et **branche de décision prise** (au point de décision, logger TOUS les inputs + la branche : `{branch:'BET'|'STOP', isIdle, blockingA, blockingB}`).
2. **Marqueurs de frontière** (ex. un log par `board-reveal`) pour découper le journal par spin.
3. **Reproduire**, puis lire **le dernier log avant le gel** : il pointe la promesse/branche exacte qui coince (`waitX QUEUED` sans `RELEASE` correspondant ; `onDone` jamais loggé ; `branch:'BET'` alors qu'on attendait `STOP`).
4. **Prouver la cause par les données AVANT de coder le fix.** Comparer les scénarios qui marchent vs qui buggent (normal vs turbo, avant vs pendant l'anim) : la diff dans les logs EST la cause.
5. Une fois confirmé et corrigé, **retirer les logs** (grep le tag).

> L'utilisateur peut copier la console dans un fichier et te l'envoyer — préférer ce flux à la spéculation. Chaque correction non prouvée par les logs est une perte de temps.

---

## Changelog

| Date | Phase | Description |
|------|-------|-------------|
| 2026-06 | Z-order | Ajout section **Z-ORDER : `sortableChildren` + zIndex explicite vs ordre de montage**. Symptôme : au swap de format d'affichage un élément passe devant un autre (rock devant hud). Cause : pixi-svelte ordonne par ordre d'`addChild` (pas position Svelte) sauf si parent `sortableChildren` ; un enfant conditionnel (`{#if isMobile}`) est ré-append en dernier au remontage → passe au-dessus. Fix : conteneur racine `sortableChildren={true}` + chaque couche wrappée `<Container zIndex={n}>` (barème commenté back→front ; z dépendant du layout = 2 branches `{#if}` à z différents). Généralisé depuis `Game.svelte` Space Mania. |
| 2026-06 | Bonus intro | §BONUS INTRO/OUTRO — ajout **§2bis : verrouiller un number-slot/overlay SUR un spine** sans réglage par layout. (A) skeleton avec slot chiffre → attachment Spine ; (B) sans slot (texte cuit) → overlay en **espace local du spine** : `<Container scale={spineScale}>` + constantes en **px-skeleton** → position ET taille suivent le spine, calibrage unique. Piège : ne pas scaler l'overlay par le facteur responsive `s` seul (découplage du `BASE_SPINE_SCALE`). Contredit volontairement la note §RESPONSIVE (enfants hors SpineProvider) car ici on VEUT le scale du spine. + prop `keyFor` paramétrable sur `FreeSpinNumberSlots`. |
| 2026-06 | Layout | §RESPONSIVE LAYOUT — le `layoutType` "desktop" couvre plusieurs ratios. Plein écran + barre navigateur = 1920×911 (ratio 2.11) → jeu letterboxé (fit hauteur 0.843), les valeurs calibrées pour 1080 ne collent plus. Détecter `isWideDesktop = desktop && canvasRatio > 16/9 + ε`. Deux traitements : (A) élément collé au board (full asset) → espace board `mainLayout` + branche `wideDesktop` optionnelle (réf `Character.svelte`) ; (B) décor de coin / **crop partiel** → espace écran `canvasSizes` + un jeu `{scale,margins}` PAR mode, calibré (réf `Rock.svelte`). Un crop partiel ne va PAS en espace board (letterbox révèle le bord). **Exception mobile** : un élément board placé hors-grille (mascotte sur le côté) déborde verticalement en portrait (board fit-largeur) → sur mobile basculer en espace écran (`scale ∝ canvas.height`, position en %) + mount sans MainContainer (réf `Character.svelte` branche `isMobile`). |
| 2026-06 | Gating/Skip | Ajout section **GATING : ANIMATIONS UI RÉACTIVES ↔ CHAÎNE D'EVENTS ASYNC** — pattern de gate (handler `await` ← composant résout), 4 root causes de deadlock de skip (flag latché lu 2× dans un flush ; complétion qui race avec reset réactif ; effect de skip non re-déclenché → keyer sur nonce + garde par-clé ; garde nouvelle-action incomplète, bug turbo/sans-gating-event), et le **process de debug par logs greppables** (prouver par les données avant de coder). Généralisé depuis Space Mania (reveal multiplicateurs + gate lasers). |
| 2026-05 | Max win cap bet-double | Fix `capToMaxWin` dans `src/game/utils.ts` — suppression du `bet *` dans la formule du cap. Avant : `bet × MAX_WIN_MULTIPLIER × BOOK_AMOUNT_MULTIPLIER` → à `bet = 0.01`, cap = `12500` book units → HUD plafonné à `1.25 GC`. Après : `MAX_WIN_MULTIPLIER × BOOK_AMOUNT_MULTIPLIER` (formule replay, bet-independent) → cap `1 250 000` book units → render `× wageredBet (= 0.01)` = `125 GC` (12500× bet, correct). Signature passe de `(amount, betAmount?)` à `(amount)`. Bug visible uniquement pour `bet < 1` (mode normal). Mode replay déjà correct. Même racine que "Social mode win display" — le `bet` était double-appliqué (au cap + au render). |
| 2026-05 | Currency precision counters | Fix compteur win 3-décimales dans `Win.svelte` et `FreeSpinOutro.svelte` — décimales count-up locked sur la précision du target final pour éviter le flicker 2↔3 décimales pendant les valeurs intermédiaires noisy de la Tween. Ajout `detectCurrencyDecimalPrecision()`, `numberToCurrencyStringWithFixedDecimals()`, `bookEventAmountToCurrencyStringWithFixedDecimals()` dans `packages/utils-shared/amount.ts`. `numberToCurrencyString` étendu : précision dynamique 2..3 décimales selon valeur (avant : toujours 2 hors `< 0.1`). Cap max 3 décimales partout via constante `MAX_CURRENCY_DECIMALS`. Résout aussi le bug HUD balance figée quand win < 0.01 (ex 988.75 + 0.006 → "988.756"). |
| 2026-05 | Turbo leak into bonus | Fix `fs-triggered` — clear `stateSpin.savedIsTurbo` et `stateSpin.stopRequested` après la capture/reset turbo. Sans clear, un click stop/skip pendant le pre-bonus spin laissait l'orphan non-null, et le 1er `board-reveal` du bonus restaurait `stateBet.isTurbo = true` via la branche `savedIsTurbo \|\| level >= 2`. HUD montrait turbo OFF (level 0) mais tous les spins bonus tournaient en turbo. |
| 2026-05 | Insufficient funds UX | Spin button n'est plus désactivé quand `balanceAmount < betCost`. Click et spacebar ouvrent la modal `autoSpinMessage` avec `source: 'manual'` → affiche `YOU CANNOT PLAY DUE TO` / `INSUFFICIENT FUNDS` (ou `INSUFFICIENT BALANCE` en social). Type `ModalAutoSpinMessage` étendu avec champ optionnel `source: 'autoplay' \| 'manual'`. Autoplay conserve la désactivation du start button (`HudAutoPlayPanel`). |
| 2026-05 | Social mode win display | Fix `show-final-win` et `show-fs-spin-win` — suppression du `× stateBet.betAmount` parasite (le rendu via `bookEventAmountToCurrencyString` applique déjà `wageredBetAmount`). Compensation `/ betAmount` retirée dans `Win.svelte`. Max cap `setWin` freegame aligné sur book units. Bug invisible en bet=1, ×200 en social bet=200. |
| 2026-05 | Duels | Fix blocage machine après duel base game : `isBlockingSpin` remplace `activeDuels.length > 0` dans handlePlay |
| 2026-05 | Duels | `fadeOutDuels()` appelé dans `onNewGameStart` pour fade immédiat au clic spin |
| 2026-05 | Events | Migration events RGS : suppression `freeSpinTrigger`/`updateFreeSpin`, conservation `setTotalWin` |
| 2026-05 | Resume | Fix resume mid-bonus — `checkIsBonusGame` predicate filtre `'board-reveal'` (inline) au lieu d'importer `checkIsMultipleRevealEvents` qui filtre `'reveal'` (legacy). Bonus classé `bonusWin` → `end-round` appelé après outro (pas au début du bonus). |
| 2026-05 | Resume | `resumeBet` broadcast déplacé de `ResumeBet.onMount` vers `Game.svelte handleGameStart` (après boardAnimationStart + boardFadeIn) → spin resume joue sur grille visible. |
| 2026-05 | Resume | RulesPage toujours affichée après loading screen (même en resume mode) pour que le click utilisateur unlock l'AudioContext. |
| 2026-05 | Big Win | Fix base game — `show-final-win` await `stateWinLoop.sequencePromise` au lieu d'un `setTimeout(1000)` arbitraire. Flag `isBigWinPlaying` set APRÈS le await pour que le skip wingroup reste actif pendant les anims. |
| 2026-05 | Events | Ajout doc migration event types + avertissement `setTotalWin` toujours actif |
| 2026-05 | Skip | Ajout section SKIP MECHANICS — stop spin, win groups, duels |
| 2026-05 | Turbo | Ajout section TURBO MODE LIFECYCLE — double savedIsTurbo, restore pattern |
| 2026-05 | Svelte | Ajout section $EFFECT ET DÉPENDANCES — untrack() pattern |
| 2026-05 | Win Groups | Mise à jour playWinSequence — skip support, WinAmount timing, sons |
| 2026-05 | Win Groups | Mise à jour stateWinLoop — skipGroupRequested, skipGroupResolve, requestSkipCurrentGroup |
| 2026-05 | Retrigger | Ajout section fs-retrigger + RetriggerOverlay dans BONUS INTRO/OUTRO |
| 2025-05 | Replay | Fix conversion replay: `amount` utilisé directement sans `× betAmount` (alignement Cactus Cash) |
| 2025-05 | Replay | Ajout section REPLAY MODE - Documentation complète du mode replay |
| 2025-05 | Win Amounts | Mise à jour format events (alignement Cactus Cash: `amount = multiplier × 100`) |
| 2025-05 | Win Amounts | Ajout section 8.1 - Gestion du blocage des spins (base game vs bonus mode) |
| 2025-05 | Paylines | Ajout champ `lineNumber` dans `EnrichedCombination` |
| 2025-05 | Dimming | Ajout section complète - Obscurcissement avec fade (`tweened`) |
| 2025-05 | Navigation | Ajout Table des Matières |
| 2025-05 | Références | Ajout lien vers `BUG_LINENUMBER_BOUNTY.md` |
| - | - | Document créé |

