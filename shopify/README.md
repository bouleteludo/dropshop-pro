# Thèmes Shopify — 5 thèmes séparés à vendre sur le Theme Store

Ton site BOO SHOP est découpé en 5 thèmes Shopify indépendants, un par
univers. Ils gardent ton ambiance (couleurs, images, polices, effets), sans la
marque BOO SHOP, et chacun a sa propre mise en page et ses propres fonctions.

| Univers | Thème | Type de boutique visé | Dossier | État |
| --- | --- | --- | --- | --- |
| Halloween | Lanterne | Déguisements et fêtes | `themes/lanterne` | Code terminé |
| Noël | Sapin | Décorations et cadeaux de Noël | `themes/sapin` | À construire |
| Pâques | Printemps | Fleurs et décoration de printemps | `themes/printemps` | À construire |
| Saint-Valentin | Velours | Bijoux et cadeaux romantiques | `themes/velours` | À construire |
| Été | Rivage | Plage et accessoires d'été | `themes/rivage` | À construire |

**Pour vendre :** suivre [`GUIDE-SOUMISSION.md`](GUIDE-SOUMISSION.md).

## Contenu

| Chemin | Rôle |
| --- | --- |
| `themes/<thème>/` | Code du thème : Liquid, CSS, JavaScript, traductions EN/FR |
| `docs/<thème>/` | Documentation publique et textes de la fiche de vente (anglais) |
| `dist/demo/<thème>.zip` | Zip à installer dans la boutique de démo |
| `dist/theme-store/<thème>.zip` | Zip de soumission, fabriqué seulement quand tout est prêt |
| `dist/boo-shop/` | Les 5 zips BOO SHOP (première version, avec ta marque) pour ta propre boutique |
| `contenu/textes-legaux.md` | Trames de politiques légales pour ta boutique BOO SHOP |
| `scripts/` | Fabrication des zips et contrôle des contrastes |

## Lanterne (Halloween)

- **Ambiance :** nuit sombre, accents cuivre, braises qui s'élèvent, police
  Marcellus.
- **Fonctions propres :**
  - calendrier des saisons : la bannière d'accueil change toute seule selon
    les dates, avec aperçu dans l'éditeur ;
  - annonces programmées ;
  - date limite de commande (réelle, désactivée par défaut).
- **Fonctions obligatoires du Theme Store :** filtres, recherche prédictive,
  menus multi-niveaux, pays/langue, paiement accéléré, Shop Pay
  Installments, retrait en magasin, recommandations, médias riches,
  pastilles, prix unitaires, réductions, abonnements, cartes-cadeaux,
  Suivre sur Shop, compte client, Liquid personnalisé, blocs d'applications.
- **Validation :** `theme-check:all` sans aucun problème, contrastes
  conformes, rendu contrôlé sur ordinateur et mobile.
- **Avant la soumission :** remplacer l'image Halloween (enseigne BOO SHOP)
  et renseigner l'adresse de la documentation. Le script de fabrication
  bloque tant que ce n'est pas fait.

## Commandes

```bash
node shopify/scripts/package-themes.mjs [thème]   # zips de démo (+ zip de soumission si prêt)
node shopify/scripts/check-contrast.mjs           # contraste de toutes les palettes
npx @shopify/cli theme check --path shopify/themes/lanterne -C theme-check:all
npx @shopify/cli theme dev --path shopify/themes/lanterne --store <boutique-demo>.myshopify.com
```

Node 22 ou plus récent.
