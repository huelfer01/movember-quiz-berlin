(() => {
  'use strict';
  const questions = window.QUIZ_QUESTIONS;
  const app = document.querySelector('#app');
  const donationUrl = 'https://movember.com/t/ow-germany?mc=1';
  let current = 0;
  let selections = [];
  let disposeLeaderboard = () => {};
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mo = '<svg viewBox="0 0 300 120" aria-hidden="true"><path fill="currentColor" d="M150 48C126 8 89 22 76 56 54 91 23 78 10 49 0 103 62 126 107 101 128 91 143 78 150 69 157 78 172 91 193 101 238 126 300 103 290 49 277 78 246 91 224 56 211 22 174 8 150 48Z"/></svg>';
  function sourceMarkup(q) {
    if (!q.sourceLabel) return '';
    return q.source
      ? `<a class="source" href="${escape(q.source)}" target="_blank" rel="noopener noreferrer">${escape(q.sourceLabel)} ↗</a>`
      : `<span class="source">Source: ${escape(q.sourceLabel)}</span>`;
  }
  function imageMarkup(q) {
    if (!q.image) return '';
    const credit = q.imageCreditUrl
      ? `<a href="${escape(q.imageCreditUrl)}" target="_blank" rel="noopener noreferrer">${escape(q.imageCredit)} ↗</a>`
      : escape(q.imageCredit || '');
    return `<figure class="question-image"><img src="${escape(q.image)}" alt="${escape(q.imageAlt || '')}" width="960" height="1497"><figcaption>${credit}</figcaption></figure>`;
  }
  function focusView() { app.focus(); window.scrollTo(0, 0); }
  function home() {
    app.innerHTML = `<section class="hero"><div><p class="eyebrow">OLIVER WYMAN GERMANY · MOVEMBER</p><h1>The Mo<br>you <span class="highlight">know.</span></h1><p class="intro">Ten questions about men’s health, where to find support — and one very famous moustache.</p><div class="facts"><span>10 questions</span><span>About 3–5 minutes</span><span>Everyone welcome</span></div><button class="button" id="start">Let’s Mo <span aria-hidden="true">→</span></button></div><div class="art" aria-hidden="true"><span class="stamp">GOOD FOR<br>YOUR HEAD.</span>${mo}<p>A little facial hair.<br>A lot to learn.</p></div></section><p class="small intro-note">Play at your own pace. Get a quick explanation after every answer, then meet our OW Germany fundraiser. No sign-up. Share a first name on the office leaderboard only if you choose.</p>`;
    document.querySelector('#start').onclick = () => { current = 0; selections = []; showQuestion(); };
  }
  function showQuestion() {
    disposeLeaderboard();
    const q = questions[current];
    app.innerHTML = `<section class="quiz"><div class="progress-label"><span>QUESTION ${current+1} OF ${questions.length}</span><span>${Math.round(current/questions.length*100)}% COMPLETE</span></div><div class="progress" role="progressbar" aria-label="Quiz progress" aria-valuemin="0" aria-valuemax="${questions.length}" aria-valuenow="${current}"><span style="width:${current/questions.length*100}%"></span></div><p class="eyebrow">${escape(q.topic)}</p><h2 id="question">${escape(q.question)}</h2>${imageMarkup(q)}<div class="answers" role="group" aria-labelledby="question">${q.options.map((o,i)=>`<button class="answer" data-answer="${i}"><span class="letter" aria-hidden="true">${String.fromCharCode(65+i)}</span><span>${escape(o)}</span></button>`).join('')}</div><div id="feedback" class="feedback" hidden tabindex="-1" aria-live="polite"></div></section>`;
    document.querySelectorAll('[data-answer]').forEach(b => b.onclick = () => answer(Number(b.dataset.answer)));
    focusView();
  }
  function answer(choice) {
    if (selections.length > current) return;
    const q = questions[current];
    selections.push(choice);
    const correct = choice === q.answer;
    document.querySelectorAll('[data-answer]').forEach(b => {
      const i = Number(b.dataset.answer);
      b.disabled = true;
      if (i === q.answer) { b.classList.add('correct'); b.insertAdjacentHTML('beforeend','<span class="answer-status">✓ Correct answer</span>'); }
      else if (i === choice) { b.classList.add('incorrect'); b.insertAdjacentHTML('beforeend','<span class="answer-status">Your answer</span>'); }
    });
    const feedback = document.querySelector('#feedback');
    feedback.hidden = false;
    feedback.innerHTML = `<h3>${correct ? 'That’s right.' : 'One to take away.'}</h3><p>${escape(q.explanation)}</p>${sourceMarkup(q)}<br><button class="button" id="next">${current === questions.length-1 ? 'See my results' : 'Next question'} <span aria-hidden="true">→</span></button>`;
    document.querySelector('#next').onclick = () => { current++; current === questions.length ? results() : showQuestion(); };
    feedback.focus();
  }
  function results() {
    const score = selections.filter((v,i) => v === questions[i].answer).length;
    const title = score >= 8 ? 'Mo knowledge.<br>Mo impact.' : score >= 5 ? 'A little wiser.<br>A little Mo aware.' : 'New knowledge.<br>A good place to start.';
    app.innerHTML = `<section class="quiz"><p class="eyebrow">QUIZ COMPLETE · THANKS FOR TAKING PART</p><div class="result-top"><h2>${title}</h2><div class="score">${score}/${questions.length}<span>your score</span></div></div><p>Your score is a conversation starter. Take one thing you learned and share it with someone you care about.</p><div class="card donate"><p class="eyebrow">TURN A LITTLE KNOWLEDGE INTO ACTION</p><h3>Help change the face<br>of men’s health.</h3><p>Support our OW Germany Movember team. Every contribution is welcome, and donating is completely optional.</p><a class="button" href="${donationUrl}" target="_blank" rel="noopener noreferrer">Visit our fundraising page ↗</a></div><section class="card leaderboard" id="office-leaderboard" aria-label="Optional office leaderboard"></section><div class="card"><h3>Your next Mo-ve</h3><p>Check in with a friend. Make time to move. Get a change checked by a doctor. Choose one small action to carry beyond lunch.</p></div><div class="result-actions"><button class="button secondary" id="review-toggle" aria-expanded="false" aria-controls="review">Review my answers</button><button class="button secondary" id="restart">Play again</button></div><div id="review" hidden><h3 style="margin-top:30px">A little recap</h3>${questions.map((q,i)=>`<details><summary>${i+1}. ${escape(q.question)} <span class="review-state">${selections[i]===q.answer ? '✓ Correct' : '↗ Learn more'}</span></summary><p>Your answer: ${escape(q.options[selections[i]])}<br><strong>Correct answer: ${escape(q.options[q.answer])}</strong></p><p>${escape(q.explanation)}</p>${sourceMarkup(q)}</details>`).join('')}</div><p class="small" style="margin-top:30px">An office awareness quiz inspired by Movember’s educational resources. For personal health questions, speak to a healthcare professional. Your result stays private unless you choose to share it on the office leaderboard.</p></section>`;
    disposeLeaderboard = window.mountLeaderboard(document.querySelector('#office-leaderboard'), [...selections]);
    document.querySelector('#restart').onclick = () => { current = 0; selections = []; showQuestion(); };
    document.querySelector('#review-toggle').onclick = e => { const review = document.querySelector('#review'); review.hidden = !review.hidden; e.target.setAttribute('aria-expanded',String(!review.hidden)); e.target.textContent = review.hidden ? 'Review my answers' : 'Hide my answers'; };
    focusView();
  }
  home();
})();
