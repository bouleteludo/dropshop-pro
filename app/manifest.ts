import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BOO SHOP",
    short_name: "BOO SHOP",
    description: "Boutique saisonnière BOO SHOP.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090b",
    theme_color: "#08090b",
    lang: "fr",
  };
}
