const labels = {
  'steep-ground': 'steep-ground access', 'rope-rescue': 'technical rope rescue',
  medical: 'medical response', 'night-operations': 'night operations', search: 'search',
  'off-road': 'off-road access', 'swift-water': 'swift-water rescue', winch: 'winch rescue',
  'aerial-search': 'aerial search',
}

export function matchTeams(incident, teams) {
  const needs = new Set(incident.requiredCapabilities || [])
  return teams.map((team) => {
    const matched = team.capabilities.filter((cap) => needs.has(cap))
    const missing = [...needs].filter((cap) => !team.capabilities.includes(cap))
    const availability = team.status === 'available' ? 30 : team.status === 'standby' ? 18 : 0
    const capability = needs.size ? Math.round((matched.length / needs.size) * 50) : 25
    const response = Math.max(0, 20 - Math.round(team.etaMinutes / 3))
    const score = Math.min(100, availability + capability + response)
    const reasons = [
      ...matched.map((cap) => `Has ${labels[cap] || cap}`),
      team.status === 'available' ? `Available · estimated ${team.etaMinutes} min` : `${team.status} · estimated ${team.etaMinutes} min`,
    ]
    const limits = missing.map((cap) => `No listed ${labels[cap] || cap} capability`)
    if (team.status === 'tasked') limits.push('Currently assigned to another incident')
    return { ...team, score, matched, missing, reasons, limits }
  }).sort((a, b) => b.score - a.score || a.etaMinutes - b.etaMinutes)
}
