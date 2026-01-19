import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout, AuthLayout } from '@/layouts';
import {
  Dashboard,
  Users,
  Login,
  Screens,
  Components,
  Editor,
  Variants,
  Context,
  Analytics,
  Collaborate,
  SharedView,
} from '@/pages';
import { useAuthStore } from '@/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const theme = {
  token: {
    colorPrimary: '#764ba2',
    borderRadius: 8,
  },
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/screens" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme}>
        <AntApp>
          <BrowserRouter>
            <Routes>
              {/* Auth routes */}
              <Route
                element={
                  <PublicRoute>
                    <AuthLayout />
                  </PublicRoute>
                }
              >
                <Route path="/login" element={<Login />} />
              </Route>

              {/* Protected routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* Redirect root to screens */}
                <Route path="/" element={<Navigate to="/screens" replace />} />

                {/* Main Voxel Routes */}
                <Route path="/screens" element={<Screens />} />
                <Route path="/components" element={<Components />} />
                <Route path="/editor/:screenId" element={<Editor />} />
                <Route path="/variants/:screenId" element={<Variants />} />
                <Route path="/context" element={<Context />} />
                <Route path="/collaborate" element={<Collaborate />} />
                <Route path="/analytics" element={<Analytics />} />

                {/* Legacy routes (can be removed) */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<Users />} />
              </Route>

              {/* Shared view (public) */}
              <Route path="/view/:shareLink" element={<SharedView />} />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/screens" replace />} />
            </Routes>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
