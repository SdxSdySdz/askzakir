import { writePending } from './state.js';

const QUESTIONS = [
  'Мой сын курит. Что мне делать?',
  'Как пережить развод?',
  'Как сохранить терпение, когда дома постоянные ссоры?',
  'Можно ли простить человека, который меня предал?',
  'Как говорить с родителями, если они меня не слышат?',
  'Как избавиться от тревоги перед будущим?',
];

const landing = document.getElementById('landing-screen');
const questionBox = document.getElementById('landing-question');
const questionText = document.getElementById('landing-question-text');
const questionAction = document.getElementById('landing-question-action');

let questionIndex = 0;
let questionTimer = null;

function renderQuestion() {
  const question = QUESTIONS[questionIndex % QUESTIONS.length];
  const side = questionIndex % 2 === 0 ? 'right' : 'left';

  questionBox.classList.remove('visible');
  setTimeout(() => {
    questionText.textContent = question;
    questionBox.classList.toggle('landing-question-left', side === 'left');
    questionBox.classList.toggle('landing-question-right', side === 'right');
    questionBox.classList.add('visible');
  }, 180);
}

function rotateQuestion() {
  questionIndex += 1;
  renderQuestion();
}

export function showLanding() {
  landing.hidden = false;
  document.body.classList.add('landing-mode');
  questionIndex = 0;
  renderQuestion();
  if (!questionTimer) questionTimer = setInterval(rotateQuestion, 5000);
}

export function hideLanding() {
  document.body.classList.remove('landing-mode');
  landing.hidden = true;
  if (questionTimer) {
    clearInterval(questionTimer);
    questionTimer = null;
  }
}

export function initLanding() {
  if (document.body.classList.contains('landing-mode') && !landing.hidden) {
    renderQuestion();
    if (!questionTimer) questionTimer = setInterval(rotateQuestion, 5000);
  }

  questionAction.addEventListener('click', () => {
    const question = questionText.textContent.trim();
    if (!question) return;
    questionBox.classList.remove('visible');
    writePending(question);
    document.dispatchEvent(new CustomEvent('auth:gate', {
      detail: { reason: 'landing-question', question },
    }));
  });

  document.addEventListener('auth:success', hideLanding);
}
