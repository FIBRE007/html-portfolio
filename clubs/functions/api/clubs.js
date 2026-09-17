const SESSION = '2026/2027';
const TERM = 'Joy Term';

const json = (body, status=200) => new Response(JSON.stringify(body), {
  status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});

export async function onRequestGet(context) {
  if (!context.env.DB) return json({message:'Club registration storage is not configured yet.'},503);

  const url = new URL(context.request.url);
  const session = String(url.searchParams.get('session') || SESSION).trim();
  const term = String(url.searchParams.get('term') || TERM).trim();

  if (session !== SESSION || term !== TERM) {
    return json({message:'Only the current club-registration period is available.'},400);
  }

  const result = await context.env.DB.prepare(
    `SELECT c.name, c.group_key, c.capacity, c.active,
            COUNT(r.id) AS registered
     FROM clubs c
     LEFT JOIN registrations r
       ON r.club_name = c.name
      AND r.session = ?
      AND r.term = ?
      AND r.status = 'ACTIVE'
     GROUP BY c.name, c.group_key, c.capacity, c.active
     ORDER BY c.sort_order, c.name`
  ).bind(session, term).all();

  const clubs = (result.results || []).map(row => {
    const capacity = Number(row.capacity || 0);
    const registered = Number(row.registered || 0);
    const remaining = Math.max(0, capacity - registered);
    return {
      name: row.name,
      group: row.group_key,
      capacity,
      registered,
      remaining,
      full: remaining <= 0,
      active: Boolean(row.active)
    };
  });

  return json({session, term, clubs});
}

export function onRequest(context) {
  if (context.request.method === 'GET') return onRequestGet(context);
  return json({message:'Method not allowed.'},405);
}
