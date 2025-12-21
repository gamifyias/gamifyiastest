-- Add policy to allow students to view their own created tests (weak area tests)
CREATE POLICY "Students can view their own created tests" 
ON public.tests 
FOR SELECT 
USING (
  has_role(auth.uid(), 'student'::app_role) 
  AND auth.uid() = created_by
);

-- Add policy to allow students to update their own weak area tests
CREATE POLICY "Students can update their own weak area tests" 
ON public.tests 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'student'::app_role) 
  AND auth.uid() = created_by 
  AND test_type = 'weak_areas'
);