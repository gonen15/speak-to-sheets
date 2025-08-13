import { supabase } from "@/lib/supabaseClient";

export async function getKpis() {
  const { data, error } = await supabase.from("vw_kpi_totals").select("*").single();
  if (error) throw error;
  return data;
}
export async function getByStatus() {
  const { data, error } = await supabase.from("vw_sales_by_status").select("*").order("amount_total_ils", { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function getByMonth() {
  const { data, error } = await supabase.from("vw_sales_by_month").select("*").order("year", { ascending: true }).order("month", { ascending: true });
  if (error) throw error;
  return data || [];
}
export async function getTopCustomers(limit = 20) {
  const { data, error } = await supabase.from("vw_top_customers").select("*").limit(limit);
  if (error) throw error;
  return data || [];
}
