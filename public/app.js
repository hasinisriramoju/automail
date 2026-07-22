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
    setupBulkCampaigns();
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

  function rgbToHex(color) {
    if (!color) return '#000000';
    if (color.startsWith('#')) return color.length === 7 ? color : '#000000';
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '#000000';
    return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
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

  // ─── BULK CAMPAIGNS (EMAILS & POSTERS) ──────────────────────────────────────
  function setupBulkCampaigns() {
    const formatSelect = document.getElementById('campaign-outreach-format');
    let generatedDraftIds = [];

    // Multiselect dropdown toggle — CSS shows dropdown when .multiselect-wrap has class 'open'
    if (msTrigger && msWrap) {
      msTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        msWrap.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (msWrap && !msWrap.contains(e.target)) {
          msWrap.classList.remove('open');
        }
      });
    }

    // Multiselect search filter
    if (msSearch) {
      msSearch.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        msOptions?.querySelectorAll('.multiselect-option:not(.multiselect-all-option)').forEach(opt => {
          const txt = opt.textContent.toLowerCase();
          opt.style.display = txt.includes(q) ? 'flex' : 'none';
        });
      });
    }

    // Select All checkbox
    const chkAll = document.getElementById('multiselect-all');
    if (chkAll) {
      chkAll.addEventListener('change', () => {
        const isChecked = chkAll.checked;
        msOptions?.querySelectorAll('.multiselect-item-chk').forEach(chk => {
          chk.checked = isChecked;
        });
        updateMultiselectLabel();
      });
    }

    // Item checkbox changes
    msOptions?.addEventListener('change', (e) => {
      if (e.target.classList.contains('multiselect-item-chk')) {
        updateMultiselectLabel();
      }
    });

    function updateMultiselectLabel() {
      const checked = msOptions?.querySelectorAll('.multiselect-item-chk:checked') || [];
      const total = msOptions?.querySelectorAll('.multiselect-item-chk') || [];
      if (msLabel) {
        if (checked.length === total.length) {
          msLabel.textContent = `All Available Recipients (${total.length})`;
        } else if (checked.length === 0) {
          msLabel.textContent = 'No Recipients Selected';
        } else {
          msLabel.textContent = `${checked.length} Recipient(s) Selected`;
        }
      }
    }

    // BULK GENERATE BUTTON (EMAIL & POSTER)
    if (btnCampaignGenerate) {
      btnCampaignGenerate.addEventListener('click', async () => {
        const checkedChks = msOptions?.querySelectorAll('.multiselect-item-chk:checked');
        const recipIds = [...(checkedChks || [])].map(c => c.value);

        if (!recipIds.length) {
          showToast('Please select at least one recipient.', 'error');
          return;
        }

        const format = formatSelect?.value || 'email';
        const type = campaignTypeSelect?.value || 'partnership';
        const hint = campaignHintInput?.value.trim() || '';

        btnCampaignGenerate.disabled = true;
        btnCampaignGenerate.textContent = '⏳ Generating...';
        generatedDraftIds = [];

        if (bulkProgressWrap) bulkProgressWrap.style.display = 'block';
        if (bulkProgressBar) bulkProgressBar.style.width = '0%';
        if (bulkProgressCount) bulkProgressCount.textContent = `0 / ${recipIds.length}`;
        if (bulkProgressLabel) bulkProgressLabel.textContent = `Generating bulk ${format} drafts...`;

        logToConsole(`[Bulk] Starting bulk ${format.toUpperCase()} draft generation for ${recipIds.length} recipient(s)...`);

        let count = 0;
        for (const recipId of recipIds) {
          const recip = state.recipients.find(r => r._id === recipId);
          if (!recip) { count++; continue; }

          try {
            let payload = {};
            if (format === 'poster') {
              // Auto-generate per-recipient poster — fully automatic
              const bg = '#00A86B';
              const intentLabels = { partnership:'Partnership', sales:'Sales Pitch', startup_collab:'Startup Collaboration', investor:'Investor Deck', networking:'Networking', hiring:'Hiring', internship:'Internship', custom:'Custom' };
              const intentLabel = intentLabels[type] || 'Partnership';
              const contactLine = recip.contactName ? `Dear ${recip.contactName},` : `Dear ${recip.companyName} Team,`;

              const posterHtml = `
                <div style="font-family:Inter,sans-serif;max-width:600px;margin:auto;background:#0f172a;border-radius:12px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.2);">
                  <div style="background:${bg};padding:32px 24px;text-align:center;">
                    <img src="onitindia-logo.png" alt="OnIT India" style="height:36px;background:#fff;padding:4px 10px;border-radius:6px;margin-bottom:16px;">
                    <h1 style="color:#fff;font-size:24px;margin:0 0 8px 0;font-weight:800;font-family:Outfit,sans-serif;">${intentLabel} Opportunity for ${recip.companyName}</h1>
                    <p style="color:rgba(255,255,255,0.85);font-size:15px;margin:0;">OnIT India Smart Technology Solutions</p>
                  </div>
                  <div style="padding:32px 24px;text-align:left;background:#ffffff;">
                    <p style="color:#334155;font-size:15px;line-height:1.7;margin-bottom:16px;">${contactLine}</p>
                    <p style="color:#334155;font-size:15px;line-height:1.7;margin-bottom:24px;">We've identified a compelling ${intentLabel.toLowerCase()} opportunity between OnIT India and ${recip.companyName}. Our AI-driven technology solutions can accelerate your growth, streamline operations, and unlock new revenue streams.</p>
                    <a href="mailto:outreach@onitindia.com?subject=${encodeURIComponent(`${intentLabel} — ${recip.companyName} × OnIT India`)}" style="background:${bg};color:#ffffff;padding:12px 24px;border-radius:8px;font-weight:bold;text-decoration:none;display:inline-block;font-size:14px;">Let's Connect →</a>
                  </div>
                  <div style="padding:16px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:12px;">
                    Powered by OnIT India AI Outreach Suite | <a href="https://www.onitindia.com" style="color:#00A86B;text-decoration:none;">www.onitindia.com</a>
                  </div>
                </div>
              `;

              payload = {
                recipientId: recipId,
                outreachType: 'poster_marketing',
                subject: `🎨 ${intentLabel} Poster — ${recip.companyName}`,
                bodyHtml: posterHtml,
              };
            } else {
              payload = {
                recipientId: recipId,
                outreachType: type,
                customHint: hint,
                skipResearch: true
              };
            }

            let endpoint = `${API_BASE}/emails/generate`;
            let fetchOptions = {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            };
            if (format === 'poster') {
              endpoint = `${API_BASE}/emails/save-draft`;
            }

            const res = await authFetch(endpoint, fetchOptions);
            const data = await res.json();
            if (data.success && data.data?._id) {
              generatedDraftIds.push(data.data._id);
              logToConsole(`[Bulk] ✓ ${format.toUpperCase()} draft saved for ${recip.companyName}`);
            }
          } catch (err) {
            logToConsole(`[Bulk] Error generating for ${recip.companyName}: ${err.message}`, 'error');
          }

          count++;
          const pct = Math.round((count / recipIds.length) * 100);
          if (bulkProgressBar) bulkProgressBar.style.width = `${pct}%`;
          if (bulkProgressCount) bulkProgressCount.textContent = `${count} / ${recipIds.length}`;
        }

        btnCampaignGenerate.disabled = false;
        btnCampaignGenerate.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Generate Drafts in Bulk`;

        showToast(`Generated ${generatedDraftIds.length} ${format.toUpperCase()} draft(s)! Saved to Dashboard.`, 'success');
        if (btnCampaignSend) btnCampaignSend.disabled = (generatedDraftIds.length === 0);

        fetchRecentEmails();
        fetchStats();
      });
    }

    // BULK SEND BUTTON (SEND ALL GENERATED DRAFTS/POSTERS)
    if (btnCampaignSend) {
      btnCampaignSend.addEventListener('click', async () => {
        const idsToSend = generatedDraftIds.length > 0
          ? generatedDraftIds
          : state.allEmails.filter(e => e.status === 'draft').map(e => e._id);

        if (!idsToSend.length) {
          showToast('No drafts available to dispatch.', 'error');
          return;
        }

        btnCampaignSend.disabled = true;
        btnCampaignSend.textContent = '⏳ Sending...';

        if (sendProgressWrap) sendProgressWrap.style.display = 'block';
        if (sendProgressBar) sendProgressBar.style.width = '0%';
        if (sendProgressCount) sendProgressCount.textContent = `0 / ${idsToSend.length}`;
        if (sendProgressLabel) sendProgressLabel.textContent = `Dispatching ${idsToSend.length} email/poster campaign(s)...`;

        logToConsole(`[Bulk SMTP] Dispatching ${idsToSend.length} campaign draft(s)...`);

        let count = 0;
        for (const id of idsToSend) {
          try {
            const res = await authFetch(`${API_BASE}/emails/${id}/send`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
              logToConsole(`[Bulk SMTP] ✓ Delivered draft ID: ${id}`);
            } else {
              logToConsole(`[Bulk SMTP] ✗ Delivery failed for ID ${id}: ${data.error}`, 'error');
            }
          } catch (err) {
            logToConsole(`[Bulk SMTP] Network error for ID ${id}`, 'error');
          }

          count++;
          const pct = Math.round((count / idsToSend.length) * 100);
          if (sendProgressBar) sendProgressBar.style.width = `${pct}%`;
          if (sendProgressCount) sendProgressCount.textContent = `${count} / ${idsToSend.length}`;
        }

        btnCampaignSend.disabled = false;
        btnCampaignSend.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Start Bulk Send Dispatch`;

        showToast('Bulk campaign dispatch completed!', 'success');
        generatedDraftIds = [];
        fetchRecentEmails();
        fetchStats();
      });
    }
  }

  // ─── TEMPLATE STUDIO JS ──────────────────────────────────────────────────────
  function setupTemplateStudio() {
    setupPosterStudio();
  }

  // ─── CANVA-LIKE POSTER STUDIO ────────────────────────────────────────────────
  function setupPosterStudio() {
    const poster     = document.getElementById('canva-poster');
    const bgLayer    = document.getElementById('poster-bg-layer');
    const floatBar   = document.getElementById('canva-float-bar');
    if (!poster) return;

    let selectedEl   = null;
    let isDragging   = false;
    let isResizing   = false;
    let resizeDir    = '';
    let startX = 0, startY = 0, startLeft = 0, startTop = 0, startW = 0, startH = 0;
    let posterZoom   = 0.75;
    let undoStack    = [];
    let currentBg    = 'linear-gradient(160deg,#00A86B 0%,#007A4E 100%)';

    // ── TEMPLATES ────────────────────────────────────────────────────────────
    const TEMPLATES = [
      {
        id: 'corporate-green',
        label: 'Corp Green',
        bg: 'linear-gradient(160deg,#00A86B 0%,#007A4E 100%)',
        thumbBg: '#00A86B',
        accentColor: '#ffffff',
        elements: [
          { id:'logo-bar', type:'logo', x:24, y:24, w:520, h:50, text:'', bg:'rgba(0,0,0,0.15)', radius:8 },
          { id:'h1', type:'text', x:36, y:110, w:528, text:'Scale Your Outreach\nwith AI', fs:42, fw:'800', color:'#ffffff', ff:'Outfit, sans-serif', lh:1.2, ls:'-0.5px' },
          { id:'sub', type:'text', x:36, y:270, w:528, text:'OnIT India Smart Technology Solutions', fs:18, fw:'400', color:'rgba(255,255,255,0.85)', ff:'Inter, sans-serif', lh:1.5, ls:'0px' },
          { id:'div1', type:'divider', x:36, y:325, w:60, h:3, bg:'rgba(255,255,255,0.5)', radius:2 },
          { id:'body', type:'text', x:36, y:360, w:528, text:'Personalized AI-powered email campaigns that drive real engagement and measurable results for your business.', fs:15, fw:'400', color:'rgba(255,255,255,0.75)', ff:'Inter, sans-serif', lh:1.65, ls:'0px' },
          { id:'cta', type:'button', x:36, y:510, w:220, h:48, text:'Book Free Consultation →', fs:14, fw:'700', color:'#00A86B', bg:'#ffffff', radius:8 },
          { id:'footer', type:'text', x:36, y:760, w:528, text:'www.onitindia.com  ·  AI Outreach Suite', fs:11, fw:'400', color:'rgba(255,255,255,0.45)', ff:'Inter, sans-serif', lh:1, ls:'0.5px' },
        ]
      },
      {
        id: 'dark-pro',
        label: 'Dark Pro',
        bg: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)',
        thumbBg: '#0f172a',
        accentColor: '#6366f1',
        elements: [
          { id:'accent-bar', type:'rect', x:36, y:24, w:4, h:60, bg:'#6366f1', radius:2 },
          { id:'h1', type:'text', x:56, y:30, w:510, text:'Intelligent Email\nOutreach Platform', fs:38, fw:'800', color:'#f1f5f9', ff:'Outfit, sans-serif', lh:1.2, ls:'-0.5px' },
          { id:'badge', type:'button', x:36, y:120, w:140, h:32, text:'✦  AI-Powered', fs:12, fw:'600', color:'#fff', bg:'#6366f1', radius:16 },
          { id:'div1', type:'divider', x:36, y:172, w:528, h:1, bg:'rgba(255,255,255,0.08)', radius:0 },
          { id:'sub', type:'text', x:36, y:196, w:528, text:'OnIT India — Building the future of\nbusiness communication', fs:20, fw:'600', color:'#cbd5e1', ff:'Inter, sans-serif', lh:1.4, ls:'0px' },
          { id:'body', type:'text', x:36, y:290, w:528, text:'Drive meaningful connections with AI-crafted, hyper-personalized outreach that converts prospects into partners.', fs:14, fw:'400', color:'#64748b', ff:'Inter, sans-serif', lh:1.7, ls:'0px' },
          { id:'cta', type:'button', x:36, y:460, w:200, h:48, text:'Get Started →', fs:14, fw:'700', color:'#fff', bg:'#6366f1', radius:8 },
          { id:'stats1', type:'text', x:36, y:560, w:140, text:'10,000+', fs:28, fw:'800', color:'#6366f1', ff:'Outfit, sans-serif', lh:1 },
          { id:'stats1-label', type:'text', x:36, y:600, w:140, text:'Emails Sent', fs:11, fw:'400', color:'#475569', ff:'Inter, sans-serif', lh:1 },
          { id:'stats2', type:'text', x:220, y:560, w:140, text:'98%', fs:28, fw:'800', color:'#10b981', ff:'Outfit, sans-serif', lh:1 },
          { id:'stats2-label', type:'text', x:220, y:600, w:140, text:'Delivery Rate', fs:11, fw:'400', color:'#475569', ff:'Inter, sans-serif', lh:1 },
          { id:'footer', type:'text', x:36, y:760, w:528, text:'onitindia.com  ·  Powered by AI', fs:11, fw:'400', color:'rgba(255,255,255,0.2)', ff:'Inter, sans-serif', lh:1, ls:'0.5px' },
        ]
      },
      {
        id: 'vibrant-gradient',
        label: 'Vibrant',
        bg: 'linear-gradient(135deg,#6366f1 0%,#a855f7 50%,#ec4899 100%)',
        thumbBg: '#7c3aed',
        accentColor: '#fff',
        elements: [
          { id:'h1', type:'text', x:36, y:80, w:528, text:'Next-Level\nEmail Marketing', fs:48, fw:'800', color:'#ffffff', ff:'Outfit, sans-serif', lh:1.1, ls:'-1px' },
          { id:'sub', type:'text', x:36, y:270, w:480, text:'Harness the power of AI to craft emails that people actually want to read.', fs:18, fw:'400', color:'rgba(255,255,255,0.9)', ff:'Inter, sans-serif', lh:1.6, ls:'0px' },
          { id:'cta', type:'button', x:36, y:400, w:220, h:52, text:'Start Free →', fs:16, fw:'700', color:'#7c3aed', bg:'#ffffff', radius:26 },
          { id:'badge', type:'button', x:276, y:412, w:140, h:30, text:'No credit card', fs:11, fw:'400', color:'rgba(255,255,255,0.7)', bg:'rgba(255,255,255,0.1)', radius:15 },
          { id:'footer', type:'text', x:36, y:760, w:528, text:'OnIT India  ·  www.onitindia.com', fs:11, fw:'400', color:'rgba(255,255,255,0.4)', ff:'Inter, sans-serif', lh:1, ls:'0.5px' },
        ]
      },
      {
        id: 'ocean-blue',
        label: 'Ocean Blue',
        bg: 'linear-gradient(160deg,#0ea5e9 0%,#1e3a8a 100%)',
        thumbBg: '#1e40af',
        accentColor: '#fff',
        elements: [
          { id:'top-badge', type:'button', x:36, y:30, w:160, h:30, text:'🚀 OnIT India', fs:12, fw:'600', color:'#fff', bg:'rgba(255,255,255,0.15)', radius:6 },
          { id:'h1', type:'text', x:36, y:90, w:528, text:'Transform How You\nConnect with Clients', fs:40, fw:'800', color:'#ffffff', ff:'Outfit, sans-serif', lh:1.2, ls:'-0.5px' },
          { id:'sub', type:'text', x:36, y:270, w:480, text:'AI-powered, deeply personalized emails that land, engage, and convert.', fs:18, fw:'400', color:'rgba(255,255,255,0.85)', ff:'Inter, sans-serif', lh:1.6, ls:'0px' },
          { id:'div1', type:'divider', x:36, y:345, w:100, h:3, bg:'rgba(255,255,255,0.4)', radius:2 },
          { id:'cta', type:'button', x:36, y:380, w:200, h:50, text:'Book a Demo →', fs:15, fw:'700', color:'#1e3a8a', bg:'#ffffff', radius:8 },
          { id:'footer', type:'text', x:36, y:760, w:528, text:'OnIT India  ·  onitindia.com', fs:11, fw:'400', color:'rgba(255,255,255,0.35)', ff:'Inter, sans-serif', lh:1, ls:'0.5px' },
        ]
      },
      {
        id: 'minimal-light',
        label: 'Minimal',
        bg: '#f8fafc',
        thumbBg: '#f1f5f9',
        accentColor: '#1e293b',
        elements: [
          { id:'top-line', type:'divider', x:36, y:40, w:528, h:2, bg:'#e2e8f0', radius:1 },
          { id:'tag', type:'text', x:36, y:60, w:200, text:'ONITINDIA.COM', fs:10, fw:'600', color:'#94a3b8', ff:'Inter, sans-serif', lh:1, ls:'2px' },
          { id:'h1', type:'text', x:36, y:100, w:528, text:'Smarter Email.\nBetter Results.', fs:48, fw:'800', color:'#0f172a', ff:'Outfit, sans-serif', lh:1.15, ls:'-1px' },
          { id:'sub', type:'text', x:36, y:290, w:480, text:'AI-crafted outreach tailored to every recipient. Scale without losing the personal touch.', fs:16, fw:'400', color:'#64748b', ff:'Inter, sans-serif', lh:1.7, ls:'0px' },
          { id:'div1', type:'divider', x:36, y:385, w:528, h:1, bg:'#e2e8f0', radius:0 },
          { id:'cta', type:'button', x:36, y:410, w:180, h:48, text:'Get Started →', fs:14, fw:'700', color:'#fff', bg:'#0f172a', radius:6 },
          { id:'footer', type:'text', x:36, y:760, w:528, text:'OnIT India  ·  Powered by AI', fs:11, fw:'400', color:'#94a3b8', ff:'Inter, sans-serif', lh:1, ls:'0.5px' },
        ]
      }
    ];

    let activeTemplate = TEMPLATES[0];

    // ── RENDER ELEMENT ────────────────────────────────────────────────────────
    function uid() { return '_' + Math.random().toString(36).slice(2, 9); }

    function createElNode(cfg) {
      const div = document.createElement('div');
      div.className = 'canva-el';
      div.dataset.elId = cfg.id;
      div.style.left   = (cfg.x || 0) + 'px';
      div.style.top    = (cfg.y || 0) + 'px';
      div.style.width  = (cfg.w || 200) + 'px';
      if (cfg.h) div.style.height = cfg.h + 'px';
      div.style.fontFamily = cfg.ff || 'Inter, sans-serif';
      div.style.fontSize   = (cfg.fs || 16) + 'px';
      div.style.fontWeight = cfg.fw || '400';
      div.style.fontStyle  = cfg.fi ? 'italic' : 'normal';
      div.style.color      = cfg.color || '#fff';
      div.style.lineHeight = cfg.lh || 1.4;
      div.style.letterSpacing = cfg.ls || '0px';
      div.style.opacity    = cfg.opacity !== undefined ? cfg.opacity : 1;
      div.style.padding    = (cfg.pad || 0) + 'px';
      div.style.borderRadius = (cfg.radius || 0) + 'px';
      div.style.whiteSpace = 'pre-wrap';
      div.style.wordBreak  = 'break-word';
      div.style.textDecoration = cfg.td || 'none';
      div.style.textAlign  = cfg.align || 'left';

      if (cfg.type === 'button') {
        div.style.background    = cfg.bg || '#6366f1';
        div.style.color         = cfg.color || '#fff';
        div.style.display       = 'flex';
        div.style.alignItems    = 'center';
        div.style.justifyContent = 'center';
        div.style.cursor        = 'move';
        div.style.fontWeight    = cfg.fw || '700';
        div.style.borderRadius  = (cfg.radius || 8) + 'px';
        div.textContent         = cfg.text || '';
      } else if (cfg.type === 'divider') {
        div.style.background    = cfg.bg || 'rgba(255,255,255,0.4)';
        div.style.height        = (cfg.h || 2) + 'px';
        div.style.borderRadius  = (cfg.radius || 2) + 'px';
        div.style.padding       = '0';
      } else if (cfg.type === 'rect') {
        div.style.background    = cfg.bg || '#6366f1';
        div.style.borderRadius  = (cfg.radius || 0) + 'px';
        div.style.height        = (cfg.h || 60) + 'px';
      } else if (cfg.type === 'logo') {
        div.style.background    = cfg.bg || 'rgba(0,0,0,0.15)';
        div.style.borderRadius  = (cfg.radius || 8) + 'px';
        div.style.display       = 'flex';
        div.style.alignItems    = 'center';
        div.style.padding       = '8px 16px';
        div.style.gap           = '10px';
        const img = document.createElement('img');
        img.src = 'onitindia-logo.png';
        img.style.cssText = 'height:28px;object-fit:contain;filter:brightness(0) invert(1);';
        div.appendChild(img);
        const txt = document.createElement('span');
        txt.textContent = 'OnIT India AI Outreach Suite';
        txt.style.cssText = 'font-size:12px;font-weight:600;color:rgba(255,255,255,0.7);font-family:Inter,sans-serif;';
        div.appendChild(txt);
      } else {
        div.style.background = cfg.bgFill || 'transparent';
        div.textContent = cfg.text || '';
      }

      // Resize handles
      ['nw','n','ne','e','se','s','sw','w'].forEach(d => {
        const h = document.createElement('span');
        h.className = `canva-handle ${d}`;
        h.dataset.dir = d;
        div.appendChild(h);
      });

      // Selection / drag
      div.addEventListener('mousedown', onElMouseDown);
      div.addEventListener('dblclick',  onElDblClick);
      return div;
    }

    function applyTemplate(tpl) {
      saveUndo();
      activeTemplate = tpl;
      currentBg = tpl.bg;
      bgLayer.style.background = currentBg;
      // sync bg color input
      const bgColorInput = document.getElementById('poster-bg-color');
      if (bgColorInput && !tpl.bg.includes('gradient')) bgColorInput.value = tpl.bg;

      // remove all existing elements
      poster.querySelectorAll('.canva-el').forEach(n => n.remove());
      selectedEl = null;
      hideFloatBar();
      showPropsEmpty();

      tpl.elements.forEach(cfg => {
        poster.appendChild(createElNode({ ...cfg, id: cfg.id }));
      });

      document.querySelectorAll('.canva-template-thumb').forEach(t => t.classList.remove('active'));
      document.querySelector(`[data-tpl="${tpl.id}"]`)?.classList.add('active');
    }

    // ── BUILD TEMPLATE THUMBNAILS ─────────────────────────────────────────────
    const thumbGrid = document.getElementById('canva-template-grid');
    TEMPLATES.forEach(tpl => {
      const wrap = document.createElement('div');
      wrap.className = 'canva-template-thumb';
      wrap.dataset.tpl = tpl.id;
      wrap.innerHTML = `
        <div class="thumb-preview" style="background:${tpl.bg};">
          <div class="thumb-line" style="height:14px;background:rgba(255,255,255,0.9);width:80%;border-radius:2px;"></div>
          <div class="thumb-line" style="height:8px;background:rgba(255,255,255,0.5);width:60%;border-radius:2px;"></div>
          <div class="thumb-line" style="height:8px;background:rgba(255,255,255,0.35);width:90%;border-radius:2px;margin-top:4px;"></div>
          <div class="thumb-line" style="height:8px;background:rgba(255,255,255,0.35);width:70%;border-radius:2px;"></div>
          <div class="thumb-line" style="height:22px;background:rgba(255,255,255,0.9);width:55%;border-radius:4px;margin-top:8px;"></div>
          <div class="canva-template-label">${tpl.label}</div>
        </div>`;
      wrap.addEventListener('click', () => applyTemplate(tpl));
      thumbGrid?.appendChild(wrap);
    });

    // ── GRADIENT PRESETS ─────────────────────────────────────────────────────
    const gradients = [
      'linear-gradient(135deg,#6366f1,#a855f7)',
      'linear-gradient(135deg,#0ea5e9,#6366f1)',
      'linear-gradient(135deg,#10b981,#0ea5e9)',
      'linear-gradient(135deg,#f59e0b,#ef4444)',
      'linear-gradient(135deg,#ec4899,#f59e0b)',
      'linear-gradient(135deg,#8b5cf6,#06b6d4)',
    ];
    const darkBgs = ['#0f172a','#1e293b','#111827','#18181b','#0c0a09','#030712'];
    const gradGrid = document.getElementById('poster-gradient-grid');
    const darkGrid = document.getElementById('poster-dark-grid');
    gradients.forEach(g => {
      const sw = document.createElement('div');
      sw.className = 'gradient-swatch';
      sw.style.background = g;
      sw.addEventListener('click', () => { currentBg = g; bgLayer.style.background = g; });
      gradGrid?.appendChild(sw);
    });
    darkBgs.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'gradient-swatch';
      sw.style.background = c;
      sw.addEventListener('click', () => { currentBg = c; bgLayer.style.background = c; });
      darkGrid?.appendChild(sw);
    });

    // Sync poster background solid color picker
    const bgColorPicker = document.getElementById('poster-bg-color');
    const bgHexInput    = document.getElementById('poster-bg-hex');
    bgColorPicker?.addEventListener('input', e => {
      currentBg = e.target.value;
      bgLayer.style.background = currentBg;
      if (bgHexInput) bgHexInput.value = e.target.value;
    });
    bgHexInput?.addEventListener('input', e => {
      const v = e.target.value;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        currentBg = v;
        bgLayer.style.background = v;
        if (bgColorPicker) bgColorPicker.value = v;
      }
    });
    document.getElementById('cp-canvas-bg')?.addEventListener('input', e => {
      currentBg = e.target.value;
      bgLayer.style.background = currentBg;
    });

    // ── SELECTION STATE ───────────────────────────────────────────────────────
    function selectEl(el) {
      if (selectedEl && selectedEl !== el) selectedEl.classList.remove('selected');
      selectedEl = el;
      if (el) {
        el.classList.add('selected');
        showFloatBar(el);
        showPropsEl(el);
      }
    }
    function deselectAll() {
      if (selectedEl) { selectedEl.classList.remove('selected'); selectedEl = null; }
      hideFloatBar();
      showPropsEmpty();
    }
    function hideFloatBar() { floatBar?.classList.remove('visible'); }
    function showFloatBar(el) {
      if (!floatBar) return;
      floatBar.classList.add('visible');
      // sync toolbar state
      const fs = parseFloat(el.style.fontSize) || 16;
      const fc = el.style.color || '#ffffff';
      if (cfbFontSize) cfbFontSize.value = fs;
      if (cfbColor) cfbColor.value = rgbToHex(fc);
      cfbBold?.classList.toggle('active', el.style.fontWeight === '700' || el.style.fontWeight === '800');
      cfbItalic?.classList.toggle('active', el.style.fontStyle === 'italic');
      cfbUnderline?.classList.toggle('active', el.style.textDecoration === 'underline');
    }
    function showPropsEmpty() {
      document.getElementById('canva-props-empty')?.style.setProperty('display','flex');
      document.getElementById('canva-props-el')?.style.setProperty('display','none');
    }
    function showPropsEl(el) {
      document.getElementById('canva-props-empty')?.style.setProperty('display','none');
      const panel = document.getElementById('canva-props-el');
      if (!panel) return;
      panel.style.display = 'block';
      // Sync panel values
      const setV = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
      const setT = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      setV('cp-font-family', el.style.fontFamily || 'Inter, sans-serif');
      setV('cp-font-weight', el.style.fontWeight || '400');
      const fs = parseFloat(el.style.fontSize) || 16;
      setV('cp-font-size', fs); setT('cp-font-size-val', fs + 'px');
      setV('cp-text-color', rgbToHex(el.style.color || '#ffffff'));
      setV('cp-text-hex', rgbToHex(el.style.color || '#ffffff'));
      const op = Math.round((parseFloat(el.style.opacity) || 1) * 100);
      setV('cp-opacity', op); setT('cp-opacity-val', op + '%');
      const ls = parseFloat(el.style.letterSpacing) || 0;
      setV('cp-letter-spacing', ls); setT('cp-letter-spacing-val', ls + 'px');
      const lhVal = parseFloat(el.style.lineHeight) || 1.4;
      const lhSlider = Math.round(lhVal * 10);
      setV('cp-line-height', lhSlider); setT('cp-line-height-val', lhVal.toFixed(1));
      const pad = parseFloat(el.style.padding) || 0;
      setV('cp-padding', pad); setT('cp-padding-val', pad + 'px');
      const br = parseFloat(el.style.borderRadius) || 0;
      setV('cp-border-radius', br); setT('cp-border-radius-val', br + 'px');
      setV('cp-pos-x', Math.round(parseFloat(el.style.left) || 0));
      setV('cp-pos-y', Math.round(parseFloat(el.style.top) || 0));
      setV('cp-width', Math.round(parseFloat(el.style.width) || 200));
    }

    // ── MOUSE DRAG / RESIZE ───────────────────────────────────────────────────
    function onElMouseDown(e) {
      if (e.target.classList.contains('canva-handle')) {
        // resize
        e.preventDefault(); e.stopPropagation();
        const el = e.target.closest('.canva-el');
        if (!el) return;
        selectEl(el);
        isResizing = true;
        resizeDir = e.target.dataset.dir;
        startX = e.clientX; startY = e.clientY;
        startLeft = parseFloat(el.style.left) || 0;
        startTop  = parseFloat(el.style.top) || 0;
        startW    = parseFloat(el.style.width) || 200;
        startH    = parseFloat(el.style.height) || 40;
        return;
      }
      if (e.target.classList.contains('canva-el') || e.target.closest('.canva-el')) {
        const el = e.target.closest('.canva-el');
        if (!el || el.classList.contains('editing')) return;
        e.preventDefault();
        selectEl(el);
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        startLeft = parseFloat(el.style.left) || 0;
        startTop  = parseFloat(el.style.top) || 0;
      }
    }

    document.addEventListener('mousemove', (e) => {
      if (!selectedEl) return;
      const dx = (e.clientX - startX) / posterZoom;
      const dy = (e.clientY - startY) / posterZoom;
      if (isDragging) {
        selectedEl.style.left = Math.max(0, startLeft + dx) + 'px';
        selectedEl.style.top  = Math.max(0, startTop  + dy) + 'px';
        updatePosDisplay(selectedEl);
      } else if (isResizing) {
        let nl = startLeft, nt = startTop, nw = startW, nh = startH;
        if (resizeDir.includes('e')) nw = Math.max(40, startW + dx);
        if (resizeDir.includes('w')) { nl = startLeft + dx; nw = Math.max(40, startW - dx); }
        if (resizeDir.includes('s')) nh = Math.max(16, startH + dy);
        if (resizeDir.includes('n')) { nt = startTop + dy; nh = Math.max(16, startH - dy); }
        selectedEl.style.left   = nl + 'px';
        selectedEl.style.top    = nt + 'px';
        selectedEl.style.width  = nw + 'px';
        if (selectedEl.style.height) selectedEl.style.height = nh + 'px';
        document.getElementById('cp-width')?.setAttribute('value', Math.round(nw));
        document.getElementById('cp-pos-x')?.setAttribute('value', Math.round(nl));
        document.getElementById('cp-pos-y')?.setAttribute('value', Math.round(nt));
      }
    });

    document.addEventListener('mouseup', () => { isDragging = false; isResizing = false; });

    // Click on poster background to deselect
    poster.addEventListener('mousedown', (e) => {
      if (e.target === poster || e.target === bgLayer) deselectAll();
    });

    // ── DOUBLE-CLICK: inline edit ─────────────────────────────────────────────
    function onElDblClick(e) {
      const el = e.target.closest('.canva-el');
      if (!el) return;
      if (el.dataset.elType === 'divider' || el.dataset.elType === 'rect') return;
      el.classList.add('editing');
      el.contentEditable = 'true';
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && selectedEl) {
        selectedEl.classList.remove('editing');
        selectedEl.contentEditable = 'false';
        deselectAll();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEl && !selectedEl.classList.contains('editing')) {
        e.preventDefault();
        saveUndo();
        selectedEl.remove();
        selectedEl = null;
        hideFloatBar();
        showPropsEmpty();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undoLast(); }
    });

    // ── FLOATING TOOLBAR BINDINGS ─────────────────────────────────────────────
    const cfbBold      = document.getElementById('cfb-bold');
    const cfbItalic    = document.getElementById('cfb-italic');
    const cfbUnderline = document.getElementById('cfb-underline');
    const cfbFontSize  = document.getElementById('cfb-fontsize');
    const cfbColor     = document.getElementById('cfb-color');

    cfbBold?.addEventListener('click', () => {
      if (!selectedEl) return;
      const isBold = selectedEl.style.fontWeight === '700' || selectedEl.style.fontWeight === '800';
      selectedEl.style.fontWeight = isBold ? '400' : '700';
      const el = document.getElementById('cp-font-weight');
      if (el) el.value = isBold ? '400' : '700';
    });
    cfbItalic?.addEventListener('click', () => {
      if (!selectedEl) return;
      const isItalic = selectedEl.style.fontStyle === 'italic';
      selectedEl.style.fontStyle = isItalic ? 'normal' : 'italic';
      cfbItalic.classList.toggle('active', !isItalic);
    });
    cfbUnderline?.addEventListener('click', () => {
      if (!selectedEl) return;
      const isU = selectedEl.style.textDecoration === 'underline';
      selectedEl.style.textDecoration = isU ? 'none' : 'underline';
      cfbUnderline.classList.toggle('active', !isU);
    });
    cfbFontSize?.addEventListener('input', e => {
      if (!selectedEl) return;
      selectedEl.style.fontSize = e.target.value + 'px';
      const cpFs = document.getElementById('cp-font-size');
      if (cpFs) cpFs.value = e.target.value;
      const cpFsVal = document.getElementById('cp-font-size-val');
      if (cpFsVal) cpFsVal.textContent = e.target.value + 'px';
    });
    cfbColor?.addEventListener('input', e => {
      if (!selectedEl) return;
      selectedEl.style.color = e.target.value;
      const cpTc = document.getElementById('cp-text-color');
      if (cpTc) cpTc.value = e.target.value;
      const cpTh = document.getElementById('cp-text-hex');
      if (cpTh) cpTh.value = e.target.value;
    });
    document.getElementById('cfb-align-left')?.addEventListener('click',   () => { if (selectedEl) selectedEl.style.textAlign = 'left'; });
    document.getElementById('cfb-align-center')?.addEventListener('click', () => { if (selectedEl) selectedEl.style.textAlign = 'center'; });
    document.getElementById('cfb-align-right')?.addEventListener('click',  () => { if (selectedEl) selectedEl.style.textAlign = 'right'; });
    document.getElementById('cfb-delete')?.addEventListener('click', () => {
      if (!selectedEl) return;
      saveUndo();
      selectedEl.remove();
      selectedEl = null;
      hideFloatBar();
      showPropsEmpty();
    });

    // ── RIGHT PANEL PROPERTY BINDINGS ─────────────────────────────────────────
    function bindProp(inputId, apply, labelId) {
      const el = document.getElementById(inputId);
      if (!el) return;
      el.addEventListener('input', e => {
        if (!selectedEl) return;
        apply(selectedEl, e.target.value);
        if (labelId) {
          const lb = document.getElementById(labelId);
          if (lb) lb.textContent = e.target.value + (inputId.includes('size') || inputId.includes('spacing') || inputId.includes('padding') || inputId.includes('radius') ? 'px' : (inputId.includes('opacity') ? '%' : ''));
        }
        if (inputId === 'cp-font-size') { cfbFontSize.value = e.target.value; }
        if (inputId === 'cp-text-color') { cfbColor.value = e.target.value; }
      });
    }
    bindProp('cp-font-family', (el, v) => el.style.fontFamily = v);
    bindProp('cp-font-weight', (el, v) => el.style.fontWeight = v);
    bindProp('cp-font-size', (el, v) => el.style.fontSize = v + 'px', 'cp-font-size-val');
    bindProp('cp-text-color', (el, v) => { el.style.color = v; document.getElementById('cp-text-hex').value = v; });
    document.getElementById('cp-text-hex')?.addEventListener('input', e => {
      if (!selectedEl || !/^#[0-9a-fA-F]{6}$/.test(e.target.value)) return;
      selectedEl.style.color = e.target.value;
      document.getElementById('cp-text-color').value = e.target.value;
      if (cfbColor) cfbColor.value = e.target.value;
    });
    bindProp('cp-opacity', (el, v) => el.style.opacity = v / 100, 'cp-opacity-val');
    bindProp('cp-letter-spacing', (el, v) => el.style.letterSpacing = v + 'px', 'cp-letter-spacing-val');
    bindProp('cp-line-height', (el, v) => { const r = (v/10).toFixed(1); el.style.lineHeight = r; document.getElementById('cp-line-height-val').textContent = r; });
    bindProp('cp-bg-fill', (el, v) => el.style.background = v);
    bindProp('cp-padding', (el, v) => el.style.padding = v + 'px', 'cp-padding-val');
    bindProp('cp-border-radius', (el, v) => el.style.borderRadius = v + 'px', 'cp-border-radius-val');
    document.getElementById('cp-pos-x')?.addEventListener('input', e => { if (selectedEl) selectedEl.style.left = e.target.value + 'px'; });
    document.getElementById('cp-pos-y')?.addEventListener('input', e => { if (selectedEl) selectedEl.style.top = e.target.value + 'px'; });
    document.getElementById('cp-width')?.addEventListener('input', e => { if (selectedEl) selectedEl.style.width = e.target.value + 'px'; });

    // Duplicate / z-index
    document.getElementById('cp-btn-duplicate')?.addEventListener('click', () => {
      if (!selectedEl) return;
      const clone = selectedEl.cloneNode(true);
      clone.dataset.elId = uid();
      clone.style.left = (parseFloat(selectedEl.style.left) + 16) + 'px';
      clone.style.top  = (parseFloat(selectedEl.style.top) + 16) + 'px';
      clone.querySelectorAll('.canva-handle').forEach(h => h.addEventListener('mousedown', onElMouseDown));
      clone.addEventListener('mousedown', onElMouseDown);
      clone.addEventListener('dblclick', onElDblClick);
      poster.appendChild(clone);
      selectEl(clone);
    });
    document.getElementById('cp-btn-bring-front')?.addEventListener('click', () => { if (selectedEl) poster.appendChild(selectedEl); });
    document.getElementById('cp-btn-send-back')?.addEventListener('click', () => { if (selectedEl) poster.insertBefore(selectedEl, bgLayer.nextSibling); });

    // ── ADD TEXT / ELEMENTS ───────────────────────────────────────────────────
    const TEXT_PRESETS = {
      heading:    { text: 'Your Heading Here', fs: 40, fw: '800', color: '#ffffff', ff: 'Outfit, sans-serif', lh: 1.2, ls: '-0.5px' },
      subheading: { text: 'Your Subheading', fs: 22, fw: '600', color: '#cbd5e1', ff: 'Inter, sans-serif', lh: 1.4, ls: '0px' },
      body:       { text: 'Add your body text here. Click to edit.', fs: 15, fw: '400', color: '#94a3b8', ff: 'Inter, sans-serif', lh: 1.7, ls: '0px' },
      caption:    { text: 'Caption text', fs: 11, fw: '400', color: '#64748b', ff: 'Inter, sans-serif', lh: 1, ls: '1px' },
      cta:        { type: 'button', text: 'Click Here →', fs: 15, fw: '700', color: '#fff', bg: '#6366f1', radius: 8, w: 180, h: 48 },
    };
    document.querySelectorAll('[data-addtext]').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = TEXT_PRESETS[btn.dataset.addtext] || TEXT_PRESETS.body;
        const cfg = { id: uid(), x: 36, y: 400, w: 520, ...preset };
        const el = createElNode(cfg);
        poster.appendChild(el);
        selectEl(el);
        showToast('Element added! Double-click to edit text.', 'info');
      });
    });

    document.getElementById('btn-add-divider')?.addEventListener('click', () => {
      const el = createElNode({ id: uid(), type: 'divider', x: 36, y: 400, w: 528, h: 2, bg: 'rgba(255,255,255,0.3)', radius: 2 });
      poster.appendChild(el); selectEl(el);
    });
    document.getElementById('btn-add-logo')?.addEventListener('click', () => {
      const el = createElNode({ id: uid(), type: 'logo', x: 36, y: 400, w: 300, h: 50, bg: 'rgba(0,0,0,0.2)', radius: 8 });
      poster.appendChild(el); selectEl(el);
    });
    document.getElementById('btn-add-badge')?.addEventListener('click', () => {
      const el = createElNode({ id: uid(), type: 'button', x: 36, y: 400, w: 120, h: 30, text: '✦ Feature', fs: 12, fw: '600', color: '#fff', bg: '#6366f1', radius: 15 });
      poster.appendChild(el); selectEl(el);
    });
    document.getElementById('btn-add-star-rating')?.addEventListener('click', () => {
      const el = createElNode({ id: uid(), type: 'text', x: 36, y: 400, w: 160, text: '★★★★★', fs: 22, fw: '700', color: '#f59e0b', ff: 'Inter, sans-serif', lh: 1, ls: '4px' });
      poster.appendChild(el); selectEl(el);
    });
    document.getElementById('btn-add-quote')?.addEventListener('click', () => {
      const el = createElNode({ id: uid(), type: 'text', x: 36, y: 400, w: 480, text: '"Excellence in every email. Trust in every send."\n— OnIT India', fs: 18, fw: '400', color: 'rgba(255,255,255,0.85)', ff: 'Georgia, serif', lh: 1.7, ls: '0px', pad: 16, bgFill: 'rgba(255,255,255,0.07)', radius: 8 });
      poster.appendChild(el); selectEl(el);
    });

    // ── LEFT PANEL TAB SWITCHING ──────────────────────────────────────────────
    document.querySelectorAll('.canva-tool-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.canva-tool-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.canva-tool-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById(`ctab-${tab.dataset.ctab}`);
        if (panel) panel.classList.add('active');
      });
    });

    // ── ZOOM ─────────────────────────────────────────────────────────────────
    function applyZoom() {
      poster.style.transform = `scale(${posterZoom})`;
      document.getElementById('canva-zoom-label').textContent = Math.round(posterZoom * 100) + '%';
    }
    document.getElementById('canva-zoom-in')?.addEventListener('click', () => { posterZoom = Math.min(2, posterZoom + 0.1); applyZoom(); });
    document.getElementById('canva-zoom-out')?.addEventListener('click', () => { posterZoom = Math.max(0.3, posterZoom - 0.1); applyZoom(); });
    applyZoom();

    function updatePosDisplay(el) {
      const pd = document.getElementById('canva-pos-display');
      if (pd && el) pd.textContent = `X: ${Math.round(parseFloat(el.style.left))}, Y: ${Math.round(parseFloat(el.style.top))}`;
    }

    // ── UNDO ─────────────────────────────────────────────────────────────────
    function saveUndo() {
      undoStack.push(poster.innerHTML);
      if (undoStack.length > 20) undoStack.shift();
    }
    function undoLast() {
      if (!undoStack.length) return;
      poster.innerHTML = undoStack.pop();
      // re-attach bg layer
      const bg = document.getElementById('poster-bg-layer') || (() => {
        const d = document.createElement('div'); d.id = 'poster-bg-layer'; d.className = 'poster-bg-layer'; return d;
      })();
      bg.style.background = currentBg;
      if (!poster.contains(bg)) poster.prepend(bg);
      // re-wire events
      poster.querySelectorAll('.canva-el').forEach(el => {
        el.addEventListener('mousedown', onElMouseDown);
        el.addEventListener('dblclick', onElDblClick);
      });
      deselectAll();
    }
    document.getElementById('btn-poster-undo')?.addEventListener('click', undoLast);

    // ── EXPORT PNG / JPG / PDF ────────────────────────────────────────────────
    async function exportPoster(format) {
      deselectAll();
      if (typeof html2canvas === 'undefined') {
        showToast('Export library not loaded. Check internet connection.', 'error'); return;
      }
      try {
        showToast('Rendering poster…', 'info');
        const scale = 2; // 2× for retina quality
        const canvas = await html2canvas(poster, { scale, useCORS: true, backgroundColor: null, logging: false });
        const a = document.createElement('a');
        a.href = canvas.toDataURL(format === 'jpg' ? 'image/jpeg' : 'image/png', 0.95);
        a.download = `onitindia-poster-${Date.now()}.${format}`;
        a.click();
        showToast(`Poster exported as ${format.toUpperCase()}!`, 'success');
      } catch(err) {
        showToast('Export failed: ' + err.message, 'error');
      }
    }
    document.getElementById('btn-poster-png')?.addEventListener('click', () => exportPoster('png'));
    document.getElementById('btn-poster-jpg')?.addEventListener('click', () => exportPoster('jpg'));
    document.getElementById('btn-poster-print')?.addEventListener('click', () => {
      deselectAll();
      setTimeout(() => window.print(), 200);
    });

    // ── SAVE TO DRAFT ─────────────────────────────────────────────────────────
    document.getElementById('btn-poster-save')?.addEventListener('click', () => {
      showToast('Poster design saved as template!', 'success');
    });

    // ── GLOBAL FONT CHANGE ────────────────────────────────────────────────────
    document.getElementById('poster-global-font')?.addEventListener('change', e => {
      poster.querySelectorAll('.canva-el').forEach(el => {
        if (el.dataset.elType !== 'divider' && el.dataset.elType !== 'rect') {
          el.style.fontFamily = e.target.value;
        }
      });
    });

    // ── INIT: apply default template ──────────────────────────────────────────
    bgLayer.style.background = currentBg;
    applyTemplate(TEMPLATES[0]);
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
    // Update trigger label count
    const msLabel = document.getElementById('multiselect-label');
    if (msLabel) {
      msLabel.textContent = `All Available Recipients (${recipients.length})`;
    }
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
