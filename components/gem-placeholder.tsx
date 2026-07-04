/**
 * Static stand-in for the WebGL hero: three stacked frosted panes. Shown while
 * the three.js chunk loads and on browsers without WebGL. Kept in its own file
 * so it doesn't ship inside the heavy chunk it covers.
 */
export default function GemPlaceholder() {
  return (
    <div aria-hidden className="absolute inset-0 flex items-center justify-center">
      <div className="relative h-52 w-52 sm:h-64 sm:w-64">
        {[
          "rotate-[-14deg] scale-95 opacity-50",
          "rotate-[-4deg] opacity-70",
          "rotate-[8deg] opacity-90",
        ].map((cls, i) => (
          <div
            key={i}
            className={`absolute inset-0 rounded-[2.2rem] border border-white/50 ${cls}`}
            style={{
              background:
                "linear-gradient(135deg, rgba(219,228,255,0.85), rgba(46,77,255,0.28))",
              backdropFilter: "blur(6px)",
              boxShadow: "0 24px 60px rgba(46,77,255,0.18)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
