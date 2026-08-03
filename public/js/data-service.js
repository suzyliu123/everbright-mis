/**
 * Firestore Data Service — All DB queries wrapped here
 * Handles role-based filtering and pagination
 */

const DataService = {
  // ============ ACTIVITIES ============
  async getActivities(filters = {}) {
    let query = db.collection('activities');
    if (filters.status) query = query.where('status', '==', filters.status);
    if (filters.category) query = query.where('category', '==', filters.category);
    query = query.orderBy('startDate', 'desc');

    try {
      const snap = await query.get();
      const acts = [];
      snap.forEach(doc => acts.push({ id: doc.id, ...doc.data() }));
      return acts;
    } catch (err) {
      if (err.message && err.message.includes('requires an index')) {
        console.warn('[Firestore] Missing composite index for activities, using client-side fallback');
        let fallbackQuery = db.collection('activities');
        if (filters.status) fallbackQuery = fallbackQuery.where('status', '==', filters.status);
        if (filters.category) fallbackQuery = fallbackQuery.where('category', '==', filters.category);
        const snap2 = await fallbackQuery.get();
        const acts = [];
        snap2.forEach(doc => acts.push({ id: doc.id, ...doc.data() }));
        acts.sort((a, b) => {
          const da = a.startDate || '';
          const db = b.startDate || '';
          return db.localeCompare(da);
        });
        return acts;
      }
      throw err;
    }
  },

  async getActivity(actId) {
    const doc = await db.collection('activities').doc(actId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async createActivity(data) {
    const ref = db.collection('activities').doc(); // auto-id
    const now = new Date().toISOString();
    const activity = {
      ...data,
      createdAt: now,
      updatedAt: now,
      settlementAmount: 0,
      leadCount: 0,
      weChatCount: 0
    };
    await ref.set(activity);
    return { id: ref.id, ...activity };
  },

  async updateActivity(actId, data) {
    await db.collection('activities').doc(actId).update({
      ...data,
      updatedAt: new Date().toISOString()
    });
  },

  // ============ DELETE (Management only) ============
  // Per product decision: deleting an activity KEEPS its Leads and WeChat
  // records (they become unassigned) — no lead data is lost.
  async deleteActivity(actId) {
    await db.collection('activities').doc(actId).delete();
  },

  async deleteActivities(actIds) {
    for (const id of actIds) {
      await this.deleteActivity(id);
    }
  },

  // Deleting an adviser:
  //  - removes the UID from every activity's assignedAdvisers array (cleanup)
  //  - deletes the user document (security rules then block app access)
  //  - KEEPS their Leads and WeChat records (shown as unassigned)
  // Note: the Firebase Auth account itself is NOT removed here (needs Admin SDK /
  // Console), but without a users doc the account has no role and cannot use the app.
  async deleteAdviser(uid) {
    const acts = await this.getActivities();
    for (const a of acts) {
      const arr = a.assignedAdvisers || [];
      if (arr.includes(uid)) {
        await this.updateActivity(a.id, { assignedAdvisers: arr.filter(x => x !== uid) });
      }
    }
    await db.collection('users').doc(uid).delete();
  },

  async deleteAdvisers(uids) {
    for (const uid of uids) {
      await this.deleteAdviser(uid);
    }
  },

  // ============ LEADS ============
  async getLeads(filters = {}, pageSize = 50, startAfterDoc = null) {
    let query = db.collection('leads');

    // Role-based filtering: advisers only see their own leads
    if (Auth.isAdviser()) {
      query = query.where('assignedAdviser', '==', Auth.currentUser.uid);
    }

    if (filters.activityId) query = query.where('activityId', '==', filters.activityId);
    if (filters.status) query = query.where('status', '==', filters.status);
    if (filters.interest) query = query.where('interest', '==', filters.interest);
    if (filters.assignedAdviser) query = query.where('assignedAdviser', '==', filters.assignedAdviser);
    if (filters.dateFrom) query = query.where('firstTouch.date', '>=', filters.dateFrom);
    if (filters.dateTo) query = query.where('firstTouch.date', '<=', filters.dateTo);

    query = query.orderBy('firstTouch.date', 'desc').limit(pageSize);
    if (startAfterDoc) query = query.startAfter(startAfterDoc);

    try {
      const snap = await query.get();
      const leads = [];
      snap.forEach(doc => leads.push({ id: doc.id, ...doc.data() }));
      return { leads, lastDoc: snap.docs[snap.docs.length - 1] || null, hasMore: snap.docs.length === pageSize };
    } catch (err) {
      // Fallback: if composite index is missing, fetch without orderBy and sort in client
      if (err.message && err.message.includes('requires an index')) {
        console.warn('[Firestore] Missing composite index, using client-side fallback:', err.message);
        let fallbackQuery = db.collection('leads');
        if (Auth.isAdviser()) {
          fallbackQuery = fallbackQuery.where('assignedAdviser', '==', Auth.currentUser.uid);
        }
        if (filters.activityId) fallbackQuery = fallbackQuery.where('activityId', '==', filters.activityId);
        if (filters.status) fallbackQuery = fallbackQuery.where('status', '==', filters.status);
        if (filters.interest) fallbackQuery = fallbackQuery.where('interest', '==', filters.interest);
        if (filters.assignedAdviser) fallbackQuery = fallbackQuery.where('assignedAdviser', '==', filters.assignedAdviser);
        fallbackQuery = fallbackQuery.limit(pageSize * 2); // fetch more since we sort client-side
        const snap2 = await fallbackQuery.get();
        let leads = [];
        snap2.forEach(doc => leads.push({ id: doc.id, ...doc.data() }));
        // Client-side sort by firstTouch.date desc
        leads.sort((a, b) => {
          const da = a.firstTouch?.date || '';
          const db = b.firstTouch?.date || '';
          return db.localeCompare(da);
        });
        leads = leads.slice(0, pageSize);
        return { leads, lastDoc: null, hasMore: false };
      }
      throw err;
    }
  },

  async getLead(leadId) {
    const doc = await db.collection('leads').doc(leadId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async updateLeadStatus(leadId, status) {
    await db.collection('leads').doc(leadId).update({
      status,
      updatedAt: new Date().toISOString()
    });
  },

  // Adviser manually links a lead (e.g. one captured via QR code) to an activity.
  // Appends a note so the attribution change is auditable. Pass actId = null to unassign.
  async assignLeadToActivity(leadId, actId, note) {
    const lead = await this.getLead(leadId);
    const notes = lead.notes || [];
    notes.push({
      date: new Date().toISOString().slice(0, 10),
      author: Auth.displayName(),
      content: note
    });
    await db.collection('leads').doc(leadId).update({
      activityId: actId,
      notes: notes,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async getLeadsByActivity(actId) {
    return (await this.getLeads({ activityId: actId }, 200)).leads;
  },

  async getLeadsByAdviser(advId) {
    return (await this.getLeads({ assignedAdviser: advId }, 200)).leads;
  },

  // ============ WECHAT RECORDS ============
  async getWeChatRecords(filters = {}) {
    let query = db.collection('wechat_records');
    if (filters.activityId) query = query.where('activityId', '==', filters.activityId);
    if (filters.dateFrom) query = query.where('dateAdded', '>=', filters.dateFrom);
    if (filters.dateTo) query = query.where('dateAdded', '<=', filters.dateTo);
    query = query.orderBy('dateAdded', 'desc');

    try {
      const snap = await query.get();
      const records = [];
      snap.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
      return records;
    } catch (err) {
      if (err.message && err.message.includes('requires an index')) {
        console.warn('[Firestore] Missing composite index for wechat_records, using client-side fallback');
        let fallbackQuery = db.collection('wechat_records');
        if (filters.activityId) fallbackQuery = fallbackQuery.where('activityId', '==', filters.activityId);
        if (filters.dateFrom) fallbackQuery = fallbackQuery.where('dateAdded', '>=', filters.dateFrom);
        if (filters.dateTo) fallbackQuery = fallbackQuery.where('dateAdded', '<=', filters.dateTo);
        const snap2 = await fallbackQuery.get();
        const records = [];
        snap2.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
        records.sort((a, b) => {
          const da = a.dateAdded || '';
          const db = b.dateAdded || '';
          return db.localeCompare(da);
        });
        return records;
      }
      throw err;
    }
  },

  async getTotalWeChatByActivity(actId) {
    const records = await this.getWeChatRecords({ activityId: actId });
    return records.reduce((sum, r) => sum + (r.count || 0), 0);
  },

  async addWeChatRecord(data) {
    const ref = db.collection('wechat_records').doc();
    const rec = {
      ...data,
      createdAt: new Date().toISOString()
    };
    await ref.set(rec);
    return { id: ref.id, ...rec };
  },

  // ============ USERS / ADVISERS ============
  async getAdvisers(filters = {}) {
    let query = db.collection('users');
    if (filters.status) query = query.where('status', '==', filters.status);
    const snap = await query.get();
    const users = [];
    snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
    return users.filter(u => u.role === 'adviser');
  },

  async getUser(uid) {
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  // ============ STATS HELPERS ============
  /** Compute stats for a list of leads */
  computeLeadStats(leads) {
    const stats = {
      total: leads.length,
      new: 0, active: 0, submitted: 0, settled: 0, lost: 0,
      settlementAmount: 0, totalPremium: 0,
      loan: 0, insurance: 0, both: 0
    };

    for (const l of leads) {
      stats[l.status] = (stats[l.status] || 0) + 1;
      if (l.status === 'settled' || l.status === 'submitted') {
        stats.settlementAmount += (l.settlementAmount || 0);
        stats.totalPremium += (l.annualPremium || 0);
      }
      if (l.interest === 'Loan') stats.loan++;
      else if (l.interest === 'Insurance') stats.insurance++;
      else if (l.interest === 'Both') stats.both++;
    }
    stats.conversionRate = leads.length > 0 ? ((stats.settled / leads.length) * 100).toFixed(1) : '0.0';
    return stats;
  }
};
