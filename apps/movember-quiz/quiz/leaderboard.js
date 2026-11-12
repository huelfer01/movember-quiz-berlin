/* Optional sharing only: no POST happens until the player submits this form. */
(() => {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  window.mountLeaderboard = (root, answers) => {
    const controller = new AbortController();
    let token = null;
    let busy = false;
    let shared = false;
    root.innerHTML = `<p class="eyebrow">A LITTLE FRIENDLY COMPETITION</p>
      <h3>Office leaderboard</h3>
      <p class="small">Sharing is optional. Keep your result private, or add your first name or a nickname to see your office rank. Equal scores share a rank.</p>
      <form id="leaderboard-form" hidden>
        <label for="leaderboard-name">First name or nickname</label>
        <input id="leaderboard-name" name="firstName" type="text" maxlength="30" autocomplete="off" required aria-describedby="leaderboard-privacy" placeholder="e.g. Alex">
        <p id="leaderboard-privacy" class="small">Only if you choose to share: your name and answers are sent to calculate your score. Your name and score will be visible to everyone with the quiz link. Individual answers are not saved. You can remove your entry here before leaving this results page.</p>
        <div class="leaderboard-actions"><button class="button" id="leaderboard-submit" type="submit">Share my score</button><button class="button secondary" id="leaderboard-skip" type="button">Keep my score private</button></div>
      </form>
      <p id="leaderboard-status" class="small" role="status" aria-live="polite">Loading office scores…</p>
      <p id="leaderboard-rank" class="personal-rank" hidden></p>
      <div id="leaderboard-entries"></div>
      <div class="leaderboard-actions"><button class="text-button" id="leaderboard-refresh" type="button">Refresh scores</button><button class="text-button" id="leaderboard-remove" type="button" hidden>Remove my entry</button></div>`;
    const form = root.querySelector('#leaderboard-form');
    const input = root.querySelector('#leaderboard-name');
    const submit = root.querySelector('#leaderboard-submit');
    const skip = root.querySelector('#leaderboard-skip');
    const status = root.querySelector('#leaderboard-status');
    const rank = root.querySelector('#leaderboard-rank');
    const entries = root.querySelector('#leaderboard-entries');
    const refresh = root.querySelector('#leaderboard-refresh');
    const remove = root.querySelector('#leaderboard-remove');
    let privateChoice = false;
    function setBusy(value) {
      busy = value;
      [submit, skip, refresh, remove].forEach(button => { button.disabled = value; });
      input.disabled = value;
    }
    function draw(data) {
      if (data.quizId !== window.QUIZ_VERSION) throw new Error('The quiz has changed. Reload the page to use the leaderboard.');
      const me = data.me;
      shared = Boolean(me);
      form.hidden = shared || privateChoice;
      remove.hidden = !shared;
      rank.hidden = !shared;
      if (me) rank.textContent = `You are #${me.rank} of ${data.total} shared ${data.total === 1 ? 'result' : 'results'} · ${me.score}/${data.questionCount}`;
      if (!data.entries.length) {
        entries.innerHTML = '<p class="small">No shared scores yet. You can be the first, or stay private.</p>';
        return;
      }
      entries.innerHTML = `<div class="leaderboard-table-wrap"><table class="leaderboard-table"><caption>Office scores${data.total > 50 ? ' · top 50 shown' : ''}</caption><thead><tr><th scope="col">Rank</th><th scope="col">Name</th><th scope="col">Score</th></tr></thead><tbody>${data.entries.map(entry => `<tr${entry.id === me?.id ? ' class="your-entry"' : ''}><td>#${escape(entry.rank)}</td><td>${escape(entry.name)}${entry.id === me?.id ? ' <span class="small">(you)</span>' : ''}</td><td>${escape(entry.score)}/${escape(data.questionCount)}</td></tr>`).join('')}</tbody></table></div>`;
    }
    async function request(method = 'GET', body) {
      if (!/^https?:$/.test(location.protocol)) throw new Error('The shared leaderboard is available once this quiz is published. You can keep playing privately.');
      const headers = {};
      if (body) headers['Content-Type'] = 'application/json';
      if (token) headers['X-Entry-Token'] = token;
      const attempt = new AbortController();
      const cancel = () => attempt.abort();
      controller.signal.addEventListener('abort', cancel, { once: true });
      const timeout = setTimeout(cancel, 10000);
      try {
        const response = await fetch('/api/leaderboard', {
          method, headers, body: body ? JSON.stringify(body) : undefined,
          signal: attempt.signal, cache: 'no-store'
        });
        let data;
        try { data = await response.json(); }
        catch { throw new Error('The office leaderboard is not available on this host yet.'); }
        if (!response.ok) throw new Error(data.message || 'Could not reach the leaderboard. Please try again.');
        return data;
      } catch (error) {
        if (error.name === 'AbortError' && !controller.signal.aborted) throw new Error('The leaderboard took too long to respond. Please try again.');
        throw error;
      } finally {
        clearTimeout(timeout);
        controller.signal.removeEventListener('abort', cancel);
      }
    }
    async function load() {
      if (busy) return;
      setBusy(true);
      try {
        const data = await request();
        if (!data.me) token = null;
        draw(data);
        status.textContent = shared ? 'Your score is shared. You can remove it below.' : privateChoice ? 'Your result stays private. You can still view office scores.' : 'Add your score only if you would like to.';
      } catch (error) {
        if (error.name !== 'AbortError') status.textContent = error.message;
      } finally { setBusy(false); }
    }
    form.onsubmit = async event => {
      event.preventDefault();
      if (busy || shared) return;
      const name = input.value.trim();
      if (!name) { input.reportValidity(); return; }
      setBusy(true);
      status.textContent = 'Sharing your score…';
      try {
        if (!token) {
          const bytes = crypto.getRandomValues(new Uint8Array(32));
          token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        }
        draw(await request('POST', { name, answers, token, quizId: window.QUIZ_VERSION }));
        input.value = '';
        status.textContent = 'Your score is shared. You can remove it below.';
      } catch (error) {
        if (error.name !== 'AbortError') {
          status.textContent = error.message + ' Refresh scores or retry to check whether your entry was saved.';
          remove.hidden = !token;
        }
      } finally { setBusy(false); }
    };
    async function keepPrivate() {
      if (busy) return;
      if (!token) {
        privateChoice = true;
        form.hidden = true;
        input.value = '';
        status.textContent = 'Your result stays private. You can still view office scores.';
        return;
      }
      // A POST can succeed even if its response was lost. Cancel that receipt
      // before promising privacy, even when sharing was never confirmed.
      setBusy(true);
      try {
        const data = await request('DELETE');
        token = null;
        privateChoice = true;
        input.value = '';
        draw(data);
        status.textContent = 'Your entry was removed. Your result is private again.';
      } catch (error) {
        if (error.name !== 'AbortError') status.textContent = 'Could not confirm removal. Refresh scores or try again.';
      } finally { setBusy(false); }
    }
    skip.onclick = keepPrivate;
    remove.onclick = keepPrivate;
    refresh.onclick = load;
    load();
    return () => controller.abort();
  };
})();
