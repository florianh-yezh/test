# Carnet Hotline

Application web de formation pour la hotline : fiches de dépannage, diagnostic guidé, quiz sur cas réels et veille.

Ouvrir `index.html` dans un navigateur (aucune installation). Tout le contenu est dans le bloc `<script>` du fichier :

- `TILES` : les thèmes de l'accueil et la liste des fiches de chacun (une fiche peut être dans plusieurs thèmes).
- `FICHES` : une fiche = phrase de l'utilisateur (`u`), = symptômes, cause, vérifications, résolution, commandes, fiches liées. `niv` : 1 hotline, 2 droits admin, 3 escalade.
- `TREES` : arbres de diagnostic. Une réponse pointe vers une autre question (`"m2"`) ou vers une fiche (`"=ol-profil"`).
- `QUIZ` : cas pratiques (`a` = index de la bonne réponse, `f` = fiche à réviser).
- `NEWS`, `SOURCES`, `ROUTINE` : onglet Veille. Mettre à jour `NEWS` régulièrement.

Pour ajouter une fiche, copier une fiche existante dans `FICHES.push(...)`, changer l'`id`, la catégorie (`cat`, voir `CATS`), puis ajouter l'`id` dans un thème de `TILES`.

Ne jamais mettre de mots de passe, noms de clients ou adresses IP réelles dans ce fichier.
