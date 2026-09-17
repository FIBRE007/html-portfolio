const GENERAL_CLUBS = [
  ['Boys Scout', 40],
  ['Drama Club', 30],
  ['Foreign Languages Club', 25],
  ['Girl Guide / Brownie Club', 40],
  ['JEC Club', 25],
  ['JET Club', 35],
  ['Knowledge Empowerment Club', 25],
  ['Literary & Debating Club', 30],
  ['Maths Club', 35],
  ['Nigerian Languages Club', 25],
  ['Red Cross Club', 35],
  ['Young Farmers Club', 25]
];

const GROUPS = {
  general: {
    label: 'General Clubs',
    note: 'Available to eligible Primary and High School learners',
    clubs: GENERAL_CLUBS
  },
  'upper-primary': {
    label: 'Upper Primary Only',
    note: 'Grades 4 and 5 only',
    clubs: [
      ['Fine Arts Club (Upper Primary)', 40],
      ['Home Makers Club', 35],
      ['ICT Club (Upper Primary)', 25],
      ['Music Club (Upper Primary)', 40]
    ]
  },
  'lower-primary': {
    label: 'Lower Primary Only',
    note: 'Grades 1, 2 and 3 only',
    clubs: [
      ['Fine Arts Club (Lower Primary)', 35],
      ['Home Makers Club (Lower Primary)', 35],
      ['ICT Club (Lower Primary)', 35],
      ['Music Club (Lower Primary)', 35]
    ]
  },
  nursery: {
    label: 'Nursery Only',
    note: 'Kindergarten pupils only',
    clubs: [
      ['Fine Arts Club (Nursery)', 20],
      ['ICT Club (Nursery)', 20],
      ['JEC Club (Nursery)', 15],
      ['Knowledge Empowerment Club (Nursery)', 15],
      ['Languages Club (Nursery)', 15]
    ]
  }
};

const SECTIONS = {
  'high-school': {
    label: 'High School',
    classes: ['Junior High 1', 'Junior High 2', 'Junior High 3', 'Senior High 1', 'Senior High 2', 'Senior High 3'],
    clubGroups: ['general']
  },
  'upper-primary': {
    label: 'Upper Primary',
    classes: ['Grade 4', 'Grade 5'],
    clubGroups: ['general', 'upper-primary']
  },
  'lower-primary': {
    label: 'Lower Primary',
    classes: ['Grade 1', 'Grade 2', 'Grade 3'],
    clubGroups: ['general', 'lower-primary']
  },
  nursery: {
    label: 'Nursery',
    classes: ['Kindergarten'],
    clubGroups: ['nursery']
  }
};

const SESSION = '2026/2027';
const TERM = 'Joy Term';
const availability = new Map();

const form = document.querySelector('#clubForm');
const sectionSelect = document.querySelector('#section');
const classSelect = document.querySelector('#classLevel');
const clubSelect = document.querySelector('#club');
const clubSummary = document.querySelector('#clubSummary');
const message = document.querySelector('#formMessage');
const submitButton = document.querySelector('#submitButton');
const directory = document.querySelector('#clubDirectory');
const directoryFilter = document.querySelector('#directoryFilter');
const successDialog = document.querySelector('#successDialog');
const successText = document.querySelector('#successText');
const closeDialog = document.querySelector('#closeDialog');

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function fillClasses(items, placeholder) {
  classSelect.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = item;
    option.textContent = item;
    classSelect.append(option);
  });
  classSelect.disabled = !items.length;
}

function clubsForSection(sectionKey) {
  const section = SECTIONS[sectionKey];
  if (!section) return [];
  return section.clubGroups.flatMap(groupKey => GROUPS[groupKey].clubs);
}

function findClub(sectionKey, clubName) {
  return clubsForSection(sectionKey).find(([name]) => name === clubName);
}

function clubAvailability(name, fallbackCapacity) {
  return availability.get(name) || {
    capacity: fallbackCapacity,
    registered: null,
    remaining: null,
    full: false,
    active: true
  };
}

function fillClubs(sectionKey) {
  const clubs = clubsForSection(sectionKey);
  clubSelect.innerHTML = '<option value="">Select club</option>';
  clubs.forEach(([name, fallbackCapacity]) => {
    const live = clubAvailability(name, fallbackCapacity);
    const option = document.createElement('option');
    option.value = name;
    option.disabled = live.full || live.active === false;
    option.textContent = live.remaining == null
      ? `${name} — max ${fallbackCapacity}`
      : live.full
        ? `${name} — FULL`
        : `${name} — ${live.remaining} place${live.remaining === 1 ? '' : 's'} left`;
    clubSelect.append(option);
  });
  clubSelect.disabled = !clubs.length;
}

function renderDirectory(filter = 'all') {
  let groupKeys;
  if (filter === 'all') groupKeys = ['general', 'upper-primary', 'lower-primary', 'nursery'];
  else if (filter === 'high-school') groupKeys = ['general'];
  else groupKeys = SECTIONS[filter]?.clubGroups || [];

  directory.innerHTML = [...new Set(groupKeys)].map(key => {
    const group = GROUPS[key];
    return `<section class="club-group">
      <div class="club-group__head"><h3>${esc(group.label)}</h3><span>${esc(group.note)}</span></div>
      <div class="club-list">${group.clubs.map(([name, fallbackCapacity]) => {
        const live = clubAvailability(name, fallbackCapacity);
        const label = live.remaining == null
          ? `Maximum ${fallbackCapacity}`
          : live.full
            ? 'Full'
            : `${live.remaining} of ${live.capacity} places left`;
        return `<div class="club-card"><span class="club-card__name">${esc(name)}</span><span class="capacity">${esc(label)}</span></div>`;
      }).join('')}</div>
    </section>`;
  }).join('');
}

function updateSummary() {
  const section = SECTIONS[sectionSelect.value];
  const selected = findClub(sectionSelect.value, clubSelect.value);
  if (!section || !classSelect.value || !selected) {
    clubSummary.hidden = true;
    clubSummary.innerHTML = '';
    return;
  }
  const live = clubAvailability(selected[0], selected[1]);
  const capacityText = live.remaining == null
    ? `Published maximum capacity: <strong>${selected[1]}</strong>.`
    : live.full
      ? '<strong>This club is currently full.</strong>'
      : `<strong>${live.remaining}</strong> of <strong>${live.capacity}</strong> places remain.`;
  clubSummary.hidden = false;
  clubSummary.innerHTML = `<strong>${esc(selected[0])}</strong> is available for ${esc(section.label)}. ${capacityText}`;
}

async function loadAvailability() {
  try {
    const response = await fetch(`/api/clubs?session=${encodeURIComponent(SESSION)}&term=${encodeURIComponent(TERM)}`, {cache:'no-store'});
    if (!response.ok) return;
    const data = await response.json();
    availability.clear();
    (data.clubs || []).forEach(club => availability.set(club.name, club));
    renderDirectory(directoryFilter.value);
    if (sectionSelect.value) fillClubs(sectionSelect.value);
    updateSummary();
  } catch (error) {
    console.warn('Live club availability could not be loaded.', error);
  }
}

sectionSelect.addEventListener('change', () => {
  const section = SECTIONS[sectionSelect.value];
  message.textContent = '';
  message.className = 'form-message';
  if (!section) {
    fillClasses([], 'Select section first');
    clubSelect.innerHTML = '<option value="">Select section first</option>';
    clubSelect.disabled = true;
    updateSummary();
    return;
  }
  fillClasses(section.classes, 'Select class');
  fillClubs(sectionSelect.value);
  directoryFilter.value = sectionSelect.value;
  renderDirectory(sectionSelect.value);
  updateSummary();
});

classSelect.addEventListener('change', updateSummary);
clubSelect.addEventListener('change', updateSummary);
directoryFilter.addEventListener('change', e => renderDirectory(e.target.value));
closeDialog.addEventListener('click', () => successDialog.close());

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.textContent = '';
  message.className = 'form-message';
  if (!form.checkValidity()) { form.reportValidity(); return; }

  const section = SECTIONS[sectionSelect.value];
  const clubRecord = findClub(sectionSelect.value, clubSelect.value);
  if (!section || !clubRecord || !section.classes.includes(classSelect.value)) {
    message.textContent = 'Please select a valid class and club for this section.';
    message.classList.add('error');
    return;
  }

  const live = clubAvailability(clubRecord[0], clubRecord[1]);
  if (live.full) {
    message.textContent = 'That club is already full. Please choose another club.';
    message.classList.add('error');
    return;
  }

  const payload = {
    studentName: document.querySelector('#studentName').value.trim(),
    guardianName: document.querySelector('#guardianName').value.trim(),
    guardianPhone: document.querySelector('#guardianPhone').value.trim(),
    guardianEmail: document.querySelector('#guardianEmail').value.trim(),
    section: sectionSelect.value,
    sectionLabel: section.label,
    classLevel: classSelect.value,
    club: clubRecord[0],
    session: SESSION,
    term: TERM
  };

  submitButton.disabled = true;
  submitButton.firstElementChild.textContent = 'Submitting…';
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Registration could not be submitted.');
    successText.textContent = `${payload.studentName} has been registered for ${payload.club}${data.reference ? ` (Reference: ${data.reference})` : ''}.`;
    successDialog.showModal();
    form.reset();
    fillClasses([], 'Select section first');
    clubSelect.innerHTML = '<option value="">Select section first</option>';
    clubSelect.disabled = true;
    clubSummary.hidden = true;
    directoryFilter.value = 'all';
    await loadAvailability();
  } catch (error) {
    message.textContent = error.message || 'Something went wrong. Please try again.';
    message.classList.add('error');
    await loadAvailability();
  } finally {
    submitButton.disabled = false;
    submitButton.firstElementChild.textContent = 'Submit registration';
  }
});

renderDirectory();
loadAvailability();
