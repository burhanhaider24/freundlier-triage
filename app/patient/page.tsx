'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Send, CalendarPlus, Video, AlertOctagon, Calendar, HeartPulse, PhoneCall } from 'lucide-react'

export default function PatientApp() {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [isLocked, setIsLocked] = useState(false)
  const [isEmergencyStatus, setIsEmergencyStatus] = useState(false)
  const [patientId, setPatientId] = useState<string | null>(null)
  const [sessionStart, setSessionStart] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTagline, setShowTagline] = useState(true)
  const [isUrdu, setIsUrdu] = useState(false)
  const [liveSchedule, setLiveSchedule] = useState("Loading Dr. Amber's schedule...")
  
  const [bookingLoading, setBookingLoading] = useState<'online' | 'clinic' | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const greetingLock = useRef(false)
  
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const router = useRouter()

  useEffect(() => {
    setTimeout(() => setShowTagline(false), 3500)

    const init = async () => {
      let currentSession = sessionStorage.getItem('chat_session_start');
      if (!currentSession) {
        currentSession = new Date().toISOString();
        sessionStorage.setItem('chat_session_start', currentSession);
      }
      setSessionStart(currentSession);

      try {
        const schedRes = await fetch('/api/schedule')
        const schedData = await schedRes.json()
        setLiveSchedule(schedData.schedule)
      } catch (err) {
        setLiveSchedule("Unable to load schedule. Please contact clinic.")
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setPatientId(user.id)
        fetchMessages(user.id, currentSession)
        
        const channel = supabase.channel('msgs')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `patient_id=eq.${user.id}` }, 
          (payload) => {
            if (new Date(payload.new.created_at) >= new Date(currentSession!)) {
              setMessages((prev) => {
                if (prev.some(m => m.content === payload.new.content)) return prev;
                return [...prev, payload.new]
              })
              if (payload.new.content.includes('[URGENT') || payload.new.content.includes('🚨')) {
                setIsLocked(true);
                setIsEmergencyStatus(true);
              }
              setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
            }
          }).subscribe()
          
        return () => { supabase.removeChannel(channel) }
      }
    }
    init()
  }, [])

  const fetchMessages = async (id: string, start: string) => {
    const { data } = await supabase.from('messages').select('*').eq('patient_id', id).gte('created_at', start).order('created_at', { ascending: true })
    if (data && data.length > 0) {
      setMessages(data)
      const hasEmergency = data.some(m => m.content.includes('Alert') || m.content.includes('[URGENT') || m.content.includes('🚨'))
      if (hasEmergency) {
        setIsLocked(true)
        setIsEmergencyStatus(true)
      } else if (data.filter(m => m.role === 'user').length >= 3) { 
        setIsLocked(true)
      }
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } else if (data && data.length === 0 && !greetingLock.current) {
      greetingLock.current = true;
      const greeting = "Hello! I am Freundlier, Dr. Amber's intake assistant. How are you feeling today?\n\nالسلام علیکم! میں فرینڈلیر ہوں، ڈاکٹر امبر کا اسسٹنٹ۔ آج آپ کیسا محسوس کر رہے ہیں؟"
      await supabase.from('messages').insert({ patient_id: id, role: 'ai', content: greeting, created_at: start })
      setMessages([{ id: Date.now(), role: 'ai', content: greeting }])
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLocked || !patientId || isLoading) return
    const msg = input
    setInput('')
    setIsLoading(true)
    
    setMessages(prev => {
      const next = [...prev, { id: Date.now(), role: 'user', content: msg }];
      const userCount = next.filter(m => m.role === 'user').length;
      if (userCount >= 3) setIsLocked(true);
      return next;
    });

    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

    try {
      const promptModifier = isUrdu ? `${msg} (Note for AI: Please respond to this naturally using pure Urdu script)` : msg;
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: promptModifier, patientId, sessionStart })
      })
      const data = await res.json()
      
      if (data.response) {
        setMessages(prev => {
          if (prev.some(m => m.content === data.response)) return prev;
          return [...prev, { id: Date.now() + 1, role: 'ai', content: data.response }]
        })
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }

      if (data.isEmergency) {
        setIsLocked(true)
        setIsEmergencyStatus(true)
      } 
    } catch (error) { 
        console.error("Failed", error) 
    } finally { 
        setIsLoading(false) 
    }
  }

  const handleSOS = async () => {
    if (!patientId || isLocked) return;
    const confirmSOS = window.confirm("Are you in a crisis? This will alert Dr. Amber immediately.")
    if (!confirmSOS) return;

    setIsLoading(true)
    await supabase.from('alerts').insert({ patient_id: patientId, severity: 'High' })
    await supabase.from('messages').insert({ patient_id: patientId, role: 'user', content: '🚨 PATIENT TRIGGERED SOS BUTTON' })
    const alertResponse = "⚠️ [URGENT ALERT FROM DR. AMBER]: I have been notified of your message. Please contact the clinic immediately at 042-111-222-333 or call 1122 right now. Your safety is our absolute priority."
    await supabase.from('messages').insert({ patient_id: patientId, role: 'ai', content: alertResponse })
    
    setMessages(prev => [
      ...prev, 
      { id: Date.now(), role: 'user', content: '🚨 PATIENT TRIGGERED SOS BUTTON' },
      { id: Date.now() + 1, role: 'ai', content: alertResponse }
    ])

    setIsLocked(true)
    setIsEmergencyStatus(true)
    setIsLoading(false)
  }

  const handleBooking = async (type: 'online' | 'clinic', isEmergency = false) => {
    if (!patientId) return
    setBookingLoading(type)
    
    try {
      await supabase.from('appointments').insert({ patient_id: patientId, type, status: 'pending' })
      if (isEmergency) {
        alert("⚠️ Earliest Priority Slot requested. Dr. Amber will be notified immediately.")
      } else {
        alert(`Appointment requested. Dr. Amber will review it shortly.`)
      }
    } finally {
      setBookingLoading(null)
    }
  }

  const handleLogout = async () => {
    sessionStorage.removeItem('chat_session_start');
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col relative">
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-[#69C3E3]/10 to-transparent pointer-events-none"></div>

      {showTagline && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-white/80 backdrop-blur-md transition-opacity duration-500">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 animate-fade-in-up">A Friend for Every Mind.</h2>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto pt-6 px-4 shrink-0 z-10">
        <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl px-6 py-3 flex justify-between items-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="Freundlier Logo" width={220} height={60} className="h-14 sm:h-16 w-auto object-contain" priority />
            <div className="hidden sm:block border-l-2 pl-4 border-gray-100 z-10">
              <p className="text-[10px] text-[#69C3E3] font-black tracking-widest uppercase mt-0.5">By Team Med-Excel</p>
            </div>
          </div>
          <div className="flex items-center gap-4 z-10">
            <button onClick={() => setIsUrdu(!isUrdu)} className={`text-xs px-5 py-2 rounded-full border transition-all font-bold tracking-wide ${isUrdu ? 'bg-[#69C3E3] text-white border-[#69C3E3] shadow-md shadow-[#69C3E3]/20' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              اردو
            </button>
            <button onClick={handleLogout} className="text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">Log out</button>
          </div>
        </div>
      </div>
      
      <div className="w-full max-w-4xl mx-auto px-4 mt-4 z-10">
        <div className="bg-red-50/80 backdrop-blur-md rounded-2xl text-red-700 py-3 px-6 flex justify-between items-center shadow-sm border border-red-100">
          <span className="text-[11px] uppercase tracking-widest font-bold hidden sm:inline">Clinical Psychology Intake</span>
          {!isLocked && (
            <button onClick={handleSOS} className="bg-red-600 text-white px-5 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-red-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-xs">
              <AlertOctagon className="w-4 h-4" /> Use SOS for Severe Distress
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto overflow-y-auto px-4 py-8 space-y-8 z-10 scroll-smooth pb-40">
        {messages.length === 0 && !isLoading && (
           <div className="text-center mt-12 flex flex-col items-center gap-4">
             <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center animate-pulse shadow-sm border border-blue-100">
                <HeartPulse className="text-[#69C3E3] w-8 h-8" />
             </div>
             <p className="text-sm font-semibold text-gray-400 tracking-wide">Your session is secure. Say hello to begin.</p>
           </div>
        )}
        
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          const isAlert = m.content.includes('Alert') || m.content.includes('[URGENT') || m.content.includes('🚨');
          const textClass = /[\u0600-\u06FF]/.test(m.content) ? 'font-nastaliq text-2xl leading-loose tracking-wide' : 'text-[15px] leading-relaxed font-medium';
          
          return (
            <div key={m.id || i} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`px-6 py-4 max-w-[90%] sm:max-w-[80%] whitespace-pre-wrap shadow-sm ${
                isUser ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-3xl rounded-tr-sm shadow-md' 
                       : isAlert ? 'bg-red-50 ring-1 ring-red-200 text-red-800 rounded-3xl rounded-tl-sm font-bold shadow-sm'
                                 : 'bg-white text-gray-800 rounded-3xl rounded-tl-sm shadow-[0_4px_20px_rgb(0,0,0,0.04)] ring-1 ring-gray-100'
              } ${textClass}`}>
                {m.content}
              </div>
            </div>
          )
        })}
        {isLoading && (
          <div className="flex justify-start animate-in fade-in">
            <div className="bg-white px-6 py-4 rounded-3xl rounded-tl-sm shadow-[0_4px_20px_rgb(0,0,0,0.04)] ring-1 ring-gray-100 flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-[#69C3E3]" />
              <span className="text-sm font-medium text-gray-400 tracking-wide">Freundlier is typing...</span>
            </div>
          </div>
        )}
        <div ref={scrollRef} className="h-4" />
      </div>

      <div className="fixed bottom-0 inset-x-0 pb-6 px-4 z-20 pointer-events-none">
        <div className="w-full max-w-4xl mx-auto pointer-events-auto">
          {isLocked ? (
            <div className="bg-white/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 animate-in slide-in-from-bottom-8 duration-500">
              {isEmergencyStatus ? (
                <div className="flex flex-col gap-6">
                  <div className="bg-red-50/80 p-5 rounded-2xl border border-red-100 text-red-800">
                     <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><HeartPulse className="w-5 h-5 text-red-600"/> Urgent Support Active</h3>
                     <p className="text-sm font-medium">Please request the earliest available priority slot below, or contact the clinic immediately.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => handleBooking('clinic', true)} disabled={bookingLoading !== null} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none">
                      {bookingLoading === 'clinic' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarPlus className="w-5 h-5" />} Request Priority Slot
                    </button>
                    <div className="flex flex-col md:flex-row gap-3">
                      <a href="tel:042111222333" className="flex-1 py-4 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-2xl font-bold shadow-sm transition-all flex items-center justify-center gap-2">
                        <PhoneCall className="w-5 h-5" /> Contact Clinic
                      </a>
                      <a href="tel:1122" className="flex-1 py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold shadow-md transition-all flex items-center justify-center gap-2">
                        <AlertOctagon className="w-5 h-5" /> Call 1122
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#69C3E3]"/> Dr. Amber's Current Schedule
                    </h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap font-medium">{liveSchedule}</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3">
                    <button onClick={() => handleBooking('online')} disabled={bookingLoading !== null} className="flex-1 py-4 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none">
                      {bookingLoading === 'online' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Video className="w-5 h-5" />} Request Online Slot
                    </button>
                    <button onClick={() => handleBooking('clinic')} disabled={bookingLoading !== null} className="flex-1 py-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 rounded-2xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70">
                      {bookingLoading === 'clinic' ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarPlus className="w-5 h-5" />} Book Clinic Slot
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-xl p-2 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100 flex gap-2 items-center transition-all focus-within:ring-2 focus-within:ring-[#69C3E3]/50 focus-within:bg-white">
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                disabled={isLoading}
                dir={isUrdu ? "rtl" : "ltr"}
                aria-label="Type your message here"
                className={`flex-1 px-6 py-4 bg-transparent focus:outline-none text-gray-900 placeholder-gray-400 ${isUrdu ? 'font-nastaliq text-lg' : 'text-[15px] font-medium'}`} 
                placeholder="Type your message here..." 
              />
              <button onClick={sendMessage} disabled={isLoading || !input.trim()} className="bg-gradient-to-r from-[#69C3E3] to-[#5bb2d1] hover:from-[#5bb2d1] hover:to-[#4aa1c0] text-white p-4 rounded-full shadow-md transition-transform transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center mr-1">
                <Send className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}