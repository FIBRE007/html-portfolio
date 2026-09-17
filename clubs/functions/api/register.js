const ELIGIBILITY = {
  'high-school': {
    classes: ['JH 1','JH 2','JH 3','SH 1','SH 2','SH 3'],
    clubs: {'Boys Scout':40,'Drama Club':30,'Foreign Languages Club':25,'Girl Guide / Brownie Club':40,'JEC Club':25,'JET Club':35,'Knowledge Empowerment Club':25,'Literary & Debating Club':30,'Maths Club':35,'Nigerian Languages Club':25,'Red Cross Club':35,'Young Farmers Club':25}
  },
  'upper-primary': {
    classes: ['Grade 4','Grade 5'],
    clubs: {'Fine Arts Club (Upper Primary)':40,'Home Makers Club':35,'ICT Club (Upper Primary)':25,'Music Club (Upper Primary)':40}
  },
  'lower-primary': {
    classes: ['Grade 1','Grade 2','Grade 3'],
    clubs: {'Fine Arts Club (Lower Primary)':35,'Home Makers Club (Lower Primary)':35,'ICT Club (Lower Primary)':35,'Music Club (Lower Primary)':35}
  },
  nursery: {
    classes: ['Kindergarten'],
    clubs: {'Fine Arts Club (Nursery)':20,'ICT Club (Nursery)':20,'JEC Club (Nursery)':15,'Knowledge Empowerment Club (Nursery)':15,'Languages Club (Nursery)':15}
  }
};

const json = (body, status=200) => new Response(JSON.stringify(body), {
  status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
const clean = (v,max=160) => String(v ?? '').trim().slice(0,max);

export async function onRequestPost(context) {
  let input;
  try { input = await context.request.json(); }
  catch { return json({message:'Invalid registration data.'},400); }

  const payload = {
    studentName: clean(input.studentName,120),
    studentId: clean(input.studentId,80),
    section: clean(input.section,30),
    sectionLabel: clean(input.sectionLabel,50),
    classLevel: clean(input.classLevel,30),
    club: clean(input.club,120),
    guardianPhone: clean(input.guardianPhone,40),
    guardianEmail: clean(input.guardianEmail,120).toLowerCase(),
    session: '2026/2027',
    term: 'Joy Term'
  };

  if (!payload.studentName || !payload.studentId || !payload.section || !payload.classLevel || !payload.club) {
    return json({message:'Student name, student ID, section, class and club are required.'},400);
  }

  const rules = ELIGIBILITY[payload.section];
  if (!rules || !rules.classes.includes(payload.classLevel) || !Object.prototype.hasOwnProperty.call(rules.clubs,payload.club)) {
    return json({message:'That club is not available for the selected section or class.'},400);
  }
  payload.publishedCapacity = rules.clubs[payload.club];

  if (!context.env.CLUBS_PORTAL_REGISTER_URL) {
    return json({message:'The page is ready, but the existing portal registration endpoint has not yet been connected.'},503);
  }

  const headers = {'content-type':'application/json'};
  if (context.env.CLUBS_PORTAL_TOKEN) headers.authorization = `Bearer ${context.env.CLUBS_PORTAL_TOKEN}`;

  try {
    const upstream = await fetch(context.env.CLUBS_PORTAL_REGISTER_URL, {
      method:'POST', headers, body:JSON.stringify(payload), redirect:'follow'
    });
    const text = await upstream.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}

    if (!upstream.ok) {
      return json({message:data.message || data.error || 'The portal could not complete this registration.'}, upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502);
    }
    return json({ok:true,message:data.message || 'Registration received.',reference:data.reference || data.registrationId || data.id || null});
  } catch {
    return json({message:'The school portal is temporarily unavailable. Please try again.'},502);
  }
}

export function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return json({message:'Method not allowed.'},405);
}
