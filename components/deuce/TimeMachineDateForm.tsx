'use client';

import { useId, useState } from 'react';

export function TimeMachineDateForm({ action, language, day, month, months, tour, className, showCircuit = false }: {
  action: string; language: 'es' | 'en'; day: number; month: number; months: string[]; tour: string; className: string; showCircuit?: boolean;
}) {
  const fieldId = useId();
  const [selectedMonth, setMonth] = useState(month);
  const [selectedDay, setDay] = useState(day);
  const numberOfDays = (value: number) => new Date(Date.UTC(2000, value, 0)).getUTCDate();
  const en = language === 'en';
  const date = [selectedMonth, selectedDay].map(value => String(value).padStart(2, '0')).join('-');
  return <form className={className} action={action}>
    {!showCircuit && tour !== 'all' && <input type="hidden" name="tour" value={tour} />}
    <input type="hidden" name={en ? 'date' : 'fecha'} value={date} />
    <div><label htmlFor={fieldId+'-day'}>{en ? 'Day' : 'Día'}</label><select id={fieldId+'-day'} value={selectedDay} onChange={event => setDay(Number(event.target.value))}>
      {Array.from({ length: numberOfDays(selectedMonth) }, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
    </select></div>
    <div><label htmlFor={fieldId+'-month'}>{en ? 'Month' : 'Mes'}</label><select id={fieldId+'-month'} value={selectedMonth} onChange={event => {
      const value = Number(event.target.value);
      setMonth(value);
      setDay(previous => Math.min(previous, numberOfDays(value)));
    }}>
      {months.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
    </select></div>
    {showCircuit && <div><label htmlFor={fieldId+'-tour'}>{en ? 'Tour' : 'Circuito'}</label>
      <select id={fieldId+'-tour'} name="tour" defaultValue={tour}><option value="all">{en ? 'Both' : 'Ambos'}</option><option value="atp">ATP</option><option value="wta">WTA</option></select>
    </div>}
    <button type="submit">{en ? 'Show results' : 'Ver resultados'}</button>
  </form>;
}
