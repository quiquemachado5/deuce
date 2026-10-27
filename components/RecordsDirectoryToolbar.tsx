'use client';

import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import RecordsControls, { type RecordFilter } from '@/components/RecordsControls';
import type { RecordQuery } from '@/lib/records-url';

export default function RecordsDirectoryToolbar({ query, filters }: { query: RecordQuery; filters: RecordFilter[] }) {
  return <details className="records-filter-disclosure">
    <summary><Search size={16} aria-hidden="true"/><span>Buscar</span><SlidersHorizontal size={15} aria-hidden="true"/><ChevronDown size={13} aria-hidden="true"/></summary>
    <div className="records-filter-popover"><RecordsControls query={query} filters={filters} searchable/></div>
  </details>;
}
