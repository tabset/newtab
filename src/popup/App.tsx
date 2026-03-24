import { ConfigProvider, Typography } from 'antd'

const { Title, Text } = Typography

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8',
        },
      }}
    >
      <div style={{ width: 360, minHeight: 200, padding: '16px 20px' }}>
        <Title level={4} style={{ margin: 0, color: '#1a73e8' }}>
          NewTab
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Tab manager
        </Text>
      </div>
    </ConfigProvider>
  )
}
