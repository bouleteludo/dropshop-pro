# BOO SHOP — thèmes Shopify

Les cinq univers du site Next.js (Halloween, Noël, Pâques, Saint-Valentin, Été)
sont livrés ici sous forme de **thème Shopify Online Store 2.0** prêt à
téléverser. Un seul code source, cinq styles saisonniers.

| Saison | Fichier à téléverser | Style (preset) dans l'éditeur |
| --- | --- | --- |
| Halloween | `dist/boo-shop-halloween.zip` | Lanterne |
| Noël | `dist/boo-shop-noel.zip` | Sapin |
| Pâques | `dist/boo-shop-paques.zip` | Printemps |
| Saint-Valentin | `dist/boo-shop-saint-valentin.zip` | Velours |
| Été | `dist/boo-shop-ete.zip` | Rivage |

Chaque zip contient le thème complet avec la saison déjà appliquée : couleurs,
polices, logo et image saisonniers, page d'accueil, barre d'annonce, pied de
page. Les quatre autres styles restent disponibles dans
**Personnaliser → Paramètres du thème → Style du thème**.

## Installer un thème

1. Admin Shopify → **Boutique en ligne → Thèmes**.
2. **Ajouter un thème → Importer un fichier zip**, choisir le zip de la saison.
3. Sur le thème importé : **Personnaliser** pour vérifier, puis **Publier**.

Pour changer de saison : publier un autre zip, ou garder un seul thème et
changer de style dans l'éditeur. Shopify conserve jusqu'à 20 thèmes dans la
bibliothèque : les cinq peuvent y rester en attente.

## À faire une fois dans Shopify

Le thème ne crée pas de contenu dans la boutique ; ces éléments se règlent dans
l'admin :

- **Menus** (Boutique en ligne → Navigation) : le thème utilise `main-menu`
  (en-tête, sous-menus sur 3 niveaux) et `footer` (pied de page). Les deux
  existent par défaut.
- **Collections** : créer Masques, Décoration, Costumes, Accessoires, puis les
  choisir dans la section « Choisir son univers » de l'accueil.
- **Produit vedette** : choisir un produit dans la section « Produit en
  vedette ». Tant qu'il n'y en a pas, un exemple s'affiche.
- **Politiques** (Paramètres → Politiques) : remboursement, confidentialité,
  conditions de vente, expédition, mentions légales. Les liens s'affichent
  automatiquement en bas de page. Des textes de départ sont dans
  [`contenu/textes-legaux.md`](contenu/textes-legaux.md), à compléter avec les
  informations réelles de l'entreprise.
- **Réseaux sociaux** : Paramètres du thème → Réseaux sociaux (vides par
  défaut, comme l'exige Shopify).
- **Logo** : les logos BOO SHOP saisonniers sont intégrés. Un logo téléversé
  dans Paramètres du thème → Logo les remplace.

## Règles Shopify respectées

Le thème suit les
[exigences du Theme Store](https://shopify.dev/docs/storefronts/themes/store/requirements),
qui sont les plus strictes de Shopify :

- Base **Skeleton** (seule base autorisée), architecture Online Store 2.0 :
  templates JSON, sections partout, groupes de sections en-tête et pied de
  page, section et blocs Liquid personnalisé, blocs d'applications
  (`@app`) sur la fiche produit, le produit vedette et le pied de page.
- Tous les templates obligatoires : accueil, produit, collection, liste des
  collections, panier, recherche, page, contact, blog, article, 404, mot de
  passe, carte-cadeau (code, QR code, Apple Wallet).
- Fonctionnalités obligatoires : filtres et tri (collection et recherche),
  recherche prédictive, menus multi-niveaux, sélecteurs pays/devise et
  langue, newsletter, boutons de paiement accéléré, paiement en plusieurs fois
  (Shop Pay Installments), retrait en magasin, recommandations de produits
  associés et complémentaires, médias riches (vidéo, YouTube/Vimeo, 3D),
  images de variantes, pastilles de couleur, prix unitaires, réductions et
  abonnements dans le panier, envoi de carte-cadeau à un destinataire,
  bouton « Suivre sur Shop », composant compte client `<shopify-account>`.
- Accessibilité : navigation complète au clavier, focus visible, lien
  « Aller au contenu », champs étiquetés, zones tactiles d'au moins 24 px,
  animations coupées si le visiteur préfère réduire les mouvements.
  **Contraste vérifié pour les 20 palettes (≥ 4,5:1)**.
- SEO : titre, description, URL canonique, Open Graph, Twitter, données
  structurées produit et article.
- Performance : images responsives et chargées à la demande, images
  saisonnières converties en WebP (3,3 Mo au lieu de 13 Mo), JavaScript
  découpé par page (moins de 10 Ko chargés partout), CSS natif non minifié.
- Textes de l'éditeur en anglais et en français, textes de la boutique en
  français et en anglais.

Validation effectuée : `shopify theme check` en mode le plus strict
(`theme-check:all`) → **0 problème** sur le thème et sur chacun des cinq zips.

### Ce qui reste à vérifier sur la vraie boutique

Le rendu a été contrôlé en local (simulation Liquid + navigateur, ordinateur
et mobile), pas sur une boutique Shopify : la boutique connectée refusait
l'accès API (problème de facturation ou d'abonnement à régler dans l'admin).
Avant de publier, tester dans l'aperçu du thème : changement de variante,
mise à jour du panier, recherche prédictive, filtres. Ces fonctions
s'appuient sur les services de Shopify et ne s'exécutent qu'en ligne.

### Image « Été »

L'image d'origine contenait du texte et un faux bouton incrustés (« Spécial
Été… Découvrir la collection »), ce que Shopify refuse. La zone a été
remplacée par un flou progressif tiré de l'image elle-même. Pour une version
parfaite, régénérer l'image sans texte et la téléverser dans la bannière.

## Publier sur le Theme Store (vendre le thème)

Possible plus tard, mais ce n'est pas un simple envoi de fichier :

- compte **Shopify Partner** et soumission par le Partner Dashboard ;
- thème **exclusif** au Theme Store, design jugé **unique** face aux thèmes
  existants (examen manuel en 5 étapes) ;
- une boutique de démonstration complète par style, captures d'écran,
  documentation publique et formulaire d'assistance (réponse sous 2 jours
  ouvrés) ;
- **aucun nom de marque** dans le thème : retirer logos et images BOO SHOP,
  textes de démonstration neutres, et droits prouvés sur chaque image.

La structure attendue (dossier `listings/` avec un sous-dossier par style)
est déjà en place : `node shopify/scripts/package-themes.mjs --theme-store`
produit `dist/lanterne-theme-store.zip`.

## Modifier le thème

- Sources : `theme/` (Liquid, CSS, JavaScript, traductions dans `locales/`).
- Contenu de chaque saison : `theme/config/settings_data.json` (couleurs,
  polices) et `theme/listings/<style>/` (accueil, en-tête, pied de page) ; le
  style Lanterne (Halloween) utilise `theme/templates/` et `theme/sections/`.
- Reconstruire les zips : `node shopify/scripts/package-themes.mjs` (Node 22+).
- Vérifier : `npx @shopify/cli theme check --path shopify/theme`.
- Travailler en direct sur une boutique :
  `npx @shopify/cli theme dev --path shopify/theme --store <boutique>.myshopify.com`.
