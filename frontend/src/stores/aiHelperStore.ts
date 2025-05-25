import { create } from 'zustand';

/**
 * AI助手状态管理
 * 负责管理AI助手的相关状态，历史记录和生成结果
 */
export interface AIResponse {
  code: number;
  message: string;
  data?: {
    generatedCode?: string;
    explanation?: string;
    alternatives?: string[];
    tokensUsed?: number;
    optimizedCode?: string;
    changes?: Array<{
      description: string;
      oldCode?: string;
      newCode?: string;
    }>;
    improvementSummary?: string;
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
    reply?: string;
    suggestions?: string[];
    references?: string[];
  }
}

interface AIHistoryItem {
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

export const useAIHelperStore = create<AIHelperState>((set) => ({
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

  addHistory: (item) => set((state) => ({
    history: [{
      ...item,
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }, ...state.history]
  })),
  
  clearHistory: () => set({ history: [] })
  
}))