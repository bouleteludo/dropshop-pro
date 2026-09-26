import type { Metadata } from "next";
export const metadata: Metadata = { title: "Conditions générales de vente", robots: { index: false, follow: true } };
export default function CgvPage() {
  return <main className="container max-w-3xl py-12 sm:py-16 prose prose-invert">
    <h1>Conditions générales de vente</h1>
    <p>Cette page est une trame de production : elle doit être complétée et validée avec les conditions réelles de BOO SHOP avant toute vente.</p>
    <h2>1. Vendeur</h2><p>Identité, adresse, immatriculation et coordonnées : voir les mentions légales.</p>
    <h2>2. Produits et prix</h2><p>Les caractéristiques essentielles, le prix TTC applicable et les éventuels frais de livraison doivent être présentés avant la commande.</p>
    <h2>3. Commande et paiement</h2><p>Le paiement est traité par Stripe. Le client doit vérifier le récapitulatif de sa commande avant validation.</p>
    <h2>4. Livraison</h2><p>Le délai réel de livraison, les pays desservis et les frais applicables doivent être indiqués avant la commande.</p>
    <h2>5. Rétractation</h2><p>Le droit légal de rétractation de 14 jours s&apos;applique en principe aux ventes à distance aux consommateurs, sous réserve des exceptions légales. Voir la page Rétractation.</p>
    <h2>6. Garanties légales</h2><p>Les garanties légales de conformité et contre les vices cachés s&apos;appliquent selon les conditions prévues par la loi.</p>
    <h2>7. Réclamations et litiges</h2><p>Ajouter ici la procédure de réclamation, les coordonnées du vendeur et les informations de médiation applicables.</p>
  </main>;
}
