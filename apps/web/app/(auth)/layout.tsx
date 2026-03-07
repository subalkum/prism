import React from 'react'
import Link from 'next/link'

export default function AuthLayout({children}: {children: React.ReactNode}) {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center overflow-y-auto px-4 py-8 gap-6'>
      {/* Demo button — rendered in the layout so it ALWAYS shows above Clerk */}
      <Link
        href="/demo"
        className="group relative z-50 inline-flex w-full max-w-[400px] items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Try Live Demo
        <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          No sign-up
        </span>
      </Link>

      <div className="flex items-center gap-3 w-full max-w-[400px]">
        <div className="h-px flex-1 bg-gray-600" />
        <span className="text-[11px] text-gray-400 uppercase tracking-widest">or sign in</span>
        <div className="h-px flex-1 bg-gray-600" />
      </div>

      {children}
    </div>
  )
}
