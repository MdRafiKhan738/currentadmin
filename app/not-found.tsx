"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Home, SearchX } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  return (
    <main className="min-h-screen bg-[#f1f5f9] flex items-center justify-center px-4">
      <section className="w-full max-w-lg rounded-sm border border-slate-300 bg-white p-8 text-center shadow-xl">
        <SearchX className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-700">Shadamon Admin</p>
        <h1 className="mt-2 text-4xl font-black text-slate-900">404</h1>
        <p className="mt-2 text-sm text-slate-500">The admin page you requested could not be found.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button onClick={() => router.push("/dashboard")} className="inline-flex items-center gap-2 bg-slate-950 px-4 py-2 text-sm font-bold text-white">
            <Home className="h-4 w-4" /> Dashboard
          </button>
        </div>
      </section>
    </main>
  );
}
