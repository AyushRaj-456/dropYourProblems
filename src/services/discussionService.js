import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  increment,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const PAGE_SIZE = 30;

/**
 * Fetch initial oldest 30 messages for a problem thread
 */
export async function fetchMessages(problemId, lastDoc = null, includeHidden = false) {
  if (!db || !problemId) return { messages: [], lastDoc: null, hasMore: false };

  try {
    const messagesCol = collection(db, 'problems', problemId, 'messages');
    let q;
    if (includeHidden) {
      if (lastDoc) {
        q = query(
          messagesCol,
          orderBy('createdAt', 'asc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          messagesCol,
          orderBy('createdAt', 'asc'),
          limit(PAGE_SIZE)
        );
      }
    } else {
      if (lastDoc) {
        q = query(
          messagesCol,
          where('hidden', '==', false),
          orderBy('createdAt', 'asc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          messagesCol,
          where('hidden', '==', false),
          orderBy('createdAt', 'asc'),
          limit(PAGE_SIZE)
        );
      }
    }

    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    const hasMore = snapshot.docs.length === PAGE_SIZE;

    return { messages, lastDoc: newLastDoc, hasMore };
  } catch (err) {
    console.error('Failed to fetch discussion messages:', err);
    throw err;
  }
}

/**
 * Subscribe to new messages created after the thread opened
 */
export function subscribeToNewMessages(problemId, openedAtTimestamp, onNewMessage) {
  if (!db || !problemId) return () => {};

  try {
    const messagesCol = collection(db, 'problems', problemId, 'messages');
    const q = query(
      messagesCol,
      where('hidden', '==', false),
      where('createdAt', '>', openedAtTimestamp),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            onNewMessage({
              id: change.doc.id,
              ...change.doc.data(),
            });
          }
        });
      },
      (err) => {
        console.warn('New messages live listener notice:', err);
      }
    );
  } catch (err) {
    console.warn('Could not attach live listener:', err);
    return () => {};
  }
}

/**
 * Post a new message to a problem's discussion
 */
export async function postDiscussionMessage({
  problemId,
  text,
  currentUser,
  authorName,
}) {
  if (!db) throw new Error('Firestore not initialized.');
  if (!currentUser || currentUser.isAnonymous) {
    throw new Error('You must be logged in to post in the discussion.');
  }

  const cleanText = (text || '').trim();
  if (cleanText.length < 1 || cleanText.length > 1000) {
    throw new Error('Message must be between 1 and 1000 characters.');
  }

  const cleanName = (authorName || '').trim();
  if (cleanName.length < 1 || cleanName.length > 50) {
    throw new Error('Author display name must be between 1 and 50 characters.');
  }

  const batch = writeBatch(db);
  const msgRef = doc(collection(db, 'problems', problemId, 'messages'));
  const problemRef = doc(db, 'problems', problemId);
  const userStatsRef = doc(db, 'userStats', currentUser.uid);

  batch.set(msgRef, {
    text: cleanText,
    authorUid: currentUser.uid,
    authorName: cleanName,
    createdAt: serverTimestamp(),
    hidden: false,
    reportCount: 0,
  });

  batch.update(problemRef, {
    commentCount: increment(1),
  });

  batch.set(
    userStatsRef,
    {
      lastMessageAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();

  return {
    id: msgRef.id,
    text: cleanText,
    authorUid: currentUser.uid,
    authorName: cleanName,
    createdAt: Timestamp.now(),
    hidden: false,
    reportCount: 0,
  };
}

/**
 * Edit an existing message (author only)
 */
export async function editDiscussionMessage({ problemId, messageId, text }) {
  if (!db) throw new Error('Firestore not initialized.');
  const cleanText = (text || '').trim();
  if (cleanText.length < 1 || cleanText.length > 1000) {
    throw new Error('Message must be between 1 and 1000 characters.');
  }

  const msgRef = doc(db, 'problems', problemId, 'messages', messageId);
  await updateDoc(msgRef, {
    text: cleanText,
  });
}

/**
 * Delete a message (author or admin)
 */
export async function deleteDiscussionMessage({ problemId, messageId }) {
  if (!db) throw new Error('Firestore not initialized.');
  const msgRef = doc(db, 'problems', problemId, 'messages', messageId);
  await deleteDoc(msgRef);
}

/**
 * Report a message
 */
export async function reportDiscussionMessage({ problemId, messageId, currentUser }) {
  if (!db) throw new Error('Firestore not initialized.');
  if (!currentUser) throw new Error('User not found.');

  const reportKey = `reported_msg_${problemId}_${messageId}_${currentUser.uid}`;
  if (localStorage.getItem(reportKey)) {
    throw new Error('You have already reported this message.');
  }

  const batch = writeBatch(db);
  const reportRef = doc(
    db,
    'problems',
    problemId,
    'messages',
    messageId,
    'reports',
    currentUser.uid
  );
  const msgRef = doc(db, 'problems', problemId, 'messages', messageId);

  batch.set(reportRef, {
    createdAt: serverTimestamp(),
  });

  batch.update(msgRef, {
    reportCount: increment(1),
  });

  await batch.commit();
  localStorage.setItem(reportKey, 'true');
}

/**
 * Admin hide/unhide message
 */
export async function setDiscussionMessageHidden({ problemId, messageId, hidden }) {
  if (!db) throw new Error('Firestore not initialized.');
  const msgRef = doc(db, 'problems', problemId, 'messages', messageId);
  await updateDoc(msgRef, {
    hidden: Boolean(hidden),
  });
}
