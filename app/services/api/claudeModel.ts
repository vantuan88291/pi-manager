import { getJsonApi, postJsonApi } from "./piApi"

export interface ClaudeModelData {
  model: string | null
  availableModels: string[]
}

export interface ClaudeModelResponse {
  success: boolean
  data: ClaudeModelData
}

export interface SetClaudeModelResponse {
  success: boolean
  message: string
  data: { model: string | null }
}

export async function fetchClaudeModel(): Promise<ClaudeModelData> {
  const res = await getJsonApi<ClaudeModelResponse>("/api/claude-model")
  return res.data as ClaudeModelData
}

export async function setClaudeModel(model: string): Promise<SetClaudeModelResponse> {
  return postJsonApi<SetClaudeModelResponse>("/api/claude-model", { model })
}
