// Post-build step for CrazyGames: makes sure the static export in ./out only uses relative URLs,
// reports anything that would make a network request to a third party, and prints the bundle size.
// Usage: pnpm build:crazygames   (runs `next build --webpack` first)
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const OUT = 'out'
if (!existsSync(join(OUT, 'index.html'))) {
  console.error('out/index.html not found. Run the build first (next.config.mjs must have output: "export").')
  process.exit(1)
}

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const files = walk(OUT)
let total = 0
for (const f of files) total += statSync(f).size

// 1) Rewrite root-absolute references in HTML ("/_next/...", "/images/...") to relative ones.
let rewritten = 0
for (const f of files.filter((f) => extname(f) === '.html')) {
  const before = readFileSync(f, 'utf8')
  const after = before.replace(/(\s(?:src|href|data-src|poster)=")\/(?!\/)/g, '$1./')
  if (after !== before) {
    writeFileSync(f, after)
    rewritten++
  }
}

// 2) Report remaining absolute references and external hosts in HTML/CSS.
const problems = []
const hosts = new Set()
for (const f of files.filter((f) => ['.html', '.css'].includes(extname(f)))) {
  const text = readFileSync(f, 'utf8')
  for (const m of text.matchAll(/(?:src|href)="\/(?!\/)[^"]*"/g)) problems.push(`${f}: absolute path ${m[0]}`)
  for (const m of text.matchAll(/url\(\s*["']?\/(?!\/)[^)]*\)/g)) problems.push(`${f}: absolute CSS url ${m[0]}`)
  for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) hosts.add(m[1].toLowerCase())
}
const allowed = new Set(['sdk.crazygames.com', 'www.w3.org'])
const unexpected = [...hosts].filter((h) => !allowed.has(h))

console.log(`\nCrazyGames bundle: ${files.length} files, ${(total / 1024 / 1024).toFixed(2)} MB (HTML rewritten: ${rewritten})`)
if (problems.length) {
  console.warn('\nAbsolute paths that will break when hosted in a sub-path:')
  for (const p of problems) console.warn('  -', p)
}
if (unexpected.length) {
  console.warn('\nExternal hosts referenced in HTML/CSS (CrazyGames only allows its own SDK):')
  for (const h of unexpected) console.warn('  -', h)
}
if (!problems.length && !unexpected.length) console.log('No absolute paths or third-party hosts found in HTML/CSS.')
console.log('\nNext: cd out && zip -r ../racing-unleashed-crazygames.zip .   (index.html must be at the zip root)')
