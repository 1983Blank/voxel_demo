import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Comment {
  id: string;
  prototypeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string; // For threaded replies
  position?: {
    x: number;
    y: number;
  };
  resolved: boolean;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  role: 'owner' | 'editor' | 'viewer';
  isOnline: boolean;
  lastSeen: string;
  cursor?: {
    x: number;
    y: number;
  };
}

export interface PublishedPrototype {
  id: string;
  screenId: string;
  variantId?: string;
  name: string;
  html: string;
  publishedAt: string;
  updatedAt: string;
  publishedBy: string;
  shareLink: string;
  isPublic: boolean;
  allowComments: boolean;
  collaborators: Collaborator[];
  viewCount: number;
}

interface MultiplayerState {
  publishedPrototypes: PublishedPrototype[];
  comments: Comment[];
  currentUser: Collaborator | null;
  activePrototypeId: string | null;

  // Published prototypes actions
  publishPrototype: (
    screenId: string,
    name: string,
    html: string,
    variantId?: string
  ) => PublishedPrototype;
  unpublishPrototype: (id: string) => void;
  updatePrototype: (id: string, updates: Partial<PublishedPrototype>) => void;
  getPrototype: (id: string) => PublishedPrototype | undefined;
  getPrototypeByShareLink: (shareLink: string) => PublishedPrototype | undefined;

  // Collaborator actions
  addCollaborator: (prototypeId: string, collaborator: Omit<Collaborator, 'id' | 'isOnline' | 'lastSeen'>) => void;
  removeCollaborator: (prototypeId: string, collaboratorId: string) => void;
  updateCollaboratorRole: (prototypeId: string, collaboratorId: string, role: Collaborator['role']) => void;
  setCurrentUser: (user: Collaborator | null) => void;

  // Comment actions
  addComment: (
    prototypeId: string,
    content: string,
    position?: { x: number; y: number },
    parentId?: string
  ) => Comment;
  updateComment: (commentId: string, content: string) => void;
  deleteComment: (commentId: string) => void;
  resolveComment: (commentId: string) => void;
  getCommentsForPrototype: (prototypeId: string) => Comment[];
  getReplies: (commentId: string) => Comment[];

  // Active state
  setActivePrototype: (id: string | null) => void;

  // Mock presence
  simulatePresence: (prototypeId: string) => void;
}

const COLLABORATOR_COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#eb2f96',
  '#722ed1',
  '#13c2c2',
  '#fa541c',
  '#2f54eb',
];

// Mock users for simulation
const MOCK_USERS: Omit<Collaborator, 'id' | 'isOnline' | 'lastSeen' | 'role'>[] = [
  { name: 'Alex Chen', email: 'alex@company.com', color: '#1890ff' },
  { name: 'Sarah Miller', email: 'sarah@company.com', color: '#52c41a' },
  { name: 'James Wilson', email: 'james@company.com', color: '#eb2f96' },
  { name: 'Emma Davis', email: 'emma@company.com', color: '#722ed1' },
];

const generateShareLink = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const useMultiplayerStore = create<MultiplayerState>()(
  persist(
    (set, get) => ({
      publishedPrototypes: [],
      comments: [],
      currentUser: {
        id: 'user-current',
        name: 'You',
        email: 'you@company.com',
        color: '#1890ff',
        role: 'owner',
        isOnline: true,
        lastSeen: new Date().toISOString(),
      },
      activePrototypeId: null,

      publishPrototype: (screenId, name, html, variantId) => {
        const now = new Date().toISOString();
        const currentUser = get().currentUser;

        const prototype: PublishedPrototype = {
          id: `pub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          screenId,
          variantId,
          name,
          html,
          publishedAt: now,
          updatedAt: now,
          publishedBy: currentUser?.name || 'Unknown',
          shareLink: generateShareLink(),
          isPublic: false,
          allowComments: true,
          collaborators: currentUser ? [{ ...currentUser, role: 'owner' }] : [],
          viewCount: 0,
        };

        set((state) => ({
          publishedPrototypes: [...state.publishedPrototypes, prototype],
        }));

        return prototype;
      },

      unpublishPrototype: (id) => {
        set((state) => ({
          publishedPrototypes: state.publishedPrototypes.filter((p) => p.id !== id),
          comments: state.comments.filter((c) => c.prototypeId !== id),
        }));
      },

      updatePrototype: (id, updates) => {
        set((state) => ({
          publishedPrototypes: state.publishedPrototypes.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      getPrototype: (id) => {
        return get().publishedPrototypes.find((p) => p.id === id);
      },

      getPrototypeByShareLink: (shareLink) => {
        return get().publishedPrototypes.find((p) => p.shareLink === shareLink);
      },

      addCollaborator: (prototypeId, collaborator) => {
        const newCollaborator: Collaborator = {
          ...collaborator,
          id: `collab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          isOnline: false,
          lastSeen: new Date().toISOString(),
        };

        set((state) => ({
          publishedPrototypes: state.publishedPrototypes.map((p) =>
            p.id === prototypeId
              ? { ...p, collaborators: [...p.collaborators, newCollaborator] }
              : p
          ),
        }));
      },

      removeCollaborator: (prototypeId, collaboratorId) => {
        set((state) => ({
          publishedPrototypes: state.publishedPrototypes.map((p) =>
            p.id === prototypeId
              ? {
                  ...p,
                  collaborators: p.collaborators.filter((c) => c.id !== collaboratorId),
                }
              : p
          ),
        }));
      },

      updateCollaboratorRole: (prototypeId, collaboratorId, role) => {
        set((state) => ({
          publishedPrototypes: state.publishedPrototypes.map((p) =>
            p.id === prototypeId
              ? {
                  ...p,
                  collaborators: p.collaborators.map((c) =>
                    c.id === collaboratorId ? { ...c, role } : c
                  ),
                }
              : p
          ),
        }));
      },

      setCurrentUser: (user) => {
        set({ currentUser: user });
      },

      addComment: (prototypeId, content, position, parentId) => {
        const currentUser = get().currentUser;
        const now = new Date().toISOString();

        const comment: Comment = {
          id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          prototypeId,
          userId: currentUser?.id || 'anonymous',
          userName: currentUser?.name || 'Anonymous',
          userAvatar: currentUser?.avatar,
          content,
          createdAt: now,
          updatedAt: now,
          parentId,
          position,
          resolved: false,
        };

        set((state) => ({
          comments: [...state.comments, comment],
        }));

        return comment;
      },

      updateComment: (commentId, content) => {
        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === commentId
              ? { ...c, content, updatedAt: new Date().toISOString() }
              : c
          ),
        }));
      },

      deleteComment: (commentId) => {
        set((state) => ({
          // Delete comment and all its replies
          comments: state.comments.filter(
            (c) => c.id !== commentId && c.parentId !== commentId
          ),
        }));
      },

      resolveComment: (commentId) => {
        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === commentId ? { ...c, resolved: !c.resolved } : c
          ),
        }));
      },

      getCommentsForPrototype: (prototypeId) => {
        return get()
          .comments.filter((c) => c.prototypeId === prototypeId && !c.parentId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getReplies: (commentId) => {
        return get()
          .comments.filter((c) => c.parentId === commentId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      },

      setActivePrototype: (id) => {
        set({ activePrototypeId: id });
      },

      simulatePresence: (prototypeId) => {
        // Simulate random collaborators coming online
        const prototype = get().getPrototype(prototypeId);
        if (!prototype) return;

        // Add some mock collaborators if none exist
        if (prototype.collaborators.length <= 1) {
          const randomUsers = MOCK_USERS.slice(0, Math.floor(Math.random() * 3) + 1);
          randomUsers.forEach((user, index) => {
            get().addCollaborator(prototypeId, {
              ...user,
              color: COLLABORATOR_COLORS[index + 1],
              role: index === 0 ? 'editor' : 'viewer',
            });
          });
        }

        // Randomly toggle online status
        set((state) => ({
          publishedPrototypes: state.publishedPrototypes.map((p) =>
            p.id === prototypeId
              ? {
                  ...p,
                  collaborators: p.collaborators.map((c, i) =>
                    i > 0 // Don't change current user
                      ? {
                          ...c,
                          isOnline: Math.random() > 0.5,
                          lastSeen: new Date().toISOString(),
                          cursor: c.isOnline
                            ? {
                                x: Math.random() * 800,
                                y: Math.random() * 600,
                              }
                            : undefined,
                        }
                      : c
                  ),
                }
              : p
          ),
        }));
      },
    }),
    {
      name: 'voxel-multiplayer-storage',
      partialize: (state) => ({
        publishedPrototypes: state.publishedPrototypes,
        comments: state.comments,
      }),
    }
  )
);

// Helper to get avatar color
export const getAvatarColor = (name: string): string => {
  const index = name.charCodeAt(0) % COLLABORATOR_COLORS.length;
  return COLLABORATOR_COLORS[index];
};

// Helper to format relative time
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
};
