import {permanentRedirect} from 'next/navigation';

export default function WtaRedirect(){
  permanentRedirect('/partidos?tour=wta');
}
