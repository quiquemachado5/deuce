/** Provider edition IDs are scoped by circuit and dates; city names alone are not identities. */
export function reviewedProviderEdition(row:{tour?:unknown;tournament_id?:unknown;scheduled_time?:unknown}) {
  const day=String(row.scheduled_time||'').slice(0,10);
  if(row.tour==='wta'&&String(row.tournament_id)==='2003'&&day>='2026-04-06'&&day<='2026-04-12')return {
    tournament:'Madrid 125',category:'WTA 125',
    sources:[{field:'Categoría y edición',url:'https://www.rfet.es/descargar/file-competicion-cuadros/24055_Cuadro/2026-madrid-individual.pdf'},{field:'Categoría y edición',url:'https://www.wtatennis.com/tournaments/1164/madrid-125/2026/scores'}],
  };
  return undefined;
}
