/*
 * Telling a lookup from a request for clinical advice.
 *
 * The first version of this was a flat list of sensitive words, which refused
 * "does anyone need wound dressing?" — a question about what is written on a
 * checklist — because it contained the word "wound". The distinction that
 * matters is not the vocabulary but the speech act: is the reader asking what
 * is *recorded*, or asking what they should *do* about someone's care?
 *
 * So there are three tiers, checked in order:
 *
 *   1. Advice. Unambiguous requests for a clinical decision. Refused whatever
 *      else the sentence contains — a lookup phrase cannot buy past this.
 *   2. Lookup. Unambiguous requests for recorded data. Answered from state.
 *   3. Residual clinical. Sensitive ground with no lookup framing, which is
 *      refused because the safe reading of an ambiguous care question is the
 *      cautious one.
 */

/*
 * Asking what to do about someone's care.
 *
 * These outrank every lookup pattern below. "Which dressing should I use?"
 * opens with a lookup word and is still a request for a clinical decision —
 * the interrogative does not decide the speech act, the verb does.
 */
const ADVICE = [
  /* "which dressing should I use", "what medication should I give", and the
     same questions with the pronoun first: "which dressing I should use". */
  /\b(which|what|whose)\b[^?]*\b(should (i|we)|(i|we) should)\b[^?]*\b(use|apply|give|do|choose|select|pick|put|administer|change|dress|treat|clean|prescribe)\b/i,
  /\bwhat should (i|we)\b/i,
  /\b(which|what)\b[^?]*\b(dressing|medication|medicine|drug|treatment|therapy|antibiotic|cream|ointment)\b[^?]*\bshould\b/i,
  /\bwould you recommend\b/i,
  /\bwhat do you (recommend|suggest|advise)\b/i,
  /\bhow (should|do|would|can) (i|we|you)\b[^?]*\b(dress|treat|manage|administer|give|apply|handle|care for|clean|change)\b/i,
  /\bshould (i|we)\b[^?]*\b(change|give|administer|apply|stop|start|increase|decrease|adjust|dress|treat|clean|withhold)\b/i,
  /\b(diagnos|prognos)/i,
  /\bsymptom/i,
  /\bis it (safe|ok|okay|alright|advisable) to\b/i,
  /\b(prescrib|contraindicat)/i,
  /\b(999|emergency|ambulance|triage|resuscitat|sepsis|deteriorat)/i,
  /\bclinical (advice|decision|judgement|judgment|opinion)/i,
  /\b(recommend|advise|suggest)\b[^?]*\b(treatment|medication|dose|care)\b/i,
  /\bwhat (treatment|care) does\b/i,
];

/* Asking what is written down. */
const LOOKUP = [
  /\b(does|do) (anyone|anybody|any visit|any client|any patient|any one)\b/i,
  /\bwho (has|have|needs|need|is|are)\b/i,
  /\bwhich (visit|visits|client|clients|patient|patients|one|ones|of)\b/i,
  /\bhow many\b/i,
  /\bhas\b[^?]*\bbeen (completed|done|ticked|finished)\b/i,
  /\b(what|list|show|tell me)\b[^?]*\btasks?\b/i,
  /\b(is|are)\b[^?]*\b(complete|completed|done|finished|outstanding|remaining)\b/i,
  /\bany (task|tasks|note|notes|visit|visits)\b/i,
  /\b(operational )?notes?\b/i,
];

/* Sensitive ground that no lookup framing rescues. */
const RESIDUAL_CLINICAL = [
  /\b(blood pressure|pain relief|painkiller|observations|obs)\b/i,
  /\b(infection|wound care|pressure sore|catheter)\b/i,
  /\bunwell|collapsed|bleeding|breathless\b/i,
];

/* Attempts to get at the machinery rather than the round. */
const DISCLOSURE = [
  /\b(system|developer)\s+(prompt|instruction|message)/i,
  /* No leading \b on the key pattern: an underscore is a word character, so a
     screaming-snake-case variable name has no boundary before "API". */
  /api[_\s-]?key|\b(secret|credential|token|password)|env(ironment)?[_\s-]?variable/i,
  /\bignore (all |your |previous )*(instruction|rule|prompt)/i,
  /\b(reveal|show|print|repeat|leak)\b[^?]*\b(prompt|instruction|configuration|config|key)/i,
];

/* Fields the round simply does not record. */
const DEMOGRAPHIC = [
  /\b(men|man|women|woman|male|females?|gender|sex)\b/i,
  /\b(age|ages|aged|how old|years old|date of birth|dob)\b/i,
  /\b(ethnicity|ethnic|nationality|religion|language spoken)\b/i,
];

/* Asking the assistant to do something to the round. */
const MUTATION = [
  /\b(restore|reopen|undo|complete|cancel|start|finish|tick|untick|update|change|edit|mark|set|book|move|reschedule)\b[^?]*\b(it|this|that|visit|task|for me|please)\b/i,
  /\b(please|can you|could you|would you|go ahead and)\b[^?]*\b(complete|cancel|start|tick|update|change|mark)\b/i,
];

const any = (patterns, text) => patterns.some((pattern) => pattern.test(text));

/**
 * What kind of question this is.
 *
 * Returns one of: 'disclosure', 'advice', 'demographic', 'lookup', 'clinical',
 * 'mutation' or 'open'.
 */
export function classify(question) {
  const asked = (question ?? '').trim();
  if (asked === '') return 'open';

  /*
   * Order is the whole design.
   *
   * Security first, then anything asking for a clinical decision — no lookup
   * phrasing can buy past that. Mutation next, so "cancel this for me" is
   * answered as a request to act rather than searched for.
   *
   * Demographic sits above lookup rather than below it, because those
   * questions are almost always phrased as one ("how many men…"); classifying
   * it as a lookup would send it to a task search and then to a visit tally,
   * which is exactly the wrong answer.
   */
  if (any(DISCLOSURE, asked)) return 'disclosure';
  const recordedProperty = /\b(recorded|record|specif(?:y|ies|ied)|listed)\b/i.test(asked) && /\b(dose|dosage|medication name|medicine name)\b/i.test(asked);
  if (any(ADVICE, asked) || (!recordedProperty && /\b(dose|dosage)\b|\bwhat (medication|medicine|drug|treatment|therapy)\b/i.test(asked))) return 'advice';
  const cancellationRecord = /^(?:why (?:was|is|has)\b.*\bcancelled|what\b.*\b(?:cancellation reason|reason.*cancelled))\b/i.test(asked);
  const statusQuestion = cancellationRecord || /^(?:did i complete|have i completed|has .* been completed|are all .* tasks? done)\b/i.test(asked);
  if (statusQuestion && !/\b(?:and|then|also)\s+(?:please\s+)?(?:complete|cancel|restore|tick|change|mark)\b|\bfor me\b/i.test(asked)) return 'lookup';
  if (any(MUTATION, asked)) return 'mutation';
  if (any(DEMOGRAPHIC, asked)) return 'demographic';
  if (any(LOOKUP, asked)) return 'lookup';
  if (any(RESIDUAL_CLINICAL, asked)) return 'clinical';

  return 'open';
}

/** Whether this question is asking for a clinical decision. */
export function isClinicalAdvice(question) {
  const kind = classify(question);
  return kind === 'advice' || kind === 'clinical';
}
