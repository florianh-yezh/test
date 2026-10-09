# Ar'Ty Mad — site du restaurant

Site vitrine statique (HTML / CSS / JS, sans dépendance) du restaurant Ar'Ty Mad, 40 Cours de Chazelles, 56100 Lorient.
Ouvrir `index.html` dans un navigateur.

- `index.html` — contenu (couverture, bienvenue, menus, couscous, repas de groupe, réservation, horaires, accès)
- `styles.css` — design aux couleurs du restaurant (rouge bordeaux, Kaushan Script + Alegreya Sans)
- `script.js` — réservation (bande de la couverture + formulaire), statut ouvert/fermé selon les horaires, dépliage des pages
- `images/` — photos du restaurant et logo
- `data/menus.json` — contenu des menus ; `menus-render.js` — leur affichage (partagé avec l'admin)
- `admin.html`, `admin.css`, `admin.js` — page de gestion de la carte

Direction de design : « le menu plié » (voir `DESIGN.md`, `PRODUCT.md` et `.impeccable/`), réalisée avec les skills Impeccable et UI/UX Pro Max installés dans `.claude/skills/`.

## Modifier la carte (page de gestion)

Les menus (Plaisir, Saveur, enfant et la mention en dessous) sont dans `data/menus.json`.
Le site les affiche avec la mise en page de la double page « Menus » : plus besoin de PDF.

1. Ouvrez `admin.html` sur le site publié (par exemple `https://…/admin.html`).
2. Modifiez noms, prix, rubriques et plats ; l'aperçu montre le rendu exact.
3. **Publier sur le site** enregistre `data/menus.json` dans GitHub (branche `site-artymad`) ; le site est à jour en une à deux minutes.

La première fois, l'onglet « Connexion GitHub » demande une clé d'accès *fine-grained* limitée à ce dépôt, permission **Contents : Read and write**. Elle reste sur l'appareil (stockage local du navigateur). Sans cette clé, la page de gestion ne peut rien modifier.

`admin.html` n'est pas indexée (`noindex` + `robots.txt`). Pour la cacher davantage : renommez le fichier avec un nom difficile à deviner, et/ou protégez-la par mot de passe chez l'hébergeur.

## Brancher la réservation en ligne

Le formulaire `#booking` envoie ses données en `POST` vers l'adresse indiquée dans `data-endpoint` (compatible Formspree, Getform, Basin…).
Tant que `data-endpoint` est vide, le site n'affiche **aucune fausse confirmation** : il récapitule la demande et invite à appeler le restaurant.

À compléter : fichier original du logo (`images/logo.svg` est une reproduction), service de réservation, lien de la page Facebook, page Mentions légales, horaires du jeudi soir (couscous).
