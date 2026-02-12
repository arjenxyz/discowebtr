export default async function fetchWithCreds(input: RequestInfo, init: RequestInit = {}) {
  const merged: RequestInit = {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.headers || {}),
      'Accept': 'application/json',
    },
  };

  const res = await fetch(input, merged);
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json();
    if (!res.ok) throw json;
    return json;
  }
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res;
}
