import React from 'react';
import { Form, Switch, Divider, Button } from 'antd';
import styles from './components.module.scss';
import messageUtil from '@/utils/message-util';

const NotificationSettings: React.FC = () => {
  const [form] = Form.useForm();
  
  const onFinish = (values: any) => {
    console.log('通知设置:', values);
    // TODO: 实际API调用
    messageUtil.success('通知设置已更新');
  };

  return (
    <div className={styles.settingsForm}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          emailNotify: true,
          commentNotify: true,
          systemNotify: false
        }}
        onFinish={onFinish}
      >
        <h3>电子邮件通知</h3>
        
        <Form.Item name="emailNotify" valuePropName="checked" label="项目邀请">
          <Switch />
        </Form.Item>
        
        <Form.Item name="commentNotify" valuePropName="checked" label="代码评论通知">
          <Switch />
        </Form.Item>
        
        <Form.Item name="systemNotify" valuePropName="checked" label="系统更新通知">
          <Switch />
        </Form.Item>
        
        <Divider />
        
        <h3>站内通知</h3>
        
        <Form.Item name="collaborationNotify" valuePropName="checked" label="协作更新通知">
          <Switch />
        </Form.Item>
        
        <Form.Item name="aiNotify" valuePropName="checked" label="AI任务完成通知">
          <Switch />
        </Form.Item>
        
        <Form.Item className={styles.submitButton}>
          <Button type="primary" htmlType="submit">保存设置</Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default NotificationSettings;