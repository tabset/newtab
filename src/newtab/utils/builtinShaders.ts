export interface ShaderEffect {
  id: string
  name?: string
  nameKey?: string
  author?: string
  preview?: string
  builtin?: boolean
  /** canvas2d = 内置 Canvas 2D 渲染（高质量），glsl = WebGL 着色器（社区效果） */
  type?: 'canvas2d' | 'glsl'
  shader?: string   // 仅 glsl 类型需要
}

export const BUILTIN_SHADERS: ShaderEffect[] = [
  { id: 'stars',         nameKey: 'effect_stars',         builtin: true, type: 'canvas2d' },
  { id: 'particles',     nameKey: 'effect_particles',     builtin: true, type: 'canvas2d' },
  { id: 'aurora',        nameKey: 'effect_aurora',        builtin: true, type: 'canvas2d' },
  { id: 'waves',         nameKey: 'effect_waves',         builtin: true, type: 'canvas2d' },
  { id: 'rain',          nameKey: 'effect_rain',          builtin: true, type: 'canvas2d' },
  { id: 'snow',          nameKey: 'effect_snow',          builtin: true, type: 'canvas2d' },
  { id: 'matrix',        nameKey: 'effect_matrix',        builtin: true, type: 'canvas2d' },
  { id: 'fireworks',     nameKey: 'effect_fireworks',     builtin: true, type: 'canvas2d' },
  { id: 'nebula',        nameKey: 'effect_nebula',        builtin: true, type: 'canvas2d' },
  { id: 'lightning',     nameKey: 'effect_lightning',     builtin: true, type: 'canvas2d' },
  { id: 'dna',           nameKey: 'effect_dna',           builtin: true, type: 'canvas2d' },
  { id: 'galaxy',        nameKey: 'effect_galaxy',        builtin: true, type: 'canvas2d' },
  { id: 'lavalamp',      nameKey: 'effect_lavalamp',      builtin: true, type: 'canvas2d' },
  { id: 'geometricflow', nameKey: 'effect_geometricflow', builtin: true, type: 'canvas2d' },
  { id: 'neon',          nameKey: 'effect_neon',          builtin: true, type: 'canvas2d' },
  { id: 'fire',          nameKey: 'effect_fire',          builtin: true, type: 'canvas2d' },
  { id: 'ocean',         nameKey: 'effect_ocean',         builtin: true, type: 'canvas2d' },
  { id: 'sakura',        nameKey: 'effect_sakura',        builtin: true, type: 'canvas2d' },
  { id: 'bokeh',         nameKey: 'effect_bokeh',         builtin: true, type: 'canvas2d' },
  { id: 'constellation', nameKey: 'effect_constellation', builtin: true, type: 'canvas2d' },
  { id: 'portal',        nameKey: 'effect_portal',        builtin: true, type: 'canvas2d' },
  { id: 'bubbles',       nameKey: 'effect_bubbles',       builtin: true, type: 'canvas2d' },
  { id: 'plasma',        nameKey: 'effect_plasma',        builtin: true, type: 'canvas2d' },
  { id: 'grid3d',        nameKey: 'effect_grid3d',        builtin: true, type: 'canvas2d' },
  { id: 'aurora2',       nameKey: 'effect_aurora2',       builtin: true, type: 'canvas2d' },
  { id: 'glitch',        nameKey: 'effect_glitch',        builtin: true, type: 'canvas2d' },
  { id: 'moonbagua',    nameKey: 'effect_moonbagua',    builtin: true, type: 'canvas2d' },
  { id: 'compassclock', nameKey: 'effect_compassclock', builtin: true, type: 'canvas2d' },
  { id: 'binaryclock',  nameKey: 'effect_binaryclock',  builtin: true, type: 'canvas2d' },
  { id: 'gearclock',    nameKey: 'effect_gearclock',    builtin: true, type: 'canvas2d' },
  { id: 'radarclock',   nameKey: 'effect_radarclock',   builtin: true, type: 'canvas2d' },
]
