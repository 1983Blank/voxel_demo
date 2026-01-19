import { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Tag,
  Button,
  Modal,
  Tabs,
  Typography,
  Space,
  message,
  Empty,
  Tooltip,
  Segmented,
} from 'antd';
import {
  SearchOutlined,
  CopyOutlined,
  CodeOutlined,
  EyeOutlined,
  FilterOutlined,
  ClearOutlined,
  AppstoreOutlined,
  BarsOutlined,
} from '@ant-design/icons';
import { useComponentsStore, type ExtractedComponent } from '@/store/componentsStore';

const { Title, Text } = Typography;
const { Search } = Input;

// Component preview renderer
function ComponentPreview({ component }: { component: ExtractedComponent }) {
  const combinedCode = `
    <style>${component.css}</style>
    <div style="padding: 20px; display: flex; align-items: center; justify-content: center; min-height: 100%;">
      ${component.html}
    </div>
  `;

  return (
    <iframe
      srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}</style></head><body>${combinedCode}</body></html>`}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        background: 'white',
      }}
      title={component.name}
      sandbox="allow-same-origin"
    />
  );
}

// Code block with copy
function CodeBlock({ code, language }: { code: string; language: string }) {
  const copyCode = () => {
    navigator.clipboard.writeText(code);
    message.success(`${language.toUpperCase()} copied to clipboard`);
  };

  return (
    <div style={{ position: 'relative' }}>
      <Button
        icon={<CopyOutlined />}
        size="small"
        onClick={copyCode}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
        }}
      >
        Copy
      </Button>
      <pre
        style={{
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: 16,
          borderRadius: 8,
          overflow: 'auto',
          maxHeight: 400,
          fontSize: 13,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Component card
function ComponentCard({
  component,
  onClick,
}: {
  component: ExtractedComponent;
  onClick: () => void;
}) {
  const copyHTML = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(component.html);
    message.success('HTML copied');
  };

  const copyCSS = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(component.css);
    message.success('CSS copied');
  };

  const copyBoth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const combined = `/* CSS */\n${component.css}\n\n<!-- HTML -->\n${component.html}`;
    navigator.clipboard.writeText(combined);
    message.success('HTML + CSS copied');
  };

  return (
    <Card
      hoverable
      onClick={onClick}
      style={{ height: '100%' }}
      cover={
        <div
          style={{
            height: 160,
            background: '#fafafa',
            borderBottom: '1px solid #f0f0f0',
            overflow: 'hidden',
          }}
        >
          <ComponentPreview component={component} />
        </div>
      }
      actions={[
        <Tooltip title="Copy HTML" key="html">
          <span onClick={copyHTML}>
            <CodeOutlined /> HTML
          </span>
        </Tooltip>,
        <Tooltip title="Copy CSS" key="css">
          <span onClick={copyCSS}>
            <CodeOutlined /> CSS
          </span>
        </Tooltip>,
        <Tooltip title="Copy Both" key="both">
          <span onClick={copyBoth}>
            <CopyOutlined /> All
          </span>
        </Tooltip>,
      ]}
    >
      <Card.Meta
        title={component.name}
        description={
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12, textTransform: 'capitalize' }}>
              {component.category}
            </Text>
            <Space size={4} wrap>
              {component.tags.slice(0, 3).map((tag) => (
                <Tag key={tag} style={{ margin: 0, fontSize: 11 }}>
                  {tag}
                </Tag>
              ))}
            </Space>
          </Space>
        }
      />
    </Card>
  );
}

// Detail modal
function ComponentDetailModal({
  component,
  open,
  onClose,
}: {
  component: ExtractedComponent | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!component) return null;

  const copyAll = () => {
    const combined = `/* CSS */\n${component.css}\n\n<!-- HTML -->\n${component.html}`;
    navigator.clipboard.writeText(combined);
    message.success('Component code copied to clipboard');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={900}
      title={
        <Space>
          <span>{component.name}</span>
          <Tag style={{ textTransform: 'capitalize' }}>{component.category}</Tag>
        </Space>
      }
      footer={
        <Space>
          <Button onClick={onClose}>Close</Button>
          <Button type="primary" icon={<CopyOutlined />} onClick={copyAll}>
            Copy All Code
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Space wrap>
          {component.tags.map((tag) => (
            <Tag key={tag} color="purple">
              {tag}
            </Tag>
          ))}
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: 'preview',
            label: (
              <span>
                <EyeOutlined /> Preview
              </span>
            ),
            children: (
              <div
                style={{
                  height: 300,
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#fafafa',
                }}
              >
                <ComponentPreview component={component} />
              </div>
            ),
          },
          {
            key: 'html',
            label: (
              <span>
                <CodeOutlined /> HTML
              </span>
            ),
            children: <CodeBlock code={component.html} language="html" />,
          },
          {
            key: 'css',
            label: (
              <span>
                <CodeOutlined /> CSS
              </span>
            ),
            children: <CodeBlock code={component.css} language="css" />,
          },
        ]}
      />
    </Modal>
  );
}

export function Components() {
  const {
    components,
    searchQuery,
    selectedCategory,
    selectedTags,
    setSearchQuery,
    setSelectedCategory,
    toggleTag,
    clearFilters,
    selectedComponent,
    selectComponent,
  } = useComponentsStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Compute filtered components, categories, and tags
  const categories = useMemo(
    () => [...new Set(components.map((c) => c.category))].sort(),
    [components]
  );

  const allTags = useMemo(
    () => [...new Set(components.flatMap((c) => c.tags))].sort(),
    [components]
  );

  const filteredComponents = useMemo(() => {
    return components.filter((comp) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = comp.name.toLowerCase().includes(query);
        const matchesTags = comp.tags.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        const matchesCategory = comp.category.toLowerCase().includes(query);
        if (!matchesName && !matchesTags && !matchesCategory) {
          return false;
        }
      }

      if (selectedCategory && comp.category !== selectedCategory) {
        return false;
      }

      if (selectedTags.length > 0) {
        const hasAllTags = selectedTags.every((tag) => comp.tags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }

      return true;
    });
  }, [components, searchQuery, selectedCategory, selectedTags]);

  const hasFilters = searchQuery || selectedCategory || selectedTags.length > 0;

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
            Component Library
          </Title>
          <Text type="secondary">
            {filteredComponents.length} of {components.length} components
          </Text>
        </div>
        <Space>
          <Segmented
            options={[
              { value: 'grid', icon: <AppstoreOutlined /> },
              { value: 'list', icon: <BarsOutlined /> },
            ]}
            value={viewMode}
            onChange={(v) => setViewMode(v as 'grid' | 'list')}
          />
        </Space>
      </div>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <Space wrap style={{ width: '100%' }}>
          <Search
            placeholder="Search components..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />

          <Select
            placeholder="Category"
            style={{ width: 150 }}
            value={selectedCategory}
            onChange={setSelectedCategory}
            allowClear
            options={categories.map((cat) => ({
              label: cat.charAt(0).toUpperCase() + cat.slice(1),
              value: cat,
            }))}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FilterOutlined style={{ color: '#999' }} />
            {allTags.slice(0, 8).map((tag) => (
              <Tag
                key={tag}
                color={selectedTags.includes(tag) ? 'purple' : undefined}
                style={{ cursor: 'pointer', margin: 0 }}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Tag>
            ))}
          </div>

          {hasFilters && (
            <Button
              icon={<ClearOutlined />}
              size="small"
              onClick={clearFilters}
            >
              Clear
            </Button>
          )}
        </Space>
      </Card>

      {/* Components Grid */}
      {filteredComponents.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            hasFilters
              ? 'No components match your filters'
              : 'No components extracted yet'
          }
        >
          {hasFilters && (
            <Button onClick={clearFilters}>Clear Filters</Button>
          )}
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredComponents.map((component) => (
            <Col
              key={component.id}
              xs={24}
              sm={12}
              md={viewMode === 'grid' ? 8 : 12}
              lg={viewMode === 'grid' ? 6 : 8}
            >
              <ComponentCard
                component={component}
                onClick={() => selectComponent(component)}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Detail Modal */}
      <ComponentDetailModal
        component={selectedComponent}
        open={!!selectedComponent}
        onClose={() => selectComponent(null)}
      />
    </div>
  );
}
