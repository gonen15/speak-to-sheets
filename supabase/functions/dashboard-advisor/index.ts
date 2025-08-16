import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { salesData, inventoryData } = await req.json();

    const prompt = `
אתה יועץ BI מומחה. אנא נתח את הנתונים הבאים ותן המלצות קצרות ומעשיות למבנה הדשבורד הטוב ביותר עבור מנהלים.

סיכום נתוני המכירות: ${salesData.length} הזמנות
דוגמא נתונים: ${JSON.stringify(salesData.slice(0, 3), null, 2)}

אנא ענה בעברית במקסימום 500 מילים ותן המלצות עבור:

1. פילטרים הכרחיים ומבנה הדשבורד
2. KPIs עיקריים שצריכים להופיע  
3. סוגי גרפים הכי מתאימים לנתונים אלה
4. איך לנתח מגמות לתובנות עתידיות
5. אינדיקטורים חזותיים לביצועים

תן המלצות קצרות ומעשיות בלבד.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'אתה יועץ BI מומחה המתמחה בעיצוב דשבורדים לחברות ישראליות. תמיד ענה בעברית ותן המלצות מעשיות ומדויקות בקצרה.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const advice = data.choices[0].message.content;

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in dashboard-advisor function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});