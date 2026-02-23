import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { patientId, note } = await req.json()

    // 1. Strict Input Validation
    if (!patientId || typeof note !== 'string') {
      return NextResponse.json({ error: 'Invalid input provided.' }, { status: 400 })
    }

    // 2. Defensive Rate/Size Limit Guard
    if (note.length > 5000) {
      return NextResponse.json({ error: 'Note exceeds maximum allowed length.' }, { status: 400 })
    }

    // 3. The Atomic Upsert (Fast, scalable, and clean)
    const { error } = await supabaseAdmin
      .from('doctor_notes')
      .upsert(
        { patient_id: patientId, note: note, updated_at: new Date().toISOString() },
        { onConflict: 'patient_id' }
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Notes Route Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}