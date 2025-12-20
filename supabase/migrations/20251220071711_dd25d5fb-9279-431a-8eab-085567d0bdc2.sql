-- Allow students to create their own practice tests (weak areas tests)
CREATE POLICY "Students can create their own practice tests" 
ON public.tests 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'student'::app_role) 
  AND auth.uid() = created_by 
  AND test_type = 'weak_areas'
  AND is_public = false
);

-- Allow students to insert test_questions for their own practice tests
CREATE POLICY "Students can add questions to their practice tests" 
ON public.test_questions 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tests 
    WHERE tests.id = test_questions.test_id 
    AND tests.created_by = auth.uid()
    AND tests.test_type = 'weak_areas'
  )
);

-- Allow students to assign their own practice tests to themselves
CREATE POLICY "Students can self-assign practice tests" 
ON public.test_assignments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM tests 
    WHERE tests.id = test_assignments.test_id 
    AND tests.created_by = auth.uid()
    AND tests.test_type = 'weak_areas'
  )
);

-- Create unique constraint for test_assignments if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'test_assignments_test_user_unique'
  ) THEN
    ALTER TABLE public.test_assignments 
    ADD CONSTRAINT test_assignments_test_user_unique 
    UNIQUE (test_id, user_id);
  END IF;
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;