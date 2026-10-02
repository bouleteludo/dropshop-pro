# Vendre « Lanterne » sur le Theme Store — guide pas à pas

Le thème vendu s'appelle **Lanterne**. Il contient 5 styles, chacun avec sa
propre fiche de vente sur le Theme Store :

| Style | Saison | Type de boutique visé | Zip pour la boutique de démo |
| --- | --- | --- | --- |
| Lanterne | Halloween | Déguisements et articles de fête | `dist/demo/lanterne-lanterne.zip` |
| Sapin | Noël | Décorations et cadeaux de Noël | `dist/demo/lanterne-sapin.zip` |
| Printemps | Pâques | Fleurs et décoration de printemps | `dist/demo/lanterne-printemps.zip` |
| Velours | Saint-Valentin | Bijoux et cadeaux romantiques | `dist/demo/lanterne-velours.zip` |
| Rivage | Été | Accessoires de plage et d'été | `dist/demo/lanterne-rivage.zip` |

Le zip à soumettre, `dist/lanterne-theme-store.zip`, n'est fabriqué que
lorsque tout est prêt : le script de fabrication refuse de le produire tant
qu'il reste une image avec l'enseigne BOO SHOP ou que l'adresse de
documentation n'est pas renseignée.

## Ce qui est déjà prêt

- **Base et architecture :** Skeleton, la seule base de code acceptée par
  Shopify, en architecture Online Store 2.0.
- **Fonctions obligatoires :** toutes celles qu'exige Shopify. La liste
  complète est dans `../README.md`.
- **Contrôle officiel :** `theme-check:all`, le mode le plus strict, ne
  signale aucun problème, ni sur le thème ni sur les 5 zips de démo.
- **Contrastes :** vérifiés pour les 20 palettes, au-dessus du minimum
  exigé.
- **Aucune trace de BOO SHOP dans le code :** ni logo, ni texte, ni adresse
  e-mail. Seuls les champs « auteur » et « e-mail d'assistance » restent à
  ton nom, ce qui est autorisé.
- **Textes d'exemple :** en anglais. Le français est inclus pour les
  boutiques françaises.
- **Ce qui rend Lanterne unique,** c'est-à-dire l'argument à mettre en avant
  face à l'examen :
  1. **Calendrier des saisons :** la bannière d'accueil change toute seule
     selon les dates (Halloween, Noël…), sans application.
  2. **Annonces programmées :** chaque message de la barre d'annonce peut
     avoir ses propres dates.
  3. **Date limite de livraison :** « Commandez avant le … » avec une vraie
     date. Le message s'affiche dans la barre d'annonce, sur la fiche
     produit et au panier, puis disparaît après la date.
  4. **Guide cadeaux par budget :** des cartes qui mènent aux produits
     filtrés par prix.
  5. **Message cadeau** dans le panier, transmis avec la commande.

## Étape 1 — Refaire les 3 images (toi, avec ChatGPT)

Halloween, Noël et Pâques montrent l'enseigne « BOO SHOP ». Pour chacune,
envoie l'image à ChatGPT avec :

> Recrée exactement cette image : même scène, même lumière, même cadrage,
> même format 16:9. L'enseigne doit être vierge : aucun texte, aucun nom,
> aucun logo nulle part dans l'image.

Pour Pâques, ajoute : « l'ardoise et la petite enseigne suspendue doivent
aussi être vierges ».

Envoie-moi les 3 images : je les optimise et je les intègre. Garde une trace
de leur création (conversation, date), car Shopify peut demander la preuve de
tes droits sur les images.

## Étape 2 — Compte Shopify Partner (toi)

1. Crée un compte gratuit sur partners.shopify.com.
2. Le nom du compte devient le nom d'auteur affiché sur le Theme Store.
   Donne-le-moi et je le reporte dans le thème.

## Étape 3 — Les 5 boutiques de démo (toi, avec mon aide)

Shopify exige une boutique de démo complète pour chaque style.

1. Dans le Partner Dashboard, va dans **Boutiques** et crée 5 boutiques de
   développement. Elles sont gratuites.
2. Dans chacune : Boutique en ligne → Thèmes → Importer le zip du style
   (tableau ci-dessus) → Publier.
3. Remplis-la comme une vraie boutique du secteur visé :
   - au moins 12 à 20 produits réalistes, avec plusieurs variantes, un
     produit en promotion et un produit épuisé ;
   - des photos professionnelles dont tu as les droits, **sans texte
     incrusté**. Tes visuels « Nos Compagnons », « Recettes Halloween »,
     etc. ne conviennent pas ;
   - des collections, des menus, une page À propos, une page Contact et des
     politiques.
4. Paiement : uniquement Bogus Gateway ou Shopify Payments en mode test.
5. Aucune application, sauf avis clients ou traduction gratuits.
6. Pas de Lorem Ipsum ni de texte de remplissage.

Je peux préparer pour chaque boutique un fichier CSV de produits prêt à
importer. Les photos restent à fournir.

## Étape 4 — Documentation et assistance (toi, avec mon aide)

Shopify exige, avant la mise en vente :

- **Une documentation publique en ligne.** Le texte est prêt dans
  `documentation.md`. Publie-le sur une page web, par exemple un site
  gratuit (Notion public, Google Sites, GitHub Pages), puis donne-moi
  l'adresse : je la reporte dans le thème.
- **Un formulaire d'assistance public :** nom, e-mail, adresse de la
  boutique, description du problème, envoi d'une capture d'écran et réponse
  automatique.
- **Un engagement de support :** répondre aux acheteurs sous 2 jours
  ouvrés et corriger rapidement les bugs.

## Étape 5 — Captures et fiches de vente (toi, textes fournis)

Pour chaque style :

- une capture de l'accueil sur ordinateur (2000 × 2496 px, ou 1000 × 1248) ;
- une capture sur mobile (750 × 1334 px) ;
- sans fond, sans cadre de navigateur, sans texte ajouté.

Les textes des fiches (description, fonctions, public visé) sont prêts en
anglais dans `listing.md`.

## Étape 6 — Prix

Shopify impose un prix entre 100 et 500 $, par tranches de 10 $. Shopify
prend 15 % de chaque vente, plus 2,9 % de frais de paiement.

Mon avis de vendeur : Lanterne a toutes les fonctions obligatoires plus 5
fonctions saisonnières et cadeaux, mais c'est un premier thème, sans avis
clients, sur une niche. Un prix **milieu de gamme** est cohérent. Le prix
inclut le support : compte le temps que tu y passeras. La décision finale
t'appartient.

## Étape 7 — Soumission

1. Je fabrique `dist/lanterne-theme-store.zip`. Le script le refuse tant
   que les étapes 1 et 4 ne sont pas faites.
2. Partner Dashboard → **Themes** → **Submit a theme** → envoyer le zip →
   remplir une fiche par style → **Submit**.
3. Shopify examine le thème en 5 étapes : fonctions, performance et
   accessibilité (Lighthouse), technique, design, vérifications finales.
   Les retours arrivent par e-mail, en anglais. Je peux t'aider à corriger.

Le nom du thème et les noms des styles ne pourront plus être changés après
l'envoi.

## Ce qui reste incertain (honnêtement)

- **L'originalité du design** est jugée par des humains chez Shopify. Les 5
  fonctions saisonnières sont notre meilleur argument, mais l'acceptation
  n'est pas garantie.
- **La performance** doit atteindre une note Lighthouse d'au moins 60, et
  l'accessibilité d'au moins 90. Je l'ai optimisée, mais on ne peut la
  mesurer que sur une vraie boutique : dès que tes boutiques de démo
  existent, envoie-moi un lien d'aperçu et je lance les mesures.
- **Les fonctions qui ont besoin des serveurs de Shopify** (panier, filtres,
  recherche, recommandations) n'ont été testées qu'en simulation. Elles
  sont à vérifier dans une boutique de démo.

## Après la mise en vente

- Support sous 2 jours ouvrés.
- Mises à jour quand Shopify l'exige, avec au moins 4 semaines entre deux
  mises à jour (toutes les 2 semaines pendant les 2 premiers mois).
- Exclusivité : ne pas vendre Lanterne ailleurs (Etsy, ThemeForest, ton
  site…).
