import type { Metadata } from "next";

export const metadata: Metadata = { title: "Droit de rétractation" };

function env(key: string, fallback = "À compléter") {
  return process.env[key] ?? fallback;
}

export default function RetractationPage() {
  const contactEmail = env("NEXT_PUBLIC_CONTACT_EMAIL");

  return (
    <main className="container max-w-3xl py-12 sm:py-16">
      <h1 className="font-display text-3xl text-bone-50 mb-8">Droit de rétractation</h1>
      <div className="prose prose-invert prose-headings:font-display prose-headings:text-bone-50 prose-p:text-bone-200/80 max-w-none">
        <p>
          Pour toute commande passée à distance, vous disposez d&apos;un délai légal de 14 jours à compter de
          la réception du produit pour exercer votre droit de rétractation, sans avoir à justifier de
          motif.
        </p>

        <h2>Comment exercer votre droit</h2>
        <p>
          Envoyez-nous une déclaration claire de votre décision de vous rétracter par email à{" "}
          {contactEmail}, avant l&apos;expiration du délai de 14 jours.
        </p>

        <h2>Retour et remboursement</h2>
        <p>
          Une fois votre rétractation reçue, vous disposez de 14 jours pour nous retourner le produit. Le
          remboursement (prix du produit) intervient dans les 14 jours suivant la réception du retour ou
          la preuve d&apos;expédition, selon la première de ces dates.
        </p>

        <h2>Frais de retour</h2>
        <p>Les frais de retour sont à la charge du client, sauf mention contraire indiquée sur la commande.</p>

        <h2>Exceptions</h2>
        <p>
          Le droit de rétractation ne s&apos;applique pas aux produits personnalisés, descellés (pour des
          raisons d&apos;hygiène) après livraison, ou confectionnés selon les spécifications du client,
          conformément à l&apos;article L.221-28 du Code de la consommation.
        </p>
      </div>
    </main>
  );
}
