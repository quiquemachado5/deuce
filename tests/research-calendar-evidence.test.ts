import test from 'node:test';
import assert from 'node:assert/strict';
import {corroboratedEventWindows,reviewedEventWindows} from '../lib/research/calendar-evidence';
import {eligibleFor} from '../lib/research/contracts';
import type {Match} from '../lib/types';
test('reviewed main-draw windows have independent sources and do not manufacture other years',()=>{
 const windows=reviewedEventWindows();assert.equal(windows.size,4);assert.deepEqual(windows.get('Wimbledon|2024'),{start:'2024-07-01',end:'2024-07-14'});assert.equal(windows.has('Wimbledon|2020'),false);
 const m={year:2024,context:{date:'2024-06-20',dateLabel:'Fecha del partido'}} as Match;
 assert.equal(eligibleFor(m,'event-window',{eventWindows:windows}),true);
 assert.equal(eligibleFor({...m,year:2020},'event-window',{eventWindows:windows}),false);
 assert.equal(eligibleFor({...m,context:{...m.context,dateLabel:'Inicio del torneo'}},'event-window',{eventWindows:windows}),false);
});
test('invalid dates, duplicate editions and two URLs from one publisher fail closed',()=>{
 const row={event:'Wimbledon',year:2024,start:'2024-07-01',end:'2024-07-14',sources:['https://www.wimbledon.com/a','https://www.lta.org.uk/b']};
 assert.throws(()=>corroboratedEventWindows([{...row,start:'2024-02-30'}]));assert.throws(()=>corroboratedEventWindows([row,row]));
 assert.throws(()=>corroboratedEventWindows([{...row,sources:['https://www.wimbledon.com/a','https://wimbledon.com/b']}]));
});
