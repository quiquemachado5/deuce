import type {ResearchProduct} from './contracts';
/** RFC 4180. Only text cells are neutralised for spreadsheet formula injection;
 * real negative measurements remain numeric. Proofs are examples, not a full census. */
export function researchCsv(product:ResearchProduct){
 const cell=(value:string|number)=>{
  let text=String(value);if(typeof value==='string'&&/^[\s\u0000-\u001f]*[=+@-]/.test(text))text="'"+text;
  return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;
 };
 const rows:(string|number)[][]=[['dataset_version','definition_version','metric_id','tour','entity','value','sample','detail','evidence_examples']];
 if(product.status==='calculated-in-sample')for(const row of product.rows)rows.push([product.datasetVersion,product.definitionVersion,product.id,product.tour,row.entity,row.value,row.sample,row.detail||'',row.proof.join(' | ')]);
 return rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
export const researchDataDictionary={
 schema:1,encoding:'UTF-8',format:'CSV RFC 4180',
 fields:{dataset_version:'Immutable source dataset identity',definition_version:'Hash of formulas, transitive dependencies and evidence',metric_id:'Stable research definition ID, 1–100',tour:'ATP or WTA, never aggregated across circuits',entity:'Player, pair, edition, era or selection described by the definition',value:'Numeric derived measurement; units and selection are defined by metric and detail, not universally matches',sample:'Number of contributing match observations or cited external sources; see definition',detail:'Scope and interpretation of the measurement',evidence_examples:'Example match IDs or source URLs; not a complete list of contributing observations'},
 policy:'Archive sample only. Missing evidence blocks the product; an empty output is not a measured zero. Formula-neutralisation apostrophe may prefix text cells beginning with spreadsheet operators.',
 rights:'Source data and images retain their respective terms; this dictionary does not grant redistribution rights to third-party materials.',
};
