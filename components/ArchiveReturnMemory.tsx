'use client';
import { useEffect } from 'react';
export default function ArchiveReturnMemory(){
  useEffect(()=>{
    const remember=(event:MouseEvent)=>{
      if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[href]'):null;
      if(!link||link.target==='_blank')return;
      const url=new URL(link.href,location.href);
      try{if(url.origin===location.origin&&url.pathname.startsWith('/match/')){
        if(location.pathname==='/buscar')sessionStorage.setItem('deuce:archive-origin',location.pathname+location.search);
        else sessionStorage.removeItem('deuce:archive-origin');
      }}catch{}
    };
    document.addEventListener('click',remember,true);
    return()=>document.removeEventListener('click',remember,true);
  },[]);return null;
}
