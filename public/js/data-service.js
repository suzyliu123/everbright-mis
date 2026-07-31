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
