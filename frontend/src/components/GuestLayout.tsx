import { Link } from "react-router-dom";

interface GuestLayoutProps {
  children: React.ReactNode;
}

export default function GuestLayout({ children }: GuestLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <img
              src="/splitsnap-logo.png"
              alt="SplitSnap Logo"
              className="h-9 w-9 object-contain"
            />
            <span className="text-2xl font-extrabold tracking-tight bg-linear-to-br from-amber-200 via-amber-400 to-amber-700 bg-clip-text text-transparent">
              SplitSnap
            </span>
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
