import { Link } from "react-router-dom";

interface ErrorBoxProps {
  message: string;
  backTo?: string;
  backLabel?: string;
}

/** Blok error konsisten — rule coral di kiri, tanpa emoji. */
export default function ErrorBox({
  message,
  backTo = "/",
  backLabel = "Kembali ke Beranda",
}: ErrorBoxProps) {
  return (
    <div className="panel border-l-[3px] border-l-coral p-5" role="alert">
      <h2 className="text-sm font-semibold text-coral-ink mb-1.5">Terjadi kesalahan</h2>
      <p className="text-sm text-navy/85 mb-3">{message}</p>
      <Link to={backTo} className="btn-ghost -ml-3">
        &larr; {backLabel}
      </Link>
    </div>
  );
}
