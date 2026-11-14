import {headers} from 'next/headers';
export type StructuredDataValue = Record<string, unknown> | Array<Record<string, unknown>>;

export async function StructuredData({ value }: { value: StructuredDataValue }) {
  const nonce=(await headers()).get('x-nonce')||undefined;
  return <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}
