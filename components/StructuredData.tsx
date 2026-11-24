export type StructuredDataValue = Record<string, unknown> | Array<Record<string, unknown>>;

export function StructuredData({ value }: { value: StructuredDataValue }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }} />;
}
