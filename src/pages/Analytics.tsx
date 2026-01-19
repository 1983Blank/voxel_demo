import { useState } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  Select,
  Progress,
  Tooltip,
  Badge,
} from 'antd';
import {
  EyeOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  RiseOutlined,
  FallOutlined,
  TrophyOutlined,
  BarChartOutlined,
  LineChartOutlined,
  FireOutlined,
} from '@ant-design/icons';
import {
  useAnalyticsStore,
  formatNumber,
  formatPercent,
  formatTime,
  type VariantMetrics,
  type TimeSeriesData,
} from '@/store/analyticsStore';

const { Title, Text } = Typography;

// Simple Bar Chart Component
function BarChart({
  data,
  color = '#1890ff',
  height = 200,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 8px' }}>
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * (height - 40);
        return (
          <Tooltip key={index} title={`${item.label}: ${formatNumber(item.value)}`}>
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: barHeight,
                  background: `linear-gradient(180deg, ${color} 0%, ${color}88 100%)`,
                  borderRadius: '4px 4px 0 0',
                  minHeight: 4,
                  transition: 'height 0.3s ease',
                }}
              />
              <Text type="secondary" style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                {item.label}
              </Text>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}

// Simple Line Chart Component
function LineChart({
  data,
  height = 200,
}: {
  data: TimeSeriesData[];
  height?: number;
}) {
  if (data.length === 0) return null;

  const maxViews = Math.max(...data.map((d) => d.views), 1);
  const maxClicks = Math.max(...data.map((d) => d.clicks), 1);
  const maxConversions = Math.max(...data.map((d) => d.conversions), 1);
  const maxValue = Math.max(maxViews, maxClicks, maxConversions);

  const chartHeight = height - 40;

  const getPoints = (values: number[]) => {
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = chartHeight - (value / maxValue) * chartHeight;
      return `${x},${y}`;
    });
    return points.join(' ');
  };

  return (
    <div style={{ height, position: 'relative', padding: '8px 0' }}>
      <svg width="100%" height={chartHeight} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((percent) => (
          <line
            key={percent}
            x1="0%"
            y1={`${percent}%`}
            x2="100%"
            y2={`${percent}%`}
            stroke="#f0f0f0"
            strokeWidth="1"
          />
        ))}

        {/* Views line */}
        <polyline
          fill="none"
          stroke="#1890ff"
          strokeWidth="2"
          points={getPoints(data.map((d) => d.views))}
        />

        {/* Clicks line */}
        <polyline
          fill="none"
          stroke="#52c41a"
          strokeWidth="2"
          points={getPoints(data.map((d) => d.clicks))}
        />

        {/* Conversions line */}
        <polyline
          fill="none"
          stroke="#faad14"
          strokeWidth="2"
          points={getPoints(data.map((d) => d.conversions))}
        />
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
        <Space size={4}>
          <div style={{ width: 12, height: 3, background: '#1890ff', borderRadius: 2 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>Views</Text>
        </Space>
        <Space size={4}>
          <div style={{ width: 12, height: 3, background: '#52c41a', borderRadius: 2 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>Clicks</Text>
        </Space>
        <Space size={4}>
          <div style={{ width: 12, height: 3, background: '#faad14', borderRadius: 2 }} />
          <Text type="secondary" style={{ fontSize: 12 }}>Conversions</Text>
        </Space>
      </div>
    </div>
  );
}

// Variant Comparison Card
function VariantComparisonCard({ metrics }: { metrics: VariantMetrics[] }) {
  const sortedByConversion = [...metrics].sort((a, b) => b.conversionRate - a.conversionRate);
  const topPerformer = sortedByConversion[0];

  const variantColors: Record<string, string> = {
    'Variant A': '#1890ff',
    'Variant B': '#52c41a',
    'Variant C': '#faad14',
    'Variant D': '#eb2f96',
  };

  return (
    <div>
      {metrics.map((variant) => {
        const isTop = variant.variantId === topPerformer?.variantId;
        const color = variantColors[variant.variantLabel] || '#999';

        return (
          <div
            key={variant.variantId}
            style={{
              padding: 12,
              marginBottom: 8,
              borderRadius: 8,
              border: isTop ? `2px solid ${color}` : '1px solid #f0f0f0',
              background: isTop ? `${color}08` : 'white',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Space>
                <Tag color={color}>{variant.variantLabel}</Tag>
                {isTop && (
                  <Tag icon={<TrophyOutlined />} color="gold">
                    Top Performer
                  </Tag>
                )}
              </Space>
              <Text strong style={{ color }}>
                {formatPercent(variant.conversionRate)} conv.
              </Text>
            </div>

            <Row gutter={16}>
              <Col span={8}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Views</Text>
                  <div><Text strong>{formatNumber(variant.views)}</Text></div>
                </div>
              </Col>
              <Col span={8}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Clicks</Text>
                  <div><Text strong>{formatNumber(variant.clicks)}</Text></div>
                </div>
              </Col>
              <Col span={8}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>Avg. Time</Text>
                  <div><Text strong>{formatTime(variant.avgTimeSpent)}</Text></div>
                </div>
              </Col>
            </Row>

            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Scroll Depth</Text>
                <Text style={{ fontSize: 11 }}>{formatPercent(variant.scrollDepth)}</Text>
              </div>
              <Progress
                percent={variant.scrollDepth}
                showInfo={false}
                strokeColor={color}
                size="small"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Analytics() {
  const {
    screenAnalytics,
    dateRange,
    setDateRange,
    getTimeSeriesData,
    getTopVariants,
  } = useAnalyticsStore();

  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);

  const timeSeriesData = getTimeSeriesData(selectedScreenId || undefined);
  const topVariants = getTopVariants(5);

  // Calculate totals
  const totalViews = screenAnalytics.reduce((sum, s) => sum + s.totalViews, 0);
  const totalClicks = screenAnalytics.reduce((sum, s) => sum + s.totalClicks, 0);
  const avgEngagement = screenAnalytics.length > 0
    ? screenAnalytics.reduce((sum, s) => sum + s.avgEngagement, 0) / screenAnalytics.length
    : 0;
  const avgConversion = topVariants.length > 0
    ? topVariants.reduce((sum, v) => sum + v.conversionRate, 0) / topVariants.length
    : 0;

  // Mock trends (would come from real data comparison)
  type TrendDirection = 'up' | 'down';
  const viewsTrend: { direction: TrendDirection; percent: number } = { direction: 'up', percent: 12.5 };
  const clicksTrend: { direction: TrendDirection; percent: number } = { direction: 'up', percent: 8.3 };
  const engagementTrend: { direction: TrendDirection; percent: number } = { direction: 'down', percent: 3.2 };
  const conversionTrend: { direction: TrendDirection; percent: number } = { direction: 'up', percent: 15.7 };

  const selectedScreen = selectedScreenId
    ? screenAnalytics.find((s) => s.screenId === selectedScreenId)
    : null;

  // Table columns
  const columns = [
    {
      title: 'Screen',
      dataIndex: 'screenName',
      key: 'screenName',
      render: (name: string, record: typeof screenAnalytics[0]) => (
        <Space>
          <Text strong>{name}</Text>
          {record.topPerformer && (
            <Badge count={<FireOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />} />
          )}
        </Space>
      ),
    },
    {
      title: 'Variants',
      key: 'variants',
      render: (_: unknown, record: typeof screenAnalytics[0]) => (
        <Space>
          {record.variantMetrics.map((v) => (
            <Tag
              key={v.variantId}
              color={v.variantId === record.topPerformer ? 'gold' : 'default'}
            >
              {v.variantLabel}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Views',
      dataIndex: 'totalViews',
      key: 'totalViews',
      render: (views: number) => formatNumber(views),
      sorter: (a: typeof screenAnalytics[0], b: typeof screenAnalytics[0]) => a.totalViews - b.totalViews,
    },
    {
      title: 'Clicks',
      dataIndex: 'totalClicks',
      key: 'totalClicks',
      render: (clicks: number) => formatNumber(clicks),
      sorter: (a: typeof screenAnalytics[0], b: typeof screenAnalytics[0]) => a.totalClicks - b.totalClicks,
    },
    {
      title: 'Avg. Engagement',
      dataIndex: 'avgEngagement',
      key: 'avgEngagement',
      render: (engagement: number) => formatTime(engagement),
      sorter: (a: typeof screenAnalytics[0], b: typeof screenAnalytics[0]) => a.avgEngagement - b.avgEngagement,
    },
    {
      title: 'Top Conversion',
      key: 'topConversion',
      render: (_: unknown, record: typeof screenAnalytics[0]) => {
        const topVariant = record.variantMetrics.find((v) => v.variantId === record.topPerformer);
        return topVariant ? (
          <Text style={{ color: '#52c41a' }}>
            {formatPercent(topVariant.conversionRate)}
          </Text>
        ) : '-';
      },
    },
  ];

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Analytics Dashboard
          </Title>
          <Text type="secondary">
            Track engagement and optimize variant performance
          </Text>
        </div>
        <Space>
          <Select
            value={selectedScreenId || 'all'}
            onChange={(value) => setSelectedScreenId(value === 'all' ? null : value)}
            style={{ width: 180 }}
            options={[
              { label: 'All Screens', value: 'all' },
              ...screenAnalytics.map((s) => ({
                label: s.screenName,
                value: s.screenId,
              })),
            ]}
          />
          <Select
            value={dateRange}
            onChange={setDateRange}
            style={{ width: 120 }}
            options={[
              { label: 'Today', value: 'today' },
              { label: 'Last 7 days', value: '7d' },
              { label: 'Last 30 days', value: '30d' },
              { label: 'Last 90 days', value: '90d' },
            ]}
          />
        </Space>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Views"
              value={totalViews}
              formatter={(value) => formatNumber(value as number)}
              prefix={<EyeOutlined style={{ color: '#1890ff' }} />}
              suffix={
                <Text
                  style={{
                    fontSize: 12,
                    color: viewsTrend.direction === 'up' ? '#52c41a' : '#ff4d4f',
                  }}
                >
                  {viewsTrend.direction === 'up' ? <RiseOutlined /> : <FallOutlined />}
                  {viewsTrend.percent.toFixed(1)}%
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Clicks"
              value={totalClicks}
              formatter={(value) => formatNumber(value as number)}
              prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
              suffix={
                <Text
                  style={{
                    fontSize: 12,
                    color: clicksTrend.direction === 'up' ? '#52c41a' : '#ff4d4f',
                  }}
                >
                  {clicksTrend.direction === 'up' ? <RiseOutlined /> : <FallOutlined />}
                  {clicksTrend.percent.toFixed(1)}%
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Avg. Engagement"
              value={avgEngagement}
              formatter={(value) => formatTime(value as number)}
              prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
              suffix={
                <Text
                  style={{
                    fontSize: 12,
                    color: engagementTrend.direction === 'up' ? '#52c41a' : '#ff4d4f',
                  }}
                >
                  {engagementTrend.direction === 'up' ? <RiseOutlined /> : <FallOutlined />}
                  {engagementTrend.percent.toFixed(1)}%
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Avg. Conversion"
              value={avgConversion}
              formatter={(value) => formatPercent(value as number)}
              prefix={<TrophyOutlined style={{ color: '#eb2f96' }} />}
              suffix={
                <Text
                  style={{
                    fontSize: 12,
                    color: conversionTrend.direction === 'up' ? '#52c41a' : '#ff4d4f',
                  }}
                >
                  {conversionTrend.direction === 'up' ? <RiseOutlined /> : <FallOutlined />}
                  {conversionTrend.percent.toFixed(1)}%
                </Text>
              }
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <LineChartOutlined />
                Engagement Over Time
              </Space>
            }
          >
            <LineChart data={timeSeriesData} height={250} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <BarChartOutlined />
                Top Performing Variants
              </Space>
            }
          >
            <BarChart
              data={topVariants.map((v) => ({
                label: v.variantLabel,
                value: v.conversionRate,
              }))}
              color="#52c41a"
              height={250}
            />
          </Card>
        </Col>
      </Row>

      {/* Variant Comparison and Table */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={selectedScreen ? 16 : 24}>
          <Card title="Screen Performance">
            <Table
              columns={columns}
              dataSource={screenAnalytics}
              rowKey="screenId"
              pagination={false}
              onRow={(record) => ({
                onClick: () => setSelectedScreenId(record.screenId),
                style: {
                  cursor: 'pointer',
                  background: record.screenId === selectedScreenId ? '#f0f5ff' : undefined,
                },
              })}
            />
          </Card>
        </Col>
        {selectedScreen && (
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <TrophyOutlined style={{ color: '#faad14' }} />
                  {selectedScreen.screenName} - Variant Comparison
                </Space>
              }
              extra={
                <Text
                  type="secondary"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedScreenId(null)}
                >
                  Close
                </Text>
              }
            >
              <VariantComparisonCard metrics={selectedScreen.variantMetrics} />
            </Card>
          </Col>
        )}
      </Row>
    </div>
  );
}
