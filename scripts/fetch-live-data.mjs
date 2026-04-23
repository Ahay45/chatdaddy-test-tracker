#!/usr/bin/env node
/**
 * Fetches live module data from chatdaddy/frontend-dashboard-v2 main branch
 * via the GitHub API and writes src/live-data.json.
 *
 * Usage: node scripts/fetch-live-data.mjs
 * Requires: GH_PAT env var (repo read scope)
 */

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const OWNER = 'chatdaddy'
const REPO = 'frontend-dashboard-v2'
const BRANCH = 'main'
const MODULES_DIR = 'src/modules'
const ROUTER_FILE = 'src/app/router.tsx'

const TOKEN = process.env.GH_PAT
if (!TOKEN) {
  console.error('GH_PAT env var is required')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

async function ghGet(url) {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`GitHub API error ${res.status}: ${url}`)
  return res.json()
}

async function getTree() {
  // Get the tree for BRANCH (recursive)
  const branchData = await ghGet(
    `https://api.github.com/repos/${OWNER}/${REPO}/branches/${BRANCH}`
  )
  const sha = branchData.commit.sha
  const treeData = await ghGet(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${sha}?recursive=1`
  )
  return { commitSha: sha, commitMsg: branchData.commit.commit.message, commitDate: branchData.commit.commit.author.date, tree: treeData.tree }
}

async function getCommits() {
  const commits = await ghGet(
    `https://api.github.com/repos/${OWNER}/${REPO}/commits?sha=${BRANCH}&per_page=50`
  )
  return commits.map((c) => ({
    sha: c.sha,
    message: c.commit.message.split('\n')[0],
    date: c.commit.author.date,
    author: c.commit.author.name,
  }))
}

async function getRouterContent() {
  try {
    const data = await ghGet(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${ROUTER_FILE}?ref=${BRANCH}`
    )
    return Buffer.from(data.content, 'base64').toString('utf8')
  } catch {
    // Try alternate router paths
    for (const alt of ['src/app/App.tsx', 'src/main.tsx', 'src/App.tsx']) {
      try {
        const data = await ghGet(
          `https://api.github.com/repos/${OWNER}/${REPO}/contents/${alt}?ref=${BRANCH}`
        )
        return Buffer.from(data.content, 'base64').toString('utf8')
      } catch {
        // continue
      }
    }
    return ''
  }
}

function extractRoutes(content) {
  const routes = []
  // Match path: "..." patterns
  const pathRe = /path:\s*['"`]([^'"`]+)['"`]/g
  let m
  while ((m = pathRe.exec(content)) !== null) {
    routes.push(m[1])
  }
  return [...new Set(routes)]
}

function buildModuleData(tree) {
  // Known module ids
  const moduleIds = [
    'admin', 'ai', 'analytics', 'appstore', 'auth', 'automation',
    'billing', 'broadcasts', 'calls', 'campaigns', 'channels', 'contacts',
    'crm', 'dashboard', 'flow-builder', 'inbox', 'localization',
    'notifications', 'onboarding', 'settings', 'shops', 'tools',
  ]

  const modules = {}

  for (const id of moduleIds) {
    const prefix = `src/modules/${id}/`
    const files = tree
      .filter((f) => f.type === 'blob' && f.path.startsWith(prefix))
      .map((f) => f.path)

    const componentFiles = files.filter(
      (f) => (f.endsWith('.tsx') || f.endsWith('.ts')) && f.includes('/components/')
    )
    const isEmpty =
      files.length === 0 ||
      (files.length === 1 && files[0].endsWith('.gitkeep'))

    modules[id] = {
      id,
      fileCount: files.length,
      componentCount: componentFiles.length,
      hasStore: files.some((f) => f.endsWith('store.ts') || f.endsWith('store.tsx') || f.includes('/stores/')),
      hasQueries: files.some((f) => f.includes('.queries.') || f.includes('/queries/')),
      hasRoute: files.some((f) => f.endsWith('index.tsx') || f.includes('/routes/')),
      isEmpty,
      files: componentFiles, // only component files to keep payload small
    }
  }

  return modules
}

function groupCommitsByDay(commits) {
  const byDay = {}
  for (const c of commits) {
    const day = c.date.slice(0, 10)
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(c)
  }
  return Object.entries(byDay)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 14)
    .map(([date, cs]) => ({ date, commits: cs }))
}

async function main() {
  console.log(`Fetching live data from ${OWNER}/${REPO}@${BRANCH}...`)

  const [{ commitSha, commitMsg, commitDate, tree }, commits, routerContent] =
    await Promise.all([getTree(), getCommits(), getRouterContent()])

  const modules = buildModuleData(tree)
  const routes = extractRoutes(routerContent)
  const recentCommits = commits.slice(0, 20)

  const liveData = {
    fetchedAt: new Date().toISOString(),
    branch: BRANCH,
    commit: {
      sha: commitSha,
      shortSha: commitSha.slice(0, 7),
      message: commitMsg.split('\n')[0],
      date: commitDate,
    },
    recentCommits,
    commitsByDay: groupCommitsByDay(commits),
    registeredRoutes: routes,
    modules,
  }

  const outPath = path.join(__dirname, '../src/live-data.json')
  writeFileSync(outPath, JSON.stringify(liveData, null, 2) + '\n')
  console.log(`Written to ${outPath}`)
  console.log(`  branch: ${BRANCH}`)
  console.log(`  commit: ${commitSha.slice(0, 7)} — ${commitMsg.split('\n')[0]}`)
  console.log(`  modules: ${Object.keys(modules).length}`)
  console.log(`  files in tree: ${tree.length}`)
  console.log(`  routes found: ${routes.length}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
