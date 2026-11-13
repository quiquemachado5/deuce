'use client';

import { useEffect } from 'react';
import { usePathname,useSearchParams } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';

function send(payload: Record<string, unknown>) {
  const width = window.innerWidth;
  const device = width < 760 ? 'mobile' : width < 1100 ? 'tablet' : 'desktop';
  const body = JSON.stringify({ ...payload, path: location.pathname, device });
  if (!navigator.sendBeacon?.('/api/telemetry', body)) {
    void fetch('/api/telemetry', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
  }
}

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];
const report: ReportWebVitalsCallback = metric => send({
  kind: 'web-vital', name: metric.name, value: metric.value, delta: metric.delta,
  rating: metric.rating, id: metric.id,
});

export function WebVitals() {
  const pathname=usePathname(),search=useSearchParams();
  useReportWebVitals(report);
  useEffect(()=>{dispatchEvent(new Event('deuce:route-commit'));},[pathname,search]);
  useEffect(() => {
    const initial=()=>{const navigation=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming|undefined;if(navigation&&navigation.duration>0)send({kind:'navigation',value:navigation.duration,navigationType:navigation.type});};
    if(document.readyState==='complete')initial();else addEventListener('load',initial,{once:true});
    const onError = (event: ErrorEvent) => send({ kind: 'client-error', error: event.error instanceof Error ? event.error.name : 'Error' });
    const onRejection = (event: PromiseRejectionEvent) => send({
      kind: 'unhandled-rejection',
      error: event.reason instanceof Error ? event.reason.name : 'Rejection',
    });
    addEventListener('error', onError);
    addEventListener('unhandledrejection', onRejection);

    const routeKey=(value:string)=>{const url=new URL(value,location.href);url.searchParams.sort();return url.pathname+url.search;};
    let pending:{start:number;target:string;kind:string;committed:boolean;first:boolean}|null=null;
    let completionFrame:number|null=null;
    const begin=(target:string)=>{if(target===routeKey(location.href))return;pending={start:performance.now(),target,kind:new URL(target,location.href).pathname===location.pathname?'filter-transition':'route-transition',committed:false,first:false};};
    const onInternalNavigation=(event:MouseEvent)=>{
      if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      const anchor=(event.target as Element|null)?.closest<HTMLAnchorElement>('a[href]');
      if(!anchor||anchor.target==='_blank'||anchor.hasAttribute('download'))return;
      const target=new URL(anchor.href,location.href);if(target.origin===location.origin)begin(routeKey(target.href));
    };
    const onSubmit=(event:SubmitEvent)=>{
      const form=event.target;if(!(form instanceof HTMLFormElement)||form.method.toLowerCase()!=='get')return;
      const target=new URL(form.action,location.href);if(target.origin!==location.origin)return;
      target.search='';for(const [key,value] of new FormData(form,event.submitter))if(typeof value==='string')target.searchParams.append(key,value);
      begin(routeKey(target.href));
    };
    const sampleCompletion=()=>{
      if(!pending||!pending.committed||routeKey(location.href)!==pending.target)return;
      if(performance.now()-pending.start>60_000){pending=null;return;}
      if(!pending.first){send({kind:'navigation',value:performance.now()-pending.start,navigationType:'first-content'});pending.first=true;}
      if(document.querySelector('[role="status"][aria-label="Cargando contenido"]'))return;
      const sample=pending;
      if(completionFrame!==null)cancelAnimationFrame(completionFrame);
      completionFrame=requestAnimationFrame(()=>{completionFrame=requestAnimationFrame(()=>{
        completionFrame=null;if(pending!==sample||document.querySelector('[role="status"][aria-label="Cargando contenido"]'))return;
        send({kind:'navigation',value:performance.now()-sample.start,navigationType:sample.kind});pending=null;
      });});
    };
    const onCommit=()=>{if(pending)pending.committed=true;sampleCompletion();};
    const onHistoryNavigation=()=>{pending={start:performance.now(),target:routeKey(location.href),kind:'route-transition',committed:false,first:false};};
    document.addEventListener('click',onInternalNavigation,true);document.addEventListener('submit',onSubmit,true);
    addEventListener('popstate',onHistoryNavigation);addEventListener('deuce:route-commit',onCommit);

    let skeletonStart: number | null = null;
    let sampleFrame: number | null = null;
    const skeletonRoot = document.getElementById('main-content') || document.body;
    const sampleSkeleton = () => {
      sampleFrame = null;
      sampleCompletion();
      const loading = Boolean(skeletonRoot.querySelector('[role="status"][aria-label="Cargando contenido"]'));
      if (loading && skeletonStart === null) skeletonStart = performance.now();
      if (!loading && skeletonStart !== null) {
        send({ kind: 'navigation', value: performance.now() - skeletonStart, navigationType: 'skeleton' });
        skeletonStart = null;
      }
    };
    const scheduleSkeletonSample = () => {
      if (sampleFrame === null) sampleFrame = requestAnimationFrame(sampleSkeleton);
    };
    sampleSkeleton();
    const observer = new MutationObserver(scheduleSkeletonSample);
    observer.observe(skeletonRoot, { childList: true, subtree: true });
    return () => {
      removeEventListener('load',initial);
      removeEventListener('deuce:route-commit',onCommit);
      document.removeEventListener('submit',onSubmit,true);
      if(completionFrame!==null)cancelAnimationFrame(completionFrame);
      removeEventListener('error', onError);
      removeEventListener('unhandledrejection', onRejection);
      document.removeEventListener('click', onInternalNavigation, true);
      removeEventListener('popstate', onHistoryNavigation);
      observer.disconnect();
      if (sampleFrame !== null) cancelAnimationFrame(sampleFrame);
    };
  }, []);
  return null;
}
