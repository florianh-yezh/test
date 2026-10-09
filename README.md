# Ar'Ty Mad — site du restaurant

Site vitrine statique (HTML / CSS / JS, sans dépendance) du restaurant Ar'Ty Mad, 40 Cours de Chazelles, 56100 Lorient.
Ouvrir `index.html` dans un navigateur.

- `index.html` — contenu (couverture, bienvenue, menus, couscous, repas de groupe, réservation, horaires, accès)
- `styles.css` — design aux couleurs du restaurant (rouge bordeaux, Kaushan Script + Alegreya Sans)
- `script.js` — réservation (bande de la couverture + formulaire), statut ouvert/fermé selon les horaires, dépliage des pages
- `images/` — logo, photos du restaurant (`galerie/`) et photos des clients issues des avis Google (`avis/`)
- `galerie.html`, `galerie.css`, `galerie.js` — page Galerie (filtres, visionneuse plein écran, glisser au doigt)
- `data/menus.json` — contenu des menus ; `menus-render.js` — leur affichage (partagé avec l'admin)
- `admin.html`, `admin.css`, `admin.js` — page de gestion de la carte ; `api/menus.php` + `api/config.php` — enregistrement sur l'hébergeur

Direction de design : « le menu plié » (voir `DESIGN.md`, `PRODUCT.md` et `.impeccable/`), réalisée avec les skills Impeccable et UI/UX Pro Max installés dans `.claude/skills/`.

## Avis et galerie

- **Livre d'or** (page principale, avant la réservation) : 6 avis Google réels, sans les noms, avec un lien vers tous les avis Google. Pour en ajouter ou en retirer : bloc `<!-- Livre d'or -->` dans `index.html`.
- **Galerie** (`galerie.html`) : 21 photos classées en « Les assiettes », « La salle » et « Vu par nos clients ». Les photos de clients proviennent de leurs avis Google ; leur affichage a été validé par le restaurant.

## Modifier la carte (page de gestion)

Les menus (Plaisir, Saveur, enfant et la mention en dessous) sont dans `data/menus.json`.
Le site les affiche avec la mise en page de la double page « Menus » : plus besoin de PDF.

1. Ouvrez `admin.html` sur le site en ligne (par exemple `https://votre-site.fr/admin.html`).
2. Modifiez noms, prix, rubriques et plats ; l'aperçu montre le rendu exact.
3. **Publier sur le site** : saisissez le mot de passe de gestion, la carte est enregistrée sur l'hébergeur et visible immédiatement.
   L'ancienne version est archivée dans `data/archives/` (30 dernières versions).

### Installation chez l'hébergeur (PHP 8.1 ou plus : OVH, o2switch, Hostinger, IONOS…)

1. Envoyez tous les fichiers du site (FTP ou gestionnaire de fichiers de l'hébergeur), dossiers `api/` et `data/` compris.
2. Ouvrez `admin.html`, onglet **Mot de passe** → « Créer ou changer le mot de passe » : tapez votre mot de passe deux fois, puis **Générer les lignes pour config.php**.
3. Collez ces trois lignes dans `api/config.php` (à la place de `salt`, `hash`, `iterations`) et renvoyez ce fichier. Le mot de passe n'y est jamais écrit, seulement son empreinte.
4. Le dossier `data/` doit être modifiable par PHP (c'est le cas par défaut chez la plupart des hébergeurs).

Sécurité : 5 mauvais mots de passe bloquent la publication 15 minutes pour cette adresse ; le serveur vérifie et nettoie la carte avant de l'enregistrer ; `config.php`, les archives et le compteur d'essais sont protégés par `.htaccess` (hébergements Apache).
`admin.html` n'est pas indexée (`noindex` + `robots.txt`). Pour la cacher davantage : renommez-la avec un nom difficile à deviner, et/ou protégez-la par mot de passe dans l'espace client de l'hébergeur.

## Référencement Google

`index.html` contient une fiche `schema.org/Restaurant` (adresse, téléphone, horaires, réservations) que Google peut afficher dans ses résultats et sur Maps. Le détail des menus (noms, prix, plats) y est ajouté automatiquement à partir de `data/menus.json`, donc il suit les modifications faites dans l'admin.

Une fois le nom de domaine connu, à ajouter : l'adresse du site (`url`) et une photo (`image`) dans cette fiche, `og:url` / `og:image` pour les partages, et un `sitemap.xml`. Pensez aussi à créer ou revendiquer la fiche **Google Business Profile** du restaurant (horaires, photos, avis), qui pèse le plus pour apparaître sur Maps.

## Réservation en ligne : activer / désactiver

Dans `admin.html`, onglet **Réglages**, l'interrupteur « Réservation en ligne » enregistre `data/reglages.json` (effet immédiat).
- **Désactivée** (réglage actuel) : la couverture et le dos du menu affichent « Réservez au 02.97.21.09.12 » ; la barre mobile propose Menus · Réserver (appel) · Itinéraire.
- **Activée** : la bande de réservation de la couverture et le formulaire complet réapparaissent.

## Brancher la réservation en ligne

Le formulaire `#booking` envoie ses données en `POST` vers l'adresse indiquée dans `data-endpoint` (compatible Formspree, Getform, Basin…).
Tant que `data-endpoint` est vide, le site n'affiche **aucune fausse confirmation** : il récapitule la demande et invite à appeler le restaurant.

À compléter : service de réservation, lien de la page Facebook, page Mentions légales, horaires du jeudi soir (couscous).
