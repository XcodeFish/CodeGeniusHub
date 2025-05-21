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
  ChatResponse
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
  }
};

export default aiService; 