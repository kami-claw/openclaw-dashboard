'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Scan = {
  id: string
  trigger_type: string
  trigger_ref: string
  scan_status: string
  started_at: string
  finished_at: string
  duration_seconds: number
  projects?: { repo_name: string; github_repo_url: string }
}

type Issue = {
  id: string
  scan_id: string
  file_name: string
  line_number: number
  issue_type: string
  severity: string
  description: string
  fix_suggestion: string
  github_issue_url: string
  created_at: string
  issue_source: string
  page_url: string
}

type Activity = {
  id: string
  agent_name: string
  action: string
  details: string
  repo_name: string
  status: string
  created_at: string
}

type Project = {
  id: string
  repo_name: string
  github_repo_url: string
  deployed_url: string
  webhook_active: boolean
  created_at: string
}

const severityColor: Record<string, string> = {
  critical: '#ff4466',
  high: '#ff8800',
  medium: '#ffcc00',
  low: '#00ff88',
  info: '#7c3aed'
}

const statusColor: Record<string, string> = {
  done: '#00ff88',
  running: '#7c3aed',
  pending: '#ffcc00',
  failed: '#ff4466'
}

const agentColors: Record<string, string> = {
  'main': '#00ff88',
  'code-reviewer': '#7c3aed',
  'web-tester': '#00aaff',
  'issue-creator': '#ff8800',
  'notifier': '#ff4466',
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function StatCard({ label, value, color, icon }: any) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 24px',
      borderLeft: `3px solid ${color}`,
      transition: 'transform 0.15s',
    }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 36, fontWeight: 800, color, fontFamily: 'Space Mono' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6, fontFamily: 'Space Mono',
        textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  )
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 4, fontSize: 10,
      fontFamily: 'Space Mono', fontWeight: 700,
      background: `${color}22`, color,
      textTransform: 'uppercase', letterSpacing: 0.5
    }}>{text}</span>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [scans, setScans] = useState<Scan[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState({ totalScans: 0, totalIssues: 0, critical: 0, repos: 0 })
  const [tab, setTab] = useState<'overview' | 'scans' | 'issues' | 'activity' | 'projects'>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [severityFilter, setSeverityFilter] = useState('all')

  const fetchData = useCallback(async () => {
    setRefreshing(true)
    try {
      const [scansRes, issuesRes, activityRes, projectsRes] = await Promise.all([
        supabase.from('scans').select('*, projects(repo_name, github_repo_url)')
          .order('started_at', { ascending: false }).limit(30),
        supabase.from('issues_found').select('*')
          .order('created_at', { ascending: false }).limit(100),
        supabase.from('activity_log').select('*')
          .order('created_at', { ascending: false }).limit(50),
        supabase.from('projects').select('*')
          .order('created_at', { ascending: false }),
      ])

      if (scansRes.data) setScans(scansRes.data)
      if (issuesRes.data) setIssues(issuesRes.data)
      if (activityRes.data) setActivity(activityRes.data)
      if (projectsRes.data) setProjects(projectsRes.data)

      const allIssues = issuesRes.data || []
      const criticalCount = allIssues.filter(i => i.severity === 'critical').length
      const repoSet = new Set((scansRes.data || []).map((s: any) => s.projects?.repo_name).filter(Boolean))

      setStats({
        totalScans: scansRes.data?.length || 0,
        totalIssues: allIssues.length,
        critical: criticalCount,
        repos: repoSet.size
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
      else { setUser(data.user); fetchData() }
    })
  }, [fetchData, router])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredIssues = severityFilter === 'all'
    ? issues
    : issues.filter(i => i.severity === severityFilter)

  const recentActivity = activity.slice(0, 5)
  const runningScans = scans.filter(s => s.scan_status === 'running')

  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', flexDirection: 'column', gap: 16
    }}>
      <div style={{ fontSize: 48, animation: 'pulse 1.5s infinite' }}>🦞</div>
      <div style={{ color: 'var(--accent)', fontSize: 14, fontFamily: 'Space Mono' }}>
        Loading dashboard...
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <header style={{
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🦞</span>
          <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>OpenClaw</span>
          <span style={{
            fontSize: 10, color: 'var(--accent)', fontFamily: 'Space Mono',
            background: '#00ff8820', padding: '3px 8px', borderRadius: 4,
            textTransform: 'uppercase', letterSpacing: 1
          }}>Dashboard</span>
          {runningScans.length > 0 && (
            <span style={{
              fontSize: 10, color: '#7c3aed', fontFamily: 'Space Mono',
              background: '#7c3aed20', padding: '3px 8px', borderRadius: 4,
              animation: 'pulse 1.5s infinite'
            }}>● {runningScans.length} scanning</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={fetchData} disabled={refreshing} style={{
            padding: '6px 12px', background: 'var(--surface2)',
            border: '1px solid var(--border)', borderRadius: 6,
            color: refreshing ? 'var(--text2)' : 'var(--accent)',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            fontSize: 13, fontFamily: 'Space Mono',
            transition: 'all 0.2s'
          }}>{refreshing ? '...' : '↻'}</button>
          <span style={{
            color: 'var(--text2)', fontSize: 12,
            fontFamily: 'Space Mono'
          }}>{user?.email}</span>
          <button onClick={handleLogout} style={{
            padding: '6px 14px', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text2)', cursor: 'pointer', fontSize: 12,
            fontFamily: 'Space Mono', transition: 'all 0.2s'
          }}>logout</button>
        </div>
      </header>

      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Stats Row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16, marginBottom: 28
        }}>
          <StatCard label="Total Scans" value={stats.totalScans} color="#7c3aed" icon="🔍" />
          <StatCard label="Issues Found" value={stats.totalIssues} color="#ff8800" icon="🐛" />
          <StatCard label="Critical" value={stats.critical} color="#ff4466" icon="🚨" />
          <StatCard label="Repos" value={stats.repos} color="#00ff88" icon="📦" />
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 2, marginBottom: 24,
          borderBottom: '1px solid var(--border)'
        }}>
          {(['overview', 'scans', 'issues', 'activity', 'projects'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 18px',
              background: tab === t ? 'var(--surface2)' : 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t ? 'var(--text)' : 'var(--text2)',
              cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 700 : 400,
              fontFamily: 'Syne', textTransform: 'capitalize',
              transition: 'all 0.15s', marginBottom: -1
            }}>{t}</button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Recent Scans */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 20
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16,
                fontFamily: 'Space Mono', color: 'var(--text2)',
                textTransform: 'uppercase', letterSpacing: 1 }}>Recent Scans</h3>
              {scans.slice(0, 5).map(scan => (
                <div key={scan.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '10px 0',
                  borderBottom: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: statusColor[scan.scan_status] || 'var(--text2)',
                      ...(scan.scan_status === 'running' ? { animation: 'pulse 1.5s infinite' } : {})
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {scan.projects?.repo_name || 'Unknown'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'Space Mono' }}>
                        {scan.trigger_type}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'Space Mono' }}>
                    {timeAgo(scan.started_at)}
                  </span>
                </div>
              ))}
              {scans.length === 0 && (
                <div style={{ color: 'var(--text2)', fontSize: 13, textAlign: 'center',
                  padding: 20, fontFamily: 'Space Mono' }}>No scans yet</div>
              )}
            </div>

            {/* Recent Activity */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 20
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16,
                fontFamily: 'Space Mono', color: 'var(--text2)',
                textTransform: 'uppercase', letterSpacing: 1 }}>Agent Activity</h3>
              {recentActivity.map(log => (
                <div key={log.id} style={{
                  display: 'flex', gap: 10, padding: '10px 0',
                  borderBottom: '1px solid var(--border)', alignItems: 'flex-start'
                }}>
                  <span style={{
                    fontSize: 10, color: agentColors[log.agent_name] || 'var(--text2)',
                    fontFamily: 'Space Mono', fontWeight: 700,
                    background: `${agentColors[log.agent_name] || '#888'}22`,
                    padding: '2px 6px', borderRadius: 3, flexShrink: 0, marginTop: 1
                  }}>{log.agent_name}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--text)' }}>{log.action}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2,
                      fontFamily: 'Space Mono' }}>{timeAgo(log.created_at)}</div>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <div style={{ color: 'var(--text2)', fontSize: 13, textAlign: 'center',
                  padding: 20, fontFamily: 'Space Mono' }}>No activity yet</div>
              )}
            </div>

            {/* Critical Issues */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: 20, gridColumn: '1 / -1'
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16,
                fontFamily: 'Space Mono', color: 'var(--text2)',
                textTransform: 'uppercase', letterSpacing: 1 }}>
                Critical & High Issues
              </h3>
              {issues.filter(i => ['critical', 'high'].includes(i.severity)).slice(0, 5).map(issue => (
                <div key={issue.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Badge text={issue.severity} color={severityColor[issue.severity]} />
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                        {issue.description}
                      </div>
                      {issue.file_name && (
                        <div style={{ fontSize: 11, color: 'var(--accent2)',
                          fontFamily: 'Space Mono', marginTop: 2 }}>
                          {issue.file_name}{issue.line_number ? `:${issue.line_number}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                  {issue.github_issue_url && (
                    <a href={issue.github_issue_url} target="_blank" rel="noopener noreferrer"
                      style={{
                        padding: '4px 10px', background: 'var(--surface2)',
                        border: '1px solid var(--border)', borderRadius: 6,
                        color: 'var(--accent)', fontSize: 11, textDecoration: 'none',
                        fontFamily: 'Space Mono', flexShrink: 0, marginLeft: 16
                      }}>View →</a>
                  )}
                </div>
              ))}
              {issues.filter(i => ['critical', 'high'].includes(i.severity)).length === 0 && (
                <div style={{ color: 'var(--accent)', fontSize: 13, textAlign: 'center',
                  padding: 20, fontFamily: 'Space Mono' }}>✅ No critical issues found</div>
              )}
            </div>
          </div>
        )}

        {/* ── SCANS TAB ── */}
        {tab === 'scans' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20,
              color: 'var(--text)', fontFamily: 'Space Mono' }}>All Scans</h2>
            {scans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)',
                fontFamily: 'Space Mono', fontSize: 13 }}>
                No scans yet. Push code to trigger your first scan.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scans.map(scan => (
                  <div key={scan.id} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'border-color 0.15s'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: statusColor[scan.scan_status] || 'var(--text2)',
                        ...(scan.scan_status === 'running' ? { animation: 'pulse 1.5s infinite' } : {})
                      }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                          {scan.projects?.repo_name || 'Unknown repo'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3,
                          fontFamily: 'Space Mono' }}>
                          {scan.trigger_type} • {scan.trigger_ref || 'main'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <Badge text={scan.scan_status} color={statusColor[scan.scan_status] || '#888'} />
                      {scan.duration_seconds && (
                        <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'Space Mono' }}>
                          {scan.duration_seconds}s
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text2)', fontFamily: 'Space Mono' }}>
                        {timeAgo(scan.started_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ISSUES TAB ── */}
        {tab === 'issues' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)',
                fontFamily: 'Space Mono' }}>Bug Reports ({filteredIssues.length})</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'critical', 'high', 'medium', 'low'].map(sev => (
                  <button key={sev} onClick={() => setSeverityFilter(sev)} style={{
                    padding: '5px 12px',
                    background: severityFilter === sev ? (severityColor[sev] || 'var(--accent)') : 'var(--surface2)',
                    border: `1px solid ${severityFilter === sev ? (severityColor[sev] || 'var(--accent)') : 'var(--border)'}`,
                    borderRadius: 6, color: severityFilter === sev ? '#000' : 'var(--text2)',
                    cursor: 'pointer', fontSize: 11, fontFamily: 'Space Mono',
                    textTransform: 'capitalize', fontWeight: 700
                  }}>{sev}</button>
                ))}
              </div>
            </div>

            {filteredIssues.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)',
                fontFamily: 'Space Mono', fontSize: 13 }}>No issues found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredIssues.map(issue => (
                  <div key={issue.id} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '16px 20px',
                    borderLeft: `3px solid ${severityColor[issue.severity] || 'var(--border)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <Badge text={issue.severity} color={severityColor[issue.severity] || '#888'} />
                          {issue.issue_type && <Badge text={issue.issue_type} color="#7c3aed" />}
                          {issue.issue_source && <Badge text={issue.issue_source} color="#00aaff" />}
                        </div>
                        <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 6, fontWeight: 500 }}>
                          {issue.description}
                        </div>
                        {issue.file_name && (
                          <div style={{ fontSize: 11, color: 'var(--accent2)',
                            fontFamily: 'Space Mono', marginBottom: 6 }}>
                            📄 {issue.file_name}{issue.line_number ? `:${issue.line_number}` : ''}
                          </div>
                        )}
                        {issue.page_url && (
                          <div style={{ fontSize: 11, color: 'var(--accent2)',
                            fontFamily: 'Space Mono', marginBottom: 6 }}>
                            🌐 {issue.page_url}
                          </div>
                        )}
                        {issue.fix_suggestion && (
                          <div style={{
                            fontSize: 12, color: 'var(--text2)', marginTop: 8,
                            background: 'var(--surface2)', padding: '8px 12px',
                            borderRadius: 6, borderLeft: '2px solid var(--accent)'
                          }}>
                            💡 {issue.fix_suggestion}
                          </div>
                        )}
                      </div>
                      <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'flex-end', gap: 8, marginLeft: 20
                      }}>
                        {issue.github_issue_url && (
                          <a href={issue.github_issue_url} target="_blank" rel="noopener noreferrer"
                            style={{
                              padding: '5px 12px', background: 'var(--surface2)',
                              border: '1px solid var(--border)', borderRadius: 6,
                              color: 'var(--accent)', fontSize: 11, textDecoration: 'none',
                              fontFamily: 'Space Mono', whiteSpace: 'nowrap'
                            }}>GitHub →</a>
                        )}
                        <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'Space Mono' }}>
                          {timeAgo(issue.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY TAB ── */}
        {tab === 'activity' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20,
              color: 'var(--text)', fontFamily: 'Space Mono' }}>Live Agent Activity</h2>
            {activity.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)',
                fontFamily: 'Space Mono', fontSize: 13 }}>No activity logged yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activity.map(log => (
                  <div key={log.id} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '12px 18px',
                    display: 'flex', alignItems: 'flex-start', gap: 14
                  }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                      background: log.status === 'success' ? 'var(--green)' :
                        log.status === 'error' ? 'var(--red)' : 'var(--yellow)'
                    }} />
                    <span style={{
                      fontSize: 10, color: agentColors[log.agent_name] || 'var(--text2)',
                      fontFamily: 'Space Mono', fontWeight: 700,
                      background: `${agentColors[log.agent_name] || '#888'}22`,
                      padding: '3px 8px', borderRadius: 3, flexShrink: 0
                    }}>{log.agent_name}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
                        {log.action}
                      </div>
                      {log.details && (
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3,
                          fontFamily: 'Space Mono' }}>{log.details}</div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {log.repo_name && (
                        <div style={{ fontSize: 10, color: 'var(--text2)',
                          fontFamily: 'Space Mono', marginBottom: 2 }}>{log.repo_name}</div>
                      )}
                      <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'Space Mono' }}>
                        {timeAgo(log.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROJECTS TAB ── */}
        {tab === 'projects' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20,
              color: 'var(--text)', fontFamily: 'Space Mono' }}>
              Monitored Repositories
            </h2>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80, color: 'var(--text2)',
                fontFamily: 'Space Mono', fontSize: 13 }}>
                No projects yet. Add repos to start monitoring.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {projects.map(project => (
                  <div key={project.id} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '20px 22px',
                    borderTop: `2px solid ${project.webhook_active ? 'var(--accent)' : 'var(--border)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                          {project.repo_name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3,
                          fontFamily: 'Space Mono' }}>{project.github_repo_url}</div>
                      </div>
                      <Badge
                        text={project.webhook_active ? 'active' : 'inactive'}
                        color={project.webhook_active ? 'var(--accent)' : 'var(--text2)'}
                      />
                    </div>
                    {project.deployed_url && (
                      <a href={project.deployed_url} target="_blank" rel="noopener noreferrer"
                        style={{
                          fontSize: 11, color: 'var(--accent2)',
                          fontFamily: 'Space Mono', textDecoration: 'none'
                        }}>
                        🌐 {project.deployed_url}
                      </a>
                    )}
                    <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 10,
                      fontFamily: 'Space Mono' }}>Added {timeAgo(project.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
