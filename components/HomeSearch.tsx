'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { SearchResults } from '@/components/nocturno/Frame';

export default function HomeSearch() {
  const [query, setQuery] = useState('');
  return <div className="home-search">
    <form action="/buscar" role="search">
      <Search size={20} aria-hidden="true" />
      <label className="ry-sr" htmlFor="home-search-query">Buscar en el archivo</label>
      <input id="home-search-query" name="q" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Jugador, torneo o partido" autoComplete="off" />
      <button type="submit" aria-label="Buscar">Buscar</button>
    </form>
    {query.trim() ? <SearchResults query={query} clear={() => setQuery('')} /> : <p>Prueba con un jugador, una final o un torneo</p>}
  </div>;
}
