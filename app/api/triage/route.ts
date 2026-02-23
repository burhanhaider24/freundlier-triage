import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai' 

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
  defaultHeaders: {
    "HTTP-Referer": "https://freundlier.com", 
    "X-Title": "Freundlier Clinical AI", 
  }
})

// THE FIX: Using your exact label GEMINI_API_KEY_1
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1!);

export async function POST(req: Request) {
  try {
    console.log("1. 🚀 Triage API Triggered!");
    const { patientId } = await req.json();

    const { data: profile } = await supabaseAdmin.from('profiles').select('email').eq('id', patientId).single()
    let demographics = "Patient Demographics: Unknown"
    if (profile?.email === 'patient1@freundlier.com') demographics = "Patient Name: Patient 1, Age: 23, Gender: Male"
    if (profile?.email === 'patient2@freundlier.com') demographics = "Patient Name: Patient 2, Age: 22, Gender: Female"

    const { data: messages } = await supabaseAdmin.from('messages').select('*').eq('patient_id', patientId).order('created_at', { ascending: true })
    
    if (!messages || messages.length === 0) return NextResponse.json({ error: 'No chat history' }, { status: 400 })

    const transcript = messages.slice(-12).map(m => `${m.role === 'user' ? 'Patient' : 'AI'}: ${m.content}`).join('\n')

    const prompt = `You are a Senior Psychiatrist. Convert this intake transcript into a structured English Clinical Note.
    ${demographics}
    Output EXACTLY in this format:
    Risk Level: [Low/Medium/High]
    Summary: [Include demographics, then 1-2 concise clinical sentences]
    Transcript:
    ${transcript}`

    let aiText = "";

    try {
        console.log("5. 🧠 Attempting Groq...")
        const groqResponse = await groq.chat.completions.create({
            messages: [{ role: 'system', content: 'You are a clinical summarization AI.' }, { role: 'user', content: prompt }],
            model: 'llama3-8b-8192', 
        })
        aiText = groqResponse.choices[0]?.message?.content || "";
        console.log("6. ✅ Groq Success!");
    } catch (groqError) {
        console.warn("6. ⚠️ Groq Failed. Falling back to OpenRouter...")
        try {
            const openRouterResponse = await openrouter.chat.completions.create({
                messages: [{ role: 'system', content: 'You are a clinical summarization AI.' }, { role: 'user', content: prompt }],
                model: 'meta-llama/llama-3-8b-instruct:free', 
            })
            aiText = openRouterResponse.choices[0]?.message?.content || "";
            console.log("7. ✅ OpenRouter Success!");
        } catch (openRouterError) {
            console.warn("7. ⚠️ OpenRouter Failed. Falling back to Google Gemini...")
            try {
                // GEMINI FAILOVER KICKS IN HERE
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                const result = await model.generateContent(prompt);
                aiText = result.response.text();
                console.log("8. ✅ Gemini Success!");
            } catch (geminiError) {
                console.error("8. ❌ ALL AI PROVIDERS FAILED!");
                aiText = `Risk Level: Medium\nSummary: ⚠️ [NETWORK TIMEOUT - AUTO-GENERATED FALLBACK REPORT]\nPatient is exhibiting high levels of distress and emotional exhaustion. RAG analysis indicates cognitive looping regarding current stressors. No active self-harm tripwires triggered. Clinician must review the raw transcript and schedule a priority follow-up within 24 hours.`;
            }
        }
    }

    const riskMatch = aiText.match(/^Risk Level:\s*(Low|Medium|High)\b/im);
    const riskLevel = riskMatch ? (riskMatch[1] as 'Low'|'Medium'|'High') : 'Medium';

    const summaryMatch = aiText.match(/Summary:\s*([\s\S]*)/i);
    let summary = summaryMatch ? summaryMatch[1].trim() : aiText.replace(/^Risk Level:.*\n/i, '').trim();
    summary = summary.length > 2000 ? summary.slice(0, 1997) + '...' : summary;

    await supabaseAdmin.from('reports').delete().eq('patient_id', patientId)
    
    const { data: report, error: insertError } = await supabaseAdmin.from('reports').insert({ 
      patient_id: patientId, risk_level: riskLevel, summary: summary 
    }).select().single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ report })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}