export interface RendererOptions {
  color: string   // hex color e.g. "#667eea"
  speed: number   // 1-5
}

export class WebGLRenderer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private raf = 0
  private startTime = Date.now()
  private uTime: WebGLUniformLocation | null = null
  private uResolution: WebGLUniformLocation | null = null
  private uColor: WebGLUniformLocation | null = null
  private uSpeed: WebGLUniformLocation | null = null
  private ro: ResizeObserver

  constructor(private canvas: HTMLCanvasElement, fragmentSrc: string, private opts: RendererOptions) {
    const gl = canvas.getContext('webgl')
    if (!gl) throw new Error('WebGL not supported')
    this.gl = gl
    this.program = this.createProgram(VERTEX_SHADER, fragmentSrc)
    this.setupGeometry()
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(canvas)
    this.resize()
    this.loop()
  }

  private createShader(type: number, src: string): WebGLShader {
    const gl = this.gl
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, src)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const err = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error('Shader compile error: ' + err)
    }
    return shader
  }

  private createProgram(vertSrc: string, fragSrc: string): WebGLProgram {
    const gl = this.gl
    const program = gl.createProgram()!
    gl.attachShader(program, this.createShader(gl.VERTEX_SHADER, vertSrc))
    gl.attachShader(program, this.createShader(gl.FRAGMENT_SHADER, fragSrc))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(program))
    }
    gl.useProgram(program)
    this.uTime       = gl.getUniformLocation(program, 'u_time')
    this.uResolution = gl.getUniformLocation(program, 'u_resolution')
    this.uColor      = gl.getUniformLocation(program, 'u_color')
    this.uSpeed      = gl.getUniformLocation(program, 'u_speed')
    return program
  }

  private setupGeometry() {
    const gl = this.gl
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(this.program, 'a_position')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  }

  private resize() {
    const canvas = this.canvas
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth * dpr
    const h = canvas.clientHeight * dpr
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    this.gl.viewport(0, 0, w, h)
  }

  private hexToRgb(hex: string): [number, number, number] {
    const c = hex.replace('#', '')
    const n = parseInt(c.length === 3 ? c.split('').map(x => x+x).join('') : c, 16)
    return [(n>>16&255)/255, (n>>8&255)/255, (n&255)/255]
  }

  private loop() {
    const gl = this.gl
    const t = (Date.now() - this.startTime) / 1000
    const [r, g, b] = this.hexToRgb(this.opts.color)
    const speed = this.opts.speed / 3  // normalize: speed=3 → 1.0

    gl.useProgram(this.program)
    gl.uniform1f(this.uTime, t)
    gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height)
    gl.uniform3f(this.uColor, r, g, b)
    gl.uniform1f(this.uSpeed, speed)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    this.raf = requestAnimationFrame(() => this.loop())
  }

  setOptions(opts: Partial<RendererOptions>) {
    Object.assign(this.opts, opts)
  }

  stop() {
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
  }
}

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`
