/** Neutralize spreadsheet formulas while keeping a standards-compliant quoted CSV field. */
export function csvCell(value:unknown){
  const text=String(value??''),safe=/^[\t\r ]*[=+@]/.test(text)||/^[\t\r ]*-(?!\d)/.test(text)?`'${text}`:text;
  return `"${safe.replaceAll('"','""')}"`;
}
