(() => {
  const input = document.querySelector('#quiz-url');
  let svg = '';
  if (/^https?:$/.test(location.protocol) && !['localhost','127.0.0.1','[::1]'].includes(location.hostname)) input.value = new URL('./', location.href).href;
  document.querySelector('#qr-form').onsubmit = event => {
    event.preventDefault();
    const error = document.querySelector('#error');
    error.textContent = '';
    document.querySelector('#poster').hidden = true;
    document.querySelector('#qr-actions').hidden = true;
    try {
      const url = new URL(input.value.trim());
      if (url.protocol !== 'https:' || ['localhost','127.0.0.1','[::1]'].includes(url.hostname) || url.username || url.password) throw new Error('Use a public HTTPS quiz URL that colleagues can open on their phones.');
      if (url.href.length > 1500) throw new Error('Please use a shorter quiz URL.');
      if (typeof qrcode !== 'function') throw new Error('The QR library could not load. Make sure the vendor folder is included.');
      const code = qrcode(0, 'M');
      code.addData(url.href); code.make();
      svg = code.createSvgTag({cellSize:6,margin:24,scalable:true});
      document.querySelector('#qr').innerHTML = svg;
      document.querySelector('#poster-url').textContent = url.href;
      document.querySelector('#poster').hidden = false;
      document.querySelector('#qr-actions').hidden = false;
    } catch (e) { error.textContent = e.message || 'Please enter a valid public quiz URL.'; }
  };
  document.querySelector('#print').onclick = () => window.print();
  document.querySelector('#download').onclick = () => {
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
    const a = document.createElement('a'); a.href = url; a.download = 'movember-quiz-qr.svg'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  };
})();
