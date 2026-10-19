// Decorative strawberry-cream cup drawn in SVG (from the approved "Fresh
// Classic" concept). `id` keeps the gradient/clip ids unique if the cup is
// ever rendered twice on one page.
const BERRIES = [[62, 170, 10], [88, 200, 9], [120, 176, 10], [140, 208, 9], [78, 226, 8], [110, 232, 10], [132, 150, 8], [70, 138, 7], [100, 156, 8]];

export default function CupArt({ id = 'cup', className = 'cupart' }) {
  return (
    <svg className={className} viewBox="0 0 200 270" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`cp${id}`}><path d="M48 78 H152 L136 244 Q135 254 124 254 H76 Q65 254 64 244 Z" /></clipPath>
        <linearGradient id={`gw${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".25" stopColor="#fff" stopOpacity=".55" />
          <stop offset=".4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`st${id}`} cx=".35" cy=".3">
          <stop offset="0" stopColor="#ff6b83" />
          <stop offset=".7" stopColor="#e3173b" />
          <stop offset="1" stopColor="#a30f2a" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#cp${id})`}>
        <rect x="40" y="70" width="130" height="190" fill="#FFF3EA" />
        <rect x="40" y="108" width="130" height="50" fill="#F6BCCB" />
        <rect x="40" y="158" width="130" height="30" fill="#FFF3EA" />
        <rect x="40" y="188" width="130" height="80" fill="#C8183A" opacity=".92" />
        {BERRIES.map((p, i) => (
          <ellipse key={i} className="cup-berry" style={{ animationDelay: `${(i * 0.3).toFixed(1)}s` }} cx={p[0]} cy={p[1]} rx={p[2] + 4} ry={p[2]} fill={`url(#st${id})`} transform={`rotate(${i * 23} ${p[0]} ${p[1]})`} />
        ))}
        <path className="cup-sheen" d="M48 78 H152 L136 244 L120 244 L134 78 Z" fill={`url(#gw${id})`} />
      </g>
      <path d="M48 78 H152 L136 244 Q135 254 124 254 H76 Q65 254 64 244 Z" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth="3" />
      <ellipse cx="100" cy="74" rx="56" ry="15" fill="#FFFDF8" />
      <ellipse cx="100" cy="56" rx="43" ry="14" fill="#FFF6EA" />
      <ellipse cx="100" cy="40" rx="29" ry="11" fill="#FFFDF8" />
      <path d="M92 31 Q100 12 108 31 Z" fill="#FFFDF8" />
      <path d="M52 70 Q80 82 100 66 T148 68" stroke="#5a2a14" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      <path d="M62 52 Q90 62 110 50 T140 52" stroke="#5a2a14" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <g className="cup-topberry">
        <ellipse cx="124" cy="30" rx="15" ry="13" fill={`url(#st${id})`} />
        <path d="M112 20 l6 6 l6 -9 l5 9 l7 -6 l-4 10 h-18 z" fill="#2e9b4a" />
      </g>
    </svg>
  );
}
