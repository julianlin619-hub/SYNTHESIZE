const API_BASE =
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.NEXT_PUBLIC_BACKEND_BASE_URL ||   // fallback if someone set this
  import.meta.env.NEXT_PUBLIC_API_BASE_URL ||       // older fallback
  'http://localhost:5055';

export async function summarize(url: string) {
  const res = await fetch(`${API_BASE}/api/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Summarize failed: ${res.status}`);
  return res.json();
}

export async function health() {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Health failed: ${res.status}`);
  return res.json();
}
