const profileOrder = ['paul', 'drake', 'aimee', 'erin', 'felix'];

const option = (questionId, letter, emoji, text, profile, reaction) => ({
  id: `${questionId}-${letter}`,
  emoji,
  text,
  reaction,
  weights: { [profile]: 2 },
});

export const questions = [
  {
    id: 'q1', kicker: 'THE FAMILY WEEKEND',
    prompt: 'Someone at dinner says something deeply irritating. What happens next?',
    options: [
      option('q1', 'a', '🍷', 'We exchange a look and agree to discuss it privately later.', 'paul', 'Elegant restraint. For now.'),
      option('q1', 'b', '🔥', 'We say something immediately. Why are we pretending we won’t?', 'drake', 'Dinner has officially become a contact sport.'),
      option('q1', 'c', '🫶', 'One of us redirects while the other checks that everyone is okay.', 'aimee', 'Emotionally functional? At this table? Suspicious.'),
      option('q1', 'd', '🧠', 'We quietly analyze the entire family system in real time.', 'erin', 'The debrief document already has headings.'),
      option('q1', 'e', '😈', 'We retreat into our own world and make increasingly horrible jokes.', 'felix', 'The shared look says several prosecutable things.'),
    ],
  },
  {
    id: 'q2', kicker: 'PARTNER CRIMES',
    prompt: 'Your partner has made an absolutely terrible decision. Your first response?',
    options: [
      option('q2', 'a', '💍', '“Sweetheart…why would you do that?”', 'paul', 'Concerned spouse voice: activated.'),
      option('q2', 'b', '📣', '“I fucking told you this was a bad idea.”', 'drake', 'Vindication first. Triage second.'),
      option('q2', 'c', '🧯', 'Fix the immediate problem; process feelings after.', 'aimee', 'Practical love is still love.'),
      option('q2', 'd', '📊', '“Explain your reasoning. I need the complete decision tree.”', 'erin', 'A root-cause analysis will now occur.'),
      option('q2', 'e', '🍿', 'Depending on how funny it is, I may help.', 'felix', 'This is why the neighbors worry.'),
    ],
  },
  {
    id: 'q3', kicker: 'THE CROSSBOW PROBLEM',
    prompt: 'A bolt comes through the dining-room window. Your instinctive division of labor is…',
    options: [
      option('q3', 'a', '🏠', 'One protects the family; the other tries to restore order.', 'paul', 'The hosts remain the hosts.'),
      option('q3', 'b', '📢', 'Both of us start yelling instructions simultaneously.', 'drake', 'Volume is a tactical philosophy.'),
      option('q3', 'c', '🤝', 'One gets people to safety while the other gathers information.', 'aimee', 'Competent teamwork. Refreshing.'),
      option('q3', 'd', '🪤', 'One secures the room while the other asks why this is happening.', 'erin', 'Tactics and motive, running in parallel.'),
      option('q3', 'e', '🪓', 'One has found a weapon; the other is disturbingly excited.', 'felix', 'Not your first apocalypse fantasy, apparently.'),
    ],
  },
  {
    id: 'q4', kicker: 'MARITAL BRAND',
    prompt: 'Which sentence sounds most like your relationship?',
    options: [
      option('q4', 'a', '🏡', '“We’ve built our whole life together.”', 'paul', 'Shared history is the foundation.'),
      option('q4', 'b', '🥊', '“We can fight with each other. Nobody else gets to.”', 'drake', 'A closed-loop combat system.'),
      option('q4', 'c', '💛', '“We actually like each other as people.”', 'aimee', 'Frankly radical in this family.'),
      option('q4', 'd', '🔬', '“Our marriage is 40% love and 60% ongoing analysis.”', 'erin', 'The analysis is also a love language.'),
      option('q4', 'e', '🦇', '“We make each other substantially weirder.”', 'felix', 'True romance is mutual corruption.'),
    ],
  },
  {
    id: 'q5', kicker: 'BIG SECRET ENERGY',
    prompt: 'You discover your partner has been keeping an enormous secret.',
    options: [
      option('q5', 'a', '💔', 'Devastated. Trust is the entire foundation.', 'paul', 'The emotional architecture is shaking.'),
      option('q5', 'b', '💥', 'Furious—mostly because you lied to me.', 'drake', 'The argument will have chapters.'),
      option('q5', 'c', '🚨', 'First determine whether it creates an immediate threat.', 'aimee', 'Emotions can wait outside the danger zone.'),
      option('q5', 'd', '🗂️', 'I need the timeline, motives, dependencies, and who else knew.', 'erin', 'Please begin with the executive summary.'),
      option('q5', 'e', '🤯', '“Okay, but objectively? This is kind of insane.”', 'felix', 'Horrified. Intrigued. Listening.'),
    ],
  },
  {
    id: 'q6', kicker: 'TRUST EXERCISE',
    prompt: 'Your partner says “Trust me.” Your internal reaction?',
    options: [
      option('q6', 'a', '🥹', 'Of course.', 'paul', 'No follow-up questions. Pure faith.'),
      option('q6', 'b', '🤨', 'Depends what you’ve done.', 'drake', 'Historical data has entered the chat.'),
      option('q6', 'c', '🧰', 'Give me the relevant information first.', 'aimee', 'Trust, but make it actionable.'),
      option('q6', 'd', '🧐', 'Define “trust.”', 'erin', 'The contract requires clearer terms.'),
      option('q6', 'e', '🚩', 'Absolutely not—but continue.', 'felix', 'Against judgment, the floor is yours.'),
    ],
  },
  {
    id: 'q7', kicker: 'OUTSIDER ATTACK',
    prompt: 'Somebody starts taking shots at your partner at dinner.',
    options: [
      option('q7', 'a', '🕊️', 'Try to calm everyone down before it becomes a scene.', 'paul', 'A scene is already happening.'),
      option('q7', 'b', '⚔️', 'Immediately join the fight on my partner’s side.', 'drake', 'The alliance treaty is ironclad.'),
      option('q7', 'c', '🛡️', 'Check on my partner, then shut it down cleanly.', 'aimee', 'Protective without the pyrotechnics.'),
      option('q7', 'd', '🎯', 'Expose the attacker’s exact insecurity with one precise question.', 'erin', 'Surgical. Minimal blood loss.'),
      option('q7', 'e', '🤭', 'Whisper something horrible and both start laughing.', 'felix', 'Psychological warfare by inside joke.'),
    ],
  },
  {
    id: 'q8', kicker: 'SURVIVAL ODDS',
    prompt: 'Be completely serious: which one of you survives *You’re Next*?',
    options: [
      option('q8', 'a', '🫂', 'We either both survive or neither does.', 'paul', 'Romantic. Statistically concerning.'),
      option('q8', 'b', '🏃', 'Me—my partner would waste valuable time arguing.', 'drake', 'The argument continues while running.'),
      option('q8', 'c', '🧡', 'My partner. They become terrifyingly capable under pressure.', 'aimee', 'Supportive and plausibly correct.'),
      option('q8', 'd', '♟️', 'Depends whether it requires improvisation or manipulation.', 'erin', 'Naturally, you need the scenario matrix.'),
      option('q8', 'e', '🚓', 'Both—but the police would have several follow-up questions.', 'felix', 'Survivors, technically.'),
    ],
  },
  {
    id: 'q9', kicker: 'THE PHONE CALL',
    prompt: 'Your spouse says, “I may have done something.” What do you ask first?',
    options: [
      option('q9', 'a', '❤️', '“Are you okay?”', 'paul', 'Person first, catastrophe second.'),
      option('q9', 'b', '😤', '“What the fuck did you do?”', 'drake', 'A classic for a reason.'),
      option('q9', 'c', '⏱️', '“Does this require immediate action?”', 'aimee', 'The emergency has been triaged.'),
      option('q9', 'd', '📝', '“Start at the beginning.”', 'erin', 'No detail will be omitted.'),
      option('q9', 'e', '⚖️', '“Do we need an attorney?”', 'felix', 'Prepared for the brand of chaos you married.'),
    ],
  },
  {
    id: 'q10', kicker: 'LOVE LANGUAGE',
    prompt: 'Which form of affection is strongest in your relationship?',
    options: [
      option('q10', 'a', '🫖', 'Caretaking and building a shared life.', 'paul', 'Love looks like home.'),
      option('q10', 'b', '🐺', 'Fierce, occasionally loud protectiveness.', 'drake', 'Tenderness with its teeth out.'),
      option('q10', 'c', '🔧', 'Practical support—solving things for each other.', 'aimee', 'Acts of service, crisis edition.'),
      option('q10', 'd', '🧬', 'Being deeply and specifically understood.', 'erin', 'Seen down to the source code.'),
      option('q10', 'e', '🖤', 'Dark humor and complete acceptance of our peculiarities.', 'felix', 'A safe habitat for both weirdos.'),
    ],
  },
  {
    id: 'q11', kicker: 'CRISPIAN’S PROPOSAL',
    prompt: 'Millions are on the table, but getting them requires Crispian-level scheming.',
    options: [
      option('q11', 'a', '🙅', 'Absolutely not. Some things matter more than money.', 'paul', 'The moral center holds.'),
      option('q11', 'b', '😡', 'No—and I’m furious you even suggested it.', 'drake', 'Proposal rejected at maximum volume.'),
      option('q11', 'c', '📉', 'No. The risk/reward ratio is idiotic.', 'aimee', 'Ethics and basic competence agree.'),
      option('q11', 'd', '🏗️', 'I spend three hours explaining why the plan is structurally incompetent.', 'erin', 'Murder aside, the governance is terrible.'),
      option('q11', 'e', '👂', 'Murder? No. But I admit I want to hear the complete pitch.', 'felix', 'For critique purposes only, obviously.'),
    ],
  },
  {
    id: 'q12', kicker: 'FINAL GIRL REVEAL',
    prompt: 'Your spouse has an Erin-level hidden skill set. Your honest reaction?',
    options: [
      option('q12', 'a', '🥺', '“How did I not know this about you?”', 'paul', 'A tender identity crisis.'),
      option('q12', 'b', '📣', '“WHY HAVE YOU NEVER TOLD ME THIS?”', 'drake', 'Pride and outrage arrive together.'),
      option('q12', 'c', '🙌', 'Enormous relief. “Great. You’re in charge.”', 'aimee', 'Delegation has never felt so sexy.'),
      option('q12', 'd', '🤓', 'Impressed—and offended that I had insufficient data.', 'erin', 'The dossier was critically incomplete.'),
      option('q12', 'e', '🥵', 'Immediate attraction increase of approximately 400%.', 'felix', 'Competence: the universal aphrodisiac.'),
    ],
  },
];

export const results = {
  'paul-aubrey': {
    slug: 'paul-aubrey', profile: 'paul', couple: 'Paul + Aubrey', badge: 'THE LIFE-BUILDERS', emoji: '🏡🍷',
    headline: 'You built the life. You host the dinner. You just want everyone to behave.',
    diagnosis: 'Your relationship is anchored in shared history, home, ritual, and a sincere belief in “us.” You are emotionally intertwined, hospitable, and perhaps a little too optimistic about what one family dinner can survive.',
    strength: 'Loyalty, stability, and a genuine shared world.', flaw: 'Believing order can be restored if everyone would simply calm down.', survival: '54%', color: 'yellow',
  },
  'drake-kelly': {
    slug: 'drake-kelly', profile: 'drake', couple: 'Drake + Kelly', badge: 'THE COMBUSTIBLE LOYALISTS', emoji: '🔥🥊',
    headline: 'You can fight each other. Everyone else needs to back the hell up.',
    diagnosis: 'You know every button your partner has because you installed half of them. The volume is high, the friction is real, and the loyalty is absolute. The instant an outsider crosses the line, you become a unified military alliance.',
    strength: 'Ferocious protectiveness and zero ambiguity about whose side you are on.', flaw: 'Occasionally mistaking escalation for communication.', survival: '63%', color: 'pink',
  },
  'aimee-tariq': {
    slug: 'aimee-tariq', profile: 'aimee', couple: 'Aimee + Tariq', badge: 'THE EARNEST ART COUPLE', emoji: '🎬💛',
    headline: 'You actually like your spouse, which is already suspicious in this family.',
    diagnosis: 'Your relationship runs on uncomplicated affection, curiosity, encouragement, and practical care. One of you could make an obscure documentary and the other would sincerely say, “I think that’s amazing.” We have upgraded the original survival package.',
    strength: 'Mutual enthusiasm without constant relationship theater.', flaw: 'Assuming the room contains more reasonable people than it does.', survival: '71%', color: 'cyan',
  },
  'erin-crispian': {
    slug: 'erin-crispian', profile: 'erin', couple: 'Erin + Crispian', badge: 'THE BRAIN + HIDDEN MACHINERY', emoji: '🧠🪤',
    headline: 'One of you has already modeled the crisis. The other has underestimated the model.',
    diagnosis: 'Your dynamic is intelligence plus asymmetry: two people who believe they understand each other, while at least one contains substantially more machinery than the other realizes. In the healthy version, every discovery makes your spouse more interesting.',
    strength: 'Observation, adaptation, and turning chaos into a solvable system.', flaw: 'Assuming the person beside you has disclosed their full architecture.', survival: '87%', color: 'purple',
  },
  'felix-zee': {
    slug: 'felix-zee', profile: 'felix', couple: 'Felix + Zee', badge: 'THE LITTLE FREAKS WHO FOUND EACH OTHER', emoji: '🖤😈',
    headline: 'Normal was never on the table, and honestly that improves the table.',
    diagnosis: 'You found the person with whom you can finally say the thing that cannot be said around normal people. Your relationship runs on deadpan humor, mutual enabling, alarming eye contact, and total comfort with each other’s darkness. Not the murder part.',
    strength: 'Radical acceptance and a world-class private sense of humor.', flaw: 'An occasional inability to distinguish “funny” from “inadvisable.”', survival: '76%', color: 'black',
  },
  'erin-zee': {
    slug: 'erin-zee', profile: 'hybrid', couple: 'Erin + Zee', badge: 'SECRET COUPLE UNLOCKED', emoji: '🪤🍷', secret: true,
    headline: 'One builds the Home Alone death apparatus. The other moves it two inches left.',
    diagnosis: 'This couple does not exist in the film, but it absolutely should. One of you turns danger into a systems problem; the other leans against the counter, drinks wine, and provides morally questionable art direction. Strategy meets darkness. Competence meets commentary.',
    strength: 'Extremely complementary intelligence with no conversational boundaries.', flaw: 'The police will have several follow-up questions.', survival: '96%', color: 'secret',
  },
};

const answerIndex = new Map(
  questions.flatMap((question) => question.options.map((answer) => [answer.id, { ...answer, questionId: question.id }]))
);

export function getProgress(answerCount) {
  const safeCount = Math.min(questions.length, Math.max(0, Number(answerCount) || 0));
  return Math.round((safeCount / questions.length) * 100);
}

export function scoreQuiz(answerIds) {
  if (!Array.isArray(answerIds) || answerIds.length !== questions.length) {
    throw new Error(`Answer all ${questions.length} questions before scoring.`);
  }

  const selected = answerIds.map((id) => answerIndex.get(id));
  if (selected.some((answer) => !answer)) throw new Error('Unknown quiz answer.');
  if (new Set(selected.map((answer) => answer.questionId)).size !== questions.length) {
    throw new Error('Choose one answer per question.');
  }

  const totals = Object.fromEntries(profileOrder.map((profile) => [profile, 0]));
  selected.forEach((answer) => {
    Object.entries(answer.weights).forEach(([profile, points]) => { totals[profile] += points; });
  });

  const strategic = totals.erin;
  const dark = totals.felix;
  if (strategic >= 10 && dark >= 10 && Math.abs(strategic - dark) <= 4) return results['erin-zee'];

  const winningProfile = profileOrder.reduce((winner, profile) =>
    totals[profile] > totals[winner] ? profile : winner
  , profileOrder[0]);

  return Object.values(results).find((result) => result.profile === winningProfile);
}

export function createQuizState() {
  return { view: 'cover', index: 0, answers: [] };
}

export function startQuiz() {
  return { view: 'question', index: 0, answers: [] };
}

export function answerQuestion(state, answerId) {
  if (state.view !== 'question') throw new Error('Quiz is not accepting answers.');
  const answer = answerIndex.get(answerId);
  if (!answer || answer.questionId !== questions[state.index]?.id) {
    throw new Error('Answer does not belong to the current question.');
  }
  const answers = [...state.answers, answerId];
  const complete = answers.length === questions.length;
  return { view: complete ? 'result' : 'question', index: Math.min(answers.length, questions.length - 1), answers };
}

export function goBack(state) {
  if (state.view === 'cover' || state.answers.length === 0) return state;
  const answers = state.answers.slice(0, -1);
  return { view: 'question', index: answers.length, answers };
}

export function resetQuiz() {
  return createQuizState();
}
