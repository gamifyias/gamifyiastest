import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react'

/* ================= TYPES ================= */

interface Subject {
  id: string
  name: string
}

interface Topic {
  id: string
  name: string
  subject_id: string
}

interface ParsedQuestion {
  question_text: string
  question_type: string
  difficulty: string
  marks: number
  negative_marks: number
  explanation?: string
  option_a: string
  option_b: string
  option_c?: string
  option_d?: string
  correct_options: string
  isValid: boolean
  errors: string[]
}

interface BulkQuestionImportProps {
  subjects: Subject[]
  topics: Topic[]
  onImportComplete: () => void
}

/* ================= COMPONENT ================= */

export function BulkQuestionImport({
  subjects,
  topics,
  onImportComplete,
}: BulkQuestionImportProps) {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([])

  /* ================= SUBJECT ================= */

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId)
    setFilteredTopics(topics.filter(t => t.subject_id === subjectId))
    setSelectedTopic('')
  }

  /* ================= TEMPLATE ================= */

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      {
        question_text: 'What is 2 + 2?',
        question_type: 'mcq_single',
        difficulty: 'easy',
        marks: 1,
        negative_marks: 0,
        explanation: 'Basic math',
        option_a: '3',
        option_b: '4',
        option_c: '5',
        option_d: '6',
        correct_options: 'B',
      },
    ])

    ws['!cols'] = [
      { wch: 40 },
      { wch: 15 },
      { wch: 10 },
      { wch: 8 },
      { wch: 12 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Questions')
    XLSX.writeFile(wb, 'question_import_template.xlsx')
    toast.success('Template downloaded')
  }

  /* ================= FILE UPLOAD ================= */

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[]

        const parsed: ParsedQuestion[] = rows.map(row => {
          const errors: string[] = []

          if (!row.question_text) errors.push('Missing question')
          if (!row.correct_options) errors.push('Missing correct options')

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
          }
        })

        setParsedQuestions(parsed)
        toast.success(`Parsed ${parsed.length} questions`)
      } catch {
        toast.error('Failed to parse file')
      }
    }

    reader.readAsArrayBuffer(file)
  }

  /* ================= IMPORT ================= */

  const handleImport = async () => {
    if (!selectedSubject || !selectedTopic) {
      toast.error('Select subject & topic')
      return
    }

    const valid = parsedQuestions.filter(q => q.isValid)
    if (valid.length === 0) {
      toast.error('No valid questions')
      return
    }

    setIsImporting(true)

    try {
      for (const q of valid) {
        const { data, error } = await supabase
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
          .single()

        if (error) throw error

        const correct = q.correct_options.split(',').map(c => c.trim())

        const opts = [
          { t: q.option_a, l: 'A' },
          { t: q.option_b, l: 'B' },
          { t: q.option_c, l: 'C' },
          { t: q.option_d, l: 'D' },
        ].filter(o => o.t)

        await supabase.from('question_options').insert(
          opts.map((o, i) => ({
            question_id: data.id,
            option_text: o.t,
            is_correct: correct.includes(o.l),
            sort_order: i,
          })),
        )
      }

      toast.success(`Imported ${valid.length} questions`)
      setIsOpen(false)
      setParsedQuestions([])
      setSelectedSubject('')
      setSelectedTopic('')
      onImportComplete()
    } catch {
      toast.error('Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const validCount = parsedQuestions.filter(q => q.isValid).length
  const invalidCount = parsedQuestions.length - validCount

  /* ================= UI ================= */

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-1" />
          Bulk Import
        </Button>
      </DialogTrigger>

      {/* 🔥 FIX: FLEX LAYOUT */}
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import Questions
          </DialogTitle>
        </DialogHeader>

        {/* 🔥 SCROLLABLE BODY */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 pb-6">

            {/* Step 1 */}
            <Card>
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">Download Template</p>
                  <p className="text-sm text-muted-foreground">
                    Use this format only
                  </p>
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="w-4 h-4 mr-1" />
                  Download
                </Button>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <Label>Subject</Label>
                  <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Topic</Label>
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
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card>
              <CardContent className="p-4">
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mb-2" />
                  Upload Excel / CSV
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  hidden
                  onChange={handleFileUpload}
                />
              </CardContent>
            </Card>

            {/* Preview */}
            {parsedQuestions.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Preview</span>
                    <div className="flex gap-2">
                      <Badge>{validCount} valid</Badge>
                      {invalidCount > 0 && (
                        <Badge variant="destructive">
                          {invalidCount} invalid
                        </Badge>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="h-[220px]">
                    <div className="space-y-2">
                      {parsedQuestions.map((q, i) => (
                        <div
                          key={i}
                          className={`p-2 border rounded ${
                            q.isValid
                              ? 'border-green-500/30'
                              : 'border-red-500/30'
                          }`}
                        >
                          <p className="text-sm truncate">{q.question_text}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* 🔥 STICKY FOOTER */}
        <div className="border-t pt-4 bg-background">
          <Button
            className="w-full"
            onClick={handleImport}
            disabled={
              isImporting ||
              validCount === 0 ||
              !selectedSubject ||
              !selectedTopic
            }
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import {validCount} Questions
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
