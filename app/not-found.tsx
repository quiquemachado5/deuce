import Link from "next/link";
export const metadata = {
  title: "Página no encontrada — DEUCE",
  robots: { index: false },
};
export default function NotFound() {
  return (
    <div className="nc-wrap ry-not-found">
      <p className="ry-not-found-code">Error 404</p>
      <h1>Esta página no está.</h1>
      <p>El enlace no forma parte del archivo.</p>
      <Link href="/">Volver al inicio</Link>
    </div>
  );
}
