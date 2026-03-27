import { useEffect, useRef } from 'react'
import { WebGLRenderer } from '../utils/webglRenderer'
import { startEffect } from '../utils/animatedEffects'
import type { EffectName, EffectOptions } from '../utils/animatedEffects'
import { findEffect } from '../utils/effectStore'
import type { ShaderEffect } from '../utils/effectStore'

interface Props {
  effectId: string
  installedEffects?: ShaderEffect[]
  color: string
  speed: number
  opacity: number
  blur: number
}

export default function AnimatedBackground({ effectId, installedEffects, color, speed, opacity, blur }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WebGLRenderer | null>(null)
  const stopCanvas2dRef = useRef<(() => void) | null>(null)
  // Canvas 2D opts 通过 ref 共享，draw() 每帧读取最新值，无需重建
  const optsRef = useRef<EffectOptions>({ color, speed })

  useEffect(() => { optsRef.current.color = color }, [color])
  useEffect(() => { optsRef.current.speed = speed }, [speed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // 清理上一个渲染器
    rendererRef.current?.stop()
    rendererRef.current = null
    stopCanvas2dRef.current?.()
    stopCanvas2dRef.current = null

    const effect = findEffect(effectId, installedEffects)

    // Canvas 2D 内置效果（或未找到时默认走 canvas2d）
    if (!effect || effect.type === 'canvas2d') {
      optsRef.current = { color, speed }
      const stop = startEffect(canvas, effectId as EffectName, optsRef.current)
      stopCanvas2dRef.current = stop
      return () => { stop(); stopCanvas2dRef.current = null }
    }

    // WebGL GLSL 社区效果
    if (effect.type === 'glsl' && effect.shader) {
      try {
        const renderer = new WebGLRenderer(canvas, effect.shader, { color, speed })
        rendererRef.current = renderer
      } catch (err) {
        console.error('WebGL renderer error:', err)
      }
      return () => { rendererRef.current?.stop(); rendererRef.current = null }
    }
  }, [effectId, installedEffects])

  // WebGL 动态更新
  useEffect(() => {
    rendererRef.current?.setOptions({ color, speed })
  }, [color, speed])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: opacity / 100,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
      }}
    />
  )
}

