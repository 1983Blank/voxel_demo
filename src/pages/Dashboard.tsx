import { Row, Col, Card, Statistic } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  FileOutlined,
  RiseOutlined,
} from '@ant-design/icons';

export function Dashboard() {
  return (
    <div>
      <h1 style={{ marginTop: 0, marginBottom: 24 }}>Dashboard</h1>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Users"
              value={1234}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Teams"
              value={56}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Documents"
              value={892}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Growth"
              value={12.5}
              precision={1}
              suffix="%"
              prefix={<RiseOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Welcome to Your SaaS Dashboard</h3>
        <p>
          This is your production-ready React + TypeScript + Vite application
          with Ant Design. Start building your SaaS features from here.
        </p>
      </Card>
    </div>
  );
}
