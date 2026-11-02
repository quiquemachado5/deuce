import {permanentRedirect} from 'next/navigation';

export default function WtaRedirect(){
  permanentRedirect('/buscar?tour=wta');
}
