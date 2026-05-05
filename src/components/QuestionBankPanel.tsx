import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, ApiError } from '../services/apiService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Loader2, Upload, RefreshCw, BookOpen, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface PdfStatus {
  filename: string;
  processed: boolean;
  timestamp: string;
  question_count: number;
  grade_level: number;
  topic: string;
  storage_path: string;
}

export const QuestionBankPanel: React.FC = () => {
  const [pdfs, setPdfs] = useState<PdfStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [storagePath, setStoragePath] = useState('');
  const [gradeLevel, setGradeLevel] = useState(11);
  const [topic, setTopic] = useState('general_mathematics');

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ pdfs: PdfStatus[] }>('/api/quiz-battle/bank-status');
      setPdfs(data.pdfs);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load bank status';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleIngest = async () => {
    if (!storagePath.trim()) {
      toast.error('Please enter a storage path');
      return;
    }
    setIngesting(true);
    try {
      await apiFetch('/api/quiz-battle/ingest-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage_path: storagePath.trim(),
          grade_level: gradeLevel,
          topic: topic.trim(),
          force_reingest: false,
        }),
      });
      toast.success('PDF ingestion completed');
      await fetchStatus();
      setStoragePath('');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Ingestion failed';
      toast.error(message);
    } finally {
      setIngesting(false);
    }
  };

  const totalQuestions = pdfs.reduce((sum, p) => sum + p.question_count, 0);
  const processedCount = pdfs.filter((p) => p.processed).length;

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-[#9956DE]/12 rounded-xl border border-[#9956DE]/30">
          <BookOpen className="h-5 w-5 text-[#9956DE]" />
        </div>
        <div>
          <h2 className="text-lg font-display font-bold text-foreground">Question Bank</h2>
          <p className="text-sm text-muted-foreground">
            Manage PDF-ingested quiz questions for battle sessions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total PDFs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-foreground">{pdfs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Total Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-foreground">{totalQuestions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-display font-bold text-foreground">{processedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Ingest Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display font-bold">Ingest New PDF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storagePath">Firebase Storage Path</Label>
              <Input
                id="storagePath"
                placeholder="quiz_pdfs/grade_11/general_math.pdf"
                value={storagePath}
                onChange={(e) => setStoragePath(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gradeLevel">Grade Level</Label>
              <Input
                id="gradeLevel"
                type="number"
                min={7}
                max={12}
                value={gradeLevel}
                onChange={(e) => setGradeLevel(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topic">Topic Slug</Label>
              <Input
                id="topic"
                placeholder="general_mathematics"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleIngest} disabled={ingesting} className="bg-[#9956DE] hover:bg-[#9956DE]/90">
            {ingesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Ingest PDF
          </Button>
        </CardContent>
      </Card>

      {/* Status Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-display font-bold">Processing Status</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pdfs.map((pdf) => (
                <TableRow key={pdf.filename}>
                  <TableCell className="font-medium">{pdf.filename}</TableCell>
                  <TableCell>{pdf.grade_level}</TableCell>
                  <TableCell>{pdf.topic}</TableCell>
                  <TableCell>{pdf.question_count}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        pdf.processed
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}
                    >
                      {pdf.processed ? 'Processed' : 'Pending'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {pdf.timestamp
                      ? new Date(pdf.timestamp).toLocaleDateString()
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {pdfs.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No PDFs processed yet. Upload a PDF to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionBankPanel;
