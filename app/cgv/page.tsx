import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default function CgvPage() {
  return (
    <main className="container max-w-3xl py-12 sm:py-16">
      <h1 className="font-display text-3xl text-bone-50 mb-8">Conditions générales de vente</h1>
      <div className="prose prose-invert prose-headings:font-display prose-headings:text-bone-50 prose-p:text-bone-200/80 max-w-none">
        <p>
          Cette page doit être relue et complétée avec les conditions réelles de la boutique avant toute
          vente — voir les mentions légales pour l&apos;identité du vendeur.
        </p>

        <h2>1. Vendeur</h2>
        <p>Identité, adresse et immatriculation : voir la page Mentions légales.</p>

        <h2>2. Produits et prix</h2>
        <p>
          Les prix affichés sont en euros, toutes taxes comprises. Les frais de livraison sont indiqués
          avant la validation de la commande.
        </p>

        <h2>3. Commande et paiement</h2>
        <p>
          Le paiement est traité par Stripe. Le client vérifie le récapitulatif de sa commande (produits,
          quantités, prix, livraison) avant de valider le paiement.
        </p>

        <h2>4. Livraison</h2>
        <p>
          Les produits sont expédiés depuis les entrepôts de nos fournisseurs. Le délai de livraison estimé
          est indiqué à l&apos;étape de paiement et peut varier selon la destination.
        </p>

        <h2>5. Droit de rétractation</h2>
        <p>
          Le droit légal de rétractation de 14 jours s&apos;applique aux ventes à distance, sous réserve des
          exceptions légales. Voir la page Rétractation pour les modalités.
        </p>

        <h2>6. Garanties légales</h2>
        <p>
          Les garanties légales de conformité (articles L.217-3 et suivants du Code de la consommation) et
          contre les vices cachés (articles 1641 et suivants du Code civil) s&apos;appliquent à toutes les
          commandes.
        </p>

        <h2>7. Réclamations et litiges</h2>
        <p>
          Toute réclamation peut être adressée par email (voir Mentions légales). En cas de litige non
          résolu, le consommateur peut recourir au médiateur de la consommation mentionné dans les
          Mentions légales.
        </p>
      </div>
    </main>
  );
}
