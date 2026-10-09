---
name: Ar'Ty Mad
description: Le menu plié — la carte du restaurant qu'on déplie à table, en rouge bordeaux et écriture manuscrite.
colors:
  bordeaux: "#8b0000"
  bordeaux-deep: "#640006"
  bordeaux-night: "#45000a"
  vermillon: "#b8121b"
  nappe: "#f5f1f0"
  line: "#e6dcda"
  paper: "#fffaf8"
  paper-edge: "#f4e7e3"
  ink: "#3a2422"
  ink-soft: "#6a4f4b"
  on-red: "#fff3f1"
  on-red-soft: "#f2c9c4"
  white: "#ffffff"
  field-border: "#d9c3be"
  muted-dot: "#b9aaa7"
  success: "#2f8a4c"
  success-bg: "#f1faf3"
typography:
  display:
    fontFamily: "Kaushan Script, cursive"
    fontSize: "clamp(4rem, 13vw, 9rem)"
    fontWeight: 400
    lineHeight: 0.95
  title:
    fontFamily: "Kaushan Script, cursive"
    fontSize: "clamp(2.4rem, 4.6vw, 3.6rem)"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "Alegreya Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  lead:
    fontFamily: "Alegreya Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 400
    lineHeight: 1.6
  menu-title:
    fontFamily: "Kaushan Script, cursive"
    fontSize: "clamp(2.6rem, 4.4vw, 3.4rem)"
    fontWeight: 400
  menu-price:
    fontFamily: "Kaushan Script, cursive"
    fontSize: "1.9rem"
    fontWeight: 400
  menu-section:
    fontFamily: "Alegreya Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 700
    letterSpacing: "0.24em"
  menu-footer:
    fontFamily: "Kaushan Script, cursive"
    fontSize: "1.45rem"
    fontWeight: 400
  ui:
    fontFamily: "Alegreya Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
  ui-small:
    fontFamily: "Alegreya Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 400
  admin-title:
    fontFamily: "Kaushan Script, cursive"
    fontSize: "2rem"
    fontWeight: 400
  label:
    fontFamily: "Alegreya Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  sheet: "4px"
  control: "4px"
  panel: "6px"
  pill: "999px"
spacing:
  gutter: "clamp(1rem, 4vw, 3rem)"
  page: "clamp(1.5rem, 4.5vw, 4rem)"
  section: "clamp(3rem, 8vw, 6rem)"
components:
  button-primary:
    backgroundColor: "{colors.bordeaux}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "0.8rem 1.6rem"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.vermillon}"
  button-ink:
    backgroundColor: "{colors.bordeaux-night}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
  input:
    backgroundColor: "#ffffff"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
  page-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "{spacing.page}"
---

# Design System: Ar'Ty Mad

## Overview

Le site est **la carte du restaurant qu'on déplie** : une couverture blanche à l'encre rouge, des doubles pages posées sur la nappe blanche du restaurant, un encart de saison, et le dos de la carte pour réserver. Le rouge bordeaux n'apparaît en grand qu'à l'ouverture (écran du logo) ; ensuite il reste l'encre de la carte.

Contraintes de marque imposées par le restaurant : rouge bordeaux, logo, titres en écriture manuscrite. L'action principale (réserver) est utilisable dès la couverture.

## Colors

Stratégie **retenue** (révisée à la demande du client, « trop de rouge ») : nappe et papier dominent, le bordeaux est un accent d'environ 10 % : logo, nom, titres, prix, boutons, en-tête du tableau des horaires. Seul l'écran d'ouverture est entièrement rouge.

- **bordeaux** `#8b0000` : couverture, dos, boutons principaux, titres sur papier.
- **nappe** `#f5f1f0` : fond de page sous les feuillets et au dos.
- **line** `#e6dcda` : filets, bordures, séparations.
- **bordeaux-deep** / **bordeaux-night** : réserves sombres, plus utilisées en surface.
- **vermillon** `#b8121b` : intertitres de menus, « ou » entre les plats, erreurs, anneau de focus.
- **paper** `#fffaf8` / **paper-edge** `#f4e7e3` : feuillets et pages photo. Jamais de crème jaune.
- **ink** `#3a2422` / **ink-soft** `#6a4f4b` : texte sur papier.
- **on-red** `#fff3f1` / **on-red-soft** `#f2c9c4` : texte sur bordeaux (teinté de rouge, jamais gris).

## Typography

- **Kaushan Script** : nom du restaurant, titres de section, prix, légendes de photos, « ou ». Jamais pour un paragraphe.
- **Alegreya Sans** : tout le texte courant, formulaires, horaires (chiffres tabulaires).
- Intertitres de menus (« Entrées », « Plats ») : Alegreya Sans gras, capitales espacées, vermillon. Ce sont des titres de liste, pas des étiquettes au-dessus d'un titre.

## Layout

- Couverture plein écran : sommaire en haut, marque au centre, tampon du jour en haut à droite, bande de réservation en bas, adresse et téléphone en pied.
- Doubles pages de 1180px max., deux colonnes égales sur un pli ; passent en une colonne sous 900px.
- Le dos : formulaire (feuillet) à gauche, horaires et accès sur le bordeaux à droite ; une colonne sous 900px.
- Sous 640px : barre fixe en bas (Appeler · Réserver · Itinéraire), le sommaire disparaît, `scroll-padding-bottom` évite que la barre couvre les champs.

## Elevation & Depth

Une seule logique : du papier posé sur une nappe blanche. Ombres neutres très douces (`0 24px 50px -32px rgba(58,36,34,.4)` + filet de 1px pour les feuillets), ombre de pli en dégradé bordeaux transparent au centre des doubles pages. Les tirages photo et l'encart enfant sont légèrement inclinés (−2° à 1,5°).

## Shapes

Coins droits presque nets (4px) partout ; pastille arrondie uniquement pour le badge « aujourd'hui » ; cercle pour le tampon d'ouverture. Double filet clair à l'intérieur de la couverture, comme une carte imprimée.

## Components

- **Bande de réservation** (couverture) : Jour (14 prochains jours ouverts), Service, Couverts, bouton « Réserver » qui pré-remplit le formulaire du dos.
- **Formulaire de réservation** : labels visibles, aide sous le champ, erreurs au départ du champ et effacées dès la correction, récapitulatif d'erreurs focalisable. Midi/Soir en contrôle segmenté ; le soir n'est actif que vendredi et samedi. Aucun faux message de confirmation tant qu'aucun service n'est branché (`data-endpoint`).
- **Tampon du jour** : « Ouvert jusqu'à… », « Aujourd'hui, ouverture à… » ou « Fermé, réouverture… », calculé sur les vrais horaires.
- **Menu** (« la carte classique ») : tout centré dans un liseré intérieur ; nom en manuscrit, prix dans un **sceau rouge** (rond, s'allonge en ovale pour un prix long comme « 15€90 »), petite vague d'ornement ; rubriques en capitales espacées entre deux filets ; plats centrés séparés par « ou » manuscrit ; phrase dessert en pied.
- **Filigrane** : logo + « Ar'Ty Mad » en grand derrière les plats, incliné de −14°, opacité 5,5 %, décoratif (`aria-hidden`), dimensionné sur la largeur de la page (unités `cqi`).
- **Encart** (menu enfant) : fiche blanche inclinée qui chevauche le bas de la double page.
- **Écran d'ouverture** : fond bordeaux, logo puis nom qui montent, rideau qui se lève (~1,5 s, ignoré en mouvement réduit) ; le tampon du jour apparaît ensuite.
- **Page de gestion** (`admin.html`, non indexée) : onglets en pastilles, panneaux blancs (rayon `panel`), champs à bordure `field-border`, statut « Modifications non publiées » en vermillon, « Publié » en vert `success`. L'aperçu réutilise exactement le rendu du site (`menus-render.js`).
- **Dépliage** : chaque double page s'ouvre sur son pli en entrant à l'écran ; contenu lisible dès l'état initial, désactivé en mouvement réduit.

## Do's and Don'ts

- Do : laisser la nappe et le papier dominer ; le bordeaux reste l'encre (environ 10 %).
- Don't : grands aplats rouges hors de l'écran d'ouverture.
- Do : ne montrer que du vrai (plats, prix, photos, histoire).
- Do : icônes SVG au trait de la planche `<symbol>` de la page.
- Don't : étiquette ou « sur-titre » au-dessus d'un titre.
- Don't : avis, notes ou chiffres inventés ; chiffres « héros » (grand nombre + petite légende).
- Don't : emoji ou caractères Unicode comme icônes.
- Don't : ombres colorées en halo.
