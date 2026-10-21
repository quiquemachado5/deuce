export default function DossierNav({ items }: { items: { id: string; label: string }[] }) {
  return <nav className="dossier-nav" aria-label="En esta ficha">{items.map(item => <a key={item.id} href={`#${item.id}`}>{item.label}</a>)}</nav>
}
