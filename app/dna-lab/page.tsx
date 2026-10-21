import { redirect } from "next/navigation";

export default async function SequenceArchive({ searchParams }: { searchParams: Promise<{ left?: string; right?: string }> }) {
  const { left, right } = await searchParams;
  const query = new URLSearchParams();
  if (left) query.set("left", left);
  if (right) query.set("right", right);
  redirect("/compare" + (query.size ? "?" + query : ""));
}
