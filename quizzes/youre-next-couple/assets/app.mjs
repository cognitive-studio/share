import {
  questions,
  scoreQuiz,
  getProgress,
  createQuizState,
  startQuiz,
  answerQuestion,
  goBack,
  resetQuiz,
} from './quiz.mjs';

const root = document.querySelector('#quiz');
const announcement = document.querySelector('#announcement');
let state = createQuizState();
let locked = false;

const answerColors = ['cyan', 'pink', 'yellow', 'purple', 'lime'];

function announce(message) {
  announcement.textContent = '';
  window.setTimeout(() => { announcement.textContent = message; }, 20);
}

function coverTemplate() {
  return `
    <section class="cover view-enter" aria-labelledby="cover-title">
      <div class="cover-art" aria-hidden="true">
        <span class="burst burst-one">🔪</span>
        <span class="burst burst-two">🦊</span>
        <span class="burst burst-three">🍷</span>
        <div class="mask-card mask-left">🐑</div>
        <div class="mask-card mask-center">🐯</div>
        <div class="mask-card mask-right">🦊</div>
      </div>
      <div class="cover-copy">
        <span class="eyebrow sticker">A DEEPLY SCIENTIFIC COUPLES QUIZ</span>
        <h1 id="cover-title" tabindex="-1">Which <em>You’re Next</em> Couple Are You?</h1>
        <p class="dek">Make twelve joint decisions. Expose your marriage mechanics. Discover whether you’re life-builders, combustible loyalists, or the little freaks who found each other.</p>
        <div class="couple-note"><span aria-hidden="true">👩🏻‍❤️‍👨🏻</span><strong>Answer together.</strong> Debate is encouraged. Consulting an attorney is optional.</div>
        <button class="primary-action" type="button" data-action="start">TAKE THE QUIZ <span aria-hidden="true">→</span></button>
        <p class="fine-print">Spoilers everywhere. You’ve seen it 130 times. You’ll live.</p>
      </div>
    </section>`;
}

function questionTemplate() {
  const question = questions[state.index];
  const progress = getProgress(state.answers.length);
  return `
    <section class="question-view view-enter" aria-labelledby="question-title">
      <div class="progress-wrap">
        <div class="progress-label"><span>QUESTION ${state.index + 1} OF ${questions.length}</span><span>${progress}% SURVIVED</span></div>
        <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}" aria-label="Quiz progress"><span style="width:${progress}%"></span></div>
      </div>
      <button class="back-button" type="button" data-action="back" ${state.index === 0 ? 'hidden' : ''}><span aria-hidden="true">←</span> BACK</button>
      <article class="question-card">
        <span class="question-kicker">${question.kicker}</span>
        <h1 id="question-title" tabindex="-1">${question.prompt}</h1>
        <div class="answers" role="group" aria-label="Answer choices">
          ${question.options.map((answer, index) => `
            <button class="answer-card answer-${answerColors[index]}" type="button" data-answer="${answer.id}" data-reaction="${answer.reaction}">
              <span class="answer-emoji" aria-hidden="true">${answer.emoji}</span>
              <span class="answer-copy">${answer.text}</span>
              <span class="answer-arrow" aria-hidden="true">→</span>
            </button>`).join('')}
        </div>
      </article>
      <p class="question-footer">Choose the answer that best describes your combined marital creature.</p>
    </section>`;
}

function resultTemplate() {
  const result = scoreQuiz(state.answers);
  return `
    <section class="result-view result-${result.color} view-enter" aria-labelledby="result-title">
      <div class="confetti" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="result-poster">
        <span class="result-badge">${result.secret ? '✨ ' : ''}${result.badge}</span>
        <div class="result-emoji" aria-hidden="true">${result.emoji}</div>
        <p class="result-overline">YOU TWO ARE</p>
        <h1 id="result-title" tabindex="-1">${result.couple}</h1>
        <p class="result-headline">${result.headline}</p>
      </div>
      <div class="result-body">
        <p class="diagnosis">${result.diagnosis}</p>
        <div class="result-facts">
          <div><span>RELATIONSHIP SUPERPOWER</span><strong>${result.strength}</strong></div>
          <div><span>FATAL FLAW</span><strong>${result.flaw}</strong></div>
          <div class="survival"><span>DAVISON HOUSE SURVIVAL ODDS</span><strong>${result.survival}</strong></div>
        </div>
        <blockquote>“${result.secret ? 'That is profoundly fucked up. Move it two inches to the left.' : result.headline}”</blockquote>
        <div class="result-actions">
          <button class="primary-action" type="button" data-action="share" data-result="${result.couple}">SHARE THE DAMAGE</button>
          <button class="secondary-action" type="button" data-action="restart">TAKE IT AGAIN</button>
        </div>
        <p class="fine-print">This result has not been reviewed by a therapist, survivalist, or criminal attorney.</p>
      </div>
    </section>`;
}

function render({ focus = true } = {}) {
  root.innerHTML = state.view === 'cover' ? coverTemplate() : state.view === 'question' ? questionTemplate() : resultTemplate();
  document.body.dataset.view = state.view;
  if (focus) root.querySelector('h1')?.focus({ preventScroll: true });
}

async function shareResult(button) {
  const result = scoreQuiz(state.answers);
  const text = `Andrew + Kendra are ${result.couple}: ${result.headline}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Our You’re Next Couple', text, url: window.location.href });
      return;
    }
    await navigator.clipboard.writeText(`${text} ${window.location.href}`);
    button.textContent = 'RESULT COPIED!';
    window.setTimeout(() => { button.textContent = 'SHARE THE DAMAGE'; }, 1800);
  } catch (error) {
    if (error?.name !== 'AbortError') {
      button.textContent = 'SCREENSHOT THIS CHAOS';
      window.setTimeout(() => { button.textContent = 'SHARE THE DAMAGE'; }, 1800);
    }
  }
}

root.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || locked) return;

  if (button.dataset.answer) {
    locked = true;
    button.classList.add('chosen');
    announce(button.dataset.reaction);
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 420;
    window.setTimeout(() => {
      state = answerQuestion(state, button.dataset.answer);
      locked = false;
      render();
      announce(state.view === 'result' ? `Your result is ${scoreQuiz(state.answers).couple}.` : `Question ${state.index + 1} of ${questions.length}.`);
    }, delay);
    return;
  }

  switch (button.dataset.action) {
    case 'start':
      state = startQuiz(state);
      render();
      announce(`Question 1 of ${questions.length}.`);
      break;
    case 'back':
      state = goBack(state);
      render();
      announce(`Back to question ${state.index + 1}.`);
      break;
    case 'restart':
      state = resetQuiz(state);
      render();
      announce('Quiz restarted.');
      break;
    case 'share':
      shareResult(button);
      break;
  }
});

render({ focus: false });
