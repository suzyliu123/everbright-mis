const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

// ============ ADMIN: Set User Role ============
exports.setUserRole = functions.https.onCall(async (data, context) => {
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  const { uid, role } = data;
  if (!['admin', 'management', 'adviser'].includes(role)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid role');
  }
  await auth.setCustomUserClaims(uid, { role });
  // Update Firestore user doc
  await db.collection('users').doc(uid).update({ role, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { success: true };
});

// ============ DASHBOARD: Export CSV ============
exports.exportLeadsCSV = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('permission-denied', 'Auth required');

  const { activityId, status, dateFrom, dateTo } = data || {};
  let query = db.collection('leads');

  if (activityId) query = query.where('activityId', '==', activityId);
  if (status) query = query.where('status', '==', status);
  if (dateFrom) query = query.where('firstTouch.date', '>=', dateFrom);
  if (dateTo) query = query.where('firstTouch.date', '<=', dateTo);

  // Apply role-based filtering
  if (context.auth.token.role === 'adviser') {
    query = query.where('assignedAdviser', '==', context.auth.uid);
  }

  const snapshot = await query.get();
  const rows = [];
  snapshot.forEach(doc => {
    const d = doc.data();
    rows.push({
      id: doc.id,
      name: d.name || '',
      email: d.email || '',
      phone: d.phone || '',
      interest: d.interest || '',
      status: d.status || 'new',
      activityId: d.activityId || '',
      sourceChannel: d.firstTouch?.channel || '',
      sourceDate: d.firstTouch?.date || '',
      settlementAmount: d.settlementAmount || 0,
      annualPremium: d.annualPremium || 0,
      notes: d.notes || ''
    });
  });

  return { rows, total: rows.length, exportedAt: new Date().toISOString() };
});

// ============ AUTO: New User Hook (set default role) ============
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  // Default role: adviser (no one self-registers as admin)
  const defaultRole = 'adviser';
  await auth.setCustomUserClaims(user.uid, { role: defaultRole });

  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || '',
    role: defaultRole,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
});

// ============ DAILY BACKUP: Export Firestore to Storage ============
exports.dailyBackup = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const collections = ['users', 'activities', 'leads', 'wechat_records'];
  const backupData = {};

  for (const col of collections) {
    const snapshot = await db.collection(col).get();
    backupData[col] = [];
    snapshot.forEach(doc => {
      backupData[col].push({ id: doc.id, ...doc.data() });
    });
  }

  const bucket = admin.storage().bucket();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = bucket.file(`backups/backup-${timestamp}.json`);

  await file.save(JSON.stringify(backupData, null, 2), {
    contentType: 'application/json',
    metadata: { firebaseStorageDownloadTokens: Date.now().toString() }
  });

  console.log(`Backup completed: ${timestamp}, ${Object.values(backupData).reduce((s, c) => s + c.length, 0)} total docs`);
  return null;
});
