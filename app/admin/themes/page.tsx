import { ThemeAdmin } from "@/components/ThemeAdmin";
import { getActiveThemeId } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function AdminThemesPage() {
  const activeTheme = await getActiveThemeId();
  return (
    <main>
      <p className="text-xs tracking-[0.3em] uppercase text-ember-400">Apparence</p>
      <h2 className="mt-2 font-display text-3xl sm:text-4xl text-bone-50">Thèmes visuels</h2>
      <p className="mt-3 mb-8 max-w-3xl text-sm leading-relaxed text-bone-400">
        Active un univers visuel sans remplacer le catalogue, le panier, Stripe, CJ, les commandes ni les outils de recherche produit. Le thème choisi pilote aussi la sélection saisonnière de la vitrine.
      </p>
      <ThemeAdmin activeTheme={activeTheme} />
    </main>
  );
}
