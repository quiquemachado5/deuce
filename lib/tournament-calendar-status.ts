/** Editorial calendar classification, separate from archival result coverage.
 * ATP: https://www.atptour.com/en/tournaments/ (2026)
 * WTA: https://wtafiles.wtatennis.com/pdf/calendar/calendar.pdf (2 October 2026)
 * Absence from this map is NOT proof of cancellation; those events remain in the archive group.
 */
const normalize=(name:string)=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const calendars:Record<string,Record<string,string[]>>={
 atp:{'Masters 1000':['Indian Wells','Miami','Monte Carlo','Montecarlo','Madrid','Rome','Roma','Canada','Montreal','Toronto','Cincinnati','Shanghai','Shanghái','Paris','París'],
 'ATP 500':['Rotterdam','Dallas','Doha','Rio de Janeiro','Acapulco','Dubai','Barcelona','Munich','Múnich','Hamburg','Hamburgo','Hamburg Open','Halle','Queens Club','Queen’s Club','London','Londres','Washington','Beijing','Pekín','Tokyo','Tokio','Vienna','Viena','Basel','Basilea'],
 'ATP 250':['Brisbane','Hong Kong','Adelaide','Adelaida','Auckland','Montpellier','Buenos Aires','Delray Beach','Santiago','Houston','Marrakech','Bucharest','Bucarest','Geneva','Ginebra','Stuttgart','s-Hertogenbosch','Hertogenbosch','Mallorca','Eastbourne','Bastad','Båstad','Gstaad','Umag','Kitzbuhel','Kitzbühel','Estoril','Los Cabos','Winston Salem','Winston-Salem','Chengdu','Hangzhou','Almaty','Lyon','Brussels','Bruselas','Marseille','Marsella','Stockholm','Estocolmo','Athens','Atenas']},
 wta:{'WTA 1000':['Doha','Dubai','Indian Wells','Miami','Madrid','Rome','Roma','Canada','Toronto','Montreal','Cincinnati','Beijing','Pekín','Wuhan'],
 'WTA 500':['Brisbane','Adelaide','Adelaida','Abu Dhabi','Merida','Mérida','Charleston','Linz','Stuttgart','Strasbourg','Estrasburgo','Queens Club','Queen’s Club','London','Londres','Berlin','Berlín','Bad Homburg','Washington','Monterrey','Guadalajara','Seoul','Seúl','Ningbo','Tokyo','Tokio','Pan Pacific'],
 'WTA 250':['Auckland','Hobart','Cluj Napoca','Cluj-Napoca','Ostrava','Austin','Bogota','Bogotá','Rouen','Rabat','Hertogenbosch','s-Hertogenbosch','Nottingham','Eastbourne','Iasi','Iași','Athens','Atenas','Hamburg','Hamburgo','Prague','Praga','Memphis','Sao Paulo','São Paulo','Singapore','Singapur','Osaka','Guangzhou','Chennai','Hong Kong']}
};
export function isCurrentTournament(name:string,tour:'atp'|'wta',category:string){
 return (calendars[tour][category]||[]).some(alias=>normalize(alias)===normalize(name));
}
