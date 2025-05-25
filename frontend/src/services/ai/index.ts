import http from '@/utils/request';
import { ResponseData } from '@/types/common';
import {
  GenerateCodeParams,
  GenerateCodeResponse,
  OptimizeCodeParams,
  OptimizeCodeResponse,
  AnalyzeCodeParams,
  AnalyzeCodeResponse,
  ExplainCodeParams,
  ExplainCodeResponse,
  ChatParams,
  ChatResponse,
  AIConfigParams,
  AIConfigResponse,
  AIConfigTestParams,
  AIConfigTestResponse,
  AIUsageStatsResponse,
  AIHealthResponse,
  AIModelRecommendationResponse,
  AIProvidersResponse,
  PromptTemplate,
  CreatePromptTemplateParams,
  UpdatePromptTemplateParams,
  TestPromptTemplateParams,
  TestPromptTemplateResponse,
  InitPromptTemplatesResponse
} from '@/types';

// AI服务
const aiService = {
  // 代码生成
  generateCode(params: GenerateCodeParams): Promise<GenerateCodeResponse> {
    return http.post<ResponseData<GenerateCodeResponse>>('/ai/generate-code', params).then(res => res.data!);
  },

  // 代码优化
  optimizeCode(params: OptimizeCodeParams): Promise<OptimizeCodeResponse> {
    return http.post<ResponseData<OptimizeCodeResponse>>('/ai/optimize-code', params).then(res => res.data!);
  },

  // 代码分析
  analyzeCode(params: AnalyzeCodeParams): Promise<AnalyzeCodeResponse> {
    return http.post<ResponseData<AnalyzeCodeResponse>>('/ai/analyze-code', params).then(res => res.data!);
  },

  // 代码解释
  explainCode(params: ExplainCodeParams): Promise<ExplainCodeResponse> {
    return http.post<ResponseData<ExplainCodeResponse>>('/ai/explain-code', params).then(res => res.data!);
  },

  // AI助手聊天
  chat(params: ChatParams): Promise<ChatResponse> {
    return http.post<ResponseData<ChatResponse>>('/ai/chat', params).then(res => res.data!);
  },

  // 获取AI配置
  getConfig(): Promise<AIConfigResponse> {
    return http.get<ResponseData<AIConfigResponse>>('/ai/config').then(res => res.data!);
  },

  // 更新AI配置
  updateConfig(params: AIConfigParams): Promise<AIConfigResponse> {
    return http.post<ResponseData<AIConfigResponse>>('/ai/config', params).then(res => res.data!);
  },

  // 测试AI配置
  testConfig(params: AIConfigTestParams): Promise<AIConfigTestResponse> {
    return http.post<ResponseData<AIConfigTestResponse>>('/ai/config/test', params).then(res => res.data!);
  },

  /**
   * 获取AI使用统计数据
   */
  getUsageStats: (params: { startDate?: string; endDate?: string; groupBy?: string }) => {
    return http.get<ResponseData<AIUsageStatsResponse>>('/ai/config/usage-stats',  params );
  },

  // 获取AI服务健康状态
  getHealth(): Promise<AIHealthResponse> {
    return http.get<ResponseData<AIHealthResponse>>('/ai/health').then(res => res.data!);
  },

  // 获取AI模型推荐
  getModelRecommendation(task: string): Promise<AIModelRecommendationResponse> {
    return http.get<ResponseData<AIModelRecommendationResponse>>(`/ai/recommend-model/${task}`).then(res => res.data!);
  },

  // 获取支持的AI提供商
  getProviders(): Promise<AIProvidersResponse> {
    return http.get<ResponseData<AIProvidersResponse>>('/ai/providers').then(res => res.data!);
  },

  // 提示词模板相关

  // 创建提示词模板
  createPromptTemplate(params: CreatePromptTemplateParams): Promise<PromptTemplate> {
    return http.post<ResponseData<PromptTemplate>>('/ai/prompt-templates', params).then(res => res.data!);
  },

  // 获取提示词模板列表
  getPromptTemplates(): Promise<{ templates: PromptTemplate[], total: number }> {
    return http.get<ResponseData<{ templates: PromptTemplate[], total: number }>>('/ai/prompt-templates').then(res => res.data!);
  },

  // 更新提示词模板
  updatePromptTemplate(id: string, params: UpdatePromptTemplateParams): Promise<PromptTemplate> {
    return http.put<ResponseData<PromptTemplate>>(`/ai/prompt-templates/${id}`, params).then(res => res.data!);
  },

  // 删除提示词模板
  deletePromptTemplate(id: string): Promise<boolean> {
    return http.delete<ResponseData<boolean>>(`/ai/prompt-templates/${id}`).then(res => res.data!);
  },

  // 获取提示词模板详情
  getPromptTemplateDetail(id: string): Promise<PromptTemplate> {
    return http.get<ResponseData<PromptTemplate>>(`/ai/prompt-templates/${id}`).then(res => res.data!);
  },

  // 测试提示词模板
  testPromptTemplate(params: TestPromptTemplateParams): Promise<TestPromptTemplateResponse> {
    return http.post<ResponseData<TestPromptTemplateResponse>>('/ai/prompt-templates/test', params).then(res => res.data!);
  },

  // 初始化系统提示词模板
  initPromptTemplates(): Promise<InitPromptTemplatesResponse> {
    return http.post<ResponseData<InitPromptTemplatesResponse>>('/ai/prompt-templates/init', {}).then(res => res.data!);
  }
};

export default aiService; 