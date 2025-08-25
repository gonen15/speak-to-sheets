-- Create inventory table for dashboard integration
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  current_stock INTEGER NOT NULL DEFAULT 0,
  minimum_stock INTEGER NOT NULL DEFAULT 50,
  average_monthly_sales INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory access
CREATE POLICY "Users can view all inventory" 
ON public.inventory 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert inventory" 
ON public.inventory 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own inventory records" 
ON public.inventory 
FOR UPDATE 
USING (created_by = auth.uid());

-- Create saved_filters table for filter persistence
CREATE TABLE IF NOT EXISTS public.saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  filter_data JSONB NOT NULL DEFAULT '{}',
  dashboard_type TEXT NOT NULL DEFAULT 'master_dashboard',
  created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for saved filters
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

-- Create policies for saved filters
CREATE POLICY "Users can manage their own saved filters" 
ON public.saved_filters 
FOR ALL 
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Add trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_filters_updated_at
  BEFORE UPDATE ON public.saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample inventory data
INSERT INTO public.inventory (product_name, brand, category, current_stock, minimum_stock, average_monthly_sales) VALUES
('תבלין מיוחד', 'בית תבלינות מ.ח', 'תבלינים', 2500, 200, 180),
('משקה פרימיום', 'נטף פלוס בע"מ', 'משקאות', 45, 100, 220),
('ממתק מיוחד', 'סוכני סיים קנדילו', 'מתוקים', 35, 80, 85),
('אביזר נוי', 'צרינה של סובלנות', 'אביזרים', 25, 60, 160),
('מזון מוכן', 'יאנגי דלי ישראל', 'מזון מוכן', 30, 150, 380),
('משקה אנרגיה', 'לייב בע"מ', 'משקאות', 40, 120, 290),
('מזון קפוא', 'קפואים פלוס בע"מ', 'קפואים', 250, 200, 420),
('ממתק פרימיום', 'מעיין נציונות שיווק', 'מתוקים', 35, 100, 195),
('חומרי אריזה', 'חברת האריזה', 'אריזה', 890, 300, 680),
('תוספי מזון', 'טבע וטעם', 'תבלינים', 25, 80, 140),
('חטיפים', 'כרמל מזרח', 'חטיפים', 120, 150, 185),
('מוצרי קרח', 'גלידות הארץ', 'קפואים', 40, 100, 240)
ON CONFLICT DO NOTHING;