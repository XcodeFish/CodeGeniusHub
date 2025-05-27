// frontend/src/hooks/useAIHelper.ts
import { useState } from 'react';
import { useAIHelperStore, AIResponse } from '@/stores/aiHelperStore';
import { aiService } from '@/services';
import { 
  GenerateCodeParams,
  OptimizeCodeParams, 
  AnalyzeCodeParams,
  ChatParams,
  ExplainCodeParams,
  AIConfigParams,
  AIConfigResponse,
  TestPromptTemplateParams,
  TestPromptTemplateResponse,
  PromptTemplate,
  CodeIssue
} from '@/types';

/**
 * AI助手业务逻辑Hook
 * 负责与AI服务API交互，处理响应数据
 */
export function useAIHelper() {
  const {
    visible,
    activeTab,
    loading,
    error,
    history,
    currentResponse,
    prompt,
    language,
    framework,
    codeContext,
    setVisible,
    setActiveTab,
    setLoading,
    setError,
    setPrompt,
    setLanguage,
    setFramework,
    setCodeContext,
    setCurrentResponse,
    addHistory,
    clearHistory
  } = useAIHelperStore();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [aiConfig, setAIConfig] = useState<AIConfigResponse | null>(null);

  // 打开AI助手侧边栏
  const openAIHelper = (tab = 'generate') => {
    setActiveTab(tab);
    setVisible(true);
  };

  // 关闭AI助手侧边栏
  const closeAIHelper = () => {
    setVisible(false);
  };

  // 切换标签页
  const switchTab = (tab: string) => {
    setActiveTab(tab);
  };

  // 生成代码
  const generateCode = async () => {
    if (!prompt) {
      setError('请输入代码描述');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: GenerateCodeParams = {
        prompt,
        language,
        framework: framework || undefined,
        context: codeContext || undefined
      };
      
      const responseData = await aiService.generateCode(params);
      
      const aiResponse: AIResponse = {
        code: 0,
        message: '代码生成成功',
        data: {
          generatedCode: responseData.code,
          explanation: responseData.explanation,
          alternatives: responseData.alternatives,
          tokensUsed: responseData.tokensUsed
        }
      };

      setCurrentResponse(aiResponse);
      addHistory({
        prompt,
        response: aiResponse,
        type: 'generate',
        language,
        framework
      });
    } catch (err: any) {
      setError(err.message || '代码生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 优化代码
  const optimizeCode = async (code: string, optimizationGoals?: string[]) => {
    if (!code) {
      setError('请提供需要优化的代码');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: OptimizeCodeParams = {
        code,
        language,
        optimizationGoals,
        context: codeContext || undefined
      };
      
      const responseData = await aiService.optimizeCode(params);
      
      const aiResponse: AIResponse = {
        code: 0,
        message: '代码优化成功',
        data: {
          optimizedCode: responseData.optimizedCode,
          changes: responseData.changes.map(change => ({
            description: change.description,
            oldCode: change.before,
            newCode: change.after
          })),
          improvementSummary: responseData.improvementSummary,
          tokensUsed: responseData.tokensUsed
        }
      };

      setCurrentResponse(aiResponse);
      addHistory({
        prompt: `优化${language}代码`,
        response: aiResponse,
        type: 'optimize',
        language
      });
    } catch (err: any) {
      setError(err.message || '代码优化失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 分析代码
  const analyzeCode = async (code: string, analysisLevel?: 'basic' | 'detailed' | 'comprehensive') => {
    if (!code) {
      setError('请提供需要分析的代码');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: AnalyzeCodeParams = {
        code,
        language,
        analysisLevel: analysisLevel || 'detailed',
        context: codeContext || undefined
      };
      
      const responseData = await aiService.analyzeCode(params);
      
      // 转换CodeIssue类型以匹配AIResponse中的issues类型
      const convertedIssues = responseData.issues.map(issue => ({
        severity: issue.severity,
        message: issue.message,
        location: issue.location ? {
          line: issue.location.line,
          column: issue.location.column || 0 // 提供默认值
        } : { line: 0, column: 0 }, // 提供默认值
        fix: issue.fix
      }));
      
      const aiResponse: AIResponse = {
        code: 0,
        message: '代码分析成功',
        data: {
          score: responseData.score,
          issues: convertedIssues,
          strengths: responseData.strengths,
          summary: responseData.summary,
          tokensUsed: responseData.tokensUsed
        }
      };

      setCurrentResponse(aiResponse);
      addHistory({
        prompt: `分析${language}代码`,
        response: aiResponse,
        type: 'analyze',
        language
      });
    } catch (err: any) {
      setError(err.message || '代码分析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 解释代码
  const explainCode = async (code: string, detailLevel?: 'basic' | 'detailed', audience?: 'beginner' | 'intermediate' | 'advanced') => {
    if (!code) {
      setError('请提供需要解释的代码');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: ExplainCodeParams = {
        code,
        language,
        detailLevel,
        audience
      };
      
      const responseData = await aiService.explainCode(params);
      
      const aiResponse: AIResponse = {
        code: 0,
        message: '代码解释成功',
        data: {
          explanation: responseData.explanation,
          tokensUsed: responseData.tokensUsed
        }
      };

      setCurrentResponse(aiResponse);
      addHistory({
        prompt: `解释${language}代码`,
        response: aiResponse,
        type: 'analyze', // 复用分析类型
        language
      });
    } catch (err: any) {
      setError(err.message || '代码解释失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 与AI聊天
  const chatWithAI = async (message: string, fileId?: string) => {
    if (!message) {
      setError('请输入消息');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: ChatParams = {
        message,
        conversationId: conversationId || undefined,
        fileId: fileId || undefined,
        codeContext: codeContext || undefined
      };
      
      console.log('请求聊天参数:', params);
      const responseData = await aiService.chat(params);
      console.log('聊天响应数据:', responseData);
      
      if (responseData.conversationId) {
        setConversationId(responseData.conversationId);
      }

      // 确保至少有一个有效的回复字段
      if (!responseData.reply && !responseData.response) {
        console.warn('警告: API返回数据中既没有reply也没有response字段', responseData);
      }

      // 构造AI响应对象
      const aiResponse: AIResponse = {
        code: 0,
        message: 'AI回复成功',
        data: {
          // 优先使用reply字段，如果没有则使用response字段
          reply: responseData.reply || responseData.response || '获取回复失败',
          // 保留原始response字段，以便兼容不同的处理方式
          response: responseData.response,
          tokensUsed: responseData.tokensUsed
        }
      };
      
      console.log('构造的aiResponse:', aiResponse);
      // 类型安全地访问data字段
      if (aiResponse.data && typeof aiResponse.data === 'object') {
        console.log('aiResponse.data:', aiResponse.data);
        console.log('aiResponse.data.reply:', aiResponse.data.reply);
      }
      
      setCurrentResponse(aiResponse);
      
      // 添加到聊天历史
      const historyItem = {
        prompt: message,
        response: aiResponse,
        type: 'chat' as const
      };
      console.log('添加到历史的项:', historyItem);
      
      // 确保历史记录项正确添加
      try {
        addHistory(historyItem);
        console.log('历史记录已添加');
      } catch (historyError) {
        console.error('添加历史记录失败:', historyError);
      }
      
    } catch (err: any) {
      console.error('聊天错误:', err);
      const errorMessage = err.message || 'AI对话失败，请稍后重试';
      setError(errorMessage);
      
      // 即使出错也添加到历史记录，以便用户知道请求失败
      const errorResponse: AIResponse = {
        code: 1,
        message: errorMessage,
        data: '请求失败: ' + errorMessage
      };
      
      addHistory({
        prompt: message,
        response: errorResponse,
        type: 'chat'
      });
      
    } finally {
      setLoading(false);
    }
  };

  // 重置对话
  const resetConversation = () => {
    setConversationId(null);
  };

  // 获取AI配置信息
  const fetchAIConfig = async () => {
    try {
      const config = await aiService.getConfig();
      setAIConfig(config);
      return config;
    } catch (err: any) {
      console.error('获取AI配置失败', err);
      return null;
    }
  };

  // 更新AI配置
  const updateAIConfig = async (config: AIConfigParams) => {
    try {
      const updatedConfig = await aiService.updateConfig(config);
      setAIConfig(updatedConfig);
      return true;
    } catch (err: any) {
      console.error('更新AI配置失败', err);
      return false;
    }
  };

  // 测试AI配置
  const testAIConfig = async (provider: string, model: string, apiKey: string, baseUrl?: string, ollamaApiUrl?: string) => {
    try {
      return await aiService.testConfig({ provider, model, apiKey, baseUrl, ollamaApiUrl });
    } catch (err: any) {
      console.error('测试AI配置失败', err);
      return { success: false, message: err.message || '测试失败' };
    }
  };
  
  // 获取提示词模板列表
  const getPromptTemplates = async () => {
    try {
      const response = await aiService.getPromptTemplates();
      setPromptTemplates(response.templates || []);
      return response.templates || [];
    } catch (err: any) {
      console.error('获取提示词模板失败', err);
      return [];
    }
  };

  // 测试提示词模板
  const testPromptTemplate = async (template: string, variables?: Record<string, any>) => {
    try {
      const params: TestPromptTemplateParams = { template, variables };
      return await aiService.testPromptTemplate(params);
    } catch (err: any) {
      console.error('测试提示词模板失败', err);
      return null;
    }
  };
  
  // 获取AI使用统计
  const getUsageStats = async (params: { startDate?: string; endDate?: string; groupBy?: string }) => {
    try {
      return await aiService.getUsageStats(params);
    } catch (err: any) {
      console.error('获取AI使用统计失败', err);
      return null;
    }
  };

  return {
    // 状态
    visible,
    activeTab,
    loading,
    error,
    history,
    currentResponse,
    prompt,
    language,
    framework,
    codeContext,
    promptTemplates,
    aiConfig,
    
    // 操作方法
    setPrompt,
    setLanguage,
    setFramework,
    setCodeContext,
    setCurrentResponse,
    openAIHelper,
    closeAIHelper,
    switchTab,
    generateCode,
    optimizeCode,
    analyzeCode,
    explainCode,
    chatWithAI,
    resetConversation,
    clearHistory,
    
    // 新增AI配置相关方法
    fetchAIConfig,
    updateAIConfig,
    testAIConfig,
    
    // 提示词模板相关方法
    getPromptTemplates,
    testPromptTemplate,
    
    // AI使用统计
    getUsageStats,
    
    // 直接暴露aiService，方便组件调用其他未封装的方法
    aiService
  };
}