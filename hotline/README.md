# Carnet Hotline

Application web de formation pour la hotline : fiches de dépannage, diagnostic guidé, quiz sur cas réels et veille.

Ouvrir `index.html` dans un navigateur (aucune installation). Tout le contenu est dans le bloc `<script>` du fichier :

- `FICHES` : une fiche = symptômes, cause, vérifications, résolution, commandes, fiches liées. `niv` : 1 hotline, 2 droits admin, 3 escalade.
- `TREES` : arbres de diagnostic. Une réponse pointe vers une autre question (`"m2"`) ou vers une fiche (`"=ol-profil"`).
- `QUIZ` : cas pratiques (`a` = index de la bonne réponse, `f` = fiche à réviser).
- `NEWS`, `SOURCES`, `ROUTINE` : onglet Veille. Mettre à jour `NEWS` régulièrement.

Pour ajouter une fiche, copier une fiche existante, changer l'`id` et la catégorie (`cat`, voir `CATS`).

Ne jamais mettre de mots de passe, noms de clients ou adresses IP réelles dans ce fichier.
