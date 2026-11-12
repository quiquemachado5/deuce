type TennisCourtProps={surface?:string;className?:string;horizontal?:boolean;label?:string};
/** Court lines in decimetres: 23.77 m long, 10.97 m doubles / 8.23 m singles. */
export function TennisCourt({surface='hard',className,horizontal=false,label}:TennisCourtProps){
 const names:Record<string,string>={hard:'dura',clay:'tierra',grass:'hierba',carpet:'moqueta'};
 return <svg className={className} viewBox={horizontal?'-20 -14 278 138':'-14 -20 138 278'} role="img" aria-label={label||`Pista de tenis de ${names[surface]||'superficie documentada'}, con proporciones reglamentarias`}>
  <g transform={horizontal?'translate(237.7 0) rotate(90)':undefined}>
   <rect x="-14" y="-20" width="138" height="278" rx="5" fill="currentColor" opacity=".22"/>
   <rect width="109.7" height="237.7" fill="currentColor"/>
   <g fill="none" stroke="#f6f8ed" strokeWidth=".85"><rect width="109.7" height="237.7"/><path d="M13.7 0v237.7M96 0v237.7M13.7 54.85H96M13.7 182.85H96M54.85 54.85v128M54.85 0v3M54.85 234.7v3"/></g>
   <path d="M-6 118.85h121.7" stroke="#f6f8ed" strokeWidth="1.4" strokeDasharray="1.2 1"/><circle cx="-6" cy="118.85" r="1.6" fill="#f6f8ed"/><circle cx="115.7" cy="118.85" r="1.6" fill="#f6f8ed"/>
  </g>
 </svg>;
}
