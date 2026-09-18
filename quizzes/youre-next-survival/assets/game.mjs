const statNames = ['awareness', 'preparation', 'nerve', 'deception', 'adaptation', 'ruthlessness', 'control'];
const sceneOrder = ['arrival', 'dinner', 'impact', 'lockdown', 'offer', 'countermove', 'reckoning'];

const hasFlag = (state, flag) => Boolean(state.flags[flag]);
const statAtLeast = (stat, minimum) => (state) => state.stats[stat] >= minimum;
const any = (...checks) => (state) => checks.some((check) => check(state));
const all = (...checks) => (state) => checks.every((check) => check(state));

const choice = (id, label, detail, consequence, effects = {}, available = () => true) => ({
  id, label, detail, consequence, effects, available,
});

export const scenes = [
  {
    id: 'arrival',
    number: '01',
    eyebrow: 'THE DAVISON ESTATE · 6:43 P.M.',
    title: 'The house is beautiful in the way isolated houses usually regret.',
    body: 'Dinner has not started. Nobody is screaming. You have exactly enough time to notice one thing before the family absorbs you.',
    variantNote: {
      fox: 'Beyond the west windows, something disturbs the tree line and then becomes perfectly still.',
      lamb: 'The front gate is open now. You are almost certain it was closed when the car arrived.',
    },
    choices: [
      choice('inspect-windows', 'Check the windows and sight lines.', 'Pretty houses reveal what they expect you not to examine.', 'Two latches have been loosened from inside. That is not weather damage.', { stats: { awareness: 2 }, flags: ['windowRead'], evidence: 'You identified an entry point before anyone admitted there was a threat.' }),
      choice('read-family', 'Study the family instead.', 'Architecture is predictable. People require more attention.', 'Three people are performing normal. One of them keeps checking whether the others believe it.', { stats: { awareness: 1, deception: 1 }, flags: ['familyRead'], evidence: 'You treated the dinner table as part of the crime scene.' }),
      choice('map-exits', 'Find every way out.', 'You do not need to be frightened to dislike having only one exit.', 'Front door, kitchen door, cellar hatch, upstairs balcony. Four exits. Only three are quiet.', { stats: { control: 2 }, flags: ['exitMap'], evidence: 'You knew how to leave before staying became a decision.' }),
      choice('pour-wine', 'Pour the good wine and stop pretending this family is normal.', 'If something happens, at least you will not have wasted the Burgundy.', 'A perfectly reasonable decision with morally flexible downstream consequences.', { stats: { nerve: 2, ruthlessness: 1 }, flags: ['wine'], evidence: 'You entered the crisis calm enough to make other people nervous.' }),
    ],
  },
  {
    id: 'dinner',
    number: '02',
    eyebrow: 'DINNER · EVERYONE STILL HAS A FACE',
    title: 'The argument begins before the first course ends.',
    body: 'Old resentments are being passed around with the vegetables. You can choose a position, or you can choose a target.',
    variantNote: { fox: 'A faint reflection moves behind the dining-room glass.', lamb: 'Somewhere above you, a floorboard answers a question nobody asked.' },
    choices: [
      choice('seat-kitchen', 'Move closer to the kitchen.', 'The room with knives, weight, heat, and several bad ideas.', 'You now control the shortest route to the most useful room in the house.', { stats: { preparation: 1 }, flags: ['nearKitchen'], evidence: 'You positioned yourself beside resources instead of reassurance.' }),
      choice('seat-exit', 'Keep the nearest exit behind you.', 'Nobody gets to stand between you and outside.', 'You can leave quickly. The question will be whether you choose to.', { stats: { control: 1 }, flags: ['nearExit'], evidence: 'You preserved an exit while everyone else preserved appearances.' }),
      choice('provoke-crispian', 'Ask Crispian one impolite, precise question.', 'People reveal themselves while deciding how offended to be.', 'He answers too quickly. Felix watches him instead of you.', { stats: { awareness: 1, deception: 1 }, flags: ['crispianFlinch'], evidence: 'You found the weakest seam in the family story.' }),
      choice('watch-reflections', 'Ignore the argument. Watch the glass.', 'The family is loud enough to cover movement outside.', 'A shape crosses the window without appearing in the room. You count the seconds until it returns.', { stats: { awareness: 2 }, flags: ['reflection'], evidence: 'You watched the only surface that could not lie convincingly.' }),
    ],
  },
  {
    id: 'impact',
    number: '03',
    eyebrow: 'THE FIRST BOLT',
    title: 'The window explodes inward. Dinner is over.',
    body: 'Glass, shouting, blood, and six contradictory instructions arrive at once. You have one clean reaction before panic owns the room.',
    variantNote: { fox: 'The shot came from the tree line you noticed earlier.', lamb: 'The angle is wrong. Someone is already inside the perimeter.' },
    choices: [
      choice('track-angle', 'Track the angle before you move.', 'A projectile is also information.', 'West lawn. Elevated. A second attacker is using the panic to approach from below.', { stats: { awareness: 2, adaptation: 1 }, casualties: 1, flags: ['trajectory'], evidence: 'You turned the first attack into a map of the second.' }),
      choice('pull-down', 'Pull the nearest person below the table.', 'One useful person is better than another body blocking the hall.', 'They survive the second bolt. They will remember who moved first.', { stats: { nerve: 1, control: 1 }, flags: ['savedGuest'], evidence: 'You acted before the room finished understanding what happened.' }),
      choice('rush-door', 'Charge the front door.', 'Speed feels like control right up until the wire catches.', 'The exit was prepared for panic. You survive it, but not cleanly.', { stats: { ruthlessness: 2 }, injuries: 2, flags: ['criticalMistake'], evidence: 'You moved decisively. The attackers had planned for decisive people.' }),
      choice('play-dead', 'Go still and let the room forget you.', 'Being underestimated is a temporary weapon.', 'A masked figure looks directly at you and decides you are no longer relevant. Excellent.', { stats: { deception: 2, nerve: 1 }, flags: ['falseVictim'], evidence: 'You made helplessness look convincing enough to become dangerous.' }),
    ],
  },
  {
    id: 'lockdown',
    number: '04',
    eyebrow: 'NINETY SECONDS',
    title: 'The house gives you one brief chance to change its meaning.',
    body: 'You cannot secure everything. Choose what the attackers will believe is safe.',
    variantNote: { fox: 'Footsteps circle toward the west hall.', lamb: 'The upstairs movement stops when the lights flicker.' },
    choices: [
      choice('funnel-hallway', 'Turn the west hall into a funnel.', 'Do not defend every room. Decide which room they are allowed to reach.', 'The house now has one obvious path. Obvious to them, anyway.', { stats: { preparation: 2, control: 2 }, flags: ['hallwayFunnel'], evidence: 'You used the building to control where the fight could happen.' }, any((state) => hasFlag(state, 'windowRead'), (state) => hasFlag(state, 'reflection'), statAtLeast('awareness', 3))),
      choice('darken-house', 'Kill the lights and move the furniture.', 'Memory favors the person who chose the darkness.', 'The estate becomes unfamiliar to everyone except you.', { stats: { preparation: 1, deception: 1 }, flags: ['darkHouse'], evidence: 'You made familiar rooms hostile to the people invading them.' }),
      choice('arm-kitchen', 'Make the kitchen answerable to you.', 'Nothing elaborate. Just position, weight, heat, and timing.', 'The most ordinary room in the house becomes the least forgiving.', { stats: { preparation: 2, ruthlessness: 1 }, flags: ['kitchenArmed'], evidence: 'You prepared an ordinary room to punish extraordinary confidence.' }, (state) => hasFlag(state, 'nearKitchen')),
      choice('clear-exit', 'Prepare the quiet exit.', 'Survival is not cowardice. It is an option you keep alive.', 'The cellar hatch will open without light or noise. Nobody else notices.', { stats: { preparation: 1, control: 2 }, flags: ['escapeReady'], evidence: 'You created an exit nobody could take away from you.' }, any((state) => hasFlag(state, 'exitMap'), (state) => hasFlag(state, 'nearExit'))),
      choice('barricade-room', 'Barricade one room and wait.', 'A door is a plan if you do not ask it to do too much.', 'It buys time. It also tells everyone exactly where you are.', { stats: { preparation: 1 }, flags: ['barricaded'], evidence: 'You bought time, but surrendered uncertainty.' }),
    ],
  },
  {
    id: 'offer',
    number: '05',
    eyebrow: 'THE VOICE BEHIND THE MASK',
    title: 'An intruder finds you alone—and offers you a place on the winning side.',
    body: '“You don’t have to be one of them.” The voice is calm. Somewhere nearby, somebody in the family stops pretending to be afraid.',
    variantNote: { fox: 'The fox mask is spattered with somebody else’s certainty.', lamb: 'The lamb mask tilts, waiting to see whether you need morality explained.' },
    choices: [
      choice('refuse-loudly', 'Refuse loudly enough for the house to hear.', 'If there are sides, you have chosen yours.', 'The intruder steps back. Everyone now knows where you stand—and where you are.', { stats: { nerve: 2, ruthlessness: 1 }, flags: ['declaredEnemy'], evidence: 'You made your allegiance unmistakable, even at tactical cost.' }),
      choice('pretend-join', 'Agree just convincingly enough.', 'Cooperation is a costume. Wear it until it becomes useful.', 'The mask relaxes. You are given a route, a name, and far too much confidence.', { stats: { deception: 3 }, flags: ['falseAlliance', 'insideJob'], evidence: 'You entered the conspiracy without surrendering control of yourself.' }),
      choice('accept-offer', 'Accept. Mean it—for now.', 'Good and bad are luxuries. Leverage is immediate.', 'They tell you which family member paid them. They do not ask what you intend to do with that fact.', { stats: { ruthlessness: 2 }, flags: ['trueAlliance', 'insideJob'], evidence: 'You crossed the line deliberately and kept walking.' }),
      choice('ask-price', 'Ask what the family is worth.', 'People explain themselves when they believe greed is listening.', 'The intruder gives you the inheritance figure and accidentally confirms the inside job.', { stats: { awareness: 1, deception: 1 }, flags: ['insideJob'], evidence: 'You made greed answer a question suspicion could not.' }),
      choice('signal-erin', 'Keep talking while signaling Erin.', 'One conversation. Two audiences.', 'Erin disappears from the intruder’s sightline. The mask never notices.', { stats: { control: 2, deception: 1 }, flags: ['erinAlliance'], evidence: 'You created an alliance without asking the enemy’s permission.' }, any((state) => hasFlag(state, 'savedGuest'), statAtLeast('awareness', 4))),
    ],
  },
  {
    id: 'countermove',
    number: '06',
    eyebrow: 'THE HOUSE MOVES',
    title: 'The attackers commit to the version of you they think they understand.',
    body: 'This is the useful moment. Their plan is moving faster than their ability to revise it.',
    variantNote: { fox: 'Two masks enter from the west, exactly where the first shot taught you to expect them.', lamb: 'The upstairs intruder changes route. The second run does not honor the first run’s assumptions.' },
    choices: [
      choice('spring-funnel', 'Let them enter the hallway funnel.', 'A trap works best when impatience completes it.', 'The first attacker blocks the second. The house does the rest.', { stats: { adaptation: 2, control: 2 }, casualties: 2, flags: ['trapWorked'], evidence: 'You made the attackers’ coordination work against them.' }, (state) => hasFlag(state, 'hallwayFunnel')),
      choice('cut-lights-circle', 'Use the dark to circle behind them.', 'They prepared for a victim moving away from danger.', 'You are no longer where their plan says you should be.', { stats: { adaptation: 2, deception: 1, control: 1 }, casualties: 1, flags: ['reversedHunt'], evidence: 'You used their expectation of fear as navigation.' }, (state) => hasFlag(state, 'darkHouse')),
      choice('kitchen-ambush', 'Invite them into the kitchen.', 'The room looks ordinary because they arrived too late to understand it.', 'One mask enters. The second decides not to. A late but intelligent decision.', { stats: { ruthlessness: 2, control: 1 }, casualties: 2, flags: ['kitchenAmbush'], evidence: 'You turned preparation into timing instead of spectacle.' }, (state) => hasFlag(state, 'kitchenArmed')),
      choice('take-exit', 'Use the exit and disappear.', 'You are not obligated to finish somebody else’s movie.', 'By the time anyone checks the cellar, you are already beyond the property line.', { stats: { adaptation: 1, control: 2 }, flags: ['escaped'], evidence: 'You survived without accepting the role the house assigned you.' }, (state) => hasFlag(state, 'escapeReady')),
      choice('feed-false-route', 'Feed your new allies a false route.', 'They wanted inside information. Give them the expensive kind.', 'The masks follow your directions into the wrong room at exactly the right time.', { stats: { deception: 2, adaptation: 2, control: 1 }, casualties: 2, flags: ['doubleCross'], evidence: 'You weaponized the conspiracy’s belief that it had recruited you.' }, any((state) => hasFlag(state, 'falseAlliance'), (state) => hasFlag(state, 'trueAlliance'))),
      choice('follow-orders', 'Follow the plan they give you.', 'For now, obedience keeps you close to the information.', 'You remain useful. Useful is not the same as safe.', { stats: { nerve: 1 }, flags: ['followedOrders'], evidence: 'You survived by becoming useful to people who do not keep useful things forever.' }, (state) => hasFlag(state, 'trueAlliance')),
      choice('improvise', 'Move before a complete plan exists.', 'The house is changing. So are you.', 'It is inelegant, loud, and narrowly successful.', { stats: { adaptation: 1, nerve: 1 }, injuries: 1, flags: ['improvised'], evidence: 'You adapted under pressure, but paid for the missing preparation.' }),
    ],
  },
  {
    id: 'reckoning',
    number: '07',
    eyebrow: 'NO MORE MASKS',
    title: 'The inside player steps forward. Everyone expects you to choose a side.',
    body: 'The surviving intruders want payment. The family wants innocence. Erin wants a clean opening. Nobody has asked what you want.',
    variantNote: { fox: 'Outside, the tree line is quiet again.', lamb: 'The front gate begins to close on its own.' },
    choices: [
      choice('expose-inside', 'Name the inside player and collapse the story.', 'A conspiracy cannot survive once every participant knows who is disposable.', 'The masks turn. The family turns. Erin does not. You kept track of the only person who mattered.', { stats: { awareness: 2, control: 2 }, flags: ['conspiracyExposed'], evidence: 'You understood the whole plan before choosing how to end it.' }, any((state) => hasFlag(state, 'insideJob'), statAtLeast('awareness', 5))),
      choice('turn-factions', 'Give each side one true reason to distrust the other.', 'Do not win the fight. Rewrite who believes they are fighting whom.', 'The alliance tears itself apart while you stand in the only safe geometry left.', { stats: { deception: 2, control: 2 }, casualties: 2, flags: ['usurped'], evidence: 'You replaced both sides’ plan with your own.' }, all((state) => hasFlag(state, 'falseAlliance'), any((state) => hasFlag(state, 'insideJob'), (state) => hasFlag(state, 'familyRead'), (state) => hasFlag(state, 'crispianFlinch')))),
      choice('trust-erin', 'Give Erin the opening.', 'Competence recognizes competence without requiring a speech.', 'She moves. You close the route behind her. Nobody needs to explain the division of labor.', { stats: { adaptation: 1, control: 2 }, casualties: 1, flags: ['erinFinish'], evidence: 'You trusted the one person whose actions survived inspection.' }, (state) => hasFlag(state, 'erinAlliance')),
      choice('walk-away-smiling', 'Let them believe the false alliance held until you are gone.', 'A convincing victim knows when the audience has stopped watching.', 'By the time the story changes, you are already outside it.', { stats: { deception: 1, control: 1 }, flags: ['cleanExit'], evidence: 'You escaped inside the identity the attackers invented for you.' }, (state) => hasFlag(state, 'falseAlliance')),
      choice('commit-conspiracy', 'Commit to the conspiracy.', 'If you chose the wrong side, at least choose it completely.', 'They call you a partner. They still do not give you a weapon or turn their backs.', { stats: { ruthlessness: 1 }, flags: ['collaborator'], evidence: 'You joined the winning plan without securing your place in its ending.' }, (state) => hasFlag(state, 'trueAlliance')),
      choice('eliminate-witnesses', 'Decide there are too many surviving versions of the story.', 'The conspiracy made one final mistake: assuming you wanted a share.', 'When the house goes quiet, there is nobody left to disagree with your account.', { stats: { ruthlessness: 2, control: 2 }, casualties: 7, flags: ['lastStanding'], evidence: 'You did not join either side. You removed the distinction.' }, all((state) => hasFlag(state, 'trueAlliance'), (state) => hasFlag(state, 'kitchenAmbush'), statAtLeast('ruthlessness', 5))),
      choice('charge-last-mask', 'Charge the last visible mask.', 'No plan. No pause. Just impact.', 'There was one more attacker than you counted. There is always one more when anger does the counting.', { stats: { ruthlessness: 2 }, injuries: 1, flags: ['finalMistake'], evidence: 'You chose force after the situation had already changed.' }),
      choice('leave-alone', 'Use the remaining opening and leave.', 'The house can keep its secrets. You are keeping your pulse.', 'You cross the property line without waiting to learn who deserved what.', { stats: { control: 1 }, flags: ['cleanExit'], evidence: 'You refused to confuse closure with survival.' }, any((state) => hasFlag(state, 'escaped'), (state) => hasFlag(state, 'escapeReady'))),
    ],
  },
];

export const outcomes = {
  'everyone-dies': {
    slug: 'everyone-dies', secret: true, rank: 'SECRET ENDING', title: 'Everyone Dies but Kendra',
    verdict: 'The house is silent. The conspiracy is resolved. There will be no sequel.',
    diagnosis: 'You accepted the invitation, learned the machinery, and then removed every person who believed they owned it. This was not the intended solution. It remains difficult to argue with.',
    quote: 'A statistically irresponsible conclusion.',
  },
  'baptised-by-fire': {
    slug: 'baptised-by-fire', rank: 'S-TIER SURVIVOR', title: 'Bad Bitch, Baptised by Fire',
    verdict: 'The game did not make you dangerous. It merely ran out of ways to doubt you.',
    diagnosis: 'You observed before acting, prepared without advertising it, adapted when the plan changed, and kept control when violence made everyone else stupid. Erin would trust you with the other side of the house.',
    quote: 'Competence is not a personality trait. You brought receipts.',
  },
  architect: {
    slug: 'architect', rank: 'A-TIER SURVIVOR', title: 'The Architect',
    verdict: 'They entered a house. You gave the house instructions.',
    diagnosis: 'Your advantage was environmental control. You narrowed choices, shaped movement, and forced confident people to make decisions inside a structure they no longer understood.',
    quote: 'You did not set a trap. You edited the floor plan.',
  },
  'counterfeit-victim': {
    slug: 'counterfeit-victim', rank: 'A-TIER SURVIVOR', title: 'The Counterfeit Victim',
    verdict: 'They spared the person you pretended to be.',
    diagnosis: 'You survived through controlled misinterpretation. By the time anyone realized helplessness was a costume, you had already used their confidence against them.',
    quote: 'Underestimation: renewable, portable, and apparently lethal.',
  },
  'last-problem': {
    slug: 'last-problem', rank: 'B-TIER SURVIVOR', title: 'The Last Problem',
    verdict: 'The intruders found the family. Then they found you.',
    diagnosis: 'Your instincts were aggressive, disruptive, and occasionally excellent. More observation would have made you surgical. Instead, you survived by becoming too costly to finish.',
    quote: 'Not the cleanest solution. Still a solution.',
  },
  'exit-wound': {
    slug: 'exit-wound', rank: 'B-TIER SURVIVOR', title: 'The Exit Wound',
    verdict: 'You escaped the house without letting the house define escape as failure.',
    diagnosis: 'You preserved options, recognized the moment the situation stopped deserving you, and left other people to discover what their choices purchased.',
    quote: 'Final girls are allowed to use the door.',
  },
  volunteer: {
    slug: 'volunteer', rank: 'CONCERNING ALIGNMENT', title: 'The Volunteer',
    verdict: 'You joined the conspiracy. The conspiracy did not quite join you.',
    diagnosis: 'You chose the dangerous side without securing leverage over it. You may survive the house, but your new colleagues have already begun revising the headcount.',
    quote: 'Never be the newest person in a murder spreadsheet.',
  },
  'house-guest': {
    slug: 'house-guest', rank: 'C-TIER SURVIVOR', title: 'The House Guest',
    verdict: 'You survived the attack. You did not understand all of it.',
    diagnosis: 'Nerve carried you through gaps that preparation would have closed. You are alive, which matters. The unanswered questions will become more interesting around 3:00 a.m.',
    quote: 'Alive is a result. It is not always an explanation.',
  },
  'did-not-make-it': {
    slug: 'did-not-make-it', rank: 'RUN ENDED', title: 'You Were Next',
    verdict: 'Decisive is not the same as prepared.',
    diagnosis: 'You met a changing situation with one excellent mood and insufficient information. The house punished certainty before it punished fear.',
    quote: 'Aggression without awareness is just expedited paperwork.',
  },
};

const sceneIndex = new Map(scenes.map((scene, index) => [scene.id, index]));
const choiceIndex = new Map(scenes.flatMap((scene) => scene.choices.map((item) => [item.id, { ...item, sceneId: scene.id }])));

export function createGameState({ variant = 'fox' } = {}) {
  if (!['fox', 'lamb'].includes(variant)) throw new Error('Unknown game variant.');
  return {
    view: 'scene',
    sceneId: sceneOrder[0],
    variant,
    stats: Object.fromEntries(statNames.map((stat) => [stat, 0])),
    flags: {},
    inventory: [],
    evidence: [],
    casualties: 0,
    injuries: 0,
    history: [],
    lastConsequence: '',
  };
}

export function getScene(state) {
  const scene = scenes[sceneIndex.get(state.sceneId)];
  if (!scene) return null;
  return { ...scene, variantNote: scene.variantNote[state.variant] };
}

export function getAvailableChoices(state) {
  if (state.view !== 'scene') return [];
  return getScene(state).choices.filter((item) => item.available(state));
}

function applyEffects(state, effects = {}) {
  const stats = { ...state.stats };
  for (const [stat, amount] of Object.entries(effects.stats ?? {})) {
    if (!statNames.includes(stat)) throw new Error(`Unknown stat: ${stat}`);
    stats[stat] = Math.max(0, stats[stat] + amount);
  }
  const flags = { ...state.flags };
  for (const flag of effects.flags ?? []) flags[flag] = true;
  return {
    ...state,
    stats,
    flags,
    inventory: [...new Set([...state.inventory, ...(effects.inventory ?? [])])],
    evidence: effects.evidence ? [...state.evidence, effects.evidence] : state.evidence,
    casualties: state.casualties + (effects.casualties ?? 0),
    injuries: state.injuries + (effects.injuries ?? 0),
  };
}

export function choose(state, choiceId) {
  const selected = choiceIndex.get(choiceId);
  if (!selected) throw new Error('Unknown choice.');
  if (state.view !== 'scene' || selected.sceneId !== state.sceneId || !selected.available(state)) {
    throw new Error('Choice is not available in the current scene.');
  }

  const updated = applyEffects(state, selected.effects);
  const history = [...updated.history, { sceneId: state.sceneId, choiceId, label: selected.label }];
  const currentIndex = sceneIndex.get(state.sceneId);
  const complete = currentIndex === scenes.length - 1;
  return {
    ...updated,
    view: complete ? 'result' : 'scene',
    sceneId: complete ? state.sceneId : sceneOrder[currentIndex + 1],
    history,
    lastConsequence: selected.consequence,
  };
}

export function getProgress(state) {
  return Math.round((Math.min(state.history.length, scenes.length) / scenes.length) * 100);
}

export function evaluateRun(state) {
  if (state.history.length !== scenes.length) throw new Error('Complete all seven scenes before evaluating the run.');
  const { stats, flags, injuries } = state;
  if (flags.lastStanding) return outcomes['everyone-dies'];
  if (injuries >= 2 || flags.finalMistake) return outcomes['did-not-make-it'];
  if (
    stats.awareness >= 4 && stats.preparation >= 1 && stats.adaptation >= 2 && stats.control >= 3 &&
    (flags.conspiracyExposed || flags.erinFinish || flags.usurped) && !flags.collaborator
  ) return outcomes['baptised-by-fire'];
  if (flags.collaborator || (flags.trueAlliance && flags.followedOrders)) return outcomes.volunteer;
  if (flags.cleanExit || flags.escaped) return stats.deception >= 6 ? outcomes['counterfeit-victim'] : outcomes['exit-wound'];
  if (stats.deception >= 7 && (flags.doubleCross || flags.usurped)) return outcomes['counterfeit-victim'];
  if (stats.preparation >= 2 && stats.control >= 4 && (flags.trapWorked || flags.kitchenAmbush || flags.erinFinish)) return outcomes.architect;
  if (stats.ruthlessness >= 4 || flags.usurped) return outcomes['last-problem'];
  return outcomes['house-guest'];
}

export function evidenceForResult(state, limit = 4) {
  return state.evidence.slice(-Math.max(1, limit));
}
