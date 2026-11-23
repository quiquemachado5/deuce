import type {Metadata} from 'next';
import Game from './Game';
export const metadata:Metadata={title:'Juego diario · DEUCE',description:'Adivina el partido del día y vota tus tres partidos favoritos del archivo DEUCE.',robots:{index:false,follow:false}};
export default function Page(){return <Game/>;}
