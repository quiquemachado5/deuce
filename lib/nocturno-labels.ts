/** Compact display only: the complete name remains the link's accessible text. */
export function playerSurname(name: string) {
  const parts = name.trim().split(/\s+/);
  let start = parts.length - 1;
  while (
    start > 0 &&
    /^(de|del|da|dos|van|von|der|den|la|le)$/i.test(parts[start - 1])
  )
    start--;
  return parts.slice(start).join(" ");
}
