/**
 * Marchio Norma — "Sigillo monogramma" (portato dal sito marketing per coerenza di brand).
 *  - sigillo scanalato (ceralacca) come contorno;
 *  - monogramma N geometrico la cui asta destra termina in una SPUNTA, centrato nel sigillo.
 * Disegnato in `currentColor` (terracotta: usare `text-primary`), leggibile da 24px in su.
 */

// Cerchio scanalato (ceralacca): n "bozzi" lungo una circonferenza di raggio r.
function scallop(cx: number, cy: number, r: number, bumps: number): string {
  const step = (Math.PI * 2) / bumps;
  let d = "";
  for (let i = 0; i < bumps; i++) {
    const a = i * step;
    const a2 = a + step;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const x2 = cx + Math.cos(a2) * r;
    const y2 = cy + Math.sin(a2) * r;
    if (i === 0) d += `M ${x.toFixed(2)} ${y.toFixed(2)} `;
    d += `A ${(r * 0.52).toFixed(2)} ${(r * 0.52).toFixed(2)} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} `;
  }
  return d + "Z";
}

const SCALLOP = scallop(20, 20, 17, 14);

export function SealMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      {/* contorno del sigillo */}
      <path d={SCALLOP} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* anello interno sottile */}
      <circle cx="20" cy="20" r="12.2" stroke="currentColor" strokeWidth="0.9" opacity="0.45" />
      {/* monogramma N: asta sx, diagonale, asta dx che in cima diventa spunta */}
      <g stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13.4 26.6V13.4" />
        <path d="M13.4 13.4L26.6 26.6" />
        <path d="M26.6 26.6V16.4L24.2 14" />
      </g>
    </svg>
  );
}
