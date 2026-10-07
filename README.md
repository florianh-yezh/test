# Ar'Ty Mad — site du restaurant

Site vitrine statique (HTML / CSS / JS, sans dépendance) du restaurant Ar'Ty Mad, 40 Cours de Chazelles, 56100 Lorient.
Ouvrir `index.html` dans un navigateur.

- `index.html` — contenu (bienvenue, menus, couscous, repas de groupe, horaires, contact)
- `styles.css` — design aux couleurs du restaurant (rouge bordeaux, Kaushan Script + Open Sans)
- `script.js` — interactions (préchargement, menu mobile, apparitions, statut ouvert/fermé selon les horaires)
- `images/` — photos du restaurant et logo

À compléter : fichier original du logo (`images/logo.svg` est une reproduction), lien de la page Facebook, page Mentions légales.

## Grossesse Marina

Appli de suivi de grossesse installable sur Android (PWA), dans `grossesse-marina/` : semaines d'aménorrhée, agenda avec suivi type français, prénoms, aliments à éviter, guides, valise maternité, journal, chrono de contractions, compteur de mouvements et assistante IA.

- Synchronisation entre deux téléphones avec Firebase (Auth Google + Firestore), mode hors ligne grâce au service worker.
- Assistante Gemini via un worker Cloudflare (`grossesse-marina/worker/`) qui garde la clé secrète et n'accepte que les comptes autorisés.
- Mise en route : voir [`grossesse-marina/INSTALLATION.md`](grossesse-marina/INSTALLATION.md).
