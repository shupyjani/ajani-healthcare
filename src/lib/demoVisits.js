/*
 * The demonstration round.
 *
 * Every person, address, postcode and reference here is invented. The shift is
 * the one the Ajani Mobile screenshots show — Naomi Adeyemi's Southside round
 * of seven visits, two already complete and one in hand — so the browser
 * recreation opens on the same story the case study's captures do.
 *
 * The date is a fixed string rather than a computed one. A demo that reads
 * "today" from the clock would make its own tests non-deterministic and would
 * drift out of step with the screenshots beside it.
 *
 * This module is data only. The rules that act on it live in demoState.js.
 */

export const PRACTITIONER = {
  name: 'Naomi Adeyemi',
  initials: 'NA',
  role: 'Community support practitioner',
  team: 'Southside field team',
  staffReference: 'FT-2291',
  round: 'Southside · Round 4',
};

export const SHIFT = {
  greeting: 'Good afternoon, Naomi',
  date: 'Monday 7 September',
  hours: '7:30–15:45',
};

export const APPLICATION = {
  name: 'Ajani Mobile',
};

/*
 * Seven visits, in chronological order: two completed, one arrived, four
 * planned. That is the 2-of-7 the shift summary opens on.
 */
/* References are "AV" — Ajani Visit — plus a stable sequential number. */
export const INITIAL_VISITS = [
  {
    id: 'v1',
    reference: 'AV-1041',
    name: 'Marguerite Okonjo',
    type: 'Morning personal care',
    start: '7:45',
    end: '8:30',
    duration: '45 min',
    travel: '10 min',
    address: '14 Bramble Court',
    district: 'Selby Vale',
    postcode: 'SV3 6QT',
    priority: false,
    status: 'completed',
    tasks: [
      { id: 'v1t1', label: 'Support with washing and dressing', done: true },
      { id: 'v1t2', label: 'Prepare breakfast and a hot drink', done: true },
      { id: 'v1t3', label: 'Record fluid intake', done: true },
    ],
    notes: ['Prefers the back door; the front gate sticks after rain.'],
  },
  {
    id: 'v2',
    reference: 'AV-1042',
    name: 'Desmond Achebe',
    type: 'Medication support',
    start: '8:45',
    end: '9:15',
    duration: '30 min',
    travel: '12 min',
    address: '8 Larkspur Row',
    district: 'Bournbrook Green',
    postcode: 'SV2 7BD',
    priority: false,
    status: 'completed',
    tasks: [
      { id: 'v2t1', label: 'Check the blister pack against the chart', done: true },
      { id: 'v2t2', label: 'Prompt morning medication', done: true },
      { id: 'v2t3', label: 'Note any missed doses', done: true },
    ],
    notes: ['Daughter usually calls around nine; happy to be interrupted.'],
  },
  {
    id: 'v3',
    reference: 'AV-1043',
    name: 'Priya Raman',
    type: 'Post-discharge review',
    start: '9:40',
    end: '10:40',
    duration: '1 hr',
    travel: '15 min',
    address: '21 Halesmere Gardens',
    district: 'Harbourne Fields',
    postcode: 'SV17 9LP',
    priority: true,
    status: 'arrived',
    tasks: [
      { id: 'v3t1', label: 'Review discharge notes with the client', done: true },
      {
        id: 'v3t2',
        label: 'Check wound dressing',
        hint: 'Photograph not required',
        done: false,
      },
      { id: 'v3t3', label: 'Confirm follow-up appointment is diarised', done: false },
    ],
    notes: [
      'First visit since discharge; escalate any new pain to the duty line.',
      'Mobility frame is kept beside the stairs.',
    ],
  },
  {
    id: 'v4',
    reference: 'AV-1044',
    name: 'Ivor Bankole',
    type: 'Wellbeing and mobility',
    start: '11:00',
    end: '11:45',
    duration: '45 min',
    travel: '14 min',
    address: '3 Pennycress Walk',
    district: 'Selby Vale',
    postcode: 'SV3 8HD',
    priority: false,
    status: 'planned',
    tasks: [
      { id: 'v4t1', label: 'Walk the hallway circuit twice', done: false },
      { id: 'v4t2', label: 'Check the stair rail is secure', done: false },
      { id: 'v4t3', label: 'Log how the exercises were tolerated', done: false },
    ],
    notes: ['Prefers to do the circuit before any paperwork.'],
  },
  {
    id: 'v5',
    reference: 'AV-1045',
    name: 'Halina Nowak',
    type: 'Medication support',
    start: '12:15',
    end: '12:50',
    duration: '35 min',
    travel: '9 min',
    address: '46 Ashcombe Rise',
    district: 'Bournbrook Green',
    postcode: 'SV2 4RN',
    priority: false,
    status: 'planned',
    tasks: [
      { id: 'v5t1', label: 'Prompt midday medication', done: false },
      { id: 'v5t2', label: 'Refill the water jug', done: false },
      { id: 'v5t3', label: 'Check the repeat prescription date', done: false },
    ],
    notes: ['Hard of hearing on the left side.'],
  },
  {
    id: 'v6',
    reference: 'AV-1046',
    name: 'Terrence Boakye',
    type: 'Afternoon personal care',
    start: '13:30',
    end: '14:10',
    duration: '40 min',
    travel: '16 min',
    address: "9 Miller's Yard",
    district: 'Harbourne Fields',
    postcode: 'SV17 2PJ',
    priority: false,
    status: 'planned',
    tasks: [
      { id: 'v6t1', label: 'Support with a change of clothes', done: false },
      { id: 'v6t2', label: 'Prepare a light meal', done: false },
      { id: 'v6t3', label: 'Empty and reline the kitchen bin', done: false },
    ],
    notes: ['Key safe is to the right of the porch.'],
  },
  {
    id: 'v7',
    reference: 'AV-1047',
    name: 'Sunita Kaur',
    type: 'Wellbeing and mobility',
    start: '14:30',
    end: '15:15',
    duration: '45 min',
    travel: '11 min',
    address: '27 Thornleigh Avenue',
    district: 'Selby Vale',
    postcode: 'SV3 5QW',
    priority: false,
    status: 'planned',
    tasks: [
      { id: 'v7t1', label: 'Seated exercises, ten minutes', done: false },
      { id: 'v7t2', label: 'Check the pendant alarm is charged', done: false },
      { id: 'v7t3', label: 'Confirm next week’s visit times', done: false },
    ],
    notes: ['Cat tends to slip out; keep the inner door closed.'],
  },
];

export const INITIAL_PREFERENCES = {
  /* Both defaults match the More screen in the approved captures. */
  showCompletedOnToday: true,
  confirmBeforeCompleting: false,
};
