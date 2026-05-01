import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#4F9598",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 800,
          fontSize: 12,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.06em",
        }}
      >
        MCQ
      </div>
    ),
    { ...size },
  );
}
