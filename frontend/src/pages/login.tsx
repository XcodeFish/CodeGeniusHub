import LoginForm from '@/modules/auth/components/LoginForm';
import { useRouter } from 'next/router';
import { useUserStore } from '@/stores/userStore';
import { useEffect } from 'react';
import Head from 'next/head';
import styles from '@/styles/Login.module.scss';

export default function LoginPage() {
  const router = useRouter();
  const { token } = useUserStore();
  
  // 如果已登录，重定向到仪表盘
  useEffect(() => {
    if (token) {
      router.push('/dashboard');
    }
  }, [token, router]);

  return (
    <>
      <Head>
        <title>登录 - CodeGeniusHub</title>
      </Head>
      <div className={styles.loginContainer}>
        <LoginForm />
      </div>
    </>
  );
} 