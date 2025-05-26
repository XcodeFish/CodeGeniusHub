import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * AI助手状态管理
 * 负责管理AI助手的相关状态，历史记录和生成结果
 */
export interface AIResponse {
  code: number;
  message: string;
  data?: AIResponseData;
}

// 将data字段定义为联合类型
export type AIResponseData = string | AIResponseObject;

// 响应数据对象类型
export interface AIResponseObject {
  // 代码生成相关字段
  generatedCode?: string;
  explanation?: string;
  alternatives?: string[];
  
  // 代码优化相关字段
  optimizedCode?: string;
  changes?: Array<{
    description: string;
    oldCode?: string;
    newCode?: string;
  }>;
  improvementSummary?: string;
  
  // 代码分析相关字段
  score?: number;
  issues?: Array<{
    severity: 'error' | 'warning' | 'info';
    message: string;
    location: {
      line: number;
      column: number;
    };
    fix?: string;
  }>;
  strengths?: string[];
  summary?: string;
  
  // 聊天相关字段
  reply?: string;
  response?: string;
  suggestions?: string[];
  references?: string[];
  
  // 通用字段
  tokensUsed?: number;
  [key: string]: any; // 添加索引签名，允许任意字段，增强兼容性
};

export interface AIHistoryItem {
  id: string;
  prompt: string;
  response: AIResponse | null;
  type: 'generate' | 'optimize' | 'analyze' | 'chat';
  timestamp: number;
  language?: string;
  framework?: string;
}

interface AIHelperState {
  // 侧边栏状态
  visible: boolean;
  activeTab: string;
  loading: boolean;
  error: string | null;

   // AI相关状态
  history: AIHistoryItem[];
  currentResponse: AIResponse | null;

   // AI代码生成参数
  prompt: string;
  language: string;
  framework: string;
  codeContext: string;

  // AI操作
  setVisible: (visible: boolean) => void;
  setActiveTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPrompt: (prompt: string) => void;
  setLanguage: (language: string) => void;
  setFramework: (framework: string) => void;
  setCodeContext: (codeContext: string) => void;
  setCurrentResponse: (response: AIResponse | null) => void;
  addHistory: (item: Omit<AIHistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  
}

// 使用persist中间件持久化存储聊天历史到localStorage
export const useAIHelperStore = create<AIHelperState>()(
  persist(
    (set) => ({
      // 初始状态
      visible: false,
      activeTab: 'generate',
      loading: false,
      error: null,
      history: [],
      currentResponse: null,
      prompt: '',
      language: 'javascript',
      framework: '',
      codeContext: '',

      // 操作方法
      setVisible: (visible) => set({ visible }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setPrompt: (prompt) => set({ prompt }),
      setLanguage: (language) => set({ language }),
      setFramework: (framework) => set({ framework }),
      setCodeContext: (codeContext) => set({ codeContext }),
      setCurrentResponse: (currentResponse) => set({ currentResponse }),

      addHistory: (item) => set((state) => {
        console.log('AIHelperStore: 添加历史记录项', item);
        const newItem = {
          ...item,
          id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now()
        };
        console.log('AIHelperStore: 新的历史记录项', newItem);
        console.log('AIHelperStore: 当前历史记录', state.history);
        
        return {
          // 将新消息添加到数组末尾，而不是开头
          history: [...state.history, newItem] 
        };
      }),
      
      clearHistory: () => set({ history: [] })
      
    }),
    {
      name: 'ai-helper-storage', // localStorage中的key
      partialize: (state) => ({
        // 只持久化需要的字段
        history: state.history,
        language: state.language,
        framework: state.framework
      })
    }
  )
);