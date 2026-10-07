/** Utilidades de fetch para componentes de cliente. Lanzan el mensaje de error del servidor. */
export async function apiFetch<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // respuesta sin cuerpo JSON
  }
  if (!res.ok) {
    const msg = (data as { error?: string })?.error ?? `Error ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export const postJson = <T = unknown>(url: string, body: unknown) =>
  apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
export const putJson = <T = unknown>(url: string, body: unknown) =>
  apiFetch<T>(url, { method: 'PUT', body: JSON.stringify(body) });
export const del = <T = unknown>(url: string) => apiFetch<T>(url, { method: 'DELETE' });
