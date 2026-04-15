import { useState, useMemo, useCallback } from 'react'
import {
  Box, Typography, Chip, LinearProgress, IconButton,
  Tooltip, alpha, useTheme, ThemeProvider, createTheme,
  CssBaseline, TextField, InputAdornment, Collapse,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material'
import {
  CheckCircle2, XCircle, MinusCircle, SkipForward,
  ChevronDown, ChevronUp, Search, RotateCcw, ClipboardCheck,
} from 'lucide-react'
import { TRACKED_MODULES } from './modules-data'
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
      {/* Header */}
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

      {/* Feature list */}
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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
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

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', px: { xs: 2, md: 4 }, py: 4, maxWidth: 900, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ mb: 4 }}>
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

        {/* Controls */}
        <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Search features…"
            size="small"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search size={14} color="#6B7280" /></InputAdornment> }}
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

        {/* Module cards */}
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
      </Box>
    </ThemeProvider>
  )
}
