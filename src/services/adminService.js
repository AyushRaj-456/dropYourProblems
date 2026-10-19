import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export async function checkIsAdmin(user) {
  if (!user || user.isAnonymous || !db) {
    return false;
  }
  try {
    const adminDocSnap = await getDoc(doc(db, 'admins', user.uid));
    return adminDocSnap.exists();
  } catch (err) {
    console.warn('Admin check failed or permission denied:', err);
    return false;
  }
}

export async function fetchModerationProblems() {
  if (!db) return [];

  const snapshot = await getDocs(collection(db, 'problems'));
  const problems = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  // Sort most-reported first, then newest
  problems.sort((a, b) => {
    const reportDiff = (b.reportCount || 0) - (a.reportCount || 0);
    if (reportDiff !== 0) return reportDiff;

    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });

  return problems;
}

export async function setProblemStatus(problemId, newStatus) {
  if (!db || !problemId) return;
  const valid = ['open', 'building', 'launched'];
  if (!valid.includes(newStatus.toLowerCase())) {
    throw new Error('Invalid status. Must be open, building, or launched.');
  }

  const probRef = doc(db, 'problems', problemId);
  await updateDoc(probRef, {
    status: newStatus.toLowerCase(),
  });
}

export async function setProblemHidden(problemId, hidden) {
  if (!db || !problemId) return;
  const probRef = doc(db, 'problems', problemId);
  await updateDoc(probRef, {
    hidden: Boolean(hidden),
  });
}

export async function deleteProblemAsAdmin(problemId) {
  if (!db || !problemId) return;
  await deleteDoc(doc(db, 'problems', problemId));
}

export async function fetchContributorsForAdmin() {
  if (!db) return [];
  const snapshot = await getDocs(collection(db, 'contributors'));
  const list = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
  list.sort((a, b) => (b.meTooCount || 0) - (a.meTooCount || 0));
  return list;
}

export async function removeContributorAsAdmin(problemId) {
  if (!db || !problemId) return;
  await deleteDoc(doc(db, 'contributors', problemId));
}
