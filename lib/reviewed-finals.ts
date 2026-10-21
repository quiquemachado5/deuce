import type { Match } from './types'
/** Independently reviewed reference results. Score is always from winner's side. */
export const reviewedFinals = [
 {tournament:'Cincinnati',year:2023,winner:'Novak Djokovic',loser:'Carlos Alcaraz',score:'5–7 7–6(7) 7–6(4)',source:'https://www.atptour.com/en/news/alcaraz-djokovic-cincinnati',reviewed:'2026-10-19'},
 {tournament:'Wimbledon',year:2008,winner:'Rafael Nadal',loser:'Roger Federer',score:'6–4 6–4 6–7(5) 6–7(8) 9–7',source:'https://www.atptour.com/en/news/rafael-nadal-retirement-memorable-matches',reviewed:'2026-10-19'},
 {tournament:'Wimbledon',year:2023,winner:'Carlos Alcaraz',loser:'Novak Djokovic',score:'1–6 7–6(6) 6–1 3–6 6–4',source:'https://www.atptour.com/en/news/alcaraz-djokovic-wimbledon-2023-sunday-final',reviewed:'2026-10-19'},
] as const
export function referenceFinal(match:Match){return reviewedFinals.find(r=>r.tournament===match.tournament&&r.year===match.year&&/^(final|f)$/i.test(match.round)&&[match.player1.name,match.player2.name].includes(r.winner)&&[match.player1.name,match.player2.name].includes(r.loser))}
export function referenceIssue(match:Match){
 const ref=referenceFinal(match);if(!ref)return null
 const winner=match.winner===1?match.player1.name:match.winner===2?match.player2.name:''
 const expected=ref.score.split(' ').map(s=>s.match(/^(\d+)–(\d+)/)!.slice(1).map(Number))
 const games=match.score_summary.games.map(s=>match.player1.name===ref.winner?s:[s[1],s[0]])
 return winner!==ref.winner||JSON.stringify(games)!==JSON.stringify(expected)?'El resultado no coincide con la final contrastada en la fuente oficial.':null
}
export function referenceScore(match:Match){
 const ref=referenceFinal(match)
 if(!ref||referenceIssue(match))return match.final_score
 return match.player1.name===ref.winner?ref.score:ref.score.split(' ').map(s=>s.replace(/^(\d+)–(\d+)/,'$2–$1')).join(' ')
}
