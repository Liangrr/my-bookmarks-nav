export default function Loading() {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "72px 16px",
      }}
      aria-busy
      aria-live="polite"
    >
      <div
        className="animate-pulse"
        style={{ display: "flex", flexDirection: "column", gap: 14 }}
      >
        <div
          style={{
            height: 28,
            width: "42%",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-card)",
          }}
        />
        <div
          style={{
            height: 14,
            width: "68%",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-card)",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 20,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: 110,
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                background: "var(--bg-card)",
              }}
            />
          ))}
        </div>
      </div>

      <p
        style={{
          marginTop: 32,
          textAlign: "center",
          fontSize: 13,
          color: "var(--text-tertiary)",
        }}
      >
        正在加载…
      </p>
    </div>
  );
}
