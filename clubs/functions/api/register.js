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

const SESSION = '2026/2027';
const TERM = 'Joy Term';

const json = (body, status=200) => new Response(JSON.stringify(body), {
  status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
const clean = (v,max=160) => String(v ?? '').trim().replace(/\s+/g,' ').slice(0,max);
const normalizeName = value => clean(value,120).toLowerCase();
const normalizePhone = value => {
  let digits = String(value ?? '').replace(/\D/g,'');
  if (digits.startsWith('234') && digits.length === 13) digits = '0' + digits.slice(3);
  return digits.slice(0,20);
};

async function learnerKey(studentName, classLevel, guardianPhone) {
  const source = `${normalizeName(studentName)}|${clean(classLevel,40).toLowerCase()}|${normalizePhone(guardianPhone)}`;
  const bytes = new TextEncoder().encode(source);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,'0')).join('');
}

export async function onRequestPost(context) {
  if (!context.env.DB) return json({message:'Club registration storage is not configured yet.'},503);

  let input;
  try { input = await context.request.json(); }
  catch { return json({message:'Invalid registration data.'},400); }

  const payload = {
    studentName: clean(input.studentName,120),
    guardianName: clean(input.guardianName,120),
    guardianPhone: normalizePhone(input.guardianPhone),
    guardianEmail: clean(input.guardianEmail,120).toLowerCase(),
    section: clean(input.section,30),
    classLevel: clean(input.classLevel,40),
    club: clean(input.club,120),
    session: SESSION,
    term: TERM
  };

  if (!payload.studentName || !payload.guardianName || !payload.guardianPhone || !payload.section || !payload.classLevel || !payload.club) {
    return json({message:'Student name, section, class, club, guardian name and guardian phone are required.'},400);
  }
  if (payload.guardianPhone.length < 10) return json({message:'Enter a valid parent or guardian phone number.'},400);

  const rules = SECTION_RULES[payload.section];
  if (!rules || !rules.classes.includes(payload.classLevel) || !Object.prototype.hasOwnProperty.call(rules.clubs,payload.club)) {
    return json({message:'That club is not available for the selected section or class.'},400);
  }

  const configuredClub = await context.env.DB.prepare(
    'SELECT name, capacity, active FROM clubs WHERE name = ?'
  ).bind(payload.club).first();
  if (!configuredClub || !configuredClub.active) return json({message:'That club is not currently open for registration.'},400);
  if (Number(configuredClub.capacity) !== Number(rules.clubs[payload.club])) {
    return json({message:'The club catalogue is being updated. Please refresh the page and try again.'},409);
  }

  const key = await learnerKey(payload.studentName, payload.classLevel, payload.guardianPhone);
  const existing = await context.env.DB.prepare(
    `SELECT club_name FROM registrations
     WHERE session = ? AND term = ? AND learner_key = ? AND status = 'ACTIVE'
     LIMIT 1`
  ).bind(payload.session, payload.term, key).first();
  if (existing) {
    return json({message:`This learner is already registered in ${existing.club_name} for this term.`},409);
  }

  const id = crypto.randomUUID();
  try {
    await context.env.DB.prepare(
      `INSERT INTO registrations
       (id, session, term, learner_key, student_name, section, class_level, club_name,
        guardian_name, guardian_phone, guardian_email, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', datetime('now'))`
    ).bind(
      id, payload.session, payload.term, key, payload.studentName, payload.section,
      payload.classLevel, payload.club, payload.guardianName, payload.guardianPhone,
      payload.guardianEmail || null
    ).run();
  } catch (error) {
    const text = String(error?.message || error || '');
    if (text.includes('CLUB_FULL')) return json({message:'This club has reached its maximum capacity.'},409);
    if (text.includes('UNIQUE constraint failed')) {
      const duplicate = await context.env.DB.prepare(
        `SELECT club_name FROM registrations
         WHERE session = ? AND term = ? AND learner_key = ? AND status = 'ACTIVE'
         LIMIT 1`
      ).bind(payload.session, payload.term, key).first();
      return json({message: duplicate ? `This learner is already registered in ${duplicate.club_name} for this term.` : 'This learner already has a club registration for this term.'},409);
    }
    console.error('Club registration failed', error);
    return json({message:'Registration could not be completed. Please try again.'},500);
  }

  const count = await context.env.DB.prepare(
    `SELECT COUNT(*) AS registered FROM registrations
     WHERE session = ? AND term = ? AND club_name = ? AND status = 'ACTIVE'`
  ).bind(payload.session, payload.term, payload.club).first();

  return json({
    ok:true,
    reference:id.split('-')[0].toUpperCase(),
    registered:Number(count?.registered || 0),
    remaining:Math.max(0, Number(configuredClub.capacity) - Number(count?.registered || 0))
  },201);
}

export function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  return json({message:'Method not allowed.'},405);
}
