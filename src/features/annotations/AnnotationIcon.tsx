const paths = {
  reply: "M9 10l-5 4 5 4M4 14h10a5 5 0 0 0 0-10",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5m4-5v5",
  conversation: "M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.5-3a7.5 7.5 0 1 1 13.5-4.5Z",
  more: "M5 12h.01m7 0h.01m7 0h.01",
  send: "m4 4 16 8-16 8 3-8-3-8Zm3 8h13",
};

export function AnnotationIcon({ name }: { name: keyof typeof paths }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={name === "more" ? 3 : 1.65} strokeLinecap="round" strokeLinejoin="round">
    <path d={paths[name]} />
  </svg>;
}
