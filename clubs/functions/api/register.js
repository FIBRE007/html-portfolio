const GENERAL_CLUBS = {
  'Boys Scout': 40,
  'Drama Club': 30,
  'Foreign Languages Club': 25,
  'Girl Guide / Brownie Club': 40,
  'JEC Club': 25,
  'JET Club': 35,
  'Knowledge Empowerment Club': 25,
  'Literary & Debating Club': 30,
  'Maths Club': 35,
  'Nigerian Languages Club': 25,
  'Red Cross Club': 35,
  'Young Farmers Club': 25
};

const SECTION_RULES = {
  'high-school': {
    classes: ['Junior High 1','Junior High 2','Junior High 3','Senior High 1','Senior High 2','Senior High 3'],
    clubs: {...GENERAL_CLUBS}
  },
  'upper-primary': {
    classes: ['Grade 4','Grade 5'],
    clubs: {
      ...GENERAL_CLUBS,
      'Fine Arts Club (Upper Primary)':40,
      'Home Makers Club':35,
      'ICT Club (Upper Primary)':25,
      'Music Club (Upper Primary)':40
    }
  },
  'lower-primary': {
    classes: ['Grade 1','Grade 2','Grade 3'],
    clubs: {
      ...GENERAL_CLUBS,
      'Fine Arts Club (Lower Primary)':35,
      'Home Makers Club (Lower Primary)':35,
      'ICT Club (Lower Primary)':35,
      'Music Club (Lower Primary)':35
    }
  },
  nursery: {
    classes: ['Kindergarten'],
    clubs: {
      'Fine Arts Club (Nursery)':20,
      'ICT Club (Nursery)':20,
      'JEC Club (Nursery)':15,
      'Knowledge Empowerment Club (Nursery)':15,
      'Languages Club (Nursery)':15
    }
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
    admissionNumber: clean(input.admissionNumber,80),
    guardianPhone: clean(input.guardianPhone,40),
    guardianEmail: clean(input.guardianEmail,120).toLowerCase(),
    section: clean(input.section,30),
    sectionLabel: clean(input.sectionLabel,50),
    classLevel: clean(input.classLevel,40),
    club: clean(input.club,120),
    session: '2026/2027',
    term: 'Joy Term'
  };

  if (!payload.studentName || !payload.admissionNumber || !payload.guardianPhone || !payload.section || !payload.classLevel || !payload.club) {
    return json({message:'Student name, admission number, guardian phone, section, class and club are required.'},400);
  }

  const rules = SECTION_RULES[payload.section];
  if (!rules || !rules.classes.includes(payload.classLevel) || !Object.prototype.hasOwnProperty.call(rules.clubs,payload.club)) {
    return json({message:'That club is not available for the selected section or class.'},400);
  }
  payload.publishedCapacity = rules.clubs[payload.club];

  const apiUrl = clean(context.env.CLUBS_API_URL,500);
  const bridgeSecret = clean(context.env.CLUBS_BRIDGE_SECRET,500);
  if (!apiUrl || !bridgeSecret) {
    return json({message:'Online club registration is not open yet. Please try again after the school activates registration.'},503);
  }

  try {
    const upstream = await fetch(apiUrl, {
      method:'POST',
      headers:{
        'content-type':'application/json',
        'x-clubs-bridge-secret': bridgeSecret
      },
      body:JSON.stringify(payload),
      redirect:'follow'
    });
    const text = await upstream.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch {}

    if (!upstream.ok) {
      const safeMessage = data.message || data.error || 'The school system could not complete this registration.';
      return json({message:safeMessage}, upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502);
    }
    return json({
      ok:true,
      message:data.message || 'Registration completed.',
      reference:data.reference || data.registrationId || data.id || null
    });
  } catch {
    return json({message:'The school registration service is temporarily unavailable. Please try again.'},502);
  }
}

export function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return json({message:'Method not allowed.'},405);
}
