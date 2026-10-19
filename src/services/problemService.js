import {
  collection,
  doc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase';

const PROBLEMS_COLLECTION = 'problems';
const USER_STATS_COLLECTION = 'userStats';

export async function createProblem({
  text,
  tag,
  displayName,
  product,
  year,
  frequency,
  workaround,
  currentUser,
}) {
  if (!db || !currentUser) {
    throw new Error('You must be signed in to drop a problem.');
  }

  const cleanText = text.trim();
  if (cleanText.length < 1 || cleanText.length > 600) {
    throw new Error('Problem text must be between 1 and 600 characters.');
  }

  const batch = writeBatch(db);
  const problemRef = doc(collection(db, PROBLEMS_COLLECTION));
  const userStatsRef = doc(db, USER_STATS_COLLECTION, currentUser.uid);

  const problemData = {
    text: cleanText,
    tag: tag || 'Websites',
    status: 'open',
    meTooCount: 0,
    reportCount: 0,
    hidden: false,
    authorUid: currentUser.uid,
    createdAt: serverTimestamp(),
  };

  if (displayName && displayName.trim()) {
    problemData.displayName = displayName.trim().slice(0, 50);
  }
  if (product && product.trim()) {
    problemData.product = product.trim().slice(0, 80);
  }
  if (year && year.trim()) {
    problemData.year = year.trim().slice(0, 30);
  }
  if (frequency && frequency.trim()) {
    problemData.frequency = frequency.trim().slice(0, 30);
  }
  if (workaround && workaround.trim()) {
    problemData.workaround = workaround.trim().slice(0, 300);
  }

  batch.set(problemRef, problemData);
  batch.set(userStatsRef, {
    lastPostAt: serverTimestamp(),
  });

  await batch.commit();

  return {
    id: problemRef.id,
    ...problemData,
    createdAt: new Date(),
  };
}

export async function fetchProblems({
  tag = 'All',
  sort = 'most',
  lastDoc = null,
  pageSize = 20,
}) {
  if (!db) return { problems: [], lastVisible: null };

  const orderField = sort === 'most' ? 'meTooCount' : 'createdAt';

  try {
    let q;
    if (tag && tag !== 'All') {
      q = lastDoc
        ? query(
            collection(db, PROBLEMS_COLLECTION),
            where('hidden', '==', false),
            where('tag', '==', tag),
            orderBy(orderField, 'desc'),
            startAfter(lastDoc),
            limit(pageSize)
          )
        : query(
            collection(db, PROBLEMS_COLLECTION),
            where('hidden', '==', false),
            where('tag', '==', tag),
            orderBy(orderField, 'desc'),
            limit(pageSize)
          );
    } else {
      q = lastDoc
        ? query(
            collection(db, PROBLEMS_COLLECTION),
            where('hidden', '==', false),
            orderBy(orderField, 'desc'),
            startAfter(lastDoc),
            limit(pageSize)
          )
        : query(
            collection(db, PROBLEMS_COLLECTION),
            where('hidden', '==', false),
            orderBy(orderField, 'desc'),
            limit(pageSize)
          );
    }

    const snapshot = await getDocs(q);
    const problems = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
    return { problems, lastVisible };
  } catch (err) {
    // Graceful fallback if composite index is being built
    console.warn('Index not ready, running fallback query:', err.message);
    const fallbackQ = query(
      collection(db, PROBLEMS_COLLECTION),
      where('hidden', '==', false),
      limit(50)
    );
    const snapshot = await getDocs(fallbackQ);
    let problems = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    if (tag && tag !== 'All') {
      problems = problems.filter((p) => p.tag === tag);
    }

    problems.sort((a, b) => {
      if (sort === 'most') {
        return (b.meTooCount || 0) - (a.meTooCount || 0);
      }
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });

    return { problems: problems.slice(0, pageSize), lastVisible: null };
  }
}

export async function updateProblem(problemId, updateData, currentUser) {
  if (!db || !currentUser) {
    throw new Error('Not authorized.');
  }

  const problemRef = doc(db, PROBLEMS_COLLECTION, problemId);
  const dataToUpdate = {};

  if (typeof updateData.text === 'string') {
    const cleanText = updateData.text.trim();
    if (cleanText.length < 1 || cleanText.length > 600) {
      throw new Error('Text must be between 1 and 600 characters.');
    }
    dataToUpdate.text = cleanText;
  }

  if (updateData.tag) {
    dataToUpdate.tag = updateData.tag;
  }
  if (updateData.displayName !== undefined) {
    dataToUpdate.displayName = updateData.displayName ? updateData.displayName.trim() : null;
  }
  if (updateData.product !== undefined) {
    dataToUpdate.product = updateData.product ? updateData.product.trim().slice(0, 80) : null;
  }
  if (updateData.year !== undefined) {
    dataToUpdate.year = updateData.year || null;
  }
  if (updateData.frequency !== undefined) {
    dataToUpdate.frequency = updateData.frequency || null;
  }
  if (updateData.workaround !== undefined) {
    dataToUpdate.workaround = updateData.workaround ? updateData.workaround.trim() : null;
  }

  await updateDoc(problemRef, dataToUpdate);
}

export async function deleteProblem(problemId, currentUser) {
  if (!db || !currentUser) {
    throw new Error('Not authorized.');
  }

  const problemRef = doc(db, PROBLEMS_COLLECTION, problemId);
  await deleteDoc(problemRef);
}

export async function voteProblem(problem, currentUser) {
  if (!db || !currentUser || currentUser.isAnonymous) {
    throw new Error('You must be logged in to upvote.');
  }

  if (currentUser.uid === problem.authorUid) {
    throw new Error('You cannot upvote your own problem.');
  }

  if (isProblemVoted(problem.id, currentUser)) {
    throw new Error('You have already upvoted this problem.');
  }

  const voteDocRef = doc(db, PROBLEMS_COLLECTION, problem.id, 'votes', currentUser.uid);
  const problemDocRef = doc(db, PROBLEMS_COLLECTION, problem.id);

  const batch = writeBatch(db);
  batch.set(voteDocRef, {
    createdAt: serverTimestamp(),
  });
  batch.update(problemDocRef, {
    meTooCount: increment(1),
  });

  await batch.commit();
  saveVotedProblem(problem.id, currentUser.uid);

  return (problem.meTooCount || 0) + 1;
}

export async function checkHasUserVoted(problemId, currentUser) {
  if (!db || !currentUser || currentUser.isAnonymous) return false;
  if (isProblemVoted(problemId, currentUser)) return true;

  try {
    const voteDocRef = doc(db, PROBLEMS_COLLECTION, problemId, 'votes', currentUser.uid);
    const snap = await getDoc(voteDocRef);
    if (snap.exists()) {
      saveVotedProblem(problemId, currentUser.uid);
      return true;
    }
  } catch {
    // Return cached value if offline or rule check
  }
  return false;
}

export async function reportProblem(problemId, currentUser) {
  if (!db || !currentUser) {
    throw new Error('You must be signed in to report.');
  }

  const reportDocRef = doc(db, PROBLEMS_COLLECTION, problemId, 'reports', currentUser.uid);
  const problemDocRef = doc(db, PROBLEMS_COLLECTION, problemId);

  const batch = writeBatch(db);
  batch.set(reportDocRef, {
    createdAt: serverTimestamp(),
  });
  batch.update(problemDocRef, {
    reportCount: increment(1),
  });

  await batch.commit();
  saveReportedProblem(problemId, currentUser.uid);
}

export function isProblemVoted(problemId, currentUser) {
  if (!currentUser) return false;
  try {
    const list = JSON.parse(localStorage.getItem(`voted_${currentUser.uid}`) || '[]');
    return list.includes(problemId);
  } catch {
    return false;
  }
}

function saveVotedProblem(problemId, uid) {
  try {
    const key = `voted_${uid}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    if (!list.includes(problemId)) {
      list.push(problemId);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {
    console.error('Could not save vote locally', e);
  }
}

export function isProblemReported(problemId, currentUser) {
  if (!currentUser) return false;
  try {
    const list = JSON.parse(localStorage.getItem(`reported_${currentUser.uid}`) || '[]');
    return list.includes(problemId);
  } catch {
    return false;
  }
}

function saveReportedProblem(problemId, uid) {
  try {
    const key = `reported_${uid}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    if (!list.includes(problemId)) {
      list.push(problemId);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch (e) {
    console.error('Could not save report locally', e);
  }
}

