# DropShop Pro

Plateforme e-commerce autonome (Next.js + Prisma) avec import automatique de
produits depuis [CJdropshipping](https://developers.cjdropshipping.com/) via
leur API officielle v2.

## Stack

- **Next.js 16** (App Router, TypeScript) — front + back dans le même projet
- **Prisma** + **Postgres** (une base de données serverless comme le SQLite
  fichier ne survit pas au système de fichiers éphémère de Vercel)
- **Tailwind CSS** pour le style

## Déploiement

Connecté à Vercel via l'intégration Git native — chaque push sur cette
branche redéploie automatiquement. Variables d'environnement configurées
dans Vercel (Project Settings → Environment Variables) :

- `DATABASE_URL` = URL de connexion Postgres (créée depuis l'onglet
  **Storage** du projet Vercel → **Create Database** → **Postgres** ; copie
  la valeur de `POSTGRES_PRISMA_URL` générée dans `DATABASE_URL`)
- `CJ_API_KEY` = ta clé CJ Dropshipping (nécessaire pour que
  `/admin/import` fonctionne — configurée en prod)
- `ADMIN_PASSWORD` = mot de passe qui protège `/admin` (HTTP Basic Auth, voir
  `middleware.ts`) — n'importe quel identifiant fonctionne, seul le mot de
  passe est vérifié

À chaque build, `prisma db push` synchronise automatiquement le schéma avec
la base — pas de fichier de migration à gérer pour ce projet.

## Démarrer en local

```bash
npm install
cp .env.example .env   # puis renseigne DATABASE_URL et CJ_API_KEY
npx prisma db push
npm run dev
```

Ouvre http://localhost:3000 pour la boutique, et
http://localhost:3000/admin/import pour rechercher et importer des produits
CJ.

## Intégration CJ Dropshipping

- `lib/cj-client.ts` : client pour l'API CJ v2 (auth par `apiKey` →
  `accessToken` mis en cache, recherche produits, détail produit, stock par
  variante, création de commande).
- `app/api/cj/search` : proxy la recherche produit CJ (garde la clé API côté
  serveur, jamais exposée au navigateur).
- `app/api/cj/import` : importe un produit CJ dans la base locale (`Product`)
  avec un prix de vente calculé via une marge (`MARKUP_MULTIPLIER`, à ajuster
  dans `app/api/cj/import/route.ts`).
- `app/api/cj/sync` : rafraîchit prix et stock de tous les produits déjà
  importés — à brancher sur un cron (ex: tâche planifiée toutes les heures)
  une fois en production.
- `/admin/import` : interface pour chercher un mot-clé sur CJ et importer les
  produits en un clic.

### ⚠️ À vérifier avant la mise en prod

Le domaine `developers.cjdropshipping.com` est bloqué par le proxy réseau de
cet environnement de développement — je n'ai donc pas pu revérifier en direct
la doc officielle. Le client a été écrit à partir de la structure connue de
l'API CJ v2 (endpoints, noms de champs), mais CJ modifie parfois ces détails.
**Avant de mettre en prod : crée ta clé API sur CJ (mon compte CJ → API →
Add API), teste chaque appel (`getAccessToken`, `/product/list`,
`/product/query`, `/product/stock/queryByVid`, `/shopping/order/createOrderV2`)
et ajuste les noms de champs dans `lib/cj-client.ts` si un appel échoue.**

## Ce qui n'est pas encore fait

- Paiement (Stripe/PayPal) — pas encore branché, `Order`/`OrderItem` existent
  dans le schéma mais rien ne crée de commande côté storefront pour l'instant.
- Panier persistant — la fiche produit n'a pas encore de bouton "ajouter au
  panier" fonctionnel.
- Passage de commande vers CJ (`createCjOrder`) une fois un paiement reçu.

## Structure

```
app/
  page.tsx                # accueil boutique
  products/[id]/page.tsx  # fiche produit
  admin/import/page.tsx   # recherche + import CJ
  api/cj/                 # routes serveur qui appellent l'API CJ
lib/
  cj-client.ts            # client API CJ
  prisma.ts               # instance Prisma partagée
prisma/
  schema.prisma           # modèles Product / Order / OrderItem
```
