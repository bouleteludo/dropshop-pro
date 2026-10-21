# BOO SHOP — thèmes visuels

Le projet contient cinq thèmes prêts et activables depuis `/admin/themes` :

- Halloween — visuel BOO SHOP gothique validé.
- Noël — rouge profond, vert sapin, or, neige et scène cinématique.
- Pâques — ivoire, vert mousse, or vieilli et ambiance printanière.
- Saint-Valentin — rouge profond, prune et or rosé.
- Été — sable chaud, bleu pétrole et lumière dorée.

Le thème actif est enregistré dans `StoreSetting` (`activeTheme`). Si ce réglage n'existe pas encore, le site choisit le thème correspondant à la saison calendaire active.

Le moteur de campagnes `/admin/seasons` reste séparé : il gère les périodes, la priorité et le filtrage saisonnier des produits. Les outils dropshipping de l'admin restent inchangés.
