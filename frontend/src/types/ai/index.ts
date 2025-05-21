// 代码生成参数
export interface GenerateCodeParams {
  prompt: string;
  language: string;
  framework?: string;
  context?: string;
  projectContext?: object;
  maxTokens?: number;
  temperature?: number;
}

// 代码生成响应 - 与后端API保持一致
export interface GenerateCodeResponse {
  code: string; // 代码片段
  explanation: string; // 代码解释
  // 以下为前端扩展字段，非后端返回必有字段
  alternatives?: string[];
  tokensUsed?: number;
}

// 代码优化参数
export interface OptimizeCodeParams {
  code: string;
  language: string;
  optimizationGoals?: string[];
  context?: string;
  explanation?: boolean;
}

// 代码优化响应
export interface OptimizeCodeResponse {
  optimizedCode: string;
  changes: Array<{
    description: string;
    before?: string;
    after?: string;
  }>;
  improvementSummary: string;
  tokensUsed: number;
}

// 代码分析参数
export interface AnalyzeCodeParams {
  code: string;
  language: string;
  analysisLevel?: 'basic' | 'detailed' | 'comprehensive';
  context?: string;
}

// 代码问题
export interface CodeIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: {
    line: number;
    column?: number;
  };
  fix?: string;
}

// 代码分析响应
export interface AnalyzeCodeResponse {
  score: number;
  issues: CodeIssue[];
  strengths: string[];
  summary: string;
  tokensUsed: number;
}

// 代码解释参数
export interface ExplainCodeParams {
  code: string;
  language: string;
  detailLevel?: 'basic' | 'detailed';
  audience?: 'beginner' | 'intermediate' | 'advanced';
}

// 代码解释响应
export interface ExplainCodeResponse {
  explanation: string;
  lineByLine?: Array<{
    line: number;
    code: string;
    explanation: string;
  }>;
  concepts?: string[];
  tokensUsed: number;
}

// AI聊天参数
export interface ChatParams {
  message: string;
  conversationId?: string;
  projectId?: string;
  fileId?: string;
  codeContext?: string;
}

// AI聊天响应
export interface ChatResponse {
  reply: string;
  conversationId: string;
  tokensUsed?: number;
} 