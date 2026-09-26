# BOO SHOP

Boutique saisonnière Next.js pensée pour Vercel : le storefront change de thème, de messages et de sélection selon la saison, tandis qu'un cockpit `/admin` centralise catalogue, commandes, recherche produit et diffusion commerciale.

## Ce qui est inclus

- Moteur saisonnier : Halloween, Noël, Saint-Valentin, Pâques, Été et une inter-saison neutre ; bascule automatique par dates et thème dynamique.
- Cockpit admin : dashboard, saisons, produits, commandes, recherche, eBay et Google Shopping.
- Recherche eBay via l'API Browse quand les clés développeur sont configurées.
- Publication eBay via l'Inventory API quand le jeton vendeur, la catégorie, l'emplacement et les business policies sont configurés.
- Google Trends : ouverture directe de l'exploration France à partir de la requête étudiée, sans inventer de score de tendance.
- Flux Google Merchant Center dynamique à `/google-shopping.xml`.
- CJ Dropshipping : recherche/import/synchronisation, avec synchronisation quotidienne préparée pour Vercel Cron.
- Stripe Checkout + webhook idempotent + gestion stock.
- Protection de `/admin` et des routes d'écriture admin.
- Import d'URL public durci contre les destinations locales/privées, HTTPS uniquement et redirections automatiques désactivées.
- Finition UX/UI : navigation mobile complète, focus clavier, lien d'évitement, sections sémantiques, manifest web, metadata/canonical, JSON-LD boutique/site/produit/breadcrumb, images lazy/décodage asynchrone et fallback d'images robuste.
- Centre de recherche corrigé pour gérer la watchlist sans erreur d'état et avec gestion d'erreurs plus explicite.

## Variables principales

Voir `.env.example`. Les familles utilisées sont `EBAY_*`, `GOOGLE_MERCHANT_*`, `CRON_SECRET`, Stripe, CJ et les informations légales/commerce.

## Déploiement

1. Configurer PostgreSQL, Stripe, CJ et `ADMIN_PASSWORD` dans Vercel.
2. Renseigner les variables eBay si la recherche/publication eBay est souhaitée.
3. Déclarer `https://<domaine>/google-shopping.xml` dans Merchant Center comme source de données.
4. Configurer `CRON_SECRET` pour la synchronisation CJ planifiée.
5. Compléter les informations légales avant ouverture publique.

Le projet conserve `prisma db push` dans le script de build d'origine pour appliquer les modèles (`Season`, `ResearchCandidate`) et les nouveaux champs produit.
