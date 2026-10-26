export type Surface = 'hard' | 'clay' | 'grass' | 'carpet' | 'unknown'
export type Point = { set:number; game:number; point_number:number; server:1|2|null; score:string; score_before?:string; game_ended?:boolean; winner:1|2|null; rally_length:number|null; is_ace:boolean|null; is_double_fault:boolean|null; is_break_point:boolean|null; break_converted:boolean|null; is_match_point:boolean|null; match_point_for?:1|2|null; first_serve_in:boolean|null; is_unforced_error?:boolean|null; win_probability_p1?:number|null; danger?:number|null }
export type MatchStat = { player:1|2|null; period:string; category:string; name:string; value:string; won:number|null; total:number|null }
export type Match = { editorial_highlight?:string; match_id:string; tournament:string; surface:Surface; category:string; year:number; player1:{name:string;seed:number|null};player2:{name:string;seed:number|null};score_summary:{sets:number[];games:number[][];points:string[];server:number|null;is_tiebreak:boolean;win_probability_p1:number|null;timestamp:string};final_score:string;round:string;winner:1|2|null;status:string;point_tape:Point[];statistics:MatchStat[];raw_fixture?:unknown;data_source:'mock'|'api'|'reference';raw_point_tape?:unknown; coverage?:string; quality?:{result:'consistent'|'review';reason?:string;tapeIssue?:string;tape?:'none'|'partial'|'reliable'}; context?:{ metadataSources?:{field:string;url:string}[]; endDate?:string; date?:string|null; dateLabel?:string; rank1?:number|null; rank2?:number|null; rankLabel?:string; resultSource?:string; age1?:number|null; age2?:number|null; minutes?:number|null; format?:string|null; indoor?:boolean|null } }
export const TOURNAMENTS = [
 {name:'Australian Open',slug:'australian-open',surface:'hard',category:'Grand Slam'},
 {name:'Roland Garros',slug:'roland-garros',surface:'clay',category:'Grand Slam'},
 {name:'Wimbledon',slug:'wimbledon',surface:'grass',category:'Grand Slam'},
 {name:'US Open',slug:'us-open',surface:'hard',category:'Grand Slam'},
 {name:'Indian Wells',slug:'indian-wells',surface:'hard',category:'Masters 1000'},
 {name:'Miami',slug:'miami',surface:'hard',category:'Masters 1000'},
 {name:'Monte Carlo',slug:'monte-carlo',surface:'clay',category:'Masters 1000'},
 {name:'Madrid',slug:'madrid',surface:'clay',category:'Masters 1000'},
 {name:'Rome',slug:'rome',surface:'clay',category:'Masters 1000'},
 {name:'Canada',slug:'canada',surface:'hard',category:'Masters 1000'},
 {name:'Cincinnati',slug:'cincinnati',surface:'hard',category:'Masters 1000'},
 {name:'Shanghai',slug:'shanghai',surface:'hard',category:'Masters 1000'},
 {name:'Paris',slug:'paris',surface:'hard',category:'Masters 1000'},
] as const
