const RAILWAY_API_URL = 'https://backboard.railway.com/graphql/v2';

export async function proxyRailwayGraphql(req, res) {
  const token = req.get('x-railway-token')?.trim();
  if (!token) {
    return res.status(401).json({
      message: 'Add a Railway account token in Settings → Secrets.',
    });
  }

  const { query, variables } = req.body ?? {};
  if (typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ message: 'A Railway GraphQL query is required.' });
  }

  try {
    const response = await fetch(RAILWAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => null);
    if (result) {
      return res.status(response.status).json(result);
    }

    return res.status(response.ok ? 502 : response.status).json({
      message: `Railway returned an invalid response (HTTP ${response.status}).`,
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      return res.status(504).json({ message: 'Railway API request timed out. Try again.' });
    }
    return res.status(502).json({ message: 'Could not reach the Railway API. Try again.' });
  }
}
