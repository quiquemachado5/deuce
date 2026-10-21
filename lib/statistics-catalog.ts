import type { RankingMetric } from './season-analytics'
export const metricTopics = [
  {key:'resultados',label:'Resultados',description:'Victorias, sets y regularidad.'},
  {key:'titulos',label:'Títulos y rondas',description:'Finales, títulos y rondas alcanzadas.'},
  {key:'presion',label:'Bajo presión',description:'Remontadas, desempates y breaks.'},
  {key:'saque',label:'Al saque',description:'Primer servicio, segundos y aces.'},
  {key:'resto',label:'Al resto',description:'Puntos ganados frente al servicio.'},
  {key:'contexto',label:'Rival y duración',description:'Ranking histórico y resistencia.'},
  {key:'golpes',label:'Golpes',description:'Ganadores y errores documentados.'},
  {key:'superficies',label:'Superficies',description:'Dura, tierra y hierba.'},
] as const
export function metricTopic(metric: RankingMetric) {
  if (['break-saved','break-conversion','thirty-all-games','tiebreak-rate','tiebreak-wins','matchpoint-rescues','matchpoints-saved'].includes(metric.key)) return 'presion'
  if (['finals','finals-played','finals-rate','slam-finals','masters-finals','semifinals','quarterfinals','deciding-finals'].includes(metric.key)) return 'titulos'
  return ({Resultados:'resultados',Presión:'presion',Servicio:'saque','Resto y rallies':'resto',Superficies:'superficies',Contexto:'contexto',Golpes:'golpes'} as Record<string,string>)[metric.group] || 'resultados'
}
const definitions:Record<string,string>={
 'games-won':'Suma de juegos ganados a partir de los sets finales.',
 'games-rate':'Juegos ganados divididos entre todos los juegos disputados. Mínimo de 100 juegos.',
 'opening-lead':'Partidos ganados entre aquellos en que el jugador ganó el primer set. Mínimo de diez.',
 'opening-recovery':'Victorias entre los partidos que comenzaron perdiendo el primer set. Mínimo de diez.',
 'two-down-recovery':'Victorias entre los partidos en que el jugador perdió los dos primeros sets. Mínimo de cinco.',
 'top10-wins':'Victorias frente a rivales clasificados del 1 al 10 en la fecha del partido. Excluye rankings de descarga.',
 'top10-rate':'Victorias sobre partidos ante el top 10 de aquel día. Mínimo de diez partidos con ranking histórico.',
 'top5-wins':'Victorias ante el top 5 de la fecha del partido, no su ranking actual.',
 'number-one-wins':'Victorias ante el número uno del ranking en la fecha del encuentro.',
 'underdog-rate':'Victorias cuando el ranking histórico propio era peor que el rival. Mínimo de diez casos.',
 'long-wins':'Victorias en encuentros de al menos 180 minutos documentados.',
 'long-rate':'Victorias entre los encuentros con duración documentada de al menos 180 minutos. Mínimo de cinco.',
 'fewer-points':'Victorias con menos puntos ganados que el rival. Exige totales publicados de ambos jugadores.',
 'matchpoint-rescues':'Victorias tras salvar al menos una bola de partido identificada en la cinta.',
 'matchpoints-saved':'Bolas de partido del rival que ganó el jugador; una misma ocasión puede repetirse en un juego.',
 'thirty-all-games':'Juegos ganados tras ganar el punto del 30–30, entre juegos cerrados documentados. Mínimo de diez.',
 'second-serve-breaks':'Break points ganados al resto frente a un segundo servicio documentado. Mínimo de cinco oportunidades.',
 'aces-per-100':'Aces por 100 puntos al servicio. Solo cruza partidos que contienen ambos datos; mínimo de 100 puntos.',
 'faults-per-100':'Dobles faltas por 100 puntos de servicio; un valor alto significa más faltas. Mínimo de 100 puntos.',
 'chances-per-100':'Oportunidades de break por 100 juegos al resto. Puede superar 100: hay varias oportunidades por juego.',
 'faced-per-100':'Bolas de break afrontadas por 100 juegos de saque. Mínimo de 20 juegos con ambos datos.',
 'holds':'Juegos de saque ganados divididos entre juegos de saque jugados, ponderados por juegos.',
 'return-games':'Juegos al resto ganados sobre todos los juegos al resto documentados.',
 'first-return':'Puntos al resto ganados frente a primeros saques, ponderados por oportunidades.',
 'second-return':'Puntos al resto ganados frente a segundos saques, ponderados por oportunidades.',
 'second-in':'Segundos servicios válidos sobre segundos servicios documentados.',
 'winners':'Golpes ganadores publicados; solo los partidos que incluyen esta estadística.',
 'unforced':'Errores no forzados publicados; más errores no significa mejor rendimiento.',
 'forehand':'Golpes ganadores de derecha documentados.', 'backhand':'Golpes ganadores de revés documentados.',
 'volley':'Voleas ganadoras documentadas.', 'return-winners':'Restos ganadores documentados.',

 wins:'Partidos ganados dentro del archivo y de los filtros elegidos.', played:'Encuentros terminados con resultado validado.', opponents:'Cada rival derrotado cuenta una vez, aunque haya varios enfrentamientos.', seasons:'Años distintos con al menos un partido registrado.',
 'sets-won':'Sets ganados, sumados a partir de los marcadores finales.', 'sets-rate':'Sets ganados divididos entre todos los sets disputados.',
 'win-rate':'Victorias divididas entre partidos disputados. Mínimo de 20 encuentros.',
 'finals':'Finales ganadas en las competiciones de la selección.', 'finals-played':'Finales disputadas con resultado validado.', 'finals-rate':'Finales ganadas divididas entre finales disputadas. Mínimo de cinco.',
 'six-love-sets':'Sets que terminaron 6–0 a favor del jugador.', 'close-sets':'Sets ganados por uno o dos juegos de diferencia, incluidos los desempates.',
 'straight-sets':'Victorias en las que el rival no ganó ningún set.', 'straight-set-rate':'Victorias sin perder sets divididas entre todas las victorias.',
 'first-set-comebacks':'Victorias después de perder el primer set.', 'two-set-comebacks':'Victorias después de perder los dos primeros sets.',
 'five-set-wins':'Victorias en partidos que llegaron al quinto set.', 'deciders':'Victorias en la manga decisiva de un partido a tres o cinco sets.',
 'break-conversion':'Bolas de break ganadas entre las oportunidades documentadas.', 'break-saved':'Bolas de break salvadas entre las afrontadas documentadas.',
 'aces':'Saques directos sumados únicamente en partidos que incluyen ese dato.', 'double-faults':'Dobles faltas registradas. Un valor mayor significa más faltas, no mejor rendimiento.',
 'first-in':'Primeros saques válidos entre los servicios documentados.', 'first-won':'Puntos ganados con primer servicio entre los jugados con primer servicio.', 'second-won':'Puntos ganados con segundo servicio entre los jugados con segundo servicio.',
 'service-won':'Puntos ganados al servicio entre todos los puntos de saque documentados.', 'return-won':'Puntos ganados al resto entre todos los puntos al resto documentados.',
 'total-points':'Puntos ganados sumados únicamente en partidos que publican esa cifra.',
}
export function metricDefinition(metric:RankingMetric) {
 const definition=definitions[metric.key] || `${metric.label}, dentro de los partidos de esta selección.`
 const sample=metric.unit==='%' ? metric.min ? ` Mínimo de ${metric.min} casos documentados por jugador; comparación exploratoria, sin ajuste por rival.` : ' Mínimo de 3 partidos y 20 oportunidades documentadas; comparación exploratoria.' : ''
 return `${definition}${sample}`
}
