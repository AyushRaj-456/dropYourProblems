import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export const CONTRIBUTOR_THRESHOLD = 10;
const CONTRIBUTORS_COLLECTION = 'contributors';

export async function claimContributor({
  problemId,
  name,
  photoData,
  currentUser,
  problemTitle,
  meTooCount,
}) {
  if (!db || !currentUser) {
    throw new Error('You must be signed in to join Contributors.');
  }

  if (currentUser.isAnonymous) {
    throw new Error('Anonymous users cannot join Contributors. Please log in first.');
  }

  if ((meTooCount || 0) < CONTRIBUTOR_THRESHOLD) {
    throw new Error(`Problem must reach at least ${CONTRIBUTOR_THRESHOLD} upvotes.`);
  }

  const cleanName = name.trim();
  if (cleanName.length < 1 || cleanName.length > 50) {
    throw new Error('Name must be between 1 and 50 characters.');
  }

  const contributorDocRef = doc(db, CONTRIBUTORS_COLLECTION, problemId);

  const contributorData = {
    authorUid: currentUser.uid,
    name: cleanName,
    title: problemTitle,
    meTooCount: meTooCount || CONTRIBUTOR_THRESHOLD,
    createdAt: serverTimestamp(),
  };

  if (photoData) {
    if (photoData.length > 65000) {
      throw new Error('Photo text string exceeds 60KB limit.');
    }
    contributorData.photoData = photoData;
  }

  await setDoc(contributorDocRef, contributorData);

  return {
    id: problemId,
    ...contributorData,
    createdAt: new Date(),
  };
}

export async function fetchContributors() {
  if (!db) return [];

  try {
    const snapshot = await getDocs(collection(db, CONTRIBUTORS_COLLECTION));
    const contributors = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    contributors.sort((a, b) => {
      return (b.meTooCount || 0) - (a.meTooCount || 0);
    });

    return contributors;
  } catch (err) {
    console.error('Failed to fetch contributors:', err);
    return [];
  }
}

export async function checkContributorClaimed(problemId) {
  if (!db || !problemId) return false;
  try {
    const snap = await getDoc(doc(db, CONTRIBUTORS_COLLECTION, problemId));
    return snap.exists();
  } catch {
    return false;
  }
}
