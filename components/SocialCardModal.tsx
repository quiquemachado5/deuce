'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, Share2, X } from 'lucide-react'
import type { Point, Surface } from '@/lib/types'
import { criticalPoints } from '@/lib/editorial'
import { pointHeight } from '@/lib/quality'
import { tournamentName } from '@/lib/labels'

type Format = 'square' | 'wide' | 'story'
type Props = { compact?: boolean; player1: string; player2: string; score: string; tournament: string; year: number; surface: Surface; date: string; points: Point[]; headline: string; evidence: string }
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(' '); const lines: string[] = []; let current = ''
  for (const word of words) { const next = current ? `${current} ${word}` : word; if (ctx.measureText(next).width > maxWidth && current) { lines.push(current); current = word } else current = next }
  if (current) lines.push(current)
  return lines
}
export default function SocialCardModal(props: Props) {
  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<Format>('square')
  const [downloadUrl, setDownloadUrl] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const draw = useCallback((canvas: HTMLCanvasElement, mode: Format) => {
    const width = mode === 'wide' ? 1600 : mode === 'story' ? 1080 : 1200
    const height = mode === 'wide' ? 900 : mode === 'story' ? 1920 : 1200
    canvas.width = width; canvas.height = height
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const pad=mode==='story'?80:72, contentWidth=width-pad*2
    const font='-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.fillStyle='#f4f1ea';ctx.fillRect(0,0,width,height)
    ctx.fillStyle='#1d1d1f';ctx.font=`600 30px ${font}`;ctx.fillText('DEUCE',pad,86)
    ctx.fillStyle='#55534f';ctx.font=`400 24px ${font}`
    ctx.fillText(`${tournamentName(props.tournament)} · ${props.year}`,pad,140)
    let y=mode==='story'?300:mode==='wide'?190:235
    ctx.fillStyle='#1d1d1f';ctx.font=`600 ${mode==='wide'?48:64}px ${font}`
    for(const name of [props.player1,props.player2]) {
      for(const line of wrap(ctx,name,contentWidth)) {ctx.fillText(line,pad,y);y+=mode==='wide'?60:74}
    }
    y+=mode==='wide'?24:32;ctx.font=`600 52px ${font}`
    for(const line of wrap(ctx,props.score,contentWidth)) {ctx.fillText(line,pad,y);y+=mode==='wide'?56:64}
    const rows=criticalPoints(props.points), chartHeight=mode==='story'?200:110
    if(rows.length) {
      y+=32;const step=contentWidth/Math.max(rows.length,1)
      rows.forEach((point,i)=>{const bar=chartHeight*pointHeight(point)/100;ctx.fillStyle=point.winner===1?'#286044':'#9a582b';ctx.fillRect(pad+i*step,y+chartHeight-bar,Math.max(1,Math.min(16,step*.6)),bar)})
      y+=chartHeight+32;ctx.fillStyle='#55534f';ctx.font=`400 20px ${font}`
      ctx.fillText('Bolas de break y de partido · color del ganador del punto',pad,y)
    }
    y+=mode==='story'?160:mode==='wide'?48:65
    const limit=height-160-y
    let size=mode==='wide'?36:46
    ctx.font=`600 ${size}px ${font}`
    while(wrap(ctx,props.headline,contentWidth).length*size*1.22>limit && size>24) {size-=2;ctx.font=`600 ${size}px ${font}`}
    ctx.fillStyle='#1d1d1f'
    for(const line of wrap(ctx,props.headline,contentWidth)) {ctx.fillText(line,pad,y);y+=size*1.22}
    ctx.fillStyle='#55534f';ctx.font=`400 20px ${font}`
    ctx.fillText('deuce-archive.vercel.app',pad,height-64)
  }, [props])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!open || !canvas) return
    draw(canvas, format)
    let active = true
    let url = ''
    canvas.toBlob(blob => {
      if (!active || !blob) return
      url = URL.createObjectURL(blob)
      setDownloadUrl(url)
    }, 'image/png')
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [open, format, draw])
  function show() { dialogRef.current?.showModal(); setOpen(true) }
  function close() { dialogRef.current?.close(); setOpen(false) }
  const fileName = `deuce-${props.tournament.toLowerCase().replace(/\s+/g, '-')}-${props.year}-${format}.png`
  return <><button ref={triggerRef} type="button" className={props.compact ? "share-icon" : "social-open"} onClick={show} aria-label="Compartir partido" title="Compartir partido"><Share2 size={19} />{!props.compact && " Crear tarjeta para compartir"}</button><dialog ref={dialogRef} className="social-dialog" onClose={() => {setOpen(false);triggerRef.current?.focus()}} aria-labelledby="social-title"><div className="social-dialog-head"><div><h2 id="social-title">Tu partido, listo para compartir</h2><p>Elige el formato y descarga la tarjeta en PNG.</p></div><button type="button" className="dialog-close" onClick={close} aria-label="Cerrar"><X size={22} /></button></div><div className="social-format" role="group" aria-label="Formato de la imagen"><button type="button" aria-pressed={format === 'square'} onClick={() => setFormat('square')}>Cuadrado · 1:1</button><button type="button" aria-pressed={format === 'wide'} onClick={() => setFormat('wide')}>Horizontal · 16:9</button><button type="button" aria-pressed={format === 'story'} onClick={() => setFormat('story')}>Vertical · 9:16</button></div><canvas ref={canvasRef} className="social-preview" role="img" aria-label="Vista previa de la tarjeta social con marcador, mapa y dato destacado" /><div className="social-dialog-foot"><p>El dato destacado se calcula con los puntos disponibles del partido.</p><a href={downloadUrl || undefined} aria-disabled={!downloadUrl} download={fileName}><Download size={18} /> Descargar PNG</a></div></dialog></>
}
