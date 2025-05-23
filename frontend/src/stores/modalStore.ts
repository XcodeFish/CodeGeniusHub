import { create } from 'zustand';
import { ReactNode } from 'react';

interface ModalState {
  isOpen: boolean;
  title: string;
  content: ReactNode | null;
  width: number | string;
  onOk?: () => void;
  onCancel?: () => void;
  okText?: string;
  cancelText?: string;
  footer?: ReactNode | null;
  maskClosable?: boolean;
  openModal: (options: Partial<Omit<ModalState, 'isOpen' | 'openModal' | 'closeModal'>>) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  isOpen: false,
  title: '',
  content: null,
  width: 520,
  footer: undefined,
  maskClosable: true,
  okText: '确定',
  cancelText: '取消',
  openModal: (options) => set({ isOpen: true, ...options }),
  closeModal: () => set({ isOpen: false, content: null })
}));
