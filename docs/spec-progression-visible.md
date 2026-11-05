# Boussole v2 — Spec « Progression visible » (phase 1 : Mesurer)

Date : 2026-10-07 · Statut : à relire par Antonin · Source d'inspiration : vidéo La Cervelle « Comment rendre tes révisions PLUS addictives que TikTok » (le plaisir vient de la sensation de progresser, pas de gadgets).

## 1. Intention
**But :** que revenir sur Boussole soit plus gratifiant que scroller, parce qu'on *voit* ses progrès en chiffres chaque jour (remplace la perception subjective / le biais de négativité par des données).
**Réussite phase 1 :** (a) un point de départ T0 objectif par matière et chapitre, (b) le temps et les résultats de chaque jour enregistrés, (c) un bilan du soir de 2 min qui compare aujourd'hui à hier et à T0.
**Hors périmètre phase 1 :** objectifs en cascade, missions, examen blanc, rival, récompenses, carnet du scroll (phases 2 et 3).
**Contraintes :** Boussole actuelle = artifact HTML unique (7 onglets : now, fil, flash, review, labs, tutor, evals) avec base `db` ; ne rien casser des données existantes ; pas de nouvel onglet (la barre mobile est pleine) ; non-négociables respectés (pas de travail cours mardi soir, samedi après-midi/soir perso, dormir avant minuit).

## 2. Fonctionnalités
### 2.1 Test d'entrée (T0)
- Lancé depuis l'onglet Flash, une matière à la fois. Échantillon de 6 cartes par chapitre tirées de la banque `flash` existante (mix cours + exercices), sans indice.
- Les résultats **ne modifient pas** Leitner ni `concepts` : photo figée de départ. Re-mesure possible plus tard (on garde l'historique T0, T1…).
- Chapitres avec moins de 6 cartes : on prend ce qui existe, marqué « échantillon réduit ».
- Cadrage affiché avant : « Les premières notes seront basses, c'est prévu. Ce chiffre est ton point de départ, pas un verdict. »
- Coût estimé : 15 chapitres × 6 cartes ≈ 90 cartes, environ 15 à 20 min au total.

### 2.2 Journal de séances (temps et résultats)
- Chaque drill (Flash, Réviser) enregistre : cartes vues, justes, minutes actives (temps entre affichage et réponse, plafonné à 60 s par carte), matière.
- Stocké dans un nouveau doc `stats/main`, sans toucher `flashprog.days` (compatibilité).

### 2.3 Bilan du soir
- Carte sur « Maintenant » (visible dès 19h, accessible à tout moment via un bouton). Contenu : cartes, % juste et minutes aujourd'hui vs hier ; par matière vs T0 ; micro-victoires détectées automatiquement (chapitre ≥ 80 % pour la première fois, série prolongée, erreur corrigée, gain vs T0) ; ce qui a coincé (3 cartes ou notions les plus ratées) ; 3 pistes pour demain (tirées de la liste « dû » existante) ; une ligne de note libre optionnelle.
- Mardi soir et samedi après-midi/soir : version lecture seule (chiffres, aucune tâche).
- Rappel push optionnel à 21h15 (heure de Québec) via tâche planifiée, sauf mardi et samedi.

### 2.4 Courbe T0 → aujourd'hui
- La carte « Ta courbe » de Maintenant devient : barres par matière (T0 vs maintenant) + pente sur 14 jours.

## 3. Données (ajouts uniquement)
| Doc | Contenu |
|---|---|
| `baseline/{COURSE}-{ch}` | `{runs:[{d, p, n, ok, mins, cardIds[]}]}`, runs[0] = T0 |
| `stats/main` | `{days:{YYYY-MM-DD:{cards, ok, mins, byCourse:{C:{n,ok,mins}}}}}` |
| `bilans/{YYYY-MM-DD}` | `{cards, ok, mins, wins[], stuck[], tomorrow[], note}` |
Aucun champ existant n'est modifié ou supprimé.

## 4. Risques et parades
- **Casser l'app en production :** copie de sauvegarde du HTML actuel conservée ; on republie sur la même URL (les données restent) ; logique de calcul testée hors ligne avant publication ; export JSON de sécurité avant la mise en ligne.
- **T0 démoralisant :** cadrage explicite + affichage de la progression relative (pente), pas de note globale.
- **Mesure du temps imprécise :** plafond de 60 s par carte, présentée comme « temps actif », pas comme temps total d'étude.
- **Limite de test :** la base `db` ne fonctionne que dans claude.ai ; je ne peux pas rejouer toute l'app ici, d'où tests unitaires sur la logique et vérification pas à pas par toi après publication.

## 5. Phases suivantes (aperçu)
- **Phase 2 — Viser :** note visée par éval, % requis par chapitre et par semaine, objectif du jour calculé, 3 missions quotidiennes.
- **Phase 3 — Tenir :** examen blanc hebdo chronométré, rival fantôme, récompenses réelles, carnet du scroll (automatisation Raccourcis).

## 6. Décisions validées par Antonin (2026-10-07)
1. Échantillon T0 : **6 cartes par chapitre**.
2. Rappel push du bilan : **20h30** (heure de Québec). Pas de rappel le mardi (cours IFT-7022 jusqu'à 21h20) ni le samedi (zone perso).
3. Les résultats T0 **ne touchent pas Leitner** ni `concepts`.
