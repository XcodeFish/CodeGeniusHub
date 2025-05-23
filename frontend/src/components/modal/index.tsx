import React, { useEffect } from 'react';
import { Modal } from 'antd';
import { useModalStore } from '@/stores/modalStore';
import styles from './appModal.module.scss';

const AppModel: React.FC = () => {
  const {
    isOpen,
    title,
    content,
    width,
    onOk,
    onCancel,
    okText,
    cancelText,
    footer,
    maskClosable,
    openModal,
    closeModal
  } = useModalStore();
  
  const handleOk = () => {
    if (onOk) {
      onOk();
    }
    closeModal();
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    closeModal();
  }

  
  return (
    <Modal
      title={title}
      open={isOpen}
      onOk={handleOk}
      onCancel={handleCancel}
      width={width}
      className={styles.appModal}
      okText={okText}
      cancelText={cancelText}
      footer={footer}
      maskClosable={maskClosable}
      destroyOnHidden
    >
      {content}
    </Modal>
  );
}

export default AppModel;