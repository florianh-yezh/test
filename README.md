# Ar'Ty Mad — site du restaurant

Site vitrine statique (HTML / CSS / JS, sans dépendance) du restaurant Ar'Ty Mad, 40 Cours de Chazelles, 56100 Lorient.
Ouvrir `index.html` dans un navigateur.

- `index.html` — contenu (couverture, bienvenue, menus, couscous, repas de groupe, réservation, horaires, accès)
- `styles.css` — design aux couleurs du restaurant (rouge bordeaux, Kaushan Script + Alegreya Sans)
- `script.js` — réservation (bande de la couverture + formulaire), statut ouvert/fermé selon les horaires, dépliage des pages
- `images/` — photos du restaurant et logo

Direction de design : « le menu plié » (voir `DESIGN.md`, `PRODUCT.md` et `.impeccable/`), réalisée avec les skills Impeccable et UI/UX Pro Max installés dans `.claude/skills/`.

## Brancher la réservation en ligne

Le formulaire `#booking` envoie ses données en `POST` vers l'adresse indiquée dans `data-endpoint` (compatible Formspree, Getform, Basin…).
Tant que `data-endpoint` est vide, le site n'affiche **aucune fausse confirmation** : il récapitule la demande et invite à appeler le restaurant.

À compléter : fichier original du logo (`images/logo.svg` est une reproduction), service de réservation, lien de la page Facebook, page Mentions légales, horaires du jeudi soir (couscous).
