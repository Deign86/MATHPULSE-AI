import React, { useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, ShieldAlert, UploadCloud } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';
import { Badge } from '../../../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { useShsExcelImport } from '../hooks/useShsExcelImport';
import type { ParseShsWorkbookResult } from '../services/shsExcel/parser/types';

interface DataImportExcelProps {
  className?: string;
  onParsed: (result: ParseShsWorkbookResult) => void;
}

function summarizeDetectedSheets(result: ParseShsWorkbookResult): string[] {
  const groups = result.imported.workbookMeta.detectedSheets;
  return [
    groups.inputData ? `Input Data: ${groups.inputData}` : undefined,
    ...(groups.firstQuarter || []).map((sheet) => `First Quarter: ${sheet}`),
    ...(groups.secondQuarter || []).map((sheet) => `Second Quarter: ${sheet}`),
    ...(groups.finalSemestral || []).map((sheet) => `Final Semestral: ${sheet}`),
    ...(groups.helper || []).map((sheet) => `Helper: ${sheet}`),
    ...(groups.lookup || []).map((sheet) => `Lookup: ${sheet}`),
    ...(groups.other || []).map((sheet) => `Other: ${sheet}`),
  ].filter((value): value is string => Boolean(value));
}

export const DataImportExcel: React.FC<DataImportExcelProps> = ({ className, onParsed }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const {
    stage,
    progressPercent,
    progressMessage,
    error,
    result,
    parseFile,
    reset,
    canConfirmImport,
    confidenceThreshold,
  } = useShsExcelImport();

  const detectedSheetSummary = useMemo(() => (result ? summarizeDetectedSheets(result) : []), [result]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit to mitigate ReDoS risks

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      toast.error('Please upload an Excel workbook (.xlsx or .xls).');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 10MB limit. Please use a smaller Excel file.');
      return;
    }

    try {
      const parsed = await parseFile(file);
      onParsed(parsed);

      if (!parsed.imported.validation.isOfficialFormatLikely) {
        toast.error('Workbook parsed with low confidence. Review diagnostics before confirming import.');
      } else {
        toast.success(`Workbook parsed: ${parsed.imported.learners.length} learners detected.`);
      }
    } catch (parseError) {
      toast.error(parseError instanceof Error ? parseError.message : 'Failed to parse workbook.');
    }
  };

  return (
    <Card className={className}>
      <CardContent className="space-y-4 p-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <FileSpreadsheet className="h-4 w-4 text-[#9956DE]" />
          <span>Excel workbook parser</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files?.[0];
            if (file) {
              void handleFile(file);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-2xl p-4 cursor-pointer transition-all ${
            dragOver ? 'border-[#9956DE] bg-[#9956DE]/12' : 'border-border/80 bg-muted/20 hover:border-[#9956DE]/50 hover:bg-[#9956DE]/6'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleFile(file);
              }
            }}
          />

          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-[#9956DE]/16 flex items-center justify-center">
              {stage === 'reading' || stage === 'detecting format' || stage === 'extracting' || stage === 'validating' ? (
                <Loader2 className="h-5 w-5 text-[#9956DE] animate-spin" />
              ) : (
                <UploadCloud className="h-5 w-5 text-[#9956DE]" />
              )}
            </div>
            <div>
              <p className="font-semibold text-foreground">Upload workbook (.xlsx/.xls)</p>
              <p className="text-sm text-muted-foreground">Status: {stage} ({progressPercent}%)</p>
              <p className="text-xs text-muted-foreground">{progressMessage}</p>
            </div>
          </div>
        </motion.div>

        {error && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Import failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="bg-muted/40 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Detected format</p>
                <p className="text-sm font-semibold text-foreground">{result.imported.format}</p>
              </div>
              <div className="bg-muted/40 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">School</p>
                <p className="text-sm font-semibold text-foreground">{result.imported.schoolContext.schoolName || 'N/A'}</p>
              </div>
              <div className="bg-muted/40 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Subject</p>
                <p className="text-sm font-semibold text-foreground">{result.imported.schoolContext.subjectName || 'N/A'}</p>
              </div>
              <div className="bg-muted/40 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Total learners</p>
                <p className="text-sm font-semibold text-foreground">{result.imported.learners.length}</p>
              </div>
              <div className="bg-muted/40 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Grade/Section</p>
                <p className="text-sm font-semibold text-foreground">{result.imported.schoolContext.gradeSection || 'N/A'}</p>
              </div>
              <div className="bg-muted/40 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Semester</p>
                <p className="text-sm font-semibold text-foreground">{result.imported.schoolContext.semester || 'N/A'}</p>
              </div>
              <div className="bg-muted/40 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Warnings</p>
                <p className="text-sm font-semibold text-foreground">{result.imported.validation.warnings.length}</p>
              </div>
              <div className="bg-muted/40 rounded-xl border border-border p-3">
                <p className="text-xs text-muted-foreground">Errors</p>
                <p className="text-sm font-semibold text-foreground">{result.imported.validation.errors.length}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant={result.imported.validation.isOfficialFormatLikely ? 'default' : 'destructive'}>
                {result.imported.validation.isOfficialFormatLikely ? 'Official format likely' : 'Official format uncertain'}
              </Badge>
              <Badge variant={result.imported.validation.confidence >= confidenceThreshold ? 'default' : 'secondary'}>
                Confidence {result.imported.validation.confidence.toFixed(2)}
              </Badge>
              <Badge variant="outline">Threshold {confidenceThreshold.toFixed(2)}</Badge>
            </div>

            {!canConfirmImport && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Import confirmation is blocked</AlertTitle>
                <AlertDescription>
                  Confidence is below threshold or critical validation errors exist. Review diagnostics and workbook structure before proceeding.
                </AlertDescription>
              </Alert>
            )}

            {canConfirmImport && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Ready for import confirmation</AlertTitle>
                <AlertDescription>
                  Workbook passed structural checks at or above confidence threshold.
                </AlertDescription>
              </Alert>
            )}

            <Accordion type="multiple" className="w-full">
              <AccordionItem value="detected-sheets">
                <AccordionTrigger>Detected sheets</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {detectedSheetSummary.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="diagnostics">
                <AccordionTrigger>Diagnostics and coverage</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Total sheets: {result.imported.validation.coverage.totalSheets}</p>
                    <p>Recognized sheets: {result.imported.validation.coverage.recognizedSheets}</p>
                    <p>Unclassified sheets: {result.imported.validation.coverage.unclassifiedSheets}</p>
                    <p>Mapped regions: {result.imported.validation.coverage.mappedCellRegions}</p>
                    <p>Unmapped regions: {result.imported.validation.coverage.unmappedCellRegions}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="warnings-errors">
                <AccordionTrigger>Warnings and errors</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">Warnings</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {result.imported.validation.warnings.length > 0
                          ? result.imported.validation.warnings.map((warning) => <li key={warning}>{warning}</li>)
                          : <li>No warnings.</li>}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">Errors</p>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {result.imported.validation.errors.length > 0
                          ? result.imported.validation.errors.map((err) => <li key={err}>{err}</li>)
                          : <li>No critical errors.</li>}
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex items-center justify-end">
              <Button variant="outline" onClick={reset}>Reset parser state</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DataImportExcel;
