import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Modal,
  Typography,
  Space,
  Dropdown,
  Tag,
  Empty,
  Input,
  Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  MoreOutlined,
  SearchOutlined,
  UploadOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useScreensStore } from '@/store/screensStore';
import type { CapturedScreen } from '@/types';

const { Title, Text } = Typography;
const { Search } = Input;

export function Screens() {
  const navigate = useNavigate();
  const {
    screens,
    isPreviewOpen,
    previewScreen,
    openPreview,
    closePreview,
    removeScreen,
    duplicateScreen,
  } = useScreensStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredScreens = screens.filter(
    (screen) =>
      screen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      screen.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const getDropdownItems = (screen: CapturedScreen): MenuProps['items'] => [
    {
      key: 'preview',
      icon: <EyeOutlined />,
      label: 'Preview',
      onClick: () => openPreview(screen),
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Edit in WYSIWYG',
      onClick: () => navigate(`/editor/${screen.id}`),
    },
    {
      key: 'variants',
      icon: <ExperimentOutlined />,
      label: 'Create Variants',
      onClick: () => navigate(`/variants/${screen.id}`),
    },
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Duplicate',
      onClick: () => duplicateScreen(screen.id),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: 'Delete Screen',
          content: `Are you sure you want to delete "${screen.name}"?`,
          okText: 'Delete',
          okType: 'danger',
          onOk: () => removeScreen(screen.id),
        });
      },
    },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const ScreenCard = ({ screen }: { screen: CapturedScreen }) => (
    <Card
      hoverable
      style={{ height: '100%' }}
      cover={
        <div
          style={{
            height: 180,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
          onClick={() => openPreview(screen)}
        >
          <iframe
            src={screen.filePath}
            style={{
              width: '200%',
              height: '200%',
              transform: 'scale(0.5)',
              transformOrigin: 'top left',
              pointerEvents: 'none',
              border: 'none',
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            title={screen.name}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.1)',
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
            className="card-overlay"
          />
          <EyeOutlined
            style={{
              position: 'absolute',
              fontSize: 32,
              color: 'white',
              opacity: 0,
              transition: 'opacity 0.2s',
              zIndex: 1,
            }}
            className="card-eye"
          />
        </div>
      }
      actions={[
        <Tooltip title="Preview" key="preview">
          <EyeOutlined onClick={() => openPreview(screen)} />
        </Tooltip>,
        <Tooltip title="Edit" key="edit">
          <EditOutlined onClick={() => navigate(`/editor/${screen.id}`)} />
        </Tooltip>,
        <Dropdown
          key="more"
          menu={{ items: getDropdownItems(screen) }}
          trigger={['click']}
        >
          <MoreOutlined />
        </Dropdown>,
      ]}
    >
      <Card.Meta
        title={
          <Text ellipsis style={{ maxWidth: '100%' }}>
            {screen.name}
          </Text>
        }
        description={
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatDate(screen.capturedAt)}
            </Text>
            {screen.tags && screen.tags.length > 0 && (
              <Space size={4} wrap>
                {screen.tags.slice(0, 3).map((tag) => (
                  <Tag key={tag} style={{ margin: 0 }}>
                    {tag}
                  </Tag>
                ))}
              </Space>
            )}
          </Space>
        }
      />
    </Card>
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Captured Screens
        </Title>
        <Space>
          <Search
            placeholder="Search screens..."
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
          />
          <Button.Group>
            <Tooltip title="Grid view">
              <Button
                icon={<AppstoreOutlined />}
                type={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => setViewMode('grid')}
              />
            </Tooltip>
            <Tooltip title="List view">
              <Button
                icon={<UnorderedListOutlined />}
                type={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => setViewMode('list')}
              />
            </Tooltip>
          </Button.Group>
          <Button type="primary" icon={<UploadOutlined />}>
            Import Screen
          </Button>
        </Space>
      </div>

      {filteredScreens.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            searchQuery
              ? 'No screens match your search'
              : 'No captured screens yet'
          }
        >
          {!searchQuery && (
            <Button type="primary" icon={<UploadOutlined />}>
              Import Your First Screen
            </Button>
          )}
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredScreens.map((screen) => (
            <Col key={screen.id} xs={24} sm={12} md={8} lg={6}>
              <ScreenCard screen={screen} />
            </Col>
          ))}
        </Row>
      )}

      {/* Preview Modal */}
      <Modal
        open={isPreviewOpen}
        onCancel={closePreview}
        width="90vw"
        style={{ top: 20 }}
        footer={
          previewScreen && (
            <Space>
              <Button onClick={closePreview}>Close</Button>
              <Button
                icon={<CopyOutlined />}
                onClick={() => {
                  duplicateScreen(previewScreen.id);
                  closePreview();
                }}
              >
                Duplicate
              </Button>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  navigate(`/editor/${previewScreen.id}`);
                  closePreview();
                }}
              >
                Edit in WYSIWYG
              </Button>
            </Space>
          )
        }
        title={previewScreen?.name}
      >
        {previewScreen && (
          <div
            style={{
              height: 'calc(80vh - 100px)',
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <iframe
              src={previewScreen.filePath}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              title={previewScreen.name}
            />
          </div>
        )}
      </Modal>

      <style>{`
        .ant-card:hover .card-overlay,
        .ant-card:hover .card-eye {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
