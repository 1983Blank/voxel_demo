import { useState } from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Button,
  Modal,
  Input,
  Space,
  Avatar,
  Tag,
  Empty,
  Dropdown,
  Switch,
  Divider,
  Badge,
  message,
  Tooltip,
  Select,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  ShareAltOutlined,
  CopyOutlined,
  DeleteOutlined,
  MoreOutlined,
  EyeOutlined,
  CommentOutlined,
  GlobalOutlined,
  LockOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  useMultiplayerStore,
  formatRelativeTime,
  type PublishedPrototype,
} from '@/store/multiplayerStore';
import { useScreensStore } from '@/store/screensStore';

const { Title, Text } = Typography;

// Publish Modal
function PublishModal({
  open,
  onClose,
  screenId,
  screenName,
  filePath,
  variantId,
}: {
  open: boolean;
  onClose: () => void;
  screenId: string;
  screenName: string;
  filePath: string;
  variantId?: string;
}) {
  const [name, setName] = useState(screenName);
  const { publishPrototype } = useMultiplayerStore();

  const handlePublish = () => {
    if (!name.trim()) {
      message.error('Please provide a name');
      return;
    }

    // Store filePath as html - SharedView will use src instead of srcDoc
    const prototype = publishPrototype(screenId, name, filePath, variantId);
    message.success('Prototype published!');
    onClose();

    // Copy share link
    const shareUrl = `${window.location.origin}/view/${prototype.shareLink}`;
    navigator.clipboard.writeText(shareUrl);
    message.info('Share link copied to clipboard');
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <ShareAltOutlined style={{ color: '#1890ff' }} />
          Publish Prototype
        </Space>
      }
      onOk={handlePublish}
      okText="Publish"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text strong>Name</Text>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prototype name"
            style={{ marginTop: 4 }}
          />
        </div>
        <div
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderRadius: 8,
          }}
        >
          <Text type="secondary">
            Publishing will create a shareable link that you can send to collaborators.
            They can view and comment on the prototype.
          </Text>
        </div>
      </Space>
    </Modal>
  );
}

// Share Settings Modal
function ShareSettingsModal({
  prototype,
  onClose,
}: {
  prototype: PublishedPrototype | null;
  onClose: () => void;
}) {
  const { updatePrototype, addCollaborator, removeCollaborator, updateCollaboratorRole } =
    useMultiplayerStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');

  if (!prototype) return null;

  const shareUrl = `${window.location.origin}/view/${prototype.shareLink}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    message.success('Link copied!');
  };

  const handleAddCollaborator = () => {
    if (!email.trim()) return;

    addCollaborator(prototype.id, {
      name: email.split('@')[0],
      email,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      role,
    });
    setEmail('');
    message.success('Collaborator added');
  };

  return (
    <Modal
      open={true}
      onCancel={onClose}
      title={
        <Space>
          <TeamOutlined style={{ color: '#1890ff' }} />
          Share Settings
        </Space>
      }
      footer={<Button onClick={onClose}>Done</Button>}
      width={500}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Share Link */}
        <div>
          <Text strong>Share Link</Text>
          <Input.Group compact style={{ display: 'flex', marginTop: 4 }}>
            <Input value={shareUrl} readOnly style={{ flex: 1 }} />
            <Button icon={<CopyOutlined />} onClick={handleCopyLink}>
              Copy
            </Button>
          </Input.Group>
        </div>

        {/* Privacy */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {prototype.isPublic ? (
              <GlobalOutlined style={{ color: '#52c41a' }} />
            ) : (
              <LockOutlined style={{ color: '#faad14' }} />
            )}
            <div>
              <Text strong>Public access</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {prototype.isPublic
                  ? 'Anyone with the link can view'
                  : 'Only collaborators can access'}
              </Text>
            </div>
          </Space>
          <Switch
            checked={prototype.isPublic}
            onChange={(checked) => updatePrototype(prototype.id, { isPublic: checked })}
          />
        </div>

        {/* Comments */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <CommentOutlined />
            <div>
              <Text strong>Allow comments</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Collaborators can leave feedback
              </Text>
            </div>
          </Space>
          <Switch
            checked={prototype.allowComments}
            onChange={(checked) => updatePrototype(prototype.id, { allowComments: checked })}
          />
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Add Collaborator */}
        <div>
          <Text strong>Add people</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <Input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ flex: 1 }}
            />
            <Select
              value={role}
              onChange={setRole}
              style={{ width: 100 }}
              options={[
                { label: 'Viewer', value: 'viewer' },
                { label: 'Editor', value: 'editor' },
              ]}
            />
            <Button type="primary" onClick={handleAddCollaborator}>
              Add
            </Button>
          </div>
        </div>

        {/* Collaborators List */}
        <div>
          <Text strong>Collaborators ({prototype.collaborators.length})</Text>
          <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
            {prototype.collaborators.map((collab) => (
              <div
                key={collab.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <Space>
                  <Badge dot status={collab.isOnline ? 'success' : 'default'} offset={[-4, 28]}>
                    <Avatar style={{ backgroundColor: collab.color }}>
                      {collab.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </Badge>
                  <div>
                    <Text>{collab.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {collab.email}
                    </Text>
                  </div>
                </Space>
                <Space>
                  {collab.role === 'owner' ? (
                    <Tag>Owner</Tag>
                  ) : (
                    <>
                      <Select
                        size="small"
                        value={collab.role}
                        onChange={(newRole) =>
                          updateCollaboratorRole(prototype.id, collab.id, newRole)
                        }
                        style={{ width: 85 }}
                        options={[
                          { label: 'Viewer', value: 'viewer' },
                          { label: 'Editor', value: 'editor' },
                        ]}
                      />
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeCollaborator(prototype.id, collab.id)}
                      />
                    </>
                  )}
                </Space>
              </div>
            ))}
          </div>
        </div>
      </Space>
    </Modal>
  );
}

// Prototype Card
function PrototypeCard({ prototype }: { prototype: PublishedPrototype }) {
  const navigate = useNavigate();
  const { unpublishPrototype, getCommentsForPrototype } = useMultiplayerStore();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const comments = getCommentsForPrototype(prototype.id);
  const onlineCount = prototype.collaborators.filter((c) => c.isOnline).length;

  const menuItems: MenuProps['items'] = [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'View',
      onClick: () => navigate(`/view/${prototype.shareLink}`),
    },
    {
      key: 'share',
      icon: <ShareAltOutlined />,
      label: 'Share Settings',
      onClick: () => setShareModalOpen(true),
    },
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Copy Link',
      onClick: () => {
        navigator.clipboard.writeText(`${window.location.origin}/view/${prototype.shareLink}`);
        message.success('Link copied!');
      },
    },
    { type: 'divider' },
    {
      key: 'unpublish',
      icon: <DeleteOutlined />,
      label: 'Unpublish',
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: 'Unpublish Prototype',
          content: 'This will remove the shared link and all comments. Continue?',
          okText: 'Unpublish',
          okType: 'danger',
          onOk: () => unpublishPrototype(prototype.id),
        });
      },
    },
  ];

  return (
    <>
      <Card
        hoverable
        cover={
          <div
            style={{
              height: 160,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
            onClick={() => navigate(`/view/${prototype.shareLink}`)}
          >
            <iframe
              src={prototype.html}
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
              title={prototype.name}
            />
            {/* Online indicator */}
            {onlineCount > 1 && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  background: 'rgba(0,0,0,0.6)',
                  borderRadius: 12,
                  padding: '2px 8px',
                }}
              >
                <Badge status="success" />
                <Text style={{ color: 'white', fontSize: 12, marginLeft: 4 }}>
                  {onlineCount} online
                </Text>
              </div>
            )}
          </div>
        }
        actions={[
          <Tooltip title="View" key="view">
            <EyeOutlined onClick={() => navigate(`/view/${prototype.shareLink}`)} />
          </Tooltip>,
          <Tooltip title="Share" key="share">
            <ShareAltOutlined onClick={() => setShareModalOpen(true)} />
          </Tooltip>,
          <Dropdown key="more" menu={{ items: menuItems }} trigger={['click']}>
            <MoreOutlined />
          </Dropdown>,
        ]}
      >
        <Card.Meta
          title={
            <Space>
              <Text ellipsis style={{ maxWidth: 150 }}>
                {prototype.name}
              </Text>
              {prototype.isPublic ? (
                <GlobalOutlined style={{ color: '#52c41a', fontSize: 12 }} />
              ) : (
                <LockOutlined style={{ color: '#faad14', fontSize: 12 }} />
              )}
            </Space>
          }
          description={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Published {formatRelativeTime(prototype.publishedAt)}
              </Text>
              <Space size={12}>
                <Space size={4}>
                  <TeamOutlined />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {prototype.collaborators.length}
                  </Text>
                </Space>
                <Space size={4}>
                  <CommentOutlined />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {comments.length}
                  </Text>
                </Space>
                <Space size={4}>
                  <EyeOutlined />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {prototype.viewCount}
                  </Text>
                </Space>
              </Space>
              {/* Collaborator avatars */}
              <Avatar.Group maxCount={4} size="small">
                {prototype.collaborators.map((collab) => (
                  <Tooltip key={collab.id} title={collab.name}>
                    <Avatar style={{ backgroundColor: collab.color }}>
                      {collab.name.charAt(0).toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ))}
              </Avatar.Group>
            </Space>
          }
        />
      </Card>

      {shareModalOpen && (
        <ShareSettingsModal prototype={prototype} onClose={() => setShareModalOpen(false)} />
      )}
    </>
  );
}

export function Collaborate() {
  const { publishedPrototypes } = useMultiplayerStore();
  const { screens } = useScreensStore();
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<{
    id: string;
    name: string;
    filePath: string;
  } | null>(null);

  const handlePublishClick = () => {
    if (screens.length === 0) {
      message.info('No screens available. Capture some screens first.');
      return;
    }
    // For now, show a selection modal or use first screen
    // In production, this would come from the editor or screens page
    setPublishModalOpen(true);
  };

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
            Collaborate
          </Title>
          <Text type="secondary">
            {publishedPrototypes.length} published prototype
            {publishedPrototypes.length !== 1 ? 's' : ''}
          </Text>
        </div>
        <Button type="primary" icon={<ShareAltOutlined />} onClick={handlePublishClick}>
          Publish Prototype
        </Button>
      </div>

      {/* Info Card */}
      <Card
        size="small"
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
        }}
      >
        <Space>
          <TeamOutlined style={{ color: '#764ba2', fontSize: 18 }} />
          <div>
            <Text strong>Real-time collaboration:</Text>
            <Text style={{ marginLeft: 8 }}>
              Publish prototypes to share with your team. Collaborators can view, comment, and
              provide feedback in real-time.
            </Text>
          </div>
        </Space>
      </Card>

      {/* Published Prototypes */}
      {publishedPrototypes.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No published prototypes"
        >
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            Publish a prototype to start collaborating with your team
          </Text>
          <Button type="primary" icon={<ShareAltOutlined />} onClick={handlePublishClick}>
            Publish Your First Prototype
          </Button>
        </Empty>
      ) : (
        <Row gutter={[16, 16]}>
          {publishedPrototypes.map((prototype) => (
            <Col key={prototype.id} xs={24} sm={12} md={8} lg={6}>
              <PrototypeCard prototype={prototype} />
            </Col>
          ))}
        </Row>
      )}

      {/* Publish Modal - simplified for demo */}
      <Modal
        open={publishModalOpen}
        onCancel={() => setPublishModalOpen(false)}
        title="Select Screen to Publish"
        footer={null}
      >
        {screens.length === 0 ? (
          <Empty description="No screens available" />
        ) : (
          <div style={{ maxHeight: 400, overflow: 'auto' }}>
            {screens.map((screen) => (
              <Card
                key={screen.id}
                size="small"
                hoverable
                style={{ marginBottom: 8, cursor: 'pointer' }}
                onClick={() => {
                  setSelectedScreen({
                    id: screen.id,
                    name: screen.name,
                    filePath: screen.filePath,
                  });
                  setPublishModalOpen(false);
                }}
              >
                <Space>
                  <div
                    style={{
                      width: 60,
                      height: 40,
                      background: '#f0f0f0',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <iframe
                      src={screen.filePath}
                      style={{
                        width: '200%',
                        height: '200%',
                        transform: 'scale(0.25)',
                        transformOrigin: 'top left',
                        pointerEvents: 'none',
                        border: 'none',
                      }}
                      title={screen.name}
                    />
                  </div>
                  <Text>{screen.name}</Text>
                </Space>
              </Card>
            ))}
          </div>
        )}
      </Modal>

      {selectedScreen && (
        <PublishModal
          open={true}
          onClose={() => setSelectedScreen(null)}
          screenId={selectedScreen.id}
          screenName={selectedScreen.name}
          filePath={selectedScreen.filePath}
        />
      )}
    </div>
  );
}
