import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { emptyForm, PreviewPanel } from '../src/views/cms/SadhanaPracticesView';

test('customer preview renders configured Japa content, target, cover, action and playable audio', () => {
  const form = emptyForm();
  form.category = 'japa';
  form.name = 'Hare Krishna Maha Mantra';
  form.subtitle = 'A mindful repetition practice';
  form.cover.url = 'https://media.example.test/cover.webp';
  form.guided_audio.url = 'https://media.example.test/chant.mp3';
  form.japa_mantra_name = 'Maha Mantra';
  form.japa_mantra = 'हरे कृष्ण हरे कृष्ण';
  form.japa_transliteration = 'Hare Krishna Hare Krishna';
  form.target_type = 'repetitions';
  form.target_count = '108';

  const markup = renderToStaticMarkup(createElement(PreviewPanel, { form }));
  assert.match(markup, /Hare Krishna Maha Mantra/);
  assert.match(markup, /हरे कृष्ण हरे कृष्ण/);
  assert.match(markup, /Hare Krishna Hare Krishna/);
  assert.match(markup, /108 repetitions/);
  assert.match(markup, /Begin Japa/);
  assert.match(markup, /<img[^>]+src="https:\/\/media\.example\.test\/cover\.webp"/);
  assert.match(markup, /<audio[^>]+src="https:\/\/media\.example\.test\/chant\.mp3"/);
});

test('customer preview does not render a player for an invalid audio URL', () => {
  const form = emptyForm();
  form.guided_audio.url = 'javascript:alert(1)';

  const markup = renderToStaticMarkup(createElement(PreviewPanel, { form }));
  assert.doesNotMatch(markup, /<audio/);
});
