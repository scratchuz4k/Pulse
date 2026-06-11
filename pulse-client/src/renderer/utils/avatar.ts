const AV_COLORS = [
  '#e8722e', '#23c97d', '#5750d6', '#d6457f', '#3a86c8',
  '#7a52c7', '#c2553f', '#2aa39a', '#b0843a', '#5a6acf',
]

export function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AV_COLORS[h % AV_COLORS.length]
}

export function initials(name: string): string {
  const p = name.trim().split(/\s+/)
  return (p[0][0] + (p[1] ? p[1][0] : '')).toUpperCase()
}
