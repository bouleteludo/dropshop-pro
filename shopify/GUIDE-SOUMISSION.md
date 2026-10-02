# Vendre tes 5 thèmes sur le Theme Store — guide pas à pas

Ton site BOO SHOP est découpé en **5 thèmes Shopify séparés**, un par univers.
Chacun est vendu à part sur le Theme Store, avec sa propre fiche.

| Univers | Thème | Type de boutique visé | État |
| --- | --- | --- | --- |
| Halloween | **Lanterne** | Déguisements et articles de fête | Code terminé, en attente de ton image et de ta documentation |
| Noël | **Sapin** | Décorations et cadeaux de Noël | À construire |
| Pâques | **Printemps** | Fleurs et décoration de printemps | À construire |
| Saint-Valentin | **Velours** | Bijoux et cadeaux romantiques | À construire |
| Été | **Rivage** | Accessoires de plage et d'été | À construire |

On les fait **chacun leur tour**, de bout en bout.

## Les règles Shopify qu'on respecte pour chaque thème

- **Aucune marque :** pas de « BOO SHOP » dans le thème vendu (logos, textes,
  enseignes sur les images).
- **Vraiment différent des autres :** Shopify refuse un thème qui n'est qu'une
  copie recolorée d'un autre. Chaque thème a donc sa propre mise en page et
  ses propres fonctions, tout en gardant ton ambiance (couleurs, images,
  effets).
- **Seulement ce qui sert au type de boutique visé :** c'est une consigne de
  Shopify. Par exemple, Lanterne a le calendrier des saisons (une boutique de
  fête vend toute l'année), et le guide cadeaux ira dans Sapin.
- **Toutes les fonctions obligatoires :** filtres, recherche, paiement
  accéléré, Shop Pay Installments, retrait en magasin, recommandations,
  cartes-cadeaux, accessibilité, SEO…
- **Contrôles :** `theme-check:all` (le plus strict) sans aucun problème,
  et contraste des couleurs vérifié.

## Pour chaque thème, ce que tu dois faire

### 1. Les images sans marque (toi, avec ChatGPT)

Si l'image du thème montre l'enseigne BOO SHOP, envoie-la à ChatGPT avec :

> Recrée exactement cette image : même scène, même lumière, même cadrage,
> même format 16:9. L'enseigne doit être vierge : aucun texte, aucun nom,
> aucun logo nulle part dans l'image.

Envoie-moi le résultat : je l'optimise et je l'intègre. Garde une trace de sa
création, car Shopify peut demander la preuve de tes droits.

| Thème | Image à refaire |
| --- | --- |
| Lanterne | Halloween (enseigne « BOO SHOP » au-dessus de la porte) |
| Sapin | Noël (enseignes « BOO SHOP ») |
| Printemps | Pâques (enseignes et ardoise) |
| Velours | Aucune, l'image est déjà propre |
| Rivage | Aucune, l'image a déjà été retouchée |

### 2. Le compte Shopify Partner (une seule fois)

Crée un compte gratuit sur partners.shopify.com. Son nom devient le nom
d'auteur affiché sur le Theme Store : donne-le-moi et je le reporte dans les
thèmes.

### 3. La boutique de démo

1. Dans le Partner Dashboard, va dans **Boutiques** et crée une boutique de
   développement. Elle est gratuite.
2. Boutique en ligne → Thèmes → Importer `shopify/dist/demo/<thème>.zip` →
   Publier.
3. Remplis-la comme une vraie boutique du secteur visé : produits réalistes
   avec variantes, un produit en promotion, un produit épuisé, des photos dont
   tu as les droits **sans texte incrusté**, des collections, des menus, une
   page À propos, une page Contact et des politiques.
4. Paiement : uniquement Bogus Gateway ou Shopify Payments en mode test.
   Aucune application, sauf avis clients ou traduction gratuits. Pas de
   Lorem Ipsum.

Je peux te préparer un fichier de produits à importer ; les photos restent
à fournir.

### 4. La documentation et l'assistance

- Publie le texte de `shopify/docs/<thème>/documentation.md` sur une page web
  publique (par exemple Notion, Google Sites ou GitHub Pages), puis
  donne-moi l'adresse.
- Mets en ligne un formulaire d'assistance public : nom, e-mail, adresse de
  la boutique, description du problème, capture d'écran, réponse
  automatique.
- Engagement : répondre aux acheteurs sous 2 jours ouvrés.

### 5. Les captures et la fiche de vente

- Une capture de l'accueil sur ordinateur (2000 × 2496 px ou 1000 × 1248) et
  une sur mobile (750 × 1334 px), sans fond, sans cadre de navigateur, sans
  texte ajouté.
- Les textes de la fiche sont prêts en anglais dans
  `shopify/docs/<thème>/listing.md`.
- Prix : entre 100 et 500 $, par tranches de 10 $. Shopify prend 15 %, plus
  2,9 % de frais de paiement. Le prix doit couvrir le support.

### 6. La soumission

1. Je fabrique `shopify/dist/theme-store/<thème>.zip`. Le script refuse de le
   produire tant que l'image marquée ou l'adresse de documentation manquent.
2. Partner Dashboard → **Themes** → **Submit a theme** → envoie le zip →
   coche l'accord Partner → **Upload file** → remplis la fiche → **Submit**.
3. Shopify examine le thème en 5 étapes : fonctions, performance et
   accessibilité (Lighthouse), technique, design, vérifications finales. Les
   retours arrivent par e-mail, en anglais, et je t'aide à corriger.

Le nom du thème ne pourra plus être changé après l'envoi.

## Ce qui reste incertain (honnêtement)

- **Le design est jugé par des humains chez Shopify.** Les fonctions propres
  à chaque thème sont notre meilleur argument, mais l'acceptation n'est pas
  garantie.
- **La performance et l'accessibilité** (notes Lighthouse : au moins 60 et
  90) ne se mesurent que sur une vraie boutique : envoie-moi un lien
  d'aperçu de ta boutique de démo et je lance les mesures.
- **Le panier, les filtres, la recherche et les recommandations** n'ont été
  testés qu'en simulation : à vérifier dans la boutique de démo.

## Après la mise en vente

- Support sous 2 jours ouvrés.
- Mises à jour quand Shopify l'exige, avec au moins 4 semaines entre deux
  mises à jour (toutes les 2 semaines pendant les 2 premiers mois).
- Exclusivité : ne pas vendre ces thèmes ailleurs.
