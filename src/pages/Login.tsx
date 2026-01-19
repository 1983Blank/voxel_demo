import { useState } from 'react';
import { Form, Input, Button, message, Divider, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';

const { Text } = Typography;

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = loginSchema.extend({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignUpFormData = z.infer<typeof signUpSchema>;

export function Login() {
  const navigate = useNavigate();
  const { loginWithEmail, signUpWithEmail, loginWithProvider } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
    },
  });

  const onLogin = async (data: LoginFormData) => {
    const { error } = await loginWithEmail(data.email, data.password);

    if (error) {
      message.error(error);
    } else {
      message.success('Login successful!');
      navigate('/screens');
    }
  };

  const onSignUp = async (data: SignUpFormData) => {
    const { error } = await signUpWithEmail(data.email, data.password, data.name);

    if (error) {
      message.error(error);
    } else {
      message.success('Account created! You can now sign in.');
      setIsSignUp(false);
      loginForm.setValue('email', data.email);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await loginWithProvider('google');
    if (error) {
      message.error(error);
    }
  };

  const handleGithubLogin = async () => {
    const { error } = await loginWithProvider('github');
    if (error) {
      message.error(error);
    }
  };

  if (isSignUp) {
    return (
      <Form layout="vertical" onFinish={signUpForm.handleSubmit(onSignUp)}>
        <Form.Item
          label="Name"
          validateStatus={signUpForm.formState.errors.name ? 'error' : ''}
          help={signUpForm.formState.errors.name?.message}
        >
          <Controller
            name="name"
            control={signUpForm.control}
            render={({ field }) => (
              <Input
                {...field}
                prefix={<UserOutlined />}
                placeholder="Enter your name"
                size="large"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Email"
          validateStatus={signUpForm.formState.errors.email ? 'error' : ''}
          help={signUpForm.formState.errors.email?.message}
        >
          <Controller
            name="email"
            control={signUpForm.control}
            render={({ field }) => (
              <Input
                {...field}
                prefix={<MailOutlined />}
                placeholder="Enter your email"
                size="large"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Password"
          validateStatus={signUpForm.formState.errors.password ? 'error' : ''}
          help={signUpForm.formState.errors.password?.message}
        >
          <Controller
            name="password"
            control={signUpForm.control}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined />}
                placeholder="Create a password"
                size="large"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label="Confirm Password"
          validateStatus={signUpForm.formState.errors.confirmPassword ? 'error' : ''}
          help={signUpForm.formState.errors.confirmPassword?.message}
        >
          <Controller
            name="confirmPassword"
            control={signUpForm.control}
            render={({ field }) => (
              <Input.Password
                {...field}
                prefix={<LockOutlined />}
                placeholder="Confirm your password"
                size="large"
              />
            )}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={signUpForm.formState.isSubmitting}
          >
            Create Account
          </Button>
        </Form.Item>

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Already have an account? </Text>
          <Button type="link" onClick={() => setIsSignUp(false)} style={{ padding: 0 }}>
            Sign in
          </Button>
        </div>
      </Form>
    );
  }

  return (
    <Form layout="vertical" onFinish={loginForm.handleSubmit(onLogin)}>
      <Form.Item
        label="Email"
        validateStatus={loginForm.formState.errors.email ? 'error' : ''}
        help={loginForm.formState.errors.email?.message}
      >
        <Controller
          name="email"
          control={loginForm.control}
          render={({ field }) => (
            <Input
              {...field}
              prefix={<MailOutlined />}
              placeholder="Enter your email"
              size="large"
            />
          )}
        />
      </Form.Item>

      <Form.Item
        label="Password"
        validateStatus={loginForm.formState.errors.password ? 'error' : ''}
        help={loginForm.formState.errors.password?.message}
      >
        <Controller
          name="password"
          control={loginForm.control}
          render={({ field }) => (
            <Input.Password
              {...field}
              prefix={<LockOutlined />}
              placeholder="Enter your password"
              size="large"
            />
          )}
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={loginForm.formState.isSubmitting}
        >
          Sign In
        </Button>
      </Form.Item>

      <Divider plain>
        <Text type="secondary">or continue with</Text>
      </Divider>

      <Form.Item>
        <Button.Group style={{ width: '100%', display: 'flex' }}>
          <Button
            size="large"
            style={{ flex: 1 }}
            onClick={handleGoogleLogin}
          >
            Google
          </Button>
          <Button
            size="large"
            style={{ flex: 1 }}
            onClick={handleGithubLogin}
          >
            GitHub
          </Button>
        </Button.Group>
      </Form.Item>

      <div style={{ textAlign: 'center' }}>
        <Text type="secondary">Don't have an account? </Text>
        <Button type="link" onClick={() => setIsSignUp(true)} style={{ padding: 0 }}>
          Sign up
        </Button>
      </div>
    </Form>
  );
}
