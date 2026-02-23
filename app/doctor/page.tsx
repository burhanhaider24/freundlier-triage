'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, AlertTriangle, Calendar, CheckCircle, BellRing, Clock, Users, Activity, ArrowUpRight, Printer, RefreshCw } from 'lucide-react'

const DEMO_SCHEDULE = `🏥 In-Person Psychology Clinic:
• Monday & Wednesday: 09:00 AM - 01:00 PM
• Friday: 03:00 PM - 07:00 PM

💻 Online Video Consultations:
• Tuesday & Thursday: 04:00 PM - 08:00 PM
• Saturday: 11:00 AM - 02:00 PM

🚨 Urgent Care: Contact clinic directly for priority slots.`

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [appointments, setAppointments] = useState<any[]>([])
  const [allMessages, setAllMessages] = useState<any[]>([])
  const [loadingPatientId, setLoadingPatientId] = useState<string | null>(null)
  
  const autoAttempted = useRef<Set<string>>(new Set())
  
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const router = useRouter()

  const fetchData = async () => {
    const [profRes, repRes, alertRes, apptRes, msgRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'patient'),
      supabase.from('reports').select('*').order('created_at', { ascending: false }),
      supabase.from('alerts').select('*').order('created_at', { ascending: false }),
      supabase.from('appointments').select('*').order('requested_at', { ascending: false }),
      supabase.from('messages').select('*')
    ])

    if (profRes.data) setPatients(profRes.data)
    if (repRes.data) setReports(repRes.data)
    if (alertRes.data) setAlerts(alertRes.data)
    if (apptRes.data) setAppointments(apptRes.data)
    if (msgRes.data) setAllMessages(msgRes.data)
  }

  useEffect(() => { 
    fetchData() 
    const channel = supabase.channel('doctor_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, fetchData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    patients.forEach(p => {
      const hasReport = reports.some(r => r.patient_id === p.id)
      const hasAlert = alerts.some(a => a.patient_id === p.id)
      const patientMsgCount = allMessages.filter(m => m.patient_id === p.id && m.role === 'user').length
      
      if (!hasReport && !autoAttempted.current.has(p.id) && (hasAlert || patientMsgCount >= 3)) {
        autoAttempted.current.add(p.id) 
        handleTriageSync(p.id)
      }
    })
  }, [patients, reports, alerts, allMessages])

  const handleApproveAppointment = async (id: string) => {
    await supabase.from('appointments').update({ status: 'approved', approved_time: new Date() }).eq('id', id)
    fetchData()
  }

  const handleTriageSync = async (patientId: string) => {
    setLoadingPatientId(patientId)
    try {
      const res = await fetch('/api/triage', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ patientId }) 
      })
      if (!res.ok) console.error("API Error generating report. Rate limit likely hit.");
      await fetchData()
    } catch (error) {
      console.error("Failed to fetch triage:", error)
    } finally {
      setLoadingPatientId(null)
    }
  }

  const handleUrgentMessage = async (patientId: string) => {
    const confirmSend = window.confirm("Send a psychological crisis alert to this patient's screen?")
    if (!confirmSend) return;
    const msg = "⚠️ [URGENT ALERT FROM DR. AMBER]: Please contact the clinic immediately at 042-111-222-333. Your mental well-being is our priority and we are here to help."
    await supabase.from('messages').insert({ patient_id: patientId, role: 'ai', content: msg })
  }

  const handleExport = (report: any, patientEmail: string) => {
    const win = window.open('', '_blank')
    if (!win) return;
    
    win.document.write(`
      <html>
        <head>
          <title>Clinical Report - ${patientEmail}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1e293b; }
            h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; color: #0f172a; }
            .header-info { margin-bottom: 30px; line-height: 1.8; }
            .risk-High { color: #dc2626; font-weight: 800; background: #fef2f2; padding: 4px 8px; border-radius: 4px; }
            .risk-Medium { color: #ea580c; font-weight: 800; background: #fff7ed; padding: 4px 8px; border-radius: 4px; }
            .risk-Low { color: #16a34a; font-weight: 800; background: #f0fdf4; padding: 4px 8px; border-radius: 4px; }
            .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; margin-top: 20px; }
            p { line-height: 1.6; }
            .footer { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #64748b; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Clinical Triage Report</h1>
          <div class="header-info">
            <div><strong>Patient ID:</strong> ${patientEmail}</div>
            <div><strong>Date of Assessment:</strong> ${new Date(report.created_at).toLocaleString()}</div>
            <div><strong>System Risk Evaluation:</strong> <span class="risk-${report.risk_level}">${report.risk_level}</span></div>
          </div>
          
          <h3>AI Diagnostic Summary</h3>
          <div class="summary-box">
            <p>${report.summary.replace(/\n/g, '<br/>')}</p>
          </div>
          
          <div class="footer">
            Generated securely by Freundlier Clinical Workspace <br/>
            <strong style="color: #69C3E3; font-size: 14px; margin: 8px 0; display: block;">Architected by Team Med-Excel</strong>
            <em>Note: This is an AI-assisted triage summary and should be reviewed by a licensed clinician.</em>
          </div>
        </body>
      </html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 250)
  }

  const getRiskStyles = (level: string) => {
    if (level === 'High') return 'bg-red-50 text-red-700 ring-1 ring-red-200/50'
    if (level === 'Medium') return 'bg-orange-50 text-orange-700 ring-1 ring-orange-200/50'
    return 'bg-blue-50 text-[#69C3E3] ring-1 ring-[#A8E6F0]/50'
  }

  const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
  const approvedAppointments = appointments.filter(a => a.status === 'approved').length;
  const newPatients = patients.filter(p => !reports.some(r => r.patient_id === p.id)).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50 px-8 py-4 flex justify-between items-center shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
        <div className="flex items-center gap-4">
          <Image src="/logo.png" alt="Logo" width={220} height={60} className="h-14 sm:h-16 w-auto object-contain" priority />
          <div className="border-l-2 border-gray-100 pl-4 z-10">
            <h1 className="font-bold text-xl text-gray-900 tracking-tight">Freundlier</h1>
            <p className="text-[11px] font-black tracking-widest text-[#69C3E3] uppercase mt-0.5">By Team Med-Excel</p>
          </div>
        </div>
        <button onClick={() => { supabase.auth.signOut(); router.push('/login') }} className="text-sm font-semibold text-gray-500 hover:text-gray-900 px-4 py-2 rounded-full hover:bg-gray-50 transition-all">Sign Out</button>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-10 space-y-10">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Patients', val: patients.length, icon: Users, color: 'text-[#69C3E3]', bg: 'bg-[#69C3E3]/10' },
            { label: 'New Intakes', val: newPatients, icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-50' },
            { label: 'Visits Cleared', val: approvedAppointments, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
            { label: 'Queue (Pending)', val: pendingAppointments, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-50' }
          ].map((metric, i) => (
            <div key={i} className="group bg-white p-6 rounded-3xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className={`${metric.bg} p-3 rounded-2xl`}>
                  <metric.icon className={`${metric.color} w-6 h-6`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-900 transition-colors" />
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight">{metric.val}</h2>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">{metric.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            {appointments.filter(a => a.status === 'pending').length > 0 && (
              <div className="bg-gradient-to-br from-[#69C3E3]/10 to-transparent p-6 rounded-3xl border border-[#69C3E3]/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#69C3E3]/10 rounded-full filter blur-2xl translate-x-1/2 -translate-y-1/2"></div>
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl shadow-sm"><Calendar className="text-[#69C3E3] h-6 w-6" /></div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Appointment Requests</h3>
                      <p className="text-sm text-gray-600 font-medium">Patients await your approval.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    {appointments.filter(a => a.status === 'pending').map(appt => {
                      const pat = patients.find(p => p.id === appt.patient_id)
                      return (
                        <div key={appt.id} className="bg-white border border-gray-100 p-2 pr-4 rounded-full flex items-center gap-4 shadow-sm">
                          <span className="text-sm font-semibold text-gray-700 ml-2">{pat?.email?.split('@')[0]}</span>
                          <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 rounded-md uppercase tracking-wider">{appt.type}</span>
                          <button onClick={() => handleApproveAppointment(appt.id)} className="bg-gray-900 text-white text-xs px-4 py-2 rounded-full font-semibold flex items-center gap-1.5 hover:bg-gray-800 transition-colors shadow-sm">
                            <CheckCircle className="w-3.5 h-3.5"/> Approve
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-end justify-between mb-5 px-1">
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Active Triage Queue</h2>
                <span className="text-sm font-semibold text-gray-500">{patients.length} Cases</span>
              </div>
              
              <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] overflow-hidden divide-y divide-gray-50">
                {patients.map(patient => {
                  const patientReport = reports.find(r => r.patient_id === patient.id)
                  const hasAlert = alerts.some(a => a.patient_id === patient.id)
                  
                  return (
                    <div key={patient.id} className="p-7 hover:bg-gray-50/50 transition-colors group">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center font-bold text-gray-500 shadow-sm">
                            {patient.email?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-3">
                              {patient.email}
                              {hasAlert && <span className="bg-red-50 text-red-600 text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 ring-1 ring-red-200 animate-pulse"><AlertTriangle className="w-3.5 h-3.5" /> High Alert</span>}
                            </h3>
                            <p className="text-xs text-gray-400 font-medium mt-0.5">ID: {patient.id.slice(0,8)}...</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {patientReport ? (
                            <div className="flex items-center gap-2">
                              <div className={`px-5 py-2 rounded-full text-sm font-bold shadow-sm ${getRiskStyles(patientReport.risk_level)}`}>
                                Risk: {patientReport.risk_level}
                              </div>
                              
                              <button 
                                onClick={() => handleExport(patientReport, patient.email)} 
                                className="text-gray-500 hover:text-indigo-600 transition-colors p-2.5 bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 rounded-full flex items-center justify-center" 
                                title="Export PDF Note"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              <button 
                                onClick={() => handleTriageSync(patient.id)} 
                                disabled={loadingPatientId === patient.id} 
                                className="text-gray-500 hover:text-gray-900 transition-colors p-2.5 bg-white border border-gray-200 shadow-sm hover:shadow-md hover:bg-gray-50 rounded-full flex items-center justify-center" 
                                title="Regenerate Clinical Report"
                              >
                                {loadingPatientId === patient.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleTriageSync(patient.id)} 
                              disabled={loadingPatientId === patient.id} 
                              className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-all"
                            >
                              {loadingPatientId === patient.id ? <Loader2 className="h-4 w-4 animate-spin" /> : '🧠 Generate Report'}
                            </button>
                          )}
                        </div>
                      </div>

                      {patientReport && (
                        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-5">
                          <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-gray-100 w-full relative">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#69C3E3] rounded-l-2xl"></div>
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 pl-2">AI Clinical Summary generated via Gemini</h4>
                            <p className="text-[15px] text-gray-700 leading-relaxed pl-2 whitespace-pre-wrap">{patientReport.summary}</p>
                          </div>
                          
                          <div className="flex justify-end">
                              <button onClick={() => handleUrgentMessage(patient.id)} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-sm transition-all duration-300 flex items-center gap-2 ring-1 ring-red-200 border-0">
                                <BellRing className="h-4 w-4" /> Send Crisis Alert
                              </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
             <div className="bg-white p-7 rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] sticky top-28">
               <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2.5"><Calendar className="w-5 h-5 text-[#69C3E3]"/> Clinic Details</h3>
               <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-gray-100">
                 <p className="text-[13px] text-gray-600 whitespace-pre-wrap leading-loose font-medium">{DEMO_SCHEDULE}</p>
               </div>
               <div className="mt-6 pt-6 border-t border-gray-100">
                  <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest text-center">System Managed Schedule</p>
               </div>
             </div>
          </div>

        </div>
      </main>
    </div>
  )
}