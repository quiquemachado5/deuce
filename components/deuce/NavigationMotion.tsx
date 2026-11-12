 'use client';
import {useEffect} from 'react';
/** Routing stays with Next; only one entrance is applied by the route template. */
export function NavigationMotion(){
 useEffect(()=>{
  const setEffect=(effect:string)=>{document.documentElement.dataset.routeMotion=effect;};
  setEffect('soft');
  const select=(event:MouseEvent)=>{const anchor=event.target instanceof Element?event.target.closest<HTMLAnchorElement>('a[data-motion]'):null;if(anchor?.dataset.motion)setEffect(anchor.dataset.motion);};
  document.addEventListener('click',select,true);return()=>document.removeEventListener('click',select,true);
 },[]);
 return null;
}
