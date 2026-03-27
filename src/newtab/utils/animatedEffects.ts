/** Canvas 2D 动态特效实现，每个效果返回 stop 函数 */

export interface EffectOptions {
  color: string   // hex e.g. "#667eea"
  speed: number   // 1–5
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function runStars(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let raf = 0
  let W = 0, H = 0

  const NUM = 220
  const stars = Array.from({ length: NUM }, () => ({
    x: Math.random() * 2000 - 1000,
    y: Math.random() * 2000 - 1000,
    z: Math.random() * 1000,
    pz: 0,
  }))

  const resize = () => {
    const dpr = window.devicePixelRatio || 1
    W = canvas.offsetWidth; H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr)
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  const draw = () => {
    const spd = (opts.speed / 3) * 2.5
    const [r, g, b] = hexToRgb(opts.color)

    ctx.fillStyle = 'rgba(0,0,10,0.25)'
    ctx.fillRect(0, 0, W, H)

    const cx = W / 2, cy = H / 2

    for (const s of stars) {
      s.pz = s.z
      s.z -= spd
      if (s.z <= 0) {
        s.x = Math.random() * 2000 - 1000
        s.y = Math.random() * 2000 - 1000
        s.z = 1000
        s.pz = s.z
      }

      const sx  = (s.x / s.z)  * 300 + cx
      const sy  = (s.y / s.z)  * 300 + cy
      const px  = (s.x / s.pz) * 300 + cx
      const py  = (s.y / s.pz) * 300 + cy
      const size = Math.max(0, (1 - s.z / 1000) * 3)
      const alpha = 1 - s.z / 1000

      // Draw streak
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.6})`
      ctx.lineWidth = size * 0.5
      ctx.beginPath()
      ctx.moveTo(px, py)
      ctx.lineTo(sx, sy)
      ctx.stroke()

      // Draw dot
      ctx.fillStyle = `rgba(255,255,255,${alpha})`
      ctx.beginPath()
      ctx.arc(sx, sy, size, 0, Math.PI * 2)
      ctx.fill()
    }

    raf = requestAnimationFrame(draw)
  }

  draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Particles ────────────────────────────────────────────────────────────────
function runParticles(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let raf = 0
  let W = 0, H = 0

  interface Particle { x: number; y: number; vx: number; vy: number; size: number }
  let particles: Particle[] = []

  const resize = () => {
    const dpr = window.devicePixelRatio || 1
    W = canvas.offsetWidth; H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      size: 1.5 + Math.random() * 2,
    }))
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  const LINK_DIST = 130
  const draw = () => {
    const spd = opts.speed / 3
    const [r, g, b] = hexToRgb(opts.color)

    ctx.fillStyle = 'rgba(5,5,20,0.2)'
    ctx.fillRect(0, 0, W, H)

    // Move
    for (const p of particles) {
      p.x += p.vx * spd
      p.y += p.vy * spd
      if (p.x < 0 || p.x > W) p.vx *= -1
      if (p.y < 0 || p.y > H) p.vy *= -1
    }

    // Links
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x
        const dy = particles[i].y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < LINK_DIST) {
          const alpha = (1 - dist / LINK_DIST) * 0.6
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
          ctx.lineWidth = 0.8
          ctx.beginPath()
          ctx.moveTo(particles[i].x, particles[i].y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }

    // Dots
    for (const p of particles) {
      ctx.fillStyle = `rgba(${r},${g},${b},0.9)`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    raf = requestAnimationFrame(draw)
  }

  draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Aurora ───────────────────────────────────────────────────────────────────
function runAurora(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let raf = 0
  let W = 0, H = 0
  let t = 0

  const resize = () => {
    const dpr = window.devicePixelRatio || 1
    W = canvas.offsetWidth; H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr)
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  const AURORA_COLORS = ['#00f2fe', '#764ba2', '#43e97b', '#4facfe', '#fa709a']

  const draw = () => {
    t += 0.004 * (opts.speed / 3)

    ctx.fillStyle = 'rgba(4,4,20,0.18)'
    ctx.fillRect(0, 0, W, H)

    const [ur, ug, ub] = hexToRgb(opts.color)
    ctx.globalCompositeOperation = 'lighter'

    for (let i = 0; i < 5; i++) {
      const cx = W * (0.2 + 0.6 * ((Math.sin(t * 0.7 + i * 1.3) + 1) / 2))
      const cy = H * (0.15 + i * 0.12 + Math.sin(t * 0.5 + i * 0.9) * 0.06)
      const radius = Math.min(W, H) * (0.35 + 0.1 * Math.sin(t + i))
      const brightness = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 1.1)

      const baseColor = i === 1
        ? `rgba(${ur},${ug},${ub},`
        : (() => {
            const [hr, hg, hb] = hexToRgb(AURORA_COLORS[i])
            return `rgba(${hr},${hg},${hb},`
          })()

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      grad.addColorStop(0, baseColor + `${0.18 * brightness})`)
      grad.addColorStop(0.5, baseColor + `${0.08 * brightness})`)
      grad.addColorStop(1, baseColor + '0)')

      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(cx, cy, radius, radius * 0.35, Math.sin(t * 0.3 + i) * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.globalCompositeOperation = 'source-over'
    raf = requestAnimationFrame(draw)
  }

  draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Waves ────────────────────────────────────────────────────────────────────
function runWaves(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let raf = 0
  let W = 0, H = 0
  let t = 0

  const resize = () => {
    const dpr = window.devicePixelRatio || 1
    W = canvas.offsetWidth; H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr)
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  const WAVES = [
    { freq: 0.006, amp: 0.07, speed: 0.8,  yBase: 0.60, alpha: 0.45 },
    { freq: 0.009, amp: 0.05, speed: 1.2,  yBase: 0.68, alpha: 0.35 },
    { freq: 0.005, amp: 0.06, speed: 0.6,  yBase: 0.55, alpha: 0.25 },
    { freq: 0.012, amp: 0.04, speed: 1.6,  yBase: 0.75, alpha: 0.50 },
  ]

  const draw = () => {
    t += 0.012 * (opts.speed / 3)
    const [r, g, b] = hexToRgb(opts.color)

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
    bgGrad.addColorStop(0, `rgba(${Math.round(r*0.08)},${Math.round(g*0.08)},${Math.round(b*0.15)},1)`)
    bgGrad.addColorStop(1, `rgba(${Math.round(r*0.15)},${Math.round(g*0.15)},${Math.round(b*0.25)},1)`)
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    for (const w of WAVES) {
      ctx.beginPath()
      ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 3) {
        const y = H * w.yBase
          + Math.sin(x * w.freq + t * w.speed) * H * w.amp
          + Math.sin(x * w.freq * 1.7 - t * w.speed * 0.6) * H * w.amp * 0.4
        ctx.lineTo(x, y)
      }
      ctx.lineTo(W, H)
      ctx.closePath()

      const wGrad = ctx.createLinearGradient(0, H * w.yBase - H * w.amp, 0, H)
      wGrad.addColorStop(0, `rgba(${r},${g},${b},${w.alpha})`)
      wGrad.addColorStop(1, `rgba(${Math.round(r*0.5)},${Math.round(g*0.5)},${Math.round(b*0.5)},${w.alpha * 0.7})`)
      ctx.fillStyle = wGrad
      ctx.fill()
    }

    raf = requestAnimationFrame(draw)
  }

  draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Rain ─────────────────────────────────────────────────────────────────────
function runRain(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let raf = 0
  let W = 0, H = 0

  interface Drop { x: number; y: number; speed: number; length: number; alpha: number }
  let drops: Drop[] = []

  const resize = () => {
    const dpr = window.devicePixelRatio || 1
    W = canvas.offsetWidth; H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    drops = Array.from({ length: 160 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 6 + Math.random() * 12,
      length: 12 + Math.random() * 20,
      alpha: 0.2 + Math.random() * 0.5,
    }))
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  const draw = () => {
    const spd = opts.speed / 3

    ctx.fillStyle = 'rgba(8,12,20,0.3)'
    ctx.fillRect(0, 0, W, H)

    ctx.lineWidth = 1
    for (const d of drops) {
      d.y += d.speed * spd
      if (d.y > H + d.length) {
        d.y = -d.length
        d.x = Math.random() * W
      }

      ctx.strokeStyle = `rgba(180,220,255,${d.alpha})`
      ctx.beginPath()
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x + d.length * 0.15, d.y + d.length)
      ctx.stroke()
    }

    raf = requestAnimationFrame(draw)
  }

  draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Snow ─────────────────────────────────────────────────────────────────────
function runSnow(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let raf = 0
  let W = 0, H = 0
  let t = 0

  interface Flake { x: number; y: number; size: number; speed: number; wobble: number; wobbleSpeed: number; alpha: number }
  let flakes: Flake[] = []

  const resize = () => {
    const dpr = window.devicePixelRatio || 1
    W = canvas.offsetWidth; H = canvas.offsetHeight
    canvas.width = W * dpr; canvas.height = H * dpr
    ctx.scale(dpr, dpr)
    flakes = Array.from({ length: 130 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 1.5 + Math.random() * 4,
      speed: 0.4 + Math.random() * 1.2,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.01 + Math.random() * 0.02,
      alpha: 0.5 + Math.random() * 0.5,
    }))
  }
  resize()
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  const draw = () => {
    const spd = opts.speed / 3
    t += 0.016

    ctx.fillStyle = 'rgba(8,10,24,0.25)'
    ctx.fillRect(0, 0, W, H)

    for (const f of flakes) {
      f.wobble += f.wobbleSpeed
      f.x += Math.sin(f.wobble) * 0.6
      f.y += f.speed * spd

      if (f.y > H + f.size) {
        f.y = -f.size
        f.x = Math.random() * W
      }

      ctx.fillStyle = `rgba(255,255,255,${f.alpha})`
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2)
      ctx.fill()
    }

    raf = requestAnimationFrame(draw)
  }

  draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Matrix Rain ──────────────────────────────────────────────────────────────
function runMatrix(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0
  const cols: number[] = []
  const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEF0123456789@#$%'
  const fontSize = 14
  const [r, g, b] = hexToRgb(opts.color)

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
    const count = Math.floor(w / (fontSize * dpr))
    cols.length = 0
    for (let i = 0; i < count; i++) cols.push(Math.random() * -50)
  }

  function draw() {
    const speed = 0.2 + (opts.speed - 1) * 0.45
    const dpr = window.devicePixelRatio || 1
    const fs = fontSize * dpr
    ctx.fillStyle = 'rgba(0,0,0,0.05)'
    ctx.fillRect(0, 0, w, h)
    ctx.font = `${fs}px monospace`
    for (let i = 0; i < cols.length; i++) {
      const ch = chars[Math.floor(Math.random() * chars.length)]
      const x = i * fs
      const y = cols[i] * fs
      // head char brighter
      ctx.fillStyle = `rgba(${r},${g},${b},1)`
      ctx.fillText(ch, x, y)
      // trail
      ctx.fillStyle = `rgba(${Math.min(r+80,255)},${Math.min(g+200,255)},${Math.min(b+80,255)},0.5)`
      ctx.fillText(chars[Math.floor(Math.random() * chars.length)], x, y - fs)
      if (y > h && Math.random() > 0.975) cols[i] = 0
      cols[i] += speed
    }
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()
  draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Fireworks ────────────────────────────────────────────────────────────────
function runFireworks(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0
  interface Particle { x: number; y: number; vx: number; vy: number; alpha: number; color: string; size: number }
  const particles: Particle[] = []
  const rockets: { x: number; y: number; vy: number; color: string }[] = []
  let tick = 0
  const [r, g, b] = hexToRgb(opts.color)

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function hsl(h: number) { return `hsl(${h},100%,70%)` }

  function explode(x: number, y: number, color: string) {
    const count = 80 + Math.floor(Math.random() * 60)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const speed = 1.5 + Math.random() * 3
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, alpha: 1, color, size: 2 + Math.random() * 2 })
    }
  }

  function draw() {
    const spd = 0.5 + (opts.speed - 1) * 0.5
    tick++
    const dpr = window.devicePixelRatio || 1
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, 0, w, h)

    if (tick % Math.round(60 / spd) === 0) {
      const color = Math.random() < 0.3 ? `rgb(${r},${g},${b})` : hsl(Math.random() * 360)
      rockets.push({ x: 0.2 * w + Math.random() * 0.6 * w, y: h, vy: -(8 + Math.random() * 6) * dpr, color })
    }

    for (let i = rockets.length - 1; i >= 0; i--) {
      const rk = rockets[i]
      rk.y += rk.vy * spd
      ctx.beginPath()
      ctx.arc(rk.x, rk.y, 3 * dpr, 0, Math.PI * 2)
      ctx.fillStyle = rk.color
      ctx.fill()
      if (rk.y < h * (0.15 + Math.random() * 0.35)) {
        explode(rk.x, rk.y, rk.color)
        rockets.splice(i, 1)
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx * spd; p.y += p.vy * spd
      p.vy += 0.06 * dpr; p.alpha -= 0.015 * spd
      if (p.alpha <= 0) { particles.splice(i, 1); continue }
      ctx.globalAlpha = p.alpha
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * dpr, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.fill()
    }
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Nebula ───────────────────────────────────────────────────────────────────
function runNebula(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)
  const stars: { x: number; y: number; s: number; a: number }[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
    stars.length = 0
    for (let i = 0; i < 200; i++) stars.push({ x: Math.random() * w, y: Math.random() * h, s: Math.random() * 2 * dpr, a: Math.random() })
  }

  function draw() {
    const spd = 0.002 + (opts.speed - 1) * 0.002
    t += spd
    ctx.clearRect(0, 0, w, h)
    // nebula blobs
    for (let i = 0; i < 5; i++) {
      const bx = w * (0.2 + 0.15 * i + 0.1 * Math.sin(t * 0.7 + i))
      const by = h * (0.5 + 0.15 * Math.cos(t * 0.5 + i * 1.3))
      const rad = w * (0.15 + 0.05 * Math.sin(t + i))
      const grd = ctx.createRadialGradient(bx, by, 0, bx, by, rad)
      const alpha = 0.06 + 0.04 * Math.sin(t + i)
      grd.addColorStop(0, `rgba(${r},${g},${b},${alpha})`)
      grd.addColorStop(0.5, `rgba(${Math.min(r+60,255)},${Math.min(g+20,255)},${Math.min(b+120,255)},${alpha * 0.5})`)
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, w, h)
    }
    // stars
    for (const s of stars) {
      const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(t * 3 + s.a * 10))
      ctx.globalAlpha = twinkle
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
    }
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Lightning ────────────────────────────────────────────────────────────────
function runLightning(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, tick = 0, flashTimer = 0
  const [r, g, b] = hexToRgb(opts.color)
  interface Bolt { pts: [number, number][]; alpha: number }
  const bolts: Bolt[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function makeBolt(x: number, y: number): [number, number][] {
    const pts: [number, number][] = [[x, y]]
    let cx = x, cy = y
    while (cy < h) {
      cx += (Math.random() - 0.5) * w * 0.15
      cy += h * (0.08 + Math.random() * 0.1)
      pts.push([cx, cy])
    }
    return pts
  }

  function draw() {
    const spd = 0.5 + (opts.speed - 1) * 0.5
    tick++
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(0, 0, w, h)

    const interval = Math.round(120 / spd)
    if (tick % interval === 0) {
      const x = w * (0.2 + Math.random() * 0.6)
      bolts.push({ pts: makeBolt(x, 0), alpha: 1 })
      flashTimer = 4
    }
    if (flashTimer > 0) {
      ctx.fillStyle = `rgba(${r},${g},${b},0.06)`
      ctx.fillRect(0, 0, w, h)
      flashTimer--
    }

    for (let i = bolts.length - 1; i >= 0; i--) {
      const bolt = bolts[i]
      ctx.globalAlpha = bolt.alpha
      ctx.beginPath()
      ctx.moveTo(bolt.pts[0][0], bolt.pts[0][1])
      for (const [px, py] of bolt.pts) ctx.lineTo(px, py)
      ctx.strokeStyle = `rgb(${r},${g},${b})`
      ctx.lineWidth = 2
      ctx.shadowColor = `rgb(${r},${g},${b})`
      ctx.shadowBlur = 20
      ctx.stroke()
      ctx.shadowBlur = 0
      bolt.alpha -= 0.05 * spd
      if (bolt.alpha <= 0) bolts.splice(i, 1)
    }
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── DNA Helix ────────────────────────────────────────────────────────────────
function runDna(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function draw() {
    const spd = 0.01 + (opts.speed - 1) * 0.01
    t += spd
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.fillRect(0, 0, w, h)

    const cx = w / 2, amp = Math.min(w, h) * 0.18, freq = Math.PI * 2 / (h * 0.5)
    const steps = 80

    for (let i = 0; i <= steps; i++) {
      const y = (i / steps) * h
      const phase = freq * y + t
      const x1 = cx + amp * Math.cos(phase)
      const x2 = cx + amp * Math.cos(phase + Math.PI)
      const depth = Math.cos(phase)

      // rung (crossbar)
      if (i % 5 === 0) {
        const alpha = 0.3 + 0.4 * Math.abs(depth)
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
        // nodes on rung
        const nr = 6 * (0.5 + 0.5 * Math.abs(depth))
        ctx.beginPath(); ctx.arc(x1, y, nr, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`; ctx.fill()
        ctx.beginPath(); ctx.arc(x2, y, nr, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${Math.min(r+80,255)},${Math.min(g+80,255)},255,${alpha})`; ctx.fill()
      }
    }

    // draw strands
    for (let strand = 0; strand < 2; strand++) {
      ctx.beginPath()
      for (let i = 0; i <= steps; i++) {
        const y = (i / steps) * h
        const phase = freq * y + t + (strand === 1 ? Math.PI : 0)
        const x = cx + amp * Math.cos(phase)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = strand === 0 ? `rgba(${r},${g},${b},0.8)` : `rgba(${Math.min(r+80,255)},${Math.min(g+80,255)},255,0.8)`
      ctx.lineWidth = 3; ctx.stroke()
    }
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Galaxy ───────────────────────────────────────────────────────────────────
function runGalaxy(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)
  interface Star { dist: number; angle: number; arm: number; size: number; bright: number }
  let stars: Star[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
    const arms = 3, perArm = 300
    stars = []
    for (let a = 0; a < arms; a++) {
      for (let i = 0; i < perArm; i++) {
        const dist = 0.05 + Math.pow(Math.random(), 0.7) * 0.48
        const spread = 0.15 * (1 - dist)
        stars.push({ dist, angle: (a * Math.PI * 2 / arms) + dist * Math.PI * 4 + (Math.random() - 0.5) * spread, arm: a, size: Math.random() * 2.5 * dpr, bright: Math.random() })
      }
    }
    // core stars
    for (let i = 0; i < 200; i++) {
      stars.push({ dist: Math.random() * 0.08, angle: Math.random() * Math.PI * 2, arm: -1, size: Math.random() * 2 * dpr, bright: Math.random() })
    }
  }

  function draw() {
    const spd = 0.0003 + (opts.speed - 1) * 0.0002
    t += spd
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(0, 0, w, h)

    const cx = w / 2, cy = h / 2, maxR = Math.min(w, h) * 0.46

    // core glow
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.15)
    grd.addColorStop(0, `rgba(${r},${g},${b},0.5)`)
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h)

    for (const s of stars) {
      const angle = s.angle + t
      const dist = s.dist * maxR
      const x = cx + dist * Math.cos(angle), y = cy + dist * Math.sin(angle) * 0.4
      const alpha = 0.4 + 0.6 * s.bright
      const sr = s.arm === -1 ? `rgba(${Math.min(r+100,255)},${Math.min(g+100,255)},255,${alpha})` : `rgba(${r},${g},${b},${alpha})`
      ctx.beginPath(); ctx.arc(x, y, s.size, 0, Math.PI * 2)
      ctx.fillStyle = sr; ctx.fill()
    }
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Lava Lamp ────────────────────────────────────────────────────────────────
function runLavalamp(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)
  interface Blob { ox: number; oy: number; rx: number; ry: number; phase: number; speed: number; color: [number,number,number] }
  let blobs: Blob[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
    blobs = []
    const colors: [number,number,number][] = [[r,g,b],[Math.min(r+60,255),Math.min(b,255),Math.min(g+60,255)],[Math.min(g+60,255),Math.min(r,255),Math.min(b+80,255)]]
    for (let i = 0; i < 8; i++) {
      blobs.push({ ox: w * (0.2 + Math.random() * 0.6), oy: h * (0.1 + Math.random() * 0.8), rx: Math.min(w,h) * (0.08 + Math.random() * 0.12), ry: Math.min(w,h) * (0.06 + Math.random() * 0.1), phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.7, color: colors[i % 3] })
    }
  }

  function draw() {
    const spd = 0.008 + (opts.speed - 1) * 0.008
    t += spd
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.fillRect(0, 0, w, h)

    for (const bl of blobs) {
      const x = bl.ox + Math.sin(t * bl.speed + bl.phase) * w * 0.15
      const y = bl.oy + Math.cos(t * bl.speed * 0.7 + bl.phase) * h * 0.3
      const rx = bl.rx * (0.85 + 0.15 * Math.sin(t * 2 + bl.phase))
      const ry = bl.ry * (0.85 + 0.15 * Math.cos(t * 1.7 + bl.phase))
      const grd = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry))
      const [cr, cg, cb] = bl.color
      grd.addColorStop(0, `rgba(${cr},${cg},${cb},0.9)`)
      grd.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.5)`)
      grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
      ctx.save()
      ctx.translate(x, y); ctx.scale(1, ry / rx)
      ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2)
      ctx.fillStyle = grd; ctx.fill()
      ctx.restore()
    }
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Geometric Flow ───────────────────────────────────────────────────────────
function runGeometricflow(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)
  interface Shape { x: number; y: number; sides: number; size: number; angle: number; vx: number; vy: number; va: number; hue: number }
  let shapes: Shape[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
    shapes = []
    for (let i = 0; i < 30; i++) {
      shapes.push({ x: Math.random() * w, y: Math.random() * h, sides: [3,4,5,6][Math.floor(Math.random()*4)], size: (30 + Math.random() * 60) * dpr, angle: Math.random() * Math.PI * 2, vx: (Math.random() - 0.5) * 0.5 * dpr, vy: (Math.random() - 0.5) * 0.5 * dpr, va: (Math.random() - 0.5) * 0.01, hue: Math.random() * 60 - 30 })
    }
  }

  function polygon(x: number, y: number, n: number, size: number, angle: number) {
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = angle + (i / n) * Math.PI * 2
      i === 0 ? ctx.moveTo(x + size * Math.cos(a), y + size * Math.sin(a)) : ctx.lineTo(x + size * Math.cos(a), y + size * Math.sin(a))
    }
    ctx.closePath()
  }

  function draw() {
    const spd = 0.2 + (opts.speed - 1) * 0.4
    t += 0.005 * spd
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.fillRect(0, 0, w, h)

    for (const s of shapes) {
      s.x += s.vx * spd; s.y += s.vy * spd; s.angle += s.va * spd
      if (s.x < -s.size) s.x = w + s.size
      if (s.x > w + s.size) s.x = -s.size
      if (s.y < -s.size) s.y = h + s.size
      if (s.y > h + s.size) s.y = -s.size

      const alpha = 0.15 + 0.1 * Math.sin(t * 2 + s.hue)
      polygon(s.x, s.y, s.sides, s.size, s.angle)
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha + 0.3})`
      ctx.lineWidth = 1.5
      ctx.stroke()

      polygon(s.x, s.y, s.sides, s.size * 0.7, s.angle + Math.PI / s.sides)
      ctx.fillStyle = `rgba(${Math.min(r+40,255)},${Math.min(g+40,255)},${Math.min(b+100,255)},${alpha})`
      ctx.fill()
    }
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Neon Tunnel ──────────────────────────────────────────────────────────────
function runNeon(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function draw() {
    const spd = 0.005 + (opts.speed - 1) * 0.008
    t += spd
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(0, 0, w, h)

    const cx = w / 2 + Math.sin(t * 0.3) * w * 0.05
    const cy = h / 2 + Math.cos(t * 0.25) * h * 0.05
    const rings = 20

    for (let i = rings; i >= 1; i--) {
      const scale = i / rings
      const depth = 1 - scale
      const size = scale * Math.min(w, h) * 0.55
      const alpha = 0.1 + depth * 0.5
      const hueShift = (t * 60 + i * 18) % 360
      const flickerAlpha = alpha * (0.7 + 0.3 * Math.sin(t * 8 + i))

      ctx.strokeStyle = `hsla(${hueShift},100%,60%,${flickerAlpha})`
      ctx.lineWidth = 1.5
      ctx.shadowColor = `hsl(${hueShift},100%,60%)`
      ctx.shadowBlur = 8

      ctx.strokeRect(cx - size, cy - size * (h / w), size * 2, size * 2 * (h / w))
    }

    // grid lines
    const gridCount = 8
    for (let i = 0; i <= gridCount; i++) {
      const x = (i / gridCount) * w
      const y = (i / gridCount) * h
      const alpha = 0.08 + 0.04 * Math.abs(Math.sin(t * 2 + i))
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.lineWidth = 1; ctx.shadowBlur = 0
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(cx, cy); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cx, cy); ctx.stroke()
    }
    ctx.shadowBlur = 0
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Fire ─────────────────────────────────────────────────────────────────────
function runFire(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0
  const [r, g, b] = hexToRgb(opts.color)
  interface Ember { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number }
  let embers: Ember[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function draw() {
    const spd = 0.5 + (opts.speed - 1) * 0.5
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.fillRect(0, 0, w, h)

    const spawn = Math.round(4 * spd)
    for (let i = 0; i < spawn; i++) {
      const life = 60 + Math.random() * 80
      embers.push({ x: w * (0.3 + Math.random() * 0.4), y: h * 0.95, vx: (Math.random() - 0.5) * 2, vy: -(2 + Math.random() * 4) * spd, life, maxLife: life, size: (4 + Math.random() * 8) })
    }

    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i]
      e.x += e.vx; e.y += e.vy
      e.vx += (Math.random() - 0.5) * 0.3
      e.life -= spd
      if (e.life <= 0) { embers.splice(i, 1); continue }

      const progress = e.life / e.maxLife
      const cr = Math.min(255, r + Math.round((255 - r) * progress))
      const cg = Math.min(255, Math.round(g * (1 - progress) + 180 * progress))
      const cb = Math.min(255, Math.round(b * (1 - progress)))
      const alpha = progress * 0.9

      const grd = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * progress + 2)
      grd.addColorStop(0, `rgba(255,255,200,${alpha})`)
      grd.addColorStop(0.3, `rgba(${cr},${cg},${cb},${alpha * 0.8})`)
      grd.addColorStop(1, `rgba(${r},0,0,0)`)
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.size * progress + 2, 0, Math.PI * 2)
      ctx.fill()
    }
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Ocean ────────────────────────────────────────────────────────────────────
function runOcean(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function drawWave(yBase: number, amp: number, freq: number, phase: number, color: string) {
    ctx.beginPath()
    ctx.moveTo(0, h)
    for (let x = 0; x <= w; x += 4) {
      const y = yBase + amp * Math.sin(x * freq + phase) + amp * 0.4 * Math.sin(x * freq * 2.1 + phase * 1.3)
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath()
    ctx.fillStyle = color; ctx.fill()
  }

  function draw() {
    const spd = 0.01 + (opts.speed - 1) * 0.01
    t += spd
    ctx.clearRect(0, 0, w, h)

    // sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55)
    sky.addColorStop(0, `rgba(0,5,20,1)`)
    sky.addColorStop(1, `rgba(${Math.min(r*0.3,60)},${Math.min(g*0.3,80)},${Math.min(b*0.5,120)},1)`)
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h)

    const freq = 0.006 / (w / 1000)
    drawWave(h * 0.65, h * 0.06, freq, t * 0.8, `rgba(${r},${g},${b},0.25)`)
    drawWave(h * 0.68, h * 0.07, freq * 0.8, t + 1, `rgba(${r},${Math.min(g+20,255)},${Math.min(b+40,255)},0.35)`)
    drawWave(h * 0.72, h * 0.08, freq * 0.6, t * 1.2, `rgba(${Math.min(r+10,255)},${Math.min(g+30,255)},${Math.min(b+60,255)},0.45)`)
    drawWave(h * 0.78, h * 0.07, freq * 0.5, t * 0.9 + 2, `rgba(${Math.min(r+20,255)},${Math.min(g+50,255)},${Math.min(b+80,255)},0.6)`)
    drawWave(h * 0.86, h * 0.05, freq * 0.4, t * 1.1 + 3, `rgba(${Math.min(r+30,255)},${Math.min(g+70,255)},${Math.min(b+100,255)},0.8)`)

    // foam sparkles
    for (let i = 0; i < 5; i++) {
      const fx = (Math.sin(t * 1.3 + i * 137) * 0.5 + 0.5) * w
      const fy = h * (0.72 + 0.14 * Math.sin(t + i)) + h * 0.04 * Math.sin(fx * freq + t)
      ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill()
    }
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Sakura ───────────────────────────────────────────────────────────────────
function runSakura(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)
  interface Petal { x: number; y: number; vx: number; vy: number; angle: number; va: number; size: number; alpha: number; swing: number; phase: number }
  let petals: Petal[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
    petals = []
    for (let i = 0; i < 60; i++) spawnPetal(true)
  }

  function spawnPetal(initial = false) {
    const dpr = window.devicePixelRatio || 1
    petals.push({ x: Math.random() * w, y: initial ? Math.random() * h : -20, vx: (Math.random() - 0.5) * dpr, vy: (0.5 + Math.random()) * dpr, angle: Math.random() * Math.PI * 2, va: (Math.random() - 0.5) * 0.04, size: (6 + Math.random() * 10) * dpr, alpha: 0.7 + Math.random() * 0.3, swing: Math.random() * Math.PI * 2, phase: Math.random() * Math.PI * 2 })
  }

  function drawPetal(x: number, y: number, size: number, angle: number, alpha: number) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha = alpha
    const pr = Math.min(r + 80, 255), pg = Math.min(g + 60, 255), pb = Math.min(b + 80, 255)
    ctx.fillStyle = `rgb(${pr},${pg},${pb})`
    ctx.beginPath()
    ctx.ellipse(0, -size * 0.5, size * 0.35, size * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgba(255,255,255,0.3)`
    ctx.beginPath()
    ctx.ellipse(-size * 0.05, -size * 0.5, size * 0.15, size * 0.35, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function draw() {
    const spd = 0.3 + (opts.speed - 1) * 0.4
    t += 0.016
    ctx.clearRect(0, 0, w, h)

    for (let i = petals.length - 1; i >= 0; i--) {
      const p = petals[i]
      p.swing += 0.02 * spd; p.angle += p.va * spd
      p.x += (p.vx + Math.sin(p.swing + p.phase) * 0.8) * spd
      p.y += p.vy * spd
      if (p.y > h + 30) { petals.splice(i, 1); spawnPetal(); continue }
      drawPetal(p.x, p.y, p.size, p.angle, p.alpha)
    }
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Bokeh ────────────────────────────────────────────────────────────────────
function runBokeh(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0
  const [r, g, b] = hexToRgb(opts.color)
  interface Circle { x: number; y: number; vy: number; size: number; alpha: number; color: [number,number,number] }
  let circles: Circle[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
    circles = []
    for (let i = 0; i < 40; i++) spawnCircle(true)
  }

  function spawnCircle(initial = false) {
    const dpr = window.devicePixelRatio || 1
    const colors: [number,number,number][] = [[r,g,b],[Math.min(r+60,255),Math.min(g+20,255),Math.min(b+100,255)],[Math.min(r+100,255),Math.min(g+100,255),Math.min(b+50,255)]]
    circles.push({ x: Math.random() * w, y: initial ? Math.random() * h : h + 50, vy: -(0.3 + Math.random() * 0.8), size: (20 + Math.random() * 80) * dpr, alpha: 0.05 + Math.random() * 0.2, color: colors[Math.floor(Math.random() * 3)] })
  }

  function draw() {
    const spd = 0.3 + (opts.speed - 1) * 0.3
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.fillRect(0, 0, w, h)

    for (let i = circles.length - 1; i >= 0; i--) {
      const c = circles[i]
      c.y += c.vy * spd
      if (c.y + c.size < 0) { circles.splice(i, 1); spawnCircle(); continue }

      const grd = ctx.createRadialGradient(c.x - c.size * 0.25, c.y - c.size * 0.25, 0, c.x, c.y, c.size)
      const [cr, cg, cb] = c.color
      grd.addColorStop(0, `rgba(255,255,255,${c.alpha * 0.6})`)
      grd.addColorStop(0.3, `rgba(${cr},${cg},${cb},${c.alpha})`)
      grd.addColorStop(0.85, `rgba(${cr},${cg},${cb},${c.alpha * 0.3})`)
      grd.addColorStop(1, `rgba(${cr},${cg},${cb},0)`)
      ctx.beginPath(); ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2)
      ctx.fillStyle = grd; ctx.fill()

      // highlight ring
      ctx.beginPath(); ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255,255,255,${c.alpha * 0.4})`
      ctx.lineWidth = 1; ctx.stroke()
    }
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Constellation ────────────────────────────────────────────────────────────
function runConstellation(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)
  interface Star { x: number; y: number; vx: number; vy: number; size: number }
  let stars: Star[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
    stars = []
    for (let i = 0; i < 120; i++) {
      stars.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3 * dpr, vy: (Math.random() - 0.5) * 0.3 * dpr, size: (1 + Math.random() * 2) * dpr })
    }
  }

  function draw() {
    const spd = 0.2 + (opts.speed - 1) * 0.3
    t += 0.01 * spd
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(0, 0, w, h)

    const maxDist = Math.min(w, h) * 0.18

    // connections
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dx = stars[i].x - stars[j].x, dy = stars[i].y - stars[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.4
          ctx.beginPath(); ctx.moveTo(stars[i].x, stars[i].y); ctx.lineTo(stars[j].x, stars[j].y)
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`; ctx.lineWidth = 0.8; ctx.stroke()
        }
      }
    }

    // stars
    for (const s of stars) {
      s.x += s.vx * spd; s.y += s.vy * spd
      if (s.x < 0) s.x = w; if (s.x > w) s.x = 0
      if (s.y < 0) s.y = h; if (s.y > h) s.y = 0
      const twinkle = 0.5 + 0.5 * Math.sin(t * 5 + s.x)
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size * twinkle, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${Math.min(r+100,255)},${Math.min(g+100,255)},255,0.9)`; ctx.fill()
    }
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Portal ───────────────────────────────────────────────────────────────────
function runPortal(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)
  interface Ring { radius: number; speed: number; width: number; alpha: number }
  const rings: Ring[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function draw() {
    const spd = 0.01 + (opts.speed - 1) * 0.015
    t += spd
    ctx.fillStyle = 'rgba(0,0,0,0.15)'
    ctx.fillRect(0, 0, w, h)

    const cx = w / 2, cy = h / 2
    const maxR = Math.min(w, h) * 0.42

    // spawn rings periodically
    if (Math.random() < 0.05) rings.push({ radius: 0, speed: 1 + Math.random() * 2, width: 1 + Math.random() * 3, alpha: 0.8 })
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i]
      ring.radius += ring.speed * (0.5 + opts.speed * 0.3)
      ring.alpha -= 0.008
      if (ring.alpha <= 0 || ring.radius > maxR * 1.2) { rings.splice(i, 1); continue }
      ctx.beginPath(); ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${r},${g},${b},${ring.alpha})`
      ctx.lineWidth = ring.width; ctx.stroke()
    }

    // vortex arms
    const arms = 6
    for (let a = 0; a < arms; a++) {
      ctx.beginPath()
      for (let i = 0; i < 100; i++) {
        const angle = (a / arms) * Math.PI * 2 + t + i * 0.08
        const radius = (i / 100) * maxR
        const x = cx + radius * Math.cos(angle), y = cy + radius * Math.sin(angle)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      const hue = (t * 40 + a * 60) % 360
      ctx.strokeStyle = `hsla(${hue},100%,70%,0.25)`; ctx.lineWidth = 1.5; ctx.stroke()
    }

    // core glow
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.3)
    grd.addColorStop(0, `rgba(${r},${g},${b},0.6)`)
    grd.addColorStop(0.4, `rgba(${r},${g},${b},0.15)`)
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cx, cy, maxR * 0.3, 0, Math.PI * 2); ctx.fill()
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Bubbles ──────────────────────────────────────────────────────────────────
function runBubbles(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0
  const [r, g, b] = hexToRgb(opts.color)
  interface Bubble { x: number; y: number; vy: number; size: number; phase: number; wobble: number }
  let bubbles: Bubble[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
    bubbles = []
    for (let i = 0; i < 40; i++) spawnBubble(true)
  }

  function spawnBubble(initial = false) {
    const dpr = window.devicePixelRatio || 1
    bubbles.push({ x: Math.random() * w, y: initial ? Math.random() * h : h + 50, vy: -(0.4 + Math.random() * 1.2) * dpr, size: (8 + Math.random() * 40) * dpr, phase: Math.random() * Math.PI * 2, wobble: Math.random() * 0.03 })
  }

  function draw() {
    const spd = 0.4 + (opts.speed - 1) * 0.4
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    ctx.fillRect(0, 0, w, h)

    for (let i = bubbles.length - 1; i >= 0; i--) {
      const bub = bubbles[i]
      bub.phase += bub.wobble * spd
      bub.x += Math.sin(bub.phase) * 1.5
      bub.y += bub.vy * spd
      if (bub.y + bub.size < 0) { bubbles.splice(i, 1); spawnBubble(); continue }

      const cx = bub.x, cy = bub.y, sr = bub.size
      // body
      ctx.beginPath(); ctx.arc(cx, cy, sr, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.fillStyle = `rgba(${r},${g},${b},0.05)`; ctx.fill()
      // highlight
      ctx.beginPath(); ctx.arc(cx - sr * 0.3, cy - sr * 0.3, sr * 0.25, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill()
      // small shine
      ctx.beginPath(); ctx.arc(cx - sr * 0.15, cy - sr * 0.5, sr * 0.08, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill()
    }
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Plasma ───────────────────────────────────────────────────────────────────
function runPlasma(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function draw() {
    const spd = 0.008 + (opts.speed - 1) * 0.01
    t += spd
    // Low-res plasma on offscreen, then scale up
    const scale = 4
    const pw = Math.ceil(w / scale), ph = Math.ceil(h / scale)
    const img = ctx.createImageData(pw, ph)

    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const v = Math.sin(x * 0.08 + t) + Math.sin(y * 0.07 + t * 1.1) + Math.sin((x + y) * 0.05 + t * 0.9) + Math.sin(Math.sqrt(x * x + y * y) * 0.1 - t)
        const n = (v + 4) / 8
        const cr = Math.floor(r * 0.3 + (Math.min(r + 100, 255)) * 0.7 * Math.abs(Math.sin(n * Math.PI)))
        const cg = Math.floor(g * 0.3 + (Math.min(g + 100, 255)) * 0.7 * Math.abs(Math.sin(n * Math.PI + 2.1)))
        const cb2 = Math.floor(b * 0.3 + (Math.min(b + 150, 255)) * 0.7 * Math.abs(Math.sin(n * Math.PI + 4.2)))
        const idx = (y * pw + x) * 4
        img.data[idx] = cr; img.data[idx+1] = cg; img.data[idx+2] = cb2; img.data[idx+3] = 255
      }
    }

    const tmp = document.createElement('canvas')
    tmp.width = pw; tmp.height = ph
    tmp.getContext('2d')!.putImageData(img, 0, 0)
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(tmp, 0, 0, w, h)
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── 3D Grid ──────────────────────────────────────────────────────────────────
function runGrid3d(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function project(x: number, y: number, z: number): [number, number, number] {
    const fov = h * 0.8
    const pz = z + fov
    const px = (x / pz) * fov + w / 2
    const py = (y / pz) * fov + h / 2
    return [px, py, pz]
  }

  function draw() {
    const spd = 0.4 + (opts.speed - 1) * 0.8
    t = (t + spd) % 100
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(0, 0, w, h)

    const gridSize = 200, cols = 10, depth = 600
    const offset = t % gridSize

    // horizontal lines
    for (let row = -2; row <= 6; row++) {
      const y3d = (row - 2) * gridSize
      const z0 = -offset, z1 = -offset + depth
      const [x0, y0] = project(-cols * gridSize / 2, y3d, z0)
      const [x1, y1] = project(cols * gridSize / 2, y3d, z0)
      const [x2, y2] = project(cols * gridSize / 2, y3d, z1)
      const [x3, y3] = project(-cols * gridSize / 2, y3d, z1)
      const alpha = 0.15 + 0.5 * (1 - (row + 2) / 8)
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1)
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`; ctx.lineWidth = 1; ctx.stroke()
      void [x2, y2, x3, y3]
    }

    // vertical lines
    for (let col = -cols / 2; col <= cols / 2; col++) {
      const x3d = col * gridSize
      const z0 = -offset, z1 = -offset + depth
      const [x0, y0] = project(x3d, -gridSize * 2, z0)
      const [x1, y1] = project(x3d, gridSize * 4, z0)
      const [x2, y2] = project(x3d, -gridSize * 2, z1)
      const [x3, y3] = project(x3d, gridSize * 4, z1)
      void [x0, y0, x1, y1]
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x3, y3)
      ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`; ctx.lineWidth = 1; ctx.stroke()
    }

    // horizon glow
    const grd = ctx.createLinearGradient(0, h * 0.4, 0, h * 0.6)
    grd.addColorStop(0, 'rgba(0,0,0,0)')
    grd.addColorStop(0.5, `rgba(${r},${g},${b},0.08)`)
    grd.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h)
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Aurora 2 (Northern Lights) ───────────────────────────────────────────────
function runAurora2(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function draw() {
    const spd = 0.003 + (opts.speed - 1) * 0.003
    t += spd
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    ctx.fillRect(0, 0, w, h)

    const bandCount = 5
    for (let band = 0; band < bandCount; band++) {
      const yBase = h * (0.1 + band * 0.12 + 0.05 * Math.sin(t * 0.7 + band * 2.1))
      const bandH = h * (0.06 + 0.04 * Math.sin(t + band))
      const phase = band * 1.2

      const grad = ctx.createLinearGradient(0, yBase, 0, yBase + bandH * 4)
      const hue = (180 + band * 30 + t * 20) % 360
      const cr = band % 2 === 0 ? r : Math.min(r + 60, 255)
      const cg = band % 2 === 0 ? Math.min(g + 100, 255) : g
      const cb2 = band % 2 === 0 ? b : Math.min(b + 80, 255)
      void hue
      grad.addColorStop(0, `rgba(${cr},${cg},${cb2},0)`)
      grad.addColorStop(0.15, `rgba(${cr},${cg},${cb2},0.5)`)
      grad.addColorStop(0.5, `rgba(${cr},${cg},${cb2},0.15)`)
      grad.addColorStop(1, `rgba(${cr},${cg},${cb2},0)`)

      ctx.beginPath()
      ctx.moveTo(0, yBase)
      const segs = 60
      for (let i = 0; i <= segs; i++) {
        const x = (i / segs) * w
        const y = yBase + bandH * Math.sin(i * 0.15 + t * 1.5 + phase) * Math.sin(i * 0.07 + t * 0.8)
        ctx.lineTo(x, y)
      }
      ctx.lineTo(w, yBase + bandH * 5)
      ctx.lineTo(0, yBase + bandH * 5)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()
    }

    // stars
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    for (let i = 0; i < 80; i++) {
      const sx = (Math.sin(i * 137.5) * 0.5 + 0.5) * w
      const sy = (Math.cos(i * 97.3) * 0.5 + 0.5) * h * 0.45
      const sa = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 + i))
      ctx.globalAlpha = sa
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill()
    }
    ctx.globalAlpha = 1
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Glitch ───────────────────────────────────────────────────────────────────
function runGlitch(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
  const [r, g, b] = hexToRgb(opts.color)
  let glitchTimer = 0

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function draw() {
    const spd = 0.5 + (opts.speed - 1) * 0.6
    t += spd
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(0, 0, w, h)

    // base scanlines
    for (let y = 0; y < h; y += 4) {
      const alpha = 0.02 + 0.01 * Math.sin(t * 0.3 + y * 0.05)
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.fillRect(0, y, w, 2)
    }

    // glitch trigger
    if (Math.random() < 0.03 * spd) glitchTimer = 5 + Math.random() * 10

    if (glitchTimer > 0) {
      glitchTimer -= spd
      const slices = 5 + Math.floor(Math.random() * 10)
      for (let s = 0; s < slices; s++) {
        const sy = Math.random() * h
        const sh = Math.random() * h * 0.1
        const shift = (Math.random() - 0.5) * w * 0.08

        // RGB shift
        const imgData = ctx.getImageData(0, sy, w, sh)
        ctx.putImageData(imgData, shift, sy)

        // color bars
        if (Math.random() < 0.4) {
          ctx.fillStyle = `rgba(${r},0,0,0.15)`
          ctx.fillRect(shift - 3, sy, w, sh)
          ctx.fillStyle = `rgba(0,${g},0,0.15)`
          ctx.fillRect(shift + 3, sy, w, sh)
          ctx.fillStyle = `rgba(0,0,${b},0.15)`
          ctx.fillRect(shift, sy, w, sh)
        }
      }
    }

    // digital noise blocks
    const blocks = 3 + Math.floor(Math.random() * 4)
    for (let i = 0; i < blocks; i++) {
      const bx = Math.random() * w, by = Math.random() * h
      const bw = 20 + Math.random() * 100, bh = 2 + Math.random() * 8
      const alpha = 0.03 + Math.random() * 0.06
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.fillRect(bx, by, bw, bh)
    }

    // horizontal lines flicker
    if (Math.random() < 0.1) {
      const fy = Math.random() * h
      ctx.fillStyle = `rgba(${Math.min(r+100,255)},${Math.min(g+100,255)},255,0.5)`
      ctx.fillRect(0, fy, w, 1)
    }
    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Moon Bagua Clock ─────────────────────────────────────────────────────────
function runMoonBagua(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0

  // 后天八卦 (Post-Heaven Bagua), clockwise from North
  const BAGUA = [
    { sym: '☵', name: '坎', angle: 0 },
    { sym: '☶', name: '艮', angle: Math.PI / 4 },
    { sym: '☳', name: '震', angle: Math.PI / 2 },
    { sym: '☴', name: '巽', angle: 3 * Math.PI / 4 },
    { sym: '☲', name: '离', angle: Math.PI },
    { sym: '☷', name: '坤', angle: 5 * Math.PI / 4 },
    { sym: '☱', name: '兑', angle: 3 * Math.PI / 2 },
    { sym: '☰', name: '乾', angle: 7 * Math.PI / 4 },
  ]

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function drawHand(cx: number, cy: number, angle: number, length: number, width: number, color: string, glowColor?: string) {
    if (glowColor) { ctx.save(); ctx.shadowColor = glowColor; ctx.shadowBlur = 8 }
    ctx.beginPath()
    ctx.moveTo(cx - Math.cos(angle) * length * 0.15, cy - Math.sin(angle) * length * 0.15)
    ctx.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length)
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke()
    if (glowColor) ctx.restore()
  }

  function draw() {
    const now = new Date()
    const hours = now.getHours()
    const minutes = now.getMinutes()
    const seconds = now.getSeconds()
    const ms = now.getMilliseconds()

    const cx = w / 2, cy = h / 2
    const size = Math.min(w, h)
    const outerR = size * 0.43   // outermost decorative ring
    const innerR = size * 0.33   // inner ring / bagua track
    const baguaR = size * 0.285  // trigram symbol radius
    const clockR = size * 0.19   // clock face radius

    const [r, g, b] = hexToRgb(opts.color)

    // Background
    ctx.fillStyle = 'rgba(0,0,0,1)'
    ctx.fillRect(0, 0, w, h)

    // Ambient glow behind the whole diagram
    const ambient = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR * 1.1)
    ambient.addColorStop(0, `rgba(${r},${g},${b},0.07)`)
    ambient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = ambient
    ctx.beginPath(); ctx.arc(cx, cy, outerR * 1.1, 0, Math.PI * 2); ctx.fill()

    // Outer ring (solid)
    ctx.beginPath(); ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${r},${g},${b},0.35)`; ctx.lineWidth = 1.5; ctx.stroke()

    // Spokes from outer ring to inner ring at each trigram position
    for (let i = 0; i < 8; i++) {
      const a = BAGUA[i].angle - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR)
      ctx.lineTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR)
      ctx.strokeStyle = `rgba(${r},${g},${b},0.18)`; ctx.lineWidth = 1; ctx.stroke()
    }

    // Inner dashed ring
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`; ctx.lineWidth = 1
    ctx.setLineDash([4, 6]); ctx.stroke(); ctx.setLineDash([])
    ctx.restore()

    // Active trigram: each of the 8 three-hour periods (子丑寅卯...)
    const hourSegment = Math.floor((hours % 24) / 3)

    // 8 trigrams
    const bFontSize = size * 0.05
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'

    for (let i = 0; i < BAGUA.length; i++) {
      const bg = BAGUA[i]
      const angle = bg.angle - Math.PI / 2
      const bx = cx + Math.cos(angle) * baguaR
      const by = cy + Math.sin(angle) * baguaR
      const isActive = i === hourSegment

      // Active sector highlight arc
      if (isActive) {
        const spanHalf = Math.PI / 8
        const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR)
        grad.addColorStop(0, `rgba(${r},${g},${b},0.0)`)
        grad.addColorStop(0.4, `rgba(${r},${g},${b},0.12)`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0.0)`)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, outerR, angle - spanHalf, angle + spanHalf)
        ctx.closePath()
        ctx.fillStyle = grad; ctx.fill()
      }

      ctx.save()
      if (isActive) { ctx.shadowColor = `rgba(${r},${g},${b},1)`; ctx.shadowBlur = 20 }

      // Trigram glyph
      const symAlpha = isActive ? 1.0 : 0.45
      ctx.fillStyle = `rgba(${Math.min(r + 90, 255)},${Math.min(g + 110, 255)},${Math.min(b + 170, 255)},${symAlpha})`
      ctx.font = `${bFontSize}px serif`
      ctx.fillText(bg.sym, bx, by - bFontSize * 0.18)

      // Chinese name
      ctx.fillStyle = `rgba(${Math.min(r + 60, 255)},${Math.min(g + 80, 255)},${Math.min(b + 130, 255)},${symAlpha * 0.8})`
      ctx.font = `${bFontSize * 0.42}px serif`
      ctx.fillText(bg.name, bx, by + bFontSize * 0.55)

      ctx.restore()

      // Outer ring tick
      ctx.beginPath()
      ctx.arc(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR, isActive ? 4 : 2, 0, Math.PI * 2)
      ctx.fillStyle = isActive ? `rgba(${r},${g},${b},1)` : `rgba(${r},${g},${b},0.35)`
      ctx.fill()
    }

    // Clock face
    const faceGrad = ctx.createRadialGradient(cx, cy - clockR * 0.2, 0, cx, cy, clockR)
    faceGrad.addColorStop(0, 'rgba(10,10,30,0.97)')
    faceGrad.addColorStop(1, 'rgba(3,3,15,0.92)')
    ctx.beginPath(); ctx.arc(cx, cy, clockR, 0, Math.PI * 2)
    ctx.fillStyle = faceGrad; ctx.fill()
    ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`; ctx.lineWidth = 1.5; ctx.stroke()

    // Tick marks
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2
      const isBig = i % 15 === 0, isHour = i % 5 === 0
      const inner = clockR * (isBig ? 0.76 : isHour ? 0.83 : 0.9)
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
      ctx.lineTo(cx + Math.cos(a) * clockR * 0.95, cy + Math.sin(a) * clockR * 0.95)
      ctx.strokeStyle = `rgba(${r},${g},${b},${isBig ? 0.85 : isHour ? 0.5 : 0.2})`
      ctx.lineWidth = isBig ? 2 : isHour ? 1.5 : 0.8; ctx.stroke()
    }

    // Hands
    const secAngle  = ((seconds + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2
    const minAngle  = ((minutes + (seconds + ms / 1000) / 60) / 60) * Math.PI * 2 - Math.PI / 2
    const hourAngle = (((hours % 12) + minutes / 60) / 12) * Math.PI * 2 - Math.PI / 2

    drawHand(cx, cy, hourAngle, clockR * 0.54, 3.5,
      `rgba(${Math.min(r + 80, 255)},${Math.min(g + 80, 255)},${Math.min(b + 140, 255)},0.95)`)
    drawHand(cx, cy, minAngle, clockR * 0.76, 2,
      `rgba(${Math.min(r + 130, 255)},${Math.min(g + 140, 255)},${Math.min(b + 200, 255)},0.92)`)
    drawHand(cx, cy, secAngle, clockR * 0.88, 1,
      `rgba(${r},${g},${b},0.95)`, `rgba(${r},${g},${b},0.8)`)

    // Center cap
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r},${g},${b},0.9)`; ctx.fill()
    ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill()

    // Digital time
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    ctx.font = `${size * 0.024}px monospace`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = `rgba(${Math.min(r + 80, 255)},${Math.min(g + 100, 255)},${Math.min(b + 160, 255)},0.6)`
    ctx.fillText(timeStr, cx, cy + clockR * 0.62)

    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Compass Clock ────────────────────────────────────────────────────────────
function runCompassClock(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function drawRing(cx: number, cy: number, radius: number, numTicks: number, rotation: number,
    labels: string[], r: number, g: number, b: number, alpha: number, ringW: number) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotation)

    // Ring border
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.4})`
    ctx.lineWidth = ringW; ctx.stroke()

    // Ticks
    for (let i = 0; i < numTicks; i++) {
      const a = (i / numTicks) * Math.PI * 2 - Math.PI / 2
      const isMajor = numTicks <= 12 || i % (numTicks / 12) === 0
      const isQuarter = numTicks <= 4 || i % (numTicks / 4) === 0
      const len = isQuarter ? radius * 0.12 : isMajor ? radius * 0.07 : radius * 0.035
      const lw = isQuarter ? 2.5 : isMajor ? 1.5 : 0.8
      const a2 = isQuarter ? alpha * 0.9 : isMajor ? alpha * 0.6 : alpha * 0.25
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * (radius - len), Math.sin(a) * (radius - len))
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius)
      ctx.strokeStyle = `rgba(${r},${g},${b},${a2})`
      ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke()
    }

    // Labels (cardinal / hour numbers)
    if (labels.length > 0) {
      const fs = radius * 0.16
      ctx.font = `bold ${fs}px sans-serif`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      for (let i = 0; i < labels.length; i++) {
        const a = (i / labels.length) * Math.PI * 2 - Math.PI / 2
        const lx = Math.cos(a) * (radius - radius * 0.22)
        const ly = Math.sin(a) * (radius - radius * 0.22)
        ctx.save()
        ctx.translate(lx, ly)
        ctx.rotate(-rotation) // keep text upright
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.85})`
        ctx.fillText(labels[i], 0, 0)
        ctx.restore()
      }
    }
    ctx.restore()
  }

  function draw() {
    const now = new Date()
    const hours = now.getHours(); const minutes = now.getMinutes()
    const seconds = now.getSeconds(); const ms = now.getMilliseconds()

    const cx = w / 2, cy = h / 2
    const size = Math.min(w, h)
    const [r, g, b] = hexToRgb(opts.color)

    // Background
    ctx.fillStyle = '#020208'
    ctx.fillRect(0, 0, w, h)

    // Ambient glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.55)
    glow.addColorStop(0, `rgba(${r},${g},${b},0.05)`)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, w, h)

    // Ring radii
    const R3 = size * 0.43  // seconds (outer)
    const R2 = size * 0.30  // minutes (middle)
    const R1 = size * 0.18  // hours (inner)

    // Rotation angles — negative so current value rises to top
    const secRot  = -((seconds + ms / 1000) / 60) * Math.PI * 2
    const minRot  = -((minutes + seconds / 60) / 60) * Math.PI * 2
    const hourRot = -(((hours % 12) + minutes / 60) / 12) * Math.PI * 2

    // Compass labels for outer ring (rotate with ring → appear stationary relative to seconds)
    const compassLabels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    const hourLabels = ['12','1','2','3','4','5','6','7','8','9','10','11']

    drawRing(cx, cy, R3, 60, secRot,  compassLabels, r, g, b, 0.85, 1.5)
    drawRing(cx, cy, R2, 60, minRot,  [], r, g, b, 0.7, 1.2)
    drawRing(cx, cy, R1, 12, hourRot, hourLabels, r, g, b, 0.6, 1.0)

    // Fixed triangle pointer at top (12 o'clock) for each ring
    for (const [rad, a2] of [[R3, 0.95],[R2, 0.8],[R1, 0.7]] as [number,number][]) {
      ctx.save()
      ctx.translate(cx, cy - rad)
      ctx.beginPath()
      ctx.moveTo(0, -8); ctx.lineTo(-5, 4); ctx.lineTo(5, 4); ctx.closePath()
      ctx.fillStyle = `rgba(${r},${g},${b},${a2})`
      ctx.shadowColor = `rgba(${r},${g},${b},0.8)`; ctx.shadowBlur = 8
      ctx.fill()
      ctx.restore()
    }

    // Center face
    const faceR = R1 * 0.72
    const faceGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, faceR)
    faceGrad.addColorStop(0, 'rgba(8,8,24,0.98)')
    faceGrad.addColorStop(1, 'rgba(2,2,12,0.95)')
    ctx.beginPath(); ctx.arc(cx, cy, faceR, 0, Math.PI * 2)
    ctx.fillStyle = faceGrad; ctx.fill()
    ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`; ctx.lineWidth = 1; ctx.stroke()

    // Digital time
    const hStr = String(hours).padStart(2,'0')
    const mStr = String(minutes).padStart(2,'0')
    const sStr = String(seconds).padStart(2,'0')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `bold ${faceR * 0.55}px monospace`
    ctx.fillStyle = `rgba(${r},${g},${b},0.95)`
    ctx.shadowColor = `rgba(${r},${g},${b},0.7)`; ctx.shadowBlur = 10
    ctx.fillText(`${hStr}:${mStr}`, cx, cy - faceR * 0.12)
    ctx.shadowBlur = 0
    ctx.font = `${faceR * 0.3}px monospace`
    ctx.fillStyle = `rgba(${r},${g},${b},0.55)`
    ctx.fillText(sStr, cx, cy + faceR * 0.42)

    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Binary Clock ─────────────────────────────────────────────────────────────
function runBinaryClock(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function draw() {
    const now = new Date()
    const parts = [now.getHours(), now.getMinutes(), now.getSeconds()]
    const [r, g, b] = hexToRgb(opts.color)
    const cx = w / 2, cy = h / 2

    ctx.fillStyle = '#000508'
    ctx.fillRect(0, 0, w, h)

    // Scanline overlay
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.07)'
      ctx.fillRect(0, y, w, 2)
    }

    const BITS = 6
    const ROWS = 3
    const dotR = Math.min(w / (BITS * 3.2), h / (ROWS * 3.5), 28)
    const colGap = dotR * 2.8
    const rowGap = dotR * 3.4
    const totalW = BITS * colGap - colGap * 0.2
    const totalH = ROWS * rowGap
    const startX = cx - totalW / 2 + colGap * 0.5
    const startY = cy - totalH / 2 + rowGap * 0.5

    const rowLabels = ['H', 'M', 'S']
    const bitLabels = ['32','16','8','4','2','1']

    // Bit column headers
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `${dotR * 0.55}px monospace`
    ctx.fillStyle = `rgba(${r},${g},${b},0.35)`
    for (let col = 0; col < BITS; col++) {
      ctx.fillText(bitLabels[col], startX + col * colGap, startY - rowGap * 0.85)
    }

    for (let row = 0; row < ROWS; row++) {
      const val = parts[row]
      const cy2 = startY + row * rowGap

      // Row label
      ctx.font = `bold ${dotR * 0.65}px monospace`
      ctx.fillStyle = `rgba(${r},${g},${b},0.5)`
      ctx.textAlign = 'right'
      ctx.fillText(rowLabels[row], startX - colGap * 0.65, cy2)

      // Decimal value
      ctx.textAlign = 'left'
      ctx.font = `${dotR * 0.5}px monospace`
      ctx.fillStyle = `rgba(${r},${g},${b},0.4)`
      ctx.fillText(String(val).padStart(2,'0'), startX + BITS * colGap - colGap * 0.3, cy2)

      for (let col = 0; col < BITS; col++) {
        const bitPos = BITS - 1 - col
        const on = (val >> bitPos) & 1
        const cx2 = startX + col * colGap

        if (on) {
          // Glow
          const grd = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, dotR * 1.8)
          grd.addColorStop(0, `rgba(${r},${g},${b},0.35)`)
          grd.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = grd
          ctx.beginPath(); ctx.arc(cx2, cy2, dotR * 1.8, 0, Math.PI * 2); ctx.fill()

          // Bright dot
          const dotGrd = ctx.createRadialGradient(cx2 - dotR * 0.25, cy2 - dotR * 0.25, 0, cx2, cy2, dotR)
          dotGrd.addColorStop(0, `rgba(255,255,255,0.95)`)
          dotGrd.addColorStop(0.3, `rgba(${Math.min(r+80,255)},${Math.min(g+80,255)},${Math.min(b+80,255)},0.9)`)
          dotGrd.addColorStop(1, `rgba(${r},${g},${b},0.8)`)
          ctx.fillStyle = dotGrd
          ctx.shadowColor = `rgba(${r},${g},${b},1)`; ctx.shadowBlur = dotR * 0.8
          ctx.beginPath(); ctx.arc(cx2, cy2, dotR, 0, Math.PI * 2); ctx.fill()
          ctx.shadowBlur = 0
        } else {
          // Dark dot with subtle ring
          ctx.beginPath(); ctx.arc(cx2, cy2, dotR, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},0.06)`; ctx.fill()
          ctx.strokeStyle = `rgba(${r},${g},${b},0.18)`; ctx.lineWidth = 1; ctx.stroke()
        }
      }
    }

    // Date line
    const dateStr = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    ctx.textAlign = 'center'; ctx.font = `${dotR * 0.48}px monospace`
    ctx.fillStyle = `rgba(${r},${g},${b},0.3)`
    ctx.fillText(dateStr, cx, startY + ROWS * rowGap + rowGap * 0.6)

    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Gear Clock ───────────────────────────────────────────────────────────────
function runGearClock(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function drawGear(cx: number, cy: number, outerR: number, innerR: number,
    teeth: number, rotation: number, r: number, g: number, b: number, alpha: number, lineW: number) {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotation)
    ctx.beginPath()
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2
      const a1 = ((i + 0.35) / teeth) * Math.PI * 2
      const a2 = ((i + 0.65) / teeth) * Math.PI * 2
      const a3 = ((i + 1) / teeth) * Math.PI * 2
      if (i === 0) ctx.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR)
      else ctx.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR)
      ctx.lineTo(Math.cos(a1) * outerR, Math.sin(a1) * outerR)
      ctx.lineTo(Math.cos(a2) * outerR, Math.sin(a2) * outerR)
      ctx.lineTo(Math.cos(a3) * innerR, Math.sin(a3) * innerR)
    }
    ctx.closePath()
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`
    ctx.lineWidth = lineW; ctx.stroke()

    // Hub spokes
    const spokeCount = Math.min(6, Math.floor(teeth / 5))
    for (let i = 0; i < spokeCount; i++) {
      const a = (i / spokeCount) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * innerR * 0.25, Math.sin(a) * innerR * 0.25)
      ctx.lineTo(Math.cos(a) * innerR * 0.72, Math.sin(a) * innerR * 0.72)
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.5})`
      ctx.lineWidth = lineW * 0.7; ctx.stroke()
    }
    // Hub circle
    ctx.beginPath(); ctx.arc(0, 0, innerR * 0.22, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.8})`
    ctx.lineWidth = lineW; ctx.stroke()

    ctx.restore()
  }

  function draw() {
    const now = new Date()
    const hours = now.getHours(); const minutes = now.getMinutes()
    const seconds = now.getSeconds(); const ms = now.getMilliseconds()
    const [r, g, b] = hexToRgb(opts.color)

    ctx.fillStyle = '#050305'
    ctx.fillRect(0, 0, w, h)

    const size = Math.min(w, h)
    const cx = w / 2, cy = h / 2

    // Ambient glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.6)
    glow.addColorStop(0, `rgba(${r},${g},${b},0.04)`)
    glow.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h)

    const secRot  = ((seconds + ms / 1000) / 60) * Math.PI * 2
    const minRot  = ((minutes + seconds / 60) / 60) * Math.PI * 2
    const hourRot = (((hours % 12) + minutes / 60) / 12) * Math.PI * 2

    // Gears: center=seconds (large), upper-left=minutes (medium), upper-right=hours (small)
    // Meshes: ratio based on teeth count
    const secR = size * 0.22; const secTeeth = 60
    const minR = size * 0.15; const minTeeth = 40  // mesh with sec gear
    const hrR  = size * 0.09; const hrTeeth  = 24

    // Position offsets for meshing
    const minOffset = secR + minR - size * 0.015
    const hrOffset  = minR + hrR  - size * 0.01

    const minCx = cx - minOffset * 0.7
    const minCy = cy - minOffset * 0.5
    const hrCx  = minCx - hrOffset * 0.65
    const hrCy  = minCy - hrOffset * 0.6

    // Rotation directions: outer gear counter-rotates
    const minMeshRot = -minRot * (secTeeth / minTeeth)
    const hrMeshRot  = -hourRot * (minTeeth / hrTeeth)

    // Shadow/glow behind gears
    ctx.save()
    ctx.shadowColor = `rgba(${r},${g},${b},0.25)`; ctx.shadowBlur = size * 0.06
    drawGear(cx,    cy,    secR, secR * 0.75, secTeeth, secRot,     r, g, b, 0.8, 1.5)
    drawGear(minCx, minCy, minR, minR * 0.72, minTeeth, minMeshRot, r, g, b, 0.7, 1.2)
    drawGear(hrCx,  hrCy,  hrR,  hrR * 0.68,  hrTeeth,  hrMeshRot,  r, g, b, 0.6, 1.0)
    ctx.restore()

    // Center digital time
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `bold ${size * 0.07}px monospace`
    ctx.fillStyle = `rgba(${r},${g},${b},0.85)`
    ctx.shadowColor = `rgba(${r},${g},${b},0.6)`; ctx.shadowBlur = 8
    const hStr = String(hours).padStart(2,'0')
    const mStr = String(minutes).padStart(2,'0')
    const sStr = String(seconds).padStart(2,'0')
    ctx.fillText(`${hStr}:${mStr}:${sStr}`, cx, cy + size * 0.34)
    ctx.shadowBlur = 0

    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Radar Clock ──────────────────────────────────────────────────────────────
function runRadarClock(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0
  const TRAIL_LEN = 80  // degrees of trail

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function draw() {
    const now = new Date()
    const hours = now.getHours(); const minutes = now.getMinutes()
    const seconds = now.getSeconds(); const ms = now.getMilliseconds()
    const [r, g, b] = hexToRgb(opts.color)

    ctx.fillStyle = 'rgba(0,4,2,0.88)'
    ctx.fillRect(0, 0, w, h)

    const cx = w / 2, cy = h / 2
    const size = Math.min(w, h)
    const rad = size * 0.42

    // Concentric rings
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, rad * i / 4, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${r},${g},${b},0.12)`
      ctx.lineWidth = 1; ctx.stroke()
    }

    // Cross hairs
    ctx.strokeStyle = `rgba(${r},${g},${b},0.1)`; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(cx - rad, cy); ctx.lineTo(cx + rad, cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, cy - rad); ctx.lineTo(cx, cy + rad); ctx.stroke()

    // Outer ring
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(${r},${g},${b},0.35)`; ctx.lineWidth = 2; ctx.stroke()

    // Hour tick marks (12)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2
      const inner = rad * 0.88
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
      ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
      ctx.strokeStyle = `rgba(${r},${g},${b},0.5)`; ctx.lineWidth = 2.5; ctx.stroke()
      // Hour number
      const lx = cx + Math.cos(a) * (rad * 0.78)
      const ly = cy + Math.sin(a) * (rad * 0.78)
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.font = `${rad * 0.09}px monospace`
      ctx.fillStyle = `rgba(${r},${g},${b},0.6)`
      ctx.fillText(String(i === 0 ? 12 : i), lx, ly)
    }

    // Minute tick marks (60)
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue  // skip hour positions
      const a = (i / 60) * Math.PI * 2 - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(cx + Math.cos(a) * rad * 0.94, cy + Math.sin(a) * rad * 0.94)
      ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad)
      ctx.strokeStyle = `rgba(${r},${g},${b},0.2)`; ctx.lineWidth = 1; ctx.stroke()
    }

    // Current sweep angle (seconds)
    const sweepAngle = ((seconds + ms / 1000) / 60) * Math.PI * 2 - Math.PI / 2

    // Radar sweep trail (filled pie sections fading)
    const STEPS = 60
    for (let i = 0; i < STEPS; i++) {
      const t = i / STEPS  // 0=oldest 1=newest
      const trailAngle = sweepAngle - (1 - t) * (TRAIL_LEN * Math.PI / 180)
      const nextAngle  = sweepAngle - (1 - (i + 1) / STEPS) * (TRAIL_LEN * Math.PI / 180)
      const fade = t * t * 0.18
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, rad, trailAngle, nextAngle)
      ctx.closePath()
      ctx.fillStyle = `rgba(${r},${g},${b},${fade})`
      ctx.fill()
    }

    // Sweep line
    ctx.save()
    ctx.shadowColor = `rgba(${r},${g},${b},0.9)`; ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(sweepAngle) * rad, cy + Math.sin(sweepAngle) * rad)
    ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`; ctx.lineWidth = 2; ctx.stroke()
    ctx.restore()

    // Blip at current minute position
    const minAngle = ((minutes + seconds / 60) / 60) * Math.PI * 2 - Math.PI / 2
    const blipR = rad * 0.9
    ctx.beginPath()
    ctx.arc(cx + Math.cos(minAngle) * blipR, cy + Math.sin(minAngle) * blipR, 5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r},${g},${b},0.9)`
    ctx.shadowColor = `rgba(${r},${g},${b},1)`; ctx.shadowBlur = 12
    ctx.fill(); ctx.shadowBlur = 0

    // Blip at current hour position
    const hourAngle = (((hours % 12) + minutes / 60) / 12) * Math.PI * 2 - Math.PI / 2
    const hrBlipR = rad * 0.55
    ctx.beginPath()
    ctx.arc(cx + Math.cos(hourAngle) * hrBlipR, cy + Math.sin(hourAngle) * hrBlipR, 7, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${Math.min(r+80,255)},${Math.min(g+80,255)},${Math.min(b+80,255)},0.9)`
    ctx.shadowColor = `rgba(${r},${g},${b},1)`; ctx.shadowBlur = 16
    ctx.fill(); ctx.shadowBlur = 0

    // Center dot
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${r},${g},${b},0.8)`; ctx.fill()

    // Digital display
    const hStr = String(hours).padStart(2,'0')
    const mStr = String(minutes).padStart(2,'0')
    const sStr = String(seconds).padStart(2,'0')
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.font = `bold ${rad * 0.18}px monospace`
    ctx.fillStyle = `rgba(${r},${g},${b},0.85)`
    ctx.shadowColor = `rgba(${r},${g},${b},0.5)`; ctx.shadowBlur = 8
    ctx.fillText(`${hStr}:${mStr}:${sStr}`, cx, cy)
    ctx.shadowBlur = 0

    raf = requestAnimationFrame(draw)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize(); draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export type EffectName = 'stars' | 'particles' | 'aurora' | 'waves' | 'rain' | 'snow'
  | 'matrix' | 'fireworks' | 'nebula' | 'lightning' | 'dna' | 'galaxy'
  | 'lavalamp' | 'geometricflow' | 'neon' | 'fire' | 'ocean' | 'sakura'
  | 'bokeh' | 'constellation' | 'portal' | 'bubbles' | 'plasma' | 'grid3d'
  | 'aurora2' | 'glitch' | 'moonbagua'
  | 'compassclock' | 'binaryclock' | 'gearclock' | 'radarclock'

const RUNNERS: Record<EffectName, (canvas: HTMLCanvasElement, opts: EffectOptions) => () => void> = {
  stars:         runStars,
  particles:     runParticles,
  aurora:        runAurora,
  waves:         runWaves,
  rain:          runRain,
  snow:          runSnow,
  matrix:        runMatrix,
  fireworks:     runFireworks,
  nebula:        runNebula,
  lightning:     runLightning,
  dna:           runDna,
  galaxy:        runGalaxy,
  lavalamp:      runLavalamp,
  geometricflow: runGeometricflow,
  neon:          runNeon,
  fire:          runFire,
  ocean:         runOcean,
  sakura:        runSakura,
  bokeh:         runBokeh,
  constellation: runConstellation,
  portal:        runPortal,
  bubbles:       runBubbles,
  plasma:        runPlasma,
  grid3d:        runGrid3d,
  aurora2:       runAurora2,
  glitch:        runGlitch,
  moonbagua:     runMoonBagua,
  compassclock:  runCompassClock,
  binaryclock:   runBinaryClock,
  gearclock:     runGearClock,
  radarclock:    runRadarClock,
}

export function startEffect(canvas: HTMLCanvasElement, effect: EffectName, opts: EffectOptions): () => void {
  const runner = RUNNERS[effect]
  if (!runner) return () => {}
  return runner(canvas, opts)
}
