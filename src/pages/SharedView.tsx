import { useState, useEffect, useRef } from 'react';
import {
  Typography,
  Button,
  Space,
  Avatar,
  Input,
  Badge,
  Tooltip,
  Empty,
  Drawer,
  Divider,
  Switch,
  Tag,
} from 'antd';
import {
  CommentOutlined,
  SendOutlined,
  ArrowLeftOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useMultiplayerStore,
  formatRelativeTime,
  type Comment,
} from '@/store/multiplayerStore';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

// Comment component for the sidebar
function CommentItem({
  comment,
  prototypeId,
}: {
  comment: Comment;
  prototypeId: string;
}) {
  const { addComment, deleteComment, resolveComment, getReplies, currentUser } =
    useMultiplayerStore();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');

  const replies = getReplies(comment.id);
  const isOwner = currentUser?.id === comment.userId;

  const handleReply = () => {
    if (!replyText.trim()) return;
    addComment(prototypeId, replyText, undefined, comment.id);
    setReplyText('');
    setIsReplying(false);
  };

  return (
    <div
      style={{
        padding: 12,
        borderRadius: 8,
        background: comment.resolved ? '#f6ffed' : '#fafafa',
        marginBottom: 12,
        opacity: comment.resolved ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <Space>
          <Avatar size="small" style={{ backgroundColor: '#1890ff' }}>
            {comment.userName.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ fontSize: 13 }}>
              {comment.userName}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {formatRelativeTime(comment.createdAt)}
            </Text>
          </div>
        </Space>
        <Space size={4}>
          {comment.resolved && <Tag color="success" style={{ margin: 0 }}>Resolved</Tag>}
          <Tooltip title={comment.resolved ? 'Reopen' : 'Resolve'}>
            <Button
              type="text"
              size="small"
              icon={comment.resolved ? <CloseOutlined /> : <CheckOutlined />}
              onClick={() => resolveComment(comment.id)}
            />
          </Tooltip>
          {isOwner && (
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => deleteComment(comment.id)}
              />
            </Tooltip>
          )}
        </Space>
      </div>

      <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 13 }}>
        {comment.content}
      </Paragraph>

      {/* Position indicator */}
      {comment.position && (
        <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
          📍 Position: ({Math.round(comment.position.x)}, {Math.round(comment.position.y)})
        </Text>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div style={{ marginTop: 12, paddingLeft: 12, borderLeft: '2px solid #e8e8e8' }}>
          {replies.map((reply) => (
            <div key={reply.id} style={{ marginBottom: 8 }}>
              <Space size={8}>
                <Avatar size={20} style={{ backgroundColor: '#52c41a', fontSize: 10 }}>
                  {reply.userName.charAt(0).toUpperCase()}
                </Avatar>
                <div>
                  <Text strong style={{ fontSize: 12 }}>
                    {reply.userName}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 10, marginLeft: 6 }}>
                    {formatRelativeTime(reply.createdAt)}
                  </Text>
                </div>
              </Space>
              <Paragraph style={{ margin: '4px 0 0 28px', fontSize: 12 }}>
                {reply.content}
              </Paragraph>
            </div>
          ))}
        </div>
      )}

      {/* Reply Input */}
      {isReplying ? (
        <div style={{ marginTop: 12 }}>
          <TextArea
            placeholder="Write a reply..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            autoSize={{ minRows: 2 }}
            autoFocus
          />
          <Space style={{ marginTop: 8 }}>
            <Button size="small" onClick={() => setIsReplying(false)}>
              Cancel
            </Button>
            <Button type="primary" size="small" onClick={handleReply}>
              Reply
            </Button>
          </Space>
        </div>
      ) : (
        <Button
          type="link"
          size="small"
          onClick={() => setIsReplying(true)}
          style={{ padding: 0, marginTop: 8 }}
        >
          Reply
        </Button>
      )}
    </div>
  );
}

export function SharedView() {
  const { shareLink } = useParams<{ shareLink: string }>();
  const navigate = useNavigate();
  const {
    getPrototypeByShareLink,
    updatePrototype,
    addComment,
    getCommentsForPrototype,
    simulatePresence,
  } = useMultiplayerStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentMode, setCommentMode] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const prototype = shareLink ? getPrototypeByShareLink(shareLink) : undefined;

  // Simulate presence on mount
  useEffect(() => {
    if (prototype) {
      // Increment view count
      updatePrototype(prototype.id, { viewCount: prototype.viewCount + 1 });

      // Simulate other users
      simulatePresence(prototype.id);

      // Simulate presence updates every 10 seconds
      const interval = setInterval(() => {
        simulatePresence(prototype.id);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [prototype?.id]);

  if (!prototype) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <Empty description="Prototype not found">
          <Button type="primary" onClick={() => navigate('/collaborate')}>
            Go to Collaborate
          </Button>
        </Empty>
      </div>
    );
  }

  const comments = getCommentsForPrototype(prototype.id);
  const filteredComments = showResolved
    ? comments
    : comments.filter((c) => !c.resolved);
  const onlineCollaborators = prototype.collaborators.filter((c) => c.isOnline);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment(prototype.id, newComment);
    setNewComment('');
  };

  const handleIframeClick = (e: React.MouseEvent) => {
    if (!commentMode || !prototype.allowComments) return;

    const rect = iframeRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const comment = prompt('Add a comment at this position:');
    if (comment) {
      addComment(prototype.id, comment, { x, y });
    }
    setCommentMode(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'white',
        }}
      >
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/collaborate')}
          />
          <Text strong>{prototype.name}</Text>
          <Tag>{prototype.isPublic ? 'Public' : 'Private'}</Tag>
        </Space>

        <Space>
          {/* Online collaborators */}
          {onlineCollaborators.length > 0 && (
            <Space size={-8}>
              <Avatar.Group maxCount={5} size="small">
                {onlineCollaborators.map((collab) => (
                  <Tooltip key={collab.id} title={`${collab.name} (online)`}>
                    <Badge dot status="success" offset={[-4, 28]}>
                      <Avatar style={{ backgroundColor: collab.color }} size="small">
                        {collab.name.charAt(0).toUpperCase()}
                      </Avatar>
                    </Badge>
                  </Tooltip>
                ))}
              </Avatar.Group>
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                {onlineCollaborators.length} online
              </Text>
            </Space>
          )}

          <Divider type="vertical" />

          {prototype.allowComments && (
            <Tooltip title="Click on prototype to add comment">
              <Button
                type={commentMode ? 'primary' : 'default'}
                icon={<CommentOutlined />}
                onClick={() => setCommentMode(!commentMode)}
              >
                Add Pin
              </Button>
            </Tooltip>
          )}

          <Button
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
          />

          <Button
            type={sidebarOpen ? 'primary' : 'default'}
            icon={<CommentOutlined />}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {comments.length}
          </Button>
        </Space>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Prototype viewer */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            background: '#f5f5f5',
            overflow: 'auto',
          }}
          onClick={handleIframeClick}
        >
          {/* Cursor overlay for comment mode */}
          {commentMode && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                cursor: 'crosshair',
                zIndex: 10,
                background: 'rgba(102, 126, 234, 0.05)',
              }}
            />
          )}

          {/* Simulated cursors */}
          {onlineCollaborators
            .filter((c) => c.cursor && c.id !== 'user-current')
            .map((collab) => (
              <div
                key={collab.id}
                style={{
                  position: 'absolute',
                  left: collab.cursor!.x,
                  top: collab.cursor!.y + 60, // Offset for header
                  zIndex: 20,
                  pointerEvents: 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill={collab.color}>
                  <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87a.5.5 0 00.35-.85L6.35 2.86a.5.5 0 00-.85.35z" />
                </svg>
                <span
                  style={{
                    background: collab.color,
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: 11,
                    marginLeft: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {collab.name}
                </span>
              </div>
            ))}

          {/* Comment pins on the prototype */}
          {comments
            .filter((c) => c.position && !c.resolved)
            .map((comment, index) => (
              <Tooltip
                key={comment.id}
                title={
                  <div>
                    <Text style={{ color: 'white' }} strong>
                      {comment.userName}
                    </Text>
                    <br />
                    {comment.content.substring(0, 50)}
                    {comment.content.length > 50 && '...'}
                  </div>
                }
              >
                <div
                  style={{
                    position: 'absolute',
                    left: comment.position!.x,
                    top: comment.position!.y + 60,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: '#1890ff',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    zIndex: 15,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSidebarOpen(true);
                  }}
                >
                  {index + 1}
                </div>
              </Tooltip>
            ))}

          <iframe
            ref={iframeRef}
            src={prototype.html}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: 'white',
            }}
            title={prototype.name}
          />
        </div>

        {/* Comments sidebar */}
        <Drawer
          title={
            <Space>
              <CommentOutlined />
              Comments ({comments.length})
            </Space>
          }
          placement="right"
          onClose={() => setSidebarOpen(false)}
          open={sidebarOpen}
          mask={false}
          width={360}
          styles={{ body: { padding: 16 } }}
          extra={
            <Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Show resolved
              </Text>
              <Switch
                size="small"
                checked={showResolved}
                onChange={setShowResolved}
              />
            </Space>
          }
        >
          {/* New comment input */}
          {prototype.allowComments && (
            <div style={{ marginBottom: 16 }}>
              <TextArea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                autoSize={{ minRows: 2, maxRows: 4 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                style={{ marginTop: 8 }}
                block
              >
                Post Comment
              </Button>
            </div>
          )}

          <Divider style={{ margin: '12px 0' }} />

          {/* Comments list */}
          {filteredComments.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                showResolved ? 'No comments yet' : 'No unresolved comments'
              }
            />
          ) : (
            filteredComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                prototypeId={prototype.id}
              />
            ))
          )}
        </Drawer>
      </div>
    </div>
  );
}
