# Guide Audio - Slot Machines

Ce document explique comment créer et intégrer des sons dans les projets de machines à sous.

## Table des matières

1. [Prérequis](#prérequis)
2. [Création de l'Audio Sprite](#création-de-laudio-sprite)
3. [Structure des fichiers](#structure-des-fichiers)
4. [Configuration du sounds.json](#configuration-du-soundsjson)
5. [Intégration dans le code](#intégration-dans-le-code)
6. [Ajustement du timing des sons](#ajustement-du-timing-des-sons)
7. [Bonnes pratiques](#bonnes-pratiques)

---

## Prérequis

### Installation des outils (une seule fois)

```bash
# Installer audiosprite globalement
npm install -g audiosprite

# Installer ffmpeg (nécessaire pour audiosprite)
# Windows: https://ffmpeg.org/download.html (ajouter au PATH)
# Mac: brew install ffmpeg
# Linux: sudo apt install ffmpeg
```

### Convention de nommage des fichiers audio

Avant de créer le sprite, renommer les fichiers WAV avec un nommage cohérent :

| Type | Préfixe | Exemple |
|------|---------|---------|
| Musique de fond | `bgm_` | `bgm_base.wav`, `bgm_bonus.wav` |
| Effets sonores | `sfx_` | `sfx_spin.wav`, `sfx_win.wav` |
| Jingles | `jng_` | `jng_intro.wav`, `jng_bigwin.wav` |
| Niveaux de gain | `win_level_` | `win_level_1.wav`, `win_level_5.wav` |

---

## Création de l'Audio Sprite

### 1. Préparer les fichiers

Placer tous les fichiers WAV dans un dossier temporaire :

```
audio_source/
  bgm_base.wav
  bgm_bonus.wav
  sfx_spin.wav
  sfx_win.wav
  ...
```

### 2. Générer le sprite

```bash
cd audio_source
audiosprite -o sounds -f howler2 -e "ogg,m4a,mp3,ac3" *.wav
```

**Options utilisées :**
- `-o sounds` : Nom de sortie (génère sounds.ogg, sounds.mp3, etc.)
- `-f howler2` : Format Howler.js v2
- `-e "ogg,m4a,mp3,ac3"` : Formats de sortie (compatibilité navigateurs)

**Fichiers générés :**
```
sounds.ogg    # Format principal (Chrome, Firefox)
sounds.m4a    # Safari, iOS
sounds.mp3    # Fallback universel
sounds.ac3    # Fallback
sounds.json   # Configuration du sprite
```

### 3. Déplacer les fichiers

Copier les fichiers générés vers le projet :

```
static/assets/export_final/audio/
  sounds.ogg
  sounds.m4a
  sounds.mp3
  sounds.ac3
  sounds.json
```

---

## Structure des fichiers

### Arborescence projet

```
src/
  components/
    Sound.svelte          # Composant principal audio
  game/
    handlers/
      sound.ts            # Types et définitions des sons
    assets.ts             # Chargement des assets

static/assets/export_final/audio/
  sounds.ogg
  sounds.m4a
  sounds.mp3
  sounds.ac3
  sounds.json
```

---

## Configuration du sounds.json

### Structure du fichier

```json
{
  "src": [
    "./assets/export_final/audio/sounds.ogg",
    "./assets/export_final/audio/sounds.m4a",
    "./assets/export_final/audio/sounds.mp3",
    "./assets/export_final/audio/sounds.ac3"
  ],
  "sprite": {
    "bgm_base": [0, 51876, true],
    "bgm_bonus": [53000, 49145, true],
    "sfx_spin": [106000, 3107],
    "sfx_win": [145000, 701]
  },
  "config": {
    "bgm_base": { "volume": 1 },
    "bgm_bonus": { "volume": 1 },
    "sfx_spin": { "volume": 1 },
    "sfx_win": { "volume": 1 }
  }
}
```

### Format des sprites

```
"nom_du_son": [start_ms, duration_ms, loop?]
```

| Paramètre | Description |
|-----------|-------------|
| `start_ms` | Position de départ dans le fichier audio (en millisecondes) |
| `duration_ms` | Durée du son (en millisecondes) |
| `loop` | `true` pour boucler (musiques), omis ou `false` pour les effets |

### Chemins src

**Important :** Après génération, corriger les chemins dans `src` :

```json
// Généré par audiosprite (incorrect)
"src": ["sounds.ogg", "sounds.m4a", ...]

// Corrigé pour le projet
"src": [
  "./assets/export_final/audio/sounds.ogg",
  "./assets/export_final/audio/sounds.m4a",
  ...
]
```

### Section config

Ajouter une section `config` pour chaque son avec le volume par défaut :

```json
"config": {
  "nom_du_son": { "volume": 1 }
}
```

---

## Intégration dans le code

### 1. Définir les types (sound.ts)

```typescript
export type MusicName = 'bgm_base' | 'bgm_bonus';

export type SoundEffectName =
  | 'sfx_spin'
  | 'sfx_win'
  | 'sfx_reel_stop'
  | 'win_level_1'
  | 'win_level_2';
```

### 2. Jouer un son

```typescript
// Son unique (effet)
context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_spin' });

// Son unique avec forcePlay (permet plusieurs instances simultanées)
context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_versus', forcePlay: true });

// Musique en boucle
context.eventEmitter.broadcast({ type: 'soundLoop', name: 'bgm_base' });

// Arrêter une musique
context.eventEmitter.broadcast({ type: 'soundStop', name: 'bgm_base' });

// Fade in/out
context.eventEmitter.broadcast({
  type: 'soundFade',
  name: 'bgm_base',
  from: 0,
  to: 1,
  duration: 1000  // ms
});
```

### 3. Option forcePlay

Utiliser `forcePlay: true` quand :
- Le même son peut être joué plusieurs fois rapidement
- Les sons doivent se superposer (ex: plusieurs duels)

```typescript
// Sans forcePlay : si le son joue déjà, il ne recommence pas
context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_click' });

// Avec forcePlay : crée une nouvelle instance même si déjà en cours
context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_versus', forcePlay: true });
```

---

## Ajustement du timing des sons

### Problème : Le son commence trop tôt

Si un son a un silence au début ou une partie non désirée, on peut "skip" le début.

**Exemple :** `sfx_versus` doit commencer 2.3 secondes après le début réel du son.

```json
// Avant (son complet)
"sfx_versus": [128000, 13073]

// Après (skip 2300ms du début)
"sfx_versus": [130300, 10773]
```

**Calcul :**
- Nouveau start = ancien start + délai à skip
- Nouvelle durée = ancienne durée - délai à skip

```
start:    128000 + 2300 = 130300
duration: 13073 - 2300 = 10773
```

### Problème : Le son est trop long

Pour couper la fin d'un son, réduire simplement la durée :

```json
// Son de 13 secondes
"sfx_long": [100000, 13000]

// Coupé à 8 secondes
"sfx_long": [100000, 8000]
```

### Problème : Le son doit jouer avant la fin d'une animation

Utiliser un `setTimeout` pour déclencher le son au bon moment :

```typescript
const SOUND_DELAY_MS = 400; // Délai avant de jouer le son

// Dans le handler de l'animation
boardAnimationStart: async () => {
  // Son de début
  context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_spin_start' });

  // Son de fin décalé (joue avant la fin de l'animation)
  setTimeout(() => {
    context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_spin_stop' });
  }, SOUND_DELAY_MS);

  animState = 'animating_start';
  await waitForResolve((resolve) => (onAnimationComplete = resolve));
}
```

### Ajuster le délai dynamiquement (turbo mode)

Pour que les délais s'adaptent au mode turbo :

```typescript
import { stateBetDerived } from 'state-shared';

// timeScale() retourne 2 en turbo, 1 en normal
// DIVISER le délai par timeScale pour réduire en turbo
const baseDelay = 1000; // ms
const delay = baseDelay / stateBetDerived.timeScale();

await new Promise((resolve) => setTimeout(resolve, delay));
```

**Note :** `timeScale` est prévu pour les animations Spine (multiplier la vitesse). Pour les délais `setTimeout`, il faut DIVISER par `timeScale`.

---

## Bonnes pratiques

### 1. Tester les sons en isolation

Créer un composant de debug pour tester chaque son :

```typescript
const DEBUG_ENABLED = true; // Activer pour tester

// Dans le composant debug
$effect(() => {
  if (DEBUG_ENABLED) {
    context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_test' });
  }
});
```

### 2. Documenter les sons manquants

Commenter les sons qui n'existent pas encore :

```typescript
// TODO: Son non disponible
// context.eventEmitter.broadcast({ type: 'soundOnce', name: 'sfx_anticipation' });
```

### 3. Volumes par défaut

Ajuster les volumes dans `sounds.json` section `config` :

```json
"config": {
  "bgm_base": { "volume": 0.7 },      // Musique plus basse
  "sfx_win": { "volume": 1.0 },       // Effets à volume normal
  "win_level_5": { "volume": 1.2 }    // Big win plus fort
}
```

### 4. Nommage cohérent

| Son | Nom suggéré |
|-----|-------------|
| Lancement spin | `sfx_spin_launch` |
| Rouleaux tournent | `sfx_reel_spin` |
| Rouleau s'arrête | `sfx_reel_stop` |
| Scatter apparaît | `sfx_scatter_01`, `sfx_scatter_02`... |
| Wild stick | `sfx_wild_stick` |
| Victoire | `sfx_win` |
| Duel/VS | `sfx_versus` |
| Clic UI | `sfx_ui_click` |
| Musique base | `bgm_base` |
| Musique bonus | `bgm_bonus` |
| Niveaux de gain | `win_level_1` à `win_level_5` |

---

---

## Timings modifiés — no-mercy-at-down

Après régénération du sprite, **réappliquer ces ajustements** dans `sounds.json` (les valeurs brutes générées par audiosprite sont différentes).

| Son | Ajustement | Raison |
|-----|-----------|--------|
| `sfx_anticipation` | start `+1500ms`, durée `-1500ms` | Silence au début du fichier WAV |
| `sfx_reel_spin_stop` | start `-100ms`, durée `+100ms` | Légère correction de timing |
| `sfx_versus` | start `+2150ms`, durée `-2150ms` | Silence au début du fichier WAV |

### Sons avec loop (`true` en 3e paramètre)

```json
"bgm_base":  [..., true],
"bgm_bonus": [..., true],
"sfx_fire":  [..., true],
"sfx_wind":  [..., true]
```

### Volumes personnalisés (`config`)

```json
"sfx_anticipation":        { "volume": 2 },
"sfx_fire":                { "volume": 0.05 },
"sfx_reel_spin_stop":      { "volume": 2 },
"sfx_win_amount_increase": { "volume": 3 },
"sfx_wind":                { "volume": 0.05 }
```

### Procédure de régénération

```bash
# Dans static/assets/export_final/audio/raw/
audiosprite -o sounds -f howler2 -e "ogg,m4a,mp3,ac3" *.wav

# Copier les fichiers audio générés vers le dossier parent (audio/)
# Puis dans sounds.json :
# 1. Corriger les chemins src → ./assets/export_final/audio/sounds.*
# 2. Réappliquer les ajustements du tableau ci-dessus
# 3. Ajouter true pour les sons en loop
# 4. Ajouter la section config complète
```

---

## Résumé des commandes

```bash
# Créer l'audio sprite
audiosprite -o sounds -f howler2 -e "ogg,m4a,mp3,ac3" *.wav

# Vérifier ffmpeg
ffmpeg -version
```

## Checklist nouveau projet

- [ ] Renommer les fichiers WAV avec convention (bgm_, sfx_, etc.)
- [ ] Générer l'audio sprite avec audiosprite
- [ ] Copier les fichiers vers `static/assets/export_final/audio/`
- [ ] Corriger les chemins `src` dans sounds.json
- [ ] Ajouter `true` pour le loop des musiques (bgm_)
- [ ] Ajouter la section `config` avec les volumes
- [ ] Mettre à jour les types dans `sound.ts`
- [ ] Intégrer les sons dans les composants
- [ ] Tester et ajuster les timings dans sounds.json
