import { ImageResponse } from "next/og";

export const alt = "Boo Shop — Objets Halloween premium";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 0%, #1a120b 0%, #08090b 60%)",
          color: "#f6f1ea",
          fontFamily: "serif",
          textAlign: "center",
          padding: 80,
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 8, color: "#d98a4f", marginBottom: 30 }}>
          ÉDITION HALLOWEEN · LIMITÉE
        </div>
        <div style={{ fontSize: 96, lineHeight: 1.05, letterSpacing: -2 }}>
          L&apos;obscurité, avec goût.
        </div>
        <div style={{ fontSize: 26, color: "#a89e90", marginTop: 40, maxWidth: 800 }}>
          Décoration, masques et accessoires — jusqu&apos;au 1er novembre.
        </div>
      </div>
    ),
    { ...size },
  );
}
