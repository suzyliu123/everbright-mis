/**
 * Adviser Portal Views — Completely aligned with prototype index.html
 * Mobile-first UI, 5-item bottom nav, all pages matching original design
 */

// ============ ADVISER BOTTOM NAV (5 items) ============
function AdvBottomNav() {
  const route = Router.currentRoute || 'adviser-dashboard';
  // Map route to nav key
  const navKey = route === 'adviser-dashboard' ? 'adviser-home'
    : route === 'adviser-activities' ? 'adviser-activities'
    : route === 'adviser-add-lead' ? 'adviser-add-lead'
    : route === 'adviser-activity-leads' ? 'adviser-activities'
    : route === 'adviser-qr' ? 'adviser-qr'
    : route === 'adviser-profile' ? 'adviser-profile'
    : route === 'lead-detail' ? 'adviser-leads'
    : route === 'adviser-leads' ? 'adviser-leads'
    : '';

  return `
  <nav class="bnav">
    <div class="bnav-item ${navKey === 'adviser-home' ? 'active' : ''}" onclick="Router.navigate('adviser-dashboard')">
      <span class="ic">&#128202;</span>Home
    </div>
    <div class="bnav-item ${navKey === 'adviser-activities' ? 'active' : ''}" onclick="Router.navigate('adviser-activities')">
      <span class="ic">&#128197;</span>Activities
    </div>
    <div class="bnav-item add-btn" onclick="Router.navigate('adviser-add-lead')">
      <div class="ic">+</div>
    </div>
    <div class="bnav-item ${navKey === 'adviser-qr' ? 'active' : ''}" onclick="Router.navigate('adviser-qr')">
      <span class="ic">&#128279;</span>QR Code
    </div>
    <div class="bnav-item ${navKey === 'adviser-profile' ? 'active' : ''}" onclick="Router.navigate('adviser-profile')">
      <span class="ic">&#128100;</span>Profile
    </div>
  </nav>`;
}

// ============ ADVISER HEADER ============
function adviserHeader(title, showBack) {
  let left = `<div class="flex aic g2">`;
  if (showBack) left += `<span class="back" onclick="Router.goBack()" style="font-size:14px;color:var(--primary);cursor:pointer">&#8592; Back</span>`;
  left += `<img class="header-logo-sm" src="${LOGO_ICON}" alt=""><h1 style="font-size:15px">${title}</h1></div>`;
  return `<div class="header">${left}</div>`;
}

// ============ ADVISER DASHBOARD (Home) ============
async function renderAdviserDashboard() {
  const uid = Auth.currentUser.uid;
  const { leads } = await DataService.getLeads({}, 200);
  const myLeads = leads || [];
  const submitted = myLeads.filter(l => l.status === 'submitted').length;
  const settled = myLeads.filter(l => l.status === 'settled').length;

  // Get my activities
  const allActs = await DataService.getActivities({});
  const myActs = allActs.filter(a => {
    const advisers = a.assignedAdvisers || [];
    return advisers.includes(uid) && (a.status === 'active' || a.status === 'planned');
  });

  // Recent leads
  const recent = myLeads.slice(0, 6);

  const firstName = Auth.displayName().split(' ')[0];

  let html = adviserHeader(`Hi, ${firstName}`) +
  `<div class="content">
  <div class="stat-grid">
    <div class="stat-card"><div class="label">My Leads</div><div class="value">${myLeads.length}</div></div>
    <div class="stat-card"><div class="label">Submitted</div><div class="value" style="color:var(--purple)">${submitted}</div></div>
    <div class="stat-card"><div class="label">Settled</div><div class="value" style="color:var(--success)">${settled}</div></div>
  </div>`;

  // My Activities section
  if (myActs.length > 0) {
    html += `<div class="card">
    <div class="section-title">My Activities</div>`;
    for (const a of myActs) {
      const actLeads = myLeads.filter(l => l.activityId === a.id);
      const settledCount = actLeads.filter(l => l.status === 'settled').length;
      const wc = await DataService.getTotalWeChatByActivity(a.id);
      const typeLabel = ACT_TYPES[a.type] || a.type || '';
      const dateLabel = a.category === 'event' ? fmtD(a.startDate) : 'Ongoing';
      html += `<div class="li card-tap" onclick="Router.navigate('adviser-activity-leads?id=${a.id}')">
        <div class="av">${(typeLabel || '?')[0]}</div>
        <div class="info"><div class="name">${esc(a.name)}</div><div class="sub">${dateLabel} &middot; ${esc(a.location || 'Digital')}</div></div>
        ${badge(a.category === 'event' ? (a.status === 'active' ? 'blue' : 'gray') : 'blue', a.category === 'event' ? (a.status === 'active' ? 'Upcoming' : 'Planned') : 'Ongoing')}
      </div>`;
    }
    html += `</div>`;
  }

  // Recent Leads section
  html += `<div class="card">
  <div class="section-title">Recent Leads</div>`;
  if (recent.length > 0) {
    for (const l of recent) {
      const st = getStatusInfo(l.status);
      const actName = await getActivityName(l.activityId);
      html += `<div class="li card-tap" onclick="Router.navigate('adviser-lead-detail?id=${l.id}')">
        <div class="av">${init2(l.name || '?')}</div>
        <div class="info"><div class="name">${esc(l.name || '-')}</div><div class="sub">${actName} &middot; ${fmtDS(l.firstTouch?.date || l.createdAt)}</div></div>
        <div class="rt">${badge(st.color, st.label)}</div>
      </div>`;
    }
    html += `<button class="btn btn-ghost mt4" onclick="Router.navigate('adviser-leads')">View All Leads</button>`;
  } else {
    html += `<div class="empty">No leads yet</div>`;
  }
  html += `</div></div>`;

  return html;
}

// ============ ADVISER LEADS LIST (Tabs) ============
async function renderAdviserLeads() {
  const { leads } = await DataService.getLeads({}, 200);
  const myLeads = leads || [];
  const filter = S.leadFilter || 'all';
  const filtered = filter === 'all' ? myLeads : myLeads.filter(l => l.status === filter);

  let html = adviserHeader('My Leads') +
  `<div class="content">
  <div class="tabs">
    <div class="tab ${filter === 'all' ? 'active' : ''}" onclick="S.leadFilter='all';render()">All (${myLeads.length})</div>
    <div class="tab ${filter === 'active' ? 'active' : ''}" onclick="S.leadFilter='active';render()">Active</div>
    <div class="tab ${filter === 'submitted' ? 'active' : ''}" onclick="S.leadFilter='submitted';render()">Submitted</div>
    <div class="tab ${filter === 'settled' ? 'active' : ''}" onclick="S.leadFilter='settled';render()">Settled</div>
    <div class="tab ${filter === 'lost' ? 'active' : ''}" onclick="S.leadFilter='lost';render()">Lost</div>
  </div>`;

  if (filtered.length > 0) {
    for (const l of filtered) {
      const st = getStatusInfo(l.status);
      const actName = await getActivityName(l.activityId);
      html += `<div class="card card-tap" onclick="Router.navigate('adviser-lead-detail?id=${l.id}')">
        <div class="flex jb aic mb2">
          <div class="flex aic g2"><div class="av">${init2(l.name || '?')}</div><div><div class="fs2">${esc(l.name || '-')}</div><div class="ts tg">${actName}</div></div></div>
          <div>${badge(st.color, st.label)}</div>
        </div>
        <div class="flex aic g2">` +
        (l.settlementAmount ? `<span class="chip">${fmtMF(l.settlementAmount)}</span>` : '') +
        (l.annualPremium ? `<span class="chip">API ${fmtMF(l.annualPremium)}/yr</span>` : '') +
        `<span class="chip">${interestLabel(l.interest)}</span>` +
        `</div></div>`;
    }
  } else {
    html += `<div class="empty"><div class="ic">&#9794;</div>No leads in this category</div>`;
  }

  html += `</div>`;
  return html;
}

// ============ ADVISER ADD LEAD ============
async function renderAdviserAddLead() {
  const uid = Auth.currentUser.uid;
  const allActs = await DataService.getActivities({ status: 'active' });
  // Find activities assigned to this adviser that are events
  const myActiveEvents = allActs.filter(a => {
    const advisers = a.assignedAdvisers || [];
    return advisers.includes(uid) && a.category === 'event';
  });

  let sourceOpts;
  if (myActiveEvents.length === 1) {
    sourceOpts = `<input class="fi" value="${esc(myActiveEvents[0].name)}" disabled style="background:var(--g100)" data-actid="${myActiveEvents[0].id}">`;
  } else {
    sourceOpts = `<select class="fs" id="lf-activity"><option value="">— Select activity —</option>` +
      allActs.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('') +
      `</select>`;
  }

  const advName = Auth.displayName();

  return adviserHeader('Add Lead') +
  `<div class="content">
  <div class="card">
    <div class="ts tg mb4">Add a lead in 15 seconds. Fields are point-and-click.</div>
    <div class="fg"><label class="fl">Name *</label><input class="fi" id="lf-name" placeholder="Customer name" autofocus></div>
    <div class="fg"><label class="fl">Phone *</label><input class="fi" id="lf-phone" type="tel" placeholder="+64 21 ..."></div>
    <div class="fg"><label class="fl">WeChat</label><input class="fi" id="lf-wechat" placeholder="WeChat ID (optional)"></div>
  </div>

  <div class="card">
    <div class="fg"><label class="fl">Source Activity</label>${sourceOpts}
    ${myActiveEvents.length === 1 ? '<div class="ts tg mt2">Auto-detected from your active activity</div>' : ''}
    </div>

    <div class="fg"><label class="fl">Interested In</label>
    <div class="seg" id="interest-seg">
      <div class="seg-item active" data-v="Loan" onclick="selSeg(this)">Loan</div>
      <div class="seg-item" data-v="Insurance" onclick="selSeg(this)">Insurance</div>
      <div class="seg-item" data-v="Both" onclick="selSeg(this)">Both</div>
    </div></div>
  </div>

  <div class="card">
    <div class="fg"><label class="fl">Notes (optional)</label><textarea class="ft" id="lf-notes" placeholder="Quick note..."></textarea></div>
  </div>

  <div class="card" style="background:var(--primary-light);border:none">
    <div class="ts tp fb mb2">Assigned to: ${esc(advName)}</div>
    <div class="ts tg">Status will be set to "Active" automatically.</div>
  </div>

  <button class="btn btn-primary" style="font-size:16px;padding:16px" onclick="submitAdviserLead()">Save Lead</button>
  </div>`;
}

function selSeg(el) {
  el.parentElement.querySelectorAll('.seg-item').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
}

async function submitAdviserLead() {
  const name = document.getElementById('lf-name').value.trim();
  const phone = document.getElementById('lf-phone').value.trim();
  const wechat = document.getElementById('lf-wechat').value.trim();
  const notes = document.getElementById('lf-notes').value.trim();

  if (!name) { showToast('Please enter customer name', 'error'); return; }
  if (!phone) { showToast('Please enter phone number', 'error'); return; }

  const interestEl = document.querySelector('#interest-seg .seg-item.active');
  const interest = interestEl ? interestEl.dataset.v : 'Loan';

  // Determine activity and source channel
  let activityId = null;
  let sourceChannel = 'Manual Entry';
  const sourceInput = document.querySelector('#lf-activity');
  const autoInput = document.querySelector('.fi[data-actid]');

  if (autoInput) {
    activityId = autoInput.dataset.actid;
    const act = await DataService.getActivity(activityId);
    sourceChannel = act ? act.name : 'Activity Source';
  } else if (sourceInput && sourceInput.value) {
    activityId = sourceInput.value;
    const act = await DataService.getActivity(activityId);
    sourceChannel = act ? act.name : 'Activity Source';
  }

  const today = new Date().toISOString().slice(0, 10);

  const leadData = {
    name: name,
    phone: phone,
    wechat: wechat || '',
    email: '',
    interest: interest,
    activityId: activityId,
    status: 'active',
    assignedAdviser: Auth.currentUser.uid,
    firstTouch: {
      channel: sourceChannel,
      date: today,
      method: 'Manual Entry'
    },
    touchpoints: [{ channel: sourceChannel, date: today }],
    settlementAmount: 0,
    annualPremium: 0,
    lender: '',
    insurer: '',
    notes: [{
      date: today,
      author: Auth.displayName(),
      content: notes || 'Lead added manually.'
    }],
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection('leads').add(leadData);
    showToast('Lead added successfully!');
    S.leadFilter = 'all';
    Router.navigate('adviser-leads');
  } catch (err) {
    showToast('Failed to add lead: ' + err.message, 'error');
  }
}

// ============ ADVISER LEAD DETAIL ============
async function renderAdviserLeadDetail(leadId) {
  const lead = await DataService.getLead(leadId);
  if (!lead) return `<div class="content"><p>Lead not found</p></div>`;

  const st = getStatusInfo(lead.status);
  const showLoan = lead.interest === 'Loan' || lead.interest === 'Both';
  const showIns = lead.interest === 'Insurance' || lead.interest === 'Both';
  const actName = await getActivityName(lead.activityId);

  // Touchpoints
  let touchpointsHtml = '';
  if (lead.touchpoints && lead.touchpoints.length > 1) {
    touchpointsHtml = '<div class="divider" style="background:var(--primary)"></div>' +
      '<div class="ts tg mb2">All touchpoints (' + lead.touchpoints.length + ')</div>' +
      '<div class="flex" style="gap:6px;flex-wrap:wrap">' +
      lead.touchpoints.map(tp => '<span class="chip" style="background:var(--white);color:var(--primary)">' + esc(tp.channel) + ' &middot; ' + fmtDS(tp.date) + '</span>').join('') +
      '</div>';
  }

  // Settlement section
  let settlementHtml = '';
  if (lead.status === 'settled' && showLoan) {
    if (lead.settlementAmount) {
      settlementHtml += '<div class="flex jb aic mt2"><span class="ts tg">Settlement</span><span class="fb ts2">' + fmtMF(lead.settlementAmount) + '</span></div>';
    } else {
      settlementHtml += '<div class="flex jb aic mt2"><span class="ts tg">Settlement</span><span class="ts tp" style="cursor:pointer" onclick="openSettlementModal(\'' + lead.id + '\')">+ Add</span></div>';
    }
    if (lead.lender) {
      settlementHtml += '<div class="flex jb aic mt2"><span class="ts tg">Lender</span><span class="fs2">' + esc(lead.lender) + '</span></div>';
    }
  }

  // Insurance section
  let insuranceHtml = '';
  if (lead.status === 'settled' && showIns) {
    if (lead.annualPremium) {
      insuranceHtml += '<div class="flex jb aic mt2"><span class="ts tg">Insurance API</span><span class="fb ts2">' + fmtMF(lead.annualPremium) + '/yr</span></div>';
    }
    if (lead.insurer) {
      insuranceHtml += '<div class="flex jb aic mt2"><span class="ts tg">Insurer</span><span class="fs2">' + esc(lead.insurer) + '</span></div>';
    }
  }

  // WeChat row
  const wechatRow = lead.wechat ? '<div class="flex jb aic mt2"><span class="ts tg">WeChat</span><span class="fs2">' + esc(lead.wechat) + '</span></div>' : '';

  // Notes timeline
  const notesArr = lead.notes || [];
  const notesHtml = notesArr.map((n, i) => {
    const isLast = i === notesArr.length - 1;
    const isDone = lead.status === 'settled' && isLast;
    return '<div class="tl-item ' + (isDone ? 'done' : '') + '"><div class="d">' + fmtD(n.date) + '</div><div class="t">' + esc(n.content) + '</div><div class="by">by ' + esc(n.author || 'Unknown') + '</div></div>';
  }).join('');

  // Settlement button
  const settleBtn = (lead.status === 'settled' && !(lead.settlementAmount || lead.annualPremium))
    ? '<button class="btn btn-success mt2" onclick="openSettlementModal(\'' + lead.id + '\')">Add Settlement Details</button>' : '';

  return adviserHeader(lead.name || 'Lead Detail', true) +
  `<div class="content">
  <div class="card">
    <div class="flex aic g4 mb2">
      <div class="av" style="width:48px;height:48px;font-size:18px">${init2(lead.name || '?')}</div>
      <div class="f1"><div class="fb tl2">${esc(lead.name || '-')}</div><div class="ts tg">${esc(Auth.displayName())}</div></div>
      ${badge(st.color, st.label)}
    </div>
    <div class="divider"></div>
    <div class="flex jb aic"><span class="ts tg">Phone</span><span class="fs2">${esc(lead.phone || '-')}</span></div>
    ${wechatRow}
    <div class="flex jb aic mt2"><span class="ts tg">Interest</span><span class="fs2">${interestLabel(lead.interest)}</span></div>
  </div>

  <div class="card" style="background:var(--primary-light)">
    <div class="flex aic jb">
      <div>
        <div class="ts tg">Source (First Touch)</div>
        <div class="fb mt2">${esc(lead.firstTouch?.channel || '-')}</div>
        <div class="ts tg">${fmtD(lead.firstTouch?.date)} &middot; ${actName}</div>
      </div>
      <div style="font-size:32px">&#128279;</div>
    </div>
    ${touchpointsHtml}
    ${settlementHtml}
    ${insuranceHtml}
    <div class="ts tg mt2" style="font-style:italic">Revenue permanently attributed to: ${esc(lead.firstTouch?.channel || '-')}</div>
  </div>

  <div class="card">
    <div class="section-title">Status</div>
    <div class="status-bar">
      <div class="sb-item ${lead.status === 'active' ? 'active' : ''}" onclick="quickUpdateStatus('${lead.id}','active')">Active</div>
      <div class="sb-item ${lead.status === 'submitted' ? 'active' : ''}" style="${lead.status === 'submitted' ? 'border-color:var(--purple);color:var(--purple);background:#F3F0FF' : ''}" onclick="quickUpdateStatus('${lead.id}','submitted')">Submitted</div>
      <div class="sb-item ${lead.status === 'settled' ? 'active settled' : ''}" onclick="quickUpdateStatus('${lead.id}','settled')">Settled</div>
      <div class="sb-item ${lead.status === 'lost' ? 'active lost' : ''}" onclick="quickUpdateStatus('${lead.id}','lost')">Lost</div>
    </div>
    ${settleBtn}
  </div>

  <div class="card">
    <div class="section-title">Notes (${notesArr.length})</div>
    <div class="tl">${notesHtml}</div>
    <button class="btn btn-outline mt4" onclick="openAddNoteModal('${lead.id}')">+ Add Note</button>
  </div>
  </div>`;
}

async function quickUpdateStatus(leadId, newStatus) {
  try {
    const lead = await DataService.getLead(leadId);
    const updateData = {
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // If settling and no settlement info, open modal
    if (newStatus === 'settled' && lead && !(lead.settlementAmount || lead.annualPremium)) {
      await db.collection('leads').doc(leadId).update(updateData);
      openSettlementModal(leadId);
      return;
    }

    await db.collection('leads').doc(leadId).update(updateData);
    showToast('Status updated to ' + newStatus);
    render();
  } catch (err) {
    showToast('Update failed: ' + err.message, 'error');
  }
}

// ============ ADD NOTE MODAL ============
function openAddNoteModal(leadId) {
  const modal = document.createElement('div');
  modal.className = 'modal-bg';
  modal.id = 'note-modal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-h"></div>
      <div class="modal-title">Add Note</div>
      <div class="fg">
        <textarea class="ft" id="note-content" placeholder="Enter your note..." style="min-height:80px"></textarea>
      </div>
      <div class="flex g2">
        <button class="btn btn-ghost" onclick="closeNoteModal()">Cancel</button>
        <button class="btn btn-primary" onclick="saveNote('${leadId}')">Save Note</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function closeNoteModal() {
  const m = document.getElementById('note-modal');
  if (m) m.remove();
}

async function saveNote(leadId) {
  const content = document.getElementById('note-content').value.trim();
  if (!content) { showToast('Please enter note content', 'error'); return; }

  try {
    const lead = await DataService.getLead(leadId);
    const notes = lead.notes || [];
    notes.push({
      date: new Date().toISOString().slice(0, 10),
      author: Auth.displayName(),
      content: content
    });
    await db.collection('leads').doc(leadId).update({
      notes: notes,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeNoteModal();
    showToast('Note added');
    render();
  } catch (err) {
    showToast('Failed to add note: ' + err.message, 'error');
  }
}

// ============ SETTLEMENT MODAL ============
function openSettlementModal(leadId) {
  const modal = document.createElement('div');
  modal.className = 'modal-bg';
  modal.id = 'settlement-modal';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-h"></div>
      <div class="modal-title">Add Settlement Details</div>
      <div class="fg"><label class="fl">Settlement Amount ($)</label><input class="fi" id="set-amount" type="number" placeholder="850000"></div>
      <div class="fg"><label class="fl">Lender</label><input class="fi" id="set-lender" placeholder="e.g. ANZ"></div>
      <div class="fg"><label class="fl">Annual Premium ($)</label><input class="fi" id="set-premium" type="number" placeholder="3200"></div>
      <div class="fg"><label class="fl">Insurer</label><input class="fi" id="set-insurer" placeholder="e.g. Partners Life"></div>
      <div class="flex g2 mt4">
        <button class="btn btn-ghost" onclick="closeSettlementModal()">Cancel</button>
        <button class="btn btn-success" onclick="saveSettlement('${leadId}')">Save</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

function closeSettlementModal() {
  const m = document.getElementById('settlement-modal');
  if (m) m.remove();
}

async function saveSettlement(leadId) {
  const amount = parseFloat(document.getElementById('set-amount').value) || 0;
  const lender = document.getElementById('set-lender').value.trim();
  const premium = parseFloat(document.getElementById('set-premium').value) || 0;
  const insurer = document.getElementById('set-insurer').value.trim();

  try {
    await db.collection('leads').doc(leadId).update({
      settlementAmount: amount,
      lender: lender,
      annualPremium: premium,
      insurer: insurer,
      status: 'settled',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeSettlementModal();
    showToast('Settlement details saved');
    render();
  } catch (err) {
    showToast('Failed to save: ' + err.message, 'error');
  }
}

// ============ ADVISER ACTIVITIES ============
async function renderAdviserActivities() {
  const uid = Auth.currentUser.uid;
  const allActs = await DataService.getActivities({});
  const myActs = allActs.filter(a => {
    const advisers = a.assignedAdvisers || [];
    return advisers.includes(uid);
  });

  let html = adviserHeader('My Activities') + `<div class="content">`;

  if (myActs.length === 0) {
    html += `<div class="empty">No activities assigned to you yet</div>`;
    html += `</div>`;
    return html;
  }

  for (const a of myActs) {
    const { leads } = await DataService.getLeads({ activityId: a.id }, 200);
    const actLeads = leads || [];
    const settledCount = actLeads.filter(l => l.status === 'settled').length;
    const wc = await DataService.getTotalWeChatByActivity(a.id);
    const typeLabel = ACT_TYPES[a.type] || a.type || '';
    const isCompleted = a.category === 'event' && a.status === 'completed';
    const statusBadge = a.category === 'event'
      ? (a.status === 'completed' ? badge('green', 'Ended') : a.status === 'active' ? badge('blue', 'Upcoming') : badge('gray', 'Planned'))
      : badge('blue', 'Ongoing');

    html += `<div class="card card-tap" onclick="Router.navigate('adviser-activity-leads?id=${a.id}')">
      <div class="flex jb aic mb2"><div class="fs2">${esc(a.name)}</div>${statusBadge}</div>
      <div class="ts tg mb2">${typeLabel} &middot; ${a.category === 'event' ? fmtD(a.startDate) : 'Always live'}</div>
      <div class="flex g4"><div class="f1"><div class="ts tg">Leads</div><div class="fs2">${actLeads.length}</div></div><div class="f1"><div class="ts tg">Settled</div><div class="fs2">${settledCount}</div></div><div class="f1"><div class="ts tg">WeChat</div><div class="fs2">${wc}</div></div></div>
    </div>`;
  }

  html += `</div>`;
  return html;
}

// ============ ADVISER ACTIVITY LEADS ============
async function renderAdviserActivityLeads(actId) {
  const act = await DataService.getActivity(actId);
  if (!act) return `<div class="content"><p>Activity not found</p></div>`;

  const { leads } = await DataService.getLeads({ activityId: actId }, 200);
  const myLeads = leads || [];
  const filter = S.leadFilter || 'all';
  const filtered = filter === 'all' ? myLeads : myLeads.filter(l => l.status === filter);
  const activeCount = myLeads.filter(l => l.status === 'active').length;
  const settledCount = myLeads.filter(l => l.status === 'settled').length;
  const wc = await DataService.getTotalWeChatByActivity(actId);

  let html = adviserHeader(act.name) +
  `<div class="content">
  <div class="card" style="background:var(--primary-light);border:none">
    <div class="flex g4">
      <div class="f1"><div class="ts tg">Lead Count</div><div class="fs2">${myLeads.length}</div></div>
      <div class="f1"><div class="ts tg">Active</div><div class="fs2">${activeCount}</div></div>
      <div class="f1"><div class="ts tg">Settled</div><div class="fs2">${settledCount}</div></div>
    </div>
  </div>

  <div class="card wechat-count-card">
    <div class="flex aic jb">
      <div class="section-title" style="margin:0">My WeChat Added</div>
      <div style="text-align:right">
        <div class="wc-number">${wc}</div>
      </div>
    </div>
    <button class="btn btn-primary btn-sm" style="margin-top:12px;width:100%" onclick="showWeChatLogModal('${actId}')">+ Log WeChat Added</button>
  </div>

  <div class="tabs">
    <div class="tab ${filter === 'all' ? 'active' : ''}" onclick="S.leadFilter='all';render()">All (${myLeads.length})</div>
    <div class="tab ${filter === 'active' ? 'active' : ''}" onclick="S.leadFilter='active';render()">Active</div>
    <div class="tab ${filter === 'submitted' ? 'active' : ''}" onclick="S.leadFilter='submitted';render()">Submitted</div>
    <div class="tab ${filter === 'settled' ? 'active' : ''}" onclick="S.leadFilter='settled';render()">Settled</div>
    <div class="tab ${filter === 'lost' ? 'active' : ''}" onclick="S.leadFilter='lost';render()">Lost</div>
  </div>`;

  if (filtered.length > 0) {
    for (const l of filtered) {
      const st = getStatusInfo(l.status);
      html += `<div class="card card-tap" onclick="Router.navigate('adviser-lead-detail?id=${l.id}')">
        <div class="flex jb aic mb2">
          <div class="flex aic g2"><div class="av">${init2(l.name || '?')}</div><div><div class="fs2">${esc(l.name || '-')}</div><div class="ts tg">${esc(Auth.displayName())}</div></div></div>
          <div>${badge(st.color, st.label)}</div>
        </div>
        <div class="flex aic g2">` +
        (l.settlementAmount ? '<span class="chip">' + fmtMF(l.settlementAmount) + '</span>' : '') +
        (l.annualPremium ? '<span class="chip">Ins ' + fmtMF(l.annualPremium) + '/yr</span>' : '') +
        '<span class="chip">' + interestLabel(l.interest) + '</span>' +
        `</div></div>`;
    }
  } else {
    html += `<div class="empty"><div class="ic">&#128172;</div>No leads for this activity yet</div>`;
  }

  html += `</div>`;
  return html;
}

// ============ WECHAT LOG MODAL (Adviser) ============
function showWeChatLogModal(actId) {
  closeModal();
  const today = new Date().toISOString().slice(0, 10);
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card" onclick="event.stopPropagation()">
      <h3><button class="modal-close" onclick="closeModal()">&times;</button>Log WeChat Added</h3>
      <form onsubmit="event.preventDefault(); saveWeChatLog('${actId}');">
        <div class="form-group">
          <label>How many WeChat contacts added? *</label>
          <input type="number" id="wc-count" placeholder="e.g. 12" min="1" required style="font-size:18px;padding:14px">
        </div>
        <div class="form-group">
          <label>Date</label>
          <input type="date" id="wc-date" value="${today}">
        </div>
        <div class="form-group">
          <label>Note (optional)</label>
          <input type="text" id="wc-note" placeholder="e.g. Scanned at expo booth" style="padding:12px">
        </div>
        <div class="form-actions">
          <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn-save">Save</button>
        </div>
      </form>
    </div>`;
  overlay.addEventListener('click', closeModal);
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('wc-count') && document.getElementById('wc-count').focus(), 50);
}

async function saveWeChatLog(actId) {
  const count = parseInt(document.getElementById('wc-count').value) || 0;
  const dateAdded = document.getElementById('wc-date').value || new Date().toISOString().slice(0, 10);
  const note = document.getElementById('wc-note').value.trim();

  if (count <= 0) {
    showToast('Please enter a valid number', 'error');
    return;
  }

  try {
    await DataService.addWeChatRecord({
      activityId: actId,
      adviserId: Auth.currentUser.uid,
      adviserName: Auth.displayName(),
      count,
      dateAdded,
      source: 'Manual',
      notes: note
    });
    closeModal();
    showToast('WeChat added recorded!', 'success');
    render();
  } catch (err) {
    showToast('Failed to save: ' + err.message, 'error');
  }
}

// ============ ADVISER QR CODE ============
async function renderAdviserQR() {
  const uid = Auth.currentUser.uid;
  const user = Auth.userProfile || {};
  const qrId = user.qrId || uid;
  const base = (location.hostname.endsWith('web.app') || location.hostname.endsWith('firebaseapp.com'))
    ? location.origin
    : 'https://everbright-mis-dev.web.app';
  const link = base + '/capture.html?adv=' + encodeURIComponent(qrId) + '&n=' + encodeURIComponent(Auth.displayName());
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(link);

  return adviserHeader('My QR Code') +
  `<div class="content tc">
  <div class="card">
    <div class="ts tg mb2">My Personal Lead Capture</div>
    <div style="position:relative;display:inline-block">
      <img src="${qrUrl}" alt="QR Code" style="width:240px;height:240px;border-radius:var(--rs);background:#fff;padding:8px">
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:6px;border-radius:6px;width:48px;height:48px;display:flex;align-items:center;justify-content:center"><img src="${LOGO_ICON}" style="width:42px;height:42px"></div>
    </div>
    <div class="fb tl2 mt4">${esc(Auth.displayName())}</div>
    <div class="ts tg">${esc(Auth.currentUser?.email || '')}</div>
    <div class="divider"></div>
    <div class="ts" style="word-break:break-all;color:var(--primary)">${link}</div>
    <button class="btn btn-outline mt2" onclick="copyText('${link}')">Copy Link</button>
  </div>
  <div class="card" style="text-align:left">
    <div class="section-title">How to use</div>
    <div class="ts tg mb2">1. Show this QR code to customers at events or in WeChat</div>
    <div class="ts tg mb2">2. They scan it and fill in their contact info</div>
    <div class="ts tg mb2">3. The lead is auto-saved under YOUR account instantly</div>
  </div>
  </div>`;
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Link copied to clipboard');
  }).catch(() => {
    showToast('Copy failed', 'error');
  });
}

// ============ ADVISER PROFILE ============
async function renderAdviserProfile() {
  const uid = Auth.currentUser.uid;
  const user = Auth.userProfile || {};
  const { leads } = await DataService.getLeads({}, 200);
  const myLeads = leads || [];
  const settled = myLeads.filter(l => l.status === 'settled').length;
  const submitted = myLeads.filter(l => l.status === 'submitted').length;

  const typeLabel = user.type === 'loan' ? 'Loan Specialist'
    : user.type === 'insurance' ? 'Insurance Specialist'
    : 'Loan & Insurance';

  return adviserHeader('Profile') +
  `<div class="content">
  <div class="card tc">
    <div class="av" style="width:64px;height:64px;font-size:24px;margin:0 auto 12px">${init2(Auth.displayName())}</div>
    <div class="fb tl2">${esc(Auth.displayName())}</div>
    <div class="ts tg">${esc(Auth.currentUser?.email || '')}</div>
    <div class="ts tg">${esc(user.phone || '')}</div>
    <div class="chip mt2">${typeLabel}</div>
  </div>

  <div class="stat-grid">
    <div class="stat-card"><div class="label">Total Leads</div><div class="value">${myLeads.length}</div></div>
    <div class="stat-card"><div class="label">Settled</div><div class="value" style="color:var(--success)">${settled}</div></div>
    <div class="stat-card"><div class="label">Submitted</div><div class="value" style="color:var(--purple)">${submitted}</div></div>
    <div class="stat-card"><div class="label">Active</div><div class="value" style="color:var(--primary)">${myLeads.filter(l => l.status === 'active').length}</div></div>
  </div>

  <div class="card card-tap" onclick="Router.navigate('adviser-qr')">
    <div class="flex aic jb"><div><div class="fs2">My QR Code</div><div class="ts tg mt2">Share with customers for lead capture</div></div><span class="ts tp">&#8594;</span></div>
  </div>

  <div class="card card-tap" onclick="handleLogout()">
    <div class="flex aic jb"><div><div class="fs2" style="color:var(--danger)">Sign Out</div></div></div>
  </div>
  </div>`;
}

// ============ HELPER FUNCTIONS ============
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtM(n) {
  if (!n) return '$0';
  return n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? '$' + (n / 1e3).toFixed(0) + 'K' : '$' + n;
}

function fmtMF(n) {
  return n ? '$' + Number(n).toLocaleString('en-NZ') : '$0';
}

function fmtD(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt)) return '-';
  return dt.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDS(d) {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt)) return '-';
  return dt.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' });
}

function init2(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
}

function badge(color, text) {
  return `<span class="badge b-${color}">${text}</span>`;
}

function getStatusInfo(status) {
  const map = {
    active: { label: 'Active', color: 'blue' },
    submitted: { label: 'Submitted', color: 'purple' },
    settled: { label: 'Settled', color: 'green' },
    lost: { label: 'Lost', color: 'gray' },
    new: { label: 'Active', color: 'blue' }
  };
  return map[status] || map.active;
}

function interestLabel(interest) {
  const map = { Loan: 'Loan', Insurance: 'Insurance', Both: 'Both', loan: 'Loan', insurance: 'Insurance', both: 'Both' };
  return map[interest] || interest || 'Loan';
}

const ACT_TYPES = {
  expo: 'Expo', seminar: 'Seminar', workshop: 'Workshop', 'pop-up': 'Pop-up',
  phone: 'Company Phone', website: 'Website', google: 'Google', facebook: 'Facebook',
  wechat: 'WeChat OA', 'wechat-video': 'WeChat Video', xiaohongshu: 'Xiaohongshu',
  referral: 'Referral'
};

// Cache activity names to avoid repeated fetches
const _actNameCache = {};
async function getActivityName(actId) {
  if (!actId) return 'Manual Entry';
  if (_actNameCache[actId]) return _actNameCache[actId];
  try {
    const act = await DataService.getActivity(actId);
    const name = act ? act.name : 'Unknown Activity';
    _actNameCache[actId] = name;
    return name;
  } catch {
    return 'Unknown Activity';
  }
}
