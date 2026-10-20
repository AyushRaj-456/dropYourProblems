import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import fs from 'node:fs';
import test, { before, after, beforeEach } from 'node:test';

const rules = fs.readFileSync('firestore.rules', 'utf8');

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rules-test',
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  if (testEnv) {
    await testEnv.clearFirestore();
  }
});

test('unauthenticated users can read non-hidden problems', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Test problem',
      tag: 'Canteen',
      authorUid: 'author1',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertSucceeds(unauthDb.collection('problems').doc('p1').get());
});

test('unauthenticated users cannot read hidden problems', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p_hidden').set({
      text: 'Hidden problem',
      tag: 'Canteen',
      authorUid: 'author1',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: true,
      createdAt: new Date(),
    });
  });

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertFails(unauthDb.collection('problems').doc('p_hidden').get());
});

test('authenticated user can create a valid problem with technology tag and product', async () => {
  const aliceDb = testEnv.authenticatedContext('alice').firestore();
  await assertSucceeds(
    aliceDb.collection('problems').doc('alice-prob').set({
      text: 'Session expires after 2 minutes on state transport website',
      tag: 'Websites',
      product: 'State Portal',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    })
  );
});

test('user cannot create a problem with invalid tag or as someone else', async () => {
  const aliceDb = testEnv.authenticatedContext('alice').firestore();
  // Invalid tag
  await assertFails(
    aliceDb.collection('problems').doc('invalid-tag').set({
      text: 'Bad tag',
      tag: 'InvalidTag',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    })
  );

  // Fake authorUid
  await assertFails(
    aliceDb.collection('problems').doc('fake-author').set({
      text: 'Fake author problem',
      tag: 'Hostel',
      authorUid: 'bob',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    })
  );
});

test('only author can edit their own problem text and tag', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('alice-prob').set({
      text: 'Original problem text',
      tag: 'Hostel',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob').firestore();
  await assertFails(
    bobDb.collection('problems').doc('alice-prob').update({
      text: 'Bob attempting to edit Alice problem',
    })
  );

  const aliceDb = testEnv.authenticatedContext('alice').firestore();
  await assertSucceeds(
    aliceDb.collection('problems').doc('alice-prob').update({
      text: 'Alice updated problem text',
    })
  );
});

test('author cannot edit meTooCount or status directly', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('alice-prob').set({
      text: 'Original problem text',
      tag: 'Hostel',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const aliceDb = testEnv.authenticatedContext('alice').firestore();
  // Cannot inflate meTooCount directly
  await assertFails(
    aliceDb.collection('problems').doc('alice-prob').update({
      meTooCount: 10,
    })
  );

  // Cannot mark launched directly
  await assertFails(
    aliceDb.collection('problems').doc('alice-prob').update({
      status: 'launched',
    })
  );
});

test('author can delete their own problem, non-author cannot', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('alice-prob').set({
      text: 'Delete test',
      tag: 'Academics',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob').firestore();
  await assertFails(bobDb.collection('problems').doc('alice-prob').delete());

  const aliceDb = testEnv.authenticatedContext('alice').firestore();
  await assertSucceeds(aliceDb.collection('problems').doc('alice-prob').delete());
});

test('authenticated non-anonymous user can cast an upvote in a batched write', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Slow website',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();
  const batch = bobDb.batch();
  batch.set(bobDb.collection('problems').doc('p1').collection('votes').doc('bob'), {
    createdAt: new Date(),
  });
  batch.update(bobDb.collection('problems').doc('p1'), {
    meTooCount: 1,
  });

  await assertSucceeds(batch.commit());
});

test('anonymous user cannot cast an upvote', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Slow website',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const anonDb = testEnv.authenticatedContext('anon-voter', {
    firebase: { sign_in_provider: 'anonymous' },
  }).firestore();
  const batch = anonDb.batch();
  batch.set(anonDb.collection('problems').doc('p1').collection('votes').doc('anon-voter'), {
    createdAt: new Date(),
  });
  batch.update(anonDb.collection('problems').doc('p1'), {
    meTooCount: 1,
  });

  await assertFails(batch.commit());
});

test('unauthenticated user cannot cast an upvote', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Slow website',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  const batch = unauthDb.batch();
  batch.set(unauthDb.collection('problems').doc('p1').collection('votes').doc('anon'), {
    createdAt: new Date(),
  });
  batch.update(unauthDb.collection('problems').doc('p1'), {
    meTooCount: 1,
  });

  await assertFails(batch.commit());
});

test('author cannot upvote their own problem', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Slow website',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const aliceDb = testEnv.authenticatedContext('alice', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();
  const batch = aliceDb.batch();
  batch.set(aliceDb.collection('problems').doc('p1').collection('votes').doc('alice'), {
    createdAt: new Date(),
  });
  batch.update(aliceDb.collection('problems').doc('p1'), {
    meTooCount: 1,
  });

  await assertFails(batch.commit());
});

test('user cannot upvote twice on the same problem', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Slow website',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();

  // First vote succeeds
  const batch1 = bobDb.batch();
  batch1.set(bobDb.collection('problems').doc('p1').collection('votes').doc('bob'), {
    createdAt: new Date(),
  });
  batch1.update(bobDb.collection('problems').doc('p1'), {
    meTooCount: 1,
  });
  await assertSucceeds(batch1.commit());

  // Second vote fails (votes/bob already exists and update is not allowed)
  const batch2 = bobDb.batch();
  batch2.set(bobDb.collection('problems').doc('p1').collection('votes').doc('bob'), {
    createdAt: new Date(),
  });
  batch2.update(bobDb.collection('problems').doc('p1'), {
    meTooCount: 2,
  });
  await assertFails(batch2.commit());
});

test('authenticated user cannot directly update meTooCount without vote doc or after voting', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Slow website',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
    // Bob already voted in the past
    await context.firestore().collection('problems').doc('p1').collection('votes').doc('bob').set({
      createdAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();

  // Bob trying to directly increment meTooCount must fail because votes/bob exists
  await assertFails(
    bobDb.collection('problems').doc('p1').update({
      meTooCount: 1,
    })
  );
});

test('user can report a post in a batched write and cannot report twice', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Offensive problem',
      tag: 'Other',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob').firestore();

  // First report succeeds
  const batch1 = bobDb.batch();
  batch1.set(bobDb.collection('problems').doc('p1').collection('reports').doc('bob'), {
    createdAt: new Date(),
  });
  batch1.update(bobDb.collection('problems').doc('p1'), {
    reportCount: 1,
  });
  await assertSucceeds(batch1.commit());

  // Second report fails
  const batch2 = bobDb.batch();
  batch2.set(bobDb.collection('problems').doc('p1').collection('reports').doc('bob'), {
    createdAt: new Date(),
  });
  batch2.update(bobDb.collection('problems').doc('p1'), {
    reportCount: 2,
  });
  await assertFails(batch2.commit());
});

test('contributor claim rejected if problem has less than 10 votes', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('prob-9').set({
      text: 'Low vote problem',
      tag: 'Hostel',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 9,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const aliceDb = testEnv.authenticatedContext('alice', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();

  await assertFails(
    aliceDb.collection('contributors').doc('prob-9').set({
      authorUid: 'alice',
      name: 'Alice',
      title: 'Low vote problem',
      meTooCount: 9,
      createdAt: new Date(),
    })
  );
});

test('contributor claim rejected if author is anonymous', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('prob-10').set({
      text: 'Ten vote problem',
      tag: 'Hostel',
      authorUid: 'anon-user',
      status: 'open',
      meTooCount: 10,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const anonDb = testEnv.authenticatedContext('anon-user', {
    firebase: { sign_in_provider: 'anonymous' },
  }).firestore();

  await assertFails(
    anonDb.collection('contributors').doc('prob-10').set({
      authorUid: 'anon-user',
      name: 'Anonymous User',
      title: 'Ten vote problem',
      meTooCount: 10,
      createdAt: new Date(),
    })
  );
});

test('non-author cannot claim contributor on another person problem', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('prob-10').set({
      text: 'Ten vote problem',
      tag: 'Hostel',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 10,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();

  await assertFails(
    bobDb.collection('contributors').doc('prob-10').set({
      authorUid: 'bob',
      name: 'Bob Impersonator',
      title: 'Ten vote problem',
      meTooCount: 10,
      createdAt: new Date(),
    })
  );
});

test('logged-in author can claim contributor when problem reaches 10 votes', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('prob-10').set({
      text: 'Ten vote problem',
      tag: 'Hostel',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 10,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const aliceDb = testEnv.authenticatedContext('alice', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();

  await assertSucceeds(
    aliceDb.collection('contributors').doc('prob-10').set({
      authorUid: 'alice',
      name: 'Alice Kumar',
      title: 'Ten vote problem',
      meTooCount: 10,
      photoData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      createdAt: new Date(),
    })
  );
});

test('admin can update status to building or launched, non-admin cannot', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('admins').doc('admin-user').set({
      role: 'admin',
    });
    await context.firestore().collection('problems').doc('p-status').set({
      text: 'Water cooler broken',
      tag: 'Hostel',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 12,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const nonAdminDb = testEnv.authenticatedContext('alice').firestore();
  await assertFails(
    nonAdminDb.collection('problems').doc('p-status').update({
      status: 'building',
    })
  );

  const adminDb = testEnv.authenticatedContext('admin-user').firestore();
  await assertSucceeds(
    adminDb.collection('problems').doc('p-status').update({
      status: 'building',
    })
  );
});

test('admin can hide or unhide a problem, non-admin cannot', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('admins').doc('admin-user').set({
      role: 'admin',
    });
    await context.firestore().collection('problems').doc('p-hide').set({
      text: 'Spam problem',
      tag: 'Other',
      authorUid: 'spammer',
      status: 'open',
      meTooCount: 0,
      reportCount: 5,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob').firestore();
  await assertFails(
    bobDb.collection('problems').doc('p-hide').update({
      hidden: true,
    })
  );

  const adminDb = testEnv.authenticatedContext('admin-user').firestore();
  await assertSucceeds(
    adminDb.collection('problems').doc('p-hide').update({
      hidden: true,
    })
  );
});

test('admin can read hidden problems, non-admin cannot', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('admins').doc('admin-user').set({
      role: 'admin',
    });
    await context.firestore().collection('problems').doc('hidden-prob').set({
      text: 'Secret hidden problem',
      tag: 'Other',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      reportCount: 0,
      hidden: true,
      createdAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob').firestore();
  await assertFails(bobDb.collection('problems').doc('hidden-prob').get());

  const adminDb = testEnv.authenticatedContext('admin-user').firestore();
  await assertSucceeds(adminDb.collection('problems').doc('hidden-prob').get());
});

test('admin can delete any contributor, non-admin non-author cannot', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('admins').doc('admin-user').set({
      role: 'admin',
    });
    await context.firestore().collection('contributors').doc('c-delete').set({
      authorUid: 'charlie',
      name: 'Charlie',
      title: 'Valid problem',
      meTooCount: 15,
      createdAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob').firestore();
  await assertFails(bobDb.collection('contributors').doc('c-delete').delete());

  const adminDb = testEnv.authenticatedContext('admin-user').firestore();
  await assertSucceeds(adminDb.collection('contributors').doc('c-delete').delete());
});

test('clients cannot create or edit documents in admins collection directly', async () => {
  const aliceDb = testEnv.authenticatedContext('alice').firestore();
  await assertFails(
    aliceDb.collection('admins').doc('alice').set({
      role: 'admin',
    })
  );
});

// --- Phase 9 Discussion Tests ---

test('anyone can read non-hidden discussion messages, but cannot read hidden messages unless admin', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Discussion problem',
      tag: 'Websites',
      authorUid: 'author1',
      status: 'open',
      meTooCount: 0,
      commentCount: 1,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
    await context.firestore().collection('problems').doc('p1').collection('messages').doc('msg-public').set({
      text: 'Public message',
      authorUid: 'author1',
      authorName: 'Author One',
      createdAt: new Date(),
      hidden: false,
    });
    await context.firestore().collection('problems').doc('p1').collection('messages').doc('msg-hidden').set({
      text: 'Hidden message',
      authorUid: 'author1',
      authorName: 'Author One',
      createdAt: new Date(),
      hidden: true,
    });
    await context.firestore().collection('admins').doc('admin-user').set({ role: 'admin' });
  });

  const unauthDb = testEnv.unauthenticatedContext().firestore();
  await assertSucceeds(unauthDb.collection('problems').doc('p1').collection('messages').doc('msg-public').get());
  await assertFails(unauthDb.collection('problems').doc('p1').collection('messages').doc('msg-hidden').get());

  const anonDb = testEnv.authenticatedContext('anon-user', {
    firebase: { sign_in_provider: 'anonymous' },
  }).firestore();
  await assertSucceeds(anonDb.collection('problems').doc('p1').collection('messages').doc('msg-public').get());
  await assertFails(anonDb.collection('problems').doc('p1').collection('messages').doc('msg-hidden').get());

  const adminDb = testEnv.authenticatedContext('admin-user').firestore();
  await assertSucceeds(adminDb.collection('problems').doc('p1').collection('messages').doc('msg-hidden').get());
});

test('anonymous user cannot write a discussion message', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Discussion problem',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      commentCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const anonDb = testEnv.authenticatedContext('anon-user', {
    firebase: { sign_in_provider: 'anonymous' },
  }).firestore();

  const batch = anonDb.batch();
  batch.set(anonDb.collection('problems').doc('p1').collection('messages').doc('m1'), {
    text: 'Anonymous comment attempt',
    authorUid: 'anon-user',
    authorName: 'Anon',
    createdAt: new Date(),
    hidden: false,
  });
  batch.update(anonDb.collection('problems').doc('p1'), {
    commentCount: 1,
  });

  await assertFails(batch.commit());
});

test('logged-in user can post a discussion message and increment commentCount', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Discussion problem',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      commentCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();

  const batch = bobDb.batch();
  batch.set(bobDb.collection('problems').doc('p1').collection('messages').doc('msg-1'), {
    text: 'Great idea, I have experienced this too.',
    authorUid: 'bob',
    authorName: 'Bob Builder',
    createdAt: new Date(),
    hidden: false,
  });
  batch.update(bobDb.collection('problems').doc('p1'), {
    commentCount: 1,
  });
  batch.set(bobDb.collection('userStats').doc('bob'), {
    lastMessageAt: new Date(),
  }, { merge: true });

  await assertSucceeds(batch.commit());
});

test('nobody can change commentCount directly without complying with rules', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Discussion problem',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      commentCount: 5,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
  });

  // 1. Problem author editing post cannot alter commentCount
  const aliceDb = testEnv.authenticatedContext('alice').firestore();
  await assertFails(
    aliceDb.collection('problems').doc('p1').update({
      text: 'Updated problem text',
      commentCount: 99,
    })
  );

  // 2. Anonymous user cannot update commentCount
  const anonDb = testEnv.authenticatedContext('anon-user', {
    firebase: { sign_in_provider: 'anonymous' },
  }).firestore();
  await assertFails(
    anonDb.collection('problems').doc('p1').update({
      commentCount: 6,
    })
  );

  // 3. Authenticated user cannot set arbitrary value
  const bobDb = testEnv.authenticatedContext('bob', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();
  await assertFails(
    bobDb.collection('problems').doc('p1').update({
      commentCount: 50,
    })
  );
});

test('only author can edit their own message text', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Problem',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      commentCount: 1,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
    await context.firestore().collection('problems').doc('p1').collection('messages').doc('msg-bob').set({
      text: 'Original message text by Bob',
      authorUid: 'bob',
      authorName: 'Bob Builder',
      createdAt: new Date(),
      hidden: false,
    });
  });

  const charlieDb = testEnv.authenticatedContext('charlie', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();

  // Non-author cannot edit
  await assertFails(
    charlieDb.collection('problems').doc('p1').collection('messages').doc('msg-bob').update({
      text: 'Charlie editing Bob message',
    })
  );

  const bobDb = testEnv.authenticatedContext('bob', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();

  // Author cannot change authorUid or hidden or authorName
  await assertFails(
    bobDb.collection('problems').doc('p1').collection('messages').doc('msg-bob').update({
      text: 'Valid edit text',
      hidden: true,
    })
  );
  await assertFails(
    bobDb.collection('problems').doc('p1').collection('messages').doc('msg-bob').update({
      text: 'Valid edit text',
      authorName: 'Impostor',
    })
  );

  // Author CAN update text
  await assertSucceeds(
    bobDb.collection('problems').doc('p1').collection('messages').doc('msg-bob').update({
      text: 'Edited message text by Bob',
    })
  );
});

test('admin can hide any message, non-admin cannot hide', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Problem',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      commentCount: 1,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
    await context.firestore().collection('problems').doc('p1').collection('messages').doc('msg-bob').set({
      text: 'Inappropriate message',
      authorUid: 'bob',
      authorName: 'Bob Builder',
      createdAt: new Date(),
      hidden: false,
    });
    await context.firestore().collection('admins').doc('admin-user').set({ role: 'admin' });
  });

  const aliceDb = testEnv.authenticatedContext('alice').firestore();
  // Non-admin (even problem author) cannot hide another person's message
  await assertFails(
    aliceDb.collection('problems').doc('p1').collection('messages').doc('msg-bob').update({
      hidden: true,
    })
  );

  // Admin can hide message
  const adminDb = testEnv.authenticatedContext('admin-user').firestore();
  await assertSucceeds(
    adminDb.collection('problems').doc('p1').collection('messages').doc('msg-bob').update({
      hidden: true,
    })
  );
});

test('author or admin can delete message, non-author cannot', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Problem',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      commentCount: 1,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
    await context.firestore().collection('problems').doc('p1').collection('messages').doc('msg-bob').set({
      text: 'Message by Bob',
      authorUid: 'bob',
      authorName: 'Bob Builder',
      createdAt: new Date(),
      hidden: false,
    });
    await context.firestore().collection('admins').doc('admin-user').set({ role: 'admin' });
  });

  const charlieDb = testEnv.authenticatedContext('charlie').firestore();
  await assertFails(
    charlieDb.collection('problems').doc('p1').collection('messages').doc('msg-bob').delete()
  );

  const bobDb = testEnv.authenticatedContext('bob', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();
  await assertSucceeds(
    bobDb.collection('problems').doc('p1').collection('messages').doc('msg-bob').delete()
  );
});

test('rate limiting: user cannot write a message within 10 seconds of previous message', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Problem',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      commentCount: 0,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
    // Set userStats to just now
    await context.firestore().collection('userStats').doc('bob').set({
      lastMessageAt: new Date(),
    });
  });

  const bobDb = testEnv.authenticatedContext('bob', {
    firebase: { sign_in_provider: 'google.com' },
  }).firestore();

  // Trying to post right away (<10s) must fail
  const batch = bobDb.batch();
  batch.set(bobDb.collection('problems').doc('p1').collection('messages').doc('msg-too-fast'), {
    text: 'Too fast message',
    authorUid: 'bob',
    authorName: 'Bob Builder',
    createdAt: new Date(),
    hidden: false,
  });
  batch.update(bobDb.collection('problems').doc('p1'), {
    commentCount: 1,
  });
  batch.set(bobDb.collection('userStats').doc('bob'), {
    lastMessageAt: new Date(),
  }, { merge: true });

  await assertFails(batch.commit());
});

test('user can report a message and cannot report twice', async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('problems').doc('p1').set({
      text: 'Problem',
      tag: 'Websites',
      authorUid: 'alice',
      status: 'open',
      meTooCount: 0,
      commentCount: 1,
      reportCount: 0,
      hidden: false,
      createdAt: new Date(),
    });
    await context.firestore().collection('problems').doc('p1').collection('messages').doc('msg-1').set({
      text: 'Spam message',
      authorUid: 'spammer',
      authorName: 'Spam',
      createdAt: new Date(),
      hidden: false,
      reportCount: 0,
    });
  });

  const userDb = testEnv.authenticatedContext('reporter1').firestore();

  // First report succeeds
  const batch1 = userDb.batch();
  batch1.set(userDb.collection('problems').doc('p1').collection('messages').doc('msg-1').collection('reports').doc('reporter1'), {
    createdAt: new Date(),
  });
  batch1.update(userDb.collection('problems').doc('p1').collection('messages').doc('msg-1'), {
    reportCount: 1,
  });
  await assertSucceeds(batch1.commit());

  // Second report fails (reports/reporter1 already exists and update is denied)
  const batch2 = userDb.batch();
  batch2.set(userDb.collection('problems').doc('p1').collection('messages').doc('msg-1').collection('reports').doc('reporter1'), {
    createdAt: new Date(),
  });
  batch2.update(userDb.collection('problems').doc('p1').collection('messages').doc('msg-1'), {
    reportCount: 2,
  });
  await assertFails(batch2.commit());
});



