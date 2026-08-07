// Client-side fetch wrapper: sempre chama nosso proxy /api/backend/*, nunca o
// NestJS diretamente — assim o token nunca precisa ser lido em JS de browser.
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: 'Erro desconhecido.' }));
    throw new ApiError(errorBody.message ?? 'Erro na requisição.', response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include',
  });
  return handleResponse<T>(response);
}

// Corpo FormData (upload de arquivo) — sem Content-Type manual, o browser
// define sozinho o boundary do multipart. Não reaproveita request() porque
// ele sempre injeta o header JSON, o que quebraria o boundary.
async function requestForm<T>(path: string, method: string, formData: FormData): Promise<T> {
  const response = await fetch(`/api/backend/${path}`, {
    method,
    body: formData,
    credentials: 'include',
  });
  return handleResponse<T>(response);
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postForm: <T>(path: string, formData: FormData) => requestForm<T>(path, 'POST', formData),
  patchForm: <T>(path: string, formData: FormData) => requestForm<T>(path, 'PATCH', formData),
};
