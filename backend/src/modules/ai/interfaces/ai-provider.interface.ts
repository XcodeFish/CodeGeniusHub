export interface ChatCompletionParams {
  model: string;
  messages: any[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: {
    message?: any;
    delta?: any;
    finish_reason: string | null;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIProvider {
  chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse>;
  streamChatCompletion?(
    params: ChatCompletionParams,
    onProgress: (chunk: any) => void,
  ): Promise<void>;
}
