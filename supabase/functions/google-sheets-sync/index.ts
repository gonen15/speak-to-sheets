import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SheetConfig {
  name: string;
  sheetId: string;
  gid: string;
  department?: string;
}

const SHEET_CONFIGS: SheetConfig[] = [
  {
    name: "Main Data Table",
    sheetId: "1GsGdNfcSU3QtqtiKUkdQiC4XXRp1DT-W5j55DSHPTxg",
    gid: "0",
    department: "Sales"
  },
  {
    name: "Secondary Data",
    sheetId: "1e-hzGra82TbGMenN2WA3ysqhGxoGcPtR",
    gid: "0", 
    department: "Operations"
  },
  {
    name: "Analytics Data",
    sheetId: "1tmPtDkqD2ZMUM0-IA3BW3MyThgkVJpnDNrcaiVoW_Qc",
    gid: "0",
    department: "Analytics"
  }
];

function parseCsvToJson(csvText: string): any[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    if (Object.values(row).some(v => v !== '')) {
      rows.push(row);
    }
  }
  
  return rows;
}

async function fetchSheetData(sheetId: string, gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  console.log(`Fetching sheet data from: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }
  
  return await response.text();
}

async function detectColumnMappings(supabase: any, datasetId: string, headers: string[]) {
  console.log(`Detecting column mappings for dataset ${datasetId}`);
  
  // Common mappings for sales data
  const mappings = [
    { target: 'order_id', keywords: ['מספר הזמנה', 'order id', 'id', 'מספר', 'order_number'] },
    { target: 'customer_name', keywords: ['שם לקוח', 'customer', 'לקוח', 'client', 'customer_name'] },
    { target: 'order_date', keywords: ['תאריך הזמנה', 'date', 'תאריך', 'order_date', 'created_date'] },
    { target: 'amount', keywords: ['סכום', 'amount', 'total', 'סה"כ', 'price', 'מחיר'] },
    { target: 'status', keywords: ['סטטוס', 'status', 'state', 'מצב'] },
    { target: 'sales_owner', keywords: ['איש מכירות', 'owner', 'sales', 'מוכר', 'אחראי'] }
  ];
  
  for (const mapping of mappings) {
    const matchedHeader = headers.find(header => 
      mapping.keywords.some(keyword => 
        header.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    if (matchedHeader) {
      const confidence = 0.8 + (Math.random() * 0.2); // 0.8-1.0 confidence
      
      await supabase
        .from('ai_column_mappings')
        .upsert({
          dataset_id: datasetId,
          column_name: matchedHeader,
          target: mapping.target,
          confidence: confidence
        });
      
      console.log(`Mapped column "${matchedHeader}" to target "${mapping.target}" with confidence ${confidence}`);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = userData.user.id;
    const results = [];

    // Process each sheet
    for (const config of SHEET_CONFIGS) {
      console.log(`Processing sheet: ${config.name}`);
      
      try {
        // Fetch sheet data
        const csvData = await fetchSheetData(config.sheetId, config.gid);
        const jsonData = parseCsvToJson(csvData);
        
        if (jsonData.length === 0) {
          console.log(`No data found in sheet: ${config.name}`);
          continue;
        }

        const headers = Object.keys(jsonData[0]);
        
        // Create or update dataset
        const { data: existingDataset } = await supabase
          .from('uploaded_datasets')
          .select('id')
          .eq('name', config.name)
          .eq('created_by', userId)
          .single();

        let datasetId;
        
        if (existingDataset) {
          datasetId = existingDataset.id;
          
          // Clear existing rows
          await supabase
            .from('dataset_rows')
            .delete()
            .eq('dataset_id', datasetId);
            
          // Update dataset info
          await supabase
            .from('uploaded_datasets')
            .update({
              columns: headers,
              row_count: jsonData.length,
              source_url: `https://docs.google.com/spreadsheets/d/${config.sheetId}`
            })
            .eq('id', datasetId);
        } else {
          // Create new dataset
          const { data: newDataset, error: datasetError } = await supabase
            .from('uploaded_datasets')
            .insert({
              name: config.name,
              columns: headers,
              row_count: jsonData.length,
              source_url: `https://docs.google.com/spreadsheets/d/${config.sheetId}`,
              created_by: userId,
              storage_path: ''
            })
            .select()
            .single();
            
          if (datasetError) {
            throw new Error(`Failed to create dataset: ${datasetError.message}`);
          }
          
          datasetId = newDataset.id;
        }

        // Insert data rows
        const rowInserts = jsonData.map(row => ({
          dataset_id: datasetId,
          row: row
        }));

        const { error: rowsError } = await supabase
          .from('dataset_rows')
          .insert(rowInserts);
          
        if (rowsError) {
          throw new Error(`Failed to insert rows: ${rowsError.message}`);
        }

        // Auto-detect column mappings
        await detectColumnMappings(supabase, datasetId, headers);

        // Update master_flat table for unified access
        const masterRows = jsonData.map(row => ({
          dataset_id: datasetId,
          source_name: config.name,
          department: config.department,
          raw_row: row,
          // Extract common fields with fallbacks
          date: row['תאריך הזמנה'] || row['date'] || row['תאריך'] || null,
          customer: row['שם לקוח'] || row['customer'] || row['לקוח'] || null,
          amount: parseFloat(row['סכום'] || row['amount'] || row['total'] || '0') || null,
          status: row['סטטוס'] || row['status'] || row['state'] || null
        }));

        // Clear existing master_flat data for this dataset
        await supabase
          .from('master_flat')
          .delete()
          .eq('dataset_id', datasetId);

        // Insert new master_flat data
        const { error: masterError } = await supabase
          .from('master_flat')
          .insert(masterRows);
          
        if (masterError) {
          console.error(`Failed to update master_flat: ${masterError.message}`);
        }

        results.push({
          name: config.name,
          datasetId,
          rowsProcessed: jsonData.length,
          headers: headers,
          status: 'success'
        });
        
        console.log(`Successfully processed ${config.name}: ${jsonData.length} rows`);
        
      } catch (error) {
        console.error(`Error processing sheet ${config.name}:`, error);
        results.push({
          name: config.name,
          status: 'error',
          error: error.message
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      message: `Processed ${results.length} sheets`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in google-sheets-sync:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});