import React, { useState } from 'react';
import { Form, Input, Button, Divider,  Switch } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { changePassword } from '../../useUser'
import styles from './components.module.scss';

import messageUtil from '@/utils/message-util';
const SecurityForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await changePassword({
        oldPassword: values.currentPassword,
        newPassword: values.newPassword
      })
    } catch (error) {
      messageUtil.error('密码更新失败');
    } finally {
      setLoading(false)
    }
    
  };

  return (
    <div>
      <h3>修改密码</h3>
      <Form
        form={form}
        layout='vertical'
        onFinish={onFinish}
        className={styles.form}
      >
        <Form.Item
          label='当前密码'
          name='currentPassword'
          rules={[
            {required: true, message: '请输入当前密码'}
          ]}
        >
          <Input.Password
            prefix={< LockOutlined/>}
            placeholder='请输入当前密码'
          />
        </Form.Item>

        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码长度不能少于6个字符' }
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="请输入新密码" />
        </Form.Item>

        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致'));
              },
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="请确认新密码" />
        </Form.Item>
        
        <Form.Item className={styles.submitButton}>
          <Button type="primary" htmlType="submit" loading={loading}>
            更新密码
          </Button>
        </Form.Item>
      </Form>

      <Divider />

      <h3>账号安全</h3>
      <div className={styles.securityOption}>
        <div>
          <h4>双因素认证</h4>
          <p>使用手机验证码增强账号安全</p>
        </div>
        <Switch />
      </div>

    </div>
  );
};

export default SecurityForm;