import type {Metadata} from 'next';
import FilterProposals from './FilterProposals';
export const metadata:Metadata={title:'Propuestas de filtros — DEUCE',robots:{index:false,follow:false}};
export default function Page(){return <FilterProposals/>;}
