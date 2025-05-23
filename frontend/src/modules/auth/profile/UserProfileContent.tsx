import React, { useState } from 'react';
import { Avatar, Button, Form, Input, Upload, message } from 'antd';
import { UserOutlined, EditOutlined, LoadingOutlined, PlusOutlined } from '@ant-design/icons';
import { useModalStore } from '@/stores/modalStore';
import styles from '@/components/modal/appModal.module.scss';
import { User } from '@/types/user';

interface UserProfileContentProps {
  user: User;
  canEdit: boolean;
}

// 查看模式
const ViewMode: React.FC<UserProfileContentProps> = ({ user, canEdit }) => {
  const { openModal } = useModalStore();
  
  const handleEdit = () => {
    openModal({
      title: '编辑个人信息',
      content: <EditMode user={user} canEdit={canEdit} />,
      footer: null,
    });
  };
  
  return (
    <div className={styles.userProfileContent}>
      <div className={styles.avatar}>
        <Avatar size={80} src={user.avatar} icon={<UserOutlined />} />
      </div>
      
      <div className={styles.infoItem}>
        <div className={styles.label}>姓名</div>
        <div className={styles.value}>{user.username}</div>
      </div>
      
      <div className={styles.infoItem}>
        <div className={styles.label}>邮箱</div>
        <div className={styles.value}>{user.email}</div>
      </div>
      
      <div className={styles.infoItem}>
        <div className={styles.label}>权限</div>
        <div className={styles.value}>{user.permission}</div>
      </div>
      
      {user.phone && (
        <div className={styles.infoItem}>
          <div className={styles.label}>手机号</div>
          <div className={styles.value}>{user.phone}</div>
        </div>
      )}
      
      {canEdit && (
        <div className={styles.editButton}>
          <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
            编辑信息
          </Button>
        </div>
      )}
    </div>
  );
};

// 编辑模式
const EditMode: React.FC<UserProfileContentProps> = ({ user, canEdit }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>(user.avatar);
  const { closeModal } = useModalStore();
  
  const onFinish = (values: any) => {
    setLoading(true);
    
    // 这里添加保存数据的逻辑，一般是调用API
    setTimeout(() => {
      message.success('个人信息更新成功');
      setLoading(false);
      closeModal();
    }, 1000);
  };
  
  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div style={{ marginTop: 8 }}>上传头像</div>
    </div>
  );

  const handleChange = (info: any) => {
    if (info.file.status === 'uploading') {
      setLoading(true);
      return;
    }
    if (info.file.status === 'done') {
      setLoading(false);
      setImageUrl(info.file.response.url);
    }
  };
  
  return (
    <div className={styles.userProfileEdit}>
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          username: user.username,
          email: user.email,
          phone: user.phone || '',
        }}
        onFinish={onFinish}
      >
        <div className={styles.avatarUpload}>
          <Upload
            name="avatar"
            listType="picture-card"
            showUploadList={false}
            action="/api/upload" // 实际的上传API
            onChange={handleChange}
            disabled={!canEdit}
          >
            {imageUrl ? (
              <Avatar size={80} src={imageUrl} />
            ) : (
              uploadButton
            )}
          </Upload>
        </div>
        
        <Form.Item
          name="username"
          label="姓名"
          rules={[{ required: true, message: '请输入3-12位用户名', min: 3, max: 12 }]}
          className={styles.formItem}
        >
          <Input disabled={!canEdit} />
        </Form.Item>
        
        <Form.Item
          name="email"
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '请输入有效的邮箱地址' },
            {
                pattern: /^(?:[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)+)$/,
                message: '请输入正确的邮箱'
              }
          ]}
          className={styles.formItem}
        >
          <Input disabled={!canEdit} />
        </Form.Item>
        
        <Form.Item
          name="phone"
          label="手机号"
          className={styles.formItem}
          rules={[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
          ]}
        >
          <Input.TextArea rows={4} disabled={!canEdit} />
        </Form.Item>
        
        <Form.Item className={styles.formItem}>
          <Button type="primary" htmlType="submit" loading={loading} disabled={!canEdit} block>
            保存
          </Button>
          <Button onClick={closeModal} style={{ marginTop: 10 }} block>
            取消
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export const openUserProfileModal = (user: User, canEdit: boolean = true) => {
  const { openModal } = useModalStore.getState();
  openModal({
    title: '个人信息',
    content: <ViewMode user={user} canEdit={canEdit} />,
    footer: null,
    width: 500,
  });
};

export default { ViewMode, EditMode, openUserProfileModal };