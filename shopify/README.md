# Lanterne — thème Shopify à vendre sur le Theme Store

Les cinq univers saisonniers de BOO SHOP deviennent **Lanterne**, un thème
Shopify à vendre sur le Theme Store, avec 5 styles :

| Style | Saison | Type de boutique visé |
| --- | --- | --- |
| Lanterne | Halloween | Déguisements et articles de fête |
| Sapin | Noël | Décorations et cadeaux de Noël |
| Printemps | Pâques | Fleurs et décoration de printemps |
| Velours | Saint-Valentin | Bijoux et cadeaux romantiques |
| Rivage | Été | Accessoires de plage et d'été |

**Pour vendre :** suivre [`theme-store/GUIDE-SOUMISSION.md`](theme-store/GUIDE-SOUMISSION.md).

## Contenu du dossier

| Chemin | Rôle |
| --- | --- |
| `theme/` | Code du thème : Liquid, CSS, JavaScript, traductions EN/FR |
| `dist/demo/lanterne-<style>.zip` | Un zip par style, à installer dans chaque boutique de démo |
| `dist/lanterne-theme-store.zip` | Zip de soumission, fabriqué seulement quand tout est prêt |
| `dist/boo-shop/` | Les 5 zips BOO SHOP (première version, en français, avec ta marque) pour ta propre boutique |
| `theme-store/` | Guide de soumission (FR), textes des fiches de vente, notes de version et documentation publique (EN) |
| `contenu/textes-legaux.md` | Trames de politiques légales pour ta boutique BOO SHOP |
| `scripts/` | Génération des styles et fabrication des zips |

## Ce qui rend Lanterne unique

- **Calendrier des saisons :** la bannière d'accueil passe automatiquement
  à la bonne saison selon les dates choisies. Dans l'éditeur, cliquer sur une
  saison la prévisualise.
- **Annonces programmées :** chaque message de la barre d'annonce peut avoir
  ses propres dates.
- **Date limite de livraison :** une vraie date réglée par le commerçant.
  Elle s'affiche dans la barre d'annonce, sur la fiche produit et au panier,
  puis disparaît après la date. Désactivée par défaut, pour ne jamais
  afficher une promesse que le commerçant n'a pas faite.
- **Guide cadeaux par budget :** des cartes qui mènent aux produits filtrés
  par prix.
- **Message cadeau** au panier, enregistré avec la commande.

## Règles Shopify respectées

- **Base de code :** Skeleton (la seule acceptée), Online Store 2.0, tous
  les templates et toutes les fonctions obligatoires du Theme Store : filtres,
  recherche prédictive, menus multi-niveaux, pays/langue, paiement accéléré,
  Shop Pay Installments, retrait en magasin, recommandations, médias riches,
  pastilles, prix unitaires, réductions, abonnements, cartes-cadeaux
  (destinataire, QR code, Apple Wallet), Suivre sur Shop,
  `<shopify-account>`, Liquid personnalisé, blocs d'applications.
- **Accessibilité :** clavier, focus visible, contraste ≥ 4,5:1 vérifié sur
  les 20 palettes, animations coupées si le visiteur préfère réduire les
  mouvements.
- **SEO :** titre, description, canonique, Open Graph et données
  structurées.
- **Performance :** images WebP responsives et chargées à la demande,
  JavaScript chargé seulement par les pages qui en ont besoin.
- **Réglages :** rédigés dans le style imposé par Shopify (anglais
  américain, majuscule en début de phrase seulement, pas d'options
  numérotées). Traduction française incluse.
- **Aucune marque dans le thème vendu :** les images encore marquées sont
  bloquées par le script de fabrication.

Validation : `shopify theme check` en mode le plus strict (`theme-check:all`)
→ **0 problème** sur le thème et sur les 5 zips de démo. Le rendu a été
contrôlé en local, sur ordinateur et sur mobile.

## Commandes

```bash
node shopify/scripts/generate-presets.mjs   # régénère les 5 styles (couleurs, accueil, en-tête, pied de page)
node shopify/scripts/package-themes.mjs     # fabrique les zips de démo (+ le zip de soumission si tout est prêt)
npx @shopify/cli theme check --path shopify/theme -C theme-check:all
npx @shopify/cli theme dev --path shopify/theme --store <boutique-demo>.myshopify.com
```

Node 22 ou plus récent.
