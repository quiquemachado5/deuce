import Link from 'next/link';

export type Breadcrumb = { label:string; href?:string };
export function Breadcrumbs({items,className=''}:{items:Breadcrumb[];className?:string}) {
  return <nav className={`deuce-breadcrumbs${className?` ${className}`:''}`} aria-label="Ruta de navegación"><ol>{items.map((item,index)=><li key={`${item.label}-${index}`}>{item.href?<Link href={item.href}>{item.label}</Link>:<span aria-current="page">{item.label}</span>}</li>)}</ol></nav>;
}
