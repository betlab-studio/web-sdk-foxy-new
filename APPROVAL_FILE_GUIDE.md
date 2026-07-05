# Approval file — guide (reusable, all projects)

Comment produire le fichier `approval_<game>.txt` envoyé pour la **certification/approval** d'un jeu.
C'est un texte plat : (1) les **règles** du jeu en clair, puis (2) une section **"Bets ID's"** = pour chaque
bet mode et chaque **win level**, l'**index d'un book** (round simulé) du moteur math qui atteint ce niveau,
pour que le certifieur rejoue ce book et vérifie l'animation de win correspondante.

Template de référence : `apps/burst-game-swim-front/approval_capy_river.txt`. Exemple fait :
`apps/space-mania-front/approval_space_mania.txt`.

---

## Étape 1 — Règles (partie haute du fichier)

Sources, dans l'ordre : **`game-spec.md`** (règles, paytable, features, bonus, win levels) + **`CLAUDE.md`**
(noms/assets, mapping symboles, coûts des modes) de l'app front.

Reprendre la **structure du template** et remplacer le contenu par le jeu cible. Sections typiques (adapter
selon le jeu — slot vs autre) :
- **Basic Principle** : 1 paragraphe (type de jeu, grille/paylines, symboles spéciaux, max win).
- **Symbols** + **Payouts** : paytable en multiplicateurs de la mise (3/4/5 …), Wild, Scatter, spéciaux.
- **Features** : chaque mécanique spéciale (ex. Column Filler, Column Multiplier).
- **Bonus Trigger** + **Bonus Modes** : conditions de déclenchement, free spins, retrigger, persistances.
- **Activatable / Ante / Feature modes** : multiplicateurs de mise, effet, RTP.
- **Buy Bonus** : coûts.
- **Max Win** + **RTP** (tous modes).
- **Win Levels** : voir Étape 2.

⚠️ Écrire en **anglais** (langue de certif), phrases simples, pas de jargon interne. Pas de social-mode ici.

---

## Étape 2 — Win Levels

Source : **`src/game/config/winLevelMap.ts`** (front) — c'est la vérité des seuils + noms affichés. Recouper
avec `game-spec.md` §"Win Levels". Lister **nom + seuil** (multiplicateur de la **mise de base**, pas du coût
du mode bonus). Ex. Space Mania (5 niveaux) :

    Nice Win (>= 10x) · Big Win (>= 20x) · Epic Win (>= 50x) · Galactic Win (>= 100x) · Max Win (= max_win x)

---

## Étape 3 — Bets ID's (depuis le moteur math)

Le repo math sibling (ex. `../../../<game>-math`, lire son chemin dans `CLAUDE.md`) publie des **lookup
tables** par mode. On y lit, pour chaque win level, un **book_id** dont le payout tombe dans la band.

1. **Localiser** `<game>-math/__build__/publish_files/` → `index.json` liste les modes :
   `{ name, cost, events: "books_<mode>.jsonl.zst", weights: "lookUpTable_<mode>_0.csv" }`.
2. **Format lookup CSV** (3 colonnes, pas de header) : `book_id, weight, payout`.
   - `payout` est en **×100 de la mise de base** → `win_level_multiplier = payout / 100`.
   - Vérifier le scale : `max(payout)` doit valoir `max_win × 100` (ex. 12500× → 1 250 000). Si un jeu
     utilise une autre échelle, recalculer `SCALE` à partir de `max(payout) / max_win`.
3. **Win level toujours calculé sur le coût BASE (1)**, même pour les modes coûteux (ante/feature/bonus) —
   c'est déjà le cas car `payout` est en unités de mise de base. Ne PAS diviser par le coût du mode.
4. **Pour chaque mode**, parcourir le CSV et retenir **un book_id représentatif par band** (le premier qui
   tombe dedans convient — c'est ce que fait le template). Bands (bornes = seuils des win levels) :

       nice [10,20)  big [20,50)  epic [50,100)  galactic [100, max_win)  max [max_win, ∞)

   Script (à adapter — modes, seuils, max_win) :

   ```python
   import csv
   modes=['base','ante','feature','bonus1','bonus2']   # = index.json
   SCALE=100                                            # payout units per 1x base bet
   MAXWIN=12500
   bands=[('nice',10,20),('big',20,50),('epic',50,100),('galactic',100,MAXWIN),('max',MAXWIN,10**9)]
   for m in modes:
       first={}
       with open(f'lookUpTable_{m}_0.csv') as f:
           for r in csv.reader(f):
               bid=int(r[0]); mult=int(r[2])/SCALE
               for name,lo,hi in bands:
                   if name not in first and lo<=mult<hi: first[name]=bid
       print(m, first)
   ```

5. **Écrire** une ligne "Bets ID's" par mode, ordre = ordre des win levels :

       <Nom Mode> (<modeKey>) : Nice Win (>= 10x) : <id> :  Big Win (>= 20x) : <id> :  Epic Win (>= 50x) : <id> :  Galactic Win (>= 100x) : <id> :  Max Win (= <max_win>x) : <id> :

   `<modeKey>` = clé moteur (`base`/`ante`/`feature`/`bonus1`/`bonus2`). `<Nom Mode>` = nom user-facing
   (ex. `betModeMeta` : Triple Chance, Strike Force, Space Expedition, Hyperspace Assault).

---

## Checklist automatisable (prochains projets)

- [ ] Lire `game-spec.md` + `CLAUDE.md` (front) → rédiger les règles (anglais) sur la structure du template.
- [ ] Win levels depuis `winLevelMap.ts` (noms + seuils sur coût base).
- [ ] `index.json` du math `publish_files` → liste modes + lookup CSV + cost.
- [ ] Vérifier le scale via `max(payout) == max_win × 100`.
- [ ] Script python → un book_id par (mode × win level band).
- [ ] Écrire `approval_<game>.txt` (règles + section Bets ID's).
- [ ] Sanity : chaque book_id retenu a bien `payout/SCALE` dans sa band (le script le garantit) ; le book
      `max` a `payout == max_win × 100`.

> Notes : la lookup **EST** la source de vérité des payouts par book — pas besoin de décompresser les
> `.jsonl.zst` (lourds). Le premier book_id d'une band suffit ; on peut en choisir un autre si besoin d'un
> round « propre » à montrer. Si un mode n'a aucun book dans une band (rare, ex. galactic absent d'un petit
> mode), le signaler à l'user (mettre `0` ou demander) plutôt que d'inventer.
