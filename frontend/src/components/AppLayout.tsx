import { Link } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-3">
            <img
              src="/splitsnap-logo.png"
              alt=""
              className="h-10 w-10 rounded-xl object-contain"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-emerald-400">
                SplitSnap
              </h1>
              <p className="text-xs text-slate-400">
                Scan the bill. Tap what you ate. Pay your share.
              </p>
            </div>
          </Link>
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-9 h-9",
              },
            }}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
