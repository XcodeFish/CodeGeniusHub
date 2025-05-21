import type { AppProps } from 'next/app';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import '@/styles/globals.scss';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConfigProvider locale={zhCN}>
      <Component {...pageProps} />
    </ConfigProvider>
  );
} 