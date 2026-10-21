# BOO SHOP — plan de lancement rentable

Cette version vise la conversion et la discipline commerciale, pas le remplissage du catalogue.

## Règles commerciales

1. Ne lancer que des produits démontrables en vidéo.
2. Écarter les produits avec marge trop faible, livraison trop incertaine ou fort risque de retour.
3. Garder une collection courte et lisible.
4. Utiliser un produit vedette pour concentrer le trafic et les créatifs.
5. Pousser le panier moyen avec un seuil de livraison offerte configurable.
6. Ne jamais afficher de faux avis, faux stocks, fausses réductions ou fausses urgences.
7. Tester l'achat réel de bout en bout avant publicité.

## Paramètres à renseigner

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL`
- `NEXT_PUBLIC_SHIPPING_PRICE_EUR`
- `NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_EUR`
- `NEXT_PUBLIC_DELIVERY_ESTIMATE`
- `CJ_MARKUP_MULTIPLIER`
- identité légale (`LEGAL_*`)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `DATABASE_URL`
- `CJ_API_KEY`
- `ADMIN_PASSWORD`

## Séquence de lancement

1. Importer 5 à 10 produits maximum.
2. Choisir 1 produit vedette avec vidéo exploitable.
3. Vérifier coût CJ + transport + frais de paiement + coût de retour potentiel.
4. Faire un achat Stripe en mode test.
5. Vérifier le webhook et la décrémentation de stock.
6. Renseigner les mentions légales, CGV, politique de confidentialité et rétractation.
7. Configurer domaine, analytics et pixels avec la gestion du consentement adaptée.
8. Publier des vidéos courtes organiques.
9. Ne mettre du budget publicitaire que sur les créatifs qui montrent déjà un signal de demande.

## Important

La boutique ne doit pas être présentée comme prête juridiquement ou commercialement tant que les champs légaux, les conditions de livraison/retour et les clés de paiement/production ne sont pas renseignés et testés.
