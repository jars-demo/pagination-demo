// Bram the badger, drawn in flat shapes: a grey head, the white face with its two black stripes,
// small round ears and a black nose. `face` crops to the head for the round button.

export function Bram({ className = '', face = false }: { className?: string; face?: boolean }) {
  return (
    <svg
      viewBox={face ? '8 6 48 48' : '0 0 64 64'}
      className={className}
      role="img"
      aria-label="Bram the badger"
    >
      <circle cx="17" cy="16" r="6" fill="#3a3936" />
      <circle cx="47" cy="16" r="6" fill="#3a3936" />
      <circle cx="17" cy="16" r="2.6" fill="#f7f6f1" />
      <circle cx="47" cy="16" r="2.6" fill="#f7f6f1" />
      <path
        d="M32 10c12 0 20 9 20 20 0 12-9 22-20 22S12 42 12 30c0-11 8-20 20-20z"
        fill="#9b988e"
      />
      <path d="M32 10c4 0 7 2 7 6v28c0 5-3 8-7 8s-7-3-7-8V16c0-4 3-6 7-6z" fill="#f7f6f1" />
      <path d="M25 14c-4 3-7 8-8 14l4 10c2-6 3-14 4-24z" fill="#141414" />
      <path d="M39 14c4 3 7 8 8 14l-4 10c-2-6-3-14-4-24z" fill="#141414" />
      <circle cx="20.6" cy="29" r="1.9" fill="#f7f6f1" />
      <circle cx="43.4" cy="29" r="1.9" fill="#f7f6f1" />
      <circle cx="20.6" cy="29" r="1" fill="#141414" />
      <circle cx="43.4" cy="29" r="1" fill="#141414" />
      <ellipse className="bram-nose" cx="32" cy="45" rx="4" ry="3" fill="#141414" />
      <path d="M32 48v2" stroke="#141414" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
