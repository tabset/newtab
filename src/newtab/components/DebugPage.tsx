import { useState } from 'react'
import { motion } from 'framer-motion'
import { useT } from '../i18n'

interface DebugPageProps {
  onExit: () => void
}

export default function DebugPage({ onExit }: DebugPageProps) {
  const [showDebugInfo, setShowDebugInfo] = useState(true)
  const t = useT()

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(48px) saturate(180%)',
      WebkitBackdropFilter: 'blur(48px) saturate(180%)',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px',
      color: '#fff',
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      overflow: 'auto',
    }}>
      {/* 顶部栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingBottom: 16,
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#FF5F57',
            boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.15)',
          }} />
          <h1 style={{
            fontSize: 18,
            fontWeight: 600,
            margin: 0,
            background: 'linear-gradient(135deg, #00C6FB 0%, #005BEA 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            🔧 开发者模式
          </h1>
        </div>

        {/* 退出按钮 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onExit}
          style={{
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            background: 'linear-gradient(135deg, #FF5F57 0%, #E03E36 100%)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(255, 95, 87, 0.4)',
            outline: 'none',
          }}
        >
          {t('debug_exit')}
        </motion.button>
      </div>

      {/* 调试信息区域 */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {/* 系统信息 */}
        <section style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          padding: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <h2 style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
            color: 'rgba(255, 255, 255, 0.9)',
          }}>
            📊 系统信息
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            <DebugInfoItem label="User Agent" value={navigator.userAgent} />
            <DebugInfoItem label="Platform" value={navigator.platform} />
            <DebugInfoItem label="Language" value={navigator.language} />
            <DebugInfoItem label="Screen" value={`${screen.width} x ${screen.height}`} />
            <DebugInfoItem label="Window" value={`${window.innerWidth} x ${window.innerHeight}`} />
            <DebugInfoItem label="Device Pixel Ratio" value={`${window.devicePixelRatio}x`} />
            <DebugInfoItem label="Cookie Enabled" value={navigator.cookieEnabled ? 'Yes' : 'No'} />
            <DebugInfoItem label="Online" value={navigator.onLine ? 'Yes' : 'No'} />
          </div>
        </section>

        {/* Chrome 扩展信息 */}
        <section style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          padding: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <h2 style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
            color: 'rgba(255, 255, 255, 0.9)',
          }}>
            🔌 Chrome 扩展信息
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            <DebugInfoItem label="Extension ID" value={chrome.runtime.id} />
            <DebugInfoItem label="Manifest Version" value={chrome.runtime.getManifest().manifest_version.toString()} />
            <DebugInfoItem label="Version" value={chrome.runtime.getManifest().version} />
            <DebugInfoItem label="Name" value={chrome.runtime.getManifest().name} />
          </div>
        </section>

        {/* 存储数据 */}
        <section style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          padding: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <h2 style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
            color: 'rgba(255, 255, 255, 0.9)',
          }}>
            💾 存储数据
          </h2>
          <div style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: 8,
            padding: 16,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 12,
            overflow: 'auto',
            maxHeight: 400,
          }}>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(localStorage, null, 2)}
            </pre>
          </div>
        </section>

        {/* 操作区域 */}
        <section style={{
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 12,
          padding: 20,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <h2 style={{
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 12,
            color: 'rgba(255, 255, 255, 0.9)',
          }}>
            ⚡ 快速操作
          </h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                localStorage.clear()
                chrome.storage.local.clear(() => {
                  alert('存储已清空，页面将重新加载')
                  window.location.reload()
                })
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #FF9500 0%, #FF5E00 100%)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255, 149, 0, 0.4)',
              }}
            >
              清空所有数据
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                window.location.reload()
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                background: 'linear-gradient(135deg, #00C6FB 0%, #005BEA 100%)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 198, 251, 0.4)',
              }}
            >
              重新加载页面
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowDebugInfo(!showDebugInfo)
              }}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'transparent',
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {showDebugInfo ? '隐藏调试信息' : '显示调试信息'}
            </motion.button>
          </div>
        </section>
      </div>
    </div>
  )
}

// 调试信息项组件
function DebugInfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.2)',
      borderRadius: 6,
      padding: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', wordBreak: 'break-word', fontFamily: 'Menlo, Monaco, "Courier New", monospace' }}>
        {value}
      </span>
    </div>
  )
}
