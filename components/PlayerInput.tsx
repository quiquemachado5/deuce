'use client';
import {useEffect,useId,useState} from 'react';
/** Native datalist keeps keyboard support; only a few names cross the server/client boundary. */
export default function PlayerInput({name,initial}:{name:string;initial:string}) {
  const id=useId(),[value,setValue]=useState(initial),[suggestions,setSuggestions]=useState<string[]>([initial]);
  useEffect(()=>{
    if(value.trim().length<2)return;
    const controller=new AbortController();
    const timer=setTimeout(async()=>{
      try {
        const response=await fetch('/api/search?q='+encodeURIComponent(value),{signal:controller.signal});
        if(!response.ok)return;
        const body=await response.json();
        setSuggestions((body.items || []).filter((item:{group:string})=>item.group==='Jugadores').map((item:{name:string})=>item.name));
      } catch { /* Input remains usable if suggestions are unavailable. */ }
    },200);
    return()=>{clearTimeout(timer);controller.abort();};
  },[value]);
  return <><input name={name} list={id} value={value} onChange={e=>setValue(e.target.value)} required maxLength={100} autoComplete="off" /><datalist id={id}>{suggestions.map(s=><option key={s} value={s}/>)}</datalist></>;
}
