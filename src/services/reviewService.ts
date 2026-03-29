import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SubjectReview, SubjectStats } from '../types/models';

export const addSubjectReview = async (
  subjectId: string,
  userId: string,
  userName: string,
  userPhoto: string | undefined,
  rating: number,
  comment: string
): Promise<void> => {
  try {
    const reviewRef = doc(collection(db, 'reviews'));
    const statsRef = doc(db, 'subjectStats', subjectId);

    await runTransaction(db, async (transaction) => {
      // 1. Get current stats
      const statsDoc = await transaction.get(statsRef);
      let currentTotalReviews = 0;
      let currentAverage = 0;

      if (statsDoc.exists()) {
        const data = statsDoc.data() as SubjectStats;
        currentTotalReviews = data.totalReviews || 0;
        currentAverage = data.averageRating || 0;
      }

      // 2. Calculate new average
      const newTotalReviews = currentTotalReviews + 1;
      const newAverage = ((currentAverage * currentTotalReviews) + rating) / newTotalReviews;

      // 3. Write new review
      transaction.set(reviewRef, {
        id: reviewRef.id,
        subjectId,
        userId,
        userName,
        userPhoto: userPhoto || null,
        rating,
        comment,
        createdAt: serverTimestamp(),
      });

      // 4. Update stats
      transaction.set(statsRef, {
        subjectId,
        averageRating: newAverage,
        totalReviews: newTotalReviews,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
};

export const getAllSubjectStats = async (): Promise<Record<string, SubjectStats>> => {
  try {
    const statsSnapshot = await getDocs(collection(db, 'subjectStats'));
    const statsMap: Record<string, SubjectStats> = {};
    
    statsSnapshot.forEach((doc) => {
      const data = doc.data() as SubjectStats;
      statsMap[data.subjectId] = {
        ...data,
        updatedAt: (data.updatedAt as any)?.toDate ? (data.updatedAt as any).toDate() : new Date(),
      };
    });
    
    return statsMap;
  } catch (error) {
    console.error('Error fetching subject stats:', error);
    return {};
  }
};

export const getSubjectReviews = async (subjectId: string): Promise<SubjectReview[]> => {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('subjectId', '==', subjectId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      } as SubjectReview;
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
};
