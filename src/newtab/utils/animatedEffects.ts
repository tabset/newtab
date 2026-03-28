/** Canvas 2D 动态特效实现，每个效果返回 stop 函数 */

export interface EffectOptions {
  color: string   // hex e.g. "#667eea"  — 特效粒子主色
  bgColor: string // hex e.g. "#000000"  — 特效背景色
  speed: number   // 1–5
  lang: string    // app locale e.g. "zh-CN" — for locale-aware effects
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '')
  const n = parseInt(c.length === 3 ? c.split('').map(x => x + x).join('') : c, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** 返回背景填充色，alpha 控制拖尾残影深度 */
function bgRgba(opts: EffectOptions, alpha: number): string {
  const [r, g, b] = hexToRgb(opts.bgColor)
  return `rgba(${r},${g},${b},${alpha})`
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

    ctx.fillStyle = bgRgba(opts, 0.25)
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

    ctx.fillStyle = bgRgba(opts, 0.2)
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

    ctx.fillStyle = bgRgba(opts, 0.18)
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

    // Background — 基于 bgColor 做深色渐变
    const [br, bgg, bb] = hexToRgb(opts.bgColor)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
    bgGrad.addColorStop(0, `rgba(${Math.round(br*0.6)},${Math.round(bgg*0.6)},${Math.round(bb*0.6)},1)`)
    bgGrad.addColorStop(1, `rgba(${Math.round(br*0.9)},${Math.round(bgg*0.9)},${Math.round(bb*0.9)},1)`)
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

    ctx.fillStyle = bgRgba(opts, 0.3)
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

    ctx.fillStyle = bgRgba(opts, 0.25)
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

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
    const count = Math.floor(w / (fontSize * dpr))
    cols.length = 0
    for (let i = 0; i < count; i++) cols.push(Math.random() * -50)
  }

  function draw() {
    const [r, g, b] = hexToRgb(opts.color)

    const speed = 0.2 + (opts.speed - 1) * 0.45
    const dpr = window.devicePixelRatio || 1
    const fs = fontSize * dpr
    ctx.fillStyle = bgRgba(opts, 0.05)
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
  interface Particle {
    x: number; y: number; vx: number; vy: number
    alpha: number; color: string; size: number
    gravity: number; decay: number; trail: [number, number][]
  }
  interface Rocket { x: number; y: number; vy: number; color: string; trail: [number, number][] }
  const particles: Particle[] = []
  const rockets: Rocket[] = []
  let tick = 0

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function hsl(hue: number) { return `hsl(${hue},100%,65%)` }

  function explode(x: number, y: number, color: string) {
    const dpr = window.devicePixelRatio || 1
    const count = 45 + Math.floor(Math.random() * 25)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.2
      const speed = (1.2 + Math.random() * 2.5) * dpr
      particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        alpha: 1, color, size: (1.2 + Math.random() * 1.8),
        gravity: (0.04 + Math.random() * 0.04) * dpr,
        decay: 0.012 + Math.random() * 0.010, trail: []
      })
    }
    const sparkCount = 10 + Math.floor(Math.random() * 8)
    for (let i = 0; i < sparkCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = (3 + Math.random() * 3) * dpr
      particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        alpha: 0.9, color: '#ffffff', size: 0.8 + Math.random() * 0.8,
        gravity: (0.06 + Math.random() * 0.04) * dpr,
        decay: 0.030 + Math.random() * 0.020, trail: []
      })
    }
  }

  function draw() {
    const [r, g, b] = hexToRgb(opts.color)
    const spd = 0.5 + (opts.speed - 1) * 0.5
    tick++
    const dpr = window.devicePixelRatio || 1
    ctx.fillStyle = bgRgba(opts, 0.22)
    ctx.fillRect(0, 0, w, h)

    const interval = Math.round(90 / spd)
    if (tick % interval === 0 && rockets.length < 4) {
      const color = Math.random() < 0.3 ? `rgb(${r},${g},${b})` : hsl(Math.random() * 360)
      rockets.push({ x: w * (0.15 + Math.random() * 0.7), y: h, vy: -(9 + Math.random() * 5) * dpr, color, trail: [] })
    }

    for (let i = rockets.length - 1; i >= 0; i--) {
      const rk = rockets[i]
      rk.trail.push([rk.x, rk.y])
      if (rk.trail.length > 12) rk.trail.shift()
      rk.y += rk.vy * spd
      rk.vy += 0.12 * dpr * spd
      for (let t = 0; t < rk.trail.length; t++) {
        ctx.globalAlpha = (t / rk.trail.length) * 0.6
        ctx.beginPath()
        ctx.arc(rk.trail[t][0], rk.trail[t][1], (2 - t / rk.trail.length) * dpr, 0, Math.PI * 2)
        ctx.fillStyle = rk.color; ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.beginPath(); ctx.arc(rk.x, rk.y, 2.5 * dpr, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'; ctx.fill()
      if (rk.y < h * (0.12 + Math.random() * 0.38) || rk.vy >= 0) {
        explode(rk.x, rk.y, rk.color); rockets.splice(i, 1)
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.trail.push([p.x, p.y])
      if (p.trail.length > 4) p.trail.shift()
      p.x += p.vx * spd; p.y += p.vy * spd
      p.vy += p.gravity * spd; p.vx *= 0.98
      p.alpha -= p.decay * spd
      if (p.alpha <= 0) { particles.splice(i, 1); continue }
      for (let t = 0; t < p.trail.length; t++) {
        ctx.globalAlpha = p.alpha * (t / p.trail.length) * 0.4
        ctx.beginPath(); ctx.arc(p.trail[t][0], p.trail[t][1], p.size * dpr * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = p.color; ctx.fill()
      }
      ctx.globalAlpha = p.alpha
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * dpr, 0, Math.PI * 2)
      ctx.fillStyle = p.color; ctx.fill()
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
  const stars: { x: number; y: number; s: number; a: number }[] = []

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
    stars.length = 0
    for (let i = 0; i < 200; i++) stars.push({ x: Math.random() * w, y: Math.random() * h, s: Math.random() * 2 * dpr, a: Math.random() })
  }

  function draw() {
    const [r, g, b] = hexToRgb(opts.color)

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
    const [r, g, b] = hexToRgb(opts.color)

    const spd = 0.5 + (opts.speed - 1) * 0.5
    tick++
    ctx.fillStyle = bgRgba(opts, 0.25)
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

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function draw() {
    const [r, g, b] = hexToRgb(opts.color)

    const spd = 0.01 + (opts.speed - 1) * 0.01
    t += spd
    ctx.fillStyle = bgRgba(opts, 0.15)
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
    const [r, g, b] = hexToRgb(opts.color)

    const spd = 0.0003 + (opts.speed - 1) * 0.0002
    t += spd
    ctx.fillStyle = bgRgba(opts, 0.3)
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

// ─── Geometric Flow ───────────────────────────────────────────────────────────
function runGeometricflow(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0
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
    const [r, g, b] = hexToRgb(opts.color)

    const spd = 0.2 + (opts.speed - 1) * 0.4
    t += 0.005 * spd
    ctx.fillStyle = bgRgba(opts, 0.12)
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

  function resize() {
    const dpr = window.devicePixelRatio || 1
    w = canvas.width = canvas.offsetWidth * dpr
    h = canvas.height = canvas.offsetHeight * dpr
  }

  function draw() {
    const [r, g, b] = hexToRgb(opts.color)

    const spd = 0.005 + (opts.speed - 1) * 0.008
    t += spd
    ctx.fillStyle = bgRgba(opts, 0.2)
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

// ─── Ocean ────────────────────────────────────────────────────────────────────
function runOcean(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0, t = 0

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
    const [r, g, b] = hexToRgb(opts.color)

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
    const [r, g, b] = hexToRgb(opts.color)
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
    const [r, g, b] = hexToRgb(opts.color)

    const dpr = window.devicePixelRatio || 1
    const colors: [number,number,number][] = [[r,g,b],[Math.min(r+60,255),Math.min(g+20,255),Math.min(b+100,255)],[Math.min(r+100,255),Math.min(g+100,255),Math.min(b+50,255)]]
    circles.push({ x: Math.random() * w, y: initial ? Math.random() * h : h + 50, vy: -(0.3 + Math.random() * 0.8), size: (20 + Math.random() * 80) * dpr, alpha: 0.05 + Math.random() * 0.2, color: colors[Math.floor(Math.random() * 3)] })
  }

  function draw() {
    const spd = 0.3 + (opts.speed - 1) * 0.3
    ctx.fillStyle = bgRgba(opts, 0.08)
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
    const [r, g, b] = hexToRgb(opts.color)

    const spd = 0.2 + (opts.speed - 1) * 0.3
    t += 0.01 * spd
    ctx.fillStyle = bgRgba(opts, 0.2)
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
function runBubbles(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let w = 0, h = 0, raf = 0
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
    const [r, g, b] = hexToRgb(opts.color)

    const spd = 0.4 + (opts.speed - 1) * 0.4
    ctx.fillStyle = bgRgba(opts, 0.1)
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

// ─── Compass Clock ────────────────────────────────────────────────────────────
function runCompassClock(canvas: HTMLCanvasElement, opts: EffectOptions): () => void {
  const ctx = canvas.getContext('2d')!
  let cw = 0, ch = 0, raf = 0

  const CHN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  function yearZh(y: number) { return String(y).split('').map(d => CHN[+d]).join('') }
  function numZh(n: number): string {
    if (n === 0) return CHN[0]
    if (n < 10) return CHN[n]
    if (n < 20) return '十' + (n % 10 ? CHN[n % 10] : '')
    return CHN[Math.floor(n / 10)] + '十' + (n % 10 ? CHN[n % 10] : '')
  }
  function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate() }

  // Current item at RIGHT (3 o'clock = angle 0)
  function tgtAngle(val: number, total: number) {
    return -val * (2 * Math.PI / total)
  }

  // ── Locale-aware labels ──────────────────────────────────────────────────
  const EN_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const RU_MON = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']

  function getLangFlags(l: string) {
    const lc = l.toLowerCase()
    return { isZh: lc.startsWith('zh'), isJa: lc.startsWith('ja'), isKo: lc.startsWith('ko'), isRu: lc.startsWith('ru') }
  }

  function makeLabels(dim: number, l: string) {
    const { isZh, isJa, isKo, isRu } = getLangFlags(l)
    const pad = (n: number) => String(n).padStart(2, '0')
    if (isZh) return {
      months:  Array.from({ length: 12  }, (_, i) => numZh(i+1) + '月'),
      days:    Array.from({ length: dim }, (_, i) => numZh(i+1) + '号'),
      ampm:    ['上午', '下午'],
      hours:   Array.from({ length: 12  }, (_, i) => numZh(i+1) + '时'),
      minutes: Array.from({ length: 60  }, (_, i) => numZh(i) + '分'),
      seconds: Array.from({ length: 60  }, (_, i) => numZh(i) + '秒'),
    }
    if (isJa) return {
      months:  Array.from({ length: 12  }, (_, i) => (i+1) + '月'),
      days:    Array.from({ length: dim }, (_, i) => (i+1) + '日'),
      ampm:    ['午前', '午後'],
      hours:   Array.from({ length: 12  }, (_, i) => (i+1) + '時'),
      minutes: Array.from({ length: 60  }, (_, i) => i + '分'),
      seconds: Array.from({ length: 60  }, (_, i) => i + '秒'),
    }
    if (isKo) return {
      months:  Array.from({ length: 12  }, (_, i) => (i+1) + '월'),
      days:    Array.from({ length: dim }, (_, i) => (i+1) + '일'),
      ampm:    ['오전', '오후'],
      hours:   Array.from({ length: 12  }, (_, i) => (i+1) + '시'),
      minutes: Array.from({ length: 60  }, (_, i) => pad(i) + '분'),
      seconds: Array.from({ length: 60  }, (_, i) => pad(i) + '초'),
    }
    return {
      months:  isRu ? RU_MON : EN_MON,
      days:    Array.from({ length: dim }, (_, i) => String(i+1)),
      ampm:    ['AM', 'PM'],
      hours:   Array.from({ length: 12  }, (_, i) => String(i+1)),
      minutes: Array.from({ length: 60  }, (_, i) => pad(i)),
      seconds: Array.from({ length: 60  }, (_, i) => pad(i)),
    }
  }

  function yearLabel(y: number, l: string) {
    const { isZh, isJa, isKo } = getLangFlags(l)
    if (isZh) return yearZh(y) + '年'
    if (isJa) return y + '年'
    if (isKo) return y + '년'
    return String(y)
  }

  interface Ring { labels: string[]; val: number; angle: number; tgt: number; r: number; fs: number }
  let rings: Ring[] = []
  let yearStr = ''
  let lastSec = -1
  let lastLang = ''

  function buildRings(now: Date) {
    const s = now.getSeconds(), mi = now.getMinutes(), hh = now.getHours()
    const h12 = hh % 12 || 12, isAM = hh < 12
    const d = now.getDate(), M = now.getMonth() + 1, y = now.getFullYear()
    const dim = daysInMonth(y, M)
    const l = opts.lang || 'zh-CN'
    lastLang = l
    yearStr = yearLabel(y, l)
    const L = makeLabels(dim, l)
    const ta = (v: number, n: number) => tgtAngle(v, n)
    rings = [
      { labels: L.months,  val: M-1,       angle: ta(M-1,12),      tgt: ta(M-1,12),      r:0, fs:0 },
      { labels: L.days,    val: d-1,        angle: ta(d-1,dim),     tgt: ta(d-1,dim),     r:0, fs:0 },
      { labels: L.ampm,    val: isAM?0:1,   angle: ta(isAM?0:1,2),  tgt: ta(isAM?0:1,2),  r:0, fs:0 },
      { labels: L.hours,   val: h12-1,      angle: ta(h12-1,12),    tgt: ta(h12-1,12),    r:0, fs:0 },
      { labels: L.minutes, val: mi,         angle: ta(mi,60),       tgt: ta(mi,60),       r:0, fs:0 },
      { labels: L.seconds, val: s,          angle: ta(s,60),        tgt: ta(s,60),        r:0, fs:0 },
    ]
  }

  function tick(now: Date) {
    const l = opts.lang || 'zh-CN'
    // Rebuild all labels when language changes
    if (l !== lastLang) { buildRings(now); setSizes(); return }

    const s = now.getSeconds()
    if (s === lastSec) return
    lastSec = s
    const mi = now.getMinutes(), hh = now.getHours()
    const h12 = hh % 12 || 12, isAM = hh < 12
    const d = now.getDate(), M = now.getMonth() + 1, y = now.getFullYear()
    const dim = daysInMonth(y, M)
    yearStr = yearLabel(y, l)
    const nv = [M-1, d-1, isAM?0:1, h12-1, mi, s]
    const tot = [12, dim, 2, 12, 60, 60]
    const mChg = nv[0] !== rings[0].val
    for (let i = 0; i < 6; i++) {
      if (i === 1 && mChg) rings[1].labels = makeLabels(dim, l).days
      if (rings[i].val !== nv[i]) {
        rings[i].val = nv[i]
        const nt = tgtAngle(nv[i], tot[i])
        let delta = nt - rings[i].tgt
        while (delta > Math.PI) delta -= 2 * Math.PI
        while (delta < -Math.PI) delta += 2 * Math.PI
        rings[i].tgt += delta
      }
    }
  }

  function setSizes() {
    const s = Math.min(cw, ch)
    const rs = [0.09, 0.16, 0.23, 0.30, 0.38, 0.46]
    // font sizes in px at s=800; scale with canvas
    const basePx = [20, 17, 16, 15, 14, 14]
    const scale = s / 800
    for (let i = 0; i < rings.length; i++) {
      rings[i].r = rs[i] * s
      rings[i].fs = Math.max(10, Math.min(basePx[i] * scale, 22))
    }
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    cw = canvas.offsetWidth; ch = canvas.offsetHeight
    setSizes()
  }

  buildRings(new Date())
  const ro = new ResizeObserver(resize)
  ro.observe(canvas); resize()

  const FONT = '"PingFang SC","Microsoft YaHei",sans-serif'

  function draw() {
    tick(new Date())
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const [bgR, bgG, bgB] = hexToRgb(opts.bgColor)
    ctx.fillStyle = `rgb(${bgR},${bgG},${bgB})`
    ctx.fillRect(0, 0, cw, ch)

    const cx = cw / 2, cy = ch / 2
    const [r, g, b] = hexToRgb(opts.color)

    for (const ring of rings) ring.angle += (ring.tgt - ring.angle) * 0.12

    // Ring guide circles
    for (const ring of rings) {
      ctx.beginPath(); ctx.arc(cx, cy, ring.r, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(${r},${g},${b},0.12)`; ctx.lineWidth = 0.8; ctx.stroke()
    }

    // RIGHT-side indicator line (3 o'clock)
    const outerR = (rings[5]?.r ?? 100) * 1.07
    const innerR = (rings[0]?.r ?? 50) * 0.55
    ctx.save()
    ctx.beginPath(); ctx.moveTo(cx + innerR, cy); ctx.lineTo(cx + outerR, cy)
    ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.restore()

    // Draw ring labels
    for (const ring of rings) {
      const n = ring.labels.length
      const step = (2 * Math.PI) / n
      for (let i = 0; i < n; i++) {
        const wa = ring.angle + i * step
        // Angular distance from RIGHT (angle 0)
        let dist = (wa % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
        if (dist > Math.PI) dist = 2 * Math.PI - dist
        const isCurrent = i === ring.val
        const alpha = isCurrent ? 1 : Math.max(0.30, Math.cos(dist * 0.55) * 0.65 + 0.35)
        // Flip text for items on the LEFT half so they read rightward
        const isLeft = Math.cos(wa) < 0

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(wa)
        if (isLeft) ctx.rotate(Math.PI)
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        if (isCurrent) {
          ctx.font = `bold ${ring.fs}px ${FONT}`
          ctx.fillStyle = `rgb(${r},${g},${b})`
          ctx.shadowColor = `rgb(${r},${g},${b})`; ctx.shadowBlur = ring.fs * 0.7
        } else {
          ctx.font = `${ring.fs * 0.80}px ${FONT}`
          ctx.fillStyle = `rgba(190,195,215,${alpha})`; ctx.shadowBlur = 0
        }
        ctx.fillText(ring.labels[i], isLeft ? -ring.r : ring.r, 0)
        ctx.restore()
      }
    }

    // Dot markers at RIGHT for each ring
    for (const ring of rings) {
      ctx.beginPath(); ctx.arc(cx + ring.r, cy, 3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${r},${g},${b},0.65)`; ctx.fill()
    }

    // Year in center — font sized to stay within innermost ring
    const yearFs = Math.max(10, Math.min((rings[0]?.r ?? 72) * 0.32, 16))
    ctx.save()
    ctx.font = `bold ${yearFs}px ${FONT}`
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillStyle = `rgb(${r},${g},${b})`
    ctx.shadowColor = `rgb(${r},${g},${b})`; ctx.shadowBlur = 10
    ctx.fillText(yearStr, cx, cy)
    ctx.restore()

    raf = requestAnimationFrame(draw)
  }

  draw()
  return () => { cancelAnimationFrame(raf); ro.disconnect() }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export type EffectName = 'stars' | 'particles' | 'aurora' | 'waves' | 'rain' | 'snow'
  | 'matrix' | 'fireworks' | 'nebula' | 'lightning' | 'dna' | 'galaxy'
  | 'geometricflow' | 'neon' | 'ocean' | 'sakura'
  | 'bokeh' | 'constellation' | 'bubbles' | 'compassclock'

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
  geometricflow: runGeometricflow,
  neon:          runNeon,
  ocean:         runOcean,
  sakura:        runSakura,
  bokeh:         runBokeh,
  constellation: runConstellation,
  bubbles:       runBubbles,
  compassclock:  runCompassClock,
}

export function startEffect(canvas: HTMLCanvasElement, effect: EffectName, opts: EffectOptions): () => void {
  const runner = RUNNERS[effect]
  if (!runner) return () => {}
  return runner(canvas, opts)
}
