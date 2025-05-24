import React from 'react';
import { Form, Radio, Select, Button, Divider } from 'antd';
import styles from './components.module.scss';
import messageUtil from '@/utils/message-util';

const UIPreferences: React.FC = () => {
  const [form] = Form.useForm();
  
  const onFinish = (values: any) => {
    console.log('界面偏好:', values);
    // TODO: 实际API调用
    messageUtil.success('界面偏好已更新');
  };

  return (
    <div className={styles.settingsForm}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          theme: 'light',
          primaryColor: 'blue',
          codeFont: 'Monaco',
          fontSize: 14
        }}
        onFinish={onFinish}
      >
        <h3>主题设置</h3>
        
        <Form.Item name="theme" label="界面主题">
          <Radio.Group>
            <Radio.Button value="light">浅色</Radio.Button>
            <Radio.Button value="dark">深色</Radio.Button>
            <Radio.Button value="auto">跟随系统</Radio.Button>
          </Radio.Group>
        </Form.Item>
        
        <Form.Item name="primaryColor" label="主题色">
          <Radio.Group>
            <Radio.Button value="blue">蓝色</Radio.Button>
            <Radio.Button value="green">绿色</Radio.Button>
            <Radio.Button value="purple">紫色</Radio.Button>
          </Radio.Group>
        </Form.Item>
        
        <Divider />
        
        <h3>编辑器设置</h3>
        
        <Form.Item name="codeFont" label="代码字体">
          <Select>
            <Select.Option value="Monaco">Monaco</Select.Option>
            <Select.Option value="Consolas">Consolas</Select.Option>
            <Select.Option value="Courier New">Courier New</Select.Option>
          </Select>
        </Form.Item>
        
        <Form.Item name="fontSize" label="字体大小">
          <Select>
            {[12, 13, 14, 15, 16, 18, 20].map(size => (
              <Select.Option key={size} value={size}>{size}px</Select.Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item className={styles.submitButton}>
          <Button type="primary" htmlType="submit">保存设置</Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default UIPreferences;