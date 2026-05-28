# No Mercy at Dawn - Backend Events Specification

Ce document liste tous les events que le backend doit envoyer au frontend.

---

## Events Principaux

### 1. `board-reveal`
Révèle le résultat du spin.

```typescript
{
    index: number;
    type: 'board-reveal';
    board: string[][];                    // Grille 5x5 de symboles (ex: [["H1", "L2", ...], ...])
    anticipation: number[];               // [0, 0, 1, 1, 1] - 1 = anticipation sur ce rouleau
    paddingPositions: number[];           // [23, 41, 7, 35, 12] - Position random dans padding reel (0-49)
    expandedVS?: { column: number; multiplier: number }[];  // Bounty mode
    totalMultiplier?: number;             // Bounty mode
    stickyWilds?: { col: number; row: number }[];  // Classique mode
    fsMode?: 'classique' | 'bounty';      // Mode free spins actif
}
```

**Champs critiques:**
- `anticipation`: **REQUIS** pour l'animation de ralentissement des rouleaux
- `paddingPositions`: **REQUIS** pour que les symboles défilent pendant le spin
- `expandedVS`: **REQUIS** quand des VS doivent s'expand - permet de déclencher l'animation VS dès que le rouleau atterrit (pas après que tous les rouleaux soient arrêtés)

---

### 2. `show-wins`
Affiche les combinaisons gagnantes, groupées par source de multiplicateur.

```typescript
{
    index: number;
    type: 'show-wins';
    winGroups: WinGroup[];
    totalFinalPayout: number;
}

type WinGroup = {
    multiplierSources: number[];      // Colonnes VS (ex: [], [0], [0, 2])
    multiplier: number;               // 1 si pas de VS, sinon le multiplicateur
    combinations: EnrichedCombination[];
    groupPayout: number;              // Somme AVANT multiplicateur (en unités de mise)
    groupFinalPayout: number;         // groupPayout × multiplier (en unités de mise)
};

type EnrichedCombination = {
    kind: number;                     // 3, 4, ou 5 symboles
    baseSymbol: string;               // ID du symbole (ex: "L5", "H3")
    positions: {
        reel: number;                 // 0-4
        row: number;                  // 0-4 (position dans la grille visible)
        isWild: boolean;              // Si c'est un wild/VS qui substitute
    }[];
    payout: number;                   // Payout de cette combinaison
    lineNumber: number;               // Numéro de la payline (1-15) pour l'animation
};
```

**Note sur `lineNumber`:**
- **REQUIS** si le frontend affiche des animations de paylines
- Correspond au numéro de l'animation Spine (1-15)
- Utilisé avec `kind` pour masquer la payline après X symboles (3, 4, ou 5)

**Tri des groupes :**
1. D'abord les groupes sans VS (`multiplierSources: []`)
2. Puis par première colonne source (`[0]` avant `[2]` avant `[4]`)

**Voir `BACKEND_EVENTS_WIN_SPECS.md` pour un exemple complet.**

---

### 3. `show-final-win`
Affiche le gain final du spin (pour big wins en base game).

```typescript
{
    index: number;
    type: 'show-final-win';
    amount: number;      // Multiplicateur × 100 (format Cactus Cash). Ex: 2550 = 25.5x
    winLevel: number;    // 0 = pas d'animation, 1-5 = niveau d'animation
}
```

**Win Levels:**
| Level | Nom | Multiplicateur |
|-------|-----|----------------|
| 0 | Rien | 0x |
| 1 | Nice Win | 10x - 19x |
| 2 | Mega Win | 20x - 49x |
| 3 | Epic Win | 50x - 99x |
| 4 | Legendary Win | 100x - 12499x |
| 5 | Max Win | 12500x |

---

### 4. `setTotalWin`
Met à jour le compteur de gains total (cumul) dans le HUD.

**⚠️ Utilisé uniquement en Free Spins** - En base game, utiliser `show-final-win`.

```typescript
{
    index: number;
    type: 'setTotalWin';
    amount: number;      // Multiplicateur × 100 (format Cactus Cash). Ex: 2550 = 25.5x cumul
}
```

**Conversion frontend:** `bookUnits = amount * betAmount`

---

## Events Free Spins

### 5. `fs-triggered`
Déclenche les free spins.

```typescript
{
    index: number;
    type: 'fs-triggered';
    fs: number;                          // Nombre de free spins
    fsMode: 'classique' | 'bounty';      // Mode de free spins
    positions: { reel: number; row: number }[];  // Positions des scatters (REQUIS pour animation!)
}
```

**⚠️ IMPORTANT**: Le champ `positions` est **REQUIS** pour que le frontend puisse animer les scatters avant l'intro du bonus.

---

### 6. `update-fs-amount`
Met à jour le compteur de free spins.

```typescript
{
    index: number;
    type: 'update-fs-amount';
    fs: number;          // Free spins restants
    totalFs: number;     // Total de free spins
}
```

---

### 7. `fs-retrigger`
Retrigger de free spins (scatter(s) apparu(s) pendant les free spins).

```typescript
{
    index: number;
    type: 'fs-retrigger';
    scatterCount: number;     // Nombre de scatters (1-5)
    extraSpins: number;       // Spins ajoutés (ex: scatterCount × 2)
    totalFs: number;          // Nouveau total de free spins
    positions: { reel: number; row: number }[];  // Positions des scatters
}
```

**Animation frontend:**
- Les scatters s'animent avec "+X" affiché sur chaque symbole (où X = spins par scatter, ex: +2)
- Le compteur de free spins se met à jour avec le nouveau total

**Règle de retrigger (exemple):** 1 scatter = +2 free spins

| Scatters | Extra Spins |
|----------|-------------|
| 1        | +2          |
| 2        | +4          |
| 3        | +6          |
| 4        | +8          |
| 5        | +10         |

---

### 8. `show-fs-spin-win`
Affiche le gain d'un spin en free spins (big win animation).

```typescript
{
    index: number;
    type: 'show-fs-spin-win';
    amount: number;      // Multiplicateur × 100 (format Cactus Cash). Ex: 1050 = 10.5x
    winLevel: number;    // Niveau d'animation (0-5)
}
```

---

### 9. `show-fs-total-win`
Affiche le gain total des free spins (outro).

```typescript
{
    index: number;
    type: 'show-fs-total-win';
    amount: number;      // Multiplicateur × 100 (format Cactus Cash). Ex: 50000 = 500x total
    winLevel: number;    // Niveau d'animation (0-5)
}
```

**⚠️ NE PAS envoyer `show-final-win` après `show-fs-total-win`** - c'est redondant.

---

## Events Bounty Mode (VS Duel)

### 10. `vs-expand`
Animation d'expansion VS en colonne wild.

```typescript
{
    index: number;
    type: 'vs-expand';
    column: number;      // Index de la colonne (0-4)
    multiplier: number;  // Multiplicateur de cette colonne (le winner du duel)
}
```

**⚠️ NOTE:** L'animation VS est maintenant déclenchée au moment où le rouleau atterrit (via `expandedVS` dans `board-reveal`), pas quand cet event est reçu. L'event `vs-expand` est gardé pour compatibilité mais ne déclenche plus l'animation côté frontend.

---

### 11. `duel`
Animation du duel entre outlaws.

```typescript
{
    index: number;
    type: 'duel';
    column: number;         // Index de la colonne (0-4) - REQUIS pour positionnement
    outlaw1Multi: number;   // Multiplicateur outlaw 1 (blanc/faucheuse)
    outlaw2Multi: number;   // Multiplicateur outlaw 2 (rouge/guerrier)
    winner: number;         // Le multiplicateur gagnant
}
```

**IMPORTANT:** Le champ `column` est **REQUIS** pour positionner l'animation de duel sur la bonne colonne. Les duels doivent être envoyés de gauche à droite.

---

### 12. `total-multiplier`
Affiche le multiplicateur total accumulé.

```typescript
{
    index: number;
    type: 'total-multiplier';
    multipliers: number[];   // Liste des multiplicateurs individuels
    total: number;           // Somme totale
}
```

---

## Events Classique Mode (Sticky Wilds)

### 13. `newStickyWilds`
Nouveaux sticky wilds apparus.

```typescript
{
    index: number;
    type: 'newStickyWilds';
    positions: {
        reel: number;        // 0-4
        row: number;         // 0-4
        multiplier: number;  // Multiplicateur du wild
    }[];
}
```

---

## Logique Backend

### Anticipation (Ralentissement des rouleaux)

L'anticipation est l'effet où les derniers rouleaux ralentissent quand des scatters sont apparus sur les premiers.

**Règles d'anticipation:**
| Mode | Stop anticipation après | Raison |
|------|------------------------|--------|
| **ACHAT** Bonus Classique | 3 scatters | Le joueur SAIT qu'il y en aura exactement 3 |
| **ACHAT** Bonus Bounty | 4 scatters | Le joueur SAIT qu'il y en aura exactement 4 |
| Base / Ante / Trigger naturel | 4 scatters | Le joueur NE SAIT PAS combien il en aura |

**Exemples:**
| Mode | Scatters sur reels | Anticipation | Explication |
|------|-------------------|--------------|-------------|
| Base/Ante | 0, 1 | `[0, 0, 1, 1, 1]` | 2 scatters, anticipe 3ème et 4ème |
| Base/Ante | 0, 1, 2 | `[0, 0, 1, 1, 1]` | 3 scatters, anticipe encore le 4ème |
| Base/Ante | 0, 1, 2, 3 | `[0, 0, 1, 1, 0]` | 4 scatters trouvés, stop |
| ACHAT Classique | 0, 1, 2 | `[0, 0, 1, 0, 0]` | 3 scatters trouvés, stop |
| ACHAT Classique | 0, 2, 4 | `[0, 0, 0, 1, 1]` | Seulement 2 scatters vus avant reels 3 et 4 |

```typescript
function handleAnticipation(ctx: Context) {
    const scatter = ctx.config.symbols.get("S")!
    const boardReels = ctx.services.board.getBoardReels()

    // Reset anticipation for all reels first
    for (let reelIdx = 0; reelIdx < boardReels.length; reelIdx++) {
        ctx.services.board.setAnticipationForReel(reelIdx, false)
    }

    // Trouver les reels avec scatter
    const reelsWithScatter: number[] = []
    for (let col = 0; col < boardReels.length; col++) {
        for (let row = 0; row < boardReels[col]!.length; row++) {
            if (boardReels[col]![row]!.id === scatter.id) {
                reelsWithScatter.push(col)
                break
            }
        }
    }

    // Si 2+ scatters, anticipation sur les reels suivants
    if (reelsWithScatter.length >= 2) {
        // Trier pour trouver le 2ème scatter (celui qui déclenche l'anticipation)
        const sortedReels = [...reelsWithScatter].sort((a, b) => a - b)
        const secondScatterReel = sortedReels[1]

        // IMPORTANT: Utiliser forceFreespins pour détecter un ACHAT de bonus
        // (pas currentGameMode qui est aussi true pour les triggers naturels)
        const isBonusBuyClassique = ctx.state.currentResultSet.forceFreespins
            && ctx.state.betMode === 'buy_classique'
        const isBonusBuyBounty = ctx.state.currentResultSet.forceFreespins
            && ctx.state.betMode === 'buy_bounty'

        // ACHAT classique = 3 scatters, ACHAT bounty = 4, sinon = 4 (max utile)
        const expectedScatterCount = isBonusBuyClassique ? 3 : 4

        // Set anticipation on reels after the 2nd scatter
        for (let reelIdx = secondScatterReel + 1; reelIdx < boardReels.length; reelIdx++) {
            // Count how many scatters we've seen up to this reel
            const scattersFoundSoFar = sortedReels.filter(r => r < reelIdx).length

            // If we've already found all expected scatters, no more anticipation
            if (scattersFoundSoFar >= expectedScatterCount) {
                continue
            }

            ctx.services.board.setAnticipationForReel(reelIdx, true)
        }
    }
}
```

**Appel dans le code:**
```typescript
drawBoard(ctx)
handleAnticipation(ctx)  // Après avoir dessiné le board

ctx.services.data.addBookEvent({
    type: "board-reveal",
    data: {
        board: getSymIdsFromReels(ctx.services.board.getBoardReels()),
        anticipation: ctx.services.board.getAnticipation(),
        paddingPositions: generateRandomPaddingPositions(),
        // ... autres champs
    },
})
```

### Padding Positions

Génération des positions aléatoires pour le défilement des symboles:

```typescript
const PADDING_REEL_LENGTH = 50; // ou la longueur réelle du padding reel

function generateRandomPaddingPositions(): number[] {
    return Array.from({ length: 5 }, () =>
        Math.floor(Math.random() * PADDING_REEL_LENGTH)
    );
}
```

---

## Flux d'Events Typiques

### Base Game Spin (sans gain)
```
board-reveal
```

### Base Game Spin (avec gain)
```
board-reveal → show-wins → show-final-win
```
**Note:** `show-final-win` met à jour le HUD win en base game (pas de `setTotalWin`).

### Trigger Free Spins (Naturel, sans gain)
```
board-reveal → fs-triggered → (transition vers free spins)
```
⚠️ Le board-reveal doit contenir les scatters visibles, et fs-triggered doit avoir `positions`.

### Trigger Free Spins (Naturel, avec gains)
```
board-reveal → show-wins → fs-triggered → (transition vers free spins)
```
**⚠️ IMPORTANT - Ordre critique `show-wins` → `fs-triggered`:**
- Le frontend attend la FIN des animations de `show-wins` AVANT de jouer l'animation scatter de `fs-triggered`
- Si l'ordre est inversé ou si les events sont envoyés en parallèle, les animations de win seront coupées
- Le frontend détecte automatiquement la présence de `fs-triggered` dans la liste des events pour savoir qu'il doit await les animations de win

### Trigger Free Spins (Bonus Buy)
```
board-reveal → fs-triggered → (transition vers free spins)
```
⚠️ Le backend DOIT dessiner un board avec scatters forcés dans board-reveal.

### Free Spin (Classique Mode)
```
update-fs-amount → newStickyWilds? → board-reveal → fs-retrigger? → show-wins? → show-fs-spin-win? → setTotalWin
```
**Note:** `setTotalWin` contient le cumul des gains (requis pour afficher le total dans le HUD).
**Note:** `fs-retrigger` est envoyé si des scatters apparaissent pendant le spin (retrigger de free spins).

### Free Spin (Bounty Mode avec VS)
```
update-fs-amount → board-reveal → [vs-expand → duel]* → total-multiplier → show-wins? → show-fs-spin-win? → setTotalWin
```
**Note:** `setTotalWin` contient le cumul des gains incluant les multiplicateurs VS.

**IMPORTANT - Ordre critique:**
1. `board-reveal` doit être envoyé **EN PREMIER** avec les symboles **VS visibles** dans le board (pas des W)
2. Ensuite `vs-expand` → `duel` pour chaque VS (de gauche à droite)
3. Les colonnes avec VS ont le **comportement wild** pour le calcul des gains, mais restent visuellement inchangées

```
vs-expand { column: 0 } → duel { column: 0 }
vs-expand { column: 2 } → duel { column: 2 }
vs-expand { column: 4 } → duel { column: 4 }
```

**Note:** L'animation du duel se fait par-dessus les symboles existants. Pas de remplacement visuel par des W.

### Fin Free Spins
```
show-fs-total-win → (retour base game)
```
⚠️ NE PAS envoyer show-final-win après.

---

## Checklist Backend

| Fonctionnalité | Event(s) | Champs requis | Notes |
|----------------|----------|---------------|-------|
| Spin normal | `board-reveal` | board, anticipation, paddingPositions | |
| Gain normal (base) | `show-wins` → `show-final-win` | winGroups, amount, winLevel | Met à jour HUD win |
| Trigger FS naturel (sans gain) | `board-reveal` → `fs-triggered` | positions dans fs-triggered | Scatters visibles sur board |
| Trigger FS naturel (avec gain) | `board-reveal` → `show-wins` → `fs-triggered` | winGroups, positions | **show-wins AVANT fs-triggered!** |
| Trigger FS bonus buy | `board-reveal` → `fs-triggered` | positions | Board avec scatters forcés |
| Chaque spin FS | `update-fs-amount` → `board-reveal` | fs, totalFs | |
| Gain FS | `show-wins` → `show-fs-spin-win` → `setTotalWin` | amount, winLevel | `setTotalWin` pour cumul HUD |
| Retrigger FS | `fs-retrigger` | scatterCount, extraSpins, totalFs, positions | Affiche +X sur chaque scatter |
| Cumul FS (HUD) | `setTotalWin` | amount (multiplier × 100) | **Free spins uniquement** |
| Fin FS | `show-fs-total-win` | amount, winLevel | PAS de show-final-win après |
| Sticky wilds | `newStickyWilds` | positions avec multiplier | |
| VS expand | `board-reveal` avec `expandedVS` | expandedVS requis | Animation VS au land du rouleau |
| VS duel | `vs-expand` → `duel` (par VS, gauche→droite) | column requis | Bounty mode uniquement |

---

## Notes Importantes

1. **paddingPositions**: Doit contenir 5 nombres aléatoires entre 0 et (taille du padding reel - 1). **Sans ça, les symboles ne défilent pas.**

2. **anticipation**: Tableau de 5 éléments (0 ou 1). Mettre 1 sur les rouleaux qui doivent ralentir (après le 2ème scatter). En bonus classique, stop après 3 scatters. En base/ante/bounty, stop après 4 scatters.

3. **positions dans show-wins**: `posIndex` est la position dans la grille visible (0-4), PAS la position avec padding.

4. **positions dans fs-triggered**: **REQUIS** pour animer les scatters avant l'intro bonus.

5. **winLevel**: Le frontend cap automatiquement au max win (12500x).

6. **Ordre des events**: Respecter l'ordre indiqué dans les flux, sinon les animations seront désynchronisées.

7. **expandedVS**: Doit être inclus dans `board-reveal` pour que l'animation VS se déclenche au moment où le rouleau atterrit. Sans ce champ, les VS n'animeront pas.

8. **Format amount (Cactus Cash)**: Les events `show-final-win`, `setTotalWin`, `show-fs-spin-win`, `show-fs-total-win` utilisent `amount = multiplier × 100`.
   - **Conversion frontend**: `bookUnits = amount * betAmount`. Exemple: `amount=550` (5.5x) avec `betAmount=2$` → `550 * 2 = 1100` book units (11.00$).
   - **Note**: `show-wins` garde son format original avec `groupPayout` et `groupFinalPayout` en multiplicateurs directs.

9. **setTotalWin vs show-final-win**:
   - En **base game**: utiliser `show-final-win` pour afficher le win dans le HUD
   - En **free spins**: utiliser `setTotalWin` pour afficher le cumul dans le HUD

10. **show-wins avant fs-triggered**: Quand un spin déclenche à la fois des gains ET un bonus:
    - `show-wins` DOIT être envoyé AVANT `fs-triggered`
    - Le frontend détecte `fs-triggered` dans la liste des events et attend la fin des animations de win
    - Si l'ordre n'est pas respecté, l'animation scatter coupera les animations de win en cours
