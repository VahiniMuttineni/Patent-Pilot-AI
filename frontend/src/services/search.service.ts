import { apiClient } from "@/lib/api-client";
import { 
  CreateSearchRequest, 
  CreateSearchResponse, 
  SearchStatusResponse, 
  SearchResultResponse 
} from "@/types/search";

export const searchService = {
  async createSearch(request: CreateSearchRequest): Promise<CreateSearchResponse> {
    const response = await apiClient.post<CreateSearchResponse>("/search", request);
    return response.data;
  },

  async getAllSearches(signal?: AbortSignal): Promise<any[]> {
    const response = await apiClient.get<any[]>("/search", { signal });
    return response.data;
  },

  async getSearchStatus(searchId: string, signal?: AbortSignal): Promise<SearchStatusResponse> {
    const response = await apiClient.get<SearchStatusResponse>(`/search/${searchId}/status`, { signal });
    return response.data;
  },

  async getSearchResults(searchId: string, signal?: AbortSignal): Promise<SearchResultResponse> {
    const response = await apiClient.get<SearchResultResponse>(`/search/${searchId}`, { signal });
    return response.data;
  },

  async askResearchAssistant(searchId: string, question: string, history: any[] = []): Promise<{ answer: string; citations?: any[] }> {
    const response = await apiClient.post<{ answer: string; citations?: any[] }>(`/search/${searchId}/chat`, { question, history });
    return response.data;
  },

  async deleteSearch(searchId: string): Promise<{ message: string; id: string }> {
    const response = await apiClient.delete<{ message: string; id: string }>(`/search/${searchId}`);
    return response.data;
  }
};

