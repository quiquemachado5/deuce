import type { Match } from './types'
/** Independently reviewed reference results. Score is always from winner's side. */
export const reviewedFinals = [
 {tournament:'Cincinnati',year:2023,winner:'Novak Djokovic',loser:'Carlos Alcaraz',score:'5–7 7–6(7) 7–6(4)',source:'https://www.atptour.com/en/news/alcaraz-djokovic-cincinnati',reviewed:'2026-10-19'},
 {tournament:'Wimbledon',year:2008,winner:'Rafael Nadal',loser:'Roger Federer',score:'6–4 6–4 6–7(5) 6–7(8) 9–7',source:'https://www.atptour.com/en/news/rafael-nadal-retirement-memorable-matches',reviewed:'2026-10-19'},
 {tournament:'Wimbledon',year:2023,winner:'Carlos Alcaraz',loser:'Novak Djokovic',score:'1–6 7–6(6) 6–1 3–6 6–4',source:'https://www.atptour.com/en/news/alcaraz-djokovic-wimbledon-2023-sunday-final',reviewed:'2026-10-19'},
 {tournament:'Australian Open',year:2012,winner:'Novak Djokovic',loser:'Rafael Nadal',score:'5–7 6–4 6–2 6–7(5) 7–5',source:'https://www.atptour.com/en/news/djokovic-nadal-rivalry-grand-slam-finals',reviewed:'2026-10-21'},
 {tournament:'Australian Open',year:2017,winner:'Roger Federer',loser:'Rafael Nadal',score:'6–4 3–6 6–1 3–6 6–3',source:'https://www.atptour.com/en/news/federer-beats-nadal-australian-open-2017-final',reviewed:'2026-10-21'},
 {tournament:'Miami',year:2017,winner:'Roger Federer',loser:'Rafael Nadal',score:'6–3 6–4',source:'https://www.atptour.com/en/news/miami-2017-final-federer-nadal',reviewed:'2026-10-21'},
 {tournament:'Wimbledon',year:2019,winner:'Novak Djokovic',loser:'Roger Federer',score:'7–6(5) 1–6 7–6(4) 4–6 13–12(3)',source:'https://www.atptour.com/en/news/djokovic-federer-wimbledon-2019-final-match-analysis',reviewed:'2026-10-21'},
 {tournament:'Australian Open',year:2022,winner:'Rafael Nadal',loser:'Daniil Medvedev',score:'2–6 6–7(5) 6–4 6–4 7–5',source:'https://www.atptour.com/en/news/best-of-2022-grand-slam-matches',reviewed:'2026-10-21'},
 {tournament:'Roland Garros',year:2022,winner:'Rafael Nadal',loser:'Casper Ruud',score:'6–3 6–3 6–0',source:'https://www.atptour.com/es/news/roland-garros-2023-sabado-previa-final-ruud',reviewed:'2026-10-21'},
 {tournament:'US Open',year:2022,winner:'Carlos Alcaraz',loser:'Casper Ruud',score:'6–4 2–6 7–6(1) 6–3',source:'https://www.atptour.com/es/news/roland-garros-2023-sabado-previa-final-ruud',reviewed:'2026-10-21'},
 {tournament:'Roland Garros',year:2024,winner:'Carlos Alcaraz',loser:'Alexander Zverev',score:'6–3 2–6 5–7 6–1 6–2',source:'https://www.atptour.com/en/news/alcaraz-zverev-roland-garros-2024-final',reviewed:'2026-10-21'},
] as const
export function referenceFinal(match:Match){return reviewedFinals.find(r=>r.tournament===match.tournament&&r.year===match.year&&/^(final|f)$/i.test(match.round)&&[match.player1.name,match.player2.name].includes(r.winner)&&[match.player1.name,match.player2.name].includes(r.loser))}
export function referenceIssue(match:Match){
 const ref=referenceFinal(match);if(!ref)return null
 const winner=match.winner===1?match.player1.name:match.winner===2?match.player2.name:''
 const expected=ref.score.split(' ').map(s=>s.match(/^(\d+)–(\d+)/)!.slice(1).map(Number))
 const games=match.score_summary.games.map(s=>match.player1.name===ref.winner?s:[s[1],s[0]])
 const suppliedTies=[...match.final_score.matchAll(/\d+[–-]\d+(?:\((\d+)\))?/g)].map(set=>set[1])
 const expectedTies=ref.score.split(' ').map(set=>set.match(/\((\d+)\)/)?.[1])
 const wrongTie=suppliedTies.some((tie,index)=>tie!==undefined&&tie!==expectedTies[index])
 return winner!==ref.winner||JSON.stringify(games)!==JSON.stringify(expected)||wrongTie?'El resultado no coincide con la final contrastada en la fuente oficial.':null
}
export function referenceScore(match:Match){
 const ref=referenceFinal(match)
 if(!ref||referenceIssue(match))return match.final_score
 return match.player1.name===ref.winner?ref.score:ref.score.split(' ').map(s=>s.replace(/^(\d+)–(\d+)/,'$2–$1')).join(' ')
}
