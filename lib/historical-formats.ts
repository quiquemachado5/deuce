import type {Match} from './types';
/** Reviewed format exceptions. Never infer a shorter format from an incomplete score. */
export function historicalFormat(match:Pick<Match,'tour'|'category'|'tournament'|'year'|'round'|'context'>){
  if(match.category==='WTA Finals'&&match.round==='Final'&&match.year>=1984&&match.year<=1998)return {bestOf:5,source:'https://wtafiles.wtatennis.com/pdf/publications/WTAMG25_WTAFinals.pdf',corroboration:'https://www.wtatennis.com/tournaments/808/wta-finals/past-winners'};
  if(match.context?.qualifying===true||match.tour==='wta'||match.category!=='Grand Slam')return null;
  const early=(rounds:string[])=>rounds.includes(match.round);
  const dateYear=Number(match.context?.date?.slice(0,4));
  const editionYear=match.tournament==='Australian Open'&&dateYear>=1971&&dateYear<=1975&&match.context?.date?.slice(5,7)==='12'?dateYear+1:match.year;
  if(match.tournament==='Australian Open'&&match.year===1982&&early(['R32','R16','Ronda de 32','Octavos de final']))return {bestOf:3,source:'https://www.tennismajors.com/australian-open-news/december-13-1982-kriek-achieves-unique-double-at-australian-open-311860.html',corroboration:'https://en.wikipedia.org/wiki/1982_Australian_Open_%E2%80%93_Men%27s_singles'};
  if(match.tournament==='Roland Garros'&&[1973,1974,1975].includes(match.year)&&early(['R128','R64','Ronda de 128','Ronda de 64']))return {bestOf:3,source:'https://www.tennisabstract.com/blog/2023/05/24/may-24-1973-all-together-now/',corroboration:'https://www.tennis.com/news/articles/chris-evert-bjorn-borg-1974-first-grand-slam-title-french-open-roland-garros'};
  if(match.tournament==='US Open'&&[1975,1976,1977,1978].includes(match.year)&&early(['R128','R64','R32','Ronda de 128','Ronda de 64','Ronda de 32',...(match.year===1977?['R16','Octavos de final']:[])]))return {bestOf:3,source:'https://www.tennismajors.com/our-features/long-form-our-features/how-the-us-open-missed-a-trick-not-trying-a-shorter-scoring-format-281811.html',corroboration:'https://www.tennis.com/news/articles/the-first-few-rounds-of-the-u-s-open-should-be-best-of-three-for-men'};
  if(match.tournament==='Australian Open'&&[1970,1973,1974].includes(editionYear)&&early(['R64','Ronda de 64']))return {bestOf:3,source:`https://en.wikipedia.org/wiki/${editionYear}_Australian_Open_%E2%80%93_Men%27s_singles`,corroboration:'https://en.wikipedia.org/wiki/List_of_Australian_Open_men%27s_singles_champions'};
  // Men's major draws use five sets unless a documented exception above applies.
  // Provider best_of is sometimes wrong (notably Wimbledon 1978).
  return {bestOf:5,source:'https://www.itftennis.com/en/about-us/tennis-tech/science-behind-tennis/rules-and-regulations/',corroboration:'https://www.wimbledon.com/en_GB/about_wimbledon/rules.html'};
}
