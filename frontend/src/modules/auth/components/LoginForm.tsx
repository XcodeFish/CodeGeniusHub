import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Checkbox, Card, Space } from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined, EyeOutlined, EyeInvisibleOutlined, RobotOutlined, CustomerServiceOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '@/modules/auth/useAuth';
import styles from '@/styles/Login.module.scss';
import { svgToDataUri } from '@/utils/svg-util';
import messageUtil from '@/utils/message-util';
import { useMenu } from '@/hooks/useMenu';
import { getToken } from '@/utils/token-util';
import { useUserStore } from '@/stores/userStore';

/**
 * 登录表单组件
 */
const LoginForm: React.FC = () => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { loading, captchaImg, getCaptcha, login } = useAuth();
  const [remember, setRemember] = useState(false);
  const { fetchMenus } = useMenu();
  const [shouldGetCaptcha, setShouldGetCaptcha] = useState(false);

  // 延迟检查登录状态并决定是否获取验证码
  useEffect(() => {
    // 设置一个检查函数
    const checkAuthStatus = () => {
      const token = getToken();
      const user = useUserStore.getState().user;
      
      // 如果没有token或用户信息不存在，标记需要获取验证码
      if (!token || !user || !user.id) {
        console.log('未检测到有效登录状态，需要获取验证码');
        setShouldGetCaptcha(true);
      } else {
        console.log('检测到有效登录状态，不需要获取验证码');
        router.replace('/dashboard'); // 如果有登录状态，直接重定向到仪表盘
      }
    };
    
    // 延迟执行检查，给autoLogin足够的时间完成
    const timer = setTimeout(checkAuthStatus, 800);
    
    // 清理函数
    return () => clearTimeout(timer);
  }, [router]);

  // 当shouldGetCaptcha状态变为true时，获取验证码
  useEffect(() => {
    if (shouldGetCaptcha) {
      getCaptcha();
    }
  }, [shouldGetCaptcha, getCaptcha]);

  // 刷新验证码
  const refreshCaptcha = () => {
    if (loading) return;
    
    getCaptcha().catch(err => {
      // 错误已由请求拦截器统一处理，这里不需要额外处理
      console.error('获取验证码失败:', err);
    });
  };

  // 提交表单
  const handleSubmit = async (values: any) => {
    try {
      const loginResult = await login({
        identifier: values.identifier,
        password: values.password,
        captchaCode: values.captcha,
        remember
      });

      // 登录成功后立即获取菜单数据
      await fetchMenus();

      messageUtil.success('登录成功');
      
      // 立即跳转到首页，不等待其他请求完成
      // 使用replace而不是push，防止返回到登录页
      router.replace('/dashboard');
    } catch (error: any) {
      console.error('登录失败:', error);
      // 登录失败时不做任何导航，保持在登录页面
    }
  };

  // 计算验证码按钮样式
  const captchaButtonStyle = {
    cursor: loading ? 'not-allowed' : 'pointer',
    position: 'relative' as const
  };

  return (
    <>
      <Card className={styles.loginBox}>
        <div className={styles.loginHeader}>
          <h1>AI 智能代码生成与协作平台</h1>
        </div>
        <Form
          form={form}
          name="login"
          onFinish={handleSubmit}
          autoComplete="off"
          layout="vertical"
          requiredMark={false}
          validateTrigger={['onChange', 'onBlur']}
        >
          <Form.Item
            name="identifier"
            validateFirst={true}
            className={styles.formItem}
            rules={[
              { required: true, message: '请输入账号/手机号/邮箱' },
              { min: 4, message: '账号长度至少为 4 位' },
              { max: 50, message: '账号长度不能超过 50 位' },
              {
                pattern: /^(?:[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+|1[3-9]\d{9}|[a-zA-Z][a-zA-Z0-9_-]{3,15})$/,
                message: '请输入正确的账号/手机号/邮箱'
              }
            ]}
          >
            <Input
              size="large"
              placeholder="请输入账号/手机号/邮箱"
              prefix={<UserOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="password"
            validateFirst={true}
            className={styles.formItem}
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码长度至少为 6 位' },
              { max: 12, message: '密码长度不能超过 12 位' },
              {
                pattern: /^(?=.*[a-z])(?=.*\d)[^]{6,12}$/,
                message: '密码必须包含字母和数字'
              }
            ]}
          >
            <Input.Password
              size="large"
              placeholder="请输入密码"
              prefix={<LockOutlined />}
              iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            />
          </Form.Item>

          <Form.Item
            name="captcha"
            validateFirst={true}
            className={styles.formItem}
            rules={[
              { required: true, message: '请输入验证码' },
              { len: 6, message: '验证码长度必须为 6 位' },
              {
                pattern: /^[a-zA-Z0-9]{6}$/,
                message: '验证码只能包含字母和数字'
              }
            ]}
          >
            <Space.Compact className={styles.captchaRow}>
              <Input
                size="large"
                placeholder="请输入验证码"
                prefix={<SafetyCertificateOutlined />}
                className={styles.captchaInput}
                maxLength={6}
              />
              <div
                className={styles.captchaImg}
                onClick={refreshCaptcha}
                style={captchaButtonStyle}
              >
                {captchaImg ? (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={svgToDataUri(captchaImg)} 
                      alt="验证码" 
                      className={styles.captchaImg}
                    />
                  </div>
                ) : (
                  <div>
                    {loading ? '加载中...' : '点击获取验证码'}
                  </div>
                )}
              </div>
            </Space.Compact>
          </Form.Item>

          <Form.Item>
            <div className={styles.rememberRow}>
              <Checkbox 
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              >
                记住我
              </Checkbox>
              <div>
                <Link href="/forgot-password" className={styles.forgotLink}>
                  忘记密码？
                </Link>
                <Link href="/register" className={styles.registerLink}>
                  注册用户
                </Link>
              </div>
            </div>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              className={styles.submitButton}
              size="large"
            >
              登 录
            </Button>
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

export default LoginForm;