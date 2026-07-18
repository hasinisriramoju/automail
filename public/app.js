document.addEventListener('DOMContentLoaded', () => {

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
  // Navigation Tabs
  const tabBtnDashboard = document.getElementById('tab-btn-dashboard');
  const tabBtnRecipients = document.getElementById('tab-btn-recipients');
  const tabBtnSettings = document.getElementById('tab-btn-settings');
  const panelDashboard = document.getElementById('panel-dashboard');
  const panelRecipients = document.getElementById('panel-recipients');
  const panelSettings = document.getElementById('panel-settings');
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
  const tableRecentEmails = document.getElementById('table-recent-emails').querySelector('tbody');
  const tableRecipients = document.getElementById('table-recipients').querySelector('tbody');

  // Search & Refresh
  const recipientSearch = document.getElementById('recipient-search');
  const btnRefreshRecent = document.getElementById('btn-refresh-recent-emails');

  // Forms & Inputs
  const formSingleLead = document.getElementById('form-single-lead');
  const formBrandProfile = document.getElementById('form-brand-profile');
  const campaignSelect = document.getElementById('campaign-select');
  const campaignOutreachType = document.getElementById('campaign-outreach-type');
  const campaignHint = document.getElementById('campaign-hint');
  const btnCampaignGenerate = document.getElementById('btn-campaign-generate');
  const btnCampaignSend = document.getElementById('btn-campaign-send');
  const btnRetryFailed = document.getElementById('btn-retry-failed');

  // Email Preview Modal
  const modalEmailPreview = document.getElementById('modal-email-preview');
  const previewModalSubject = document.getElementById('preview-modal-subject');
  const previewModalTo = document.getElementById('preview-modal-to');
  const previewIframe = document.getElementById('preview-iframe');
  const btnClosePreview = document.getElementById('btn-close-preview');
  const btnPreviewCloseBottom = document.getElementById('btn-preview-close-bottom');
  const btnPreviewSend = document.getElementById('btn-preview-send');

  // Add Recipients Tab Switchers
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
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    btnConfirmOk.textContent = confirmLabel;
    
    // Set colors based on label/action
    if (confirmLabel.toLowerCase().includes('delete') || confirmLabel.toLowerCase().includes('remove')) {
      btnConfirmOk.style.backgroundColor = 'var(--color-rose)';
    } else {
      btnConfirmOk.style.backgroundColor = 'var(--color-indigo)';
    }

    _confirmCallback = onOk;
    modalConfirm.classList.add('active');
  }

  // Bind Custom Confirm Modal Button Handlers
  btnConfirmCancel.addEventListener('click', () => {
    modalConfirm.classList.remove('active');
    _confirmCallback = null;
  });

  btnConfirmOk.addEventListener('click', () => {
    modalConfirm.classList.remove('active');
    if (_confirmCallback) {
      _confirmCallback();
    }
    _confirmCallback = null;
  });

  // ─── INITIALIZATION ──────────────────────────────────────────────────────────
  function init() {
    setupTabRouting();
    setupAccordions();
    setupCsvUploader();
    bindFormSubmissions();
    fetchStats();
    fetchRecipients();
    fetchRecentEmails();
    fetchProfile();
    
    // Refresh button
    btnRefreshRecent.addEventListener('click', () => {
      fetchRecentEmails();
      fetchStats();
      showToast('Recents updated', 'info');
    });

    // Close Composer Drawer
    btnCloseDrawer.addEventListener('click', closeComposerDrawer);
    btnDrawerCancel.addEventListener('click', closeComposerDrawer);

    // Email Preview Modal close buttons
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
          const res = await fetch(`${API_BASE}/emails/${id}/send`, { method: 'POST' });
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

    // Retry All Failed Button
    if (btnRetryFailed) {
      btnRetryFailed.addEventListener('click', async () => {
        const failedEmails = state.allEmails.filter(e => e.status === 'failed');
        if (failedEmails.length === 0) { showToast('No failed emails to retry.', 'info'); return; }
        showCustomConfirm(
          'Retry All Failed Emails',
          `Retry sending ${failedEmails.length} failed email(s)?`,
          'Retry All',
          async () => {
            logToConsole(`[SMTP] Retrying ${failedEmails.length} failed emails...`);
            let successCount = 0, failCount = 0;
            for (const e of failedEmails) {
              const emailAddress = e.recipientId?.email || 'N/A';
              try {
                const res = await fetch(`${API_BASE}/emails/${e._id}/send`, { method: 'POST' });
                const data = await res.json();
                if (data.success) { successCount++; logToConsole(`[SMTP] ✓ Retry success: ${emailAddress}`); }
                else { failCount++; logToConsole(`[SMTP] ✗ Retry failed: ${emailAddress}: ${data.error}`, 'error'); }
              } catch { failCount++; }
              await new Promise(r => setTimeout(r, 2000));
            }
            logToConsole(`[SMTP] Retry complete. Success: ${successCount}, Failed: ${failCount}`);
            showToast(`Retry done: ${successCount} sent, ${failCount} failed`, successCount > 0 ? 'success' : 'error');
            fetchRecentEmails(); fetchStats();
          }
        );
      });
    }

    // Event delegation for Recent Emails Table actions
    tableRecipients.addEventListener('click', async (e) => {
      const genBtn = e.target.closest('.btn-generate-recipient-email');
      if (genBtn) {
        e.preventDefault();
        const id = genBtn.getAttribute('data-id');
        triggerEmailGenerationPipeline(id);
        return;
      }

      const deleteBtn = e.target.closest('.btn-delete-recipient');
      if (deleteBtn) {
        e.preventDefault();
        const id = deleteBtn.getAttribute('data-id');
        console.log('[Delete] Button clicked via delegation. Recipient ID:', id);
        
        showCustomConfirm(
          "Delete Recipient", 
          "Are you sure you want to delete this recipient? This will not delete their generated emails, but will remove their profile.", 
          "Delete", 
          async () => {
            try {
              console.log('[Delete] Sending request: DELETE /api/recipients/' + id);
              const res = await fetch(`${API_BASE}/recipients/${id}`, { method: 'DELETE' });
              const data = await res.json();
              console.log('[Delete] Server response received:', data);
              
              if (data.success) {
                showToast('Recipient deleted successfully', 'success');
                logToConsole(`[Leads] Deleted recipient ID: ${id}`);
                fetchRecipients();
              } else {
                showToast(`Failed to delete: ${data.error || 'Server error'}`, 'error');
              }
            } catch (err) {
              console.error('[Delete] Fetch error:', err);
              showToast('Failed to delete recipient (network error)', 'error');
            }
          }
        );
        return;
      }
    });

    // Event delegation for Recent Emails Table actions
    tableRecentEmails.addEventListener('click', async (e) => {
      // Preview button
      const previewBtn = e.target.closest('[title="Preview Email"]');
      if (previewBtn) {
        e.preventDefault();
        const id = previewBtn.getAttribute('data-id');
        const emailData = state.allEmails.find(em => em._id === id);
        if (emailData) {
          state.previewEmailId = id;
          previewModalSubject.textContent = emailData.subject || 'Email Preview';
          previewModalTo.textContent = `To: ${emailData.recipientId?.email || ''} — ${emailData.recipientId?.companyName || ''}`;
          const iframeDoc = previewIframe.contentDocument || previewIframe.contentWindow.document;
          iframeDoc.open();
          iframeDoc.write(emailData.bodyHtml || `<p style="font-family:sans-serif;padding:24px;">${emailData.bodyText || 'No email body.'}</p>`);
          iframeDoc.close();
          btnPreviewSend.style.display = emailData.status === 'sent' ? 'none' : 'inline-flex';
          modalEmailPreview.classList.add('active');
        }
        return;
      }

      // Follow-up button
      const followUpBtn = e.target.closest('.btn-followup');
      if (followUpBtn) {
        e.preventDefault();
        const id = followUpBtn.getAttribute('data-id');
        const emailData = state.allEmails.find(em => em._id === id);
        showCustomConfirm(
          'Generate Follow-Up Email',
          `Generate a polite follow-up email to ${emailData?.recipientId?.companyName || 'this recipient'}?`,
          'Generate Follow-Up',
          async () => {
            showToast('Generating follow-up email...', 'info');
            logToConsole(`[AI] Generating follow-up for email ${id}`);
            try {
              const res = await fetch(`${API_BASE}/emails/${id}/followup`, { method: 'POST',
                headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
              const data = await res.json();
              if (data.success) {
                showToast('Follow-up draft created! Check the Drafts tab.', 'success');
                logToConsole(`[AI] ✓ Follow-up draft created: ${data.data._id}`);
                fetchRecentEmails(); fetchStats();
              } else {
                showToast(`Failed: ${data.error}`, 'error');
              }
            } catch { showToast('Network error generating follow-up', 'error'); }
          }
        );
        return;
      }
      const openBtn = e.target.closest('.btn-open-composer');
      if (openBtn) {
        e.preventDefault();
        const id = openBtn.getAttribute('data-id');
        openComposerDrawer(id);
        return;
      }

      const sendBtn = e.target.closest('.btn-send-now');
      if (sendBtn) {
        e.preventDefault();
        const id = sendBtn.getAttribute('data-id');
        sendBtn.setAttribute('disabled', 'true');
        logToConsole(`[SMTP] Direct dispatch requested for Email ID: ${id}`);
        showToast('Sending email...', 'info');
        try {
          const res = await fetch(`${API_BASE}/emails/${id}/send`, { method: 'POST' });
          const data = await res.json();
          if (data.success) {
            showToast('Email delivered successfully!', 'success');
            logToConsole(`[SMTP] ✓ Delivered to: ${data.data?.recipientId?.email || 'recipient'}`);
            fetchRecentEmails();
            fetchStats();
          } else {
            showToast(`Delivery failed: ${data.error}`, 'error');
            logToConsole(`[SMTP] ✗ Delivery failed: ${data.error}`, 'error');
            fetchRecentEmails();
            fetchStats();
          }
        } catch (err) {
          showToast('Network error during delivery', 'error');
        }
        return;
      }

      const deleteBtn = e.target.closest('.btn-delete-email');
      if (deleteBtn) {
        e.preventDefault();
        const id = deleteBtn.getAttribute('data-id');
        showCustomConfirm(
          "Delete Email Draft", 
          "Are you sure you want to delete this email draft?", 
          "Delete", 
          async () => {
            try {
              const res = await fetch(`${API_BASE}/emails/${id}`, { method: 'DELETE' });
              const data = await res.json();
              if (data.success) {
                showToast('Draft deleted', 'success');
                fetchRecentEmails();
                fetchStats();
              }
            } catch (err) {
              showToast('Failed to delete draft', 'error');
            }
          }
        );
        return;
      }
    });
  }

  // ─── TOAST NOTIFICATION ──────────────────────────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideInToast 0.2s reverse forwards';
      setTimeout(() => { toast.remove(); }, 250);
    }, 4000);
  }

  // ─── CONSOLE UTILITY ─────────────────────────────────────────────────────────
  function logToConsole(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.innerHTML = `[${timestamp}] ${message}`;
    systemConsole.appendChild(line);
    systemConsole.scrollTop = systemConsole.scrollHeight;
  }

  // ─── TAB ROUTING ─────────────────────────────────────────────────────────────
  function setupTabRouting() {
    const tabs = [
      { btn: tabBtnDashboard, panel: panelDashboard, title: 'Outreach Dashboard', subtitle: "Welcome to OnIT India's intelligent email hub." },
      { btn: tabBtnRecipients, panel: panelRecipients, title: 'Manage Recipient Leads', subtitle: 'Review, research, and import company profiles.' },
      { btn: tabBtnSettings, panel: panelSettings, title: 'Brand Configuration', subtitle: "Update OnIT India's services, team, and signature guidelines." }
    ];

    tabs.forEach(tab => {
      tab.btn.addEventListener('click', () => {
        tabs.forEach(t => {
          t.btn.classList.remove('active');
          t.panel.classList.remove('active');
        });
        tab.btn.classList.add('active');
        tab.panel.classList.add('active');
        pageTitle.textContent = tab.title;
        pageSubtitle.textContent = tab.subtitle;
        
        // Refresh specific tables on switch
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

    // Single vs Bulk Lead Switchers
    btnMethodSingle.addEventListener('click', () => {
      btnMethodSingle.classList.add('active');
      btnMethodBulk.classList.remove('active');
      formSingleLead.classList.add('active');
      formBulkLeads.classList.remove('active');
    });

    btnMethodBulk.addEventListener('click', () => {
      btnMethodBulk.classList.add('active');
      btnMethodSingle.classList.remove('active');
      formBulkLeads.classList.add('active');
      formSingleLead.classList.remove('active');
    });
  }

  // ─── ACCORDIONS ──────────────────────────────────────────────────────────────
  function setupAccordions() {
    const accordions = [
      { btn: accordionBtnNotes, content: accordionContentNotes },
      { btn: accordionBtnPrompt, content: accordionContentPrompt }
    ];

    accordions.forEach(acc => {
      acc.btn.addEventListener('click', () => {
        const parent = acc.btn.parentElement;
        const isActive = parent.classList.contains('active');
        
        if (isActive) {
          parent.classList.remove('active');
          acc.content.style.maxHeight = '0';
        } else {
          parent.classList.add('active');
          acc.content.style.maxHeight = '350px';
        }
      });
    });
  }

  // ─── API OPERATIONS ──────────────────────────────────────────────────────────

  // Fetch Stats Banner
  async function fetchStats() {
    try {
      const res = await fetch(`${API_BASE}/emails/stats`);
      const data = await res.json();
      if (data.success) {
        const byStatus = data.data.byStatus || {};
        const total = data.data.total || 0;
        const sentCount   = byStatus.sent     || 0;
        const draftCount  = byStatus.draft    || 0;
        const failedCount = byStatus.failed   || 0;
        const sendingCount= byStatus.sending  || 0;
        const openedCount = data.data.opened  || 0;

        statSent.textContent       = sentCount;
        statDrafts.textContent     = draftCount;
        statFailed.textContent     = failedCount;
        statProcessing.textContent = sendingCount;

        // Analytics row
        const rate = total > 0 ? Math.round((sentCount / total) * 100) : 0;
        const analyticsRate    = document.getElementById('analytics-rate');
        const analyticsBar     = document.getElementById('analytics-bar');
        const analyticsFailed  = document.getElementById('analytics-failed');
        const analyticsOpened  = document.getElementById('analytics-opened');
        const analyticsTotalEmails = document.getElementById('analytics-total-emails');
        if (analyticsRate)   analyticsRate.textContent  = total > 0 ? `${rate}%` : '—';
        if (analyticsBar)    analyticsBar.style.width   = `${rate}%`;
        if (analyticsFailed) analyticsFailed.textContent = failedCount;
        if (analyticsOpened) analyticsOpened.textContent = openedCount;
        if (analyticsTotalEmails) analyticsTotalEmails.textContent = total;

        // Filter counts
        const countDraft  = document.getElementById('count-draft');
        const countSent   = document.getElementById('count-sent');
        const countFailed = document.getElementById('count-failed');
        const countOpened = document.getElementById('count-opened');
        if (countDraft)  countDraft.textContent  = draftCount;
        if (countSent)   countSent.textContent   = sentCount;
        if (countFailed) countFailed.textContent = failedCount;
        if (countOpened) countOpened.textContent = openedCount;

        // Enable Send button when there are drafts ready
        if (draftCount > 0) {
          btnCampaignSend.removeAttribute('disabled');
        } else {
          btnCampaignSend.setAttribute('disabled', 'true');
        }

        // Show/hide Retry Failed button
        if (btnRetryFailed) {
          btnRetryFailed.style.display = failedCount > 0 ? 'flex' : 'none';
        }
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }

  // Fetch Brand Profile
  async function fetchProfile() {
    try {
      const res = await fetch(`${API_BASE}/profile`);
      const data = await res.json();
      if (data.success) {
        state.profile = data.data;
        populateProfileForm(data.data);
      }
    } catch (err) {
      console.error('Error loading brand profile:', err);
    }
  }

  // Fetch Recipients List
  async function fetchRecipients() {
    try {
      const searchVal = recipientSearch.value.trim();
      const url = searchVal ? `${API_BASE}/recipients?search=${encodeURIComponent(searchVal)}` : `${API_BASE}/recipients`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        state.recipients = data.data;
        renderRecipientsTable(data.data);
        populateCampaignDropdown(data.data);
        // Update analytics total recipients
        const el = document.getElementById('analytics-total-recipients');
        if (el) el.textContent = data.data.length;
      }
    } catch (err) {
      console.error('Error loading recipients:', err);
    }
  }

  // Fetch Recent Emails List
  async function fetchRecentEmails() {
    try {
      const res = await fetch(`${API_BASE}/emails`);
      const data = await res.json();
      if (data.success) {
        state.allEmails = data.data;
        state.emails = data.data;
        applyEmailFilter(state.activeEmailFilter);
      }
    } catch (err) {
      console.error('Error loading recent emails:', err);
    }
  }

  function applyEmailFilter(filter, searchQuery = '') {
    state.activeEmailFilter = filter;
    const query = searchQuery.toLowerCase();
    let filtered = state.allEmails;

    // Status filter
    if (filter === 'opened') {
      filtered = filtered.filter(e => e.openCount > 0);
    } else if (filter !== 'all') {
      filtered = filtered.filter(e => e.status === filter);
    }

    // Text search
    if (query) {
      filtered = filtered.filter(e =>
        (e.subject || '').toLowerCase().includes(query) ||
        (e.recipientId?.email || '').toLowerCase().includes(query) ||
        (e.recipientId?.companyName || '').toLowerCase().includes(query)
      );
    }

    state.emails = filtered;
    renderRecentEmailsTable(filtered);
    // Update active tab styling
    document.querySelectorAll('.filter-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.filter === filter);
    });
  }

  // ─── RENDERING DATA ──────────────────────────────────────────────────────────

  // Recipients Table
  function renderRecipientsTable(recipients) {
    tableRecipients.innerHTML = '';
    if (recipients.length === 0) {
      tableRecipients.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No recipients found in database.</td></tr>`;
      return;
    }

    recipients.forEach(r => {
      const tr = document.createElement('tr');
      const isResearched = r.researchData && r.researchData.scrapedAt;
      const statusBadge = isResearched 
        ? `<span class="badge badge-sent">Researched</span>`
        : `<span class="badge badge-new">Pending</span>`;
      
      tr.innerHTML = `
        <td><strong>${escapeHtml(r.companyName)}</strong></td>
        <td>
          ${escapeHtml(r.contactName || 'N/A')} <span class="text-muted" style="font-size:11px;">${r.contactTitle ? `(${escapeHtml(r.contactTitle)})` : ''}</span>
          <br/>
          <span class="text-muted" style="font-size:11.5px; font-weight:500;">${escapeHtml(r.email)}</span>
        </td>
        <td><span class="badge badge-draft">${escapeHtml(r.outreachType)}</span></td>
        <td><a href="${escapeHtml(r.website || '#')}" target="_blank" class="text-indigo">${escapeHtml(r.website || 'N/A')}</a></td>
        <td>${statusBadge}</td>
        <td class="actions-cell">
          <button class="btn-icon info btn-generate-recipient-email" data-id="${r._id}" title="Generate Personalized Email">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button class="btn-icon btn-delete-recipient" data-id="${r._id}" title="Delete Recipient">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </td>
      `;
      tableRecipients.appendChild(tr);
    });

    // Event listeners are bound via delegation in init
  }

  // Recent Emails Table
  function renderRecentEmailsTable(emails) {
    tableRecentEmails.innerHTML = '';
    if (emails.length === 0) {
      tableRecentEmails.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No emails found.</td></tr>`;
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
          <button class="btn-icon" style="color:var(--color-indigo);" title="Preview Email" data-id="${e._id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-icon info btn-open-composer" data-id="${e._id}" title="Review &amp; Edit Draft">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"/></svg>
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
  }

  // Populate Recipient Campaigns Selector
  function populateCampaignDropdown(recipients) {
    campaignSelect.innerHTML = `<option value="">All Available Recipients (${recipients.length})</option>`;
    recipients.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r._id;
      opt.textContent = `${r.companyName} (${r.email})`;
      campaignSelect.appendChild(opt);
    });
  }

  // Populate Brand Profile form inputs
  function populateProfileForm(profile) {
    document.getElementById('profile-company').value = profile.companyName || '';
    document.getElementById('profile-tagline').value = profile.tagline || '';
    document.getElementById('profile-email').value = profile.email || '';
    document.getElementById('profile-website').value = profile.website || '';
    document.getElementById('profile-about').value = profile.about || '';
    document.getElementById('profile-mission').value = profile.mission || '';
    document.getElementById('profile-value').value = profile.valueProposition || '';

    // Services Array
    if (profile.services) {
      document.getElementById('profile-services').value = profile.services
        .map(s => `${s.name}: ${s.description}`)
        .join('\n');
    }
    
    // Differentiators Array
    if (profile.differentiators) {
      document.getElementById('profile-differentiators').value = profile.differentiators.join('\n');
    }

    document.getElementById('profile-sig-html').value = profile.signatureHtml || '';
    document.getElementById('profile-sig-plain').value = profile.signaturePlainText || '';
    document.getElementById('profile-tone-overall').value = profile.toneGuidelines?.overall || '';

    if (profile.toneGuidelines?.avoid) {
      document.getElementById('profile-tone-avoid').value = profile.toneGuidelines.avoid.join('\n');
    }
    if (profile.toneGuidelines?.prefer) {
      document.getElementById('profile-tone-prefer').value = profile.toneGuidelines.prefer.join('\n');
    }
  }

  // ─── FORM SUBMISSIONS ────────────────────────────────────────────────────────
  function bindFormSubmissions() {
    
    // 1. Single Lead Form
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
        const res = await fetch(`${API_BASE}/recipients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast('Recipient added successfully!', 'success');
          logToConsole(`[Leads] Added recipient: ${payload.companyName} (${payload.email})`);
          formSingleLead.reset();
          fetchRecipients();
        } else {
          showToast(`Error: ${data.error}`, 'error');
        }
      } catch (err) {
        showToast('Network error while adding lead', 'error');
      }
    });

    // 2. Brand Settings Form
    formBrandProfile.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Convert Services text back to Array of objects
      const servicesRaw = document.getElementById('profile-services').value.split('\n');
      const services = [];
      servicesRaw.forEach(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          services.push({
            name: parts[0].trim(),
            description: parts.slice(1).join(':').trim()
          });
        } else if (line.trim().length > 0) {
          services.push({
            name: line.trim(),
            description: ''
          });
        }
      });

      // Differentiators
      const differentiators = document.getElementById('profile-differentiators').value
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      // Avoid list
      const avoid = document.getElementById('profile-tone-avoid').value
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      // Prefer list
      const prefer = document.getElementById('profile-tone-prefer').value
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      const payload = {
        companyName: document.getElementById('profile-company').value.trim(),
        tagline: document.getElementById('profile-tagline').value.trim(),
        email: document.getElementById('profile-email').value.trim(),
        website: document.getElementById('profile-website').value.trim(),
        about: document.getElementById('profile-about').value.trim(),
        mission: document.getElementById('profile-mission').value.trim(),
        valueProposition: document.getElementById('profile-value').value.trim(),
        services,
        differentiators,
        signatureHtml: document.getElementById('profile-sig-html').value,
        signaturePlainText: document.getElementById('profile-sig-plain').value,
        toneGuidelines: {
          overall: document.getElementById('profile-tone-overall').value.trim(),
          avoid,
          prefer
        }
      };

      try {
        const res = await fetch(`${API_BASE}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          showToast('Brand profile updated!', 'success');
          logToConsole('[Profile] Brand configurations updated successfully.');
          fetchProfile();
        } else {
          showToast(`Error: ${data.error}`, 'error');
        }
      } catch (err) {
        showToast('Network error while saving settings', 'error');
      }
    });

    // 3. Campaign Generation Button
    btnCampaignGenerate.addEventListener('click', async () => {
      const recipientId = campaignSelect.value;
      const outreachType = campaignOutreachType.value;
      const customHint = campaignHint.value.trim();

      if (recipientId) {
        // Run single direct generation pipeline
        triggerEmailGenerationPipeline(recipientId, outreachType, customHint);
      } else {
        // Bulk generation for all
        if (state.recipients.length === 0) {
          showToast('No recipients registered to generate drafts.', 'error');
          return;
        }

        const total = state.recipients.length;

        // Show and reset progress bar
        const progressWrap  = document.getElementById('bulk-progress-wrap');
        const progressBar   = document.getElementById('bulk-progress-bar');
        const progressLabel = document.getElementById('bulk-progress-label');
        const progressCount = document.getElementById('bulk-progress-count');

        progressWrap.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.style.background = 'linear-gradient(90deg, #6366f1, #8b5cf6)';
        progressLabel.textContent = 'Generating drafts...';
        progressCount.textContent = `0 / ${total}`;

        btnCampaignGenerate.setAttribute('disabled', 'true');
        logToConsole(`[Campaign] Started bulk generation draft campaign for ${total} recipients...`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < total; i++) {
          const r = state.recipients[i];
          progressLabel.textContent = `Drafting email for ${r.companyName}...`;
          progressCount.textContent = `${i} / ${total}`;
          logToConsole(`[Campaign] [${i+1}/${total}] Processing AI research and generation for: ${r.companyName}`);

          try {
            const res = await fetch(`${API_BASE}/emails/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ recipientId: r._id, outreachType, customHint })
            });
            const data = await res.json();
            if (data.success) {
              successCount++;
              logToConsole(`[Campaign] ✓ Created draft for ${r.companyName}`);
            } else {
              failCount++;
              logToConsole(`[Campaign] ✗ Failed for ${r.companyName}: ${data.error}`, 'warn');
            }
          } catch (err) {
            failCount++;
            logToConsole(`[Campaign] ✗ Network error for ${r.companyName}`, 'error');
          }

          // Advance progress bar
          const pct = Math.round(((i + 1) / total) * 100);
          progressBar.style.width = `${pct}%`;
          progressCount.textContent = `${i + 1} / ${total}`;
          fetchStats();

          // Small pause between requests to respect Groq rate limits (safe for 100+ emails)
          if (i < total - 1) await new Promise(r => setTimeout(r, 1500));
        }

        // Final state
        btnCampaignGenerate.removeAttribute('disabled');
        const allOk = failCount === 0;
        progressBar.style.width = '100%';
        progressBar.style.background = allOk
          ? 'linear-gradient(90deg, #10b981, #059669)'
          : 'linear-gradient(90deg, #f59e0b, #d97706)';
        progressLabel.textContent = allOk
          ? `✓ All ${successCount} drafts generated!`
          : `Done — ${successCount} generated, ${failCount} failed`;
        progressCount.textContent = `${total} / ${total}`;

        logToConsole(`[Campaign] Bulk generation finished. Successes: ${successCount}, Failures: ${failCount}`);
        showToast(`Bulk drafts completed! (${successCount} generated, ${failCount} failed)`, allOk ? 'success' : 'error');
        fetchRecentEmails();
        fetchStats();

        // Auto-hide progress bar after 4s
        setTimeout(() => {
          progressWrap.style.display = 'none';
        }, 4000);
      }
    });

    // 4. Campaign Bulk Send Dispatch Button
    btnCampaignSend.addEventListener('click', async () => {
      const draftEmails = state.allEmails.filter(e => e.status === 'draft');
      if (draftEmails.length === 0) {
        showToast('No pending drafts ready to send.', 'error');
        return;
      }

      showCustomConfirm(
        "Confirm Bulk Send Dispatch", 
        `Are you sure you want to send all ${draftEmails.length} draft emails out via SMTP?`, 
        "Send All", 
        async () => {
          btnCampaignSend.setAttribute('disabled', 'true');

          // Show send progress bar
          const sendWrap  = document.getElementById('send-progress-wrap');
          const sendBar   = document.getElementById('send-progress-bar');
          const sendLabel = document.getElementById('send-progress-label');
          const sendCount = document.getElementById('send-progress-count');
          const total = draftEmails.length;

          sendWrap.style.display = 'block';
          sendBar.style.width = '0%';
          sendBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
          sendLabel.textContent = 'Dispatching emails...';
          sendCount.textContent = `0 / ${total}`;

          logToConsole(`[SMTP] Bulk dispatch starting for ${draftEmails.length} emails.`);
          showToast('SMTP bulk dispatch started...', 'info');

          let successCount = 0;
          let failCount = 0;

          for (let i = 0; i < draftEmails.length; i++) {
            const e = draftEmails[i];
            const emailAddress = e.recipientId?.email || 'N/A';
            sendLabel.textContent = `Sending to: ${emailAddress}...`;
            logToConsole(`[SMTP] [${i+1}/${draftEmails.length}] Sending to: ${emailAddress}`);

            try {
              const res = await fetch(`${API_BASE}/emails/${e._id}/send`, { method: 'POST' });
              const data = await res.json();
              if (data.success) {
                successCount++;
                logToConsole(`[SMTP] ✓ Delivered to: ${emailAddress}`);
              } else {
                failCount++;
                logToConsole(`[SMTP] ✗ Delivery failed for ${emailAddress}: ${data.error}`, 'error');
              }
            } catch (err) {
              failCount++;
              logToConsole(`[SMTP] ✗ Network error for ${emailAddress}`, 'error');
            }

            const pct = Math.round(((i + 1) / total) * 100);
            sendBar.style.width = `${pct}%`;
            sendCount.textContent = `${i + 1} / ${total}`;
            fetchStats();
            fetchRecentEmails();

            if (i < draftEmails.length - 1) {
              await new Promise(r => setTimeout(r, 3000));
            }
          }

          const allOk = failCount === 0;
          sendBar.style.width = '100%';
          sendBar.style.background = allOk
            ? 'linear-gradient(90deg, #10b981, #059669)'
            : 'linear-gradient(90deg, #f59e0b, #d97706)';
          sendLabel.textContent = allOk
            ? `✓ All ${successCount} emails dispatched!`
            : `Done — ${successCount} sent, ${failCount} failed`;

          btnCampaignSend.removeAttribute('disabled');
          logToConsole(`[SMTP] Bulk send completed. Successes: ${successCount}, Failures: ${failCount}`);
          showToast(`Campaign dispatch finished: ${successCount} sent, ${failCount} failed`, 'success');
          fetchRecentEmails();
          fetchStats();

          setTimeout(() => { sendWrap.style.display = 'none'; }, 5000);
        }
      );
    });
  }

  async function triggerEmailGenerationPipeline(recipientId, outreachType = 'partnership', customHint = '') {
    showToast('Generating personalized email in background... (Takes ~45s)', 'info');
    logToConsole(`[AI] Starting email generation pipeline for recipient: ${recipientId}`);

    // Call API in the background
    try {
      const res = await fetch(`${API_BASE}/emails/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, outreachType, customHint })
      });
      
      const data = await res.json();

      if (data.success) {
        openComposerDrawer(data.data._id);
        fetchRecentEmails();
        fetchStats();
        showToast('Email draft generated successfully!', 'success');
        logToConsole(`[AI] ✓ Draft generated successfully for: ${data.data.recipientId?.companyName || 'Lead'}`);
      } else {
        showToast(`AI generation failed: ${data.error}`, 'error');
        logToConsole(`[AI] ✗ Generation failed: ${data.error}`, 'error');
      }

    } catch (err) {
      console.error('[AI] Fetch error:', err);
      showToast('Network error during AI generation', 'error');
    }
  }

  function setStepState(element, state) {
    element.className = `checklist-item ${state}`;
  }

  // ─── COMPOSER DRAWER EDITOR ──────────────────────────────────────────────────
  async function openComposerDrawer(emailId) {
    state.currentEditingEmailId = emailId;
    
    // Load email data
    try {
      const res = await fetch(`${API_BASE}/emails/${emailId}`);
      const data = await res.json();
      if (data.success) {
        const email = data.data;
        
        drawerRecipientName.textContent = email.recipientId?.companyName || 'Prospect';
        composerTo.value = `${email.recipientId?.contactName || 'Recipient'} <${email.recipientId?.email || ''}>`;
        composerSubject.value = email.subject || '';
        composerBody.value = email.bodyText || email.bodyHtml || '';
        
        // Insights & Prompt details
        composerNotes.textContent = email.aiPersonalizationNotes || 'No notes generated.';
        composerPrompt.textContent = email.promptUsed || 'No prompt logs found.';
        
        // Hide accordions content initially
        accordionContentNotes.parentElement.classList.remove('active');
        accordionContentNotes.style.maxHeight = '0';
        accordionContentPrompt.parentElement.classList.remove('active');
        accordionContentPrompt.style.maxHeight = '0';

        // Check if sent already (disable edit / send buttons)
        if (email.status === 'sent') {
          btnDrawerSave.setAttribute('disabled', 'true');
          btnDrawerSend.setAttribute('disabled', 'true');
          composerSubject.setAttribute('readonly', 'true');
          composerBody.setAttribute('readonly', 'true');
          btnDrawerSend.innerHTML = 'Delivered via SMTP';
        } else {
          btnDrawerSave.removeAttribute('disabled');
          btnDrawerSend.removeAttribute('disabled');
          composerSubject.removeAttribute('readonly');
          composerBody.removeAttribute('readonly');
          btnDrawerSend.innerHTML = 'Send Email Draft';
        }

        // Open drawer
        drawerComposer.classList.add('active');
      }
    } catch (err) {
      showToast('Failed to load email draft details', 'error');
    }
  }

  function closeComposerDrawer() {
    drawerComposer.classList.remove('active');
    state.currentEditingEmailId = null;
  }

  // Save changes in drawer
  btnDrawerSave.addEventListener('click', async () => {
    if (!state.currentEditingEmailId) return;
    
    const payload = {
      subject: composerSubject.value.trim(),
      bodyText: composerBody.value,
      bodyHtml: composerBody.value // Update HTML similarly for edits
    };

    try {
      const res = await fetch(`${API_BASE}/emails/${state.currentEditingEmailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Draft changes saved!', 'success');
        logToConsole(`[Emails] Saved edits to draft Email ID: ${state.currentEditingEmailId}`);
        closeComposerDrawer();
        fetchRecentEmails();
      } else {
        showToast(`Failed: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast('Error saving changes', 'error');
    }
  });

  // Send draft from drawer
  btnDrawerSend.addEventListener('click', async () => {
    if (!state.currentEditingEmailId) return;

    // Save changes first
    const payload = {
      subject: composerSubject.value.trim(),
      bodyText: composerBody.value,
      bodyHtml: composerBody.value
    };

    btnDrawerSend.setAttribute('disabled', 'true');
    showToast('Delivering email...', 'info');

    try {
      // Save changes
      await fetch(`${API_BASE}/emails/${state.currentEditingEmailId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Send
      const sendRes = await fetch(`${API_BASE}/emails/${state.currentEditingEmailId}/send`, {
        method: 'POST'
      });
      const sendData = await sendRes.json();

      if (sendData.success) {
        showToast('Email delivered successfully!', 'success');
        logToConsole(`[SMTP] ✓ Delivered to: ${sendData.data?.recipientId?.email}`);
        closeComposerDrawer();
        fetchRecentEmails();
        fetchStats();
      } else {
        showToast(`Send failed: ${sendData.error}`, 'error');
        logToConsole(`[SMTP] ✗ Delivery failed: ${sendData.error}`, 'error');
        btnDrawerSend.removeAttribute('disabled');
      }
    } catch (err) {
      showToast('Error during email delivery', 'error');
      btnDrawerSend.removeAttribute('disabled');
    }
  });

  // Search input filter
  let searchTimeout;
  recipientSearch.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchRecipients();
    }, 300);
  });

  // ─── CSV FILE PARSER & BULK UPLOADER ─────────────────────────────────────────
  function setupCsvUploader() {
    
    // Click drop zone to choose file
    csvDropZone.addEventListener('click', () => {
      csvFileInput.click();
    });

    // Handle file selection
    csvFileInput.addEventListener('change', (e) => {
      if (csvFileInput.files.length > 0) {
        handleCsvFile(csvFileInput.files[0]);
      }
    });

    // Drag-over styling
    csvDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      csvDropZone.classList.add('dragover');
    });

    csvDropZone.addEventListener('dragleave', () => {
      csvDropZone.classList.remove('dragover');
    });

    // Handle Drop
    csvDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      csvDropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleCsvFile(e.dataTransfer.files[0]);
      }
    });

    // Cancel CSV Modal
    btnCsvCancel.addEventListener('click', () => {
      modalCsvMapper.classList.remove('active');
      csvFileInput.value = '';
      state.parsedCsvData = null;
    });

    // Confirm Upload CSV
    btnCsvConfirm.addEventListener('click', uploadMappedCsvData);
  }

  function handleCsvFile(file) {
    if (!file.name.endsWith('.csv')) {
      showToast('Please upload a valid .csv file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      parseCsvData(text);
    };
    reader.readAsText(file);
  }

  function parseCsvData(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length <= 1) {
      showToast('CSV file is empty or missing data rows', 'error');
      return;
    }

    // Parse CSV rows simple way
    const headerRow = parseCsvLine(lines[0]);
    const dataRows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const rowCells = parseCsvLine(lines[i]);
      if (rowCells.length > 0) {
        dataRows.push(rowCells);
      }
    }

    state.parsedCsvData = {
      headers: headerRow,
      rows: dataRows
    };

    // Open Column mapping modal
    openColumnMapperModal(headerRow, dataRows);
  }

  function parseCsvLine(line) {
    // Simple quotes-aware CSV line split
    const result = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cell.trim());
        cell = '';
      } else {
        cell += char;
      }
    }
    result.push(cell.trim());
    return result;
  }

  function openColumnMapperModal(headers, rows) {
    // Populate column selectors
    const selectors = [mapCompany, mapEmail, mapContact, mapTitle, mapWebsite, mapOutreach, mapDesc];
    selectors.forEach(sel => {
      sel.innerHTML = `<option value="">-- Ignore Column --</option>`;
      headers.forEach((h, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${h} (Col ${idx+1})`;
        sel.appendChild(opt);
      });
    });

    // Smart auto-mapping
    headers.forEach((h, idx) => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (['company', 'companyname', 'name', 'firm', 'organization'].includes(lower)) {
        mapCompany.value = idx;
      } else if (['email', 'emailaddress', 'contactemail'].includes(lower)) {
        mapEmail.value = idx;
      } else if (['contact', 'contactname', 'fullname', 'person'].includes(lower)) {
        mapContact.value = idx;
      } else if (['title', 'contacttitle', 'role', 'designation'].includes(lower)) {
        mapTitle.value = idx;
      } else if (['website', 'site', 'url', 'link'].includes(lower)) {
        mapWebsite.value = idx;
      } else if (['outreach', 'outreachtype', 'intent', 'type'].includes(lower)) {
        mapOutreach.value = idx;
      } else if (['description', 'details', 'about', 'summary'].includes(lower)) {
        mapDesc.value = idx;
      }
    });

    // Populate preview table
    const thead = tableCsvPreview.querySelector('thead');
    const tbody = tableCsvPreview.querySelector('tbody');
    thead.innerHTML = `<tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
    
    tbody.innerHTML = '';
    const previewRows = rows.slice(0, 4); // Preview first 4 rows
    previewRows.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = headers.map((_, idx) => `<td>${escapeHtml(row[idx] || '')}</td>`).join('');
      tbody.appendChild(tr);
    });

    modalCsvMapper.classList.add('active');
  }

  async function uploadMappedCsvData() {
    const colCompanyIdx = mapCompany.value;
    const colEmailIdx = mapEmail.value;
    const colContactIdx = mapContact.value;
    const colTitleIdx = mapTitle.value;
    const colWebsiteIdx = mapWebsite.value;
    const colOutreachIdx = mapOutreach.value;
    const colDescIdx = mapDesc.value;

    if (colCompanyIdx === "" || colEmailIdx === "") {
      showToast("Company Name and Email mapping are required fields!", "error");
      return;
    }

    modalCsvMapper.classList.remove('active');
    showToast("Bulk upload starting...", "info");
    logToConsole(`[CSV] Started bulk recipient uploading from file...`);

    let successCount = 0;
    let failCount = 0;
    const total = state.parsedCsvData.rows.length;

    for (let i = 0; i < total; i++) {
      const row = state.parsedCsvData.rows[i];
      const payload = {
        companyName: row[colCompanyIdx],
        email: row[colEmailIdx],
        contactName: colContactIdx !== "" ? row[colContactIdx] : undefined,
        contactTitle: colTitleIdx !== "" ? row[colTitleIdx] : undefined,
        website: colWebsiteIdx !== "" ? row[colWebsiteIdx] : undefined,
        outreachType: colOutreachIdx !== "" ? row[colOutreachIdx] : undefined,
        description: colDescIdx !== "" ? row[colDescIdx] : undefined
      };

      // Clean empty fields
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined || payload[key] === null || payload[key].toString().trim() === "") {
          delete payload[key];
        }
      });

      // Basic fallback
      if (!payload.outreachType) {
        payload.outreachType = 'partnership';
      }

      try {
        const res = await fetch(`${API_BASE}/recipients`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          // Check if it's a duplicate error
          if (data.error && (data.error.toLowerCase().includes('duplicate') || data.error.toLowerCase().includes('exists'))) {
            logToConsole(`[CSV] Skipped duplicate: ${payload.email}`, 'warn');
          }
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

    logToConsole(`[CSV] Bulk upload complete. Successes: ${successCount}, Failed: ${failCount}`);
    showToast(`Bulk upload finished! (${successCount} added, ${failCount} failed)`, "success");
    csvFileInput.value = '';
    state.parsedCsvData = null;
    fetchRecipients();
  }

  // ─── ESCAPE HTML UTILITY ─────────────────────────────────────────────────────
  function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ─── START THE APP ───────────────────────────────────────────────────────────
  init();

});
