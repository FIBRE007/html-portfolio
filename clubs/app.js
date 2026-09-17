const SECTIONS = {
  'high-school': {
    label: 'High School',
    note: 'High School clubs',
    classes: ['JH 1', 'JH 2', 'JH 3', 'SH 1', 'SH 2', 'SH 3'],
    clubs: [
      ['Boys Scout', 40], ['Drama Club', 30], ['Foreign Languages Club', 25],
      ['Girl Guide / Brownie Club', 40], ['JEC Club', 25], ['JET Club', 35],
      ['Knowledge Empowerment Club', 25], ['Literary & Debating Club', 30], ['Maths Club', 35],
      ['Nigerian Languages Club', 25], ['Red Cross Club', 35], ['Young Farmers Club', 25]
    ]
  },
  'upper-primary': {
    label: 'Upper Primary', note: 'Grades 4 and 5 only', classes: ['Grade 4', 'Grade 5'],
    clubs: [
      ['Fine Arts Club (Upper Primary)', 40], ['Home Makers Club', 35],
      ['ICT Club (Upper Primary)', 25], ['Music Club (Upper Primary)', 40]
    ]
  },
  'lower-primary': {
    label: 'Lower Primary', note: 'Grades 1, 2 and 3 only', classes: ['Grade 1', 'Grade 2', 'Grade 3'],
    clubs: [
      ['Fine Arts Club (Lower Primary)', 35], ['Home Makers Club (Lower Primary)', 35],
      ['ICT Club (Lower Primary)', 35], ['Music Club (Lower Primary)', 35]
    ]
  },
  nursery: {
    label: 'Nursery', note: 'Kindergarten pupils only', classes: ['Kindergarten'],
    clubs: [
      ['Fine Arts Club (Nursery)', 20], ['ICT Club (Nursery)', 20], ['JEC Club (Nursery)', 15],
      ['Knowledge Empowerment Club (Nursery)', 15], ['Languages Club (Nursery)', 15]
    ]
  }
};

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
function fill(select, items, placeholder) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  items.forEach(item => {
    const option = document.createElement('option');
    option.value = Array.isArray(item) ? item[0] : item;
    option.textContent = Array.isArray(item) ? `${item[0]} — max ${item[1]}` : item;
    select.append(option);
  });
  select.disabled = !items.length;
}
function renderDirectory(filter = 'all') {
  const keys = filter === 'all' ? Object.keys(SECTIONS) : [filter];
  directory.innerHTML = keys.map(key => {
    const section = SECTIONS[key];
    return `<section class="club-group">
      <div class="club-group__head"><h3>${esc(section.label)}</h3><span>${esc(section.note)}</span></div>
      <div class="club-list">${section.clubs.map(([name, capacity]) =>
        `<div class="club-card"><span class="club-card__name">${esc(name)}</span><span class="capacity">Maximum ${capacity}</span></div>`
      ).join('')}</div>
    </section>`;
  }).join('');
}
function updateSummary() {
  const section = SECTIONS[sectionSelect.value];
  const selected = section?.clubs.find(([name]) => name === clubSelect.value);
  if (!section || !classSelect.value || !selected) {
    clubSummary.hidden = true;
    clubSummary.innerHTML = '';
    return;
  }
  clubSummary.hidden = false;
  clubSummary.innerHTML = `<strong>${esc(selected[0])}</strong> is available for ${esc(section.label)}. Published maximum capacity: <strong>${selected[1]}</strong>.`;
}

sectionSelect.addEventListener('change', () => {
  const section = SECTIONS[sectionSelect.value];
  message.textContent = '';
  message.className = 'form-message';
  if (!section) {
    fill(classSelect, [], 'Select section first');
    fill(clubSelect, [], 'Select section first');
    updateSummary();
    return;
  }
  fill(classSelect, section.classes, 'Select class');
  fill(clubSelect, section.clubs, 'Select club');
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
  const clubRecord = section?.clubs.find(([name]) => name === clubSelect.value);
  if (!section || !clubRecord || !section.classes.includes(classSelect.value)) {
    message.textContent = 'Please select a valid class and club for this section.';
    message.classList.add('error');
    return;
  }

  const payload = {
    studentName: document.querySelector('#studentName').value.trim(),
    studentId: document.querySelector('#studentId').value.trim(),
    section: sectionSelect.value,
    sectionLabel: section.label,
    classLevel: classSelect.value,
    club: clubRecord[0],
    publishedCapacity: clubRecord[1],
    guardianPhone: document.querySelector('#guardianPhone').value.trim(),
    guardianEmail: document.querySelector('#guardianEmail').value.trim(),
    session: '2026/2027', term: 'Joy Term'
  };

  submitButton.disabled = true;
  submitButton.firstElementChild.textContent = 'Submitting…';
  try {
    const response = await fetch('/api/register', {
      method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Registration could not be submitted.');
    const ref = data.reference || data.registrationId || data.id || '';
    successText.textContent = `${payload.studentName} has been submitted for ${payload.club}${ref ? ` (Reference: ${ref})` : ''}.`;
    successDialog.showModal();
    form.reset();
    fill(classSelect, [], 'Select section first');
    fill(clubSelect, [], 'Select section first');
    clubSummary.hidden = true;
    directoryFilter.value = 'all';
    renderDirectory();
  } catch (error) {
    message.textContent = error.message || 'Something went wrong. Please try again.';
    message.classList.add('error');
  } finally {
    submitButton.disabled = false;
    submitButton.firstElementChild.textContent = 'Submit registration';
  }
});

renderDirectory();
