window.PDV = window.PDV || { packs: [], sujets: [] };
window.PDV.methode = [
  "Lis le sujet mot à mot : définis chaque terme, repère ce qu'il oppose ou présuppose.",
  "Borne-le : quelle période, quel espace, quels acteurs ?",
  "Pose la problématique : la tension que ton exposé va trancher.",
  "Bâtis un plan en deux ou trois parties qui répondent chacune à la question.",
  "Place deux exemples datés par partie, dont un récent.",
  "Écris l'accroche et la dernière phrase ; le reste se parle."
];
window.PDV.criteres = [
  "Fond et exactitude",
  "Problématique et plan",
  "Exemples et actualité",
  "Aisance et tenue du temps"
];
window.PDV.jury = [
  { role: "Premier professeur", q: [
    "Définissez précisément le terme central de votre sujet.",
    "Quelle objection sérieuse peut-on opposer à votre thèse ?",
    "Citez un auteur ou un texte qui éclaire le sujet.",
    "Votre plan aurait-il pu être différent ? Lequel ?"
  ] },
  { role: "Second professeur", q: [
    "Donnez un exemple antérieur au XXe siècle.",
    "Ce que vous dites vaut-il hors d'Europe ?",
    "Quel chiffre ou quelle date faut-il absolument retenir ?",
    "Quel lien faites-vous avec l'actualité des dernières semaines ?"
  ] },
  { role: "Cadre militaire", q: [
    "En quoi ce sujet concerne-t-il un officier de l'armée de l'Air et de l'Espace ?",
    "Qu'auriez-vous décidé à la place du responsable politique ou militaire ?",
    "Quelles conséquences pour nos armées dans les dix ans ?",
    "Ce sujet pose-t-il un dilemme éthique à celui qui commande ?",
    "Comment l'expliqueriez-vous à vos subordonnés en deux minutes ?"
  ] }
];
window.PDV.sujets = [
  {
    id: "s-dissuasion", dom: "Défense", titre: "La dissuasion nucléaire française est-elle encore adaptée ?",
    pb: "Conçue pour sanctuariser le territoire face à une menace massive, la dissuasion reste-t-elle crédible dans un monde de conflits sous le seuil et de doute sur la garantie américaine ?",
    plan: [
      "Un socle qui tient : permanence à la mer et composante aéroportée, décision d'un seul, stricte suffisance, dommages inacceptables.",
      "Des angles morts : agressions sous le seuil, défenses antimissiles, prolifération, fin des traités de maîtrise des armements.",
      "Une adaptation engagée : dimension européenne des intérêts vitaux, dissuasion avancée, épaulement conventionnel."
    ],
    refs: [
      "13 février 1960 : Gerboise bleue ; 1964 : prise d'alerte des Forces aériennes stratégiques",
      "Deux composantes : océanique (sous-marins lanceurs d'engins) et aéroportée (Rafale et missile ASMPA)",
      "2 mars 2026, île Longue : dissuasion avancée et hausse annoncée du nombre de têtes",
      "5 février 2026 : expiration de New START",
      "Mémorandum de Budapest, 1994 : le précédent de l'Ukraine dénucléarisée"
    ],
    pieges: [
      "Confondre dissuasion avancée et partage : la décision reste strictement nationale.",
      "Présenter l'arme comme un moyen de bataille : c'est une arme politique de non-emploi."
    ],
    relances: [
      "Qui décide de l'emploi, et sur quel fondement ?",
      "Qu'est-ce que l'avertissement nucléaire ?",
      "La dissuasion protège-t-elle d'une cyberattaque ou du terrorisme ?"
    ]
  },
  {
    id: "s-europe", dom: "Géopolitique", titre: "L'Europe peut-elle se défendre sans les États-Unis ?",
    pb: "Entre dépendance capacitaire et réarmement, l'autonomie stratégique européenne est-elle un horizon crédible ou un slogan ?",
    plan: [
      "Une dépendance structurelle : renseignement, transport stratégique, défense antimissile, parapluie nucléaire, industrie fragmentée.",
      "Un sursaut réel depuis 2022 : budgets en hausse, objectif de 5 % du PIB fixé à La Haye, financements européens, soutien à l'Ukraine.",
      "Des conditions politiques non réunies : menaces perçues différemment à l'Est et au Sud, achats américains sur étagère, question du commandement et du nucléaire."
    ],
    refs: [
      "1954 : échec de la Communauté européenne de défense",
      "1998 : Saint-Malo ; 2022 : Boussole stratégique",
      "Article 5 du traité de l'Atlantique nord et article 42-7 du traité sur l'Union européenne",
      "Juin 2025 : sommet de La Haye, 5 % du PIB d'ici 2035",
      "2 mars 2026 : dissuasion avancée proposée aux partenaires européens"
    ],
    pieges: [
      "Opposer OTAN et défense européenne : la plupart des Européens les veulent complémentaires.",
      "Oublier le Royaume-Uni, hors de l'Union mais puissance militaire et nucléaire européenne."
    ],
    relances: [
      "Qu'apporte l'article 42-7 par rapport à l'article 5 ?",
      "Citez un programme d'armement en coopération et ses difficultés.",
      "Une armée européenne est-elle souhaitable ?"
    ]
  },
  {
    id: "s-ukraine", dom: "Défense", titre: "La guerre en Ukraine annonce-t-elle les guerres de demain ?",
    pb: "Laboratoire ou exception : que peut-on généraliser d'une guerre d'usure entre deux armées de masse ?",
    plan: [
      "Le retour de la masse et de la durée : artillerie, munitions, mobilisation industrielle, pertes.",
      "Des ruptures tactiques : champ de bataille transparent, drones à tous les échelons, guerre électronique, frappes dans la profondeur.",
      "Des leçons à manier avec prudence : aucun camp n'a la supériorité aérienne, géographie propre, poids du soutien extérieur et du nucléaire en arrière-plan."
    ],
    refs: [
      "24 février 2022 : invasion et échec russe devant Kiev",
      "Défenses sol-air denses : le ciel est interdit aux deux aviations",
      "Drones produits par millions chaque année, de la reconnaissance à l'attaque",
      "2026 : frappes ukrainiennes répétées sur les raffineries russes",
      "Points de comparaison : Haut-Karabakh en 2020, guerre du Golfe en 1991"
    ],
    pieges: [
      "Conclure que le char ou l'avion sont morts : ils sont contestés, pas remplacés.",
      "Oublier les forces morales : la volonté de se battre."
    ],
    relances: [
      "Pourquoi aucune armée de l'air ne domine-t-elle le ciel ukrainien ?",
      "Qu'est-ce que l'économie de guerre ?",
      "Quelles leçons pour l'armée de l'Air et de l'Espace ?"
    ]
  },
  {
    id: "s-onu", dom: "Relations internationales", titre: "L'ONU sert-elle encore à quelque chose ?",
    pb: "Paralysée au Conseil de sécurité, l'ONU est-elle condamnée, ou reste-t-elle irremplaçable par ce qu'elle fait en dehors de lui ?",
    plan: [
      "Une paralysie politique : veto, guerres d'Ukraine, de Gaza et du Soudan sans réponse, contournement par les coalitions.",
      "Une utilité quotidienne : agences humanitaires, opérations de paix, production de droit et de légitimité.",
      "Une réforme introuvable : élargissement du Conseil, encadrement du veto en cas d'atrocités de masse proposé par la France."
    ],
    refs: [
      "26 juin 1945 : Charte de San Francisco ; article 2, paragraphe 4, article 51 et chapitre VII",
      "Corée en 1950, Golfe en 1991 : deux emplois de la sécurité collective",
      "Rwanda en 1994, Srebrenica en 1995 : deux échecs",
      "Irak en 2003 sans mandat ; Libye en 2011 avec la résolution 1973",
      "Cinq membres permanents, 193 États membres"
    ],
    pieges: [
      "Réduire l'ONU au Conseil de sécurité.",
      "Dire que le veto n'a aucun fondement : il est le prix de la présence des grandes puissances."
    ],
    relances: [
      "La France doit-elle partager son siège permanent ?",
      "Qu'est-ce que la responsabilité de protéger ?",
      "Quelle différence entre des Casques bleus et une coalition ?"
    ]
  },
  {
    id: "s-puissance", dom: "Histoire et géopolitique", titre: "La France est-elle encore une grande puissance ?",
    pb: "Puissance moyenne à vocation mondiale : la France a-t-elle encore les moyens de son rang ?",
    plan: [
      "Des attributs intacts : siège permanent, dissuasion, armée d'emploi, deuxième domaine maritime mondial, langue et réseau diplomatique.",
      "Un décrochage relatif : poids économique, dette, recul en Afrique, dépendances technologiques.",
      "Une puissance par levier : Europe, coalitions, industrie de défense, capacité d'initiative."
    ],
    refs: [
      "1940 puis 1944-1945 : de l'effondrement au rang de vainqueur",
      "1956 : Suez ; 1960 : la bombe ; 1966 : sortie du commandement intégré",
      "2003 : refus de la guerre en Irak",
      "2022-2025 : départ du Mali, du Burkina Faso, du Niger, du Tchad et du Sénégal",
      "Outre-mer et Indo-Pacifique"
    ],
    pieges: [
      "Le déclinisme comme la cocarde : le jury attend de la mesure.",
      "Confondre puissance et influence."
    ],
    relances: [
      "Qu'est-ce qu'une puissance d'équilibre ?",
      "Le siège permanent de la France est-il légitime ?",
      "Quel rôle jouent les outre-mer ?"
    ]
  },
  {
    id: "s-histoire", dom: "Culture générale", titre: "À quoi sert l'histoire pour un officier ?",
    pb: "Entre recettes illusoires et culture du jugement : que peut-on vraiment apprendre du passé pour décider dans l'incertitude ?",
    plan: [
      "L'histoire n'est pas un manuel : chaque situation est singulière, les leçons mal tirées mènent à l'erreur.",
      "Elle forme le jugement : comprendre l'adversaire, la friction, le rapport du politique et du militaire.",
      "Elle fonde l'identité et la légitimité : traditions, exemplarité, mémoire des fautes."
    ],
    refs: [
      "Marc Bloch, L'Étrange Défaite, écrit en 1940",
      "Clausewitz : la guerre, continuation de la politique ; brouillard et friction",
      "De Gaulle, Vers l'armée de métier, 1934 : la culture générale, véritable école du commandement",
      "Avril 1961 : le putsch d'Alger et la question de l'obéissance",
      "Affaire Dreyfus : général de brigade à titre posthume par la loi du 17 novembre 2025"
    ],
    pieges: [
      "Réciter des dates sans montrer ce qu'elles éclairent.",
      "Faire de l'histoire un roman national sans zones d'ombre."
    ],
    relances: [
      "Citez une erreur née d'une mauvaise analogie historique.",
      "Faut-il commémorer les défaites ?",
      "Quel chef militaire vous inspire, et pourquoi ?"
    ]
  },
  {
    id: "s-espace", dom: "Air et espace", titre: "L'espace est-il devenu un champ de bataille ?",
    pb: "Milieu indispensable aux armées et à l'économie, l'espace peut-il rester un bien commun, ou devient-il un théâtre d'affrontement comme les autres ?",
    plan: [
      "Une dépendance totale : navigation, communications, renseignement, alerte ; le spatial commercial change l'échelle.",
      "Une arsenalisation en cours : tirs antisatellites, brouillage, satellites espions, débris.",
      "Un droit et une doctrine à construire : traité de 1967 insuffisant, défense active à la française, coopération européenne."
    ],
    refs: [
      "4 octobre 1957 : Spoutnik ; 1969 : Apollo 11",
      "1967 : traité de l'espace, pas d'armes de destruction massive en orbite",
      "15 novembre 2021 : tir antisatellite russe",
      "2019 : stratégie spatiale de défense et Commandement de l'espace ; 2020 : armée de l'Air et de l'Espace",
      "Constellations privées dans la guerre en Ukraine"
    ],
    pieges: [
      "Confondre militarisation, ancienne, et arsenalisation : des armes dans ou vers l'espace.",
      "Oublier les débris : la menace pèse sur tous."
    ],
    relances: [
      "Que fait le Commandement de l'espace ?",
      "Un satellite peut-il être une cible légitime ?",
      "L'Europe est-elle autonome pour accéder à l'espace ?"
    ]
  },
  {
    id: "s-ia", dom: "Technologie", titre: "L'intelligence artificielle va-t-elle changer la guerre ?",
    pb: "Accélérateur de décision ou rupture de nature : jusqu'où peut-on confier la guerre à la machine ?",
    plan: [
      "Ce qui change déjà : traitement du renseignement, ciblage, essaims de drones, maintenance, cyber.",
      "Ce qui ne change pas : la guerre reste un affrontement de volontés, avec sa friction, ses ruses et ses données fausses.",
      "La question de la responsabilité : homme dans la boucle, droit des conflits armés, risque d'escalade par la vitesse."
    ],
    refs: [
      "Ukraine : drones autonomes en phase terminale pour échapper au brouillage",
      "Gaza : débat sur le ciblage assisté par algorithme",
      "France : agence ministérielle pour l'IA de défense, créée en 2024",
      "Droit international humanitaire : distinction, proportionnalité, précaution",
      "Clausewitz : le brouillard de la guerre"
    ],
    pieges: [
      "Le fantasme du robot tueur généralisé.",
      "Oublier que l'adversaire dispose des mêmes outils."
    ],
    relances: [
      "Qu'est-ce qu'un système d'armes létal autonome ?",
      "Un chef peut-il répondre d'une décision qu'il ne comprend pas ?",
      "L'IA favorise-t-elle l'attaque ou la défense ?"
    ]
  },
  {
    id: "s-courage", dom: "Culture générale", titre: "Le courage",
    pb: "Vertu du combattant par excellence, le courage se réduit-il à braver le danger physique ?",
    plan: [
      "Le courage physique : affronter la peur sans l'ignorer ; il s'entraîne et se nourrit du groupe.",
      "Le courage moral : dire non, rendre compte d'un échec, assumer une décision impopulaire.",
      "Le courage du chef : décider dans l'incertitude et répondre de ses ordres."
    ],
    refs: [
      "Aristote : le courage, juste milieu entre lâcheté et témérité",
      "Jean Moulin, Pierre Brossolette et les Compagnons de la Libération",
      "Colonel Arnaud Beltrame, Trèbes, 23 mars 2018",
      "Dreyfus, Picquart et Zola : trois formes de courage dans une même affaire",
      "18 juin 1940 : désobéir pour continuer le combat"
    ],
    pieges: [
      "Une définition plate, sans tension : opposer courage et témérité, courage et obéissance.",
      "Ne prendre que des exemples militaires."
    ],
    relances: [
      "Le courage s'apprend-il ?",
      "Avez-vous déjà manqué de courage ?",
      "Un lanceur d'alerte est-il courageux ?"
    ]
  },
  {
    id: "s-frontieres", dom: "Géopolitique", titre: "Les frontières ont-elles encore un sens ?",
    pb: "À l'heure des flux mondialisés, la frontière est-elle un vestige, ou redevient-elle l'enjeu central des relations internationales ?",
    plan: [
      "L'illusion de l'effacement : mondialisation, Schengen, numérique, menaces sans territoire.",
      "Le grand retour : murs, annexions, contrôle des migrations, souveraineté sanitaire et technologique.",
      "De nouvelles frontières à défendre : mers, espace, cyberespace, fonds marins."
    ],
    refs: [
      "1648 : Westphalie ; 1885 : conférence de Berlin",
      "1975 : Helsinki, inviolabilité des frontières en Europe",
      "1989 : chute du Mur ; 1995 : entrée en vigueur de Schengen",
      "2014 : Crimée ; 2022 : Ukraine",
      "1982 : convention de Montego Bay et zones économiques exclusives"
    ],
    pieges: [
      "Confondre frontière, limite et front.",
      "Ne parler que de l'Europe."
    ],
    relances: [
      "Une frontière peut-elle être juste ?",
      "Pourquoi l'Afrique a-t-elle choisi de garder les frontières coloniales ?",
      "Le cyberespace a-t-il des frontières ?"
    ]
  },
  {
    id: "s-climat", dom: "Environnement", titre: "Le climat est-il un enjeu de défense ?",
    pb: "Simple multiplicateur de crises ou facteur stratégique à part entière : que change le dérèglement climatique pour les armées ?",
    plan: [
      "Un multiplicateur de menaces : eau, sécheresses, migrations, tensions sur les ressources.",
      "De nouveaux théâtres : Arctique ouvert, littoraux et outre-mer exposés, catastrophes naturelles.",
      "Des armées concernées deux fois : missions de secours en hausse, dépendance énergétique et adaptation des équipements."
    ],
    refs: [
      "12 décembre 2015 : accord de Paris",
      "Arctique : nouvelles routes maritimes et rivalités",
      "Nil : barrage de la Renaissance, tensions entre l'Éthiopie, le Soudan et l'Égypte",
      "Sahel : pression sur les terres et les points d'eau",
      "Outre-mer : cyclones et intervention des armées"
    ],
    pieges: [
      "Le déterminisme : le climat aggrave les conflits, il les cause rarement seul.",
      "Un exposé militant, sans lien avec la défense."
    ],
    relances: [
      "Citez un conflit où l'eau joue un rôle.",
      "Les armées doivent-elles réduire leurs émissions ?",
      "L'Arctique sera-t-il un théâtre d'affrontement ?"
    ]
  },
  {
    id: "s-obeir", dom: "Éthique", titre: "Obéir, est-ce renoncer à sa liberté ?",
    pb: "La discipline, force principale des armées, est-elle compatible avec la conscience de celui qui obéit ?",
    plan: [
      "L'obéissance, condition de l'action collective et de la subordination au pouvoir politique.",
      "Une obéissance bornée par le droit : l'ordre manifestement illégal ne doit pas être exécuté.",
      "Une obéissance d'adhésion : comprendre l'intention du chef, rendre compte, dire son désaccord avant la décision."
    ],
    refs: [
      "Statut général des militaires : discipline, loyalisme, neutralité",
      "Procès de Nuremberg : l'ordre reçu n'exonère pas",
      "Avril 1961 : putsch d'Alger",
      "18 juin 1940 : la désobéissance fondatrice",
      "Kant : l'autonomie, obéir à la loi qu'on se donne"
    ],
    pieges: [
      "Faire l'éloge de la désobéissance sans en fixer les limites.",
      "Ignorer le cadre juridique."
    ],
    relances: [
      "Que faites-vous d'un ordre que vous jugez absurde mais légal ?",
      "Un militaire peut-il critiquer publiquement une décision politique ?",
      "Qu'est-ce que le devoir de réserve ?"
    ]
  },
  {
    id: "s-sport", dom: "Société", titre: "Le sport est-il la continuation de la politique ?",
    pb: "Fête universelle ou instrument de puissance : le sport échappe-t-il à la politique ?",
    plan: [
      "Un instrument de prestige et de cohésion : Jeux, équipes nationales, récit collectif.",
      "Un terrain d'affrontement symbolique : boycotts, exclusions, propagande.",
      "Une diplomatie à part entière : rapprochements, influence des États organisateurs."
    ],
    refs: [
      "1936 : Jeux de Berlin",
      "1980 et 1984 : boycotts croisés de Moscou et de Los Angeles",
      "1971 : diplomatie du ping-pong entre Pékin et Washington",
      "2024 : Jeux de Paris",
      "Sport militaire : du bataillon de Joinville à l'armée de champions"
    ],
    pieges: [
      "Rester anecdotique : il faut une thèse.",
      "Oublier ce que le sport apporte au militaire : rusticité, cohésion, dépassement."
    ],
    relances: [
      "Faut-il boycotter une compétition organisée par un régime autoritaire ?",
      "Que représente le sport dans votre formation ?",
      "Le sport de haut niveau est-il moral ?"
    ]
  },
  {
    id: "s-airpower", dom: "Air et espace", titre: "La puissance aérienne peut-elle gagner seule une guerre ?",
    pb: "Rapide, précise et peu coûteuse en vies amies, l'arme aérienne tente le décideur politique. Peut-elle pour autant obtenir seule un résultat durable au sol ?",
    plan: [
      "Une promesse ancienne et des succès réels : frapper le centre de gravité adverse sans s'exposer, de Douhet au Kosovo.",
      "Des limites constantes : l'avion ne tient pas le terrain, dépend du renseignement, bute sur la volonté de l'adversaire comme sur ses défenses.",
      "Une puissance décisive quand elle est combinée : la supériorité aérienne comme condition, l'intégration avec le sol, l'espace et le cyber."
    ],
    refs: [
      "Giulio Douhet, La Maîtrise de l'air (1921) ; John Warden et les cinq cercles",
      "1999 : 78 jours de frappes de l'OTAN font céder la Serbie au Kosovo",
      "2011 : Harmattan en Libye, victoire aérienne et chaos durable",
      "Depuis 2022 : en Ukraine, aucun camp n'obtient la supériorité aérienne, les drones saturent le ciel",
      "2026 : interceptions françaises au-dessus des Émirats et question des stocks de missiles"
    ],
    pieges: [
      "Plaider pour sa propre armée sans reconnaître ses limites : le cadre militaire attend de la lucidité.",
      "Oublier la défense sol-air et les drones, qui contestent aujourd'hui la liberté d'action dans le ciel."
    ],
    relances: [
      "Pourquoi personne n'a-t-il la supériorité aérienne en Ukraine ?",
      "Un drone à quelques milliers d'euros remet-il en cause un avion à cent millions ?",
      "Que signifie « entrer en premier » ?"
    ]
  },
  {
    id: "s-service", dom: "Société", titre: "Faut-il rétablir un service militaire ?",
    pb: "Entre besoin de masse face au retour de la guerre en Europe et quête de cohésion nationale, un service répond-il d'abord à un besoin militaire ou à une attente de société ?",
    plan: [
      "Pourquoi la conscription a été suspendue : une armée de métier pour se projeter après la guerre du Golfe, et la fin de la menace aux frontières.",
      "Pourquoi le débat revient : haute intensité, besoin de masse et de réserves, exemples nordiques et baltes, résilience de la nation.",
      "Le choix français de 2025 : un service volontaire, militaire et sélectif, qui monte en puissance, avec ses limites de coût, d'encadrement et d'égalité."
    ],
    refs: [
      "1798 : loi Jourdan-Delbrel, naissance de la conscription ; 1905 : service personnel et obligatoire pour tous",
      "1996-1997 : professionnalisation annoncée par Jacques Chirac, service suspendu",
      "Retours de la conscription : Lituanie (2015), Suède (2017), Lettonie (2023)",
      "27 novembre 2025 : annonce du service national volontaire de dix mois, premières incorporations en 2026",
      "Réserve opérationnelle : objectif de 80 000 réservistes en 2030"
    ],
    pieges: [
      "Confondre les finalités : former des combattants, brasser une classe d'âge et alimenter la réserve ne demandent pas le même outil.",
      "Ignorer les contraintes concrètes : casernes, cadres, coût, alors que les armées peinent déjà à fidéliser."
    ],
    relances: [
      "Un service de dix mois forme-t-il un combattant utile ?",
      "Pourquoi le service national universel n'a-t-il pas convaincu ?",
      "Seriez-vous favorable à un service obligatoire, y compris pour les femmes ?"
    ]
  },
  {
    id: "s-armement", dom: "Europe", titre: "Peut-on encore construire des armes à plusieurs en Europe ?",
    pb: "L'arrêt de l'avion commun du SCAF en 2026 condamne-t-il la coopération d'armement européenne, ou seulement une certaine manière de la conduire ?",
    plan: [
      "Une nécessité : des coûts hors de portée d'un seul État, des séries trop courtes, une industrie fragmentée face aux géants américains et chinois.",
      "Des échecs répétés : besoins opérationnels divergents, partage industriel selon le « juste retour », rivalités entre champions nationaux.",
      "Des voies qui fonctionnent : un maître d'œuvre clair, des briques communes plutôt qu'un système unique, la préférence européenne dans les achats."
    ],
    refs: [
      "Succès : MBDA et le missile Meteor, les frégates FREMM franco-italiennes, l'A400M malgré ses retards",
      "1985 : la France quitte le projet d'avion de combat européen et lance seule le Rafale",
      "8 juin 2026 : abandon de l'avion habité commun du SCAF",
      "GCAP (Royaume-Uni, Italie, Japon) et char MGCS franco-allemand",
      "Fonds européen de défense (2021), instrument SAFE de 150 milliards d'euros (2025)"
    ],
    pieges: [
      "Accuser un partenaire : mieux vaut analyser les intérêts de chacun.",
      "Conclure au repli national sans dire ce que coûte de faire seul."
    ],
    relances: [
      "La France peut-elle financer seule le successeur du Rafale ?",
      "Faut-il acheter américain quand c'est moins cher et disponible tout de suite ?",
      "Qu'est-ce que la préférence européenne ?"
    ]
  },
  {
    id: "s-afrique", dom: "Géopolitique", titre: "La France a-t-elle encore un rôle militaire à jouer en Afrique ?",
    pb: "Écartée du Sahel et priée de fermer ses bases, la France doit-elle tourner la page ou réinventer une présence qui serve des intérêts partagés ?",
    plan: [
      "Soixante ans de présence : accords de défense, bases, interventions, de Kolwezi à Barkhane, avec de réels succès tactiques.",
      "Un rejet politique : coups d'État sahéliens, ressentiment des opinions, concurrence russe, turque et chinoise, départs successifs du Mali au Sénégal.",
      "Une présence à réinventer : partenariats à la demande, formation, renseignement, sécurité maritime, Djibouti comme point d'appui."
    ],
    refs: [
      "19 mai 1978 : Kolwezi ; 1986-2014 : Épervier au Tchad",
      "2013 : Serval arrête les djihadistes au Mali ; 2014-2022 : Barkhane",
      "2020-2023 : coups d'État au Mali, au Burkina Faso, au Niger ; Alliance des États du Sahel",
      "2025 : restitution des bases de N'Djamena, Port-Bouët et Dakar",
      "Djibouti : environ 1 500 militaires, sur la route de la mer Rouge"
    ],
    pieges: [
      "Verser dans la nostalgie ou dans l'autoflagellation : le jury attend une analyse d'intérêts.",
      "Traiter l'Afrique comme un bloc : le golfe de Guinée, la Corne et le Sahel n'ont pas les mêmes enjeux."
    ],
    relances: [
      "Barkhane est-elle un échec ?",
      "Que cherche la Russie en Afrique ?",
      "Pourquoi garder Djibouti ?"
    ]
  },
  {
    id: "s-porte-avions", dom: "Défense", titre: "Le porte-avions est-il encore l'outil de la puissance ?",
    pb: "Symbole de puissance depuis 1945, le porte-avions reste-t-il pertinent à l'heure des missiles hypersoniques, des drones et des budgets contraints ?",
    plan: [
      "Un outil sans équivalent : une base aérienne mobile et souveraine, qui agit sans autorisation de survol et porte en France une part de la dissuasion.",
      "Un outil contesté : vulnérabilité aux missiles antinavires et aux drones, coût, et pour la France un bâtiment unique, donc sans permanence.",
      "Un outil qui évolue : drones embarqués, catapultes électromagnétiques, insertion dans un groupe aéronaval et dans des coalitions."
    ],
    refs: [
      "1942 : à Midway, le porte-avions supplante le cuirassé",
      "Charles de Gaulle : en service depuis 2001, engagé en Afghanistan, en Libye, contre Daech",
      "Mars 2026 : envoi du groupe aéronaval en Méditerranée orientale pendant la guerre d'Iran",
      "18 mars 2026 : le futur porte-avions est baptisé France Libre, 80 000 tonnes, pour 2038",
      "Chine : trois porte-avions, dont le Fujian à catapultes électromagnétiques"
    ],
    pieges: [
      "Réciter des caractéristiques techniques au lieu de discuter l'utilité politique.",
      "Oublier le coût d'opportunité : dix milliards d'euros, ce sont aussi des frégates, des munitions, des drones."
    ],
    relances: [
      "Faut-il un second porte-avions ?",
      "Un porte-avions peut-il survivre face à la Chine ?",
      "Qu'apporte le porte-avions à l'armée de l'Air et de l'Espace, et réciproquement ?"
    ]
  },
  {
    id: "s-chef", dom: "Culture générale", titre: "Qu'est-ce qu'un chef ?",
    pb: "Le chef se définit-il par l'autorité que lui donne son grade ou par la confiance qu'il obtient de ceux qu'il commande ?",
    plan: [
      "Celui qui décide : le chef assume seul une décision prise dans l'incertitude, et il en répond.",
      "Celui qui entraîne : exemplarité, compétence et souci des subordonnés fondent une autorité consentie.",
      "Celui qui sert : le chef militaire obéit lui-même, au politique et au droit, et prépare ceux qui lui succéderont."
    ],
    refs: [
      "Lyautey, Le Rôle social de l'officier (1891)",
      "De Gaulle, Le Fil de l'épée (1932) : le caractère, le prestige",
      "Foch : la question « De quoi s'agit-il ? »",
      "Hélie de Saint Marc, avril 1961 : le chef face à un choix de conscience",
      "Pont de Vrbanja, 27 mai 1995 : un lieutenant en tête de sa section"
    ],
    pieges: [
      "Aligner des qualités sans les illustrer : un exemple vécu vaut mieux qu'une liste.",
      "Confondre chef et gestionnaire, ou autorité et autoritarisme."
    ],
    relances: [
      "Citez un chef que vous admirez, et dites pourquoi.",
      "Un chef peut-il reconnaître une erreur devant ses subordonnés ?",
      "Quel chef voulez-vous être à la sortie de l'École ?"
    ]
  },
  {
    id: "s-budget", dom: "Économie", titre: "Peut-on réarmer sans renoncer à l'État social ?",
    pb: "Avec une dette élevée et des besoins sociaux croissants, l'effort de défense qu'appelle la situation stratégique est-il soutenable, et à quelles conditions ?",
    plan: [
      "Un effort inédit depuis la guerre froide : budget de la défense doublé entre 2017 et 2027, cible de l'OTAN portée à 5 % du PIB.",
      "Une contrainte forte : dette, déficit, concurrence des dépenses sociales, acceptabilité par l'opinion.",
      "Des voies de financement : priorités assumées, emprunt européen, épargne privée, retombées industrielles et technologiques."
    ],
    refs: [
      "Les « dividendes de la paix » : un effort de défense divisé par deux en part de richesse nationale entre les années 1980 et 2010",
      "Loi de programmation militaire 2024-2030 : 413 milliards d'euros, actualisée de 36 milliards en 2026",
      "Sommet de La Haye, juin 2025 : 5 % du PIB en 2035",
      "Plan ReArm Europe et instrument SAFE (2025)",
      "Le dilemme classique : le beurre ou les canons"
    ],
    pieges: [
      "Opposer caricaturalement défense et social : la sécurité est la condition du reste.",
      "Aligner des chiffres sans dire ce qu'ils achètent."
    ],
    relances: [
      "5 % du PIB, est-ce réaliste pour la France ?",
      "Qui doit payer : l'impôt, la dette, l'Europe ?",
      "La défense est-elle une dépense ou un investissement ?"
    ]
  }
];
