// Données de référence (contenus français) de l'appli Grossesse Marina.
const WEEKS = [
 [4,"🌱","une graine de pavot",0.1,0,"L'œuf s'implante dans la paroi de l'utérus.","Retard de règles : le test devient positif."],
 [5,"🌾","une graine de sésame",0.2,0,"Le cœur primitif commence à battre.","Fatigue, seins tendus, envies d'uriner plus fréquentes."],
 [6,"🫘","une lentille",0.4,0,"Ébauches des bras, des jambes et du tube neural.","Nausées possibles : fractionne les repas."],
 [7,"🫐","une myrtille",1,0,"Le cerveau se développe à toute vitesse.","Prends rendez-vous pour la première consultation."],
 [8,"🍇","un grain de raisin",1.6,1,"Les doigts commencent à se dessiner.","L'utérus a la taille d'une orange."],
 [9,"🍒","une cerise",2.3,2,"Les paupières se forment, les muscles bougent déjà.","Pense à la prise de sang du 1er trimestre."],
 [10,"🍓","une fraise",3.1,4,"L'embryon devient fœtus : tous ses organes sont en place.","Les nausées sont souvent au plus fort."],
 [11,"🌰","une châtaigne",4.1,7,"Les ongles apparaissent, il bouge sans que tu le sentes.","Écho du 1er trimestre à caler entre 11 et 13 SA + 6 j."],
 [12,"🍋","un citron",5.4,14,"Les réflexes arrivent : il ouvre et ferme les mains.","Écho de datation : tu vas le voir gigoter."],
 [13,"🥝","un kiwi",7.4,23,"Les cordes vocales se forment.","Fin du 1er trimestre en vue, l'énergie revient souvent."],
 [14,"🍑","une pêche",8.7,43,"Il fait des grimaces et peut sucer son pouce.","Déclare ta grossesse avant 15 SA (CPAM et CAF)."],
 [15,"🍎","une pomme",10.1,70,"Ses os durcissent, sa peau est encore translucide.","Bienvenue dans le 2e trimestre."],
 [16,"🥑","un avocat",11.6,100,"Il entend les bruits de ton corps : cœur, digestion, voix.","Consultation du 4e mois et entretien prénatal précoce."],
 [17,"🍐","une poire",13,140,"Une première couche de graisse se forme sous la peau.","Le ventre s'arrondit visiblement."],
 [18,"🫑","un poivron",14.2,190,"Ses empreintes digitales se dessinent.","Premières « bulles » possibles (souvent entre 18 et 22 SA)."],
 [19,"🥭","une mangue",15.3,240,"Un enduit protecteur, le vernix, recouvre sa peau.","Les ligaments de l'utérus peuvent tirailler."],
 [20,"🍌","une banane",25.6,300,"Mi-parcours ! Il avale du liquide amniotique.","Tu sens probablement ses mouvements."],
 [21,"🥕","une carotte",26.7,360,"Ses sourcils et ses cils poussent.","Jambes lourdes : surélève les pieds le soir."],
 [22,"🥒","une courgette",27.8,430,"Il réagit aux sons et à la lumière.","Écho morphologique : on peut connaître le sexe."],
 [23,"🍊","un pamplemousse",28.9,500,"Ses poumons se préparent à respirer.","Hydrate la peau du ventre matin et soir."],
 [24,"🌽","un épi de maïs",30,600,"Il alterne phases d'éveil et de sommeil.","Dépistage du diabète gestationnel possible (24–28 SA)."],
 [25,"🍠","une patate douce",34.6,660,"Ses cheveux poussent et prennent de la couleur.","Brûlures d'estomac : petits repas, pas de couché juste après."],
 [26,"🥬","une laitue",35.6,760,"Ses yeux commencent à s'ouvrir.","6e mois : prise en charge à 100 % par l'Assurance Maladie."],
 [27,"🥦","un chou-fleur",36.6,875,"Il a le hoquet : tu le sens par petites secousses.","Dernière semaine du 2e trimestre."],
 [28,"🍆","une aubergine",37.6,1000,"Il rêve peut-être déjà (sommeil paradoxal).","3e trimestre. Injection anti-D si tu es Rhésus négatif."],
 [29,"🥥","une noix de coco",38.6,1150,"Ses muscles et ses poumons mûrissent.","Dors plutôt sur le côté gauche."],
 [30,"🥬","un chou vert",39.9,1320,"Il prend environ 200 g par semaine.","Prépare la liste de naissance et la valise."],
 [31,"🍍","un ananas",41.1,1500,"Ses cinq sens fonctionnent.","Souffle court : l'utérus appuie sur le diaphragme."],
 [32,"🍈","un melon charentais",42.4,1700,"Il se place souvent tête en bas.","Écho du 3e trimestre (30–32 SA)."],
 [33,"🎃","un potimarron",43.7,1900,"Son immunité se renforce grâce à tes anticorps.","Consultation d'anesthésie au 8e mois."],
 [34,"🍈","un melon miel",45,2150,"Ses ongles atteignent le bout des doigts.","Le congé maternité approche (6 semaines avant le terme)."],
 [35,"🥬","une laitue romaine",46.2,2380,"Il a moins de place mais bouge toujours régulièrement.","Prélèvement vaginal (streptocoque B) entre 34 et 38 SA."],
 [36,"🍉","une mini-pastèque",47.4,2600,"Ses poumons sont presque prêts.","Valise bouclée, papiers et trajet repérés."],
 [37,"🥬","une blette",48.6,2860,"Il est considéré comme né à terme dès maintenant.","Contractions d'entraînement plus fréquentes."],
 [38,"🥬","un poireau",49.8,3080,"Il fait ses réserves de graisse.","Repos : chaque jour peut être le grand jour."],
 [39,"🍉","une pastèque",50.7,3290,"Le duvet qui couvrait sa peau tombe.","Surveille la perte des eaux et le rythme des contractions."],
 [40,"🎃","une citrouille",51.2,3460,"Il est prêt à te rencontrer.","Consultations rapprochées à la maternité."],
 [41,"🍉","une grosse pastèque",51.7,3600,"Terme théorique en France : 41 SA.","Surveillance tous les 2 jours ; le déclenchement sera discuté."]
];

const RDV_PLAN = [
 [8,"1re consultation prénatale","consult","Confirmation, prise de sang (groupe, toxo, rubéole…)"],
 [12,"Échographie du 1er trimestre","echo","Datation et clarté nucale (11 à 13 SA + 6 j)"],
 [12,"Prise de sang : dépistage trisomie 21","labo","Marqueurs sériques, le même jour ou juste après l'écho"],
 [14,"Déclarer la grossesse","admin","Avant 15 SA, en ligne via le médecin ou la sage-femme"],
 [16,"Consultation du 4e mois","consult","Avec l'entretien prénatal précoce"],
 [20,"Consultation du 5e mois","consult",""],
 [22,"Échographie morphologique","echo","2e trimestre, 20 à 22 SA"],
 [24,"Consultation du 6e mois","consult",""],
 [26,"Dépistage du diabète gestationnel","labo","Seulement si prescrit (24 à 28 SA)"],
 [28,"Consultation du 7e mois","consult","Injection anti-D si Rhésus négatif"],
 [28,"Préparation à la naissance","prepa","7 séances prises en charge"],
 [32,"Échographie du 3e trimestre","echo","30 à 32 SA"],
 [32,"Consultation du 8e mois","consult",""],
 [33,"Consultation d'anesthésie","consult","Obligatoire, même sans péridurale prévue"],
 [35,"Prélèvement vaginal (streptocoque B)","labo","Entre 34 et 38 SA"],
 [36,"Consultation du 9e mois","consult","À la maternité"],
 [41,"Terme : rendez-vous à la maternité","consult","Surveillance de dépassement"]
];
const TYPES = {consult:"Consultation",echo:"Échographie",labo:"Analyse",admin:"Démarche",prepa:"Préparation",autre:"Autre"};

const FOOD = [
 ["non","Fromages au lait cru","Camembert, brie, reblochon, roquefort, mont-d'or… au lait cru.","Listériose","Choisis-les au lait pasteurisé."],
 ["non","Croûte des fromages","Même pasteurisés, la croûte concentre les bactéries.","Listériose","Retire toujours la croûte."],
 ["non","Fromage râpé en sachet","Manipulé après fabrication.","Listériose","Râpe toi-même un comté ou un parmesan."],
 ["non","Lait cru","Lait de ferme non pasteurisé.","Listériose, toxoplasmose","Lait UHT ou pasteurisé : aucun problème."],
 ["non","Charcuterie crue ou séchée","Jambon cru, saucisson, chorizo, viande des Grisons, bresaola.","Toxoplasmose, listériose","OK si cuite dans un plat chaud (pizza, quiche)."],
 ["non","Rillettes, pâtés, foie gras","Ainsi que les produits en gelée.","Listériose",""],
 ["non","Viande crue ou saignante","Tartare, carpaccio, steak bleu ou saignant.","Toxoplasmose","Cuisson à cœur : plus de rose au centre."],
 ["non","Poisson cru","Sushi, sashimi, tartare, ceviche, gravlax.","Listériose, parasites","Les makis cuits ou végétariens restent possibles."],
 ["non","Poisson fumé","Saumon, truite, haddock fumés.","Listériose","OK s'il est recuit dans un plat chaud."],
 ["non","Coquillages crus","Huîtres, palourdes, moules crues.","Listériose, virus","Bien cuits, ils sont autorisés."],
 ["non","Surimi, tarama","Produits de la mer transformés et réfrigérés.","Listériose",""],
 ["non","Œufs crus ou peu cuits","Mayonnaise maison, mousse au chocolat, tiramisu, œuf coque.","Salmonellose","Œufs durs, omelette bien cuite ou produits industriels pasteurisés."],
 ["non","Graines germées crues","Soja, alfalfa, radis germés.","Bactéries","Cuites, elles ne posent pas de problème."],
 ["non","Alcool","Vin, bière, cidre, champagne, cocktails.","Toxique pour le bébé","Zéro alcool : aucune dose n'est sans risque."],
 ["non","Espadon, marlin, requin, siki, lamproie","Gros poissons prédateurs.","Mercure","À éviter totalement."],
 ["non","Foie et produits au foie","Foie de veau, de volaille, pâté de foie.","Excès de vitamine A",""],
 ["att","Café, thé, cola","Sources de caféine.","Caféine","Pas plus de 2 à 3 tasses par jour. Boissons énergisantes à éviter."],
 ["att","Thon, lotte, bar, dorade, raie, brochet","Poissons qui accumulent le mercure.","Mercure","Pas plus de 150 g par semaine."],
 ["att","Soja et produits au soja","Tofu, boissons et desserts au soja.","Phyto-œstrogènes","Pas plus d'un produit par jour."],
 ["att","Réglisse","Bonbons, boissons, tisanes à la réglisse.","Tension artérielle","Avec modération."],
 ["att","Tisanes et huiles essentielles","Certaines plantes sont déconseillées pendant la grossesse.","Plantes actives","Demande à ta sage-femme ou au pharmacien."],
 ["att","Fruits, légumes et herbes crus","Surtout la terre qui peut y rester.","Toxoplasmose (si non immunisée)","Lave-les soigneusement, épluche-les."],
 ["att","Restauration rapide et plats crus du traiteur","Salades composées, sandwichs préparés à l'avance.","Listériose","Préfère le fait-maison ou les plats servis chauds."],
 ["ok","Fromages à pâte pressée cuite","Comté, emmental, beaufort, gruyère, parmesan.","Calcium","Sans la croûte."],
 ["ok","Laitages pasteurisés","Yaourts, fromage blanc, lait UHT, fromages pasteurisés.","Calcium","3 produits laitiers par jour."],
 ["ok","Viande et volaille bien cuites","Bœuf, porc, poulet, cuits à cœur.","Fer, protéines",""],
 ["ok","Petits poissons gras cuits","Sardine, maquereau, hareng, saumon cuit.","Oméga-3","Du poisson 2 fois par semaine, dont un gras."],
 ["ok","Œufs bien cuits","Durs, omelette, au plat bien cuit.","Protéines, choline",""],
 ["ok","Légumineuses","Lentilles, pois chiches, haricots secs.","Fer, fibres, folates",""],
 ["ok","Légumes verts","Épinards, brocoli, haricots verts, bien lavés.","Vitamine B9 (folates)",""],
 ["ok","Fruits frais lavés","Lavés ou épluchés.","Vitamines, fibres",""],
 ["ok","Féculents complets","Pain complet, riz, pâtes, quinoa.","Énergie, fibres",""],
 ["ok","Eau","Environ 1,5 L par jour, plus s'il fait chaud.","Hydratation",""]
];

const GUIDES = [
 {alert:true,t:"Quand appeler la maternité sans attendre",b:`<p>Appelle la maternité (ou le 15 la nuit, le 112 depuis un portable) si :</p><ul>
  <li>tu as des saignements, même légers ;</li><li>tu perds du liquide (perte des eaux) ;</li>
  <li>tu as des contractions régulières avant 37 SA ;</li><li>tu sens moins ou plus du tout bouger le bébé ;</li>
  <li>tu as plus de 38 °C de fièvre ;</li><li>tu as de violents maux de tête, des troubles de la vue, ou le visage et les mains qui gonflent d'un coup ;</li>
  <li>tu as une douleur au ventre forte et continue ;</li><li>tes paumes et plantes de pieds te démangent fortement.</li></ul>
  <p class="muted">Dans le doute, appelle : les équipes préfèrent te voir pour rien.</p>`},
 {t:"Le travail a commencé ?",b:`<ul><li><b>Contractions</b> : régulières, de plus en plus fortes et rapprochées, elles ne passent ni au repos ni dans un bain chaud.</li>
  <li><b>1er bébé</b> : en général on part quand elles reviennent toutes les 5 minutes depuis 1 à 2 heures.</li>
  <li><b>Perte des eaux</b> : on part à la maternité, même sans contractions.</li>
  <li>Utilise le chrono de contractions : Guide → Outils.</li></ul>`},
 {t:"Nausées du 1er trimestre",b:`<ul><li>Mange un petit quelque chose avant de te lever (biscotte, amandes).</li><li>Fractionne : 5 à 6 petits repas plutôt que 3 gros.</li>
  <li>Bois par petites gorgées entre les repas.</li><li>Le gingembre aide beaucoup de femmes.</li><li>Évite les odeurs fortes et la cuisine grasse.</li></ul>
  <p>Si tu vomis tout ce que tu manges ou perds du poids, consulte : ça se soigne.</p>`},
 {t:"Toxoplasmose et listériose",b:`<p><b>Toxoplasmose</b> (si tu n'es pas immunisée) : viande bien cuite, fruits et légumes lavés, gants pour jardiner, pas de litière du chat. Une prise de sang tous les mois permet de surveiller.</p>
  <p><b>Listériose</b> (pour toutes) : pas de lait cru ni de croûte de fromage, consommer vite les restes, nettoyer le frigo régulièrement. Tout est détaillé dans Guide → Assiette.</p>`},
 {t:"Bien dormir",b:`<ul><li>À partir du 3e trimestre, dors plutôt sur le côté gauche.</li><li>Un coussin de grossesse entre les genoux soulage le dos.</li>
  <li>Surélève légèrement la tête du lit en cas de remontées acides.</li><li>Une petite sieste dans la journée compte vraiment.</li></ul>`},
 {t:"Sport et activité",b:`<ul><li>Marche, natation, aquagym, yoga et pilates prénatals : parfaits.</li><li>Environ 30 minutes par jour, à un rythme où tu peux parler.</li>
  <li>À éviter : sports de combat, risques de chute (ski, équitation), plongée sous-marine.</li><li>Arrête-toi en cas de douleur, saignement ou essoufflement inhabituel.</li></ul>`},
 {t:"Médicaments",b:`<ul><li>Pas d'automédication, y compris les « naturels » et les huiles essentielles.</li><li>Le paracétamol reste l'antidouleur de référence, à la dose la plus faible et sur avis.</li>
  <li>Ibuprofène, aspirine et autres anti-inflammatoires : à éviter, interdits à partir du 6e mois.</li><li>Signale ta grossesse à chaque professionnel (dentiste, pharmacien, radiologue).</li></ul>`},
 {t:"Petits maux et astuces",b:`<ul><li><b>Jambes lourdes</b> : jambes surélevées, douche fraîche sur les mollets, bas de contention si prescrits.</li>
  <li><b>Constipation</b> : fibres, pruneaux, eau, marche.</li><li><b>Brûlures d'estomac</b> : petits repas, pas d'allongement juste après.</li>
  <li><b>Vergetures</b> : hydratation quotidienne du ventre, des seins et des hanches.</li><li><b>Crampes</b> : étirements et hydratation ; parle-en à la sage-femme (magnésium).</li></ul>`},
 {t:"Démarches administratives",b:`<ul><li><b>Déclaration de grossesse</b> avant 15 SA (faite en ligne par le médecin ou la sage-femme).</li>
  <li><b>Inscription à la maternité</b> le plus tôt possible.</li><li><b>Prise en charge à 100 %</b> à partir du 1er jour du 6e mois.</li>
  <li><b>Congé maternité</b> : 16 semaines pour un 1er ou 2e enfant (6 avant le terme, 10 après).</li>
  <li><b>Congé paternité</b> : 28 jours, dont une partie obligatoire juste après la naissance.</li>
  <li><b>Reconnaissance anticipée</b> en mairie si vous n'êtes pas mariés.</li><li><b>Déclaration de naissance</b> en mairie dans les 5 jours.</li>
  <li><b>Mode de garde</b> : inscriptions en crèche souvent dès le 6e mois.</li></ul><p class="muted">Les règles changent : vérifie sur ameli.fr et service-public.fr.</p>`},
 {t:"Préparation à la naissance",b:`<ul><li>Un entretien prénatal précoce puis 7 séances, prises en charge par l'Assurance Maladie.</li>
  <li>Méthodes au choix : classique, sophrologie, haptonomie, yoga, piscine, chant prénatal.</li>
  <li>À commencer vers le 6e mois.</li><li>Le ou la partenaire est bienvenu(e) aux séances.</li></ul>`},
 {t:"Le rôle du partenaire",b:`<ul><li>Venir aux échos et à quelques consultations.</li><li>Prendre en charge la litière du chat et les courses « à risque ».</li>
  <li>Monter la chambre, installer le siège auto, repérer le trajet de la maternité.</li><li>Masser le dos, les pieds… et écouter.</li>
  <li>Garder le téléphone chargé à partir de 36 SA.</li></ul>`},
 {t:"Allaitement ou biberon",b:`<p>Les deux sont des choix respectables. Si tu veux allaiter, renseigne-toi avant la naissance : séance de préparation dédiée, consultante en lactation, associations (La Leche League, etc.). Une mise au sein précoce, dans l'heure qui suit la naissance, aide beaucoup.</p>`}
];

const VALISE = [
 {id:"m", t:"Pour {maman}", items:["Chemises de nuit ou t-shirts amples (×3)","Robe de chambre","Chaussons et chaussettes","Culottes jetables ou filet","Serviettes hygiéniques maternité","Soutiens-gorge d'allaitement (×2)","Coussinets d'allaitement","Trousse de toilette","Brumisateur","En-cas et boissons","Chargeur avec câble long","Tenue de sortie confortable","Livre, musique, casque"]},
 {id:"b", t:"Pour bébé", items:["Bodies naissance (×6)","Pyjamas (×6)","Bonnet","Chaussettes (×3)","Gilet","Gigoteuse","Langes (×4)","Serviette de bain","Couches taille 1 (selon la maternité)","Siège auto installé dans la voiture","Doudou"]},
 {id:"p", t:"Papiers", items:["Carte Vitale","Carte de mutuelle","Pièce d'identité","Dossier de suivi et échographies","Résultats de prises de sang","Carte de groupe sanguin","Reconnaissance anticipée (si non mariés)","Livret de famille (si mariés)"]},
 {id:"x", t:"Pour le partenaire", items:["Tenue de rechange","En-cas et boissons","Monnaie pour le parking","Chargeur de téléphone"]}
];

const SUGG = {
 F:["Louise","Ambre","Jade","Alba","Romy","Alma","Rose","Mia","Lina","Anna","Iris","Mila","Emma","Agathe","Céleste","Margaux","Victoire","Nina","Capucine","Héloïse","Apolline","Joy","Lise","Olivia"],
 M:["Gabriel","Raphaël","Léon","Louis","Maël","Noah","Jules","Arthur","Adam","Lucas","Isaac","Gabin","Aaron","Hugo","Malo","Nino","Côme","Marius","Timothée","Elio","Milo","Augustin","Sohan","Théo"],
 X:["Camille","Sacha","Eden","Charlie","Lou","Noa","Alix","Maé","Andrea","Ange","Swann","Morgan"]
};
const MOODS = ["😫","😕","😐","🙂","🥰"];
