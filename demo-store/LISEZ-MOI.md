# Boutique de démonstration Lanterne

Fichier : `lanterne-produits-demo.csv` — 16 produits, 24 lignes (variantes comprises).

## Import
Admin Shopify → Produits → Importer → choisir le CSV → Importer.
Les images ne sont pas incluses : ajoute tes propres photos (ou des images libres de droits) produit par produit.

## Collections (Produits → Collections → Créer, type « automatisée »)
| Collection | Condition |
|---|---|
| Costumes enfants | Étiquette est égale à `costumes-enfants` |
| Costumes adultes | Étiquette est égale à `costumes-adultes` |
| Décorations | Étiquette est égale à `decorations` |
| Accessoires | Étiquette est égale à `accessoires` |
| Promotions (facultatif) | Étiquette est égale à `promo` |

## Cas montrés au relecteur
- Promo : Squelette géant 150 cm (49,90 au lieu de 69,90), Chapeau de sorcière (14,90 au lieu de 19,90)
- Produit épuisé : Costume de Faucheuse
- Variante épuisée : Robe de sorcière gothique, taille L
- Plusieurs variantes : Costume de petit sorcier, Robe de sorcière gothique, Manteau de comte Dracula
- Carte cadeau : à créer à la main (Produits → Cartes cadeaux)

## Page d'accueil (éditeur de thème)
Collections du bloc « Shop by category » : les 4 collections ci-dessus.
Collection du bloc « Selected pieces » : Décorations ou une collection « Tous les produits ».
Produit vedette : Robe de sorcière gothique.
Les prix sont en euros dans le fichier ; adapte-les si ta devise est différente.
