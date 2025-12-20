import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface Subject {
  id: string;
  name: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

interface ParsedQuestion {
  question_text: string;
  question_type: string;
  difficulty: string;
  marks: number;
  negative_marks: number;
  explanation?: string;
  option_a: string;
  option_b: string;
  option_c?: string;
  option_d?: string;
  correct_options: string; // "A", "B", "A,B", etc.
  isValid: boolean;
  errors: string[];
}

interface BulkQuestionImportProps {
  subjects: Subject[];
  topics: Topic[];
  onImportComplete: () => void;
}

export function BulkQuestionImport({ subjects, topics, onImportComplete }: BulkQuestionImportProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setFilteredTopics(topics.filter(t => t.subject_id === subjectId));
    setSelectedTopic('');
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        question_text: 'What is 2 + 2?',
        question_type: 'mcq_single',
        difficulty: 'easy',
        marks: 1,
        negative_marks: 0,
        explanation: 'Basic addition',
        option_a: '3',
        option_b: '4',
        option_c: '5',
        option_d: '6',
        correct_options: 'B',
      },
      {
        question_text: 'Which of the following are prime numbers?',
        question_type: 'mcq_multiple',
        difficulty: 'medium',
        marks: 2,
        negative_marks: 0.5,
        explanation: 'Prime numbers are divisible only by 1 and themselves',
        option_a: '2',
        option_b: '4',
        option_c: '7',
        option_d: '9',
        correct_options: 'A,C',
      },
      {
        question_text: 'The Earth is flat.',
        question_type: 'true_false',
        difficulty: 'easy',
        marks: 1,
        negative_marks: 0,
        explanation: 'The Earth is an oblate spheroid',
        option_a: 'True',
        option_b: 'False',
        option_c: '',
        option_d: '',
        correct_options: 'B',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    
    // Set column widths
    ws['!cols'] = [
      { wch: 50 }, // question_text
      { wch: 15 }, // question_type
      { wch: 10 }, // difficulty
      { wch: 8 },  // marks
      { wch: 15 }, // negative_marks
      { wch: 30 }, // explanation
      { wch: 20 }, // option_a
      { wch: 20 }, // option_b
      { wch: 20 }, // option_c
      { wch: 20 }, // option_d
      { wch: 15 }, // correct_options
    ];

    XLSX.writeFile(wb, 'question_import_template.xlsx');
    toast.success('Template downloaded!');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        const parsed = jsonData.map((row, index) => {
          const errors: string[] = [];
          
          // Validate required fields
          if (!row.question_text) errors.push('Missing question text');
          if (!row.question_type) errors.push('Missing question type');
          if (!['mcq_single', 'mcq_multiple', 'true_false', 'numeric'].includes(row.question_type)) {
            errors.push('Invalid question type (use: mcq_single, mcq_multiple, true_false, numeric)');
          }
          if (!['easy', 'medium', 'hard'].includes(row.difficulty)) {
            errors.push('Invalid difficulty (use: easy, medium, hard)');
          }
          if (!row.option_a || !row.option_b) {
            errors.push('At least 2 options required (option_a, option_b)');
          }
          if (!row.correct_options) {
            errors.push('Missing correct_options');
          }

          return {
            question_text: row.question_text || '',
            question_type: row.question_type || 'mcq_single',
            difficulty: row.difficulty || 'medium',
            marks: Number(row.marks) || 1,
            negative_marks: Number(row.negative_marks) || 0,
            explanation: row.explanation || '',
            option_a: String(row.option_a || ''),
            option_b: String(row.option_b || ''),
            option_c: String(row.option_c || ''),
            option_d: String(row.option_d || ''),
            correct_options: String(row.correct_options || '').toUpperCase(),
            isValid: errors.length === 0,
            errors,
          };
        });

        setParsedQuestions(parsed);
        toast.success(`Parsed ${parsed.length} questions`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse file. Please check the format.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!selectedSubject || !selectedTopic) {
      toast.error('Please select subject and topic');
      return;
    }

    const validQuestions = parsedQuestions.filter(q => q.isValid);
    if (validQuestions.length === 0) {
      toast.error('No valid questions to import');
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const q of validQuestions) {
        try {
          // Create question
          const { data: newQuestion, error: qError } = await supabase
            .from('questions')
            .insert({
              question_text: q.question_text,
              question_type: q.question_type,
              difficulty: q.difficulty,
              marks: q.marks,
              negative_marks: q.negative_marks,
              explanation: q.explanation || null,
              subject_id: selectedSubject,
              topic_id: selectedTopic,
              created_by: user?.id,
            })
            .select()
            .single();

          if (qError) throw qError;

          // Create options
          const correctLetters = q.correct_options.split(',').map(l => l.trim());
          const options = [
            { text: q.option_a, letter: 'A' },
            { text: q.option_b, letter: 'B' },
            { text: q.option_c, letter: 'C' },
            { text: q.option_d, letter: 'D' },
          ].filter(o => o.text);

          const optionsToInsert = options.map((o, idx) => ({
            question_id: newQuestion.id,
            option_text: o.text,
            is_correct: correctLetters.includes(o.letter),
            sort_order: idx,
          }));

          if (optionsToInsert.length > 0) {
            await supabase.from('question_options').insert(optionsToInsert);
          }

          successCount++;
        } catch (error) {
          console.error('Error importing question:', error);
          errorCount++;
        }
      }

      toast.success(`Imported ${successCount} questions${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
      setIsOpen(false);
      setParsedQuestions([]);
      setSelectedSubject('');
      setSelectedTopic('');
      onImportComplete();
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import questions');
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedQuestions.filter(q => q.isValid).length;
  const invalidCount = parsedQuestions.filter(q => !q.isValid).length;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import Questions
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Download Template */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Step 1: Download Template</h4>
                  <p className="text-sm text-muted-foreground">
                    Download the Excel template and fill in your questions
                  </p>
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4" />
                  Download Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Select Subject & Topic */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="font-medium">Step 2: Select Subject & Topic</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Subject *</Label>
                  <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Topic *</Label>
                  <Select 
                    value={selectedTopic} 
                    onValueChange={setSelectedTopic}
                    disabled={!selectedSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTopics.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Upload File */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">Step 3: Upload File</h4>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                className="w-full h-24 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-center">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">Click to upload Excel or CSV file</p>
                </div>
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          {parsedQuestions.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Preview ({parsedQuestions.length} questions)</h4>
                  <div className="flex gap-2">
                    <Badge className="bg-accent/20 text-accent">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {validCount} valid
                    </Badge>
                    {invalidCount > 0 && (
                      <Badge variant="destructive">
                        <XCircle className="w-3 h-3 mr-1" />
                        {invalidCount} invalid
                      </Badge>
                    )}
                  </div>
                </div>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {parsedQuestions.map((q, idx) => (
                      <div 
                        key={idx} 
                        className={`p-3 rounded-lg border ${q.isValid ? 'bg-accent/5 border-accent/20' : 'bg-destructive/5 border-destructive/20'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{q.question_text}</p>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{q.question_type}</Badge>
                              <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                            </div>
                          </div>
                          {q.isValid ? (
                            <CheckCircle className="w-5 h-5 text-accent shrink-0" />
                          ) : (
                            <div className="shrink-0">
                              <AlertTriangle className="w-5 h-5 text-destructive" />
                              <p className="text-xs text-destructive mt-1">{q.errors[0]}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Import Button */}
          <Button 
            className="w-full" 
            onClick={handleImport}
            disabled={isImporting || validCount === 0 || !selectedSubject || !selectedTopic}
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import {validCount} Questions
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
