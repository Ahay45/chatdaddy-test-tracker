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
  { words: ['channel', 'waba', 'qrscan', 'phonelink', 'creditconfirm', 'onboarding', 'channelcredit'], module: 'channels' },
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

// ─── Phase 2 — commit row ─────────────────────────────────────────────────────

function CommitRow({ commit }: { commit: CommitWithModule }) {
  const meta = MODULE_META[commit.module]
  const color = meta?.color ?? '#6B7280'
  const label = meta ? `${meta.icon} ${meta.label}` : '🔧 General'
  const time = new Date(commit.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  // strip "Merge pull request #N from org/branch" lines
  const isMerge = commit.message.startsWith('Merge pull request')
  const bodyLine = isMerge
    ? commit.message.replace(/^Merge pull request #\d+ from [^\n]+\n?/, '').trim() || commit.message
    : commit.message

  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1.5,
      px: 2, py: 1,
      borderBottom: '1px solid', borderColor: alpha('#fff', 0.04),
      '&:last-child': { borderBottom: 'none' },
      opacity: isMerge ? 0.45 : 1,
    }}>
      <Box sx={{ color: alpha('#fff', 0.2), mt: 0.15, flexShrink: 0 }}>
        <GitCommit size={13} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.8rem', lineHeight: 1.45, wordBreak: 'break-word' }}>
          {bodyLine}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, mt: 0.4, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.6375rem', color: alpha('#fff', 0.3), fontFamily: 'monospace' }}>
            {commit.sha.slice(0, 7)}
          </Typography>
          <Typography sx={{ fontSize: '0.6375rem', color: alpha('#fff', 0.25) }}>·</Typography>
          <Typography sx={{ fontSize: '0.6375rem', color: alpha('#fff', 0.3) }}>{time}</Typography>
        </Box>
      </Box>
      <Chip
        label={label}
        size="small"
        sx={{ height: 18, fontSize: '0.5rem', fontWeight: 700, flexShrink: 0,
          bgcolor: alpha(color, 0.12), color, borderRadius: '5px', mt: 0.15 }}
      />
    </Box>
  )
}

// ─── Phase 2 — module group card ─────────────────────────────────────────────

function Phase2ModuleGroup({
  moduleId, commits,
}: {
  moduleId: string
  commits: CommitWithModule[]
  date: string
}) {
  const [open, setOpen] = useState(true)
  const meta = MODULE_META[moduleId]
  const color = meta?.color ?? '#6B7280'
  const label = meta ? `${meta.icon} ${meta.label}` : `🔧 ${moduleId}`

  const realCommits = commits.filter(c => !c.message.startsWith('Merge pull request'))

  // Module sub-features that match this date's commits
  const mod = TRACKED_MODULES.find(m => m.id === moduleId)
  const relatedFeatures = useMemo(() => {
    if (!mod) return []
    const commitText = commits.map(c => c.message.toLowerCase()).join(' ')
    return mod.subFeatures.filter(f => {
      const words = f.name.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 4)
      return words.some(w => commitText.includes(w))
    })
  }, [mod, commits])

  return (
    <Box sx={{ borderRadius: '12px', border: `1px solid ${alpha(color, 0.2)}`, bgcolor: '#13131A', overflow: 'hidden', mb: 1 }}>
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{ px: 2, py: 1.25, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
          '&:hover': { bgcolor: alpha('#fff', 0.02) },
          borderBottom: open ? `1px solid ${alpha(color, 0.1)}` : 'none',
        }}
      >
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', flex: 1 }}>{label}</Typography>
        <Chip label={`${realCommits.length} commit${realCommits.length !== 1 ? 's' : ''}`} size="small"
          sx={{ height: 18, fontSize: '0.5rem', fontWeight: 700, bgcolor: alpha(color, 0.1), color, borderRadius: '5px' }} />
        {relatedFeatures.length > 0 && (
          <Chip label={`${relatedFeatures.length} feature${relatedFeatures.length !== 1 ? 's' : ''}`} size="small"
            sx={{ height: 18, fontSize: '0.5rem', fontWeight: 700, bgcolor: alpha('#10B981', 0.1), color: '#10B981', borderRadius: '5px' }} />
        )}
        <IconButton size="small" sx={{ color: 'text.secondary', p: 0 }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        {/* Commits */}
        {commits.map(c => <CommitRow key={c.sha} commit={c} />)}

        {/* Related sub-features */}
        {relatedFeatures.length > 0 && (
          <Box sx={{ px: 2, py: 1, bgcolor: alpha('#10B981', 0.03), borderTop: `1px solid ${alpha('#10B981', 0.08)}` }}>
            <Typography sx={{ fontSize: '0.6375rem', fontWeight: 700, color: alpha('#10B981', 0.7), textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.75 }}>
              Related sub-features
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {relatedFeatures.map(f => (
                <Chip key={f.name} label={f.name} size="small"
                  sx={{ height: 'auto', py: 0.25, fontSize: '0.6rem', fontWeight: 500, lineHeight: 1.4,
                    bgcolor: alpha(f.done ? '#10B981' : '#6B7280', 0.1),
                    color: f.done ? '#10B981' : alpha('#fff', 0.45),
                    borderRadius: '5px', whiteSpace: 'normal', maxWidth: 280 }} />
              ))}
            </Box>
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
    return day.commits.map(c => ({
      ...c,
      module: detectModule(c.message),
    }))
  }, [commitsByDay, activeDay])

  // group by module, keeping insertion order
  const grouped = useMemo(() => {
    const map = new Map<string, CommitWithModule[]>()
    for (const c of enriched) {
      if (!map.has(c.module)) map.set(c.module, [])
      map.get(c.module)!.push(c)
    }
    // sort by commit count desc
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [enriched])

  const totalReal = enriched.filter(c => !c.message.startsWith('Merge pull request')).length

  if (commitsByDay.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>No commit data yet. Run the fetch script or wait for the scheduled sync.</Typography>
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
            <Box
              key={day.date}
              onClick={() => setSelectedDay(day.date)}
              sx={{
                px: 1.5, py: 0.75, borderRadius: '10px', cursor: 'pointer',
                border: '1px solid',
                borderColor: isActive ? '#0F5BFF' : alpha('#fff', 0.08),
                bgcolor: isActive ? alpha('#0F5BFF', 0.1) : 'transparent',
                transition: 'all 0.15s',
                '&:hover': { borderColor: isActive ? '#0F5BFF' : alpha('#fff', 0.2) },
              }}
            >
              <Typography sx={{ fontSize: '0.7rem', fontWeight: isActive ? 800 : 500, color: isActive ? '#0F5BFF' : 'text.secondary' }}>
                {isToday ? 'Today' : new Date(day.date + 'T12:00:00').toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </Typography>
              <Typography sx={{ fontSize: '0.5625rem', color: isActive ? alpha('#0F5BFF', 0.8) : alpha('#fff', 0.3) }}>
                {realCount} commit{realCount !== 1 ? 's' : ''}
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Summary row */}
      <Box sx={{ p: 1.5, borderRadius: '10px', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GitCommit size={14} color="#0F5BFF" />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>{totalReal} commits</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Layers size={14} color="#8B5CF6" />
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>{grouped.length} module{grouped.length !== 1 ? 's' : ''} touched</Typography>
        </Box>
        <Typography sx={{ ml: 'auto', fontSize: '0.6375rem', color: 'text.secondary' }}>
          synced {liveMeta.fetchedAt ? new Date(liveMeta.fetchedAt).toLocaleString() : '—'}
        </Typography>
      </Box>

      {/* Grouped by module */}
      {grouped.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>No commits on this day.</Typography>
        </Box>
      ) : (
        grouped.map(([moduleId, commits]) => (
          <Phase2ModuleGroup
            key={moduleId}
            moduleId={moduleId}
            commits={commits}
            date={activeDay ?? ''}
          />
        ))
      )}

      {/* Footer note */}
      <Box sx={{ mt: 2, p: 1.5, borderRadius: '10px', bgcolor: alpha('#0F5BFF', 0.04), border: `1px solid ${alpha('#0F5BFF', 0.1)}` }}>
        <Typography sx={{ fontSize: '0.6875rem', color: alpha('#fff', 0.4), lineHeight: 1.6 }}>
          Commits are read from <strong style={{ color: alpha('#fff', 0.6) }}>frontend-dashboard-v2 @ main</strong> and auto-synced every 30 minutes. Module labels are inferred from commit message scope or keywords.
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
