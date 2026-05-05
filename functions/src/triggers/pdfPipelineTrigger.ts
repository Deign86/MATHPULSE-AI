/**
 * Trigger: pdfPipelineTrigger
 *
 * Fires when a new document is created in pdf_processing_jobs.
 * Calls the backend pipeline endpoint with job data for async processing.
 * Updates the Firestore doc status to 'failed' on error.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface PdfJobData {
  status?: string;
  pdfUrl?: string;
  jobType?: string;
  userId?: string;
  [key: string]: any;
}

export const pdfPipelineTrigger = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB' as const,
  })
  .firestore.document('pdf_processing_jobs/{jobId}')
  .onCreate(async (snapshot, context) => {
    const jobId = context.params.jobId;
    const jobData = snapshot.data() as PdfJobData;

    functions.logger.info('[PDF_PIPELINE] Job created: ' + jobId, {
      jobId,
      status: jobData.status,
      jobType: jobData.jobType,
      userId: jobData.userId,
    });

    try {
      const backendUrl = functions.config().backend.url;

      if (!backendUrl) {
        throw new Error('Backend URL not configured in functions.config().backend.url');
      }

      const response = await fetch(backendUrl + '/pdf-pipeline/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          ...jobData,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error('Backend returned ' + response.status + ': ' + errorText);
      }

      functions.logger.info('[PDF_PIPELINE] Job forwarded to backend: ' + jobId);
    } catch (error: any) {
      functions.logger.error('[PDF_PIPELINE] Job failed: ' + jobId, {
        error: error.message,
        stack: error.stack,
      });

      await snapshot.ref.update({
        status: 'failed',
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
      });
    }

    return null;
  });
