import type { Metadata } from "next";
import { STORE } from "@/lib/store-config";
export const metadata: Metadata = { title: "Rétractation", robots: { index: false, follow: true } };
export default function RetractationPage() {
  return <main className="container max-w-3xl py-12 sm:py-16 prose prose-invert">
    <h1>Droit de rétractation</h1>
    <p>Pour les ventes à distance aux consommateurs, le délai légal est en principe de 14 jours à compter de la réception du bien, sous réserve des exceptions prévues par la loi.</p>
    <h2>Comment exercer votre droit</h2>
    <p>Envoyez une déclaration claire de votre décision de vous rétracter à {STORE.contactEmail} avant l&apos;expiration du délai. Le formulaire légal peut également être utilisé.</p>
    <h2>Retour et remboursement</h2>
    <p>Les modalités et l&apos;adresse de retour doivent être précisées par BOO SHOP avant toute commande. Les remboursements sont effectués selon les règles légales applicables.</p>
    <h2>À compléter avant mise en ligne</h2>
    <ul><li>Adresse réelle de retour</li><li>Qui supporte les frais de retour</li><li>Exceptions éventuelles applicables à certains produits</li><li>Formulaire type de rétractation</li></ul>
  </main>;
}
