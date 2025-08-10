-- Enable RLS on monday_board_mappings table
ALTER TABLE public.monday_board_mappings ENABLE ROW LEVEL SECURITY;

-- Create policy for monday_board_mappings (readable by all authenticated users)
CREATE POLICY monday_board_mappings_select ON public.monday_board_mappings
FOR SELECT
TO authenticated
USING (true);