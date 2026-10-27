"use client";
import { useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { ScoreRows } from '@/components/deuce/MatchScoreboard';
import { resolvedWinner, resolvedSetClosed } from '@/lib/deuce-score';
import type { MatchRecord } from '@/types/deuce';
export default function Share({ record, iconOnly = false }: { record:MatchRecord; iconOnly?:boolean }) {
  const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function download(width:number,height:number) {
    setBusy(true);setError('');
    try {
      await document.fonts.ready;
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
      if(!ctx)throw Error('canvas');canvas.width=width;canvas.height=height;
      const unit=Math.min(width,height),pad=width*.075,right=width-pad,column=unit*.055;
      const styles=getComputedStyle(document.documentElement),ink=styles.getPropertyValue('--ink').trim(),green=styles.getPropertyValue('--winner').trim(),muted=styles.getPropertyValue('--muted').trim();
      const font=getComputedStyle(trigger.current!).fontFamily;
      ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
      if(record.isFinal){ctx.strokeStyle=styles.getPropertyValue('--gold').trim();ctx.lineWidth=3;ctx.strokeRect(2,2,width-4,height-4);}
      ctx.textAlign='left';ctx.fillStyle=ink;ctx.font=`700 ${unit*.04}px ${font}`;ctx.fillText('DEUCE',pad,height*.12);
      ctx.fillStyle=muted;ctx.font=`500 ${unit*.023}px ${font}`;ctx.fillText(`${record.tournament} · ${record.year||''} · ${record.round}`,pad,height*.23,width-2*pad);
      const winner=resolvedWinner(record),start=right-(record.sets.length-1)*column;
      record.players.forEach((player,side)=>{
        const y=height*(side===0?.42:.61);
        ctx.textAlign='left';ctx.fillStyle=winner===side?green:ink;ctx.font=`${winner===side?700:500} ${unit*.032}px ${font}`;
        const maxName=start-pad-column;let line='',baseline=y;
        for(const word of player.name.split(' ')){const candidate=line?line+' '+word:word;if(line&&ctx.measureText(candidate).width>maxName){ctx.fillText(line,pad,baseline);baseline+=unit*.04;line=word;}else line=candidate;}
        ctx.fillText(line,pad,baseline);
        record.sets.forEach((set,index)=>{
          const x=start+index*column,won=resolvedSetClosed(set)&&set.games[side]>set.games[1-side];
          ctx.textAlign='center';ctx.fillStyle=won?green:muted;ctx.font=`${won?750:500} ${unit*.033}px ${font}`;ctx.fillText(String(set.games[side]),x,y);
          const tie=set.tieBreak?.[side];
          if(tie!=null){ctx.textAlign='left';ctx.font=`600 ${unit*.012}px ${font}`;ctx.fillText(String(tie),x+unit*.011,y-unit*.02);}
        });
      });
      ctx.textAlign='left';ctx.fillStyle=muted;ctx.font=`500 ${unit*.018}px ${font}`;
      ctx.fillText(record.date?new Intl.DateTimeFormat('es-ES',{timeZone:'UTC'}).format(new Date(record.date+'T12:00:00Z')):String(record.year||''),pad,height*.85);
      ctx.textAlign='right';ctx.fillStyle=ink;ctx.fillText('Ver partido ↗',right,height*.85);
      ctx.textAlign='left';ctx.fillStyle=muted;ctx.font=`400 ${unit*.014}px ${font}`;ctx.fillText('deuce-archive.vercel.app'+record.href,pad,height*.93,width-2*pad);
      const link=document.createElement('a');link.download=`deuce-${record.id}-${width}x${height}.png`;link.href=canvas.toDataURL('image/png');link.click();
    } catch {setError('No se pudo crear la imagen. Inténtalo de nuevo.');} finally{setBusy(false);}
  }
  return <>
    <button ref={trigger} type="button" className={`deuce-text-link${iconOnly?' ry-match-share':''}`} aria-label="Compartir partido" onClick={()=>dialog.current?.showModal()}>{iconOnly?<Share2 size={18} aria-hidden="true"/>:<span>Compartir ↗</span>}</button>
    <dialog ref={dialog} className="ry-share-dialog" aria-labelledby={`share-${record.id}`} onClose={()=>trigger.current?.focus()}>
      <div className="ry-share-dialog-head"><h2 id={`share-${record.id}`}>Compartir partido</h2><button type="button" className="ry-match-icon" aria-label="Cerrar" onClick={()=>dialog.current?.close()}>×</button></div>
      <p className="ry-data-note">Descarga una imagen con el resultado del partido.</p>
      <div className="ry-share-preview"><p>{record.tournament} · {record.year} · {record.round}</p><ScoreRows match={record}/></div>
      <div className="ry-share-formats" aria-busy={busy}>{[{label:'Cuadrado',w:1080,h:1080},{label:'Horizontal',w:1600,h:900},{label:'Vertical',w:1080,h:1920}].map(format=><button type="button" key={format.label} disabled={busy} onClick={()=>download(format.w,format.h)}><span>{format.label}</span><small>{format.w} × {format.h}</small></button>)}</div>
      {busy&&<p role="status">Creando imagen…</p>}{error&&<p role="alert">{error}</p>}
    </dialog>
  </>;
}
