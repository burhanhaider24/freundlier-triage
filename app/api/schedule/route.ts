import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DEMO_SCHEDULE = `🏥 In-Person Psychology Clinic:
• Monday & Wednesday: 09:00 AM - 01:00 PM
• Friday: 03:00 PM - 07:00 PM

💻 Online Video Consultations:
• Tuesday & Thursday: 04:00 PM - 08:00 PM
• Saturday: 11:00 AM - 02:00 PM

🚨 Urgent Care: Contact clinic directly for priority slots.`

export async function GET() {
  return NextResponse.json({ schedule: DEMO_SCHEDULE })
}