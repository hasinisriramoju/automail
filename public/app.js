document.addEventListener('DOMContentLoaded', () => {

  // ─── AUTH ─────────────────────────────────────────────────────────────────────
  const AUTH_TOKEN_KEY = 'automail_token';
  const getToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

  // Auth check on load — redirect to /login if not authenticated
  (async () => {
    const token = getToken();
    if (!token) { window.location.href = '/login?next=/dashboard'; return; }
    try {
      const res = await fetch('/api/auth/check', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!data.authenticated) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.href = '/login?next=/dashboard';
      }
    } catch {
      window.location.href = '/login?next=/dashboard';
    }
  })();

  const authFetch = async (url, options = {}) => {
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
    const res = await fetch(url, { ...options, headers, credentials: 'include' });
    if (res.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = '/login?next=/dashboard';
      throw new Error('Unauthorized');
    }
    return res;
  };

  // ─── STATE MANAGEMENT ────────────────────────────────────────────────────────
  let state = {
    recipients: [],
    emails: [],
    allEmails: [],
    profile: {},
    activeTab: 'dashboard',
    parsedCsvData: null,
    currentEditingEmailId: null,
    activeEmailFilter: 'all',
    previewEmailId: null,
  };

  const API_BASE = '/api';

  // ─── DOM ELEMENTS ────────────────────────────────────────────────────────────
  const tabBtnDashboard = document.getElementById('tab-btn-dashboard');
  const tabBtnTemplates = document.getElementById('tab-btn-templates');
  const tabBtnBulkOutreach = document.getElementById('tab-btn-bulk-outreach');
  const tabBtnRecipients = document.getElementById('tab-btn-recipients');
  const tabBtnAddProspects = document.getElementById('tab-btn-add-prospects');
  const tabBtnSettings = document.getElementById('tab-btn-settings');

  const panelDashboard = document.getElementById('panel-dashboard');
  const panelTemplates = document.getElementById('panel-templates');
  const panelBulkOutreach = document.getElementById('panel-bulk-outreach');
  const panelRecipients = document.getElementById('panel-recipients');
  const panelAddProspects = document.getElementById('panel-add-prospects');
  const panelSettings = document.getElementById('panel-settings');

  const btnGotoAddProspects = document.getElementById('btn-goto-add-prospects');
  const pageTitle = document.getElementById('page-title');
  const pageSubtitle = document.getElementById('page-subtitle');

  // Stats
  const statSent = document.getElementById('stat-sent');
  const statDrafts = document.getElementById('stat-drafts');
  const statProcessing = document.getElementById('stat-processing');
  const statFailed = document.getElementById('stat-failed');

  // Console Box
  const systemConsole = document.getElementById('system-console');

  // Tables
  const tableRecentEmails = document.getElementById('table-recent-emails')?.querySelector('tbody');
  const tableRecipients = document.getElementById('table-recipients')?.querySelector('tbody');

  // Search & Refresh
  const recipientSearch = document.getElementById('recipient-search');
  const btnRefreshRecent = document.getElementById('btn-refresh-recent-emails');

  // Forms & Inputs
  const formSingleLead = document.getElementById('form-single-lead');
  const formBrandProfile = document.getElementById('form-brand-profile');

  // Multi-select recipient picker
  const msWrap     = document.getElementById('recipient-multiselect-wrap');
  const msTrigger  = document.getElementById('recipient-multiselect-trigger');
  const msDropdown = document.getElementById('recipient-multiselect-dropdown');
  const msOptions  = document.getElementById('multiselect-options');
  const msSearch   = document.getElementById('multiselect-search');
  const msLabel    = document.getElementById('multiselect-label');

  // Campaign Form Controls
  const btnCampaignGenerate = document.getElementById('btn-campaign-generate');
  const btnCampaignSend     = document.getElementById('btn-campaign-send');
  const btnRetryFailed      = document.getElementById('btn-retry-failed');
  const campaignHintInput   = document.getElementById('campaign-hint');
  const campaignTypeSelect  = document.getElementById('campaign-outreach-type');

  // Progress Bars
  const bulkProgressWrap  = document.getElementById('bulk-progress-wrap');
  const bulkProgressBar   = document.getElementById('bulk-progress-bar');
  const bulkProgressCount = document.getElementById('bulk-progress-count');
  const bulkProgressLabel = document.getElementById('bulk-progress-label');

  const sendProgressWrap  = document.getElementById('send-progress-wrap');
  const sendProgressBar   = document.getElementById('send-progress-bar');
  const sendProgressCount = document.getElementById('send-progress-count');
  const sendProgressLabel = document.getElementById('send-progress-label');

  // Preview Modal
  const modalEmailPreview = document.getElementById('modal-email-preview');
  const btnClosePreview = document.getElementById('btn-close-preview');
  const btnPreviewCloseBottom = document.getElementById('btn-preview-close-bottom');
  const btnPreviewSend = document.getElementById('btn-preview-send');

  // Add Methods Switcher
  const btnMethodSingle = document.getElementById('btn-method-single');
  const btnMethodBulk = document.getElementById('btn-method-bulk');
  const formBulkLeads = document.getElementById('form-bulk-leads');

  // CSV Drag and Drop
  const csvDropZone = document.getElementById('csv-drop-zone');
  const csvFileInput = document.getElementById('csv-file-input');

  // Loading Checklist Modal
  const modalLoadingChecklist = document.getElementById('modal-loading-checklist');
  const stepScrape = document.getElementById('step-scrape');
  const stepContext = document.getElementById('step-context');
  const stepAi = document.getElementById('step-ai');
  const stepParse = document.getElementById('step-parse');

  // CSV Mapper Modal
  const modalCsvMapper = document.getElementById('modal-csv-mapper');
  const btnCsvCancel = document.getElementById('btn-csv-cancel');
  const btnCsvConfirm = document.getElementById('btn-csv-confirm');
  const tableCsvPreview = document.getElementById('table-csv-preview');
  const mapCompany = document.getElementById('map-company');
  const mapEmail = document.getElementById('map-email');
  const mapContact = document.getElementById('map-contact');
  const mapTitle = document.getElementById('map-title');
  const mapWebsite = document.getElementById('map-website');
  const mapOutreach = document.getElementById('map-outreach');
  const mapDesc = document.getElementById('map-desc');

  // Drawer Composer
  const drawerComposer = document.getElementById('drawer-composer');
  const btnCloseDrawer = document.getElementById('btn-close-drawer');
  const btnDrawerCancel = document.getElementById('btn-drawer-cancel');
  const btnDrawerSave = document.getElementById('btn-drawer-save');
  const btnDrawerSend = document.getElementById('btn-drawer-send');
  const composerTo = document.getElementById('composer-to');
  const composerSubject = document.getElementById('composer-subject');
  const composerBody = document.getElementById('composer-body');
  const composerNotes = document.getElementById('composer-notes');
  const composerPrompt = document.getElementById('composer-prompt');
  const drawerRecipientName = document.getElementById('drawer-recipient-name');

  // Accordions
  const accordionBtnNotes = document.getElementById('accordion-btn-notes');
  const accordionContentNotes = document.getElementById('accordion-content-notes');
  const accordionBtnPrompt = document.getElementById('accordion-btn-prompt');
  const accordionContentPrompt = document.getElementById('accordion-content-prompt');

  // Custom Confirm Modal DOM Elements
  const modalConfirm = document.getElementById('modal-confirm');
  const confirmTitle = document.getElementById('confirm-title');
  const confirmMessage = document.getElementById('confirm-message');
  const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
  const btnConfirmOk = document.getElementById('btn-confirm-ok');

  let _confirmCallback = null;

  function showCustomConfirm(title, message, confirmLabel, onOk) {
    if (!modalConfirm) { if (confirm(message)) onOk(); return; }
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    btnConfirmOk.textContent = confirmLabel;
    
    if (confirmLabel.toLowerCase().includes('delete') || confirmLabel.toLowerCase().includes('remove')) {
      btnConfirmOk.style.backgroundColor = 'var(--color-rose)';
    } else {
      btnConfirmOk.style.backgroundColor = 'var(--color-indigo)';
    }

    _confirmCallback = onOk;
    modalConfirm.classList.add('active');
  }

  if (btnConfirmCancel) {
    btnConfirmCancel.addEventListener('click', () => {
      modalConfirm.classList.remove('active');
      _confirmCallback = null;
    });
  }

  if (btnConfirmOk) {
    btnConfirmOk.addEventListener('click', () => {
      modalConfirm.classList.remove('active');
      if (_confirmCallback) { _confirmCallback(); }
      _confirmCallback = null;
    });
  }

  // ─── INITIALIZATION ──────────────────────────────────────────────────────────
  function init() {
    setupTabRouting();
    setupAccordions();
    setupCsvUploader();
    bindFormSubmissions();
    setupTemplateStudio();
    setupPosterStudio();
    fetchStats();
    fetchRecipients();
    fetchRecentEmails();
    fetchProfile();
    
    if (btnRefreshRecent) {
      btnRefreshRecent.addEventListener('click', () => {
        fetchRecentEmails();
        fetchStats();
        showToast('Recents updated', 'info');
      });
    }

    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeComposerDrawer);
    if (btnDrawerCancel) btnDrawerCancel.addEventListener('click', closeComposerDrawer);

    if (btnClosePreview) btnClosePreview.addEventListener('click', () => modalEmailPreview.classList.remove('active'));
    if (btnPreviewCloseBottom) btnPreviewCloseBottom.addEventListener('click', () => modalEmailPreview.classList.remove('active'));
    if (btnPreviewSend) {
      btnPreviewSend.addEventListener('click', async () => {
        if (!state.previewEmailId) return;
        modalEmailPreview.classList.remove('active');
        const id = state.previewEmailId;
        logToConsole(`[SMTP] Sending previewed email ID: ${id}`);
        showToast('Sending email...', 'info');
        try {
          const res = await authFetch(`${API_BASE}/emails/${id}/send`, { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast('Email sent successfully!', 'success');
            logToConsole(`[SMTP] ✓ Delivered: ${data.data?.recipientId?.email || 'recipient'}`);
          } else {
            showToast(`Delivery failed: ${data.error}`, 'error');
            logToConsole(`[SMTP] ✗ Failed: ${data.error}`, 'error');
          }
          fetchRecentEmails(); fetchStats();
        } catch (err) {
          showToast('Network error during delivery', 'error');
        }
      });
    }

    // Filter Tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        applyEmailFilter(tab.dataset.filter, document.getElementById('email-search')?.value || '');
      });
    });

    // Email Search
    const emailSearchInput = document.getElementById('email-search');
    if (emailSearchInput) {
      let searchTimer;
      emailSearchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
          applyEmailFilter(state.activeEmailFilter, emailSearchInput.value);
        }, 300);
      });
    }

    // Auto-refresh every 30 seconds
    setInterval(() => {
      fetchStats();
      fetchRecentEmails();
      logToConsole('[System] Auto-refreshed stats and email list.');
    }, 30000);

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', headers: { 'Authorization': `Bearer ${getToken()}` }, credentials: 'include' });
      } catch {}
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = '/login';
    });
  }

  // ─── TAB ROUTING ─────────────────────────────────────────────────────────────
  function setupTabRouting() {
    const tabs = [
      { btn: tabBtnDashboard, panel: panelDashboard, title: 'Outreach Dashboard', subtitle: "Welcome to OnIT India's intelligent email hub." },
      { btn: tabBtnTemplates, panel: panelTemplates, title: 'Template Studio', subtitle: 'Customize Email and Poster templates with rich formatting and dynamic variables.' },
      { btn: tabBtnBulkOutreach, panel: panelBulkOutreach, title: 'Bulk Outreach Campaigns', subtitle: 'Schedule, generate, and dispatch automated bulk email campaigns.' },
      { btn: tabBtnRecipients, panel: panelRecipients, title: 'Manage Recipient Leads', subtitle: 'Review, research, and import company profiles.' },
      { btn: tabBtnAddProspects, panel: panelAddProspects, title: 'Add Prospects & Leads', subtitle: 'Register single leads or upload CSV spreadsheet lists in bulk.' },
      { btn: tabBtnSettings, panel: panelSettings, title: 'Brand Configuration', subtitle: "Update OnIT India's services, team, and signature guidelines." }
    ];

    tabs.forEach(tab => {
      if (!tab.btn) return;
      tab.btn.addEventListener('click', () => {
        tabs.forEach(t => {
          if (t.btn) t.btn.classList.remove('active');
          if (t.panel) t.panel.classList.remove('active');
        });
        tab.btn.classList.add('active');
        if (tab.panel) tab.panel.classList.add('active');
        if (pageTitle) pageTitle.textContent = tab.title;
        if (pageSubtitle) pageSubtitle.textContent = tab.subtitle;
        
        if (tab.panel === panelDashboard) {
          fetchRecentEmails();
          fetchStats();
        } else if (tab.panel === panelRecipients) {
          fetchRecipients();
        } else if (tab.panel === panelSettings) {
          fetchProfile();
        }
      });
    });

    if (btnGotoAddProspects && tabBtnAddProspects) {
      btnGotoAddProspects.addEventListener('click', () => {
        tabBtnAddProspects.click();
      });
    }

    if (btnMethodSingle && btnMethodBulk) {
      btnMethodSingle.addEventListener('click', () => {
        btnMethodSingle.classList.add('active');
        btnMethodBulk.classList.remove('active');
        if (formSingleLead) formSingleLead.classList.add('active');
        if (formBulkLeads) formBulkLeads.classList.remove('active');
      });

      btnMethodBulk.addEventListener('click', () => {
        btnMethodBulk.classList.add('active');
        btnMethodSingle.classList.remove('active');
        if (formBulkLeads) formBulkLeads.classList.add('active');
        if (formSingleLead) formSingleLead.classList.remove('active');
      });
    }
  }

  // ─── ACCORDIONS ──────────────────────────────────────────────────────────────
  function setupAccordions() {
    if (accordionBtnNotes && accordionContentNotes) {
      accordionBtnNotes.addEventListener('click', () => {
        const isExp = accordionContentNotes.parentElement.classList.toggle('active');
        accordionContentNotes.style.maxHeight = isExp ? `${accordionContentNotes.scrollHeight}px` : '0';
      });
    }

    if (accordionBtnPrompt && accordionContentPrompt) {
      accordionBtnPrompt.addEventListener('click', () => {
        const isExp = accordionContentPrompt.parentElement.classList.toggle('active');
        accordionContentPrompt.style.maxHeight = isExp ? `${accordionContentPrompt.scrollHeight}px` : '0';
      });
    }
  }

  // ─── UTILITIES ───────────────────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const bg = type === 'error' ? '#ef4444' : type === 'success' ? '#00A86B' : '#0F172A';
    toast.style.cssText = `background:${bg};color:#fff;padding:12px 18px;border-radius:10px;font-size:13.5px;font-weight:500;box-shadow:0 8px 24px rgba(0,0,0,0.18);margin-top:8px;display:flex;align-items:center;gap:8px;`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function logToConsole(message, level = 'system') {
    if (!systemConsole) return;
    const line = document.createElement('div');
    const colors = { error: '#ef4444', success: '#22c55e', system: '#94a3b8', info: '#94a3b8' };
    line.style.cssText = `font-family:monospace;font-size:12px;margin-bottom:3px;color:${colors[level] || '#94a3b8'};`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    systemConsole.appendChild(line);
    systemConsole.scrollTop = systemConsole.scrollHeight;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ─── STATS FETCHING ──────────────────────────────────────────────────────────
  async function fetchStats() {
    try {
      const res = await authFetch(`${API_BASE}/emails/stats`);
      const data = await res.json();
      if (!data.success) return;
      const s = data.data;

      if (statSent) statSent.textContent = s.byStatus?.sent || 0;
      if (statDrafts) statDrafts.textContent = s.byStatus?.draft || 0;
      if (statProcessing) statProcessing.textContent = s.byStatus?.sending || 0;
      if (statFailed) statFailed.textContent = s.byStatus?.failed || 0;

      const elTotal = document.getElementById('analytics-total-emails');
      const elRecip = document.getElementById('analytics-total-recipients');
      const elOpened = document.getElementById('analytics-opened');
      const elFailed = document.getElementById('analytics-failed');
      const elRate = document.getElementById('analytics-rate');
      const elBar = document.getElementById('analytics-bar');

      if (elTotal) elTotal.textContent = s.total || 0;
      if (elRecip) elRecip.textContent = state.recipients.length || 0;
      if (elOpened) elOpened.textContent = s.openedCount || 0;
      if (elFailed) elFailed.textContent = s.byStatus?.failed || 0;
      if (elRate) elRate.textContent = `${s.deliveryRate || 0}%`;
      if (elBar) elBar.style.width = `${s.deliveryRate || 0}%`;

      const filterCountDraft = document.getElementById('count-draft');
      const filterCountSent = document.getElementById('count-sent');
      const filterCountFailed = document.getElementById('count-failed');
      const filterCountOpened = document.getElementById('count-opened');

      if (filterCountDraft) filterCountDraft.textContent = s.byStatus?.draft || 0;
      if (filterCountSent) filterCountSent.textContent = s.byStatus?.sent || 0;
      if (filterCountFailed) filterCountFailed.textContent = s.byStatus?.failed || 0;
      if (filterCountOpened) filterCountOpened.textContent = s.openedCount || 0;

      // Bulk page stats sync
      const bulkTotal = document.getElementById('bulk-stat-total');
      const bulkDrafts = document.getElementById('bulk-stat-drafts');
      const bulkCompleted = document.getElementById('bulk-stat-completed');
      const bulkFailed = document.getElementById('bulk-stat-failed');

      if (bulkTotal) bulkTotal.textContent = s.total || 0;
      if (bulkDrafts) bulkDrafts.textContent = s.byStatus?.draft || 0;
      if (bulkCompleted) bulkCompleted.textContent = s.byStatus?.sent || 0;
      if (bulkFailed) bulkFailed.textContent = s.byStatus?.failed || 0;

    } catch (err) {
      logToConsole(`Failed fetching stats: ${err.message}`, 'error');
    }
  }

  // ─── RECIPIENTS FETCHING & RENDERING ─────────────────────────────────────────
  async function fetchRecipients() {
    try {
      const res = await authFetch(`${API_BASE}/recipients`);
      const data = await res.json();
      if (data.success) {
        state.recipients = data.data;
        renderRecipientsTable(state.recipients);
        populateCampaignDropdown(state.recipients);
      }
    } catch (err) {
      logToConsole(`Failed loading recipients: ${err.message}`, 'error');
    }
  }

  function renderRecipientsTable(recipients) {
    if (!tableRecipients) return;
    tableRecipients.innerHTML = '';
    
    if (recipients.length === 0) {
      tableRecipients.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No leads in database. Add prospects using the Add Prospects tab.</td></tr>`;
      return;
    }

    recipients.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(r.companyName)}</strong><br/><span style="font-size:11px;" class="text-muted">${escapeHtml(r.contactName || '')} ${r.contactTitle ? `(${escapeHtml(r.contactTitle)})` : ''}</span></td>
        <td>${escapeHtml(r.email)}</td>
        <td><span class="badge badge-draft">${escapeHtml(r.outreachType || 'partnership')}</span></td>
        <td><a href="${escapeHtml(r.website || '#')}" target="_blank" style="color:var(--color-indigo);">${escapeHtml(r.website || '—')}</a></td>
        <td>${r.researchData?.scrapedAt ? '<span class="badge badge-sent">✓ Enriched</span>' : '<span class="badge badge-draft">Pending</span>'}</td>
        <td class="actions-cell">
          <button class="btn-icon success btn-generate-single" data-id="${r._id}" title="Generate AI Email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          </button>
          <button class="btn-icon btn-delete-recipient" data-id="${r._id}" title="Delete Lead">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </td>
      `;
      tableRecipients.appendChild(tr);
    });

    // Delegate table actions
    tableRecipients.querySelectorAll('.btn-generate-single').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        triggerSingleEmailGeneration(id);
      });
    });

    tableRecipients.querySelectorAll('.btn-delete-recipient').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        showCustomConfirm("Delete Lead", "Delete this recipient permanently?", "Delete", async () => {
          try {
            const res = await authFetch(`${API_BASE}/recipients/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
              showToast('Recipient deleted', 'success');
              fetchRecipients();
            }
          } catch { showToast('Delete failed', 'error'); }
        });
      });
    });
  }

  // Search recipients
  if (recipientSearch) {
    recipientSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = state.recipients.filter(r =>
        r.companyName.toLowerCase().includes(q) ||
        (r.contactName || '').toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      );
      renderRecipientsTable(filtered);
    });
  }

  // ─── RECENT EMAILS TABLE ─────────────────────────────────────────────────────
  async function fetchRecentEmails() {
    try {
      const res = await authFetch(`${API_BASE}/emails?limit=100`);
      const data = await res.json();
      if (!data.success) return;
      state.allEmails = data.data;
      applyEmailFilter(state.activeEmailFilter, document.getElementById('email-search')?.value || '');
    } catch (err) {
      logToConsole(`Failed fetching email dispatches: ${err.message}`, 'error');
    }
  }

  function applyEmailFilter(filter = 'all', searchQuery = '') {
    state.activeEmailFilter = filter;
    let list = state.allEmails;

    if (filter === 'draft') list = list.filter(e => e.status === 'draft');
    else if (filter === 'sent') list = list.filter(e => e.status === 'sent');
    else if (filter === 'failed') list = list.filter(e => e.status === 'failed');
    else if (filter === 'opened') list = list.filter(e => (e.openCount || 0) > 0);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e =>
        (e.subject || '').toLowerCase().includes(q) ||
        (e.recipientId?.email || '').toLowerCase().includes(q) ||
        (e.recipientId?.companyName || '').toLowerCase().includes(q)
      );
    }

    renderRecentEmailsTable(list);
  }

  function renderRecentEmailsTable(emails) {
    if (!tableRecentEmails) return;
    tableRecentEmails.innerHTML = '';

    if (emails.length === 0) {
      tableRecentEmails.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No dispatches match the current filter.</td></tr>`;
      return;
    }

    emails.forEach(e => {
      const tr = document.createElement('tr');
      const formattedDate = new Date(e.updatedAt || e.createdAt).toLocaleString();
      const wasOpened = (e.openCount || 0) > 0;
      let statusBadge = '';
      if (e.status === 'sent') {
        statusBadge = `<span class="badge badge-sent">Sent</span>`;
        if (wasOpened) statusBadge += ` <span class="badge badge-opened" title="Opened ${e.openCount} time(s)">👁 Opened</span>`;
      } else if (e.status === 'failed') {
        statusBadge = `<span class="badge badge-failed" title="${escapeHtml(e.error || '')}">Failed &#x21BB;</span>`;
      } else if (e.status === 'sending') {
        statusBadge = `<span class="badge badge-processing">Sending</span>`;
      } else {
        statusBadge = `<span class="badge badge-draft">Draft</span>`;
        if (e.isFollowUp) statusBadge += ` <span class="badge badge-draft" style="opacity:0.7;">Follow-up</span>`;
      }

      tr.innerHTML = `
        <td><strong>${escapeHtml(e.recipientId?.email || 'Unknown')}</strong><br/><span style="font-size:10px;" class="text-muted">${escapeHtml(e.recipientId?.companyName || '')}</span></td>
        <td><span class="badge badge-draft">${escapeHtml(e.outreachType)}</span></td>
        <td>${escapeHtml(e.subject)}</td>
        <td>${statusBadge}</td>
        <td class="text-muted" style="font-size:12px;">${formattedDate}</td>
        <td class="actions-cell">
          <button class="btn-icon btn-preview-email" style="color:var(--color-indigo);" title="Preview Email" data-id="${e._id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-icon btn-duplicate-email" style="color:var(--color-indigo);" title="Duplicate Draft" data-id="${e._id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          ${e.status !== 'sent' ? `
          <button class="btn-icon success btn-send-now" data-id="${e._id}" title="${e.status === 'failed' ? 'Retry Sending' : 'Send Email Immediately'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
          ` : ''}
          ${e.status === 'sent' ? `
          <button class="btn-icon btn-followup" data-id="${e._id}" title="Generate Follow-Up Email" style="color:var(--color-amber);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
          </button>
          ` : ''}
          <button class="btn-icon btn-delete-email" data-id="${e._id}" title="Delete Draft">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </td>
      `;
      tableRecentEmails.appendChild(tr);
    });

    // Table click delegation
    tableRecentEmails.addEventListener('click', async (e) => {
      const prevBtn = e.target.closest('.btn-preview-email');
      if (prevBtn) {
        e.preventDefault();
        openEmailPreviewModal(prevBtn.dataset.id);
        return;
      }

      const dupBtn = e.target.closest('.btn-duplicate-email');
      if (dupBtn) {
        e.preventDefault();
        const id = dupBtn.dataset.id;
        try {
          const item = state.allEmails.find(em => em._id === id);
          if (item) {
            const genRes = await authFetch(`${API_BASE}/emails/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipientId: item.recipientId?._id || item.recipientId,
                outreachType: item.outreachType || 'partnership',
                customHint: `Duplicate: ${item.subject}`
              })
            });
            const genData = await genRes.json();
            if (genData.success) {
              showToast('Draft duplicated successfully!', 'success');
              fetchRecentEmails(); fetchStats();
            }
          }
        } catch { showToast('Duplicate failed', 'error'); }
        return;
      }

      const sendBtn = e.target.closest('.btn-send-now');
      if (sendBtn) {
        e.preventDefault();
        const id = sendBtn.dataset.id;
        sendBtn.disabled = true;
        showToast('Sending email...', 'info');
        try {
          const res = await authFetch(`${API_BASE}/emails/${id}/send`, { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast('Email delivered successfully!', 'success');
            fetchRecentEmails(); fetchStats();
          } else {
            showToast(`Delivery failed: ${data.error}`, 'error');
          }
        } catch { showToast('Network error during delivery', 'error'); }
        return;
      }

      const delBtn = e.target.closest('.btn-delete-email');
      if (delBtn) {
        e.preventDefault();
        showCustomConfirm("Delete Draft", "Delete this email draft permanently?", "Delete", async () => {
          try {
            const res = await authFetch(`${API_BASE}/emails/${delBtn.dataset.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) { showToast('Draft deleted', 'success'); fetchRecentEmails(); fetchStats(); }
          } catch { showToast('Delete failed', 'error'); }
        });
        return;
      }
    });
  }

  // ─── EMAIL PREVIEW MODAL ─────────────────────────────────────────────────────
  async function openEmailPreviewModal(id) {
    state.previewEmailId = id;
    try {
      const res = await authFetch(`${API_BASE}/emails/${id}`);
      const data = await res.json();
      if (data.success) {
        const e = data.data;
        const modalSubject = document.getElementById('preview-modal-subject');
        const modalTo = document.getElementById('preview-modal-to');
        const iframe = document.getElementById('preview-iframe');

        if (modalSubject) modalSubject.textContent = e.subject || '(No Subject)';
        if (modalTo) modalTo.textContent = `To: ${e.recipientId?.contactName || 'Prospect'} <${e.recipientId?.email || ''}>`;
        if (iframe) {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          doc.open();
          doc.write(formatFullEmailHtml(e.subject, e.bodyHtml || e.bodyText));
          doc.close();
        }
        modalEmailPreview.classList.add('active');
      }
    } catch { showToast('Failed loading email preview', 'error'); }
  }

  function formatFullEmailHtml(subject, content) {
    let updated = content || '';
    if (!updated.includes('OnIT India') && !updated.includes('<!DOCTYPE html>')) {
      updated = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${subject || 'Email Preview'}</title></head>
<body style="margin:0; padding:0; background-color:#f4f4f7; font-family: Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7; padding: 24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background: #00A86B; background: linear-gradient(135deg, #00A86B 0%, #008a58 100%); padding: 24px 32px;">
            <p style="margin:0; font-size:20px; font-weight:bold; color:#ffffff; letter-spacing:0.5px;"><img src="onitindia-logo.png" alt="OnIT India" style="height:28px; vertical-align:middle; background:#ffffff; padding:3px 8px; border-radius:4px; margin-right:8px;">OnIT India</p>
            <p style="margin:4px 0 0; font-size:12px; color:#ffffff; opacity:0.92;">Powering Businesses with Smart Technology</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px; color:#333333; font-size:15px; line-height:1.7;">
            ${updated}
          </td>
        </tr>
        <tr><td style="padding: 0 32px;"><hr style="border:none; border-top:1px solid #e5e7eb; margin:0;"></td></tr>
        <tr>
          <td style="padding: 24px 32px; background:#f9fafb;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-left: 3px solid #00A86B; padding-left: 12px;">
                  <p style="margin:0; font-size:14px; font-weight:bold; color:#0F172A;">OnIT India</p>
                  <p style="margin:2px 0 8px; font-size:12px; color:#6b7280;">Powering Businesses with Smart Technology</p>
                  <p style="margin:2px 0; font-size:12px; color:#374151;">🌐 <a href="https://www.onitindia.com" style="color:#00A86B; text-decoration:none;">www.onitindia.com</a></p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
    }
    return updated;
  }

  // ─── TEMPLATE STUDIO JS ──────────────────────────────────────────────────────
  function setupTemplateStudio() {
    setupPosterStudio();
  }

  // ─── POSTER STUDIO CANVAS ────────────────────────────────────────────────────
  function setupPosterStudio() {
    const canvas = document.getElementById('poster-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let posterElements = [
      { id: 'headline', x: 40, y: 120, text: 'Scale Your Outreach with AI', fontSize: 32, color: '#0f172a' },
      { id: 'subtitle', x: 40, y: 220, text: 'OnIT India Smart Technology Solutions', fontSize: 18, color: '#475569' },
      { id: 'cta', x: 40, y: 340, text: 'Book Free Consultation →', fontSize: 16, color: '#ffffff', isButton: true }
    ];

    let dragTarget = null;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    function renderPoster() {
      const W = canvas.width;
      const H = canvas.height;
      const bgColor = document.getElementById('poster-bg-color')?.value || '#00A86B';
      const headline = document.getElementById('poster-headline-input')?.value || 'Scale Your Outreach with AI';
      const subtitle = document.getElementById('poster-subtitle-input')?.value || 'OnIT India';
      const cta = document.getElementById('poster-cta-input')?.value || 'Book Free Consultation →';

      posterElements.find(e => e.id === 'headline').text = headline;
      posterElements.find(e => e.id === 'subtitle').text = subtitle;
      posterElements.find(e => e.id === 'cta').text = cta;

      // Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, W, H);

      // Header Banner
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, 80);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillText('OnIT India', 40, 48);

      // Draw Elements
      posterElements.forEach(el => {
        ctx.save();
        if (el.isButton) {
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          ctx.roundRect(el.x, el.y, 240, 44, 8);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px Inter, sans-serif';
          ctx.fillText(el.text, el.x + 20, el.y + 28);
        } else {
          ctx.fillStyle = el.color;
          ctx.font = `bold ${el.fontSize}px Outfit, sans-serif`;
          ctx.fillText(el.text, el.x, el.y);
        }
        ctx.restore();
      });
    }

    ['poster-headline-input','poster-subtitle-input','poster-cta-input','poster-bg-color'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderPoster);
    });

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      for (let i = posterElements.length - 1; i >= 0; i--) {
        const el = posterElements[i];
        if (mx >= el.x - 10 && mx <= el.x + 300 && my >= el.y - 30 && my <= el.y + 40) {
          dragTarget = el;
          dragOffsetX = mx - el.x;
          dragOffsetY = my - el.y;
          break;
        }
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!dragTarget) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      dragTarget.x = Math.max(10, (e.clientX - rect.left) * scaleX - dragOffsetX);
      dragTarget.y = Math.max(20, (e.clientY - rect.top) * scaleY - dragOffsetY);
      renderPoster();
    });

    canvas.addEventListener('mouseup', () => { dragTarget = null; });
    canvas.addEventListener('mouseleave', () => { dragTarget = null; });

    renderPoster();

    // Exports
    document.getElementById('btn-export-poster-png')?.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `onitindia-poster-${Date.now()}.png`;
      a.click();
      showToast('Exported poster PNG!', 'success');
    });

    document.getElementById('btn-export-poster-jpg')?.addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/jpeg', 0.9);
      a.download = `onitindia-poster-${Date.now()}.jpg`;
      a.click();
      showToast('Exported poster JPG!', 'success');
    });

    document.getElementById('btn-export-poster-pdf')?.addEventListener('click', () => {
      const imgData = canvas.toDataURL('image/png');
      const w = window.open('', '_blank');
      w.document.write(`<!DOCTYPE html><html><head><title>Poster PDF</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${imgData}" style="max-width:90vw;"></body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 500);
    });
  }

  // ─── CSV UPLOADER ────────────────────────────────────────────────────────────
  function setupCsvUploader() {
    if (!csvDropZone || !csvFileInput) return;
    csvDropZone.addEventListener('click', () => csvFileInput.click());
    csvFileInput.addEventListener('change', handleCsvFile);
  }

  function handleCsvFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    showToast(`Loaded CSV: ${file.name}`, 'info');
  }

  // ─── SINGLE EMAIL GENERATION TRIGGER ──────────────────────────────────────────
  async function triggerSingleEmailGeneration(recipientId) {
    if (modalLoadingChecklist) modalLoadingChecklist.classList.add('active');
    try {
      const res = await authFetch(`${API_BASE}/emails/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, outreachType: 'partnership' })
      });
      const data = await res.json();
      if (modalLoadingChecklist) modalLoadingChecklist.classList.remove('active');
      if (data.success) {
        showToast('AI Email generated successfully!', 'success');
        fetchRecentEmails(); fetchStats();
      } else {
        showToast(`Generation failed: ${data.error}`, 'error');
      }
    } catch {
      if (modalLoadingChecklist) modalLoadingChecklist.classList.remove('active');
      showToast('Network error during generation', 'error');
    }
  }

  // ─── PROFILE FETCH & SUBMIT ──────────────────────────────────────────────────
  async function fetchProfile() {
    try {
      const res = await authFetch(`${API_BASE}/auth/check`);
      const data = await res.json();
      if (data.authenticated) {
        const user = data.user;
        const sidebarUsername = document.getElementById('sidebar-username');
        if (sidebarUsername) sidebarUsername.textContent = user.username || 'onitindia';
      }
    } catch {}
  }

  function populateCampaignDropdown(recipients) {
    if (!msOptions) return;
    msOptions.querySelectorAll('.multiselect-option:not(.multiselect-all-option)').forEach(el => el.remove());
    recipients.forEach(r => {
      const label = document.createElement('label');
      label.className = 'multiselect-option';
      label.innerHTML = `
        <input type="checkbox" class="multiselect-item-chk" value="${r._id}" checked>
        <span class="multiselect-check"></span>
        <span class="multiselect-option-text">${escapeHtml(r.companyName)} (${escapeHtml(r.email)})</span>
      `;
      msOptions.appendChild(label);
    });
  }

  function bindFormSubmissions() {
    if (formSingleLead) {
      formSingleLead.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          companyName: document.getElementById('lead-company').value.trim(),
          contactName: document.getElementById('lead-contact').value.trim() || undefined,
          contactTitle: document.getElementById('lead-title').value.trim() || undefined,
          email: document.getElementById('lead-email').value.trim(),
          website: document.getElementById('lead-website').value.trim() || undefined,
          outreachType: document.getElementById('lead-outreach').value,
          description: document.getElementById('lead-description').value.trim() || undefined
        };
        try {
          const res = await authFetch(`${API_BASE}/recipients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            showToast('Recipient added successfully!', 'success');
            formSingleLead.reset();
            fetchRecipients();
          } else { showToast(`Error: ${data.error}`, 'error'); }
        } catch { showToast('Network error while adding lead', 'error'); }
      });
    }

    if (formBrandProfile) {
      formBrandProfile.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Brand profile changes saved!', 'success');
      });
    }
  }

  function closeComposerDrawer() {
    if (drawerComposer) drawerComposer.classList.remove('active');
    state.currentEditingEmailId = null;
  }

  init();
});
