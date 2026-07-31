const admin = require('firebase-admin');

// Initialize with emulator
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

admin.initializeApp({ projectId: 'everbright-mis-dev' });
const db = admin.firestore();
const auth = admin.auth();

async function seed() {
  console.log('🌱 Seeding EverBright MIS database...\n');

  // ================================================================
  // COLLECTION: users (Advisers + Management)
  // Document: /users/{uid}
  // Fields: uid, email, displayName, role, status, createdAt, updatedAt
  // ================================================================
  const users = [
    { uid: 'admin-001', email: 'admin@everbright.co.nz', displayName: 'Admin', role: 'admin', status: 'active' },
    { uid: 'mgmt-001', email: 'manager@everbright.co.nz', displayName: 'Sarah Chen', role: 'management', status: 'active' },
    { uid: 'adv-001', email: 'james@everbright.co.nz', displayName: 'James Wilson', role: 'adviser', status: 'active' },
    { uid: 'adv-002', email: 'linda@everbright.co.nz', displayName: 'Linda Zhang', role: 'adviser', status: 'active' },
    { uid: 'adv-003', email: 'mike@everbright.co.nz', displayName: 'Mike Taylor', role: 'adviser', status: 'active' },
    { uid: 'adv-004', email: 'priya@everbright.co.nz', displayName: 'Priya Patel', role: 'adviser', status: 'active' },
    { uid: 'adv-005', email: 'david@everbright.co.nz', displayName: 'David Lee', role: 'adviser', status: 'active' },
  ];

  for (const u of users) {
    await auth.createUser({ uid: u.uid, email: u.email, displayName: u.displayName, password: 'EverBright2026!' });
    await auth.setCustomUserClaims(u.uid, { role: u.role });
    await db.collection('users').doc(u.uid).set({
      ...u, createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  console.log(`✅ Created ${users.length} users`);

  // ================================================================
  // COLLECTION: activities
  // Document: /activities/{actId}
  // Fields: id, name, type, category, channel, startDate, endDate,
  //         budget, status, description, assignedAdvisers[], weChatAdded
  //         createdAt, updatedAt
  // ================================================================
  const activities = [
    {
      id: 'act-001', name: 'Auckland Property Expo 2026', type: 'expo',
      category: 'Property', channel: 'Offline',
      startDate: '2026-03-15', endDate: '2026-03-16',
      budget: 8500, status: 'completed', description: 'Annual property investment expo at Auckland Showgrounds',
      assignedAdvisers: ['adv-001', 'adv-002', 'adv-003'], weChatAdded: 68,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      id: 'act-002', name: 'First Home Buyer Webinar', type: 'webinar',
      category: 'Education', channel: 'Online',
      startDate: '2026-04-08', endDate: '2026-04-08',
      budget: 1200, status: 'completed', description: 'Zoom webinar for first home buyers: deposit, grants, process',
      assignedAdvisers: ['adv-001', 'adv-004'], weChatAdded: 42,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      id: 'act-003', name: 'Facebook Lead Gen Campaign Q2', type: 'social',
      category: 'Digital Marketing', channel: 'Facebook',
      startDate: '2026-05-01', endDate: '2026-06-30',
      budget: 5000, status: 'completed', description: 'Facebook lead form ads targeting Auckland 25-45 homeowners',
      assignedAdvisers: ['adv-002', 'adv-005'], weChatAdded: 31,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      id: 'act-004', name: 'Insurance Awareness Seminar', type: 'seminar',
      category: 'Insurance', channel: 'Offline',
      startDate: '2026-06-12', endDate: '2026-06-12',
      budget: 3000, status: 'completed', description: 'Life & income protection insurance seminar at Takapuna',
      assignedAdvisers: ['adv-003', 'adv-004'], weChatAdded: 25,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    {
      id: 'act-005', name: 'Google Ads Spring Campaign', type: 'search',
      category: 'Digital Marketing', channel: 'Google',
      startDate: '2026-07-01', endDate: '2026-09-30',
      budget: 7000, status: 'active', description: 'Google Search & Display ads for mortgage refinance keywords',
      assignedAdvisers: ['adv-001', 'adv-002', 'adv-003', 'adv-004', 'adv-005'], weChatAdded: 18,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
  ];

  const batch = db.batch();
  for (const a of activities) {
    batch.set(db.collection('activities').doc(a.id), a);
  }
  await batch.commit();
  console.log(`✅ Created ${activities.length} activities`);

  // ================================================================
  // COLLECTION: leads
  // Document: /leads/{leadId}
  // Fields: id, name, email, phone, interest (Loan/Insurance/Both),
  //         status (new/active/submitted/settled/lost),
  //         activityId, assignedAdviser,
  //         firstTouch: { channel, date, method },
  //         settlementAmount, annualPremium,
  //         loanType, notes, createdAt, updatedAt
  // ================================================================
  const leads = [
    // === Activity 001: Auckland Property Expo ===
    { id:'L001', name:'Alice Wang', email:'alice@email.co.nz', phone:'0211234567', interest:'Loan', status:'settled',
      activityId:'act-001', assignedAdviser:'adv-001',
      firstTouch:{ channel:'Expo Booth A', date:'2026-03-15', method:'QR Code' },
      settlementAmount:1250000, annualPremium:0, loanType:'First Home', notes:'Settled June 2026' },

    { id:'L002', name:'Bob Chen', email:'bob@email.co.nz', phone:'0212345678', interest:'Both', status:'submitted',
      activityId:'act-001', assignedAdviser:'adv-001',
      firstTouch:{ channel:'Expo Booth A', date:'2026-03-15', method:'Manual Entry' },
      settlementAmount:0, annualPremium:2400, loanType:'Refinance', notes:'Awaiting bank approval' },

    { id:'L003', name:'Cathy Liu', email:'cathy@email.co.nz', phone:'0213456789', interest:'Loan', status:'active',
      activityId:'act-001', assignedAdviser:'adv-002',
      firstTouch:{ channel:'Expo Booth B', date:'2026-03-16', method:'QR Code' },
      settlementAmount:0, annualPremium:0, loanType:'First Home', notes:'Documents collected' },

    { id:'L004', name:'Daniel Kim', email:'daniel@email.co.nz', phone:'0214567890', interest:'Insurance', status:'settled',
      activityId:'act-001', assignedAdviser:'adv-003',
      firstTouch:{ channel:'Expo Booth C', date:'2026-03-15', method:'QR Code' },
      settlementAmount:0, annualPremium:3800, loanType:'', notes:'Income protection policy' },

    { id:'L005', name:'Emma Wilson', email:'emma@email.co.nz', phone:'0215678901', interest:'Both', status:'lost',
      activityId:'act-001', assignedAdviser:'adv-002',
      firstTouch:{ channel:'Expo Booth B', date:'2026-03-16', method:'QR Code' },
      settlementAmount:0, annualPremium:0, loanType:'Investment', notes:'Went with another broker' },

    // === Activity 002: First Home Buyer Webinar ===
    { id:'L006', name:'Frank Zhang', email:'frank@email.co.nz', phone:'0216789012', interest:'Loan', status:'settled',
      activityId:'act-002', assignedAdviser:'adv-001',
      firstTouch:{ channel:'Webinar Link', date:'2026-04-08', method:'Registration' },
      settlementAmount:980000, annualPremium:0, loanType:'First Home', notes:'Kainga Ora First Home Grant' },

    { id:'L007', name:'Grace Patel', email:'grace@email.co.nz', phone:'0217890123', interest:'Loan', status:'submitted',
      activityId:'act-002', assignedAdviser:'adv-004',
      firstTouch:{ channel:'Webinar Link', date:'2026-04-08', method:'Registration' },
      settlementAmount:0, annualPremium:0, loanType:'First Home', notes:'Pre-approval done' },

    { id:'L008', name:'Henry Brown', email:'henry@email.co.nz', phone:'0218901234', interest:'Both', status:'active',
      activityId:'act-002', assignedAdviser:'adv-001',
      firstTouch:{ channel:'Webinar Link', date:'2026-04-08', method:'Registration' },
      settlementAmount:0, annualPremium:0, loanType:'First Home', notes:'Needs insurance quote too' },

    // === Activity 003: Facebook Campaign Q2 ===
    { id:'L009', name:'Iris Wang', email:'iris@email.co.nz', phone:'0219012345', interest:'Loan', status:'settled',
      activityId:'act-003', assignedAdviser:'adv-002',
      firstTouch:{ channel:'Facebook Ad', date:'2026-05-12', method:'Form Fill' },
      settlementAmount:1450000, annualPremium:0, loanType:'Refinance', notes:'Settled July 2026' },

    { id:'L010', name:'Jack Li', email:'jack@email.co.nz', phone:'0210123456', interest:'Insurance', status:'active',
      activityId:'act-003', assignedAdviser:'adv-005',
      firstTouch:{ channel:'Facebook Ad', date:'2026-05-20', method:'Form Fill' },
      settlementAmount:0, annualPremium:0, loanType:'', notes:'Life insurance quote requested' },

    { id:'L011', name:'Kate Evans', email:'kate@email.co.nz', phone:'0211111111', interest:'Loan', status:'new',
      activityId:'act-003', assignedAdviser:'adv-002',
      firstTouch:{ channel:'Facebook Ad', date:'2026-06-25', method:'Form Fill' },
      settlementAmount:0, annualPremium:0, loanType:'First Home', notes:'New lead, not contacted yet' },

    // === Activity 004: Insurance Awareness Seminar ===
    { id:'L012', name:'Leo Tan', email:'leo@email.co.nz', phone:'0212222222', interest:'Insurance', status:'settled',
      activityId:'act-004', assignedAdviser:'adv-003',
      firstTouch:{ channel:'Seminar Venue', date:'2026-06-12', method:'QR Code' },
      settlementAmount:0, annualPremium:5100, loanType:'', notes:'Life + Income protection bundle' },

    { id:'L013', name:'Mia Johnson', email:'mia@email.co.nz', phone:'0213333333', interest:'Both', status:'active',
      activityId:'act-004', assignedAdviser:'adv-004',
      firstTouch:{ channel:'Seminar Venue', date:'2026-06-12', method:'Manual Entry' },
      settlementAmount:0, annualPremium:0, loanType:'Refinance', notes:'Needs both mortgage and insurance' },

    // === Activity 005: Google Ads Spring Campaign ===
    { id:'L014', name:'Nina Kumar', email:'nina@email.co.nz', phone:'0214444444', interest:'Loan', status:'active',
      activityId:'act-005', assignedAdviser:'adv-001',
      firstTouch:{ channel:'Google Search', date:'2026-07-05', method:'Landing Page' },
      settlementAmount:0, annualPremium:0, loanType:'Investment', notes:'Investment property buyer' },

    { id:'L015', name:'Oscar White', email:'oscar@email.co.nz', phone:'0215555555', interest:'Both', status:'new',
      activityId:'act-005', assignedAdviser:'adv-003',
      firstTouch:{ channel:'Google Display', date:'2026-07-18', method:'Landing Page' },
      settlementAmount:0, annualPremium:0, loanType:'First Home', notes:'Just enquired' },
  ];

  // Batch leads in groups of 500 (Firestore batch limit)
  for (let i = 0; i < leads.length; i += 400) {
    const batchL = db.batch();
    const chunk = leads.slice(i, i + 400);
    for (const l of chunk) {
      batchL.set(db.collection('leads').doc(l.id), {
        ...l,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    await batchL.commit();
  }
  console.log(`✅ Created ${leads.length} leads`);

  // ================================================================
  // COLLECTION: wechat_records
  // Document: /wechat_records/{recId}
  // Fields: id, activityId, dateAdded, count, source, notes
  // ================================================================
  const wechatRecords = [
    { id:'wx-001', activityId:'act-001', dateAdded:'2026-03-15', count:42, source:'QR Code', notes:'Day 1 scans' },
    { id:'wx-002', activityId:'act-001', dateAdded:'2026-03-16', count:26, source:'QR Code', notes:'Day 2 scans' },
    { id:'wx-003', activityId:'act-002', dateAdded:'2026-04-08', count:42, source:'Webinar Link', notes:'Registration follow-ups' },
    { id:'wx-004', activityId:'act-003', dateAdded:'2026-05-15', count:18, source:'Facebook', notes:'Mid campaign check' },
    { id:'wx-005', activityId:'act-003', dateAdded:'2026-06-15', count:13, source:'Facebook', notes:'End campaign' },
    { id:'wx-006', activityId:'act-004', dateAdded:'2026-06-12', count:25, source:'QR Code', notes:'Seminar attendees' },
    { id:'wx-007', activityId:'act-005', dateAdded:'2026-07-15', count:18, source:'Landing Page', notes:'Ongoing' },
  ];

  const batchW = db.batch();
  for (const w of wechatRecords) {
    batchW.set(db.collection('wechat_records').doc(w.id), {
      ...w, createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  await batchW.commit();
  console.log(`✅ Created ${wechatRecords.length} weChat records`);

  // ================================================================
  // COLLECTION: settings
  // ================================================================
  await db.collection('settings').doc('company').set({
    name: 'EverBright Finance',
    nameCN: '宏碩資本',
    phone: '0800 123 456',
    email: 'info@everbright.co.nz',
    website: 'https://everbright.co.nz',
    address: 'Level 5, 123 Queen Street, Auckland CBD'
  });

  console.log('\n🎉 Seed complete! Ready to develop.');
  console.log('\n📋 Test accounts (password: EverBright2026!):');
  console.log('   admin@everbright.co.nz    → Admin (full access)');
  console.log('   manager@everbright.co.nz  → Management (dashboard + reports)');
  console.log('   james@everbright.co.nz     → Adviser (own leads only)');
  console.log('   linda@everbright.co.nz    → Adviser');
  console.log('   mike@everbright.co.nz    → Adviser (insurance focus)');
  console.log('   priya@everbright.co.nz    → Adviser');
  console.log('   david@everbright.co.nz    → Adviser');
}

seed()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
