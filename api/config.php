<?php
// Ar'Ty Mad — réglages de la page de gestion de la carte.
//
// Pour créer ou changer le mot de passe :
//   1. ouvrez admin.html, onglet « Mot de passe », partie « Créer un mot de passe » ;
//   2. copiez les trois lignes générées et remplacez celles ci-dessous ;
//   3. renvoyez ce fichier sur l'hébergeur (dossier api/).
// Le mot de passe lui-même n'est jamais écrit ici, seulement son empreinte.
// Tant que 'hash' est vide, personne ne peut publier.

return [
    'salt'       => '',
    'hash'       => '',
    'iterations' => 150000,
];
