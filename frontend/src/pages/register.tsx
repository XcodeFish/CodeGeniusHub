import RegisterForm from '@/modules/auth/components/RegisterForm';
import { useRouter } from 'next/router';
import { useUserStore } from '@/stores/userStore';
import { useEffect } from 'react';
import Head from 'next/head';
import styles from '@/styles/Login.module.scss';

export default function RegisterPage() {
  const router = useRouter();
  const { token } = useUserStore();
  
  // 如果已登录，重定向到首页
  useEffect(() => {
    if (token) {
      router.push('/');
    }
  }, [token, router]);

  return (
    <>
      <Head>
        <title>注册 - CodeGeniusHub</title>
      </Head>
      <div className={styles.loginContainer}>
        <RegisterForm />
      </div>
    </>
  );
} 