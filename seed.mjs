import fs from 'fs';
import * as xlsx from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load your local environment variables
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function seedDatabase() {
  console.log("📂 Reading CBT Dataset directly from Excel...");
  
  try {
    const fileBuffer = fs.readFileSync('./docs/CBT_DATASET_FOR_FREUNDLIER.xlsx');
    
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const records = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    console.log(`🧠 Found ${records.length} clinical records. Beginning vector embedding...\n`);

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const statement = row.Patient_Statement || Object.values(row)[0]; 

      if (!statement || String(statement).trim() === '') continue;

      try {
        const apiKey = process.env.GEMINI_API_KEY_1;
        
        // THE FACT-CHECKED FIX: The official model is 'gemini-embedding-001'
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
        
        const aiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: { parts: [{ text: String(statement) }] },
                // CRITICAL FIX: Shrink the 3072 vector down to 768 so it fits your Supabase table!
                outputDimensionality: 768 
            })
        });

        const data = await aiResponse.json();

        if (!aiResponse.ok) {
            throw new Error(data.error?.message || 'Failed to embed via REST API');
        }

        const embeddingArray = data.embedding?.values;

        // Save to Supabase Vector Engine
        const { error } = await supabase.from('cbt_knowledge').insert({
          patient_statement: String(statement),
          underlying_emotion: String(row.Underlying_Emotion || ''),
          symptom_category: String(row.Symptom_Category || ''),
          risk_level: String(row.Risk_Level || 'Low'),
          suggested_cbt_approach: String(row.Suggested_CBT_Approach || ''),
          embedding: embeddingArray
        });

        if (error) throw error;
        
        console.log(`✅ [${i + 1}/${records.length}] Embedded: "${String(statement).substring(0, 40)}..."`);

        // Polite 500ms delay to protect your API limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (err) {
         console.error(`❌ Failed on row ${i + 1}:`, err.message || err);
      }
    }
    
    console.log("\n🎉 SUCCESS! Database Seeding Complete!");
  } catch (fileError) {
    console.error("❌ System Error:", fileError);
  }
}

seedDatabase();