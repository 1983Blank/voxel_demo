import { useState } from 'react';
import { Form, Input, Button, message, Typography } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const { Text } = Typography;

export function Login() {
  const navigate = useNavigate();
  const { loginWithEmail } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setIsLoading(true);
    const { error } = await loginWithEmail(email, password);
    setIsLoading(false);

    if (error) {
      message.error(error);
    } else {
      message.success('Login successful!');
      navigate('/screens');
    }
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit}>
      <Form.Item
        label="Email"
        validateStatus={errors.email ? 'error' : ''}
        help={errors.email}
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="Enter your email"
          size="large"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Form.Item>

      <Form.Item
        label="Password"
        validateStatus={errors.password ? 'error' : ''}
        help={errors.password}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="Enter your password"
          size="large"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          block
          loading={isLoading}
        >
          Sign In
        </Button>
      </Form.Item>

      <div style={{ textAlign: 'center' }}>
        <Text type="secondary">
          Contact your administrator to get an account.
        </Text>
      </div>
    </Form>
  );
}
