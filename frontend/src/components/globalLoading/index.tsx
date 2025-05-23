import React from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { create } from 'zustand';
import styles from './GlobalLoading.module.scss';

// 全局loading状态管理
interface LoadingState {
  isLoading: boolean;
  message: string;
  showLoading: (message?: string) => void;
  hideLoading: () => void;
}

export const useGlobalLoadingStore = create<LoadingState>((set) => ({
  isLoading: false,
  message: '加载中...',
  showLoading: (message = '加载中...') => set({ isLoading: true, message }),
  hideLoading: () => set({ isLoading: false }),
}));

const GlobalLoading: React.FC = () => {
  const { isLoading, message } = useGlobalLoadingStore();

  if (!isLoading) return null;

  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingContent}>
        <LoadingOutlined className={styles.icon} spin />
        <div className={styles.message}>
          {message}
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
          <span className={styles.dot}></span>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoading;