(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  const embedMode = params.get('embed') === 'miro';
  const insideIframe = window.parent && window.parent !== window;
  if (!embedMode || !insideIframe) return;

  const lessonId = params.get('lesson') || 'unknown';

  function post(payload) {
    try {
      window.parent.postMessage(
        Object.assign({ source: 'eng-tracker', lessonId }, payload),
        '*'
      );
    } catch (_) {}
  }

  function taskIdFromNode(node) {
    if (!node || !node.closest) return null;
    const t = node.closest('details[data-task]');
    return t ? t.dataset.task : null;
  }

  function wrap(name, wrapper) {
    const orig = window[name];
    if (typeof orig !== 'function') return false;
    window[name] = function () {
      return wrapper.call(this, orig, arguments);
    };
    return true;
  }

  function patch() {
    if (typeof window.markComplete !== 'function') return false;

    wrap('markComplete', function (orig, args) {
      const taskId = args[0];
      const result = orig.apply(this, args);
      post({ type: 'task-complete', taskId });
      return result;
    });

    wrap('handleDrop', function (orig, args) {
      const el = args[0];
      const zone = args[1];
      const accepts = ((zone && zone.dataset && zone.dataset.accepts) || '').split('|');
      const value = el && el.dataset && el.dataset.value;
      const correct = accepts.includes(value);
      const taskId = taskIdFromNode(zone) || taskIdFromNode(el);
      post({ type: 'attempt', kind: 'drag', taskId, value, correct });
      return orig.apply(this, args);
    });

    wrap('checkInput', function (orig, args) {
      const input = args[0];
      const finalize = args[1];
      const value = input ? input.value : '';
      const result = orig.apply(this, args);
      const taskId = taskIdFromNode(input);
      const cls = input && input.classList;
      if (cls && cls.contains('correct')) {
        post({ type: 'attempt', kind: 'input', taskId, value, correct: true });
      } else if (finalize && cls && cls.contains('error')) {
        post({ type: 'attempt', kind: 'input', taskId, value, correct: false });
      }
      return result;
    });

    return true;
  }

  function reportInit() {
    const tasks = Array.from(document.querySelectorAll('details[data-task]'))
      .map(d => d.dataset.task);
    post({ type: 'init', taskIds: tasks, total: tasks.length });
  }

  function start() {
    if (!patch()) {
      let tries = 0;
      const t = setInterval(() => {
        if (patch() || ++tries > 50) clearInterval(t);
      }, 60);
    }
    reportInit();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
