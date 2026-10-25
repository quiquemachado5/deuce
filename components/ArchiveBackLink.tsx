'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ArchiveBackLink() {
  const router=useRouter();
  return <Link href="/buscar" className="ry-match-back" data-no-transition onClick={event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    let previous:string|null=null;
    try{previous=sessionStorage.getItem('deuce:archive-origin');}catch{}
    if(previous?.startsWith('/buscar')&&window.history.length>1){event.preventDefault();router.back();}
  }}>← Volver a los partidos</Link>;
}
