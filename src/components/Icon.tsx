// Paths from docs/design/assets/icons (24x24, currentColor). Icons are always
// decorative here: every button carries its own text label.
const PATHS = {
  pause: (
    <>
      <rect x="6" y="4" width="4.2" height="16" rx="1.4" />
      <rect x="13.8" y="4" width="4.2" height="16" rx="1.4" />
    </>
  ),
  play: (
    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
  ),
  stop: <rect x="5" y="5" width="14" height="14" rx="3" />,
  save: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1Z" />,
  finish: <path d="M5 3v18h2v-7h11l-2-3.5L18 7H7V3H5Z" />,
  run: (
    <path d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM10 22l1.5-6 2.5 2.5V22h2v-5l-2.5-2.5.8-3.5A7 7 0 0 0 19 13v-2a5 5 0 0 1-4.3-2.5l-1-1.6a2 2 0 0 0-2.5-.8L6 8.3V13h2V9.6l1.8-.7L8 16.5 3.5 15.6 3 17.6 10 19l-.1 3H10Z" />
  ),
  chevron: <path d="M9.3 5.3 8 6.6l5.4 5.4L8 17.4l1.3 1.3L16 12z" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className = "size-6",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
