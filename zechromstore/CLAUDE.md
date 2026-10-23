# Stats TikTok — @zechromstore

Ce projet suit les performances des vidéos TikTok du compte **@zechromstore** et sert à décider quoi publier ensuite.

## À propos du compte (à compléter)

- Ce qu'on vend / montre : …
- Cible : …
- Objectif principal (vues, abonnés, ventes, trafic boutique) : …

## Source de vérité : le dépôt GitHub

Les stats sont saisies depuis le dashboard en ligne (GitHub Pages), qui enregistre directement dans `zechromstore/data/*.csv` sur GitHub. La copie locale peut donc être en retard.

Dépôt : `https://github.com/florianh-yezh/test`, branche **`ccr-276ffb08-7divet`**, dossier **`zechromstore/`**. Cette branche contient aussi Grossesse Marina (`grossesse-marina/` et les fichiers à la racine) : ne jamais y toucher, ne modifier que `zechromstore/`. Les autres branches (`site-artymad`, `ccr-…`, l'ancienne `zechromstore-stats`) sont d'autres projets ou une ancienne copie.

- **Au début de chaque session et avant toute analyse**, récupérer les dernières stats :
  - si le dossier est un clone git : `git pull` (la branche locale suit `origin/ccr-276ffb08-7divet`) ;
  - sinon (ou si git n'est pas installé) : lire directement `https://raw.githubusercontent.com/florianh-yezh/test/ccr-276ffb08-7divet/zechromstore/data/videos.csv` et `.../data/releves.csv`.
- Si la récupération échoue (pas de connexion, conflit, dépôt privé sans accès), le dire à l'utilisateur avant d'analyser des données qui ne sont peut-être pas à jour.
- Après une modification des CSV par Claude, faire un commit puis un `git push` (après accord de l'utilisateur), pour que le dashboard voie les changements. Sans git, conseiller plutôt la saisie via le dashboard.

## Les données

- `zechromstore/data/videos.csv` : une ligne par vidéo.
  - `id` : identifiant court et unique (ex. `v001`).
  - `date_publication` au format `AAAA-MM-JJ`, `heure_publication` au format `HH:MM` (heure de Paris).
  - `duree_s` : durée de la vidéo en secondes.
  - `format` : type de vidéo, toujours écrit pareil (ex. `unboxing`, `face-cam`, `tuto`, `avant-apres`, `storytime`, `trend`, `pov`).
  - `accroche` : la phrase ou l'image des 2 premières secondes.
  - `sujet`, `son`, `hashtags` (séparés par des espaces), `notes`.
- `zechromstore/data/releves.csv` : une ligne par relevé de stats. Une même vidéo a plusieurs relevés dans le temps.
  - `video_id` renvoie à `videos.csv`.
  - `date_releve` / `heure_releve` : moment où les stats ont été lues.
  - `vues`, `likes`, `commentaires`, `partages`, `enregistrements`, `nouveaux_abonnes` : nombres bruts.
  - `temps_moyen_s` : durée moyenne de visionnage (secondes).
  - `pct_vue_complete` : % de vues jusqu'à la fin (nombre sans le signe %).
  - `pct_for_you` : % du trafic venant de la page Pour toi.

## Ajouter des stats

Quand l'utilisateur donne des stats en vrac (texte, capture d'écran de TikTok Analytics) :

1. Si la vidéo n'existe pas encore dans `videos.csv`, l'ajouter avec un nouvel `id` (suite logique : `v001`, `v002`…). Demander le format et l'accroche s'ils manquent.
2. Ajouter une ligne dans `releves.csv`. Si l'heure du relevé n'est pas précisée, prendre la date et l'heure actuelles et le signaler.
3. Ne jamais modifier ni supprimer un relevé existant sans demande explicite.
4. Garder les valeurs du champ `format` cohérentes avec celles déjà utilisées.

## Règle principale : lire les stats AVANT de proposer

Avant toute proposition d'idée, de format, de script, d'accroche ou d'heure de publication :

1. Lire `zechromstore/data/videos.csv` et `zechromstore/data/releves.csv`.
2. Pour chaque vidéo, prendre le relevé le plus récent et calculer :
   - l'âge de la vidéo au relevé (heures depuis la publication) ;
   - le taux d'engagement = (likes + commentaires + partages + enregistrements) / vues ;
   - le taux de partage = partages / vues et le taux d'enregistrement = enregistrements / vues ;
   - la rétention = temps_moyen_s / duree_s ;
   - les abonnés gagnés pour 1 000 vues.
3. Comparer les vidéos **à âge comparable** (ex. vues à ~24 h) quand c'est possible, pas une vidéo d'un mois contre une vidéo d'hier.
4. Regrouper par `format`, par tranche de durée, par heure et jour de publication, par type d'accroche. Repérer ce qui sort clairement au-dessus de la médiane du compte.
5. Ensuite seulement, faire les propositions, en citant les chiffres qui les justifient (ex. « les unboxings font 2,3× la médiane de vues à 24 h et 9 % de rétention en plus »).

Être honnête sur la fiabilité : avec moins de ~10 vidéos ou seulement 1 à 2 vidéos par format, dire que ce sont des tendances, pas des certitudes, et proposer des tests (ex. même sujet en deux formats différents).

## Format des propositions

Pour chaque idée :
- **Format** et durée visée
- **Accroche** des 2 premières secondes
- **Déroulé** en quelques étapes
- **Heure de publication** conseillée
- **Pourquoi** : les chiffres du compte qui soutiennent l'idée
- **Ce qu'on teste** : l'hypothèse que cette vidéo permet de vérifier
