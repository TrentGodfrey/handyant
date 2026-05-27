import { ImageResponse } from "next/og";

// Maskable icons need ~20% safe-zone padding so the mask doesn't crop content.
// Background fills the full canvas; text sits in the inner safe area.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function IconMaskable() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#2563EB",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 800,
          fontSize: 180,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.05em",
        }}
      >
        HA
      </div>
    ),
    { ...size },
  );
}
