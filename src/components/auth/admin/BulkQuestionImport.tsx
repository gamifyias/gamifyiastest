'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

import {
  Upload,
  FileSpreadsheet,
  Download,
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
  question_type: 'mcq_single' | 'mcq_multiple'
  difficulty: 'easy' | 'medium' | 'hard'
  marks: number
  negative_marks: number
  explanation?: string
  option_a?: string
  option_b?: string
  option_c?: string
  option_d?: string
  correct_options: string[] // ['A','B']
  isValid: boolean
  errors: string[]
}

interface Props {
  subjects: Subject[]
  topics: Topic[]
  onImportComplete: () => void
}

/* ================= HELPERS ================= */

const normalizeKey = (key: string) =>
  key.toLowerCase().trim().replace(/\s+/g, '_')

/* ================= COMPONENT ================= */

export function BulkQuestionImport({
  subjects,
  topics,
  onImportComplete,
}: Props) {
  const { user } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)

  const [open, setOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [questions, setQuestions] = useState<ParsedQuestion[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([])

  /* ================= SUBJECT ================= */

  const onSubjectChange = (id: string) => {
    setSubjectId(id)
    setFilteredTopics(topics.filter(t => t.subject_id === id))
    setTopicId('')
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
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Questions')
    XLSX.writeFile(wb, 'question_import_template.xlsx')
  }

  /* ================= FILE UPLOAD ================= */

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]

        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        const rows = rawRows.map((row: any) => {
          const obj: any = {}
          Object.keys(row).forEach(k => {
            obj[normalizeKey(k)] = row[k]
          })
          return obj
        })

        const parsed: ParsedQuestion[] = rows.map((r: any) => {
          const errors: string[] = []

          if (!r.question_text) errors.push('Missing question')
          if (!r.option_a || !r.option_b)
            errors.push('At least 2 options required')

          const correct = String(r.correct_options || '')
            .toUpperCase()
            .replace(/OPTION\s*/g, '')
            .split(',')
            .map((x: string) => x.trim())
            .filter(Boolean)

          if (correct.length === 0)
            errors.push('Missing correct option')

          // Robust mapping for question_type
          const rawType = String(r.question_type || '').toLowerCase().trim()
          let mappedType: 'mcq_single' | 'mcq_multiple' = 'mcq_single'

          if (rawType.includes('multiple') || rawType === 'msq') {
            mappedType = 'mcq_multiple'
          } else if (rawType.includes('single') || rawType === 'mcq') {
            mappedType = 'mcq_single'
          }

          // Robust mapping for difficulty
          const rawDiff = String(r.difficulty || '').toLowerCase().trim()
          let mappedDiff: 'easy' | 'medium' | 'hard' = 'medium'
          if (['easy', 'medium', 'hard'].includes(rawDiff)) {
            mappedDiff = rawDiff as any
          }

          return {
            question_text: r.question_text,
            question_type: mappedType,
            difficulty: mappedDiff,
            marks: Number(r.marks) || 1,
            negative_marks: Number(r.negative_marks) || 0,
            explanation: r.explanation || '',
            option_a: r.option_a,
            option_b: r.option_b,
            option_c: r.option_c,
            option_d: r.option_d,
            correct_options: correct,
            isValid: errors.length === 0,
            errors,
          }
        })

        setQuestions(parsed)
        toast.success(`Parsed ${parsed.length} questions`)
      } catch (err) {
        console.error(err)
        toast.error('Failed to parse file')
      }
    }

    reader.readAsArrayBuffer(file)
  }

  /* ================= IMPORT ================= */

  const handleImport = async () => {
    if (!user) {
      toast.error('Not authenticated')
      return
    }

    if (!subjectId || !topicId) {
      toast.error('Select subject & topic')
      return
    }

    const valid = questions.filter(q => q.isValid)
    if (valid.length === 0) {
      toast.error('No valid questions')
      return
    }

    setImporting(true)

    try {
      for (const q of valid) {
        /* 1️⃣ INSERT QUESTION */
        const { data: qData, error: qError } = await supabase
          .from('questions')
          .insert({
            subject_id: subjectId,
            topic_id: topicId,
            question_text: q.question_text,
            question_type: q.question_type,
            difficulty: q.difficulty,
            marks: q.marks,
            negative_marks: q.negative_marks,
            explanation: q.explanation || null,
            created_by: user.id,
            is_active: true,
          })
          .select('id')
          .single()

        if (qError) {
          console.error('Question Insert Error:', qError, q)
          throw qError
        }

        const questionId = qData.id

        /* 2️⃣ INSERT OPTIONS */
        const options = [
          { text: q.option_a, label: 'A' },
          { text: q.option_b, label: 'B' },
          { text: q.option_c, label: 'C' },
          { text: q.option_d, label: 'D' },
        ].filter(o => o.text)

        const optionRows = options.map((o, i) => ({
          question_id: questionId,
          option_text: o.text!,
          is_correct: q.correct_options.includes(o.label),
          sort_order: i,
        }))

        const optRes = await supabase
          .from('question_options')
          .insert(optionRows)

        if (optRes.error) throw optRes.error
      }

      toast.success(`Imported ${valid.length} questions`)
      setOpen(false)
      setQuestions([])
      setSubjectId('')
      setTopicId('')
      onImportComplete()
    } catch (err) {
      console.error('IMPORT ERROR:', err)
      toast.error('Import failed (check console & RLS)')
    } finally {
      setImporting(false)
    }
  }

  const validCount = questions.filter(q => q.isValid).length

  /* ================= UI ================= */

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-1" />
          Bulk Import
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex gap-2 items-center">
            <FileSpreadsheet className="w-5 h-5" />
            Bulk Import Questions
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 pb-6">

            <Card>
              <CardContent className="p-4 flex justify-between">
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

            <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-4">
                <div>
                  <Label>Subject</Label>
                  <Select value={subjectId} onValueChange={onSubjectChange}>
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
                    value={topicId}
                    onValueChange={setTopicId}
                    disabled={!subjectId}
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

            <Card>
              <CardContent className="p-4">
                <Button
                  variant="outline"
                  className="w-full h-24 border-dashed"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mb-2" />
                  Upload Excel / CSV
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                />
              </CardContent>
            </Card>

            {questions.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <Badge>{validCount} valid questions</Badge>
                </CardContent>
              </Card>
            )}

          </div>
        </ScrollArea>

        <div className="border-t pt-4">
          <Button
            className="w-full"
            onClick={handleImport}
            disabled={importing || validCount === 0}
          >
            {importing ? (
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
