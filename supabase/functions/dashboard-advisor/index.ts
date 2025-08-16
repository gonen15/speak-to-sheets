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
אתה יועץ BI מומחה. אנא נתח את הנתונים הבאים ותן המלצות למבנה הדשבורד הטוב ביותר עבור מנהלים.

נתוני המכירות:
${JSON.stringify(salesData, null, 2)}

נתוני המלאי:
${JSON.stringify(inventoryData, null, 2)}

אנא ענה בעברית ותן המלצות עבור:

1. פילטרים הכרחיים (שנה, חודש, קטגוריה, מוצר, לקוח)
2. KPIs עיקריים שצריכים להופיע
3. סוגי גרפים הכי מתאימים
4. איך לנתח מגמות היסטוריות לקבלת תובנות עתידיות
5. חלוקה אופטימלית של המידע על המסך
6. אינדיקטורים חזותיים לביצועים (ירוק/אדום/צהוב)

בנוסף, תן המלצות ספציפיות איך לשלב את נתוני המלאי עם נתוני המכירות לתובנות עמוקות יותר.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'אתה יועץ BI מומחה המתמחה בעיצוב דשבורדים לחברות ישראליות. תמיד ענה בעברית ותן המלצות מעשיות ומדויקות.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
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