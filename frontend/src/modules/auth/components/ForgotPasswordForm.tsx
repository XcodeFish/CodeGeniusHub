import React, { useState } from 'react';
import { Form, Input, Button, message, Steps, Card } from 'antd';
import { MailOutlined, LockOutlined, SafetyOutlined, EyeOutlined, EyeInvisibleOutlined, RobotOutlined, CustomerServiceOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/modules/auth/useAuth';
import styles from '@/styles/Login.module.scss';

/**
 * 忘记密码表单组件
 */
const ForgotPasswordForm: React.FC = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { loading, forgotPassword, resetPassword } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState('');

  // 发送验证码
  const handleSendCode = async (values: { email: string }) => {
    try {
      setEmail(values.email);
      await forgotPassword(values.email);
      setCurrentStep(1);
      message.success('验证码已发送到您的邮箱');
    } catch (error) {
      console.error('发送验证码失败:', error);
      // 错误消息已在useAuth中处理
    }
  };

  // 重置密码
  const handleResetPassword = async (values: { verifyCode: string; password: string; confirmPassword: string }) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }

    try {
      await resetPassword(email, values.verifyCode, values.password);
      message.success('密码重置成功，请登录');
      router.push('/login');
    } catch (error) {
      console.error('重置密码失败:', error);
      // 错误消息已在useAuth中处理
    }
  };

  return (
    <>
      <Card className={styles.loginBox}>
        <div className={styles.loginHeader}>
          <h1>AI 智能代码生成与协作平台</h1>
        </div>
        <Steps
          current={currentStep}
          items={[
            {
              title: '发送验证码',
              description: '验证邮箱',
            },
            {
              title: '重置密码',
              description: '输入新密码',
            },
          ]}
          style={{ marginBottom: 30 }}
        />

        {currentStep === 0 && (
          <Form
            form={form}
            name="forgotPassword"
            onFinish={handleSendCode}
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

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                className={styles.submitButton}
                size="large"
              >
                发送验证码
              </Button>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link href="/login" className={styles.forgotLink}>
                  返回登录
                </Link>
              </div>
            </Form.Item>
          </Form>
        )}

        {currentStep === 1 && (
          <Form
            form={form}
            name="resetPassword"
            onFinish={handleResetPassword}
            autoComplete="off"
            layout="vertical"
            requiredMark={false}
            validateTrigger={['onChange', 'onBlur']}
          >
            <Form.Item
              name="verifyCode"
              className={styles.formItem}
              validateFirst={true}
              rules={[
                { required: true, message: '请输入验证码' },
                { len: 6, message: '验证码长度必须为 6 位' }
              ]}
            >
              <Input 
                prefix={<SafetyOutlined />} 
                placeholder="请输入验证码" 
                size="large"
                maxLength={6}
              />
            </Form.Item>

            <Form.Item
              name="password"
              className={styles.formItem}
              validateFirst={true}
              rules={[
                { required: true, message: '请输入新密码' },
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
                placeholder="请输入新密码" 
                size="large"
                iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              className={styles.formItem}
              validateFirst={true}
              rules={[
                { required: true, message: '请确认新密码' },
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
                placeholder="请确认新密码" 
                size="large"
                iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
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
                重置密码
              </Button>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Button 
                  type="link" 
                  onClick={() => {
                    setCurrentStep(0);
                    form.resetFields();
                  }}
                  style={{ marginRight: '16px' }}
                >
                  返回上一步
                </Button>
                <Link href="/login" className={styles.forgotLink}>
                  返回登录
                </Link>
              </div>
            </Form.Item>
          </Form>
        )}
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

export default ForgotPasswordForm; 