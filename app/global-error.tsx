"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0a09",
          color: "#fafaf9",
          fontFamily: "system-ui, sans-serif",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#f59e0b", fontSize: "0.875rem", letterSpacing: "0.1em" }}>
          ERROR
        </p>
        <h1 style={{ marginTop: "1rem", fontSize: "1.75rem" }}>
          Application error
        </h1>
        <p style={{ marginTop: "0.75rem", color: "#a8a29e", maxWidth: "28rem" }}>
          A critical error occurred. Please refresh or try again later.
        </p>
        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "9999px",
              border: "none",
              background: "#f59e0b",
              color: "#0c0a09",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/en";
            }}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "9999px",
              border: "1px solid #292524",
              background: "transparent",
              color: "#fafaf9",
              cursor: "pointer",
            }}
          >
            Home
          </button>
        </div>
      </body>
    </html>
  );
}
