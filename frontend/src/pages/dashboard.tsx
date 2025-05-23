import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUserStore } from '@/stores/userStore';
import MainLayout from '@/components/layout/MainLayout';
import DashboardContent from '@/components/dashboard/DashboardContent';

/**
 * 系统仪表盘首页组件
 */
export default function Dashboard() {
  const router = useRouter();
  const { user, token } = useUserStore();
  
  // 检查用户是否已登录，未登录则重定向到登录页
  useEffect(() => {
    if (!token || !user) {
      router.replace('/login');
    }
  }, [user, token, router]);

  // 如果用户未登录，不渲染内容
  if (!user || !token) {
    return null;
  }

  return (
    <MainLayout title="仪表盘 - AI智能代码生成与协作平台">
      <DashboardContent />
    </MainLayout>
  );
} 