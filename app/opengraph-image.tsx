import { ImageResponse } from "next/og";

export const alt = "Perch";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f7f3ea",
          color: "#211b17",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexDirection: "column",
            gap: "34px",
            width: "100%",
          }}
        >
          <div
            style={{
              color: "#35684e",
              fontFamily: "Georgia, serif",
              fontSize: 112,
              lineHeight: 1,
            }}
          >
            Perch
          </div>
          <div
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: 0,
              lineHeight: 1.08,
              maxWidth: 860,
            }}
          >
            Automatic guest Wi-Fi for coffee shops.
          </div>
          <div
            style={{
              color: "#4f4a43",
              fontFamily: "Arial, sans-serif",
              fontSize: 30,
              lineHeight: 1.35,
              maxWidth: 840,
            }}
          >
            Give every guest a free hour, then sell paid extensions through the UniFi network you already run.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
