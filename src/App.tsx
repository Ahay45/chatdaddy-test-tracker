import { useState, useMemo, useCallback } from 'react'
import {
  Box, Typography, Chip, LinearProgress, IconButton,
  Tooltip, alpha, useTheme, ThemeProvider, createTheme,
  CssBaseline, TextField, InputAdornment, Collapse,
  ToggleButtonGroup, ToggleButton, Tab, Tabs,
} from '@mui/material'
import {
  CheckCircle2, XCircle, MinusCircle, SkipForward,
  ChevronDown, ChevronUp, Search, RotateCcw, ClipboardCheck,
  GitCommit, Layers,
} from 'lucide-react'
import { TRACKED_MODULES, liveMeta } from './modules-data'
import { loadResults, saveResult, clearResults, makeKey, type TestStatus } from './test-store'

// ─── Theme ────────────────────────────────────────────────────────────────────

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: { default: '#0A0A0F', paper: '#13131A' },
    primary: { main: '#0F5BFF' },
  },
  shape: { borderRadius: 10 },
  typography: { fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif' },
})

// ─── Status config ────────────────────────────────────────────────────────────

type FilterStatus = 'all' | TestStatus

const STATUS: Record<TestStatus, { label: string; color: string; icon: React.ReactNode }> = {
  untested: { label: 'Untested', color: '#6B7280', icon: <MinusCircle size={15} /> },
  pass:     { label: 'Pass',    color: '#10B981', icon: <CheckCircle2 size={15} /> },
  fail:     { label: 'Fail',    color: '#EF4444', icon: <XCircle size={15} /> },
  skip:     { label: 'Skip',    color: '#F59E0B', icon: <SkipForward size={15} /> },
}

const STATUS_CYCLE: TestStatus[] = ['untested', 'pass', 'fail', 'skip']

// ─── Module id → label/icon map ──────────────────────────────────────────────

const MODULE_META: Record<string, { label: string; icon: string; color: string }> = {
  inbox:        { label: 'Inbox',           icon: '💬', color: '#6366F1' },
  crm:          { label: 'Contacts / CRM',  icon: '👥', color: '#8B5CF6' },
  contacts:     { label: 'Contacts',        icon: '🙋', color: '#8B5CF6' },
  channels:     { label: 'Channels',        icon: '🔌', color: '#0EA5E9' },
  automation:   { label: 'Automation',      icon: '🤖', color: '#F59E0B' },
  broadcasts:   { label: 'Broadcasts',      icon: '📢', color: '#EF4444' },
  campaigns:    { label: 'Campaigns',       icon: '🎯', color: '#EC4899' },
  analytics:    { label: 'Analytics',       icon: '📊', color: '#10B981' },
  dashboard:    { label: 'Dashboard',       icon: '🏠', color: '#10B981' },
  calls:        { label: 'Calls',           icon: '📞', color: '#06B6D4' },
  ai:           { label: 'AI',              icon: '✨', color: '#A78BFA' },
  billing:      { label: 'Billing',         icon: '💳', color: '#F97316' },
  settings:     { label: 'Settings',        icon: '⚙️',  color: '#6B7280' },
  tools:        { label: 'Tools',           icon: '🔧', color: '#84CC16' },
  shops:        { label: 'Shops',           icon: '🛍️',  color: '#F59E0B' },
  auth:         { label: 'Auth',            icon: '🔐', color: '#3B82F6' },
  admin:        { label: 'Admin Panel',     icon: '🛡️',  color: '#EF4444' },
  appstore:     { label: 'App Store',       icon: '📦', color: '#8B5CF6' },
  notifications:{ label: 'Notifications',  icon: '🔔', color: '#F59E0B' },
  'flow-builder':{ label: 'Flow Builder',  icon: '🔀', color: '#EC4899' },
}

// ─── Commit → module mapping ──────────────────────────────────────────────────

const KEYWORD_MAP: Array<{ words: string[]; module: string }> = [
  { words: ['inbox', 'chat', 'compose', 'message', 'filter', 'assign', 'tag', 'reply', 'thread', 'composeBar', 'chatrow', 'chatlist', 'chatdetail'], module: 'inbox' },
  { words: ['crm', 'ticket', 'board', 'kanban', 'bulkcontact', 'contactdetail', 'contactsfilter'], module: 'crm' },
  { words: ['contact', 'contactpanel', 'activehourscard'], module: 'contacts' },
  { words: ['channel', 'waba', 'qrscan', 'phonelink', 'creditconfirm', 'onboarding', 'channelcredit', 'messenger', 'instagram', 'pageselect', 'wabaphoneselect', 'embeddedSignup', 'messengerOAuth', 'isvterms'], module: 'channels' },
  { words: ['automation', 'keyword', 'flow', 'bot', 'trigger'], module: 'automation' },
  { words: ['broadcast', 'campaign'], module: 'broadcasts' },
  { words: ['campaign'], module: 'campaigns' },
  { words: ['analytics', 'metric', 'chart', 'widget', 'dashboard'], module: 'analytics' },
  { words: ['call', 'twilio', 'voice'], module: 'calls' },
  { words: ['ai', 'chatbot', 'suggest', 'gpt', 'openai', 'llm'], module: 'ai' },
  { words: ['billing', 'stripe', 'payment', 'plan', 'subscription', 'credit'], module: 'billing' },
  { words: ['setting', 'preference', 'config'], module: 'settings' },
  { words: ['tool', 'form', 'coupon', 'customfield', 'zapier', 'widget'], module: 'tools' },
  { words: ['shop', 'product', 'order', 'catalog'], module: 'shops' },
  { words: ['auth', 'login', 'signup', 'otp', 'password'], module: 'auth' },
  { words: ['admin', 'announcement', 'pricing', 'coupon'], module: 'admin' },
  { words: ['notification', 'alert'], module: 'notifications' },
]

function detectModule(msg: string, branchHint?: string): string {
  const src = (msg + ' ' + (branchHint ?? '')).toLowerCase().replace(/[^a-z0-9 ]/g, ' ')

  // 1. conventional commit scope: feat(inbox): …
  const scopeMatch = /\(([a-z-]+)\)/.exec(msg)
  if (scopeMatch) {
    const scope = scopeMatch[1]
    if (MODULE_META[scope]) return scope
  }

  // 2. keyword match (longest match wins)
  let best = { module: 'general', hits: 0 }
  for (const { words, module } of KEYWORD_MAP) {
    const hits = words.filter(w => src.includes(w.toLowerCase())).length
    if (hits > best.hits) best = { module, hits }
  }
  return best.module
}

interface CommitWithModule {
  sha: string
  message: string
  date: string
  author: string
  module: string
}

// ─── Feature row ──────────────────────────────────────────────────────────────

function FeatureRow({
  moduleId, name, builtInV2, status, onCycle,
}: {
  moduleId: string
  name: string
  builtInV2: boolean
  status: TestStatus
  onCycle: (key: string) => void
}) {
  const { palette } = useTheme()
  const cfg = STATUS[status]
  const key = makeKey(moduleId, name)

  return (
    <Box
      onClick={() => onCycle(key)}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 0.875,
        borderBottom: `1px solid ${alpha(palette.divider, 0.4)}`,
        cursor: 'pointer',
        transition: 'background 0.1s',
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: alpha('#fff', 0.03) },
      }}
    >
      <Box sx={{ color: cfg.color, flexShrink: 0, display: 'flex' }}>{cfg.icon}</Box>
      <Typography sx={{ flex: 1, fontSize: '0.8125rem', color: builtInV2 ? 'text.primary' : alpha('#fff', 0.4), lineHeight: 1.5 }}>
        {name}
      </Typography>
      {!builtInV2 && (
        <Chip label="not built" size="small" sx={{ height: 16, fontSize: '0.5rem', fontWeight: 700, bgcolor: alpha('#6B7280', 0.12), color: '#6B7280', borderRadius: '4px' }} />
      )}
      <Chip
        label={cfg.label}
        size="small"
        sx={{ height: 18, fontSize: '0.5625rem', fontWeight: 700, bgcolor: alpha(cfg.color, 0.12), color: cfg.color, borderRadius: '5px', minWidth: 58, justifyContent: 'center' }}
      />
    </Box>
  )
}

// ─── Module card ──────────────────────────────────────────────────────────────

function ModuleCard({
  module, results, filterStatus, search, onCycle,
}: {
  module: typeof TRACKED_MODULES[number]
  results: Record<string, TestStatus>
  filterStatus: FilterStatus
  search: string
  onCycle: (key: string) => void
}) {
  const { palette } = useTheme()
  const [open, setOpen] = useState(false)

  const features = useMemo(() => {
    return module.subFeatures.filter(f => {
      if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false
      const status = results[makeKey(module.id, f.name)] ?? 'untested'
      if (filterStatus !== 'all' && status !== filterStatus) return false
      return true
    })
  }, [module, results, filterStatus, search])

  const stats = useMemo(() => {
    const counts = { pass: 0, fail: 0, skip: 0, untested: 0 }
    for (const f of module.subFeatures) {
      const s = results[makeKey(module.id, f.name)] ?? 'untested'
      counts[s]++
    }
    return counts
  }, [module, results])

  const total = module.subFeatures.length
  const tested = stats.pass + stats.fail + stats.skip
  const passPct = total ? Math.round((stats.pass / total) * 100) : 0
  const isExpanded = open || !!search || filterStatus !== 'all'

  if (features.length === 0 && (search || filterStatus !== 'all')) return null

  return (
    <Box sx={{ borderRadius: '14px', border: `1px solid ${palette.divider}`, bgcolor: palette.background.paper, overflow: 'hidden', mb: 1.5 }}>
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{ px: 2.5, py: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5, '&:hover': { bgcolor: alpha('#fff', 0.02) } }}
      >
        <Typography sx={{ fontSize: '1.125rem' }}>{module.icon}</Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>{module.label}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <LinearProgress
              variant="determinate"
              value={passPct}
              sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: alpha('#fff', 0.06),
                '& .MuiLinearProgress-bar': { bgcolor: stats.fail > 0 ? '#EF4444' : '#10B981', borderRadius: 2 } }}
            />
            <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary', flexShrink: 0 }}>
              {tested}/{total} tested
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {stats.pass > 0 && <Chip label={`✓ ${stats.pass}`} size="small" sx={{ height: 18, fontSize: '0.5rem', fontWeight: 700, bgcolor: alpha('#10B981', 0.12), color: '#10B981', borderRadius: '4px' }} />}
          {stats.fail > 0 && <Chip label={`✗ ${stats.fail}`} size="small" sx={{ height: 18, fontSize: '0.5rem', fontWeight: 700, bgcolor: alpha('#EF4444', 0.12), color: '#EF4444', borderRadius: '4px' }} />}
          {stats.skip > 0 && <Chip label={`~ ${stats.skip}`} size="small" sx={{ height: 18, fontSize: '0.5rem', fontWeight: 700, bgcolor: alpha('#F59E0B', 0.12), color: '#F59E0B', borderRadius: '4px' }} />}
          {stats.untested > 0 && <Chip label={`? ${stats.untested}`} size="small" sx={{ height: 18, fontSize: '0.5rem', fontWeight: 700, bgcolor: alpha('#6B7280', 0.12), color: '#6B7280', borderRadius: '4px' }} />}
        </Box>
        <Chip label={`${passPct}%`} size="small" sx={{ height: 20, fontSize: '0.625rem', fontWeight: 800, bgcolor: alpha('#0F5BFF', 0.1), color: '#0F5BFF', borderRadius: '6px' }} />
        <IconButton size="small" sx={{ color: 'text.secondary' }}>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded}>
        {features.length > 0
          ? features.map(f => (
              <FeatureRow
                key={f.name}
                moduleId={module.id}
                name={f.name}
                builtInV2={f.done}
                status={results[makeKey(module.id, f.name)] ?? 'untested'}
                onCycle={onCycle}
              />
            ))
          : (
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>No features match the current filter.</Typography>
            </Box>
          )
        }
      </Collapse>
    </Box>
  )
}

// ─── Phase 2 — sub-feature row ───────────────────────────────────────────────

function Phase2FeatureRow({ name, done }: { name: string; done: boolean }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1,
      px: 2, py: 0.625,
      borderBottom: '1px solid', borderColor: alpha('#fff', 0.035),
      '&:last-child': { borderBottom: 'none' },
    }}>
      <Box sx={{ mt: 0.2, flexShrink: 0, color: done ? '#10B981' : alpha('#fff', 0.2) }}>
        {done ? <CheckCircle2 size={13} /> : <MinusCircle size={13} />}
      </Box>
      <Typography sx={{ fontSize: '0.775rem', lineHeight: 1.45, color: done ? 'text.primary' : alpha('#fff', 0.35) }}>
        {name}
      </Typography>
    </Box>
  )
}

// ─── Phase 2 — commit chip row ────────────────────────────────────────────────

function CommitChip({ commit }: { commit: CommitWithModule }) {
  const isMerge = commit.message.startsWith('Merge pull request')
  if (isMerge) return null
  const time = new Date(commit.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1,
      px: 2, py: 0.75,
      borderBottom: '1px solid', borderColor: alpha('#fff', 0.035),
      '&:last-child': { borderBottom: 'none' },
    }}>
      <GitCommit size={12} color={alpha('#fff', 0.25)} style={{ flexShrink: 0 }} />
      <Typography sx={{ flex: 1, fontSize: '0.775rem', lineHeight: 1.4 }}>{commit.message}</Typography>
      <Typography sx={{ fontSize: '0.6rem', color: alpha('#fff', 0.25), fontFamily: 'monospace', flexShrink: 0 }}>
        {commit.sha.slice(0, 7)} · {time}
      </Typography>
    </Box>
  )
}

// ─── Phase 2 — module progress card ──────────────────────────────────────────

function Phase2ModuleCard({ moduleId, commits }: { moduleId: string; commits: CommitWithModule[] }) {
  const [open, setOpen] = useState(true)
  const [showPending, setShowPending] = useState(false)
  const meta = MODULE_META[moduleId]
  const color = meta?.color ?? '#6B7280'
  const mod = TRACKED_MODULES.find(m => m.id === moduleId)
  const allFeatures = mod?.subFeatures ?? []
  const doneFeatures = allFeatures.filter(f => f.done)
  const pendingFeatures = allFeatures.filter(f => !f.done)
  const total = allFeatures.length
  const pct = total ? Math.round((doneFeatures.length / total) * 100) : 0
  const realCommits = commits.filter(c => !c.message.startsWith('Merge pull request'))

  return (
    <Box sx={{ borderRadius: '14px', border: `1px solid ${alpha(color, 0.25)}`, bgcolor: '#13131A', overflow: 'hidden', mb: 1.5 }}>
      {/* Header */}
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{ px: 2.5, py: 1.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
          '&:hover': { bgcolor: alpha('#fff', 0.015) },
          borderBottom: open ? `1px solid ${alpha(color, 0.12)}` : 'none',
        }}
      >
        <Typography sx={{ fontSize: '1.1rem', flexShrink: 0 }}>{meta?.icon ?? '🔧'}</Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', mb: 0.5 }}>{meta?.label ?? moduleId}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress variant="determinate" value={pct}
              sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: alpha(color, 0.12),
                '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 800, color, minWidth: 32, textAlign: 'right' }}>{pct}%</Typography>
          </Box>
          <Typography sx={{ fontSize: '0.625rem', color: alpha('#fff', 0.3), mt: 0.25 }}>
            {doneFeatures.length} / {total} sub-features done
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, flexShrink: 0 }}>
          <Chip label={`${realCommits.length} commit${realCommits.length !== 1 ? 's' : ''}`} size="small"
            sx={{ height: 18, fontSize: '0.5rem', fontWeight: 700, bgcolor: alpha(color, 0.1), color, borderRadius: '5px' }} />
          <Chip label={`${doneFeatures.length} done · ${pendingFeatures.length} pending`} size="small"
            sx={{ height: 18, fontSize: '0.5rem', fontWeight: 700,
              bgcolor: alpha(pendingFeatures.length === 0 ? '#10B981' : '#F59E0B', 0.1),
              color: pendingFeatures.length === 0 ? '#10B981' : '#F59E0B', borderRadius: '5px' }} />
        </Box>
        <IconButton size="small" sx={{ color: 'text.secondary', flexShrink: 0 }}>
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        {/* Commits */}
        {realCommits.length > 0 && (
          <Box sx={{ borderBottom: `1px solid ${alpha('#fff', 0.04)}` }}>
            <Typography sx={{ px: 2, pt: 1.25, pb: 0.5, fontSize: '0.6rem', fontWeight: 700, color: alpha(color, 0.7), textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Commits pushed
            </Typography>
            {commits.map(c => <CommitChip key={c.sha} commit={c} />)}
          </Box>
        )}

        {/* Done sub-features */}
        {doneFeatures.length > 0 && (
          <Box>
            <Typography sx={{ px: 2, pt: 1.25, pb: 0.5, fontSize: '0.6rem', fontWeight: 700, color: alpha('#10B981', 0.7), textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              ✓ Done ({doneFeatures.length})
            </Typography>
            {doneFeatures.map(f => <Phase2FeatureRow key={f.name} name={f.name} done={true} />)}
          </Box>
        )}

        {/* Pending sub-features — collapsed by default */}
        {pendingFeatures.length > 0 && (
          <Box sx={{ borderTop: `1px solid ${alpha('#fff', 0.04)}` }}>
            <Box onClick={e => { e.stopPropagation(); setShowPending(p => !p) }}
              sx={{ px: 2, pt: 1.25, pb: 0.75, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer',
                '&:hover': { bgcolor: alpha('#fff', 0.015) } }}>
              <Typography sx={{ flex: 1, fontSize: '0.6rem', fontWeight: 700, color: alpha('#F59E0B', 0.7), textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                ◯ Pending ({pendingFeatures.length})
              </Typography>
              <IconButton size="small" sx={{ color: alpha('#fff', 0.3), p: 0 }}>
                {showPending ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </IconButton>
            </Box>
            <Collapse in={showPending}>
              {pendingFeatures.map(f => <Phase2FeatureRow key={f.name} name={f.name} done={false} />)}
            </Collapse>
          </Box>
        )}
      </Collapse>
    </Box>
  )
}

// ─── Phase 2 tab ─────────────────────────────────────────────────────────────

function Phase2Tab() {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const commitsByDay = liveMeta.commitsByDay
  const activeDay = selectedDay ?? commitsByDay[0]?.date ?? null

  const enriched: CommitWithModule[] = useMemo(() => {
    const day = commitsByDay.find(d => d.date === activeDay)
    if (!day) return []
    return day.commits.map(c => ({ ...c, module: detectModule(c.message) }))
  }, [commitsByDay, activeDay])

  const grouped = useMemo(() => {
    const map = new Map<string, CommitWithModule[]>()
    for (const c of enriched) {
      if (!map.has(c.module)) map.set(c.module, [])
      map.get(c.module)!.push(c)
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [enriched])

  const totalReal = enriched.filter(c => !c.message.startsWith('Merge pull request')).length

  if (commitsByDay.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>No commit data yet — sync hasn't run yet.</Typography>
      </Box>
    )
  }

  return (
    <Box>
      {/* Day selector */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2.5, flexWrap: 'wrap' }}>
        {commitsByDay.map(day => {
          const isToday = day.date === new Date().toISOString().slice(0, 10)
          const isActive = day.date === activeDay
          const realCount = day.commits.filter(c => !c.message.startsWith('Merge pull request')).length
          return (
            <Box key={day.date} onClick={() => setSelectedDay(day.date)} sx={{
              px: 1.5, py: 0.75, borderRadius: '10px', cursor: 'pointer',
              border: '1px solid',
              borderColor: isActive ? '#0F5BFF' : alpha('#fff', 0.08),
              bgcolor: isActive ? alpha('#0F5BFF', 0.1) : 'transparent',
              transition: 'all 0.15s',
              '&:hover': { borderColor: isActive ? '#0F5BFF' : alpha('#fff', 0.2) },
            }}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: isActive ? 800 : 500, color: isActive ? '#0F5BFF' : 'text.secondary' }}>
                {isToday ? '⚡ Today' : new Date(day.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </Typography>
              <Typography sx={{ fontSize: '0.5625rem', color: isActive ? alpha('#0F5BFF', 0.8) : alpha('#fff', 0.3) }}>
                {realCount} commit{realCount !== 1 ? 's' : ''}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Summary bar */}
      <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', mb: 2.5, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <GitCommit size={13} color="#0F5BFF" />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>{totalReal} commits</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Layers size={13} color="#8B5CF6" />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>{grouped.length} module{grouped.length !== 1 ? 's' : ''} updated</Typography>
        </Box>
        <Typography sx={{ ml: 'auto', fontSize: '0.6375rem', color: 'text.secondary' }}>
          synced {liveMeta.fetchedAt ? new Date(liveMeta.fetchedAt).toLocaleString() : '—'}
        </Typography>
      </Box>

      {/* Module progress cards */}
      {grouped.length === 0 ? (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>No commits on this day.</Typography>
        </Box>
      ) : (
        grouped.map(([moduleId, commits]) => (
          <Phase2ModuleCard key={moduleId} moduleId={moduleId} commits={commits} />
        ))
      )}

      <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '10px', bgcolor: alpha('#0F5BFF', 0.04), border: `1px solid ${alpha('#0F5BFF', 0.1)}` }}>
        <Typography sx={{ fontSize: '0.6875rem', color: alpha('#fff', 0.35), lineHeight: 1.6 }}>
          Auto-synced from <strong style={{ color: alpha('#fff', 0.55) }}>frontend-dashboard-v2 @ main</strong> every 30 min. Module labels inferred from commit scope/keywords.
        </Typography>
      </Box>
    </Box>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState(0)
  const [results, setResults] = useState<Record<string, TestStatus>>(loadResults)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')

  const handleCycle = useCallback((key: string) => {
    const current: TestStatus = results[key] ?? 'untested'
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length]
    setResults(saveResult(key, next))
  }, [results])

  const handleClear = () => {
    if (confirm('Reset all test results?')) setResults(clearResults())
  }

  const globalStats = useMemo(() => {
    const counts = { pass: 0, fail: 0, skip: 0, untested: 0, total: 0 }
    for (const mod of TRACKED_MODULES) {
      for (const f of mod.subFeatures) {
        counts.total++
        const s = results[makeKey(mod.id, f.name)] ?? 'untested'
        counts[s]++
      }
    }
    return counts
  }, [results])

  const passPct = globalStats.total ? Math.round((globalStats.pass / globalStats.total) * 100) : 0
  const testedPct = globalStats.total ? Math.round(((globalStats.total - globalStats.untested) / globalStats.total) * 100) : 0

  // Badge: count of today's real commits
  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const day = liveMeta.commitsByDay.find(d => d.date === today)
    return day ? day.commits.filter(c => !c.message.startsWith('Merge pull request')).length : 0
  }, [])

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', px: { xs: 2, md: 4 }, py: 4, maxWidth: 900, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <ClipboardCheck size={22} color="#0F5BFF" />
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              ChatDaddy V2 — Feature Test Tracker
            </Typography>
          </Box>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            Click any feature row to cycle: Untested → Pass → Fail → Skip. Results saved locally in your browser.
          </Typography>

          {/* Global stats */}
          <Box sx={{ mt: 2.5, p: 2, borderRadius: '12px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={passPct}
                sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: alpha('#fff', 0.06),
                  '& .MuiLinearProgress-bar': { bgcolor: globalStats.fail > 0 ? '#EF4444' : '#10B981', borderRadius: 4 } }}
              />
              <Typography sx={{ fontWeight: 800, fontSize: '0.9375rem', color: globalStats.fail > 0 ? '#EF4444' : '#10B981', minWidth: 42, textAlign: 'right' }}>
                {passPct}%
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label={`✓ ${globalStats.pass} passed`}   size="small" sx={{ height: 20, fontSize: '0.5625rem', fontWeight: 700, bgcolor: alpha('#10B981', 0.1), color: '#10B981', borderRadius: '5px' }} />
              <Chip label={`✗ ${globalStats.fail} failed`}   size="small" sx={{ height: 20, fontSize: '0.5625rem', fontWeight: 700, bgcolor: alpha('#EF4444', 0.1), color: '#EF4444', borderRadius: '5px' }} />
              <Chip label={`~ ${globalStats.skip} skipped`}  size="small" sx={{ height: 20, fontSize: '0.5625rem', fontWeight: 700, bgcolor: alpha('#F59E0B', 0.1), color: '#F59E0B', borderRadius: '5px' }} />
              <Chip label={`? ${globalStats.untested} untested`} size="small" sx={{ height: 20, fontSize: '0.5625rem', fontWeight: 700, bgcolor: alpha('#6B7280', 0.1), color: '#6B7280', borderRadius: '5px' }} />
              <Box sx={{ ml: 'auto' }}>
                <Chip label={`${testedPct}% coverage`} size="small" sx={{ height: 20, fontSize: '0.5625rem', fontWeight: 700, bgcolor: alpha('#0F5BFF', 0.1), color: '#0F5BFF', borderRadius: '5px' }} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            mb: 2.5,
            minHeight: 36,
            '& .MuiTabs-indicator': { bgcolor: '#0F5BFF', height: 2, borderRadius: 1 },
            '& .MuiTab-root': { minHeight: 36, py: 0.75, px: 2, fontSize: '0.8125rem', fontWeight: 600, textTransform: 'none', color: 'text.secondary' },
            '& .Mui-selected': { color: '#fff !important' },
          }}
        >
          <Tab label="Feature Tests" />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                Phase 2 Enhancements
                {todayCount > 0 && (
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#0F5BFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: '0.5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{todayCount}</Typography>
                  </Box>
                )}
              </Box>
            }
          />
        </Tabs>

        {/* Tab 0 — Feature Tests */}
        {tab === 0 && (
          <>
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                placeholder="Search features…"
                size="small"
                value={search}
                onChange={e => setSearch(e.target.value)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={14} color="#6B7280" /></InputAdornment> } }}
                sx={{ flex: 1, minWidth: 200, '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: '0.8125rem' } }}
              />
              <ToggleButtonGroup
                value={filterStatus}
                exclusive
                onChange={(_, v) => v && setFilterStatus(v)}
                size="small"
                sx={{ '& .MuiToggleButton-root': { px: 1.5, py: 0.5, fontSize: '0.6875rem', fontWeight: 700, borderRadius: '8px !important', border: '1px solid', borderColor: 'divider', textTransform: 'none' } }}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="untested" sx={{ '&.Mui-selected': { color: '#6B7280' } }}>Untested</ToggleButton>
                <ToggleButton value="pass"     sx={{ '&.Mui-selected': { color: '#10B981' } }}>Pass</ToggleButton>
                <ToggleButton value="fail"     sx={{ '&.Mui-selected': { color: '#EF4444' } }}>Fail</ToggleButton>
                <ToggleButton value="skip"     sx={{ '&.Mui-selected': { color: '#F59E0B' } }}>Skip</ToggleButton>
              </ToggleButtonGroup>
              <Tooltip title="Reset all results">
                <IconButton onClick={handleClear} size="small" sx={{ color: 'text.secondary', border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
                  <RotateCcw size={15} />
                </IconButton>
              </Tooltip>
            </Box>

            {TRACKED_MODULES.map(mod => (
              <ModuleCard
                key={mod.id}
                module={mod}
                results={results}
                filterStatus={filterStatus}
                search={search}
                onCycle={handleCycle}
              />
            ))}
          </>
        )}

        {/* Tab 1 — Phase 2 Enhancements */}
        {tab === 1 && <Phase2Tab />}

      </Box>
    </ThemeProvider>
  )
}
