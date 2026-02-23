import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'
import { GoogleGenAI } from '@google/genai'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
)
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_1! })

const CRISIS_KEYWORDS = [
  'suicide', 'mar', 'khatam', 'die', 'end', 'hopeless', 'worthless', 
  'khudkushi', 'jaan dena', 'marne', 'zeher', 'phansi', 'mout',
  'خودکشی', 'مر', 'مرنے', 'ختم', 'جان', 'زہر', 'پھانسی', 'موت', 'مار'
];

// THE FIX: Strict word-boundary regex so words like "attend" don't trigger "end"
const CRISIS_RE = new RegExp('(?:^|\\s|[,.!?])(' + CRISIS_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|') + ')(?:\\s|$|[,.!?])', 'i');

export async function POST(req: Request) {
  try {
    const { message, patientId, sessionStart } = await req.json()

    // 1. Fetch History & Count
    const { data: historyData } = await supabaseAdmin
      .from('messages')
      .select('role, content')
      .eq('patient_id', patientId)
      .gte('created_at', sessionStart)
      .order('created_at', { ascending: true })

    const { count } = await supabaseAdmin
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .eq('role', 'user')
      .gte('created_at', sessionStart)

    if (count !== null && count >= 3) {
      return NextResponse.json({ error: 'Chat locked. Max turns reached.' }, { status: 403 })
    }

    await supabaseAdmin.from('messages').insert({ patient_id: patientId, role: 'user', content: message })

    let transcript = ""
    if (historyData && historyData.length > 0) {
      transcript = historyData.map(h => `${h.role === 'ai' ? 'Freundlier (AI)' : 'Patient'}: ${h.content}`).join('\n')
    }
    transcript += `\nPatient: ${message}`

    // 2. Crisis Tripwire (Groq/Llama)
    const isPotentialCrisis = CRISIS_RE.test(message)
    
    if (isPotentialCrisis) {
      let isConfirmedEmergency = true; 
      try {
        const groqCheck = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: 'You are a crisis detector. Read the message carefully. If it implies self-harm, suicide, wanting to die, or severe mental crisis, reply ONLY with YES. Otherwise reply ONLY with NO.' }, 
            { role: 'user', content: message }
          ],
          model: 'llama3-8b-8192',
        })
        
        // THE FIX: Exact YES anchor to avoid false positives in AI explanation
        const groqText = groqCheck.choices?.[0]?.message?.content?.trim().toUpperCase() || '';
        if (!/^YES\b/.test(groqText)) isConfirmedEmergency = false;
        
      } catch (groqError) {
        console.warn('Groq Check Failed - Triggering Red Alert anyway to be safe.');
      }

      if (isConfirmedEmergency) {
        const alertResponse = "⚠️ [URGENT ALERT FROM DR. AMBER]: I have been notified of your message. Please contact the clinic immediately at 042-111-222-333 or call 1122 right now. Your safety is our absolute priority.\n\n⚠️ [ہنگامی الرٹ]: مجھے آپ کے پیغام کے بارے میں مطلع کر دیا گیا ہے۔ براہ کرم فوری طور پر کلینک سے 333-222-111-042 پر رابطہ کریں یا ابھی 1122 پر کال کریں۔ آپ کی حفاظت ہماری اولین ترجیح ہے۔"
        await supabaseAdmin.from('alerts').insert({ patient_id: patientId, severity: 'High' })
        await supabaseAdmin.from('messages').insert({ patient_id: patientId, role: 'ai', content: alertResponse })
        return NextResponse.json({ response: alertResponse, isEmergency: true })
      }
    }

    // ==========================================
    // 3. THE RAG ENGINE: Retrieve CBT Knowledge
    // ==========================================
    let cbtKnowledgeContext = "No specific CBT guidelines found for this statement.";
    try {
      const queryEmbeddingResponse = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: message,
        config: {
            outputDimensionality: 768 
        }
      });
      
      const queryEmbedding = queryEmbeddingResponse.embeddings?.[0]?.values;

      // THE FIX: Added guard for empty embeddings before calling Supabase
      if (!queryEmbedding || queryEmbedding.length === 0) {
        throw new Error('Embedding failed or empty');
      }

      const { data: ragData, error: rpcError } = await supabaseAdmin.rpc('match_cbt_knowledge', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7, 
        match_count: 2        
      });

      if (!rpcError && ragData && ragData.length > 0) {
        cbtKnowledgeContext = ragData.map((match: any) => 
          `- Identified Emotion: ${match.underlying_emotion} | Symptom: ${match.symptom_category} | Risk: ${match.risk_level} | Recommended CBT Approach: ${match.suggested_cbt_approach}`
        ).join('\n');
      }
    } catch (ragError) {
      console.error("RAG Retrieval Failed:", ragError);
    }

    // ==========================================
    // 4. Generate AI Response with CBT Context
    // ==========================================
    const systemPrompt = `
      You are 'Freundlier', a professional clinical intake assistant for Dr. Amber. 
      
      Look at the CONVERSATION HISTORY to see what the patient has already answered. 
      Your goal is to move through Dr. Amber's 5 steps. 
      CRITICAL: Once a patient provides an answer, DO NOT ask the same question again. Acknowledge it briefly and MOVE ON TO THE NEXT STEP.
      
      DR. AMBER'S INTAKE FLOW:
      Step 1: Chief Complaint (What brings you here today?)
      Step 2: Onset and Duration (When did this start?)
      Step 3: Biological Markers (How is sleep/appetite?)
      Step 4: Functional Impairment (Is this affecting daily life?)
      Step 5: Previous CBT/Therapy (Have you sought help before?)

      ---
      🧠 DR. AMBER'S CBT CLINICAL GUIDELINES (Retrieved from Database):
      Based on the patient's last message, here is the clinical assessment and CBT approach from our database:
      ${cbtKnowledgeContext}

      Use this clinical knowledge to inform your tone, gently validate their specific emotion, or frame your next intake question through the lens of the suggested CBT approach.
      ---
      
      CRITICAL LANGUAGE RULE: Mirror the user's exact language (Urdu script, Roman Urdu, or English). Keep it empathetic but brief (maximum 2 sentences).

      CONVERSATION HISTORY:
      ${transcript}
      
      Write your NEXT response.
    `;
    
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: systemPrompt });
    const aiMessage = response.text || "I am processing your information for the doctor."
    
    await supabaseAdmin.from('messages').insert({ patient_id: patientId, role: 'ai', content: aiMessage })

    return NextResponse.json({ response: aiMessage, isEmergency: false })

  } catch (error) {
    console.error('AI Route Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}