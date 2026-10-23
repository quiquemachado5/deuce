'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
export function PageTransition() {
  const orb=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const pathname=usePathname(),router=useRouter();
  useEffect(()=>{if(orb.current?.classList.contains('cover'))orb.current.className='page-orb reveal';},[pathname]);
  useEffect(()=>{
    const click=(event:MouseEvent)=>{
      if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
      if(!link||link.hasAttribute('download')||link.target==='_blank'||link.dataset.noTransition!==undefined)return;
      const destination=new URL(link.href,location.href);
      if(destination.origin!==location.origin||destination.pathname===location.pathname||!/^https?:$/.test(destination.protocol))return;
      event.preventDefault();event.stopPropagation();document.dispatchEvent(new Event('deuce:navigate'));if(timer.current)clearTimeout(timer.current);
      const node=orb.current;if(!node)return;const bounds=link.getBoundingClientRect();
      node.style.setProperty('--orb-x',`${event.detail?event.clientX:bounds.left+bounds.width/2}px`);
      node.style.setProperty('--orb-y',`${event.detail?event.clientY:bounds.top+bounds.height/2}px`);
      node.style.setProperty('--orb-scale',String(Math.ceil(Math.hypot(innerWidth,innerHeight)/22)));
      node.className='page-orb cover';
      // Close modal/menu before intercepting the Link handler.
      document.querySelector<HTMLDialogElement>('.search-modal[open]')?.close();
      timer.current=setTimeout(()=>{router.push(destination.pathname+destination.search+destination.hash);timer.current=setTimeout(()=>{if(orb.current)orb.current.className='page-orb reveal';},2000);},360);
    };
    document.addEventListener('click',click,true);
    return()=>{document.removeEventListener('click',click,true);if(timer.current)clearTimeout(timer.current);};
  },[router]);
  return <div className="page-orb" ref={orb} aria-hidden="true"/>;
}
