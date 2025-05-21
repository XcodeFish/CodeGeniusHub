import React from 'react';
import { Form, Input, Button, message, Card, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, EyeOutlined, EyeInvisibleOutlined, RobotOutlined, CustomerServiceOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/modules/auth/useAuth';
import styles from '@/styles/Login.module.scss';

/**
 * 注册表单组件
 */
const RegisterForm: React.FC = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { loading, register } = useAuth();

  // 提交表单
  const handleSubmit = async (values: any) => {
    // 校验两次密码是否一致
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    try {
      await register({
        email: values.email,
        username: values.username,
        password: values.password,
        phone: values.phone
      });
      
      message.success('注册成功，请登录');
      router.push('/login');
    } catch (error: any) {
      console.error('注册失败:', error);
      // 错误消息已在useAuth中处理
    }
  };

  return (
    <>
      <Card className={styles.loginBox}>
        <div className={styles.loginHeader}>
          <h1>AI 智能代码生成与协作平台</h1>
        </div>
        <Form
          form={form}
          name="register"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
          requiredMark={false}
          validateTrigger={['onChange', 'onBlur']}
        >
          <Form.Item
            name="email"
            className={styles.formItem}
            validateFirst={true}
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="请输入邮箱" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="username"
            className={styles.formItem}
            validateFirst={true}
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度在3-20个字符之间' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="请输入用户名" 
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            className={styles.formItem}
            validateFirst={true}
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度至少为 6 位' },
              { max: 20, message: '密码长度不能超过 20 位' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^]{6,20}$/,
                message: '密码必须包含大小写字母和数字'
              }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="请输入密码" 
              size="large"
              iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            className={styles.formItem}
            validateFirst={true}
            rules={[
              { required: true, message: '请确认密码' },
              { min: 6, message: '密码长度至少为 6 位' },
              { max: 20, message: '密码长度不能超过 20 位' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[^]{6,20}$/,
                message: '密码必须包含大小写字母和数字'
              }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="请确认密码" 
              size="large"
              iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            className={styles.formItem}
            validateFirst={true}
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号码', validateTrigger: 'onBlur' }
            ]}
          >
            <Input 
              prefix={<PhoneOutlined />} 
              placeholder="请输入手机号（选填）" 
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              className={styles.submitButton}
              size="large"
            >
              注 册
            </Button>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <span style={{ marginRight: '8px', color: '#666' }}>已有账号？</span>
              <Link href="/login" className={styles.forgotLink}>
                立即登录
              </Link>
            </div>
          </Form.Item>
        </Form>
      </Card>
      
      {/* 右下角客服入口 */}
      <div className={styles.helpButtons}>
        <div className={`${styles.helpButton} ${styles.dark}`}>
          <RobotOutlined />
        </div>
        <div className={`${styles.helpButton} ${styles.primary}`}>
          <CustomerServiceOutlined />
        </div>
      </div>
    </>
  );
};

export default RegisterForm; 