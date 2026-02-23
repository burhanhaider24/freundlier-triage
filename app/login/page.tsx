'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return; }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
      const role = profile?.role || (data.user.email === 'dramber@freundlier.com' ? 'doctor' : 'patient')
      router.push(`/${role}`)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen relative flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#69C3E3]/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-20%] left-[20%] w-[30rem] h-[30rem] bg-blue-100/50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center relative z-10">
        {/* THE FIX: Bigger Logo Container */}
        <div className="relative w-96 h-36 mb-4 drop-shadow-md scale-110">
          <Image src="/logo.png" alt="Freundlier Logo" fill className="object-contain" priority />
        </div>
        <h2 className="mt-2 text-center text-3xl font-bold tracking-tight text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
          Welcome to Freundlier
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 font-medium tracking-wide uppercase">
          Enterprise Clinical Triage
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Glassmorphic Card */}
        <div className="bg-white/80 backdrop-blur-xl py-10 px-6 sm:rounded-3xl sm:px-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40">
          <form className="space-y-7" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#69C3E3]/50 focus:border-[#69C3E3] transition-all text-gray-900 placeholder-gray-400" placeholder="dramber@freundlier.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#69C3E3]/50 focus:border-[#69C3E3] transition-all text-gray-900 placeholder-gray-400" placeholder="••••••••" />
            </div>

            {error && <div className="text-red-600 text-sm bg-red-50/80 backdrop-blur-sm p-4 rounded-xl border border-red-100 font-medium">{error}</div>}

            <button type="submit" disabled={loading} className="group w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl shadow-md shadow-[#69C3E3]/20 text-sm font-semibold text-white bg-gradient-to-r from-[#69C3E3] to-[#5bb2d1] hover:from-[#5bb2d1] hover:to-[#4aa1c0] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#69C3E3] disabled:opacity-70 transition-all duration-300 transform active:scale-[0.98]">
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <>Secure Login <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>}
            </button>
          </form>
          
          {/* TEAM MED-EXCEL BRANDING (Normal Text) */}
          <div className="mt-8 text-center pb-2">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-1">Architected & Engineered By</p>
            {/* THE FIX: Removed font-black, added font-normal */}
            <p className="text-sm font-normal bg-clip-text text-transparent bg-gradient-to-r from-[#69C3E3] to-indigo-500 tracking-tight">
              Team Med-Excel
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}