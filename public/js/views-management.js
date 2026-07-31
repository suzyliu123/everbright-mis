/**
 * Management Portal Views — Aligned with prototype index.html
 * All functions return HTML strings (async for data fetching)
 */

// ============ CONSTANTS ============
const STATUSES = {
  active:    { label: 'Active',    color: 'blue' },
  submitted: { label: 'Submitted', color: 'purple' },
  settled:   { label: 'Settled',   color: 'green' },
  lost:      { label: 'Lost',      color: 'red' },
};

const INTEREST_TYPES = {
  loan:      { label: 'Loan' },
  insurance: { label: 'Insurance' },
  both:      { label: 'Loan & Insurance' },
};

const ACT_TYPES_OBJ = {
  expo:'Expo', seminar:'Seminar', workshop:'Workshop', 'pop-up':'Pop-up',
  phone:'Company Phone', website:'Website', google:'Google', facebook:'Facebook',
  wechat:'WeChat OA', 'wechat-video':'WeChat Video', xiaohongshu:'Xiaohongshu',
  referral:'Referral'
};

const ACT_CATEGORIES = { event:'Event', ongoing:'Ongoing Source' };

const ACT_TYPES_LIST = Object.entries(ACT_TYPES_OBJ).map(([k,v]) => ({ key: k, label: v }));

// ============ SIDEBAR ============
function mgmtSidebar(active) {
  const items = [
    { id: 'mgmt-dashboard', icon: '&#128202;', label: 'Dashboard' },
    { id: 'mgmt-activities', icon: '&#128203;', label: 'Activities' },
    { id: 'mgmt-advisers', icon: '&#128101;', label: 'Advisers' },
    { id: 'mgmt-leads', icon: '&#128221;', label: 'Leads' },
    { id: 'mgmt-reports', icon: '&#128200;', label: 'Reports' },
    { id: 'mgmt-settings', icon: '&#9881;', label: 'Settings' },
  ];
  return `
  <div class="sb-brand" onclick="Router.navigate('mgmt-dashboard')">
    <img src="${LOGO_FULL}" alt="EverBright" style="width:150px">
  </div>
  <nav class="sb-nav">
    ${items.map(i => `
      <div class="sb-item ${active === i.id ? 'active' : ''}" onclick="Router.navigate('${i.id}')">
        <span class="sb-icon">${i.icon}</span>${i.label}
      </div>
    `).join('')}
  </nav>`;
}

// ============ HELPERS ============
function getStatus(s) {
  return STATUSES[s] || { label: s, color: 'gray' };
}

function getSegValue(containerId) {
  const el = document.querySelector(`#${containerId} .seg-item.active`);
  return el ? el.getAttribute('data-value') : '';
}

// ============ DASHBOARD ============
async function renderMgmtDashboard() {
  const [activities, allLeadsRes, weChatRecords, advisers] = await Promise.all([
    DataService.getActivities(),
    DataService.getLeads({}, 500),
    DataService.getWeChatRecords(),
    DataService.getAdvisers()
  ]);
  const allLeads = allLeadsRes.leads || allLeadsRes;
  const stats = DataService.computeLeadStats(allLeads);
  const totalWeChat = weChatRecords.reduce((s, r) => s + (r.count || 0), 0);

  // Activity ranking
  const actRanking = activities.map(a => {
    const actLeads = allLeads.filter(l => l.activityId === a.id);
    const s = DataService.computeLeadStats(actLeads);
    const wc = weChatRecords.filter(w => w.activityId === a.id).reduce((s, r) => s + (r.count || 0), 0);
    return { id: a.id, label: a.name, leads: s.total, submitted: s.submitted, settled: s.settled, weChat: wc, settlementAmount: s.settlementAmount };
  }).sort((a, b) => b.leads - a.leads);

  // Adviser ranking
  const advRanking = advisers.filter(a => a.status !== 'inactive').map(ad => {
    const advLeads = allLeads.filter(l => l.assignedAdviser === (ad.uid || ad.id));
    const s = DataService.computeLeadStats(advLeads);
    return { id: ad.uid || ad.id, label: ad.displayName, leads: s.total, submitted: s.submitted, settled: s.settled, weChat: 0, settlementAmount: s.settlementAmount, premium: s.totalPremium };
  }).sort((a, b) => b.leads - a.leads);

  // Source distribution
  const srcMap = {};
  allLeads.forEach(l => {
    const src = (l.firstTouch && l.firstTouch.channel) || 'Unknown';
    srcMap[src] = (srcMap[src] || 0) + 1;
  });
  const sourceOrder = ['Expo','Facebook','Google','Seminar','WeChat','Referral','Website','Xiaohongshu','Phone','Other'];
  const sources = sourceOrder.filter(s => srcMap[s]).map(s => ({ label: s, value: srcMap[s] }));

  // Filter bar
  const hasFilter = S.dashFilterAct || S.dashFilterAdv || S.dashDateFrom || S.dashDateTo || S.dashFilterStatus || S.dashFilterSrc;
  const activeAdvs = advisers.filter(a => a.status !== 'inactive');

  return `
  <div class="page-head"><h2>Dashboard</h2><div class="ph-actions"><button class="btn btn-ghost btn-sm" onclick="Router.navigate('mgmt-reports')">&#9776; Reports</button></div></div>

  <div class="fbar">
    <select onchange="S.dashFilterAct=this.value;render()"><option value="">All Activities</option>${activities.map(a => `<option value="${a.id}" ${S.dashFilterAct===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select>
    <select onchange="S.dashFilterAdv=this.value;render()"><option value="">All Advisers</option>${activeAdvs.map(a => `<option value="${a.uid||a.id}" ${S.dashFilterAdv===(a.uid||a.id)?'selected':''}>${esc(a.displayName)}</option>`).join('')}</select>
    <select onchange="S.dashFilterStatus=this.value;render()"><option value="">All Statuses</option>${Object.entries(STATUSES).map(([k,v]) => `<option value="${k}" ${S.dashFilterStatus===k?'selected':''}>${v.label}</option>`).join('')}</select>
    <select onchange="S.dashFilterSrc=this.value;render()"><option value="">All Sources</option>${sourceOrder.filter(s => srcMap[s]).map(s => `<option value="${s}" ${S.dashFilterSrc===s?'selected':''}>${s}</option>`).join('')}</select>
    <input type="date" value="${S.dashDateFrom||''}" onchange="S.dashDateFrom=this.value;render()" title="From">
    <input type="date" value="${S.dashDateTo||''}" onchange="S.dashDateTo=this.value;render()" title="To">
    ${hasFilter ? `<span class="btn-clear" onclick="S.dashFilterAct='';S.dashFilterAdv='';S.dashFilterStatus='';S.dashFilterSrc='';S.dashDateFrom='';S.dashDateTo='';render()" style="cursor:pointer;color:var(--danger);font-size:11px;font-weight:500;white-space:nowrap;padding:4px 8px">&#10005; Clear</span>` : ''}
  </div>
  ${hasFilter ? `<div style="font-size:11px;color:var(--g500);margin:-8px 0 12px;padding-left:4px">Filter applied: ${stats.total} leads &middot; ${activities.length} activities</div>` : ''}

  <div class="dash-kpi">
    <div class="kpi-card" onclick="Router.navigate('mgmt-activities')"><div class="kpi-lbl">Total Activities</div><div class="kpi-val" style="color:var(--primary)">${activities.length}</div></div>
    <div class="kpi-card"><div class="kpi-lbl">New WeChat Contacts</div><div class="kpi-val" style="color:var(--teal)">${totalWeChat}</div></div>
    <div class="kpi-card" onclick="Router.navigate('mgmt-leads')"><div class="kpi-lbl">Total Leads</div><div class="kpi-val">${stats.total}</div><div class="kpi-sub">${stats.active} active &middot; ${stats.submitted} submitted &middot; ${stats.lost} lost</div></div>
    <div class="kpi-card" onclick="Router.navigate('mgmt-leads')"><div class="kpi-lbl">Total Submitted</div><div class="kpi-val" style="color:var(--purple)">${stats.submitted}</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Total Settlements</div><div class="kpi-val" style="color:var(--success)">${stats.settled}</div><div class="kpi-sub">${stats.total ? (stats.settled/stats.total*100).toFixed(1) : 0}% conversion</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Settlement Amount</div><div class="kpi-val" style="font-size:22px;color:var(--primary)">${fmtM(stats.settlementAmount)}</div></div>
    <div class="kpi-card"><div class="kpi-lbl">Insurance API</div><div class="kpi-val" style="font-size:20px;color:var(--purple)">${fmtMF(stats.totalPremium)}/yr</div></div>
  </div>

  <div class="dash-charts">
    <div class="chart-card">
      <h4><span class="ch-ic">&#9650;</span>Activity Performance Ranking</h4>
      ${actRanking.length ? `<div class="data-table" style="width:100%">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr><th>Activity</th><th>WeChat</th><th>Leads</th><th>Submitted</th><th>Settled</th><th>Loan Amt</th></tr></thead>
          <tbody>${actRanking.map(a => `<tr class="clickable-row" onclick="Router.navigate('mgmt-activity-summary?id=${a.id}')">
            <td style="font-weight:500">${esc(a.label)}</td>
            <td>${a.weChat}</td><td>${a.leads}</td><td>${a.submitted}</td><td style="color:var(--success)">${a.settled}</td><td>${fmtM(a.settlementAmount)}</td>
          </tr>`).join('')}</tbody>
        </table></div>` : `<div class="empty" style="padding:20px">No activity data</div>`}
    </div>

    <div class="chart-card">
      <h4><span class="ch-ic">&#9672;</span>Adviser Performance Ranking</h4>
      ${advRanking.length ? `<div class="data-table" style="width:100%">
        <table style="width:100%;border-collapse:collapse">
          <thead><tr><th>Adviser</th><th>Leads</th><th>Submitted</th><th>Settled</th><th>Loan Amt</th><th>Ins API</th></tr></thead>
          <tbody>${advRanking.map(ad => `<tr class="clickable-row" onclick="Router.navigate('mgmt-adviser-profile?id=${ad.id}')">
            <td style="font-weight:500">${esc(ad.label)}</td>
            <td>${ad.leads}</td><td>${ad.submitted}</td><td style="color:var(--success)">${ad.settled}</td><td>${fmtM(ad.settlementAmount)}</td><td>${fmtMF(ad.premium)}</td>
          </tr>`).join('')}</tbody>
        </table></div>` : `<div class="empty" style="padding:20px">No adviser data</div>`}
    </div>
  </div>

  <div class="dash-charts-full">
    <div class="chart-card">
      <h4><span class="ch-ic">&#9678;</span>Lead Source Distribution</h4>
      ${sources.length ? `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;padding:12px 0">
        ${sources.map(s => {
          const maxVal = Math.max(...sources.map(x => x.value), 1);
          const h = Math.max(s.value / maxVal * 120, 20);
          return `<div style="text-align:center;cursor:pointer;flex:1;min-width:60px" onclick="S.dashFilterSrc='${s.label}';render()">
            <div style="font-size:12px;font-weight:600;color:var(--primary);margin-bottom:4px">${s.value}</div>
            <div style="background:linear-gradient(180deg,var(--primary),var(--primary-dark));border-radius:6px 6px 0 0;height:${h}px;transition:height 0.3s"></div>
            <div style="font-size:11px;color:var(--g500);margin-top:4px">${s.label}</div>
          </div>`;
        }).join('')}
      </div>` : '<div class="empty">No source data</div>'}
    </div>
  </div>`;
}

// ============ ACTIVITIES LIST ============
async function renderMgmtActivities() {
  let activities = await DataService.getActivities();

  // Apply filters
  const term = (S.search || '').toLowerCase();
  const catFilter = S.activityFilter || 'all';
  const statusFilter = S.dashFilterStatus || 'all';

  if (catFilter === 'events') activities = activities.filter(a => a.category === 'event');
  if (catFilter === 'ongoing') activities = activities.filter(a => a.category === 'ongoing');
  if (statusFilter !== 'all') activities = activities.filter(a => a.status === statusFilter);
  if (S.dashDateFrom) activities = activities.filter(a => a.startDate >= S.dashDateFrom);
  if (S.dashDateTo) activities = activities.filter(a => a.startDate <= S.dashDateTo);
  if (term) activities = activities.filter(a => a.name.toLowerCase().includes(term) || (a.location || '').toLowerCase().includes(term));

  // Fetch leads + wechat for stats
  const [allLeadsRes, weChatRecords] = await Promise.all([
    DataService.getLeads({}, 500),
    DataService.getWeChatRecords()
  ]);
  const allLeads = allLeadsRes.leads || allLeadsRes;

  return `
  <div class="page-head"><h2>Activities</h2><div class="ph-actions"><button class="btn btn-primary btn-sm" onclick="showNewActivityModal()">+ New</button></div></div>

  <div class="fbar">
    <input placeholder="Search activities..." value="${S.search||''}" oninput="S.search=this.value;render()" style="min-width:180px">
    <select onchange="S.activityFilter=this.value;render()"><option value="all" ${catFilter==='all'?'selected':''}>All Categories</option><option value="events" ${catFilter==='events'?'selected':''}>Events</option><option value="ongoing" ${catFilter==='ongoing'?'selected':''}>Ongoing</option></select>
    <select onchange="S.dashFilterStatus=this.value;render()"><option value="all" ${statusFilter==='all'?'selected':''}>All Statuses</option><option value="active" ${statusFilter==='active'?'selected':''}>Active</option><option value="completed" ${statusFilter==='completed'?'selected':''}>Completed</option></select>
    <input type="date" value="${S.dashDateFrom||''}" onchange="S.dashDateFrom=this.value;render()" title="From">
    <span class="btn-clear" onclick="S.search='';S.activityFilter='all';S.dashFilterStatus='all';S.dashDateTo='';S.dashDateFrom='';render()">Clear</span>
  </div>

  <div class="card card-tap" onclick="showNewActivityModal()" style="background:var(--primary-light);border:2px dashed var(--primary);text-align:center;margin-bottom:14px">
    <div style="font-size:24px;color:var(--primary);margin-bottom:4px">+</div>
    <div style="font-weight:600;color:var(--primary)">Create New Activity</div>
  </div>

  ${activities.map(a => {
    const actLeads = allLeads.filter(l => l.activityId === a.id);
    const s = DataService.computeLeadStats(actLeads);
    const wc = weChatRecords.filter(w => w.activityId === a.id).reduce((sum, r) => sum + (r.count || 0), 0);
    const isEvent = a.category === 'event';
    const typeLabel = ACT_TYPES_OBJ[a.type] || a.type || a.channel || '-';
    return `<div class="card card-tap" onclick="Router.navigate('mgmt-activity-summary?id=${a.id}')" style="margin-bottom:10px">
      <div class="flex jb aic mb2"><div class="fs2">${esc(a.name)}</div>${badge(isEvent ? (a.status==='completed'?'green':a.status==='active'?'blue':'gray') : 'blue', isEvent ? (a.status==='completed'?'Ended':a.status==='active'?'Live':'Planned') : 'Ongoing')}</div>
      <div class="ts tg mb2">${typeLabel} &middot; ${isEvent ? fmtD(a.startDate) : 'Always live'} &middot; ${esc(a.location||'-')}${a.budget>0 ? ' &middot; Budget '+fmtMF(a.budget) : ''}</div>
      <div class="summary-line">
        <div class="summary-item"><div class="si-val">${wc}</div><div class="si-lbl">WeChat</div></div>
        <div class="summary-item"><div class="si-val">${s.total}</div><div class="si-lbl">Leads</div></div>
        <div class="summary-item"><div class="si-val" style="color:var(--purple)">${s.submitted}</div><div class="si-lbl">Submitted</div></div>
        <div class="summary-item"><div class="si-val" style="color:var(--success)">${s.settled}</div><div class="si-lbl">Settled</div></div>
        <div class="summary-item"><div class="si-val" style="font-size:16px;color:var(--primary)">${fmtM(s.settlementAmount)}</div><div class="si-lbl">Loan</div></div>
      </div>
    </div>`;
  }).join('')}

  ${activities.length === 0 ? '<div class="empty"><div class="ic">&#128269;</div>No activities match your criteria</div>' : ''}`;
}

// ============ ACTIVITY SUMMARY ============
async function renderMgmtActivitySummary(actId) {
  const [activity, leads, weChatRecords, advisers] = await Promise.all([
    DataService.getActivity(actId),
    DataService.getLeadsByActivity(actId),
    DataService.getWeChatRecords({ activityId: actId }),
    DataService.getAdvisers()
  ]);

  if (!activity) return `<div class="error-state">Activity not found</div>`;

  const stats = DataService.computeLeadStats(leads);
  const totalWeChat = weChatRecords.reduce((s, r) => s + (r.count || 0), 0);
  const assignedIds = activity.assignedAdvisers || [];
  const isEvent = activity.category === 'event';
  const typeLabel = ACT_TYPES_OBJ[activity.type] || activity.type || activity.channel || '-';

  // Adviser performance
  const advPerf = [];
  for (const adv of advisers) {
    const advId = adv.uid || adv.id;
    if (!assignedIds.includes(advId)) continue;
    const advLeads = leads.filter(l => l.assignedAdviser === advId);
    const s = DataService.computeLeadStats(advLeads);
    advPerf.push({ uid: advId, name: adv.displayName, ...s });
  }
  advPerf.sort((a, b) => b.settlementAmount - a.settlementAmount);

  return `
  <div class="page-head"><h2>${esc(activity.name)}</h2><div>
    <button class="btn btn-ghost btn-sm" onclick="Router.goBack()">&#8592; Back</button>
    <button class="btn btn-ghost btn-sm" onclick="Router.goHome()">&#8962; Home</button>
  </div></div>

  <div class="card">
    <div class="flex jb aic mb2"><div class="fb tl2">${esc(activity.name)}</div>${badge(isEvent ? (activity.status==='completed'?'green':activity.status==='active'?'blue':'gray') : 'blue', isEvent ? (activity.status==='completed'?'Ended':activity.status==='active'?'Live':'Planned') : 'Ongoing')}</div>
    ${activity.description ? `<div class="ts tg mb2">${esc(activity.description)}</div>` : ''}
    <div class="divider"></div>
    <div class="info-grid">
      <div class="info-item"><span class="if-lbl">Type</span><span class="if-val">${typeLabel}</span></div>
      <div class="info-item"><span class="if-lbl">Category</span><span class="if-val">${ACT_CATEGORIES[activity.category] || activity.category}</span></div>
      <div class="info-item"><span class="if-lbl">Date</span><span class="if-val">${isEvent ? fmtD(activity.startDate) : 'Started '+fmtD(activity.startDate)}</span></div>
      <div class="info-item"><span class="if-lbl">Location</span><span class="if-val">${esc(activity.location||'-')}</span></div>
      <div class="info-item"><span class="if-lbl">Budget</span><span class="if-val">${fmtMF(activity.budget||0)}</span></div>
      <div class="info-item"><span class="if-lbl">Status</span><span class="if-val" style="color:${activity.status==='active'?'var(--primary)':activity.status==='completed'?'var(--success)':'var(--g500)'}">${activity.status.charAt(0).toUpperCase()+activity.status.slice(1)}</span></div>
    </div>
  </div>

  <div class="card">
    <div class="section-title">Activity Results</div>
    <div class="summary-line">
      <div class="summary-item"><div class="si-val">${totalWeChat}</div><div class="si-lbl">WeChat Added</div></div>
      <div class="summary-item"><div class="si-val">${stats.total}</div><div class="si-lbl">Total Leads</div></div>
      <div class="summary-item"><div class="si-val" style="color:var(--success)">${stats.active}</div><div class="si-lbl">Active</div></div>
      <div class="summary-item"><div class="si-val" style="color:var(--purple)">${stats.submitted}</div><div class="si-lbl">Submitted</div></div>
      <div class="summary-item"><div class="si-val" style="color:var(--success)">${stats.settled}</div><div class="si-lbl">Settled</div></div>
      <div class="summary-item"><div class="si-val" style="color:var(--danger)">${stats.lost}</div><div class="si-lbl">Lost</div></div>
      <div class="summary-item"><div class="si-val" style="font-size:18px;color:var(--primary)">${fmtM(stats.settlementAmount)}</div><div class="si-lbl">Settlement</div></div>
      <div class="summary-item"><div class="si-val" style="font-size:16px;color:var(--purple)">${fmtMF(stats.totalPremium)}/yr</div><div class="si-lbl">Insurance API</div></div>
    </div>
  </div>

  ${advPerf.length > 0 ? `<div class="card">
    <div class="section-title">Adviser Performance (${advPerf.length})</div>
    <div class="data-table" style="width:100%;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr><th>Adviser</th><th>Leads</th><th>Submitted</th><th>Settled</th><th>Loan Amt</th><th>Ins API</th></tr></thead>
        <tbody>${advPerf.map(a => `<tr class="clickable-row" onclick="Router.navigate('mgmt-adv-act-summary?actId=${actId}&advId=${a.uid}')">
          <td style="font-weight:500">${esc(a.name)}</td>
          <td>${a.total}</td><td>${a.submitted}</td><td style="color:var(--success)">${a.settled}</td>
          <td>${fmtM(a.settlementAmount)}</td><td>${fmtMF(a.totalPremium)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  </div>` : ''}

  <div class="card">
    <div class="section-title">Leads (${leads.length})</div>
    ${leads.length ? `<div class="data-table" style="width:100%;overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr><th>Name</th><th>Adviser</th><th>Status</th><th>Interest</th><th>Date</th><th>Amount</th></tr></thead>
      <tbody>${leads.map(l => {
        const st = getStatus(l.status);
        const advName = advisers.find(a => (a.uid||a.id) === l.assignedAdviser);
        return `<tr class="clickable-row" onclick="Router.navigate('lead-detail?id=${l.id}')">
          <td style="font-weight:500">${esc(l.name)}</td>
          <td>${advName ? esc(advName.displayName) : '-'}</td>
          <td>${badge(st.color, st.label)}</td>
          <td>${INTEREST_TYPES[l.interest] ? INTEREST_TYPES[l.interest].label : l.interest}</td>
          <td>${fmtDS(l.firstTouch?.date || l.createdAt)}</td>
          <td>${l.settlementAmount ? fmtM(l.settlementAmount) : l.annualPremium ? fmtMF(l.annualPremium)+'/yr' : '-'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>` : '<div class="empty">No leads yet</div>'}
  </div>`;
}

// ============ ADVISER IN ACTIVITY ============
async function renderMgmtAdvActSummary(actId, advId) {
  const [activity, allLeads, adviser] = await Promise.all([
    DataService.getActivity(actId),
    DataService.getLeadsByActivity(actId),
    DataService.getUser(advId)
  ]);

  if (!activity || !adviser) return `<div class="error-state">Not found</div>`;

  const leads = allLeads.filter(l => l.assignedAdviser === advId);
  const s = DataService.computeLeadStats(leads);
  const typeLabel = ACT_TYPES_OBJ[activity.type] || activity.type || activity.channel || '-';

  return `
  <div class="page-head"><h2>${esc(adviser.displayName)} &mdash; ${esc(activity.name)}</h2><div>
    <button class="btn btn-ghost btn-sm" onclick="Router.goBack()">&#8592; Back</button>
    <button class="btn btn-ghost btn-sm" onclick="Router.goHome()">&#8962; Home</button>
  </div></div>

  <div class="card tc">
    <div class="av" style="width:56px;height:56px;font-size:20px;margin:0 auto 12px">${init2(adviser.displayName||'')}</div>
    <div class="fb tl2">${esc(adviser.displayName)}</div>
    <div class="ts tg" style="margin:2px 0">${esc(adviser.email||'')}</div>
    <div class="chip mt2">${typeLabel}</div>
  </div>

  <div class="card">
    <div class="section-title">Performance in "${esc(activity.name)}"</div>
    <div class="summary-line">
      <div class="summary-item"><div class="si-val">${s.total}</div><div class="si-lbl">Total Leads</div></div>
      <div class="summary-item"><div class="si-val" style="color:var(--success)">${s.active}</div><div class="si-lbl">Active</div></div>
      <div class="summary-item"><div class="si-val" style="color:var(--purple)">${s.submitted}</div><div class="si-lbl">Submitted</div></div>
      <div class="summary-item"><div class="si-val" style="color:var(--success)">${s.settled}</div><div class="si-lbl">Settled</div></div>
      <div class="summary-item"><div class="si-val" style="color:var(--danger)">${s.lost}</div><div class="si-lbl">Lost</div></div>
      <div class="summary-item"><div class="si-val" style="font-size:18px;color:var(--primary)">${fmtM(s.settlementAmount)}</div><div class="si-lbl">Settlement</div></div>
      <div class="summary-item"><div class="si-val" style="font-size:16px;color:var(--purple)">${fmtMF(s.totalPremium)}/yr</div><div class="si-lbl">Insurance API</div></div>
    </div>
  </div>

  ${leads.length > 0 ? `<div class="card">
    <div class="section-title">Leads from this Activity (${leads.length})</div>
    <div class="data-table" style="width:100%;overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr><th>Name</th><th>Status</th><th>Interest</th><th>Date</th><th>Amount</th></tr></thead>
      <tbody>${leads.map(l => {
        const st = getStatus(l.status);
        return `<tr class="clickable-row" onclick="Router.navigate('lead-detail?id=${l.id}')">
          <td style="font-weight:500">${esc(l.name)}</td>
          <td>${badge(st.color, st.label)}</td>
          <td>${INTEREST_TYPES[l.interest] ? INTEREST_TYPES[l.interest].label : l.interest}</td>
          <td>${fmtDS(l.firstTouch?.date || l.createdAt)}</td>
          <td>${l.settlementAmount ? fmtM(l.settlementAmount) : l.annualPremium ? fmtMF(l.annualPremium)+'/yr' : '-'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>` : ''}`;
}

// ============ ADVISERS LIST ============
async function renderMgmtAdvisers() {
  const advisers = await DataService.getAdvisers();
  const allLeadsRes = await DataService.getLeads({}, 500);
  const allLeads = allLeadsRes.leads || allLeadsRes;
  const [activities, weChatRecords] = await Promise.all([
    DataService.getActivities(),
    DataService.getWeChatRecords()
  ]);

  // Apply filters
  const term = (S.search || '').toLowerCase();
  const advStatFilter = S.advFilter || 'all';
  let filtered = advisers;
  if (advStatFilter === 'active') filtered = filtered.filter(a => a.status === 'active');
  if (advStatFilter === 'inactive') filtered = filtered.filter(a => a.status !== 'active');
  if (term) filtered = filtered.filter(a => (a.displayName||'').toLowerCase().includes(term) || (a.email||'').toLowerCase().includes(term));

  return `
  <div class="page-head"><h2>Advisers</h2></div>

  <div class="fbar">
    <input placeholder="Search advisers..." value="${S.search||''}" oninput="S.search=this.value;render()" style="min-width:180px">
    <select onchange="S.advFilter=this.value;render()"><option value="all" ${advStatFilter==='all'?'selected':''}>All</option><option value="active" ${advStatFilter==='active'?'selected':''}>Active</option><option value="inactive" ${advStatFilter==='inactive'?'selected':''}>Inactive</option></select>
    <span class="btn-clear" onclick="S.search='';S.advFilter='all';render()">Clear</span>
  </div>

  ${filtered.map(ad => {
    const advId = ad.uid || ad.id;
    const advLeads = allLeads.filter(l => l.assignedAdviser === advId);
    const s = DataService.computeLeadStats(advLeads);
    const actCount = activities.filter(a => (a.assignedAdvisers || []).includes(advId)).length;
    const wcCount = weChatRecords.filter(w => w.adviserId === advId).reduce((sum, r) => sum + (r.count || 0), 0);
    return `<div class="card card-tap" onclick="Router.navigate('mgmt-adviser-profile?id=${advId}')" style="margin-bottom:10px">
      <div class="flex jb aic mb2">
        <div class="flex aic g2"><div class="av">${init2(ad.displayName||'')}</div>
        <div><div class="fs2">${esc(ad.displayName)}</div><div class="ts tg">${esc(ad.email||'')}</div></div></div>
        <div>${badge(ad.status==='active'?'green':'gray', ad.status||'active')}</div>
      </div>
      <div class="summary-line">
        <div class="summary-item"><div class="si-val">${actCount}</div><div class="si-lbl">Activities</div></div>
        <div class="summary-item"><div class="si-val">${wcCount}</div><div class="si-lbl">WeChat</div></div>
        <div class="summary-item"><div class="si-val">${s.total}</div><div class="si-lbl">Leads</div></div>
        <div class="summary-item"><div class="si-val" style="color:var(--success)">${s.settled}</div><div class="si-lbl">Settled</div></div>
        <div class="summary-item"><div class="si-val" style="font-size:16px;color:var(--primary)">${fmtM(s.settlementAmount)}</div><div class="si-lbl">Loan</div></div>
      </div>
    </div>`;
  }).join('')}

  ${filtered.length === 0 ? '<div class="empty"><div class="ic">&#128269;</div>No advisers match</div>' : ''}`;
}

// ============ ADVISER PROFILE ============
async function renderMgmtAdviserProfile(advId) {
  const [adviser, activities, allLeads] = await Promise.all([
    DataService.getUser(advId),
    DataService.getActivities(),
    DataService.getLeadsByAdviser(advId)
  ]);
  const [weChatRecords] = await Promise.all([DataService.getWeChatRecords()]);

  if (!adviser) return `<div class="error-state">Adviser not found</div>`;

  const s = DataService.computeLeadStats(allLeads);
  const wcCount = weChatRecords.filter(w => w.adviserId === advId).reduce((sum, r) => sum + (r.count || 0), 0);
  const actCount = activities.filter(a => (a.assignedAdvisers || []).includes(advId)).length;
  const typeLabel = adviser.type === 'loan' ? 'Loan Specialist' : adviser.type === 'insurance' ? 'Insurance Specialist' : 'Loan & Insurance';

  // Activity history
  const actMap = {};
  allLeads.forEach(l => {
    const aid = l.activityId;
    if (!actMap[aid]) {
      const act = activities.find(a => a.id === aid);
      actMap[aid] = { act, leads: [], settled: 0, settlementAmount: 0, weChat: weChatRecords.filter(w => w.activityId === aid && w.adviserId === advId).reduce((sum, r) => sum + (r.count||0), 0) };
    }
    actMap[aid].leads.push(l);
    if (l.status === 'settled') { actMap[aid].settled++; actMap[aid].settlementAmount += (l.settlementAmount || 0); }
  });
  // Include assigned activities with no leads
  activities.forEach(a => {
    if ((a.assignedAdvisers || []).includes(advId) && !actMap[a.id]) {
      actMap[a.id] = { act: a, leads: [], settled: 0, settlementAmount: 0, weChat: 0 };
    }
  });
  const actList = Object.values(actMap).sort((a, b) => new Date(b.act.startDate) - new Date(a.act.startDate));

  return `
  <div class="page-head"><h2>${esc(adviser.displayName)}</h2><div>
    <button class="btn btn-ghost btn-sm" onclick="Router.goBack()">&#8592; Back</button>
    <button class="btn btn-ghost btn-sm" onclick="Router.goHome()">&#8962; Home</button>
  </div></div>

  <div class="card tc">
    <div class="av" style="width:64px;height:64px;font-size:24px;margin:0 auto 12px">${init2(adviser.displayName||'')}</div>
    <div class="fb tl2">${esc(adviser.displayName)}</div>
    <div class="ts tg">${esc(adviser.email||'')} &middot; ${esc(adviser.phone||'')}</div>
    <div class="chip mt2">${typeLabel}</div>
  </div>

  <div class="card">
    <div class="section-title">Overall Performance</div>
    <div class="dash-kpi">
      <div class="kpi-card"><div class="kpi-lbl">Total Activities</div><div class="kpi-val" style="color:var(--primary)">${actCount}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">WeChat Added</div><div class="kpi-val" style="color:var(--teal)">${wcCount}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Total Leads</div><div class="kpi-val">${s.total}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Submitted</div><div class="kpi-val" style="color:var(--purple)">${s.submitted}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Settled</div><div class="kpi-val" style="color:var(--success)">${s.settled}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Conversion Rate</div><div class="kpi-val" style="color:var(--warning)">${s.conversionRate}%</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Settlement Amount</div><div class="kpi-val" style="font-size:20px;color:var(--primary)">${fmtM(s.settlementAmount)}</div></div>
      <div class="kpi-card"><div class="kpi-lbl">Insurance API</div><div class="kpi-val" style="font-size:18px;color:var(--purple)">${fmtMF(s.totalPremium)}/yr</div></div>
    </div>
  </div>

  ${actList.length > 0 ? `<div class="card">
    <div class="section-title">Activity History (${actList.length})</div>
    <div class="data-table" style="width:100%;overflow-x:auto"><table style="width:100%;border-collapse:collapse">
      <thead><tr><th>Activity</th><th>Date</th><th>WeChat</th><th>Leads</th><th>Submitted</th><th>Settled</th><th>Loan Amt</th></tr></thead>
      <tbody>${actList.map(d => {
        const submitted = d.leads.filter(l => l.status === 'submitted').length;
        return `<tr class="clickable-row" onclick="Router.navigate('mgmt-adv-act-summary?actId=${d.act.id}&advId=${advId}')">
          <td style="font-weight:500">${esc(d.act.name)}</td><td>${fmtD(d.act.startDate)}</td>
          <td>${d.weChat}</td><td>${d.leads.length}</td><td>${submitted}</td>
          <td style="color:var(--success)">${d.settled}</td><td>${fmtM(d.settlementAmount)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>
  </div>` : ''}`;
}

// ============ LEADS LIST ============
async function renderMgmtLeads() {
  const [advisers, activities] = await Promise.all([
    DataService.getAdvisers(),
    DataService.getActivities()
  ]);
  const allLeadsRes = await DataService.getLeads({}, 500);
  const allLeads = allLeadsRes.leads || allLeadsRes;

  // Apply filters
  const term = (S.search || '').toLowerCase();
  let filtered = allLeads;
  if (term) {
    filtered = filtered.filter(l =>
      (l.name||'').toLowerCase().includes(term) ||
      (l.phone||'').includes(term) ||
      (l.wechat||'').toLowerCase().includes(term)
    );
  }
  if (S.leadFilter && S.leadFilter !== 'all') filtered = filtered.filter(l => l.status === S.leadFilter);
  if (S.dashFilterAct) filtered = filtered.filter(l => l.activityId === S.dashFilterAct);
  if (S.dashFilterAdv) filtered = filtered.filter(l => l.assignedAdviser === S.dashFilterAdv);

  return `
  <div class="page-head"><h2>All Leads</h2></div>

  <div class="fbar">
    <input placeholder="Search name / phone / WeChat..." value="${S.search||''}" oninput="S.search=this.value;render()" style="min-width:180px">
    <select onchange="S.dashFilterAct=this.value;render()"><option value="">All Activities</option>${activities.map(a => `<option value="${a.id}" ${S.dashFilterAct===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select>
    <select onchange="S.dashFilterAdv=this.value;render()"><option value="">All Advisers</option>${advisers.filter(a=>a.status!=='inactive').map(a => `<option value="${a.uid||a.id}" ${S.dashFilterAdv===(a.uid||a.id)?'selected':''}>${esc(a.displayName)}</option>`).join('')}</select>
    <select onchange="S.leadFilter=this.value;render()"><option value="all" ${S.leadFilter==='all'?'selected':''}>All Statuses</option>${Object.entries(STATUSES).map(([k,v]) => `<option value="${k}" ${S.leadFilter===k?'selected':''}>${v.label}</option>`).join('')}</select>
    <span class="btn-clear" onclick="S.search='';S.leadFilter='all';S.dashFilterAct='';S.dashFilterAdv='';render()">Clear</span>
  </div>

  <div class="dash-kpi" style="margin-bottom:16px">
    <div class="kpi-card" onclick="S.leadFilter='active';render()"><div class="kpi-lbl">Active</div><div class="kpi-val" style="color:var(--primary)">${allLeads.filter(l=>l.status==='active').length}</div></div>
    <div class="kpi-card" onclick="S.leadFilter='submitted';render()"><div class="kpi-lbl">Submitted</div><div class="kpi-val" style="color:var(--purple)">${allLeads.filter(l=>l.status==='submitted').length}</div></div>
    <div class="kpi-card" onclick="S.leadFilter='settled';render()"><div class="kpi-lbl">Settled</div><div class="kpi-val" style="color:var(--success)">${allLeads.filter(l=>l.status==='settled').length}</div></div>
    <div class="kpi-card" onclick="S.leadFilter='lost';render()"><div class="kpi-lbl">Lost</div><div class="kpi-val" style="color:var(--danger)">${allLeads.filter(l=>l.status==='lost').length}</div></div>
  </div>

  ${filtered.length ? `<div class="data-table" style="width:100%;overflow-x:auto"><table style="width:100%;border-collapse:collapse">
    <thead><tr><th>Name</th><th>Phone</th><th>WeChat</th><th>Activity</th><th>Adviser</th><th>Status</th><th>Interest</th><th>Amount</th></tr></thead>
    <tbody>${filtered.map(l => {
      const st = getStatus(l.status);
      const act = activities.find(a => a.id === l.activityId);
      const adv = advisers.find(a => (a.uid||a.id) === l.assignedAdviser);
      return `<tr class="clickable-row" onclick="Router.navigate('lead-detail?id=${l.id}')">
        <td style="font-weight:500">${esc(l.name)}</td>
        <td>${esc(l.phone||'-')}</td>
        <td>${esc(l.wechat||'-')}</td>
        <td>${act ? esc(act.name) : '-'}</td>
        <td>${adv ? esc(adv.displayName) : '-'}</td>
        <td>${badge(st.color, st.label)}</td>
        <td>${INTEREST_TYPES[l.interest] ? INTEREST_TYPES[l.interest].label : l.interest}</td>
        <td>${l.settlementAmount ? fmtM(l.settlementAmount) : l.annualPremium ? fmtMF(l.annualPremium)+'/yr' : '-'}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>` : '<div class="empty"><div class="ic">&#128269;</div>No leads match your filters</div>'}`;
}

// ============ LEAD DETAIL ============
async function renderLeadDetail(leadId) {
  const lead = await DataService.getLead(leadId);
  if (!lead) return `<div class="error-state">Lead not found</div>`;

  const [activity, adviser] = await Promise.all([
    DataService.getActivity(lead.activityId),
    DataService.getUser(lead.assignedAdviser)
  ]);

  const st = getStatus(lead.status);
  const showLoan = lead.interest === 'loan' || lead.interest === 'both';
  const showIns = lead.interest === 'insurance' || lead.interest === 'both';
  const interestLabel = INTEREST_TYPES[lead.interest] ? INTEREST_TYPES[lead.interest].label : lead.interest;

  // Touchpoints
  const touchpoints = lead.touchpoints || [];
  const touchpointsHtml = touchpoints.length > 1 ?
    '<div class="divider" style="background:var(--primary)"></div>' +
    '<div class="ts tg mb2">All touchpoints (' + touchpoints.length + ')</div>' +
    '<div class="flex" style="gap:6px;flex-wrap:wrap">' +
    touchpoints.map(tp => '<span class="chip" style="background:var(--white);color:var(--primary)">' + (tp.channel||'-') + ' &middot; ' + fmtDS(tp.date) + '</span>').join('') +
    '</div>' : '';

  // Settlement / Insurance display
  const settlementHtml = lead.status === 'settled' && showLoan ?
    (lead.settlementAmount ? `<div class="flex jb aic mt2"><span class="ts tg">Settlement</span><span class="fb ts2">${fmtMF(lead.settlementAmount)}</span></div>` : '') +
    (lead.lender ? `<div class="flex jb aic mt2"><span class="ts tg">Lender</span><span class="fs2">${esc(lead.lender)}</span></div>` : '')
    : '';
  const insuranceHtml = lead.status === 'settled' && showIns ?
    (lead.annualPremium ? `<div class="flex jb aic mt2"><span class="ts tg">Insurance API</span><span class="fb ts2">${fmtMF(lead.annualPremium)}/yr</span></div>` : '') +
    (lead.insurer ? `<div class="flex jb aic mt2"><span class="ts tg">Insurer</span><span class="fs2">${esc(lead.insurer)}</span></div>` : '')
    : '';

  // Notes
  const notes = lead.notes || [];
  const notesHtml = Array.isArray(notes) ? notes.map((n, i) =>
    `<div class="tl-item ${(lead.status==='settled'&&i===notes.length-1)?'done':''}"><div class="d">${fmtD(n.date)}</div><div class="t">${esc(n.content)}</div><div class="by">by ${esc(n.author||'')}</div></div>`
  ).join('') : (typeof notes === 'string' ? notes : 'No notes');

  const wechatRow = lead.wechat ? `<div class="flex jb aic mt2"><span class="ts tg">WeChat</span><span class="fs2">${esc(lead.wechat)}</span></div>` : '';

  return `
  <div class="page-head"><h2>${esc(lead.name)}</h2><div>
    <button class="btn btn-ghost btn-sm" onclick="Router.goBack()">&#8592; Back</button>
    <button class="btn btn-ghost btn-sm" onclick="Router.goHome()">&#8962; Home</button>
  </div></div>

  <div class="card">
    <div class="flex aic g4 mb2">
      <div class="av" style="width:48px;height:48px;font-size:18px">${init2(lead.name||'')}</div>
      <div class="f1"><div class="fb tl2">${esc(lead.name)}</div><div class="ts tg">${adviser ? esc(adviser.displayName) : '-'}</div></div>
      ${badge(st.color, st.label)}
    </div>
    <div class="divider"></div>
    <div class="flex jb aic"><span class="ts tg">Phone</span><span class="fs2">${esc(lead.phone||'-')}</span></div>
    ${wechatRow}
    <div class="flex jb aic mt2"><span class="ts tg">Interest</span><span class="fs2">${interestLabel}</span></div>
  </div>

  <div class="card" style="background:var(--primary-light)">
    <div class="flex aic jb">
      <div>
        <div class="ts tg">Source (First Touch)</div>
        <div class="fb mt2">${esc(lead.firstTouch?.channel || '-')}</div>
        <div class="ts tg">${fmtD(lead.firstTouch?.date || '')} &middot; ${activity ? esc(activity.name) : '-'}</div>
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
      <div class="sb-item ${lead.status==='active'?'active':''}" onclick="quickUpdateLeadStatus('${lead.id}','active')">Active</div>
      <div class="sb-item ${lead.status==='submitted'?'active':''}" style="${lead.status==='submitted'?'border-color:var(--purple);color:var(--purple);background:#F3F0FF':''}" onclick="quickUpdateLeadStatus('${lead.id}','submitted')">Submitted</div>
      <div class="sb-item ${lead.status==='settled'?'active settled':''}" onclick="quickUpdateLeadStatus('${lead.id}','settled')">Settled</div>
      <div class="sb-item ${lead.status==='lost'?'active lost':''}" onclick="quickUpdateLeadStatus('${lead.id}','lost')">Lost</div>
    </div>
  </div>

  <div class="card">
    <div class="section-title">Notes (${Array.isArray(notes) ? notes.length : 0})</div>
    <div class="tl">${notesHtml}</div>
  </div>`;
}

// Quick status update for management
async function quickUpdateLeadStatus(leadId, status) {
  try {
    await DataService.updateLeadStatus(leadId, status);
    showToast('Status updated to ' + status, 'success');
    render();
  } catch (err) {
    showToast('Failed to update status: ' + err.message, 'error');
  }
}

// ============ REPORTS ============
function renderMgmtReports() {
  return `
  <div class="page-head"><h2>Reports</h2></div>
  <div class="fbar">
    <select><option>All Activities</option></select>
    <select><option>All Advisers</option></select>
    <input type="date" title="From"><input type="date" title="To">
    <select><option>All Sources</option></select>
    <select><option>All Statuses</option></select>
    <button class="btn btn-primary btn-sm" style="width:auto">Generate Report</button>
  </div>
  <div class="card">
    <div class="section-title">Quick Reports</div>
    <div class="quick-grid">
      <div class="quick-card" onclick="showToast('Report generation coming in Phase 2','info')"><div class="qc-ic">&#128466;</div><div class="qc-lbl">Activity Report</div></div>
      <div class="quick-card" onclick="showToast('Report generation coming in Phase 2','info')"><div class="qc-ic">&#128202;</div><div class="qc-lbl">Adviser Report</div></div>
      <div class="quick-card" onclick="showToast('Report generation coming in Phase 2','info')"><div class="qc-ic">&#128200;</div><div class="qc-lbl">Monthly Trend</div></div>
      <div class="quick-card" onclick="showToast('Report generation coming in Phase 2','info')"><div class="qc-ic">&#128179;</div><div class="qc-lbl">ROI Summary</div></div>
    </div>
  </div>
  <div class="empty"><div class="ic">&#9776;</div>Detailed report generation coming in Phase 2</div>`;
}

// ============ SETTINGS ============
function renderMgmtSettings() {
  return `
  <div class="page-head"><h2>Settings</h2></div>
  <div class="card"><div class="section-title">General</div>
    <div class="flex jb aic" style="padding:8px 0"><span class="fs2">Company Name</span><span class="tg">EverBright Finance</span></div>
    <div class="flex jb aic" style="padding:8px 0"><span class="fs2">Default Currency</span><span class="tg">NZD ($)</span></div>
  </div>
  <div class="card"><div class="section-title">Attribution Model</div>
    <div class="flex jb aic" style="padding:8px 0"><span class="fs2">Model</span><span style="color:var(--primary);font-weight:600">First-Touch Attribution</span></div>
  </div>
  <div class="empty"><div class="ic">&#9881;</div>Full settings coming in Phase 2</div>`;
}

// ============ NEW ACTIVITY MODAL ============
async function showNewActivityModal() {
  closeModal();

  let advisers = [];
  try {
    advisers = await DataService.getAdvisers();
  } catch (e) {
    console.error('Failed to load advisers:', e);
  }

  const today = new Date().toISOString().slice(0, 10);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card modal-card-wide" onclick="event.stopPropagation()">
      <h3><button class="modal-close" onclick="closeModal()">&times;</button>New Activity</h3>
      <form onsubmit="event.preventDefault(); saveNewActivity();">
        <div class="form-group">
          <label>Activity Name *</label>
          <input type="text" id="act-name" placeholder="e.g. Chinese Expo 2026" required>
        </div>
        <div class="form-group">
          <label>Category</label>
          <div class="seg" id="act-category-seg">
            <div class="seg-item active" data-value="event" onclick="selSeg(this)">Event</div>
            <div class="seg-item" data-value="ongoing" onclick="selSeg(this)">Ongoing Source</div>
          </div>
        </div>
        <div class="form-group">
          <label>Type</label>
          <div class="seg seg-wrap" id="act-type-seg">
            ${ACT_TYPES_LIST.map((t, i) => `<div class="seg-item ${i===0?'active':''}" data-value="${t.key}" onclick="selSeg(this)">${t.label}</div>`).join('')}
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Start Date *</label>
            <input type="date" id="act-start" value="${today}" required>
          </div>
          <div class="form-group">
            <label>End Date</label>
            <input type="date" id="act-end" value="${today}">
          </div>
        </div>
        <div class="form-group">
          <label>Location</label>
          <input type="text" id="act-location" placeholder="e.g. ASB Showgrounds, Auckland">
        </div>
        <div class="form-group">
          <label>Marketing Budget (NZD)</label>
          <input type="number" id="act-budget" placeholder="5000" min="0" step="100">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="act-description" rows="3" placeholder="Brief description..." style="width:100%;padding:12px;border:1px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;"></textarea>
        </div>
        <div class="form-group">
          <label style="font-weight:600;font-size:14px;color:var(--text);margin-bottom:10px;display:block">Assign Advisers</label>
          <div class="assign-adviser-list">
            ${advisers.map(a => `
              <div class="assign-adviser-row">
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="width:32px;height:32px;border-radius:50%;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0">${init2(a.displayName || a.email || '')}</div>
                  <div style="font-size:13px;font-weight:500;color:var(--text)">${esc(a.displayName || a.email)}</div>
                </div>
                <input type="checkbox" class="adv-checkbox" data-uid="${a.uid || a.id}" style="width:18px;height:18px;cursor:pointer">
              </div>
            `).join('')}
            ${advisers.length === 0 ? '<div style="color:var(--text-muted);font-size:13px;padding:8px 0">No advisers found</div>' : ''}
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-cancel" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn-save">Create Activity</button>
        </div>
      </form>
    </div>`;
  overlay.addEventListener('click', closeModal);
  document.body.appendChild(overlay);
}

function closeModal() {
  const el = document.getElementById('modal-overlay');
  if (el) el.remove();
}

async function saveNewActivity() {
  const name = document.getElementById('act-name').value.trim();
  const category = getSegValue('act-category-seg') || 'event';
  const type = getSegValue('act-type-seg') || 'expo';
  const startDate = document.getElementById('act-start').value;
  const endDate = document.getElementById('act-end').value;
  const location = document.getElementById('act-location').value.trim();
  const budget = parseInt(document.getElementById('act-budget').value) || 0;
  const description = document.getElementById('act-description').value.trim();

  const assignedAdvisers = [];
  document.querySelectorAll('.adv-checkbox:checked').forEach(cb => {
    assignedAdvisers.push(cb.getAttribute('data-uid'));
  });

  if (!name || !startDate) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    await DataService.createActivity({
      name, category, type, status: 'active',
      startDate, endDate, location, budget, description,
      assignedAdvisers, channel: type
    });
    closeModal();
    showToast('Activity created successfully!', 'success');
    render();
  } catch (err) {
    showToast('Failed to create activity: ' + err.message, 'error');
  }
}

// ============ UTILITIES ============
function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function fmtM(n) {
  if (!n || n === 0) return '$0';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

function fmtMF(n) {
  if (!n || n === 0) return '$0';
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n.toLocaleString();
}

function fmtD(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return d;
  return date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDS(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date)) return d;
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return fmtD(d);
}

function init2(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function badge(color, text) {
  const colorMap = {
    blue: { bg: '#E0F0FF', fg: 'var(--primary)' },
    green: { bg: '#E6F9ED', fg: 'var(--success)' },
    purple: { bg: '#F3F0FF', fg: 'var(--purple)' },
    red: { bg: '#FEE2E2', fg: 'var(--danger)' },
    gray: { bg: '#F1F5F9', fg: 'var(--g500)' },
    warning: { bg: '#FEF3C7', fg: '#D97706' },
    teal: { bg: '#CCFBF1', fg: 'var(--teal)' },
  };
  const c = colorMap[color] || colorMap.gray;
  return `<span class="badge" style="background:${c.bg};color:${c.fg}">${text}</span>`;
}
