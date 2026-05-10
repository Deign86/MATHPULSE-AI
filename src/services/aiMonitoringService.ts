import { db } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import type { AIUsageLog } from '../types/hfMonitoring';

const COLLECTION_NAME = 'aiUsageLogs';

export async function getAIUsageStats(month?: string): Promise<AIUsageLog[]> {
  try {
    const targetMonth = month || new Date().toISOString().slice(0, 7); // e.g., "2026-05"
    const q = query(
      collection(db, COLLECTION_NAME),
      where('month', '==', targetMonth)
    );
    
    const snapshot = await getDocs(q);
    const logs: AIUsageLog[] = [];
    
    snapshot.forEach((docSnap) => {
      logs.push(docSnap.data() as AIUsageLog);
    });
    
    return logs;
  } catch (error) {
    console.error('[aiMonitoringService] getAIUsageStats error:', error);
    return [];
  }
}

export function getSystemHealth(stats: AIUsageLog[]): "Healthy" | "Degraded" | "Down" {
  if (!stats || stats.length === 0) return "Healthy";
  
  if (stats.some(s => s.status === 'Down')) return "Down";
  if (stats.some(s => s.status === 'Degraded')) return "Degraded";
  
  return "Healthy";
}

export function getTotalSpend(stats: AIUsageLog[]): number {
  return stats.reduce((sum, s) => sum + (s.estimatedCostUSD || 0), 0);
}

export function getHighestCostFeature(stats: AIUsageLog[]): AIUsageLog | null {
  if (!stats || stats.length === 0) return null;
  return stats.reduce((prev, current) => 
    (prev.estimatedCostUSD > current.estimatedCostUSD) ? prev : current
  );
}

export function getMostActiveFeature(stats: AIUsageLog[]): AIUsageLog | null {
  if (!stats || stats.length === 0) return null;
  return stats.reduce((prev, current) => 
    (prev.requestCount > current.requestCount) ? prev : current
  );
}

export async function logAIRequest(featureId: string, costUSD: number, featureName: string = featureId): Promise<void> {
  try {
    const targetMonth = new Date().toISOString().slice(0, 7);
    const docId = `${targetMonth}_${featureId}`;
    const docRef = doc(db, COLLECTION_NAME, docId);
    
    await setDoc(docRef, {
      featureId,
      featureName,
      month: targetMonth,
      requestCount: increment(1),
      estimatedCostUSD: increment(costUSD),
      lastUpdated: serverTimestamp(),
      priority: "Medium", // Default, could be customized
      status: "Healthy",
    }, { merge: true });
  } catch (error) {
    console.error('[aiMonitoringService] logAIRequest error:', error);
  }
}
