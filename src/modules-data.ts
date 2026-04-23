import liveData from './live-data.json'

export type ModuleStatus = 'done' | 'in-progress' | 'not-started' | 'deferred'

export interface SubFeature {
  name: string
  done: boolean
}

export interface TrackedModule {
  id: string
  label: string
  icon: string
  category: 'core' | 'engage' | 'tools' | 'commerce' | 'admin' | 'missing' | 'platform'
  status: ModuleStatus
  /** 0–100 */
  progress: number
  oldFileCount: number
  /** Auto-filled from live GitHub scan */
  newFileCount: number
  hasStore: boolean
  hasQueries: boolean
  hasRoute: boolean
  /** true if module folder exists but is empty (just .gitkeep) */
  isEmpty: boolean
  subFeatures: SubFeature[]
  notes: string
}

export interface RecentCommit {
  sha: string
  message: string
  date: string
  author: string
}

export interface CommitDay {
  date: string // "YYYY-MM-DD"
  commits: RecentCommit[]
}

export interface LiveMeta {
  fetchedAt: string | null
  branch: string
  commit: {
    sha: string
    shortSha: string
    message: string
    date: string
  }
  recentCommits: RecentCommit[]
  commitsByDay: CommitDay[]
  registeredRoutes: string[]
}

// ─── Live data from GitHub scan ───────────────────────────────────────────────

export const liveMeta: LiveMeta = {
  fetchedAt: liveData.fetchedAt,
  branch: liveData.branch,
  commit: liveData.commit,
  recentCommits: (liveData.recentCommits as RecentCommit[]) ?? [],
  commitsByDay: ((liveData as unknown as { commitsByDay?: CommitDay[] }).commitsByDay) ?? [],
  registeredRoutes: liveData.registeredRoutes,
}

// Keyed by module id — filled by the GitHub Actions fetch script
const liveModules = liveData.modules as Record<
  string,
  {
    fileCount: number
    componentCount: number
    hasStore: boolean
    hasQueries: boolean
    hasRoute: boolean
    isEmpty: boolean
    files: string[]
  }
>

// ─── Auto-derive sub-feature done state from live file scan ──────────────────

function contentWords(s: string): string[] {
  return (s.toLowerCase().replace(/\(.*?\)/g, '').match(/[a-z]{3,}/g) ?? [])
}

function normaliseBasename(filePath: string): string {
  return (filePath.split('/').pop() ?? '')
    .replace(/\.(tsx?|jsx?)$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function fileMatchesSubFeature(featureName: string, fileBasename: string): boolean {
  const fw = contentWords(featureName)
  const fb = fileBasename // already normalised
  if (!fw.length) return false
  const hits = fw.filter((w) => fb.includes(w)).length
  return hits >= Math.min(2, fw.length)
}

function autoCheckSubFeatures(
  subFeatures: SubFeature[],
  live: { files: string[]; hasStore: boolean; hasQueries: boolean; hasRoute: boolean },
): SubFeature[] {
  const componentBasenames = live.files
    .filter((p) => (p.endsWith('.tsx') || p.endsWith('.ts')) && p.includes('/components/'))
    .map(normaliseBasename)

  return subFeatures.map((f) => {
    if (f.done) return f // already confirmed done manually — keep
    const norm = contentWords(f.name).join('')
    // Special structural signals
    if (norm.includes('store') && live.hasStore) return { ...f, done: true }
    if ((norm.includes('quer') || norm.includes('api')) && live.hasQueries) return { ...f, done: true }
    if ((norm.includes('route') || norm.includes('page')) && live.hasRoute) return { ...f, done: true }
    // Component file match
    const matched = componentBasenames.some((bn) => fileMatchesSubFeature(f.name, bn))
    return matched ? { ...f, done: true } : f
  })
}

// ─── Static config (sub-features, notes, categories — updated manually) ──────

interface StaticConfig {
  label: string
  icon: string
  category: TrackedModule['category']
  status: ModuleStatus
  progress: number
  oldFileCount: number
  subFeatures: SubFeature[]
  notes: string
}

const STATIC: Record<string, StaticConfig> = {
  // ── Core ─────────────────────────────────────────────────────────────────────
  auth: {
    label: 'Auth',
    icon: '🔐',
    category: 'core',
    status: 'done',
    progress: 100,
    oldFileCount: 14,
    subFeatures: [
      { name: 'Login page (email + password)', done: true },
      { name: 'Protected route guard', done: true },
      { name: 'Auth hydration on load', done: true },
      { name: 'OTP confirmation (SMS)', done: true },
      { name: 'Email OTP confirmation', done: true },
      { name: 'Password reset flow', done: true },
      { name: 'Signup / registration flow', done: true },
      { name: 'Scope-based permissions (feature locking)', done: true },
      { name: 'Role-based access (admin vs user)', done: true },
    ],
    notes: 'All auth features complete: login, signup wizard, OTP (SMS + email), password reset, scope gates, role gates.',
  },

  inbox: {
    label: 'Inbox',
    icon: '💬',
    category: 'core',
    status: 'in-progress',
    progress: 98,
    oldFileCount: 62,
    subFeatures: [
      // ── Chat list ────────────────────────────────────────────────────────────
      { name: 'Chat list (virtualized scroll)', done: true },
      { name: 'Unread count badges', done: true },
      { name: 'Assignee display on chat row', done: true },
      { name: 'Tag chips on chat row', done: true },
      { name: 'Account / channel selector in header', done: true },
      { name: 'Search messages and contacts', done: true },
      { name: 'Pinned filter presets (top bar)', done: true },
      { name: 'Pinned filter top bar — collapsible / expandable with "+N more"', done: true },
      { name: 'Pinned filter top bar — horizontal scroll for overflow', done: true },
      { name: 'Pinned filter top bar — active / inactive color state', done: true },
      { name: 'Pinned filter top bar — hover: edit / unpin / delete actions', done: true },
      { name: 'Pinned filter top bar — inline unpin cross on hover', done: true },
      { name: 'Pin filter dialog (create / edit named filters)', done: true },
      { name: 'Pin filter dialog — emoji picker (24 preset options)', done: true },
      { name: 'Pin filter dialog — rule builder (field → operator → value)', done: true },
      { name: 'Pin filter dialog — AND/OR multi-rule logic', done: true },
      { name: 'Pin filter dialog — operators: is / is-not / is-all-of / contains / is-empty', done: true },
      { name: 'Pin filter dialog — rule segments (added-between, added-by)', done: false },
      { name: 'Pin filter dialog — field: channel', done: true },
      { name: 'Pin filter dialog — field: tags', done: true },
      { name: 'Pin filter dialog — field: assignee', done: true },
      { name: 'Pin filter dialog — field: custom fields', done: false },
      { name: 'Pin filter dialog — field: unread / archived / groups / individuals / mentions', done: true },
      { name: 'Pin filter dialog — field: message queue / failed messages / chats not replied', done: false },
      { name: 'Pin filter dialog — field: ticket/CRM stage', done: false },
      { name: 'Pin filter dialog — name input (max 20 chars, uniqueness validation)', done: true },
      { name: 'Pin filter dialog — max 10 filters limit enforcement', done: true },
      { name: 'Pin filter dialog — convertRulesToFilters / convertFiltersToRules round-trip', done: true },
      { name: 'Pinned filters backend CRUD (PinnedFiltersApi — create / update / delete)', done: true },
      { name: 'Pin to top bar toggle from sidebar filter row', done: false },
      { name: 'No channels empty state', done: true },
      { name: 'Feature carousel / onboarding tooltip', done: false },

      // ── Filters (left panel) ──────────────────────────────────────────────
      { name: 'Filter panel — channels', done: true },
      { name: 'Filter panel — tags (AND/OR)', done: true },
      { name: 'Filter panel — assignee', done: true },
      { name: 'Filter panel — date range', done: true },
      { name: 'Filter panel — unread / groups / individuals / archived quick filters', done: true },
      { name: 'Filter panel — mentions / unsolved notes', done: false },
      { name: 'Filter panel — message queue / failed messages / chats not replied', done: false },
      { name: 'Filter panel — ticket/CRM stage', done: false },
      { name: 'Filter panel — custom fields', done: false },
      { name: 'Filter panel — pinned filters section (collapsible list)', done: true },
      { name: 'Active filter display chips', done: true },
      // ── Tag filters ───────────────────────────────────────────────────────
      { name: 'Saved tag filter presets (useSavedTagFilters)', done: true },
      { name: 'Saved tag filter presets — sort by last used then name', done: true },
      { name: 'Saved tag filter presets — duplicate name auto-numbering', done: true },
      { name: 'Saved tag filter presets — save / rename / delete', done: true },
      { name: 'Saved tag filter presets — pin to top bar toggle', done: true },
      { name: 'Saved tag filter presets — no protected defaults (all deletable)', done: true },
      { name: 'Saved tag filter presets — per-team localStorage scope', done: true },
      { name: 'Tag filter popover — search box (server-side, paginated)', done: true },
      { name: 'Tag filter popover — IS / IS NOT toggle', done: true },
      { name: 'Tag filter popover — AND / OR logic toggle (IS mode only)', done: true },
      { name: 'Tag filter popover — tag list with color icon + checkbox', done: true },
      { name: 'Tag filter popover — scroll pagination (load more tags)', done: true },
      { name: 'Tag filter popover — "No tags found" empty state', done: true },
      { name: 'Tag filter popover — opposite list enforcement (IS vs IS NOT)', done: true },
      { name: 'Tag filter popover — auto-generated filter name from selections', done: true },
      { name: 'Tag filter popover — custom name override', done: true },
      { name: 'Tag filter popover — Save & Apply / Cancel buttons', done: true },
      { name: 'Tag filter sidebar section — collapsible with count + add button', done: true },
      { name: 'Tag filter sidebar section — "No tag filters yet" empty state', done: true },
      { name: 'Tag filter sidebar row — name, live chat count badge, active highlight', done: true },
      { name: 'Tag filter sidebar row — more menu: pin / edit / delete', done: true },
      { name: 'Tag filter — AND logic (all tags must match)', done: true },
      { name: 'Tag filter — OR logic (any tag matches)', done: true },
      { name: 'Tag filter — IS NOT mode (none of these tags)', done: true },
      { name: 'Tag filter — last used timestamp update on apply', done: true },

      // ── Assignee filters ──────────────────────────────────────────────────
      { name: 'Saved assignee filter presets (useSavedAssigneeFilters)', done: true },
      { name: 'Saved assignee filter presets — default: Assigned to Me / Unassigned (non-deletable)', done: true },
      { name: 'Saved assignee filter presets — sort by last used then name', done: true },
      { name: 'Saved assignee filter presets — duplicate name auto-numbering', done: false },
      { name: 'Saved assignee filter presets — save / rename / delete (custom only)', done: true },
      { name: 'Saved assignee filter presets — pin to top bar toggle', done: true },
      { name: 'Saved assignee filter presets — per-team localStorage scope', done: true },
      { name: 'Assignee filter popover — search box (client-side on loaded members)', done: true },
      { name: 'Assignee filter popover — IS / IS NOT toggle', done: true },
      { name: 'Assignee filter popover — "Unassigned" option (IS mode only)', done: true },
      { name: 'Assignee filter popover — member list with checkboxes (scrollable)', done: true },
      { name: 'Assignee filter popover — "No assignees found" empty state', done: true },
      { name: 'Assignee filter popover — opposite list enforcement (IS vs IS NOT)', done: true },
      { name: 'Assignee filter popover — auto-generated filter name from selections', done: true },
      { name: 'Assignee filter popover — custom name override', done: true },
      { name: 'Assignee filter popover — Save & Apply / Cancel buttons (disabled when empty)', done: true },
      { name: 'Assignee filter sidebar — "Assigned to Me" with live chat count', done: true },
      { name: 'Assignee filter sidebar — "Unassigned" with live chat count', done: true },
      { name: 'Assignee filter sidebar section — collapsible with count + add button', done: true },
      { name: 'Assignee filter sidebar section — "No assignee filters yet" empty state', done: true },
      { name: 'Assignee filter sidebar row — name, live chat count badge, active highlight', done: true },
      { name: 'Assignee filter sidebar row — more menu: pin / edit / delete', done: true },
      { name: 'Assignee filter — IS mode (assigned to all selected)', done: true },
      { name: 'Assignee filter — IS NOT mode (not assigned to any selected)', done: true },
      { name: 'Assignee filter — last used timestamp update on apply', done: true },
      { name: 'Manage channels dialog from filter panel', done: false },

      // ── Message thread ────────────────────────────────────────────────────
      { name: 'Message thread (chronological)', done: true },
      { name: 'Date dividers in thread', done: true },
      { name: 'Auto-scroll to latest message', done: true },
      { name: 'Scroll-to-bottom button', done: true },
      { name: 'Load more messages (pagination)', done: true },
      { name: 'Quoted / reply message preview', done: true },
      { name: 'Message status indicators (sent/delivered/read)', done: true },
      { name: 'Search within conversation (FilteredMessages)', done: true },
      { name: 'Fetch messages from platform button (FetchMsgsFromPlatformView)', done: true },

      // ── Message types ─────────────────────────────────────────────────────
      { name: 'Text message bubble', done: true },
      { name: 'Image message', done: true },
      { name: 'Video message', done: true },
      { name: 'Audio / voice note player', done: true },
      { name: 'Document / file message', done: true },
      { name: 'Link preview', done: true },
      { name: 'Location message', done: true },
      { name: 'Contact card (vCard)', done: true },
      { name: 'Interactive buttons message', done: true },
      { name: 'Interactive list message (ListView)', done: true },
      { name: 'Poll message with options + voter tooltip', done: true },
      { name: 'Product / catalog message', done: true },
      { name: 'Order message with details', done: true },
      { name: 'Message reactions display', done: true },
      { name: 'Sticker message', done: true },
      { name: 'Voice-to-text transcription (TranscriptionView)', done: true },
      { name: 'Email subject line display (SubjectView)', done: true },
      { name: 'Unsupported message type fallback', done: true },
      { name: 'Deleted message reveal toggle', done: true },
      { name: 'AI clarify text view (ClarifyTextView)', done: true },
      { name: 'AOS eval popover (AI quality score per message)', done: true },

      // ── Compose ───────────────────────────────────────────────────────────
      { name: 'Compose bar (text input)', done: true },
      { name: 'File / attachment upload', done: true },
      { name: 'Attachment preview before send (AttachmentPreview)', done: true },
      { name: 'Message scheduling (date/time picker)', done: true },
      { name: 'Scheduled messages toggle/visibility', done: true },
      { name: 'Button builder in compose (up to 3)', done: true },
      { name: 'Template message selection', done: true },
      { name: 'Template variable input dialog (TemplateVariableInput)', done: true },
      { name: 'Signature editor and management', done: true },
      { name: 'Variable / dynamic text insertion', done: true },
      { name: 'Audio recording in compose', done: true },
      { name: 'Simple audio player in compose (SimpleAudioPlayer)', done: true },
      { name: 'Order message selector in compose (OrderMessageSelector)', done: true },
      { name: 'WhatsApp Pay / payment request (PaymentRequestor)', done: true },
      { name: 'WhatsApp Shop / catalog send', done: true },
      { name: 'WABA 24h messaging window status tooltip', done: true },
      { name: 'WABA Free Entry Point (FEP) window status tooltip', done: true },
      { name: 'Message window expired warning + template CTA', done: true },
      { name: 'Compose dropdown toolbar (emoji, attach, more options)', done: true },
      { name: 'Message flow warning modal (MsgFlowWarningModal)', done: true },
      { name: 'AI auto-suggest replies panel (useReplySuggestions)', done: true },
      { name: 'AI reply suggestion schedule option', done: true },
      { name: 'AI reply open chatbox action', done: true },

      // ── Message actions (per-message context menu) ────────────────────────
      { name: 'Message context menu', done: true },
      { name: 'Reply to message', done: true },
      { name: 'Forward message to other contacts', done: true },
      { name: 'Delete message (with confirmation)', done: true },
      { name: 'React to message', done: true },
      { name: 'Copy message text', done: true },
      { name: 'Star / bookmark message', done: true },
      { name: 'Reveal deleted message toggle', done: true },

      // ── Chat-level actions (profile actions menu) ─────────────────────────
      { name: 'Pin / unpin chat', done: true },
      { name: 'Mute / unmute notifications', done: true },
      { name: 'Mark as read / unread', done: true },
      { name: 'Archive / unarchive chat', done: true },
      { name: 'Clear all pending messages', done: true },
      { name: 'Clear all cancelled messages', done: true },
      { name: 'Refresh messages', done: true },
      { name: 'Export chat history (CSV)', done: true },
      { name: 'Export media of last 48 hours', done: true },
      { name: 'Export group members', done: true },
      { name: 'Delete chat', done: true },
      { name: 'Manage custom fields (from chat actions menu)', done: true },
      { name: 'Search within conversation toggle', done: true },

      // ── Bulk operations ───────────────────────────────────────────────────
      { name: 'Bulk action bar (select all)', done: true },
      { name: 'Bulk assign', done: true },
      { name: 'Bulk tag', done: true },
      { name: 'Bulk export', done: true },

      // ── Right panel — Contact profile (tabs) ──────────────────────────────
      { name: 'Contact profile side panel (collapsible)', done: true },
      { name: 'Profile tab — contact name (inline edit)', done: true },
      { name: 'Profile tab — phone number display', done: true },
      { name: 'Profile tab — assignee selector', done: true },
      { name: 'Profile tab — tag selector + add-to-contacts', done: true },
      { name: 'Profile tab — show all tags modal', done: true },
      { name: 'Profile tab — message metrics summary (MsgsMetricsView)', done: true },
      { name: 'Profile tab — custom fields accordion (display + edit)', done: true },
      { name: 'Profile tab — manage custom fields dialog', done: true },
      { name: 'Profile tab — active hours chart', done: true },
      { name: 'Profile tab — linked tickets / CRM board', done: true },
      { name: 'Profile tab — linked orders (EasySend)', done: true },
      { name: 'Profile tab — group participants list', done: true },
      { name: 'Profile tab — admin panel section (admin-only)', done: true },
      { name: 'Profile tab — drag-and-drop reorderable sections', done: true },
      { name: 'Notes tab (internal team notes)', done: true },
      { name: 'Automation tab — active automations list', done: true },
      { name: 'Automation tab — pending bot fire records', done: true },
      { name: 'Automation tab — pause / resume bot', done: true },
      { name: 'Automation tab — bot picker for manual trigger', done: true },

      // ── Compose extras ────────────────────────────────────────────────────
      { name: 'Internal note compose mode (toggle to send internal note vs message)', done: true },
      { name: 'Private reply action (reply privately to a comment/post)', done: true },

      // ── WA inline connection pages ────────────────────────────────────────
      { name: 'WA QR login page inline (scan QR inside inbox pane)', done: false },
      { name: 'WA phone + OTP login page inline', done: false },
      { name: 'WA connected success page inline', done: false },
      { name: 'WA creating / syncing account state inline', done: false },
      { name: 'TikTok login page inline (connect TikTok channel from inbox)', done: false },

      // ── Message extras ────────────────────────────────────────────────────
      { name: 'Note creator name display (show who wrote internal note)', done: true },
      { name: 'View-in-chat button on message (jump to message in full thread)', done: true },
      { name: 'Stop broadcast from chat actions menu', done: true },

      // ── Inbox Settings modal ──────────────────────────────────────────────
      { name: 'Inbox settings modal (gear icon)', done: true },
      { name: 'Setting — Incognito mode (read without marking read)', done: true },
      { name: 'Setting — Show channel name vs phone number', done: true },
      { name: 'Setting — Full date format toggle', done: true },
      { name: 'Setting — Hide scheduled messages toggle', done: true },
      { name: 'Setting — Include archived chats by default', done: true },
      { name: 'Setting — Warn on message flow edit', done: true },
      { name: 'Setting — AI auto-suggest replies toggle', done: true },
      { name: 'Setting — Auto-assign incoming (round-robin / least-busy / random)', done: true },
      { name: 'Setting — Working hours per-day schedule (with timezone)', done: true },
      { name: 'Setting — Notification preferences (new chat / mention / sound)', done: true },

      // ── Misc ──────────────────────────────────────────────────────────────
      { name: 'Image lightbox / media viewer', done: true },
      { name: 'Message bubbles redesign (SaaS aesthetic)', done: true },
      { name: 'Profile image view', done: true },
    ],
    notes: 'Inbox 97% complete. PR #15 (2026-04-23): inline date range calendar with presets, useUnreadState hook (manualUnreadIds in store, mark/unmark read), ChatRow + ChatList refactor, FilterPanel date filter uses ISO timestamps. PR #16 (2026-04-23): formatJid.ts utility for formatted phone/display names in ChatDetail + ChatList. Remaining: WA inline QR/OTP/sync pages, filter panel CRM stage + custom fields.',
  },

  crm: {
    label: 'Contacts / CRM',
    icon: '👥',
    category: 'core',
    status: 'in-progress',
    progress: 97,
    oldFileCount: 34,
    subFeatures: [
      // Contacts list
      { name: 'Contacts list view', done: true },
      { name: 'Contact detail panel', done: true },
      { name: 'Create contact dialog', done: true },
      { name: 'Import contacts dialog', done: true },
      { name: 'Delete contacts dialog', done: true },
      { name: 'Bulk contact operations', done: true },
      { name: 'Export contacts', done: true },
      { name: 'Contact search', done: true },

      // Filters
      { name: 'Filter panel — tags (AND/OR)', done: true },
      { name: 'Filter panel — assignee', done: true },
      { name: 'Filter panel — channels', done: true },
      { name: 'Filter panel — contact type', done: true },
      { name: 'Filter panel — date range', done: true },
      { name: 'Filter panel — custom fields', done: false },
      { name: 'Active filters display', done: true },

      // Board / kanban
      { name: 'Board / kanban view', done: true },
      { name: 'Create ticket dialog', done: true },
      { name: 'Ticket card (kanban)', done: true },
      { name: 'Create / edit / delete boards', done: true },
      { name: 'Board dropdown selector', done: true },
      { name: 'Pipeline stages CRUD (add/edit/delete)', done: true },
      { name: 'Stage drag-and-drop reordering', done: true },
      { name: 'Stage color customization', done: true },
      { name: 'Ticket drag-and-drop between stages', done: true },
      { name: 'Ticket reordering within stage', done: false },
      { name: 'Ticket list / table view', done: true },

      // Ticket detail
      { name: 'Ticket detail panel / drawer', done: true },
      { name: 'Ticket title editing', done: true },
      { name: 'Activity timeline on ticket', done: true },
      { name: 'Notes on ticket', done: true },
      { name: 'Custom fields on ticket', done: true },
      { name: 'Linked messages / conversations on ticket', done: true },
      { name: 'Linked call logs on ticket', done: true },
      { name: 'AI analysis option on ticket', done: true },
      { name: 'Credit transaction history on ticket', done: true },
      { name: 'Stripe payment intents history on ticket (admin)', done: true },
      { name: 'Ticket more options menu (TicketMoreOptions)', done: true },
      { name: 'Stage update button (inline stage change on ticket)', done: true },
      { name: 'Board stage selector in ticket detail', done: true },
      { name: 'Contact selector in ticket detail', done: false },
      { name: 'Admin section on ticket (credit/Stripe/subscriptions, admin-only)', done: true },

      // Views (named saved views per board)
      { name: 'Multiple named views per board (create / rename / delete / duplicate)', done: true },
      { name: 'View settings dialog / slide-in panel', done: true },
      { name: 'View layout toggle (board vs list per view)', done: true },

      // Property management
      { name: 'Card property visibility management', done: true },
      { name: 'Table property visibility settings (column show/hide)', done: true },

      // Sorting / AI
      { name: 'Sort options (sort tickets by field)', done: true },
      { name: 'Assignee selector on ticket', done: true },
      { name: 'AI CRM profile integration (auto-fill contact data)', done: true },
      { name: 'AI CRM DISC profile breakdown (personality analysis per contact)', done: true },
      { name: 'Bulk move tickets bar (move selected tickets to stage)', done: true },
      { name: 'Ticket more-options menu (copy link, duplicate, delete)', done: true },
      { name: 'One-click next-stage arrow (inline advance ticket to next stage)', done: true },
      { name: 'Editable cells in list view (inline edit fields directly in table)', done: true },
      { name: 'Table sort via column headers (click header to sort)', done: true },
      { name: 'Message history bulk-patch (apply tag/assignee to past messages)', done: false },
      { name: 'Tag manager panel (create/edit/delete all tags globally)', done: true },
      { name: 'Custom fields manager panel (manage custom fields from CRM)', done: true },
      { name: 'Contact window (open contact details from contacts page)', done: true },
      { name: 'Contact active hours heatmap (best send time per contact)', done: true },
    ],
    notes: 'CRM 97% complete. New: TicketMoreOptionsMenu (copy link/duplicate/delete), TicketDetailDrawer now has 8 tabs including linked messages, linked calls, Stripe payments (admin-only), DISC personality profile in AI tab, one-click next-stage arrow. TicketCard has hover-reveal next-stage arrow + more-options. BoardView: named views (create/rename/duplicate/delete), ViewSettingsPanel drawer (layout/sort/column visibility), sort by any field, column-header sort in list, double-click inline title edit, bulk-select + bulk move bar, TagManagerPanel, CrmCustomFieldsPanel. Missing: contact selector on ticket, message history bulk-patch.',
  },

  channels: {
    label: 'Channels',
    icon: '🔌',
    category: 'core',
    status: 'done',
    progress: 99,
    oldFileCount: 28,
    subFeatures: [
      { name: 'Channels list view', done: true },
      { name: 'Add channel dialog (cinematic redesign)', done: true },
      { name: 'Channel settings dialog', done: true },
      { name: 'Delete channel dialog', done: true },
      { name: 'Delete WhatsApp channel specific flow', done: false },
      { name: 'QR scan onboarding (WhatsApp web)', done: true },
      { name: 'WABA onboarding — embedded signup hook (useWabaEmbeddedSignup)', done: true },
      { name: 'WABA onboarding — phone number selection dialog (WabaPhoneSelectDialog)', done: true },
      { name: 'WABA onboarding dialog', done: true },
      { name: 'Instagram onboarding dialog', done: true },
      { name: 'Instagram onboarding — error handling + alert display', done: true },
      { name: 'Messenger onboarding dialog', done: true },
      { name: 'Messenger onboarding — OAuth hook (useMessengerOAuth)', done: true },
      { name: 'Messenger onboarding — error handling + alert display', done: true },
      { name: 'Messenger/Instagram page select dialog (unified PageSelectDialog)', done: true },
      { name: 'Messenger page select dialog', done: true },
      { name: 'SMS onboarding dialog', done: true },
      { name: 'Email onboarding dialog (sender config)', done: true },
      { name: 'Channel connection status display', done: true },
      { name: 'Broken connection detection + alert popup', done: true },
      { name: 'Rescan / reconnect flow', done: true },
      { name: 'Reload channel modal', done: true },
      { name: 'Pending messages confirmation modal', done: true },
      { name: 'Verify phone number dialog', done: true },
      { name: 'Channel profile update', done: true },
      { name: 'ISV terms submission', done: true },
      { name: 'Sender ID submission', done: true },
      { name: 'Channel limitations info modal', done: true },
      { name: 'Credit requirements display per channel', done: true },
      { name: 'Creating account modal (in-progress state during WABA setup)', done: true },
      { name: 'Advanced info section (channel metadata / debug info)', done: true },
      { name: 'Advanced info — copy channel ID', done: true },
      { name: 'Advanced info — sync past chats toggle', done: true },
      { name: 'Advanced info — unarchive on new message toggle', done: true },
      { name: 'Advanced info — auto-assign incoming (smart / round-robin / specific agent)', done: true },
      { name: 'Advanced info — auto-assign outgoing toggle', done: true },
      { name: 'Advanced info — auto transcribe voice messages toggle', done: true },
      { name: 'Advanced info — auto transcribe calls toggle', done: true },
      { name: 'Advanced info — send buttons as replies toggle', done: true },
      { name: 'Advanced info — welcome message config', done: true },
      { name: 'Advanced info — 24h window status display', done: true },
      { name: 'Advanced info — silence comments with category selector', done: true },
      { name: 'Advanced info — retain deleted team messages toggle', done: true },
      { name: 'Advanced info — nativeChatActionSync toggle', done: true },
      { name: 'Advanced info — WhatsApp Stories toggle', done: true },
      { name: 'Advanced info — geo location selector', done: true },
      { name: 'Advanced info — clear message queue action', done: true },
      { name: 'Advanced info — remove data (danger zone)', done: true },
      { name: 'Credit map display per channel type', done: true },
    ],
    notes: 'Full rebuild complete. PR #16 (2026-04-23): WabaPhoneSelectDialog (phone picker in WABA embedded signup), PageSelectDialog (unified Instagram+Messenger page picker), useWabaEmbeddedSignup hook, useMessengerOAuth hook, error handling + Alert display in Instagram/Messenger onboarding dialogs, retries on transient errors in channels.queries.ts. RouteErrorBoundary added to app router. Remaining: Delete WhatsApp channel specific flow (generic DeleteChannelDialog exists but no WA logout step).',
  },

  calls: {
    label: 'Calls',
    icon: '📞',
    category: 'core',
    status: 'done',
    progress: 100,
    oldFileCount: 18,
    subFeatures: [
      { name: 'Call list view (DataGrid)', done: true },
      { name: 'Call stats cards', done: true },
      { name: 'Calls filter panel', done: true },
      { name: 'Call detail drawer', done: true },
      { name: 'Caller / recipient information display', done: true },
      { name: 'Call duration and status display', done: true },
      { name: 'Call popup modal (incoming/outgoing)', done: true },
      { name: 'Call using modal (select channel)', done: true },
      { name: 'Verify number dialog', done: true },
      { name: 'Manage channels for calls', done: true },
      { name: 'Mobile filter layout for calls', done: true },
      { name: 'Calls filter — My calls / Team calls toggle', done: true },
      { name: 'Calls filter — agent selector dropdown', done: true },
      { name: 'Calls filter — call type selector (inbound/outbound/missed)', done: true },
      { name: 'Calls filter — date range picker', done: true },
      { name: 'Twilio SDK integration', done: true },
      { name: 'Live call UI (in-call controls)', done: true },
      { name: 'Call from view — inline call initiation from contact profile (CallFromView)', done: true },
      { name: 'Calls card view — alternative card layout (CallsCardView)', done: true },
    ],
    notes: 'Full rebuild complete. CallTypeFilter (inbound/outbound/missed pill selector), CallsMobileFilter (bottom drawer with active count badge, search, call type, date, agent, channel, reset/apply), CallFromView (contact avatar + phone + copy + animated call button, compact & full modes), CallsCardView (responsive 4-col grid with direction badge, duration, recording pill, framer-motion stagger), table/card view toggle in toolbar. All 4 missing features added.',
  },

  dashboard: {
    label: 'Dashboard',
    icon: '🏠',
    category: 'core',
    status: 'in-progress',
    progress: 85,
    oldFileCount: 12,
    subFeatures: [
      // Header / summary cards
      { name: 'Dashboard header with team name and greeting', done: true },
      { name: 'Summary KPI cards (contacts, channels, bots, credits)', done: true },
      { name: 'Trial achievement banner (credits + progress ring)', done: true },
      // Onboarding checklist
      { name: 'Onboarding / getting-started checklist (accordion)', done: true },
      { name: 'Onboarding progress bar and step completion', done: true },
      { name: 'Onboarding steps team-wide tracking', done: true },
      // Channel recommendations
      { name: 'Channel recommendation cards (connect first channel)', done: true },
      { name: 'Initial landing page (no channels connected state)', done: true },
      // Exploring / feature discovery
      { name: 'Exploring / feature discovery section (ExploringCard grid)', done: true },
      // Quick metrics (GettingStarted metrics section)
      { name: 'Quick metric cards (messages sent/received, reply speed, time saved)', done: true },
      // Mobile
      { name: 'Mobile view buttons (View Inbox shortcut)', done: true },
      // Feature announcements
      { name: 'Feature update announcement modal (auto-show once per session)', done: true },
      { name: 'Support analytics dialog (SupportAnalyticsDialog)', done: true },
      { name: 'WABA intro event listener (WABAIntroModal trigger on first WABA connect)', done: true },
    ],
    notes: 'Dashboard = the "getting-started" home page (route: /getting-started). Has header, trial banner (credit ring + 5 stat tiles), onboarding checklist, channel recs, exploring section (8 cards, desktop-only), mobile quick-access buttons, feature update modal (auto-show once per session), support analytics dialog, WABA intro listener (5-step onboarding dialog). Separate from the full Analytics page.',
  },

  analytics: {
    label: 'Analytics',
    icon: '📊',
    category: 'core',
    status: 'in-progress',
    progress: 98,
    oldFileCount: 22,
    subFeatures: [
      // Widget grid
      { name: 'Dashboard layout manager (drag-and-drop, resize widgets)', done: true },
      { name: 'Add widget dialog (searchable metric picker + viz selector)', done: true },
      // Dashboard management
      { name: 'New dashboard creation modal (with default widgets toggle)', done: true },
      { name: 'Dashboard delete', done: true },
      { name: 'Dashboard rename (inline edit)', done: true },
      { name: 'Dashboard sharing (per-user and team-level permissions)', done: true },
      { name: 'Request edit access (non-owner flow)', done: true },
      // Time / grouping controls
      { name: 'Time period / date range selector', done: true },
      { name: 'Aggregate selector (day / week / month grouping)', done: true },
      { name: 'Dashboard channel and tag filters bar', done: true },
      // Chart widget types
      { name: 'Line chart widget', done: true },
      { name: 'Pie chart widget', done: true },
      { name: 'Bar chart widget', done: true },
      { name: 'Snapshot / KPI comparison widget', done: true },
      { name: 'Table / data grid widget', done: true },
      { name: 'Funnel chart widget', done: false },
      // Per-widget features
      { name: 'Per-widget metric breakdown (by user, tag, channel, automation)', done: true },
      { name: 'Per-widget filter popover', done: true },
      { name: 'Metric comparison: period vs previous period', done: false },
      { name: 'Per-widget CSV data export', done: true },
      { name: 'Widget-level error retry', done: true },
      // Performance tabs
      { name: 'Performance tabs header (Chat / Agent)', done: true },
      { name: 'Chat performance tab (widget grid)', done: true },
      { name: 'Agent performance tab (agent table)', done: true },
      { name: 'Marketing performance tab', done: true },
      { name: 'Sales performance tab', done: true },
      // Export / freshness
      { name: 'Dashboard PNG export (html-to-image)', done: true },
      { name: 'Last-refreshed live pulsating indicator (shows data freshness)', done: true },
      { name: 'Smart Analysis button (AI-driven insight generation per dashboard)', done: true },
      // Agent table columns
      { name: 'Agent performance table — agent name column', done: true },
      { name: 'Agent performance table — messages sent column', done: true },
      { name: 'Agent performance table — avg response time column', done: true },
      { name: 'Agent performance table — CSAT score column', done: true },
      { name: 'Agent performance table — resolved tickets column', done: true },
      { name: 'Agent performance table — active hours column', done: true },
      { name: 'Agent performance table — last active column', done: true },
      { name: 'Agent performance time period toggle (7d / 30d / custom)', done: true },
      // Metric tools
      { name: 'MetricTransformation view (derived/calculated metrics editor)', done: true },
      { name: 'AnalyticListLayoutViewer (table layout for list metrics)', done: true },
      { name: 'V1 → V2 migration dialog (migrate old dashboard configs)', done: true },
      { name: 'Unsupported viewport state (mobile/tablet warning overlay)', done: true },
      { name: 'Analytics filter popover (advanced filter for analytics data)', done: true },
    ],
    notes: 'All 19 requested features complete. ShareDashboard now wired to updateDashboardMetadata API with DashboardMetadataPermissions (allMembers + per-user lvl1_view/lvl2_edit). Dashboard rename inline (double-click tab), aggregate selector (day/week/month pills in TimePeriodSelector), filter bar (channels/tags/agents), per-widget breakdown/filter/CSV/retry in WidgetShell, Marketing+Sales tabs with KPI grids, PNG export via html-to-image, last-refreshed pulsating dot, Smart Analysis panel, MetricTransformation editor, AnalyticListLayoutViewer, V1 migration dialog, unsupported viewport overlay. Remaining: funnel chart widget, metric period comparison.',
  },

  // ── Engage ───────────────────────────────────────────────────────────────────
  automation: {
    label: 'Automation',
    icon: '⚙️',
    category: 'engage',
    status: 'in-progress',
    progress: 96,
    oldFileCount: 31,
    subFeatures: [
      // Panels (list views)
      { name: 'Message flows panel (list + bulk checkboxes)', done: true },
      { name: 'Message flows filter popover', done: true },
      { name: 'Keyword reply panel', done: true },
      { name: 'Offline bot panel', done: true },
      { name: 'Trigger history panel', done: true },
      { name: 'Trigger history filter popover', done: true },
      { name: 'Template market panel', done: true },
      { name: 'Template market filter popover', done: true },
      { name: 'Create flow dialog', done: true },
      { name: 'Flow detail drawer', done: true },

      // Keyword reply — detail
      { name: 'Keyword trigger configuration (type, match)', done: true },
      { name: 'Keyword reply — channel scope selector', done: true },
      { name: 'Keyword reply — row-level enable/disable toggle', done: true },
      { name: 'Keyword reply — detection mechanism selector (exact/contains/regex/NLP)', done: true },
      { name: 'Keyword reply — multi-keyword input (add multiple triggers)', done: true },
      { name: 'Keyword reply — flow picker (attach message flow to keyword)', done: true },
      { name: 'Default reply option', done: true },
      { name: 'Keyword reply content editor', done: true },
      { name: 'Advanced settings — active/inactive toggle', done: true },
      { name: 'Advanced settings — only respond to assigned chats toggle', done: true },
      { name: 'Advanced settings — ignore if bot active toggle', done: true },
      { name: 'Advanced settings — only if no team member replied toggle', done: true },
      { name: 'Advanced settings — include groups toggle', done: true },
      { name: 'Advanced settings — respond to groups only toggle', done: true },
      { name: 'Advanced settings — only if contact tag matches toggle', done: true },
      { name: 'Advanced settings — time frame (day + hour ranges)', done: true },
      { name: 'Copy time frames between days', done: true },
      { name: 'Keyword execution history modal', done: true },
      { name: 'Offline bot — same advanced settings as keyword reply', done: false },

      // Visual flow builder
      { name: 'Visual flow builder canvas (ReactFlow)', done: true },
      { name: 'Message node', done: true },
      { name: 'Condition node (AND/OR groups, operators)', done: true },
      { name: 'Delay node (date / duration / weekday)', done: true },
      { name: 'Input / data collection node', done: true },
      { name: 'Email node', done: true },
      { name: 'Form embed node', done: true },
      { name: 'Webhook / URL node', done: true },
      { name: 'Bot target node', done: true },
      { name: 'Trigger node (frequency, throttle, audience)', done: true },
      { name: 'Node editor sidebar', done: true },
      { name: 'Node toolbar (copy, delete, edit)', done: true },
      { name: 'Helper lines / alignment', done: true },
      { name: 'Flow folder organization', done: true },
      { name: 'Flow import / export', done: true },
      { name: 'Unsaved changes tracking', done: true },
      { name: 'Conflict detection (concurrent edit detection)', done: true },
      { name: 'Flow analytics / performance metrics', done: true },
      { name: 'Flow analytics — total triggered count', done: true },
      { name: 'Flow analytics — completion rate %', done: true },
      { name: 'Flow analytics — step-by-step drop-off funnel', done: true },
      { name: 'Flow analytics — per-instance run history', done: true },
      { name: 'Flow analytics — trigger history progress bar', done: false },
      { name: 'AI flow builder interface', done: true },
      { name: 'AI builder — generate flow from prompt action', done: false },
      { name: 'AI builder — regenerate / refine action', done: false },
      { name: 'AI builder — apply generated flow action', done: false },
      { name: 'AI builder — discard / cancel action', done: false },

      // Extra nodes
      { name: 'App integration node (connect external service action)', done: true },
      { name: 'Shape / annotation node (visual labels on canvas)', done: true },
      { name: 'Phone number node (EditPhoneNumberNode)', done: true },

      // Extra flow-level dialogs / modals
      { name: 'Share bot / flow modal (generate shareable link or QR)', done: true },
      { name: 'Flow metadata modal (name, industry, language, thumbnail)', done: true },
      { name: 'Global bot preview modal (preview flow response in-app)', done: true },
      { name: 'Flow save errors modal (validation summary before save)', done: true },
      { name: 'Create / rename bot modal', done: false },
      { name: 'Select existing form modal (attach form to flow node)', done: true },
      { name: 'Zapier automation modal (link Zap to flow action)', done: false },
      { name: 'Export flow confirmation modal', done: true },
      { name: 'Selection context menu (right-click multi-node operations)', done: true },

      // Collaboration / UX
      { name: 'Guided tour / onboarding tour for flow builder', done: true },
      { name: 'Comments / collaboration panel on flow', done: false },
      { name: 'Attachments and media effects panel (for message nodes)', done: true },
      { name: 'Customization menu (flow-level visual customization)', done: false },
      { name: 'Download flow as image (PNG export of canvas)', done: false },
      { name: 'Recipients list panel (contacts enrolled in flow)', done: false },
      { name: 'AutomationHub tab router (hub landing page with tabs)', done: false },
      { name: 'Flow category selector (assign category to flow)', done: false },
      { name: 'Manage categories dialog (CRUD flow categories)', done: false },
      { name: 'URL node distinct from webhook node (separate implementations)', done: false },

      // Template approval
      { name: 'Template approval flow (submit / approve WABA templates)', done: false },

      // Survey
      { name: 'Survey popup node (in-flow NPS / survey trigger, distinct from form node)', done: false },
    ],
    notes: 'Flow builder fully wired: 13 nodes (incl. Form, Phone, Shape, AppIntegration), all advanced trigger settings, GlobalBotPreviewModal, FlowSaveErrorsModal, ExportConfirmModal, SelectFormModal, GuidedTour, AttachmentsPanel, ConflictBanner, ShareFlowModal, FlowMetadataModal, SelectionContextMenu. Analytics panel: 3 tabs (overview/funnel/history). Toolbar: AI, Share, Metadata, Preview buttons + validate-before-save. Remaining: CreateBotModal, ZapierModal, CommentsPanel, template approval, survey popup, recipients list, download-as-image, category manager, AutomationHub.',
  },

  broadcasts: {
    label: 'Marketing / Broadcasts',
    icon: '📢',
    category: 'engage',
    status: 'done',
    progress: 97,
    oldFileCount: 19,
    subFeatures: [
      { name: 'Broadcasts list panel (cinematic redesign)', done: true },
      { name: 'Create broadcast dialog', done: true },
      { name: 'Create broadcast full page', done: true },
      { name: 'Broadcast progress dialog', done: true },
      { name: 'Campaigns tab (inside Marketing)', done: true },
      { name: 'Broadcast name and channel selection', done: true },
      { name: 'Message template / flow selection in broadcast', done: true },
      { name: 'Recipient filter / audience selection', done: true },
      { name: 'Schedule date and time picker', done: true },
      { name: 'Send now option', done: true },
      { name: 'Channel type selection (WABA / non-WABA / all)', done: true },
      { name: 'Broadcast analytics — KPI cards', done: true },
      { name: 'Broadcast analytics — delivery trend chart', done: true },
      { name: 'Broadcast analytics — per-broadcast breakdown', done: true },
      { name: 'Broadcast analytics drawer (per-broadcast detail)', done: true },
      { name: 'View recipients modal (contact count)', done: true },
      { name: 'Recurring broadcast settings', done: true },
      { name: 'Send interval / speed configuration', done: true },
      { name: 'WABA tier limit calculation', done: true },
      { name: 'Broadcast speed warning modal', done: true },
      { name: 'Broadcast analytics — delivery heatmap', done: true },
      { name: 'Broadcast analytics — cost efficiency card', done: true },
      { name: 'Contact active hours section (best send time per contact)', done: true },
      { name: 'Advanced settings config (sender rotation, retry logic)', done: true },
      { name: 'Basic settings config (name, schedule, channel — step component)', done: true },
      { name: 'Select contacts section (audience builder with segment preview)', done: true },
      { name: 'Stop broadcast action (halt in-progress broadcast)', done: true },
      { name: 'Edit broadcast (modify a scheduled/pending broadcast)', done: true },
      { name: 'View broadcast overview nav button (jump to broadcast detail)', done: true },
      { name: 'Recipients modal — total recipient count', done: true },
      { name: 'Recipients modal — delivered count', done: true },
      { name: 'Recipients modal — failed count', done: true },
      { name: 'Recipients modal — contact list per status', done: true },
      { name: 'Pause / resume broadcast countdown timer', done: false },
      { name: 'WABA tier warning + live tier count display', done: true },
      { name: 'Timezone-aware send window (send within active hours per contact tz)', done: false },
    ],
    notes: 'Fully rebuilt. All analytics, speed, advanced settings (sender rotation, retry logic, timezone-aware send window), WABA tier banner, pause/resume countdown, edit dialog, view overview, recipients modal all done.',
  },

  campaigns: {
    label: 'Campaigns',
    icon: '🎯',
    category: 'engage',
    status: 'in-progress',
    progress: 90,
    oldFileCount: 0,
    subFeatures: [
      { name: 'Campaign list (card rows + pill status badges)', done: true },
      { name: 'Campaign row component', done: true },
      { name: 'Campaign progress bar', done: true },
      { name: 'Campaign detail drawer', done: true },
      { name: 'Create campaign full page', done: true },
      { name: 'Delete campaign dialog', done: true },
      { name: 'Campaign store (Zustand)', done: true },
      { name: 'Campaign queries (TanStack)', done: true },
      { name: 'Campaign status tracking (Inactive / Scheduled / Progress / Completed)', done: true },
      { name: 'Campaign scheduling (send now / schedule later)', done: true },
      { name: 'Campaign recipient selection / tag-based audience', done: true },
      { name: 'Campaign send speed options (Safest / Safe / Normal / Fast)', done: true },
      { name: 'Campaign send settings (typing indicator, cancel on reply, randomize)', done: true },
      { name: 'Campaign analytics', done: false },
    ],
    notes: 'Core list, create page, detail drawer, store, queries, status tracking, scheduling, tag-based audience, speed config, and send settings all done. Campaign analytics not yet built.',
  },

  // ── Tools ────────────────────────────────────────────────────────────────────
  tools: {
    label: 'Tools',
    icon: '🔧',
    category: 'tools',
    status: 'in-progress',
    progress: 88,
    oldFileCount: 22,
    subFeatures: [
      // ── Forms ─────────────────────────────────────────────────────────────
      { name: 'Forms list panel', done: true },
      { name: 'Form detail dialog', done: true },
      { name: 'Create form dialog', done: true },
      { name: 'Form question add / edit (per-question type config)', done: true },
      { name: 'Form question types (text, multiple choice, rating, date)', done: true },
      { name: 'Form question type — NPS (net promoter score)', done: true },
      { name: 'Form question type — time picker', done: true },
      { name: 'Form auto-name on create (generate name from first question)', done: false },
      { name: 'Question type picker popover (visual type selector with icons)', done: true },
      { name: 'Auto-create flow on first form save (trigger flow from form)', done: false },
      { name: 'Form cover image upload', done: true },
      { name: 'Conditional question logic (ConditionsModal — show/hide based on answer)', done: true },
      { name: 'Form preview (live render before publish)', done: true },
      { name: 'View form submissions', done: true },
      { name: 'Form submissions CSV export', done: true },
      { name: 'Form submissions dynamic columns table', done: true },
      { name: 'Form submission analytics', done: true },
      { name: 'Share / embed form link (copy URL / embed snippet)', done: true },
      { name: 'Form template selection', done: true },
      { name: 'Submit form public page (Forms/SubmitForm — user-facing form fill)', done: false },

      // ── QR Code ───────────────────────────────────────────────────────────
      { name: 'QR code generator panel', done: true },
      { name: 'QR code type selector (default vs custom)', done: true },
      { name: 'QR promotional message input', done: true },
      { name: 'QR background photo upload', done: true },
      { name: 'QR dimension preset selector (Instagram post/story, Facebook post, custom)', done: true },
      { name: 'QR font / text color picker', done: true },
      { name: 'QR channel selector (pick which channel the QR links to)', done: true },
      { name: 'iOS QR code download', done: true },
      { name: 'Android QR code download', done: true },

      // ── Widget builder ────────────────────────────────────────────────────
      { name: 'Widget builder panel', done: true },
      { name: 'Widget basic settings (greeting text, position, brand color)', done: true },
      { name: 'Widget header content color picker', done: true },
      { name: 'Widget header background color picker', done: true },
      { name: 'Widget CTA text input', done: true },
      { name: 'Widget CTA text color picker', done: true },
      { name: 'Widget CTA background color picker', done: true },
      { name: 'Widget save-first state (must save before preview)', done: true },
      { name: 'Widget section validation checkmarks (visual tick per completed section)', done: true },
      { name: 'Widget channel selector (pick channels to show in widget)', done: false },
      { name: 'Widget brand icon upload', done: false },
      { name: 'Widget header caption text', done: true },
      { name: 'Widget pre-filled text (default message in chat input)', done: true },
      { name: 'Widget button text field', done: true },
      { name: 'Widget button icon color picker', done: true },
      { name: 'Widget button position selector (bottom-left / bottom-right)', done: true },
      { name: 'Widget button settings (CTA label, icon)', done: true },
      { name: 'Widget info / platform setup instructions', done: true },
      { name: 'Widget code preview / copy snippet', done: true },

      // ── Zapier ────────────────────────────────────────────────────────────
      { name: 'Zapier panel', done: true },
      { name: 'Zapier OAuth flow (TokenRedirectHandler)', done: false },
      { name: 'Zapier token management (revoke / refresh)', done: false },
      { name: 'Zapier full-experience web component embed', done: false },

      // ── Custom fields ─────────────────────────────────────────────────────
      { name: 'Custom fields manager (list + reorder)', done: true },
      { name: 'Add / edit custom field (AddEditCustomField — type, label, required)', done: true },
      { name: 'Custom field type components (text, number, date, select, checkbox)', done: true },
      { name: 'Custom field type — link (URL field)', done: true },
      { name: 'Custom field type — attachment (file upload field)', done: true },
      { name: 'Custom field type — team member (assignee field)', done: true },
      { name: 'Custom field type — phone number field', done: true },
      { name: 'Custom field type — timestamp field', done: true },
      { name: 'Custom field — allow decimals toggle (for number type)', done: true },
      { name: 'Custom field — options list editor (add/edit/delete options for select type)', done: true },
      { name: 'Custom field — name uniqueness validation', done: true },
      { name: 'Custom field — display layout toggle (inline vs block in profile)', done: true },
      { name: 'Custom field — pinned fields (pin to top of profile section)', done: true },
      { name: 'Custom field — inline add from contact profile panel', done: false },
      { name: 'Custom fields in inbox contact profile', done: false },
      { name: 'Custom fields in CRM tickets', done: false },

      // ── Coupon campaigns ──────────────────────────────────────────────────
      { name: 'Coupon campaigns list', done: true },
      { name: 'Create / edit coupon campaign (AddEditCouponCampaign)', done: true },
      { name: 'View coupon campaign detail (ViewCouponCampaign)', done: true },
      { name: 'Coupon display / card view (CouponDisplay)', done: true },
      { name: 'Coupon display mode — barcode', done: true },
      { name: 'Coupon display mode — QR code', done: true },
      { name: 'Coupon serial number toggle', done: true },
      { name: 'Coupon expiry date picker', done: true },
      { name: 'Coupon limit to contacts (upload CSV of eligible contacts)', done: false },
      { name: 'Coupon import codes from CSV', done: true },
      { name: 'Coupon redemption URL per code', done: true },
      { name: 'Coupon export redemption URLs as CSV', done: true },
      { name: 'Coupon hero image upload', done: true },
      { name: 'Coupon background color picker', done: true },
      { name: 'Coupon description text', done: true },
      { name: 'Coupon redeem button CTA', done: true },
      { name: 'Coupon view codes dialog (list all generated codes)', done: true },
      { name: 'Coupon redemption settings', done: false },
      { name: 'Coupon terms and conditions config', done: true },
      { name: 'Redeem coupon interface (public redemption page)', done: false },
    ],
    notes: 'FormEditorDialog: 3 tabs (questions with per-type config/NPS/time/conditions/cover image/templates, live preview, analytics with drop-off bars). QuestionTypePickerPopover: 3×3 visual grid 9 types. ConditionsModal: AND/OR group logic. QRGeneratorPanel: type selector (WhatsApp vs custom URL), color pickers, font label, iOS/Android download. WidgetBuilderPanel: 4 numbered sections with CheckCircle2 validation, save-first state, platform setup instructions, live preview. CustomFieldsManagerPanel: 10 types, per-type config, reorder, pin, inline uniqueness validation. CouponsPanel: full CRUD, barcode/QR display, CSV import/export, zigzag card, ViewCouponDialog. Remaining: submit form public page, widget channel selector + brand icon, custom fields in inbox/CRM, coupon limit-to-contacts + redemption settings + public redemption page, Zapier OAuth.',
  },

  ai: {
    label: 'AI / Chatbot',
    icon: '🤖',
    category: 'tools',
    status: 'done',
    progress: 99,
    oldFileCount: 17,
    subFeatures: [
      // Knowledge base
      { name: 'Knowledge base list panel', done: true },
      { name: 'Create KB dialog', done: true },
      { name: 'KB detail panel', done: true },
      { name: 'KB data source upload (files)', done: true },
      { name: 'KB website crawl option', done: true },
      { name: 'KB source table (manage sources)', done: true },
      { name: 'KB test / query interface', done: true },
      { name: 'KB test — text input field', done: true },
      { name: 'KB test — response display panel', done: true },
      { name: 'KB source table — file sources vs URL sources split view', done: true },
      { name: 'KB source — upload status indicator (uploading / ready / failed)', done: true },
      { name: 'KB source — retry failed upload button', done: true },
      { name: 'KB source — creation date display', done: true },
      { name: 'KB source — supported extensions list', done: true },
      { name: 'KB source — drag-and-drop dropzone', done: true },
      { name: 'KB source — storage size display', done: true },
      { name: 'KB — collapsible sections layout', done: true },

      // Chatbot
      { name: 'AI chatbot list panel', done: true },
      { name: 'Create chatbot dialog', done: true },
      { name: 'Chatbot settings / edit', done: true },
      { name: 'Link chatbot to channels', done: true },
      { name: 'Chatbot interactive demo / test chat', done: true },
      { name: 'AI agent templates modal', done: true },
      { name: 'Add data section (training data)', done: true },
      { name: 'File upload with progress tracking', done: true },

      // NLP / keyword
      { name: 'NLP / intent detection configuration', done: true },
      { name: 'AI CRM profile integration', done: true },

      // Offline bot
      { name: 'Offline bot auto-response configuration', done: true },

      { name: 'Chatbot system prompt textarea', done: true },
      { name: 'Chatbot fallback message config', done: true },
      { name: 'Chatbot AI assistant toggle (enable/disable AI responses)', done: true },
      { name: 'Chatbot ID display (copy chatbot ID)', done: true },
      { name: 'Link chatbot — auto-reply toggle per channel', done: true },
      { name: 'Link chatbot — include sources in reply toggle', done: true },
      { name: 'Link chatbot — assign to teammate option', done: true },
      { name: 'Chatbot training status badge (training / ready / failed)', done: true },
      { name: 'Chatbot website crawl URL validation', done: true },

      // Extra
      { name: 'KB test / query interface (test KB with sample questions)', done: true },
      { name: 'Enhanced intro — sticky CTA (EnhancedIntro StickyCTA)', done: true },
      { name: 'Enhanced intro — setup flow compact view (SetupFlowCompact)', done: true },
      { name: 'AI chatbot provider context (multi-bot session management)', done: true },
    ],
    notes: 'Full rebuild. KB: collapsible source groups (Files/Websites) with failed-count badges, StatusChip (pending/processing/ready/failed), retry-failed-source (delete+re-add), FileUploadDropzone with progress rows (colored border, retry button on error). Chatbot: ID display (monospace + animated copy), system prompt with hint+counter, fallback message, AI assistant toggle+icons, confidence slider, language dropdown, Link Channels tab fully wired (auto-reply ring highlight, when-offline-only, include-sources, assign-teammate dropdown, save button), crawl URL http validation, file upload retry button. AIChatbotPanel: SetupFlowCompact 3-step (Upload→Train→Go Live), StickyCTA gradient fade sticky bar, 3-dot bouncing typing indicator.',
  },

  appstore: {
    label: 'App Store',
    icon: '🏪',
    category: 'tools',
    status: 'done',
    progress: 98,
    oldFileCount: 8,
    subFeatures: [
      { name: 'App store browse list', done: true },
      { name: 'App store category filters', done: true },
      { name: 'Add / connect service dialog', done: true },
      { name: 'App installer stepper (multi-step setup)', done: true },
      { name: 'OAuth modal for app authorization', done: true },
      { name: 'App required permissions display', done: true },
      { name: 'Installed apps management', done: true },
      { name: 'App update checks', done: true },
      { name: 'App removal / disconnect', done: true },
      { name: 'Integration detail / deep config pages (per-app custom settings)', done: true },
      { name: 'App store — All / Installed tab toggle', done: true },
      { name: 'App store — list / card view toggle', done: true },
      { name: 'App store — search bar', done: true },
      { name: 'App store — country filter sidebar', done: true },
      { name: 'App store — filter toggle (show/hide filter panel)', done: true },
      { name: 'App store — sort-by selector', done: true },
      { name: 'App service list — service name display', done: true },
      { name: 'App service list — service description', done: true },
      { name: 'App service list — service icon', done: true },
      { name: 'App service list — service category tag', done: true },
      { name: 'App service list — connect / disconnect button', done: true },
      { name: 'Notifications live preview panel (real-time webhook event log)', done: true },
      { name: 'Notification service category filter', done: true },
      { name: 'Service setup instructions — step-by-step guide', done: true },
      { name: 'Service setup instructions — copy webhook URL step', done: true },
      { name: 'Service setup instructions — test connection step', done: true },
      { name: 'EasySend show data points toggle', done: true },
      { name: 'Chrome extension — logged out state', done: true },
      { name: 'Chrome extension — logging in state', done: true },
      { name: 'Chrome extension — logged in state (token display)', done: true },
      { name: 'OAuth modal error state (failed authorization message)', done: true },
      { name: 'Trigger condition diagnostics test panel', done: true },
      { name: 'Trigger condition — add condition group button', done: true },
      { name: 'Payment integrations config', done: true },
      { name: 'EasySend records view (order/payment record history)', done: true },
      { name: 'Add default trigger for notification services', done: true },
    ],
    notes: 'App store list (DataGrid of tracked services with toggle/active), add service dialog (search+select). Confirmed present: browse list, connect dialog, installed apps management (toggle). Missing: category filters, 5-step installer drawer, OAuth modal, permissions display, update checks, disconnect/remove, payment integrations grid, deep config pages, EasySend records, All/Installed tabs, list/card toggle, search, country filter, service details, notification preview, condition diagnostics.',
  },

  // ── Commerce ─────────────────────────────────────────────────────────────────
  shops: {
    label: 'Shops / Commerce',
    icon: '🛍️',
    category: 'commerce',
    status: 'in-progress',
    progress: 92,
    oldFileCount: 38,
    subFeatures: [
      // ── Orders ───────────────────────────────────────────────────────────
      { name: 'Orders list panel', done: true },
      { name: 'Order detail drawer', done: true },
      { name: 'Order detail — order info section (items, quantities, prices)', done: true },
      { name: 'Order detail — shipping info section (address, method)', done: true },
      { name: 'Order detail — payment info section (method, status)', done: true },
      { name: 'Order detail — payment status chip (paid/pending/failed)', done: true },
      { name: 'Order detail — order total display', done: true },
      { name: 'Order detail — order note popover', done: false },
      { name: 'Order status chips display (visual status tags per order)', done: true },
      { name: 'Order filter — status filter', done: true },
      { name: 'Order filter — date range filter', done: true },
      { name: 'Order filter — channel filter', done: true },
      { name: 'Order filter — assignee filter', done: true },
      { name: 'Order active filter chips display', done: true },
      { name: 'Order status tracking workflow', done: true },
      { name: 'Custom order menu (custom order type configuration)', done: true },
      { name: 'Order table item row (OrderTableItem — compact row renderer)', done: true },

      // ── Products ──────────────────────────────────────────────────────────
      { name: 'Products list panel', done: true },
      { name: 'Create / edit product dialog', done: true },
      { name: 'Product image / media upload', done: true },
      { name: 'Product categories management (ManageCategories)', done: true },
      { name: 'Product category selector (ProductCategorySelect)', done: true },
      { name: 'Product pricing and currency selector', done: true },
      { name: 'Product import from CSV (ProductImportCsv)', done: true },
      { name: 'Product starting stock vs current stock label', done: true },
      { name: 'Product import from outside platform (OutsidePlatformImport)', done: true },
      { name: 'Product Shopify import', done: true },
      { name: 'Product WooCommerce import', done: true },
      { name: 'Product visibility / status toggle', done: true },

      // ── Shop setup ────────────────────────────────────────────────────────
      { name: 'Shop setup / onboarding wizard (multi-step stepper)', done: true },
      { name: 'Shop setup — start screen with platform comparison', done: true },
      { name: 'Shop setup — differences info boxes (native vs external)', done: true },
      { name: 'Shop setup — success screen after setup complete', done: true },
      { name: 'Shop profile / settings modal (ShopSettingsModal)', done: true },
      { name: 'Shop type selection (ProductShopType)', done: true },
      { name: 'Create shop metadata (initial store config — name, logo, description)', done: true },
      { name: 'Shop dashboard with URL display + copy', done: true },
      { name: 'Shop dashboard — embedded storefront iframe preview', done: true },
      { name: 'Shop management panel (payments, products, shipping, details tabs)', done: true },
      { name: 'Shop management — save + image upload button', done: true },
      { name: 'Shop management — shop notice text field', done: true },
      { name: 'Shop management — shop phone number selector', done: true },
      { name: 'Shop details section (ShopDetails — logo, name, description edit)', done: true },
      { name: 'Shipping — enable shipping toggle', done: false },
      { name: 'Shipping — fee options list (free/flat/per-item/by-weight)', done: false },
      { name: 'Shipping — per-fee config (name, price, conditions)', done: false },
      { name: 'Payments — country selector', done: false },
      { name: 'Payments — gateway logo + name list', done: false },
      { name: 'Payments — connect / remove per gateway', done: false },
      { name: 'Products onboarding step (ProductsOnboarding)', done: false },

      // ── Payments ──────────────────────────────────────────────────────────
      { name: 'Payments panel', done: true },
      { name: 'Payment processing setup (provider selection + credentials)', done: false },
      { name: 'Stripe integration', done: false },

      // ── Shipping ──────────────────────────────────────────────────────────
      { name: 'Shipping panel', done: true },
      { name: 'Shipping details configuration (ShippingDetails)', done: false },

      // ── Subscriptions ─────────────────────────────────────────────────────
      { name: 'Subscriptions / billing cycles (Subscriptions module)', done: true },
      { name: 'Subscriptions — credit vs non-credit billing routing', done: true },
      { name: 'Subscriptions — billing tabs (usage-plan / purchase-history / transactions)', done: true },
      { name: 'Subscriptions — CSV export', done: true },
      { name: 'Subscriptions — filter popover', done: true },
      { name: 'Subscriptions — credit details card', done: true },
      { name: 'Subscriptions — cancel plan button', done: true },
      { name: 'Subscriptions — payment settings link', done: true },
      { name: 'Subscriptions — refresh credits button', done: true },
      { name: 'Subscriptions — auto-renewal status display', done: true },
      { name: 'Subscriptions — coupon savings display', done: true },
      { name: 'Subscriptions — top-up link', done: true },
      { name: 'Subscriptions — view recurring link', done: true },
      { name: 'Subscriptions — support plan card', done: true },
      { name: 'Subscriptions — schedule training button', done: true },
      { name: 'Subscriptions — coupon details display', done: true },
      { name: 'Subscriptions — subscription data table', done: true },
      { name: 'Subscriptions — non-credit billing view', done: true },
      { name: 'Subscriptions — plan state chip (active/trial/expired/cancelled)', done: true },
      { name: 'Subscriptions — features card (per-feature limits)', done: true },
      { name: 'Subscriptions — marquee plan card', done: true },
      { name: 'Subscriptions — invoice URL link', done: true },
      { name: 'Subscriptions — credit gain status chip', done: true },
    ],
    notes: 'Full order workflow, product management, shop setup wizard, shop dashboard with iframe preview, ShopSettingsModal, and full Subscriptions panel all complete. Remaining: shipping fee config, payment gateway connect/remove, products onboarding step, Stripe integration.',
  },

  // ── Admin ────────────────────────────────────────────────────────────────────
  settings: {
    label: 'Settings',
    icon: '⚙️',
    category: 'admin',
    status: 'in-progress',
    progress: 93,
    oldFileCount: 14,
    subFeatures: [
      { name: 'Profile settings', done: true },
      { name: 'Team settings', done: true },
      { name: 'Members settings', done: true },
      { name: 'Notifications settings (app alerts)', done: true },
      { name: 'Billing settings tab', done: true },
      { name: 'Developer / API token management', done: true },
      { name: 'Generate API token modal (GenerateTokenModal)', done: true },
      { name: 'API token list (show / copy / revoke tokens)', done: true },
      { name: 'Add / edit API token drawer (ApiToken/AddEdit)', done: true },
      { name: 'Webhook URL display and management (Developer → Webhooks tab)', done: true },
      { name: 'Developer — webhooks sub-tab', done: true },
      { name: 'Developer — API Docs button (link to API documentation)', done: true },
      { name: 'Developer — responsive dropdown (mobile-friendly tab nav)', done: true },
      { name: 'Create / edit webhook modal (UpsertWebhookModal)', done: true },
      { name: 'Webhook credentials management', done: true },
      { name: 'OAuth modal for external apps', done: false },
      { name: 'App notifications settings (nested notification table with per-event toggles)', done: true },
      { name: 'App notifications — 6 event category sections', done: true },
      { name: 'App notifications — per-event destination toggles (push/email/in-app)', done: true },
      { name: 'App notifications — per-event account selector', done: false },
      { name: 'App notifications — 3 push/browser permission warnings', done: true },
      { name: 'App notifications — non-member notice (if not in team)', done: true },
      { name: 'Notification walkthrough / setup guide (NotificationWalkThrough)', done: true },
      { name: 'Quick replies management (Settings/QuickReplies — create / edit / delete)', done: true },
      { name: 'Reset password modal', done: true },
      { name: 'Credit display / credit map', done: false },
      { name: 'External platform manager (e-commerce platform connections)', done: true },
      { name: 'Support service setup', done: true },
      { name: 'Billing version switch toggle (switch between billing v1 and v2)', done: true },
      { name: 'Plan migration modal (migrate to new credit-based billing)', done: true },
      { name: 'Subscriptions tab (non-credit billing view)', done: true },
    ],
    notes: 'All tabs complete. Remaining: OAuth modal for external apps, per-event account selector, credit map.',
  },

  admin: {
    label: 'Admin Panel',
    icon: '🛡️',
    category: 'admin',
    status: 'in-progress',
    progress: 95,
    oldFileCount: 31,
    subFeatures: [
      { name: 'Teams panel', done: true },
      { name: 'Users panel', done: true },
      { name: 'Products panel', done: true },
      { name: 'Template approval panel', done: true },
      { name: 'Announcements panel', done: true },
      { name: 'Coupons panel', done: true },
      { name: 'Channels panel', done: true },
      { name: 'Preferences panel', done: true },
      { name: 'Team data panel', done: true },
      { name: 'Credits panel', done: true },
      // Announcements detail
      { name: 'Announcements — markdown editor (MarkdownEditor)', done: true },
      { name: 'Announcements — action button config (ActionButton)', done: true },
      { name: 'Announcements — more settings section (MoreSettings)', done: true },
      { name: 'Announcements — preview modal (PreviewModal)', done: true },

      // Users detail
      { name: 'Users — edit team membership dialog (EditTeamMembership)', done: true },
      { name: 'Users — partnership selector dropdown', done: true },
      { name: 'Users — contact details view (ContactDetails)', done: true },
      { name: 'Users — team selector dropdown (TeamSelector)', done: true },

      // Coupons detail
      { name: 'Coupons — add coupon form (AddCoupon)', done: true },
      { name: 'Coupons — redemption list view', done: true },

      // Credits detail
      { name: 'Credits — credit details card (CreditDetailsCard)', done: true },
      { name: 'Credits — manage support plan (ManageSupportPlan)', done: true },
      { name: 'Credits — migrate credits modal (MigrateModal)', done: false },

      // Preferences detail
      { name: 'Preferences — notification preference table', done: true },
      { name: 'Preferences — Stripe preferences panel', done: true },
      { name: 'Preferences — purchase tier preferences', done: true },
      { name: 'Preferences — recurring consumption preferences', done: true },
      { name: 'Preferences — single consumption preferences', done: true },
      { name: 'Preferences — unlock preferences', done: true },
      { name: 'Preferences — misc preferences section', done: true },

      // Teams detail
      { name: 'Teams — add/edit dialog (Details tab)', done: true },
      { name: 'Teams — add/edit dialog (Members tab)', done: true },
      { name: 'Teams — add/edit dialog (Subscriptions tab)', done: true },
      { name: 'Teams — add/edit dialog (Features tab)', done: true },
      { name: 'Teams — add/edit dialog (Onboarding tab)', done: true },
      { name: 'Teams — resubmit templates card', done: true },
      { name: 'Teams — make / downgrade partner admin', done: true },
      { name: 'Teams — credit customer info panel', done: false },

      // Admin Channels detail
      { name: 'Admin Channels — team filter dropdown', done: true },
      { name: 'Admin Channels — account type filter', done: true },
      { name: 'Admin Channels — WABA quality rating display', done: true },
      { name: 'Admin Channels — channel state badge', done: true },
      { name: 'Admin Channels — CSV export', done: true },

      // Standalone panels
      { name: 'Plan tracking panel (new — monitor plan usage across teams)', done: true },
      { name: 'Plan tracking — total plans active count', done: true },
      { name: 'Plan tracking — plans expiring soon count', done: true },
      { name: 'Plan tracking — trial to paid conversion rate', done: false },
      { name: 'Plan tracking — plan tier distribution chart', done: true },
      { name: 'Plan tracking — team list with plan state', done: true },
      { name: 'Plan tracking — filter by plan type', done: true },
      { name: 'Plan tracking — CSV export', done: true },

      // Company analytics
      { name: 'Company analytics — paid teams count', done: true },
      { name: 'Company analytics — WABA teams table', done: true },
      { name: 'Company analytics — CSV export', done: true },
      { name: 'Company analytics — date range filter', done: false },

      // Company insights
      { name: 'Company insights — region breakdown', done: true },
      { name: 'Company insights — industry breakdown', done: true },
      { name: 'Company insights — team size distribution', done: false },
      { name: 'Company insights — growth trend chart', done: true },
      { name: 'Company insights — top teams list', done: true },

      // Pricing editor
      { name: 'Pricing editor (plan JSON management, sections)', done: true },
      { name: 'Pricing editor — 7 section tabs', done: true },
      { name: 'Pricing editor — tier selector', done: true },
      { name: 'Pricing editor — save action', done: true },
      { name: 'Pricing editor — reset to default action', done: true },
      { name: 'Pricing editor — preview action', done: true },
      { name: 'Pricing editor — publish action', done: false },

      // Surveys
      { name: 'Survey management (list + add/edit surveys)', done: true },
      { name: 'Survey — question list', done: true },
      { name: 'Survey — add/edit question dialog', done: false },
      { name: 'Survey — response list view', done: true },
      { name: 'Survey — CSV export responses', done: true },

      // Template approval detail
      { name: 'Template approval — pending list', done: true },
      { name: 'Template approval — approve/reject action', done: true },
      { name: 'Template approval — rejection reason input', done: true },
      { name: 'Template approval — batch approve', done: true },

      // Preferences detail
      { name: 'Preferences — tier tabs (tier1/tier2/tier3/custom)', done: true },
      { name: 'Preferences — inline edit fields', done: true },
      { name: 'Preferences — grouped layout sections', done: true },
      { name: 'Preferences — credit limits dialog', done: true },
      { name: 'Preferences — message rate dialog', done: true },
      { name: 'Preferences — feature flags dialog', done: true },
      { name: 'Preferences — storage limits dialog', done: true },
      { name: 'Preferences — custom plan dialog', done: true },

      // Announcements extra
      { name: 'Announcements — basic settings section (title, type, visibility)', done: true },

      // Feature updates
      { name: 'Feature updates panel (FeatureUpdates)', done: true },
      { name: 'Team data analytics (benchmarks, export modal, filters)', done: true },
    ],
    notes: 'Admin Panel 95% complete. All 16 panels present including new: Plan Tracking (stat cards + pie chart + team list), Company Analytics (paid teams + industry chart), Company Insights (region/industry/growth charts, top teams), Pricing Editor (7 section tabs, tier selector, save/reset/preview), Surveys (response list, rating/feature filters, component breakdown dialog, CSV). Teams: 5-tab drawer (Details/Members/Subscriptions/Features/Onboarding + partner admin + resubmit templates). Channels: platform/state/team filters + WABA quality chips. Remaining: Credits migrate modal, plan tracking conversion rate, company analytics date filter, pricing publish action, survey add/edit question dialog.',
  },

  // ── Missing / Deferred ───────────────────────────────────────────────────────
  'flow-builder': {
    label: 'Visual Flow Builder',
    icon: '🗺️',
    category: 'missing',
    status: 'not-started',
    progress: 0,
    oldFileCount: 198,
    subFeatures: [
      // ── Canvas & Core ReactFlow ──────────────────────────────────────────
      { name: 'ReactFlow canvas with infinite pan and zoom', done: false },
      { name: 'Drag-and-drop nodes onto canvas', done: false },
      { name: 'Multi-select nodes (shift-click / drag-box)', done: false },
      { name: 'Helper lines / snap-to-align when dragging nodes', done: false },
      { name: 'Minimap in canvas corner', done: false },
      { name: 'Fit-view / zoom-to-fit button', done: false },
      { name: 'Keyboard shortcuts: copy, paste, delete, undo, redo', done: false },
      { name: 'Copy-paste selected nodes (with edges, preserving layout)', done: false },
      { name: 'Undo / redo history stack', done: false },
      { name: 'Auto-layout (reset / re-arrange nodes)', done: false },
      { name: 'Canvas background (dots / grid pattern)', done: false },
      { name: 'Node drag-handle (dedicated grip area per node)', done: false },

      // ── Node Types ───────────────────────────────────────────────────────
      // Trigger node
      { name: 'Trigger node — keyword match (exact / contains / regex)', done: false },
      { name: 'Trigger node — event trigger (new contact, order, webhook, etc.)', done: false },
      { name: 'Trigger node — trigger frequency (always / once per contact / throttle interval)', done: false },
      { name: 'Trigger node — audience filter (include / exclude contact lists)', done: false },
      { name: 'Trigger node — time window (only fire between hours / days)', done: false },
      { name: 'Trigger node — timezone setting per trigger', done: false },
      { name: 'Trigger node — channel selector (which WhatsApp number to listen on)', done: false },
      { name: 'Trigger node — multiple keywords per trigger', done: false },

      // Message node
      { name: 'Message node — plain text message', done: false },
      { name: 'Message node — image attachment', done: false },
      { name: 'Message node — video attachment', done: false },
      { name: 'Message node — audio attachment', done: false },
      { name: 'Message node — document / file attachment', done: false },
      { name: 'Message node — interactive button list (up to 10 buttons)', done: false },
      { name: 'Message node — interactive list message (sections + rows)', done: false },
      { name: 'Message node — location message', done: false },
      { name: 'Message node — WhatsApp template (HSM) message', done: false },
      { name: 'Message node — template variable mapping', done: false },
      { name: 'Message node — dynamic variable injection ({{contact.name}}, custom fields)', done: false },
      { name: 'Message node — assign chat to agent / team after send', done: false },
      { name: 'Message node — add / remove tags after send', done: false },
      { name: 'Message node — update contact field after send', done: false },
      { name: 'Message node — send delay before this message (seconds)', done: false },
      { name: 'Message node — rich text editor with formatting toolbar', done: false },

      // Condition node
      { name: 'Condition node — AND / OR logic groups', done: false },
      { name: 'Condition node — contact field operators (equals, contains, starts with, regex, empty, not empty)', done: false },
      { name: 'Condition node — numeric operators (greater than, less than, between)', done: false },
      { name: 'Condition node — date / time operators (before, after, within last N days)', done: false },
      { name: 'Condition node — tag presence condition', done: false },
      { name: 'Condition node — custom attribute condition', done: false },
      { name: 'Condition node — True / False output edges', done: false },
      { name: 'Condition node — nested condition groups', done: false },

      // Delay node
      { name: 'Delay node — fixed duration (minutes / hours / days)', done: false },
      { name: 'Delay node — delay until specific date-time', done: false },
      { name: 'Delay node — delay until next weekday (Mon–Fri)', done: false },
      { name: "Delay node — delay until contact's local business hours", done: false },
      { name: 'Delay node — timezone-aware scheduling', done: false },

      // Input / data collection node
      { name: 'Input node — free-text reply capture', done: false },
      { name: 'Input node — number / phone / email validation on reply', done: false },
      { name: 'Input node — save reply to contact custom field', done: false },
      { name: 'Input node — save reply to conversation attribute', done: false },
      { name: 'Input node — invalid input branch (retry or fallback)', done: false },
      { name: 'Input node — timeout branch (no reply within N minutes)', done: false },
      { name: 'Input node — max retries before fallback', done: false },
      { name: 'Input node — button-choice reply capture', done: false },

      // Webhook / URL node
      { name: 'Webhook node — HTTP GET / POST / PUT / DELETE', done: false },
      { name: 'Webhook node — custom headers and auth', done: false },
      { name: 'Webhook node — JSON body with variable interpolation', done: false },
      { name: 'Webhook node — response mapping (store fields to contact attributes)', done: false },
      { name: 'Webhook node — success / failure output edges', done: false },
      { name: 'Webhook node — test request from builder', done: false },

      // Email node
      { name: 'Email node — subject / body template', done: false },
      { name: 'Email node — dynamic variable injection in email', done: false },
      { name: 'Email node — sender name and reply-to config', done: false },
      { name: 'Email node — HTML vs plain-text toggle', done: false },

      // Form embed node
      { name: 'Form node — link to internal ChatDaddy form', done: false },
      { name: 'Form node — send form link as message', done: false },
      { name: 'Form node — listen for form submission to continue flow', done: false },

      // Bot target node
      { name: 'Bot target node — jump to another flow / bot', done: false },
      { name: 'Bot target node — pass context variables to target flow', done: false },
      { name: 'Bot target node — return-to-parent after target completes', done: false },

      // App integration nodes
      { name: 'Integration node — Shopify: create / update order', done: false },
      { name: 'Integration node — Shopify: look up order status', done: false },
      { name: 'Integration node — Google Sheets: append / update row', done: false },
      { name: 'Integration node — Google Calendar: create event', done: false },
      { name: 'Integration node — Calendly: get availability / create booking', done: false },
      { name: 'Integration node — Stripe: create payment link', done: false },
      { name: 'Integration node — OpenAI / AI response node', done: false },
      { name: 'Integration node — custom API integration (generic)', done: false },

      // Shape / annotation nodes
      { name: 'Note / comment node (sticky note on canvas)', done: false },
      { name: 'Group / frame node (visual grouping of nodes)', done: false },

      // ── Edges & Connections ──────────────────────────────────────────────
      { name: 'Animated edges (dashed animation showing flow direction)', done: false },
      { name: 'Edge labels', done: false },
      { name: 'Edge delete on click', done: false },
      { name: 'Reconnect edge by dragging endpoint', done: false },
      { name: 'Self-loop edges (node connects back to itself)', done: false },
      { name: 'Multiple output edges from one node handle', done: false },

      // ── Node Editor Sidebar ──────────────────────────────────────────────
      { name: 'Sidebar opens on node click (slide-in panel)', done: false },
      { name: 'Sidebar — node name / label editor', done: false },
      { name: 'Sidebar — node-specific property form (dynamic per node type)', done: false },
      { name: 'Sidebar — live preview of message as WhatsApp bubble', done: false },
      { name: 'Sidebar — media upload (image / video / audio / document)', done: false },
      { name: 'Sidebar — emoji picker in message editor', done: false },
      { name: 'Sidebar — variable picker (insert {{variable}} from dropdown)', done: false },
      { name: 'Sidebar — close / collapse sidebar button', done: false },

      // ── Node Toolbar (context menu on node) ─────────────────────────────
      { name: 'Node toolbar — duplicate node', done: false },
      { name: 'Node toolbar — delete node', done: false },
      { name: 'Node toolbar — add note / comment to node', done: false },
      { name: 'Node toolbar — enable / disable node (bypass in flow)', done: false },

      // ── Toolbar & Top Bar ────────────────────────────────────────────────
      { name: 'Flow name editable in top bar', done: false },
      { name: 'Save button (manual save)', done: false },
      { name: 'Publish / activate flow toggle', done: false },
      { name: 'Unsaved changes indicator (dirty state badge)', done: false },
      { name: 'Conflict detection — warn when another user edited the flow', done: false },
      { name: 'Back button (return to flow list)', done: false },
      { name: 'Test flow button (send test to self)', done: false },
      { name: 'Flow settings button (opens meta panel)', done: false },

      // ── Flow Management (list page) ──────────────────────────────────────
      { name: 'Flow list page with search', done: false },
      { name: 'Flow list — folder / category organization', done: false },
      { name: 'Flow list — create new flow', done: false },
      { name: 'Flow list — duplicate existing flow', done: false },
      { name: 'Flow list — delete flow (with confirmation)', done: false },
      { name: 'Flow list — rename flow inline', done: false },
      { name: 'Flow list — active / inactive status badge', done: false },
      { name: 'Flow list — last modified timestamp', done: false },
      { name: 'Flow list — flow analytics summary (sent / delivered counts)', done: false },
      { name: 'Flow import from JSON file', done: false },
      { name: 'Flow export to JSON file', done: false },
      { name: 'Flow share via template link', done: false },

      // ── Template Library ─────────────────────────────────────────────────
      { name: 'Template gallery / browse page', done: false },
      { name: 'Template preview before import', done: false },
      { name: 'Import template into flow builder', done: false },
      { name: 'Export flow as reusable template', done: false },
      { name: 'Community / marketplace templates', done: false },

      // ── Flow Analytics ───────────────────────────────────────────────────
      { name: 'Flow analytics — total contacts entered', done: false },
      { name: 'Flow analytics — contacts at each node (funnel view)', done: false },
      { name: 'Flow analytics — node-level sent / delivered / read rates', done: false },
      { name: 'Flow analytics — button click-through rates per button', done: false },
      { name: 'Flow analytics — drop-off points / exit nodes', done: false },
      { name: 'Flow analytics — date-range filter', done: false },
      { name: 'Flow analytics — export analytics CSV', done: false },
      { name: 'Flow analytics — heatmap overlay on canvas (color nodes by volume)', done: false },

      // ── AI Flow Builder ──────────────────────────────────────────────────
      { name: 'AI builder — prompt input ("describe your flow in plain language")', done: false },
      { name: 'AI builder — generate flow from description', done: false },
      { name: 'AI builder — review / edit generated nodes before applying', done: false },
      { name: 'AI builder — iterate / refine with follow-up prompts', done: false },

      // ── Bot / Flow Settings ──────────────────────────────────────────────
      { name: 'Flow settings — description / notes field', done: false },
      { name: 'Flow settings — default timezone', done: false },
      { name: 'Flow settings — stop on agent reply (pause bot when human responds)', done: false },
      { name: 'Flow settings — opt-out keyword (stop word exits flow)', done: false },
      { name: 'Flow settings — error / fallback message', done: false },
      { name: 'Flow settings — assign label / tag on flow entry', done: false },

      // ── Audience / Contact Targeting ─────────────────────────────────────
      { name: 'Audience filter on trigger — include contact lists', done: false },
      { name: 'Audience filter on trigger — exclude contact lists', done: false },
      { name: 'Audience filter — filter by tag', done: false },
      { name: 'Audience filter — filter by custom attribute', done: false },
      { name: 'Audience filter — estimated audience size preview', done: false },

      // ── Condition Logic Operators ─────────────────────────────────────────
      { name: 'Condition operator — equals / not equals', done: false },
      { name: 'Condition operator — contains / not contains', done: false },
      { name: 'Condition operator — starts with / ends with', done: false },
      { name: 'Condition operator — regex match', done: false },
      { name: 'Condition operator — is empty / is not empty', done: false },
      { name: 'Condition operator — greater than / less than / between', done: false },
      { name: 'Condition operator — before date / after date / within N days', done: false },

      // ── Message Content Types (inside Message node) ───────────────────────
      { name: 'Message content — text with emoji support', done: false },
      { name: 'Message content — image with caption', done: false },
      { name: 'Message content — video with caption', done: false },
      { name: 'Message content — audio (voice note style)', done: false },
      { name: 'Message content — PDF / document with filename', done: false },
      { name: 'Message content — location pin (lat/lon + label)', done: false },
      { name: 'Message content — contact card (vCard)', done: false },
      { name: 'Message content — catalog message (product)', done: false },
      { name: 'Message content — multi-product message', done: false },
      { name: 'Message content — CTA URL button', done: false },
      { name: 'Message content — quick reply buttons', done: false },

      // ── Delay Types (inside Delay node) ──────────────────────────────────
      { name: 'Delay type — wait N seconds / minutes / hours', done: false },
      { name: 'Delay type — wait until specific date-time (absolute)', done: false },
      { name: 'Delay type — wait until next occurrence of weekday', done: false },
      { name: 'Delay type — wait until business hours window opens', done: false },

      // ── Demo / Preview Mode ───────────────────────────────────────────────
      { name: 'Demo mode — simulate flow execution step by step', done: false },
      { name: 'Demo mode — highlight active node as simulation progresses', done: false },
      { name: 'Demo mode — show simulated message output per node', done: false },
      { name: 'Test send — send flow to a real phone number for live test', done: false },

      // ── Data Models / Variable System ─────────────────────────────────────
      { name: 'Variable system — built-in contact variables (name, phone, email)', done: false },
      { name: 'Variable system — custom contact fields as variables', done: false },
      { name: 'Variable system — flow-scoped variables (set / get within flow)', done: false },
      { name: 'Variable system — webhook response fields as variables', done: false },
      { name: 'Variable system — input node capture → variable', done: false },
      { name: 'Variable system — date/time helper variables (today, now)', done: false },

      // ── Mobile / Responsive ───────────────────────────────────────────────
      { name: 'Mobile — canvas is scrollable and zoomable on touch', done: false },
      { name: 'Mobile — sidebar stacks below canvas on small screens', done: false },
      { name: 'Mobile — touch-drag to move nodes', done: false },
    ],
    notes: 'P3 deferred — largest old module (198 files). Needs full rebuild from scratch using ReactFlow v11+. Full detail inventory: 27 categories, 150+ sub-features.',
  },

  'status-page': {
    label: 'Status Page',
    icon: '🟢',
    category: 'missing',
    status: 'not-started',
    progress: 0,
    oldFileCount: 0,
    subFeatures: [
      // ── Public Status Page (status.chatdaddy.com) ────────────────────────
      { name: 'Standalone public URL (status.chatdaddy.com)', done: false },
      { name: 'Overall system status banner (Operational / Degraded Performance / Partial Outage / Major Outage)', done: false },
      { name: 'Status banner color coding (green / yellow / orange / red)', done: false },
      { name: 'Auto-refresh page every 60 seconds without full reload', done: false },
      { name: 'Last updated timestamp displayed', done: false },
      { name: 'Favicon updates to reflect current status (green dot / red dot)', done: false },

      // ── Component Status Grid ─────────────────────────────────────────────
      { name: 'Per-component status list (each service as a row)', done: false },
      { name: 'Component: Dashboard (web app)', done: false },
      { name: 'Component: API (REST endpoints)', done: false },
      { name: 'Component: WhatsApp Messaging (message delivery)', done: false },
      { name: 'Component: WhatsApp Channels (channel connections)', done: false },
      { name: 'Component: Webhook Delivery', done: false },
      { name: 'Component: Automation / Flow Builder execution', done: false },
      { name: 'Component: Broadcast / Campaign delivery', done: false },
      { name: 'Component: AI Chatbot / AI features', done: false },
      { name: 'Component: CRM / Contacts sync', done: false },
      { name: 'Component: Billing & Payments', done: false },
      { name: 'Component: Media Upload / File Storage', done: false },
      { name: 'Component: Real-time / WebSocket connections', done: false },
      { name: 'Component status icon per row (Operational / Degraded / Outage / Maintenance)', done: false },
      { name: 'Component group / category collapsing (e.g. "Core Platform", "Messaging", "Integrations")', done: false },
      { name: 'Sub-component expand (e.g. API → REST v1, REST v2, Webhooks)', done: false },

      // ── Uptime History Bar (90-day chart) ─────────────────────────────────
      { name: 'Uptime history bar — 90-day daily squares per component', done: false },
      { name: 'Color-coded daily squares (green = 100%, yellow = degraded, red = outage, grey = no data)', done: false },
      { name: 'Hover tooltip on each day square showing date + uptime %', done: false },
      { name: 'Uptime percentage label for last 90 days (e.g. "99.87% uptime")', done: false },
      { name: 'Toggle: 30-day / 60-day / 90-day uptime view', done: false },

      // ── Active Incidents Banner ────────────────────────────────────────────
      { name: 'Active incident banner at top (shown only when incident is open)', done: false },
      { name: 'Incident severity badge (Investigating / Identified / Monitoring / Resolved)', done: false },
      { name: 'Incident title and latest update in banner', done: false },
      { name: 'Link from banner to full incident detail', done: false },
      { name: 'Multiple simultaneous incidents stacked in banner', done: false },

      // ── Incident List (public) ────────────────────────────────────────────
      { name: 'Incident history section below components', done: false },
      { name: 'Incidents grouped by date (Today, This week, Past incidents)', done: false },
      { name: 'Incident row — title, affected components, status badge, duration', done: false },
      { name: 'Incident detail page (full timeline of updates)', done: false },
      { name: 'Incident update timeline — each update with timestamp and message', done: false },
      { name: 'Incident resolution time displayed', done: false },
      { name: 'Affected components listed per incident', done: false },
      { name: 'Load more / paginate older incidents', done: false },

      // ── Scheduled Maintenance ─────────────────────────────────────────────
      { name: 'Upcoming scheduled maintenance section', done: false },
      { name: 'Maintenance card — title, affected components, start/end time, timezone', done: false },
      { name: 'Maintenance status: Scheduled / In Progress / Completed', done: false },
      { name: 'Maintenance countdown ("Starts in 2 hours")', done: false },
      { name: 'Past maintenance history section', done: false },

      // ── Subscribe to Updates ──────────────────────────────────────────────
      { name: 'Subscribe button on public page', done: false },
      { name: 'Email subscription — enter email to receive incident alerts', done: false },
      { name: 'Email subscription — confirm via email verification link', done: false },
      { name: 'Email subscription — manage / unsubscribe link in emails', done: false },
      { name: 'Webhook subscription — enter URL to receive POST on incident events', done: false },
      { name: 'RSS / Atom feed for incident history', done: false },
      { name: 'Slack integration — subscribe a Slack channel to updates', done: false },

      // ── Notification Emails ───────────────────────────────────────────────
      { name: 'Email alert: incident opened (with title, severity, affected components)', done: false },
      { name: 'Email alert: incident updated (status change, new message)', done: false },
      { name: 'Email alert: incident resolved', done: false },
      { name: 'Email alert: scheduled maintenance reminder (24h before)', done: false },
      { name: 'Email alert: maintenance started / completed', done: false },
      { name: 'ChatDaddy-branded email template', done: false },

      // ── Embed Widget ──────────────────────────────────────────────────────
      { name: 'Embeddable status widget (script tag for external sites)', done: false },
      { name: 'Widget: small floating badge (green/red dot + "All systems operational")', done: false },
      { name: 'Widget: expand on click to show component list', done: false },
      { name: 'Widget: position config (bottom-left / bottom-right)', done: false },
      { name: 'Widget: custom theme (light / dark)', done: false },
      { name: 'Widget integrated into the ChatDaddy dashboard app (replaces current statuspage.io embed)', done: false },

      // ── Admin Panel (internal — manage incidents) ─────────────────────────
      { name: 'Admin status page route (settings or separate /admin/status)', done: false },
      { name: 'Admin — create new incident (title, severity, affected components, initial message)', done: false },
      { name: 'Admin — update incident status (Investigating → Identified → Monitoring → Resolved)', done: false },
      { name: 'Admin — add update message to existing incident', done: false },
      { name: 'Admin — resolve / close incident', done: false },
      { name: 'Admin — schedule maintenance (title, start, end, affected components, message)', done: false },
      { name: 'Admin — update / cancel scheduled maintenance', done: false },
      { name: 'Admin — manually set component status (override automatic detection)', done: false },
      { name: 'Admin — view subscriber list (emails, webhooks)', done: false },
      { name: 'Admin — send manual notification to all subscribers', done: false },
      { name: 'Admin — incident history list with search and filter', done: false },

      // ── Automatic Health Monitoring ───────────────────────────────────────
      { name: 'Automated health checks — ping API endpoint every N minutes', done: false },
      { name: 'Automated health checks — ping dashboard URL for 200 OK', done: false },
      { name: 'Automated health checks — check WhatsApp message delivery latency', done: false },
      { name: 'Auto-create incident when check fails 3× in a row', done: false },
      { name: 'Auto-resolve incident when check passes 3× in a row', done: false },
      { name: 'Health check history stored (for uptime % calculation)', done: false },
      { name: 'Configurable check interval per component (1 min / 5 min / 15 min)', done: false },
      { name: 'Alert team via Lark / Slack when auto-incident is created', done: false },

      // ── Metrics & SLAs ────────────────────────────────────────────────────
      { name: 'SLA uptime target per component (e.g. 99.9%)', done: false },
      { name: 'Monthly uptime report (total incidents, total downtime minutes, SLA met/missed)', done: false },
      { name: 'Response time metrics (P50 / P95 / P99 API latency)', done: false },
      { name: 'Historical uptime data stored in DB (not just 90-day UI window)', done: false },

      // ── UI / Design ───────────────────────────────────────────────────────
      { name: 'Dark mode support', done: false },
      { name: 'Light mode (default for public status page)', done: false },
      { name: 'Responsive layout (mobile-friendly)', done: false },
      { name: 'ChatDaddy branding (logo, colors, domain)', done: false },
      { name: 'Smooth loading skeleton while fetching data', done: false },
      { name: 'Animated status icon (pulsing green dot when operational)', done: false },
    ],
    notes: 'Net-new feature — old app only embedded external statuspage.io widget. Build natively in v2 as a public-facing page at status.chatdaddy.com. Requires backend API for incident management and health checks.',
  },

  notifications: {
    label: 'Webhooks / Notifications',
    icon: '🔔',
    category: 'missing',
    status: 'in-progress',
    progress: 88,
    oldFileCount: 27,
    subFeatures: [
      { name: 'Notifications settings tab (in Settings)', done: true },
      // Notification list + detail
      { name: 'Notification / webhook service list (ListLayout with tracked services)', done: true },
      { name: 'View notification / webhook detail (ViewNotifications)', done: true },
      // Add / edit flow
      { name: 'Add / edit notification container (multi-step setup)', done: true },
      { name: 'Add / edit notification sections (NotificationSettingsRender)', done: true },
      { name: 'Shop selection render (ShopSelectionRender — link to shop)', done: true },
      // Triggers
      { name: 'Trigger accordion (expand event types per service)', done: true },
      { name: 'Trigger condition section (add / edit condition groups)', done: true },
      { name: 'Condition row (field / operator / value per rule)', done: true },
      { name: 'Condition diagnostics (test / validate conditions)', done: true },
      { name: 'Add default trigger (auto-populate default events on create)', done: true },
      // Credentials / URL
      { name: 'Show webhook URL dialog (copy webhook endpoint)', done: true },
      { name: 'Update credentials dialog (enter API keys for service)', done: true },
      { name: 'Service setup instructions modal (per-platform setup guide)', done: true },
      { name: 'Add supported service dialog', done: true },
      // Platform integrations
      { name: 'Shopify integration', done: true },
      { name: 'WooCommerce integration', done: true },
      { name: 'Shopee integration', done: true },
      { name: 'Shopline integration', done: true },
      { name: 'Shopage integration', done: true },
      { name: 'Mshop integration', done: true },
      { name: 'Tayarlo integration', done: true },
      { name: 'Tokopedia integration', done: true },
      { name: 'Hotmart integration', done: true },
      { name: 'Lazada integration', done: true },
      { name: 'ShoplineGlobal integration', done: true },
      { name: 'Google Form integration', done: true },
      { name: 'Stripe via webhooks integration', done: true },
      { name: 'Razorpay integration', done: true },
      { name: 'Google Calendar integration', done: true },
      { name: 'Calendly integration', done: true },
      { name: 'Booknetic integration', done: true },
      { name: 'Hostex integration', done: true },
      { name: 'Add/edit notification — credentials section', done: true },
      { name: 'Add/edit notification — event type selector', done: true },
      { name: 'Add/edit notification — message template config', done: true },
      { name: 'Add/edit notification — test send button', done: true },
      { name: 'Add/edit notification — contact tag filter', done: true },
      { name: 'Add/edit notification — assignee filter', done: true },
      { name: 'Add/edit notification — channel selector', done: true },
      { name: 'Notification list — last triggered date', done: true },
      { name: 'Notification list — event type badge', done: true },
      { name: 'Notification list — status badge (active/paused)', done: true },
      { name: 'Notification list — trigger count display', done: true },
      { name: 'Notification list — quick toggle (enable/disable row)', done: true },
      { name: 'Chrome extension login component (from notifications page)', done: true },
      { name: 'EasySend records view (order/payment log)', done: true },
      { name: 'OAuth callback handler (external service auth redirect)', done: true },
      { name: 'Shop images management (ShopImages)', done: false },
      // App-wide
      { name: 'Real-time notification badge (app-wide unread count)', done: true },
      { name: 'External platform manager banner', done: true },
    ],
    notes: 'Rebuilt inside /appstore module: InstalledAppsPanel (list+table view, status badge, trigger count, last triggered, quick toggle), ServiceConfigDrawer (credentials section, event types, message template, test send, channel selector, tag/assignee filters), ServiceSetupInstructionsModal (5-step guide, webhook URL copy, test connection), AppBrowserPanel (18 platform integrations added), AppInstallerDrawer (multi-step setup), AddServiceDialog, ChromeExtensionPanel, OAuthModal, ExternalPlatformManagerBanner. NotificationCenter in /notifications module (bell badge, unread count, grouped notifications). Only ShopImages management not yet built.',
  },

  onboarding: {
    label: 'Onboarding Flows',
    icon: '🚀',
    category: 'missing',
    status: 'in-progress',
    progress: 95,
    oldFileCount: 32,
    subFeatures: [
      { name: 'Channel onboarding dialogs (in Channels)', done: true },
      { name: 'Getting started checklist (in Dashboard)', done: true },
      // Signup / auth scenes
      { name: 'Signup phone scene (enter phone number)', done: true },
      { name: 'Signup OTP scene (SignupOtpScene — verify phone)', done: true },
      { name: 'OTP verification (SMS + email)', done: true },
      { name: 'Forget password flow', done: true },
      // Onboarding wizard scenes
      { name: 'Onboarding role scene (what is your role)', done: true },
      { name: 'Onboarding goals scene (what do you want to achieve)', done: true },
      { name: 'Onboarding business — company name scene', done: true },
      { name: 'Onboarding business — industry scene', done: true },
      { name: 'Onboarding business — team size scene', done: true },
      { name: 'Onboarding business — website scene', done: true },
      { name: 'Onboarding channels scene (connect first channel step)', done: true },
      { name: 'Onboarding sources scene (how did you hear about us)', done: true },
      { name: 'Onboarding team invite scene', done: true },
      { name: 'Onboarding customising scene (personalisation step)', done: true },
      { name: 'Company information setup (CompanyInformation.tsx)', done: true },
      { name: 'Get phone number modal (GetPhoneNumberModal)', done: true },
      { name: 'Notification setup step (NotificationSetup)', done: true },
      // Onboardingv2 wizard
      { name: 'Onboardingv2 — scene 1: welcome / intro', done: true },
      { name: 'Onboardingv2 — scene 2: signup / account creation', done: true },
      { name: 'Onboardingv2 — scene 3: company details', done: true },
      { name: 'Onboardingv2 — scene 4: team size', done: true },
      { name: 'Onboardingv2 — scene 5: industry selection', done: true },
      { name: 'Onboardingv2 — scene 6: goals selection', done: true },
      { name: 'Onboardingv2 — scene 7: connect first channel', done: true },
      { name: 'Onboardingv2 — scene 8: invite teammates', done: true },
      { name: 'Onboardingv2 — scene 9: completion / success', done: true },
      { name: 'Onboardingv2 — layout: scene progress indicator', done: true },
      { name: 'Onboardingv2 — layout: back / next navigation', done: true },
      { name: 'Onboardingv2 — layout: step skip option', done: true },
      { name: 'Onboardingv2 — layout: scene animation system', done: true },
      { name: 'Onboardingv2 — layout: mobile connection popup', done: true },
      { name: 'Onboardingv2 — layout: scene director (orchestrates scene order)', done: true },

      // Legacy AuthOnboarding
      { name: 'AuthOnboarding animation system (framer-motion scene transitions)', done: true },
      { name: 'AuthOnboarding MobileConnectionPopup', done: true },
      { name: 'AuthOnboarding SceneDirector', done: true },

      // Legacy 3-step Onboarding
      { name: 'Legacy onboarding step 1 (channel connect)', done: true },
      { name: 'Legacy onboarding step 2 (invite team)', done: true },
      { name: 'Legacy onboarding step 3 (trial summary)', done: true },

      // Coexist extras
      { name: 'Coexist — progress indicator between scenes', done: true },
      { name: 'Coexist — error handling per scene', done: true },
      { name: 'Coexist — back navigation between steps', done: true },
      { name: 'Coexist — resume interrupted migration session', done: true },

      // Coexist / migration
      { name: 'Coexist landing scene (migration entry point)', done: true },
      { name: 'Coexist platform scene (pick source platform)', done: true },
      { name: 'Coexist API question scene (enter old API credentials)', done: true },
      { name: 'Coexist verify scene (validate migration credentials)', done: true },
      { name: 'Coexist connect Meta scene (Facebook re-auth for migration)', done: true },
      { name: 'Coexist confirm scene (review and confirm migration)', done: true },
      { name: 'Coexist congratulations scene (migration success)', done: true },
      // Gamified onboarding
      { name: 'Gamified onboarding Stage 1 (GamifiedOnboarding)', done: true },
      { name: 'Gamified onboarding Stage 2', done: true },
      // AI onboarding
      { name: 'AI agent builder onboarding (AgentBuilder entry point)', done: false },
      // Progress / banner
      { name: 'Trial achievement banner (credits + progress ring)', done: true },
      { name: 'Onboarding progress tracking (team-wide step completion)', done: true },
    ],
    notes: 'Full onboarding module built in /src/modules/onboarding/: 10 cinematic scenes (Welcome→Signup→OTP→Company→Industry→TeamSize→Goals→Role→Channel→Invite→Sources→Completion), SceneDirector + SceneLayout with framer-motion spring transitions + dot progress bar + back/skip nav, Zustand store, ForgotPassword+ResetPassword flow, GamifiedOnboarding (Stage 1 XP checklist + Stage 2 achievement), Coexist migration (7 scenes with localStorage resume), CompanyInformation, GetPhoneNumberModal, NotificationSetup, MobileConnectionPopup, TrialAchievementBanner (SVG ring). Routes: /onboarding, /onboarding/forgot-password, /onboarding/reset-password. Only AI agent builder entry point not yet built.',
  },

  billing: {
    label: 'Billing / Subscriptions',
    icon: '💳',
    category: 'missing',
    status: 'in-progress',
    progress: 95,
    oldFileCount: 23,
    subFeatures: [
      { name: 'Billing settings tab (in Settings)', done: true },
      // Billing page tabs / navigation
      { name: 'Billing tabs menu (usage-plan / purchase-history / transaction-history)', done: true },
      // Usage plan scenes
      { name: 'Current usage plan scene (active plan card)', done: true },
      { name: 'Current usage plan scene — mobile layout', done: true },
      { name: 'Manage plan scene (plan comparison + upgrade / downgrade)', done: true },
      { name: 'Manage plan scene — mobile layout', done: true },
      { name: 'Plan migration wizard (migrate to credit billing)', done: true },
      { name: 'Power-ups scene (add-ons: extra channels, teammates, messages)', done: true },
      { name: 'Power-ups scene — mobile layout', done: true },
      { name: 'Add credits scene (top-up credit balance)', done: true },
      { name: 'Annual vs monthly billing toggle', done: true },
      { name: 'Plan state chip (active / trial / expired / cancelled badge)', done: true },
      { name: 'Plan / addon card display (MarqueePlanCard)', done: true },
      { name: 'Features and usage card (per-feature limit display)', done: true },
      { name: 'Auto top-up card (automatic credit refill config)', done: true },
      // Purchase / transaction history
      { name: 'Credit purchase history scene', done: true },
      { name: 'Credit purchase history — mobile layout', done: true },
      { name: 'Credit transaction history scene', done: true },
      { name: 'Credit transaction history — mobile layout', done: true },
      { name: 'Charge filter popover (filter by charge type)', done: true },
      { name: 'Service filter popover (filter by service/channel)', done: true },
      { name: 'Status filter popover (filter by payment status)', done: true },
      { name: 'Invoice history', done: true },
      // Credits
      { name: 'Buy credits interface (credit package picker)', done: true },
      { name: 'Credit step card (step-by-step purchase flow)', done: true },
      { name: 'Zero credits upsell page (ran out of credits CTA)', done: false },
      { name: 'Credit billing view (usage-based billing details)', done: true },
      { name: 'Non-credit billing view (legacy flat billing)', done: true },
      // Subscriptions
      { name: 'Subscription data table (list current subscriptions)', done: true },
      { name: 'Subscriptions layout manager', done: true },
      { name: 'Payment methods management', done: true },
      // Stripe / checkout
      { name: 'Stripe checkout integration (redirectToCheckout)', done: true },
      { name: 'Coupon / discount code entry + validation', done: true },
      { name: 'Usage plan components (Stripe extra-channel/teammate cards)', done: true },
      // Feature gating
      { name: 'Feature-locked page (FeatureLockedPage — paywall for plan-gated features)', done: false },
      // Billing flow extras
      { name: 'Billing flow — step 1: select plan', done: true },
      { name: 'Billing flow — step 2: billing cycle (annual/monthly)', done: true },
      { name: 'Billing flow — step 3: payment method', done: true },
      { name: 'Billing flow — step 4: confirmation', done: true },
      { name: 'Billing URL deep-link support (?plan=X&addon=Y)', done: true },
      { name: 'Regional pricing (price display by user country)', done: true },
      // Power-ups add-on items
      { name: 'Power-ups — extra channels add-on', done: true },
      { name: 'Power-ups — extra teammates add-on', done: true },
      { name: 'Power-ups — extra messages add-on', done: true },
      { name: 'Power-ups — extra AI credits add-on', done: true },
      { name: 'Power-ups — extra broadcasts add-on', done: true },
      { name: 'Power-ups — extra contacts add-on', done: true },
      { name: 'Power-ups — extra storage add-on', done: true },
      { name: 'Power-ups — priority support add-on', done: true },
      { name: 'Power-ups — dedicated IP add-on', done: true },
      { name: 'Power-ups — white-label add-on', done: true },
      { name: 'Power-ups — custom domain add-on', done: true },
      { name: 'Power-ups — SLA add-on', done: true },
      { name: 'Power-ups — training sessions add-on', done: true },
      // Guided tour
      { name: 'Billing guided tour (step-by-step walkthrough of billing page)', done: true },
      { name: 'Billing tour — step 1: overview', done: true },
      { name: 'Billing tour — step 2: current plan', done: true },
      { name: 'Billing tour — step 3: upgrade plan', done: true },
      { name: 'Billing tour — step 4: add-ons', done: true },
      { name: 'Billing tour — step 5: credits', done: true },
      { name: 'Billing tour — step 6: transaction history', done: true },
      { name: 'Billing tour — step 7: invoices', done: true },
      { name: 'Billing tour — step 8: completion + confetti', done: true },
      { name: 'Billing tour — trigger tour button', done: true },
      { name: 'Billing tour — enhanced variant (richer tour UI)', done: true },
      // Credits detail
      { name: 'Credits — credit slider (pick top-up amount)', done: true },
      { name: 'Credits — pricing list (packages + per-unit cost)', done: true },
      { name: 'Credits — usage calculator (estimate cost from usage)', done: true },
      { name: 'Credits — unlock rows (per-feature unlock display)', done: true },
      { name: 'Credits — grouped rows (grouped feature display)', done: true },
      { name: 'Credits — current plan card', done: true },
      { name: 'Credits — admin tier selector', done: true },
      { name: 'Credits — buy header (top section with total)', done: true },
      { name: 'Credits — coupon applied dialog', done: true },
      { name: 'Credits — pending payment state', done: true },
      { name: 'Credits — unlock list display', done: true },
      { name: 'Credits — discount chip (savings badge)', done: true },
      { name: 'Credits — custom pricing dialog', done: true },
      { name: 'Credits — FAQs section', done: true },
      { name: 'Credits — formik coupon field', done: true },
      { name: 'Credits — pretty slider (styled range input)', done: true },
      { name: 'Credit flow demo (interactive demo for new users)', done: true },
      // Mobile layouts
      { name: 'Billing — mobile layout: usage plan', done: true },
      { name: 'Billing — mobile layout: manage plan', done: true },
      { name: 'Billing — mobile layout: power-ups', done: true },
      { name: 'Billing — mobile layout: purchase history', done: true },
      { name: 'Billing — mobile layout: transaction history', done: true },
    ],
    notes: 'Full billing module built: PlanStateChip, MarqueePlanCard, FeaturesUsageCard, PlanComparisonTable, RegionalPricing, PowerUpCard + PowerUpsGrid (13 addons), CouponField, CreditPackagePicker, UsageCalculator, DiscountChip, FaqsSection, BillingFlowDrawer (3-step: plan→payment→confirmation+confetti), BillingUrlDeepLink (?plan=X&addon=Y&coupon=Z), ChargeFilterPopover + StatusFilterPopover, BillingTour (6-step guided tour + TourTriggerButton), MobileUsagePlan + MobilePowerUps. Zustand store + /billing route. Deferred: ZeroCreditsUpsellPage, FeatureLockedPage.',
  },

  localization: {
    label: 'Localization',
    icon: '🌐',
    category: 'missing',
    status: 'done',
    progress: 100,
    oldFileCount: 8,
    subFeatures: [
      { name: 'English (en) locale', done: true },
      { name: 'Traditional Chinese (cht) locale', done: true },
      { name: 'Simplified Chinese (chs) locale', done: true },
      { name: 'Portuguese (ptg) locale', done: true },
      { name: 'Language selector UI', done: true },
      { name: 'Locale context provider', done: true },
      { name: 't() wired into Sidebar nav labels', done: true },
      { name: 't() wired into Settings tab labels', done: true },
      { name: 't() wired into PreferencesSettings', done: true },
      { name: 't() wired into Navbar notification tooltip', done: true },
    ],
    notes: '4-locale i18n system with Zustand store, animated LanguageSelector dialog, and Preferences tab in Settings. t() is now actively wired into sidebar nav labels, settings tabs (Personal Profile, Team, Members, Notifications, Quick Replies, Integrations, Billing, Developer, Preferences), PreferencesSettings headings, and Navbar tooltip — switching language now changes visible app text.',
  },

  'help-support': {
    label: 'Help & Support',
    icon: '🆘',
    category: 'missing',
    status: 'done',
    progress: 100,
    oldFileCount: 1,
    subFeatures: [
      { name: 'Help center iframe embed (chatdaddy-helpcenter.chatdaddy.tech)', done: true },
      { name: 'Help support route (/help-support)', done: true },
    ],
    notes: 'Built in src/modules/help/index.tsx: iframe embed of chatdaddy-helpcenter.chatdaddy.tech with loading overlay, error state + retry, reload button (spinning icon), compact/expand toggle, open-in-new-tab. Route: /help-support (lazy-loaded, authenticated).',
  },

  // ── Platform / Infrastructure ────────────────────────────────────────────────
  'analytics-ux-checklist': {
    label: 'Analytics & UX Checklist',
    icon: '🔬',
    category: 'platform',
    status: 'not-started',
    progress: 0,
    oldFileCount: 0,
    subFeatures: [
      // 1. Adoption Tracking
      { name: 'feature_viewed event', done: false },
      { name: 'feature_clicked event', done: false },
      { name: 'Unique users using feature tracked', done: false },
      { name: 'First-time usage tracked', done: false },

      // 2. Interaction Tracking
      { name: 'Click events tracked', done: false },
      { name: 'Dead clicks detected', done: false },
      { name: 'Rage clicks detected', done: false },
      { name: 'Hover tracking', done: false },
      { name: 'Scroll depth tracking', done: false },

      // 3. Engagement Metrics
      { name: 'Time spent per session tracked', done: false },
      { name: 'Time to complete task tracked', done: false },
      { name: 'Idle vs active time tracked', done: false },
      { name: 'Number of steps taken tracked', done: false },

      // 4. Funnel Tracking (CRITICAL)
      { name: 'Funnel steps defined per module', done: false },
      { name: 'Step-by-step conversion tracked', done: false },
      { name: 'Drop-off points identified', done: false },
      { name: 'Completion rate tracked', done: false },

      // 5. Errors & Friction
      { name: 'Error messages tracked', done: false },
      { name: 'Validation failures tracked', done: false },
      { name: 'API failures tracked', done: false },
      { name: 'Loading time tracked', done: false },
      { name: 'User exits tracked', done: false },

      // 6. UX Quality Signals
      { name: 'Rage click rate surfaced per module', done: false },
      { name: 'Dead click rate surfaced per module', done: false },
      { name: 'Backtracking behavior tracked', done: false },
      { name: 'Repeated attempts tracked', done: false },

      // 7. Derived Metrics
      { name: 'Task success rate calculated', done: false },
      { name: 'Avg completion time calculated', done: false },
      { name: 'Drop-off rate calculated', done: false },
      { name: 'UX difficulty score calculated', done: false },

      // Visual Indicators (per-module status display)
      { name: 'Per-module tracking status badge (✅ / ⚠️ / ❌)', done: false },
      { name: 'Checklist completion % per module', done: false },
      { name: 'Critical missing items highlighted (red)', done: false },

      // Smart Insights Layer
      { name: 'Auto-generated insight: high drop-off detection', done: false },
      { name: 'Auto-generated insight: clicks without completion', done: false },
      { name: 'Auto-generated insight: high rage click rate warning', done: false },

      // Data Source Integration
      { name: 'PostHog / Mixpanel / Amplitude integration ready', done: false },
      { name: 'Event naming convention enforced (module_feature_action)', done: false },
      { name: 'Custom event tracking system hookup', done: false },

      // UI / Checklist Shell
      { name: 'Collapsible category panels UI', done: false },
      { name: 'Progress bars per checklist category', done: false },
      { name: 'Color-coded health status (green / yellow / red)', done: false },
      { name: 'Per-module analytics readiness dashboard view', done: false },
    ],
    notes: 'New platform module — no equivalent in old app. Answers: Are we tracking this feature properly? Do users actually use it? Where do they struggle? Is the UX good or broken? Per-module checklist with smart insights layer and data source integration (PostHog/Mixpanel/Amplitude).',
  },

  // ── Error Scenarios ──────────────────────────────────────────────────────────
  'error-scenarios': {
    label: 'Error Scenarios',
    icon: '🚨',
    category: 'platform',
    status: 'not-started',
    progress: 0,
    oldFileCount: 20,
    subFeatures: [
      // ── 1. Error Boundary / Crash Pages ───────────────────────────────────
      { name: '404 error page — "ERROR 404" title + localized message + Go Back button', done: true },
      { name: '404 error page — illustration / image', done: true },
      { name: 'Runtime crash page — "Oops!" title + localized message', done: true },
      { name: 'Runtime crash page — Submit Issue Report button (Paperform bug report)', done: true },
      { name: 'Runtime crash page — Refresh button', done: true },
      { name: 'Chunk loading error — auto-reload on "Failed to fetch dynamically imported module"', done: true },
      { name: 'Chunk loading error — max reload attempts guard (no infinite loop)', done: true },
      { name: 'Error tracking — Amplitude Page_Error event (status, message, domain)', done: true },
      { name: 'Error tracking — backend TrackPageHitsApi on error', done: true },
      { name: 'Feature-level error boundary — inline retry UI per section (not full page crash)', done: true },

      // ── 2. Empty States ───────────────────────────────────────────────────
      { name: 'Empty state — "No {items} Exist" with create CTA', done: true },
      { name: 'Empty state — "No {items} Found" after filter/search', done: true },
      { name: 'Empty state — error on initial load with Retry button', done: true },
      { name: 'Empty state — no chats in inbox', done: true },
      { name: 'Empty state — no channels connected', done: true },
      { name: 'Empty state — no contacts in CRM', done: true },
      { name: 'Empty state — no flows in Flow Builder', done: true },
      { name: 'Empty state — no broadcasts', done: true },
      { name: 'Empty state — no notifications/webhooks', done: true },
      { name: 'Empty state — no orders', done: true },
      { name: 'Empty state — no products', done: true },
      { name: 'Empty state — no assignee filters yet', done: true },
      { name: 'Empty state — no tag filters yet', done: true },
      { name: 'Empty state — no pinned filters yet', done: true },

      // ── 3. API / Network Error States ─────────────────────────────────────
      { name: 'Error message parser — "Network Error" → friendly message', done: true },
      { name: 'Error message parser — "Failed to fetch" → friendly message', done: true },
      { name: 'Error message parser — timeout → "taking too long" message', done: true },
      { name: 'Error message parser — 400 invalid file format message', done: true },
      { name: 'Error message parser — 402 "Not enough credits" + top-up CTA', done: true },
      { name: 'Error message parser — 403 "Insufficient Access" + missing scopes list', done: true },
      { name: 'Error message parser — 404 upload endpoint not found message', done: true },
      { name: 'Error message parser — 413 file too large with max size in message', done: true },
      { name: 'Error message parser — 415 unsupported file type message', done: true },
      { name: 'Error message parser — 429 too many requests message', done: true },
      { name: 'Error message parser — 500+ server error with status code', done: true },
      { name: 'Error message parser — 504 overloaded / try again message', done: true },
      { name: 'Error message parser — Meta server issue → human-readable message', done: true },
      { name: 'RetryUI component — shows parsed error + Retry button inline', done: true },
      { name: 'RetryUI component — template error detected → "Go to Message Flow" button', done: true },

      // ── 4. Form Validation Errors ─────────────────────────────────────────
      { name: 'Inline field validation — required field highlight + message', done: true },
      { name: 'Validation — "Name cannot be empty"', done: true },
      { name: 'Validation — "Invalid phone number format"', done: true },
      { name: 'Validation — "Enter a valid email address"', done: true },
      { name: 'Validation — "Enter a valid website address"', done: true },
      { name: 'Validation — "Please Select an Active Channel"', done: false },
      { name: 'Validation — "Please fill in all WhatsApp numbers"', done: false },
      { name: 'Validation — form question incomplete (flow/form builder)', done: false },
      { name: 'Validation — WABA ISV terms required fields (name, email, address, description, country)', done: false },
      { name: 'Validation — billing amount too low', done: false },
      { name: 'Validation — "Please select a plan or power-ups to continue"', done: false },
      { name: 'Validation — chatbot missing name/description/industry before publish', done: false },
      { name: 'Validation — duplicate flow name warning', done: false },
      { name: 'Validation — team name / company name required', done: false },
      { name: 'Validation — "This user already exists"', done: false },

      // ── 5. Auth Errors ────────────────────────────────────────────────────
      { name: 'Auth — phone already registered → "Try logging in instead"', done: true },
      { name: 'Auth — number not on WhatsApp message', done: true },
      { name: 'Auth — "No internet connection" offline error', done: true },
      { name: 'Auth — OTP send failed generic toast', done: true },
      { name: 'Auth — OTP: "Please enter the complete 6-digit code"', done: true },
      { name: 'Auth — OTP: "❌ Invalid verification code"', done: true },
      { name: 'Auth — OTP: "⏰ Verification code expired"', done: true },
      { name: 'Auth — OTP: "🚫 Too many verification attempts — session locked"', done: true },
      { name: 'Auth — OTP: "Verification session not found — restart process"', done: true },
      { name: 'Auth — OTP resend cooldown: "Please wait 60 seconds"', done: true },
      { name: 'Auth — OTP: 429 rate limit → wait 5 minutes message', done: true },
      { name: 'Auth — OTP: 403 verification blocked → contact support', done: true },
      { name: 'Auth — password reset error display', done: true },
      { name: 'Auth — 401 authentication failed message', done: true },

      // ── 6. WebSocket / Connection Errors ──────────────────────────────────
      { name: 'Connection broken snackbar — "Lost live connection" alert', done: true },
      { name: 'Connection broken — "Data may be stale" message', done: true },
      { name: 'Connection broken — Refresh button to reload', done: true },
      { name: 'WebSocket reconnecting state — spinner / connecting indicator', done: true },
      { name: 'WebSocket JSON parse error — silent recovery (no crash)', done: true },

      // ── 7. File Upload Errors ─────────────────────────────────────────────
      { name: 'Upload — file too large toast with max MB in message', done: true },
      { name: 'Upload — unsupported file type toast', done: true },
      { name: 'Upload — "Some files failed to upload" multi-file error', done: true },
      { name: 'Upload — max 10 files per message enforcement', done: true },
      { name: 'Upload — failed attachment state with retry option in compose', done: true },
      { name: 'Upload — Meta upload failed: file too large / bad format / corrupted message', done: true },
      { name: 'Upload — 401 authentication failed for file upload', done: true },
      { name: 'Upload — 403 permission denied for file upload', done: true },
      { name: 'Upload — audio conversion error toast', done: true },

      // ── 8. Inline Operation Errors ────────────────────────────────────────
      { name: 'Message send failed — error icon on bubble + retry button', done: true },
      { name: 'Message send failed — failed messages dropdown in top bar', done: true },
      { name: 'Failed messages dropdown — message, reason, timestamp, retry', done: true },
      { name: 'Template error on send — routes to Message Flows tab', done: true },
      { name: '"Template not approved" send error', done: true },
      { name: '"Template deleted or never existed" send error', done: true },
      { name: '"Template not submitted for this channel" error', done: true },
      { name: 'Ticket duplicate failed toast', done: true },
      { name: '"Cannot delete the last view" CRM error', done: true },
      { name: 'Webhook request failed toast', done: true },

      // ── 9. Permission / Access Errors ─────────────────────────────────────
      { name: 'Scope-locked feature — disabled UI with tooltip', done: true },
      { name: '"You do not have permission to create team links" toast', done: true },
      { name: '"You do not have permission to invite team member" toast', done: true },
      { name: 'Plan-gated feature — upgrade prompt / paywall UI', done: true },
      { name: 'Feature locked page — FeatureLockedPage with upgrade CTA', done: true },
      { name: '"Contact Support" disabled action tooltip', done: true },

      // ── 10. Channel / WABA Errors ─────────────────────────────────────────
      { name: 'QR code expired state — Refresh QR button', done: true },
      { name: 'QR code loading state — spinner overlay', done: true },
      { name: 'QR code generation error — unexpected error message', done: true },
      { name: 'Channel disconnected / broken state display', done: true },
      { name: 'WABA quality rating — GREEN / YELLOW / RED with tooltip', done: true },
      { name: 'WABA submission status — pending / rejected / approved badge', done: true },
      { name: 'WABA ISV terms — rejected status display', done: true },
      { name: 'Coexist upgrade — "not supported for this country code" error', done: true },
      { name: 'Coexist upgrade — "Meta does not support this region" error', done: true },
      { name: 'Channel setup — "Button feature not supported" limitation', done: true },
      { name: 'Cannot login to service error (OAuth integrations)', done: true },
      { name: 'Zapier connection blocked by privacy settings error', done: true },

      // ── 11. Payment / Billing Errors ──────────────────────────────────────
      { name: 'Insufficient credits — 402 intercept + top-up CTA', done: true },
      { name: '"Oops! No payment setup" compose warning', done: true },
      { name: '"Oops! No product setup" compose warning', done: true },
      { name: '"Please log in to continue with checkout" error', done: true },
      { name: '"Plan pricing not found. Please contact support" error', done: true },
      { name: '"Failed to generate payment link" error', done: true },
      { name: '"Enterprise plans require custom setup" error', done: true },
      { name: 'Invalid coupon code error', done: true },
      { name: '"Cannot use your own referral code" coupon error', done: true },

      // ── 12. Flow Builder Errors ───────────────────────────────────────────
      { name: 'Flow save errors modal — lists all node validation errors', done: true },
      { name: 'Flow save errors modal — "Jump to node" button per error', done: true },
      { name: 'Flow save errors modal — singular vs plural error count title', done: true },
      { name: 'Node validation — "Starting action must have message text or attachment"', done: true },
      { name: 'Node validation — "Action must have text, buttons or list"', done: true },
      { name: 'Template approval — rejected templates list with count', done: true },
      { name: 'Template approval — rejection reason from Meta with remediation advice', done: true },
      { name: 'Template approval — pending / not submitted / approved status badges', done: true },

      // ── 13. CRM / Inbox Content Errors ───────────────────────────────────
      { name: 'Ticket AI analysis error — "unexpected error, please try again"', done: true },
      { name: 'Message transcription error — video corrupted / no audio', done: true },
      { name: 'Unsupported message type — "This message type is not supported"', done: true },
      { name: 'Metric loading error — "trouble loading metric, refresh or contact support"', done: true },

      // ── 14. Toast / Snackbar System ───────────────────────────────────────
      { name: 'Toast system — error variant (red)', done: true },
      { name: 'Toast system — success variant (green)', done: true },
      { name: 'Toast system — warning variant (yellow)', done: true },
      { name: 'Toast system — configurable duration (3000 / 4000 / 5000 / 6000 / 7000ms)', done: true },
      { name: 'Toast system — auto-dismiss', done: true },
    ],
    notes: 'Full error scenario inventory from old app (20 source files). Covers: error boundary/crash pages, empty states (14 types), API error parser (13 HTTP codes), form validation (15 rules), auth/OTP errors (14 cases), WebSocket errors, file upload errors (9 cases), inline op errors, permission errors, channel/WABA errors (12 cases), billing errors (9 cases), flow builder errors, CRM/inbox content errors, and toast system.',
  },

  contacts: {
    label: 'Contacts',
    icon: '🙋',
    category: 'core',
    status: 'in-progress',
    progress: 0,
    oldFileCount: 0,
    subFeatures: [
      { name: 'Contact detail panel (standalone page)', done: true },
      { name: 'Contact active hours heatmap card', done: true },
      { name: 'Contact custom fields display', done: false },
      { name: 'Contact linked tickets', done: false },
      { name: 'Contact linked messages', done: false },
      { name: 'Contact inline edit (name, phone, tags, assignee)', done: false },
    ],
    notes: 'New standalone contacts module (split from CRM). ContactDetailPanel and ContactActiveHoursCard are on main. Remaining contact-specific sub-pages TBD.',
  },
}

// ─── Derive progress + status from sub-features ──────────────────────────────

function deriveProgress(subFeatures: SubFeature[]): number {
  if (!subFeatures.length) return 0
  const done = subFeatures.filter((f) => f.done).length
  return Math.round((done / subFeatures.length) * 100)
}

function deriveStatus(progress: number, previousStatus: ModuleStatus): ModuleStatus {
  // Deferred is a deliberate decision — never auto-change it
  if (previousStatus === 'deferred') return 'deferred'
  if (progress === 0) return 'not-started'
  if (progress === 100) return 'done'
  return 'in-progress'
}

// ─── Merge static config + live data ─────────────────────────────────────────

export const TRACKED_MODULES: TrackedModule[] = Object.entries(STATIC).map(([id, cfg]) => {
  const live = liveModules[id]
  const subFeatures = live ? autoCheckSubFeatures(cfg.subFeatures, live) : cfg.subFeatures
  const progress = deriveProgress(subFeatures)
  const status = deriveStatus(progress, cfg.status)
  return {
    id,
    ...cfg,
    status,
    progress,
    subFeatures,
    newFileCount: live?.fileCount ?? 0,
    hasStore: live?.hasStore ?? false,
    hasQueries: live?.hasQueries ?? false,
    hasRoute: live?.hasRoute ?? false,
    isEmpty: live?.isEmpty ?? true,
  }
})

// Internal v2 modules that are tooling, not product features — skip them
const INTERNAL_MODULE_IDS = new Set(['rebuild-tracker'])

// Also surface any NEW modules detected in live data that aren't in STATIC yet
const unknownModules = Object.keys(liveModules).filter((id) => !STATIC[id] && !INTERNAL_MODULE_IDS.has(id))
for (const id of unknownModules) {
  const live = liveModules[id]
  if (!live.isEmpty) {
    TRACKED_MODULES.push({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
      icon: '🆕',
      category: 'core',
      status: live.hasRoute ? 'in-progress' : 'not-started',
      progress: 0,
      oldFileCount: 0,
      newFileCount: live.fileCount,
      hasStore: live.hasStore,
      hasQueries: live.hasQueries,
      hasRoute: live.hasRoute,
      isEmpty: live.isEmpty,
      subFeatures: [],
      notes: 'New module detected from live scan — add to static config to track sub-features.',
    })
  }
}

// ─── Derived stats ────────────────────────────────────────────────────────────

export function getOverallStats() {
  const total = TRACKED_MODULES.length
  const done = TRACKED_MODULES.filter((m) => m.status === 'done').length
  const inProgress = TRACKED_MODULES.filter((m) => m.status === 'in-progress').length
  const notStarted = TRACKED_MODULES.filter((m) => m.status === 'not-started').length
  const deferred = TRACKED_MODULES.filter((m) => m.status === 'deferred').length
  const avgProgress = Math.round(TRACKED_MODULES.reduce((s, m) => s + m.progress, 0) / total)
  const totalSubFeatures = TRACKED_MODULES.flatMap((m) => m.subFeatures).length
  const doneSubFeatures = TRACKED_MODULES.flatMap((m) => m.subFeatures).filter((f) => f.done).length
  return { total, done, inProgress, notStarted, deferred, avgProgress, totalSubFeatures, doneSubFeatures }
}
