import { ImageResponse } from 'next/og';
import { preparedTournamentSummaryArchive } from '@/lib/revista/read-records';
import { tournamentDirectory } from '@/lib/tournament-directory';
import { tournamentName } from '@/lib/labels';

export const alt = 'Torneo en DEUCE';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tournament = tournamentDirectory(await preparedTournamentSummaryArchive(slug)).find((entry) => entry.slug === slug);
  const name = tournament ? tournamentName(tournament.name) : slug.split('-').map((part) => `${part[0]?.toUpperCase() || ''}${part.slice(1)}`).join(' ');
  const years = tournament ? new Set(tournament.matches.map((match) => match.year)).size : 0;

  return new ImageResponse(
    <div style={{display:'flex',width:'100%',height:'100%',padding:'64px 72px',flexDirection:'column',justifyContent:'space-between',background:'#eef2ef',color:'#102c24',fontFamily:'sans-serif'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <strong style={{fontSize:30,letterSpacing:'0.12em'}}>DEUCE</strong>
        <span style={{display:'flex',padding:'12px 20px',border:'1px solid #9eaaa5',borderRadius:999,fontSize:20}}>Archivo ATP y WTA</span>
      </div>
      <div style={{display:'flex',maxWidth:980,flexDirection:'column',gap:20}}>
        <span style={{fontSize:23,color:'#557068'}}>TORNEO</span>
        <span style={{fontSize:name.length>28?68:82,fontWeight:750,lineHeight:.98,letterSpacing:'-0.045em'}}>{name}</span>
      </div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:26,borderTop:'1px solid #b7c1bd',fontSize:22,color:'#557068'}}>
        <span>Ediciones, finales y campeones documentados</span>
        {years>0?<strong style={{color:'#102c24'}}>{years} ediciones</strong>:null}
      </div>
    </div>,
    size,
  );
}
