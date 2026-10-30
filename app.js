'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const suites = {
  precision: {label:'Precision', kicker:'01 / PRECISION', title:'Precision insertion', description:'Insert tubes, keys, connectors, gears, power plugs, and bulbs into their target fixtures.', tags:['Fine manipulation','Contact-rich insertion'], featured:4, caption:'Power plug insertion', color:'#e7f0f2'},
  recog: {label:'Recog', kicker:'02 / TACTILE RECOGNITION', title:'Tactile recognition', description:'Identify, retrieve, sort, and place objects using tactile information about shape, texture, and contact.', tags:['Tactile exploration','Object recognition'], featured:5, caption:'Threaded cylinder selection', color:'#e5f1ec'},
  dynamic: {label:'Dynamic', kicker:'03 / DYNAMIC INTERACTION', title:'Dynamic manipulation', description:'Track moving fixtures and transfer objects to or from a conveyor, coordinating alignment and contact during motion.', tags:['Moving targets','Adaptive manipulation'], featured:3, caption:'Tube insertion on a conveyor', color:'#e6edf5'},
  extra: {label:'Extra', kicker:'04 / EXTENDED COLLECTION', title:'Extended manipulation tasks', description:'Tasks covering drawers, switches, assembly, cutting, puzzles, and other object interactions.', tags:['Mechanisms & assembly','Everyday manipulation'], featured:0, caption:'Drawer opening', color:'#e8eeed'},
  all: {label:'All tasks', kicker:'THE COMPLETE COLLECTION', title:'All manipulation tasks', description:'Browse Standard and Extra tasks with language instructions and recorded camera and tactile demonstrations where available.', tags:['Four suites','One task catalog'], featured:0, caption:'Tube insertion', color:'#e5eef3'}
};
const titles = {
  precision:['Tube insertion','Key insertion','Connector insertion','Gear insertion','Power plug insertion','Bulb insertion'],
  recog:['Nut selection by touch','Golf ball retrieval','Sawtooth token selection','Ribbed cap recycling','Golf ball placement','Threaded cylinder selection','Wave token selection','Ribbed cap sorting','Peg reorientation','Tactile object search','Golf ball identification'],
  dynamic:['Moving power socket','Moving bulb socket','Moving USB socket','Tube to moving fixture','Tube from moving source','Key to moving fixture','Key from moving source','HDMI to moving fixture','HDMI from moving source','Gear to moving fixture','Gear from moving source']
};
let tasks = [], media = {}, daimonMedia = {}, selectedSuite = 'precision', visibleCount = 6, selectedSensor = 'gsmini';
const videoObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const video = entry.target;
    if (entry.isIntersecting) {
      if (video.preload === 'none') { video.preload = 'metadata'; video.load(); }
      if (video.dataset.autoplay === 'true' && !reducedMotion.matches && !video.dataset.userPaused) video.play().catch(() => {});
    } else {
      video.dataset.offscreenPause = 'true';
      video.pause();
    }
  }
}, {threshold:0.15});

function observeVideos(root = document) {
  $$('video[data-lazy]', root).forEach(video => {
    if (video.dataset.observed) return;
    video.dataset.observed = 'true';
    video.addEventListener('play', () => { delete video.dataset.userPaused; delete video.dataset.offscreenPause; });
    video.addEventListener('pause', () => {
      if (!video.dataset.offscreenPause && !video.ended) video.dataset.userPaused = 'true';
      delete video.dataset.offscreenPause;
    });
    videoObserver.observe(video);
  });
}

function titleFor(task) {
  return titles[task.suite]?.[task.id] || task.name.replace(/^tactile_/, '').replace(/_/g, ' ').replace(/\b(hdmi|usb|ram|cpu)\b/gi, word => word.toUpperCase()).replace(/^./, letter => letter.toUpperCase());
}

function ruleFor(task) {
  if (task.name === 'tactile_ball_sorting') return 'The target is lifted relative to its confirmed pre-lift grasp height.';
  if (task.suite === 'precision') return 'Task-specific insertion pose, hand clearance, and stability are checked at the final goal.';
  if (task.suite === 'recog') {
    if ([0,1,9].includes(task.id)) return 'The target object must be retrieved according to the task-specific final-goal constraints.';
    if (task.id === 8) return 'The peg must be reoriented and inserted into its target.';
    return 'Target placement, release, distractor constraints, and stability are checked together.';
  }
  if (task.suite === 'dynamic') return 'Position and orientation are evaluated in the moving fixture frame, with persistence and release when required. Threaded bulbs also require signed twist.';
  return 'The task-specific final goal is checked, including contact, motion history, physical progress, and stability where required. Intermediate stage progress alone is not success.';
}

function openDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog) return;
  $$('video').forEach(video => video.pause());
  dialog.showModal();
  document.body.classList.add('modal-open');
  dialog.scrollTop = 0;
}

const viewNames = {external:'External', wrist:'Wrist', rgb:'RGB', marker:'Marker', depth:'Depth', deformation:'Deformation'};
const viewLabels = {external:'External camera', wrist:'Wrist camera', rgb:'RGB · Left pad / Right pad',
  marker:'Marker · Left pad / Right pad', deformation:'Deformation · Left pad / Right pad',
  depth:'Tactile depth · Left pad / Right pad'};
function releaseVideos(root) {
  $$('video', root).forEach(video => { videoObserver.unobserve(video); video.pause(); video.onloadedmetadata = null; video.removeAttribute('src'); video.load(); });
}
function mountViewer(root, clip, title, daimonClip) {
  root.renderSensor = null;
  releaseVideos(root);
  root.replaceChildren();
  if (!daimonClip) { mountViews(root, clip, title, 'GSmini'); return; }
  root.innerHTML = `<div class="sensor-switcher" role="group" aria-label="Tactile sensor"><span>Sensor</span><button type="button" data-sensor="gsmini">GSmini</button><button type="button" data-sensor="daimon">Daimon</button></div><div class="sensor-player"></div>`;
  root.renderSensor = sensor => {
    $$('.sensor-switcher button', root).forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sensor === sensor)));
    mountViews($('.sensor-player', root), sensor === 'daimon' ? daimonClip : clip, title, sensor === 'daimon' ? 'Daimon' : 'GSmini');
  };
  root.renderSensor(selectedSensor);
}
function mountViews(root, clip, title, sensor) {
  releaseVideos(root);
  root.replaceChildren();
  if (!clip) { root.innerHTML = '<div class="missing-video">Video coming soon</div>'; return; }
  const views = clip.views || {external:clip.src};
  root.innerHTML = `<div class="view-switcher ${sensor === 'Daimon' ? 'daimon-views' : ''}" role="group" aria-label="Demonstration view">${Object.keys(views).map(name => `<button type="button" data-view="${name}" aria-label="${viewLabels[name]}" aria-pressed="${name === 'external'}">${viewNames[name]}</button>`).join('')}</div>
    <div class="viewer-screen"><video controls muted playsinline preload="metadata" data-lazy aria-label="${escapeHTML(title)} — ${sensor} — external camera"></video></div>
    <div class="view-description"><span class="view-label">External camera</span><span>${sensor} · ${clip.fps} fps</span></div>
    <p class="tactile-legend" hidden></p>
    ${clip.success === false ? `<p class="recording-outcome">Unsuccessful attempt${clip.outcome_note ? ' · ' + escapeHTML(clip.outcome_note) : ''}</p>` : ''}`;
  const video = $('video', root);
  video.src = views.external;
  const state = {time:0, playing:false, changing:false};
  $$('.view-switcher button', root).forEach(button => button.addEventListener('click', () => {
    if (button.getAttribute('aria-pressed') === 'true') return;
    if (!state.changing) { state.time = video.currentTime; state.playing = !video.paused; }
    state.changing = true;
    video.pause();
    const name = button.dataset.view;
    $$('.view-switcher button', root).forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    const label = viewLabels[name];
    $('.view-label', root).textContent = label;
    video.setAttribute('aria-label', `${title} — ${sensor} — ${label}`);
    const legend = $('.tactile-legend', root);
    const paired = ['rgb', 'marker', 'depth', 'deformation'].includes(name);
    video.style.aspectRatio = paired ? (sensor === 'Daimon' ? '28 / 11' : '8 / 3') : '4 / 3';
    legend.hidden = sensor !== 'Daimon' || !paired;
    if (!legend.hidden) legend.textContent = name === 'depth'
      ? `Surface indentation · Red: inward · Blue: outward · ±${Number(clip.depth_range_mm[1].toPrecision(3))} mm`
      : 'XY displacement · Fixed scale across both pads and the recording.';
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(state.time, Math.max(0, video.duration - 0.01));
      state.changing = false;
      if (state.playing) video.play().catch(() => {});
    };
    video.src = views[name];
    video.load();
  }));
  video.addEventListener('error', () => { state.changing = false; $('.view-label', root).textContent = 'Video unavailable. Please try another view.'; });
  observeVideos(root);
}

function taskDetails(task) {
  const video = media[`${task.suite}:${task.id}`];
  $$('video', $('#task-dialog-content')).forEach(video => { videoObserver.unobserve(video); video.pause(); video.onloadedmetadata = null; video.removeAttribute('src'); video.load(); });
  $('#task-dialog-content').innerHTML = `<p class="eyebrow">${suites[task.suite].label.toUpperCase()} / ${String(task.id).padStart(2,'0')}</p>
    <h2 id="task-dialog-title">${escapeHTML(titleFor(task))}</h2>
    <div id="task-viewer" class="demo-viewer"></div>
    <h3>Language instruction</h3><blockquote class="instruction">${escapeHTML(task.instruction)}</blockquote>
    <h3>What counts as success</h3><p>${ruleFor(task)}</p>
    <dl><dt>Suite</dt><dd>${escapeHTML(suites[task.suite].label)}</dd><dt>Task ID</dt><dd>${task.id}</dd></dl>`;
  openDialog('task-dialog');
  mountViewer($('#task-viewer'), video, titleFor(task), daimonMedia[`${task.suite}:${task.id}`]);
}

function viewCount(clip) {
  return Object.keys(clip.views || {external:clip.src}).reduce((count, view) => count + (['rgb', 'marker', 'depth', 'deformation'].includes(view) ? 2 : 1), 0);
}

function syncCatalogSensors() {
  const controls = $('#catalog-sensors');
  controls.hidden = !tasks.some(task => (selectedSuite === 'all' || task.suite === selectedSuite) && daimonMedia[`${task.suite}:${task.id}`]);
  $('span', controls).textContent = selectedSuite === 'all' ? 'Standard sensor' : 'Sensor';
  $$('button', controls).forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sensor === selectedSensor)));
}

function renderCardMedia(card) {
  const key = card.dataset.taskKey;
  const useDaimon = selectedSensor === 'daimon' && daimonMedia[key];
  const clip = useDaimon ? daimonMedia[key] : media[key];
  const container = $('.card-media', card);
  if ($('video', container)?.getAttribute('src') === clip?.src && clip) return;
  releaseVideos(container);
  container.classList.toggle('card-media-empty', !clip);
  container.innerHTML = clip ? `<video src="${escapeHTML(clip.src)}" muted playsinline loop preload="none" data-lazy aria-hidden="true" tabindex="-1"></video><span class="card-play" aria-hidden="true">▶</span><span class="card-duration">${useDaimon ? 'Daimon' : 'GSmini'} · ${viewCount(clip)} views · ${Math.round(clip.duration)}s</span>` : '<span>Video coming soon</span>';
}

function selectSensor(sensor) {
  if (sensor === selectedSensor) return;
  selectedSensor = sensor;
  syncCatalogSensors();
  $('#suite-viewer').renderSensor?.(sensor);
  if ($('#task-dialog').open) $('#task-viewer')?.renderSensor?.(sensor);
  $$('.task-card').forEach(renderCardMedia);
  observeVideos($('#task-grid'));
}

function renderTasks() {
  const query = $('#task-search').value.trim().toLowerCase();
  const filtered = tasks.filter(task => (selectedSuite === 'all' || task.suite === selectedSuite) && `${task.suite} ${task.id} ${task.name} ${titleFor(task)} ${task.instruction}`.toLowerCase().includes(query));
  $$('video', $('#task-grid')).forEach(video => { videoObserver.unobserve(video); video.pause(); video.onloadedmetadata = null; video.removeAttribute('src'); video.load(); });
  $('#task-grid').replaceChildren();
  for (const task of filtered.slice(0, visibleCount)) {
    const button = document.createElement('button');
    button.className = 'task-card';
    button.dataset.taskKey = `${task.suite}:${task.id}`;
    button.innerHTML = `<div class="card-media"></div>
      <div class="card-body"><span class="task-label"><span>${suites[task.suite].label.toUpperCase()}</span><span>${String(task.id).padStart(2,'0')}</span></span><h4>${escapeHTML(titleFor(task))}</h4><p>${escapeHTML(task.instruction)}</p><span class="task-arrow">${icon('up-right')}</span></div>`;
    button.addEventListener('click', () => taskDetails(task));
    renderCardMedia(button);
    button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse' && !reducedMotion.matches) $('video', button)?.play().catch(() => {}); });
    button.addEventListener('pointerleave', () => $('video', button)?.pause());
    button.addEventListener('blur', () => $('video', button)?.pause());
    $('#task-grid').append(button);
  }
  $('#results-count').textContent = `${Math.min(visibleCount, filtered.length)} of ${filtered.length} ${selectedSuite === 'all' ? '' : suites[selectedSuite].label + ' '}tasks${query ? ' matching your search' : ''}`;
  $('#catalog-empty').hidden = filtered.length !== 0;
  $('#load-more').hidden = visibleCount >= filtered.length;
  $('#load-more').parentElement.hidden = $('#load-more').hidden;
  observeVideos($('#task-grid'));
}

function selectSuite(suite) {
  selectedSuite = suite;
  visibleCount = 6;
  $$('.suite-tab').forEach(button => {
    const active = button.dataset.suite === suite;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const data = suites[suite];
  $('#suite-kicker').textContent = data.kicker;
  $('#suite-title').textContent = data.title;
  $('#suite-description').textContent = data.description;
  $('#suite-tags').innerHTML = data.tags.map(tag => `<span>${tag}</span>`).join('');
  $('#suite-spotlight').style.background = data.color;
  const clip = media[`${suite === 'all' ? 'precision' : suite}:${data.featured}`];
  mountViewer($('#suite-viewer'), clip, data.caption, daimonMedia[`${suite === 'all' ? 'precision' : suite}:${data.featured}`]);
  $('#suite-caption').innerHTML = `${suite === 'all' ? 'PRECISION' : data.label.toUpperCase()} ${String(data.featured).padStart(2,'0')} <span>${data.caption}</span>`;
  syncCatalogSensors();
  renderTasks();
}

document.addEventListener('click', event => {
  const sensorButton = event.target.closest('[data-sensor]');
  if (sensorButton) selectSensor(sensorButton.dataset.sensor);
  const opener = event.target.closest('[data-open]');
  if (opener) openDialog(opener.dataset.open);
  const closer = event.target.closest('.dialog-close');
  if (closer) closer.closest('dialog').close();
});
$$('dialog').forEach(dialog => {
  dialog.addEventListener('close', () => {
    $$('video', dialog).forEach(video => video.pause());
    if (!$('dialog[open]')) document.body.classList.remove('modal-open');
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
});

const menu = $('.menu-toggle');
function closeMenu() { menu.setAttribute('aria-expanded','false'); menu.setAttribute('aria-label','Open navigation'); $('#nav-links').classList.remove('open'); }
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded',String(open));
  menu.setAttribute('aria-label',open ? 'Close navigation' : 'Open navigation');
  $('#nav-links').classList.toggle('open',open);
});
$('#hero-details').addEventListener('click', () => { const task = tasks.find(t => t.suite === 'extra' && t.id === 20); if (task) { selectSensor('gsmini'); taskDetails(task); } });
$$('#nav-links a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeMenu();
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input,textarea,[contenteditable],dialog')) {
    event.preventDefault(); $('#task-search').focus();
  }
});
$$('.suite-tab').forEach(button => button.addEventListener('click', () => selectSuite(button.dataset.suite)));
$('#task-search').addEventListener('input', () => { visibleCount = 6; renderTasks(); });
$('#load-more').addEventListener('click', () => {
  const firstNew = visibleCount;
  visibleCount += 12;
  renderTasks();
  $$('.task-card')[firstNew]?.focus({preventScroll:true});
});
$('#reset-search').addEventListener('click', () => { $('#task-search').value = ''; selectSuite('all'); $('#task-search').focus(); });

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path} (${response.status})`);
  return response.json();
}

async function loadCatalog() {
  try {
    [tasks, media, daimonMedia] = await Promise.all([loadJSON('content/tasks.json'), loadJSON('content/media.json').catch(() => ({})), loadJSON('content/daimon-media.json').catch(() => ({}))]);
    $$('[data-count]').forEach(element => {
      const suite = element.dataset.count;
      element.textContent = suite === 'all' ? tasks.length : tasks.filter(task => suite === 'core' ? task.suite !== 'extra' : task.suite === suite).length;
    });
    $$('[data-total-inline]').forEach(element => element.textContent = tasks.length);
    selectSuite(selectedSuite);
  } catch (error) {
    $('#results-count').textContent = 'The catalog could not be loaded. Please refresh to try again.';
    console.error(error);
  }
}

async function loadNews() {
  try {
    const news = (await loadJSON('content/news.json')).filter(item => !item.draft).sort((a,b) => b.date.localeCompare(a.date));
    $('#news-list').replaceChildren();
    if (!news.length) { $('#news-list').innerHTML = '<li class="news-empty">Project updates will appear here.</li>'; return; }
    const formatDate = value => new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(value + 'T00:00:00Z'));
    for (const item of news) {
      const row = document.createElement('li');
      row.className = 'news-item';
      row.innerHTML = `<time class="news-date" datetime="${escapeHTML(item.date)}">${formatDate(item.date)}</time><p>${escapeHTML(item.title)}</p>`;
      $('#news-list').append(row);
    }
  } catch(error) {
    $('#news-list').innerHTML = '<li class="news-empty">Updates could not be loaded. Please refresh to try again.</li>';
    console.error(error);
  }
}

if (!reducedMotion.matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
  }), {threshold:.08});
  $$('.reveal').forEach(element => observer.observe(element));
  document.documentElement.classList.add('motion-ready');
}
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) $$('video').forEach(video => video.pause());
});
observeVideos();
loadCatalog();
loadJSON('content/contact-behaviors.json').then(behaviors => {
  $('[data-contact-count]').textContent = behaviors.length;
  $('#contact-behavior-list').innerHTML = behaviors.map(behavior => `<li><h3>${escapeHTML(behavior.label)}</h3><p>${escapeHTML(behavior.description)}</p><span>${escapeHTML(suites[behavior.example.suite].label)} · Task ${String(behavior.example.id).padStart(2, '0')}</span></li>`).join('');
}).catch(error => {
  $('#contact-behavior-list').innerHTML = '<li>Contact behaviors could not be loaded. Please refresh to try again.</li>';
  console.error(error);
});
loadJSON('content/benchmark.json').then(stats => {
  $('[data-objects]').textContent = stats.object_asset_types.length;
  $('[data-perturbations]').textContent = Object.values(stats.perturbations).reduce((sum, values) => sum + values.length, 0);
}).catch(console.error);
loadNews();


async function loadResources() {
  try {
    const resources = await loadJSON('content/resources.json');
    $('#paper-resources').innerHTML = resources.map(resource => {
      const label = escapeHTML(resource.label);
      const resourceIcon = `<img src="${escapeHTML(resource.icon)}" width="20" height="20" alt="">`;
      const href = resource.url && /^https?:\/\//.test(resource.url) ? resource.url : null;
      return href
        ? `<a class="resource-link" href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${resourceIcon}${label}</a>`
        : `<button class="resource-link" disabled>${resourceIcon}${label}</button>`;
    }).join('');
  } catch (error) { console.error(error); }
}

async function loadLeaderboard() {
  try {
    const rows = await loadJSON('content/leaderboard.json?v=20261031');
    if (!rows.length || rows.some(row => !row.model || row.scores.length !== 14 || row.scores.some(score => typeof score !== 'number' || !Number.isFinite(score)))) throw new Error('Invalid leaderboard data');
    const best = Array.from({length:14}, (_, index) => Math.max(...rows.map(row => row.scores[index])));
    const render = ranking => {
      const column = ranking === 'ind' ? 12 : 13;
      $('#leaderboard-body').innerHTML = [...rows].sort((a,b) => b.scores[column] - a.scores[column]).map(row => `<tr${row.model === 'TacMind-0' ? ' class="our-model"' : ''}><th scope="row">${escapeHTML(row.model)}${row.single_task ? '<span class="training-tag">Single-task</span>' : ''}</th>${row.scores.map((score,index) => `<td${index === column ? ' class="ranked-metric"' : ''}>${score === best[index] ? `<strong>${score.toFixed(1)}</strong>` : score.toFixed(1)}</td>`).join('')}</tr>`).join('');
      $$('[data-ranking]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.ranking === ranking)));
      $$('[data-average]').forEach(header => {
        const selected = header.dataset.average === ranking;
        if (selected) header.setAttribute('aria-sort', 'descending');
        else header.removeAttribute('aria-sort');
        header.textContent = (header.dataset.average === 'ind' ? 'InD' : 'OOD') + (selected ? ' ↓' : '');
      });
      $('#leaderboard-order').textContent = `Ranked by average ${ranking === 'ind' ? 'InD' : 'OOD'} · Higher is better`;
    };
    $$('[data-ranking]').forEach(button => button.addEventListener('click', () => render(button.dataset.ranking)));
    render('ood');
  } catch (error) {
    $('#leaderboard-body').innerHTML = '<tr><td colspan="15">Results could not be loaded. Please refresh to try again.</td></tr>';
    console.error(error);
  }
}
loadResources();
loadLeaderboard();


async function loadPerturbations() {
  try {
    const gallery = await loadJSON('content/perturbations.json');
    let selected = gallery.conditions[0];
    let split = 50;
    const categoryLabels = {lighting:'Lighting', camera:'Camera', scale:'Object scale'};
    const setSplit = value => {
      split = Number(value);
      $('#perturbations').style.setProperty('--split', split + '%');
      $('#perturbation-dialog').style.setProperty('--split', split + '%');
      $$('.comparison-range').forEach(input => {
        input.value = split;
        input.setAttribute('aria-valuetext', `${split}% baseline, ${100 - split}% perturbation`);
      });
    };
    const comparison = (scene, enlarged = false) => {
      const frame = document.createElement('div');
      frame.className = 'comparison-frame';
      frame.setAttribute('aria-busy', 'true');
      frame.innerHTML = `<img class="comparison-before" width="640" height="640" alt="${escapeHTML(scene.title)} — nominal baseline" decoding="async"><img class="comparison-after" width="640" height="640" alt="${escapeHTML(scene.title)} — ${escapeHTML(selected.title)}" decoding="async"><div class="comparison-labels" aria-hidden="true"><span>Baseline</span><span>Perturbed</span></div><div class="comparison-divider" aria-hidden="true"></div><input class="comparison-range" type="range" min="0" max="100" step="1" value="${split}" aria-label="Compare baseline and ${escapeHTML(selected.title)} for ${escapeHTML(scene.title)}" aria-valuetext="${split}% baseline, ${100 - split}% perturbation"><span class="comparison-status">Loading comparison…</span>`;
      const images = $$('img', frame);
      images.forEach(img => {
        img.loading = enlarged ? 'eager' : 'lazy';
        img.addEventListener('load', () => {
          if (images.every(image => image.complete && image.naturalWidth)) {
            $('.comparison-status', frame).hidden = true;
            frame.setAttribute('aria-busy', 'false');
          }
        });
        img.addEventListener('error', () => {
          $('.comparison-status', frame).textContent = 'Image unavailable. Try another preset.';
          frame.setAttribute('aria-busy', 'false');
        });
      });
      images[0].src = scene.baseline;
      images[1].src = selected.images[scene.suite];
      $('.comparison-range', frame).addEventListener('input', event => setSplit(event.target.value));
      return frame;
    };
    const render = () => {
      $('#perturbation-title').textContent = selected.title;
      $('#perturbation-description').textContent = selected.description;
      $$('[data-perturbation-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.perturbationPreset === selected.id)));
      $('#perturbation-grid').replaceChildren();
      for (const scene of gallery.scenes) {
        const card = document.createElement('figure');
        card.className = 'perturbation-card';
        card.dataset.scene = scene.suite;
        card.innerHTML = `<header><span>${escapeHTML(suites[scene.suite].label.toUpperCase())}</span><span>Task ${String(scene.id).padStart(2,'0')}</span></header>`;
        card.append(comparison(scene));
        const caption = document.createElement('figcaption');
        caption.innerHTML = `<h4>${escapeHTML(scene.title)}</h4><button type="button" class="comparison-enlarge" aria-label="Enlarge ${escapeHTML(scene.title)} comparison">${icon('expand')}</button>`;
        $('button', caption).addEventListener('click', () => {
          $('#perturbation-dialog-title').textContent = scene.title;
          $('#perturbation-dialog-description').textContent = `${selected.title} · ${selected.description}`;
          $('#perturbation-dialog-content').replaceChildren(comparison(scene, true));
          openDialog('perturbation-dialog');
        });
        card.append(caption);
        $('#perturbation-grid').append(card);
      }
    };
    const selectCategory = category => {
      const presets = gallery.conditions.filter(item => item.category === category);
      selected = presets[0];
      $$('[data-perturbation-category]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.perturbationCategory === category)));
      $('#perturbation-presets').setAttribute('aria-label', categoryLabels[category] + ' presets');
      $('#perturbation-presets').replaceChildren();
      for (const preset of presets) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.perturbationPreset = preset.id;
        button.textContent = preset.label;
        button.addEventListener('click', () => { selected = preset; render(); });
        $('#perturbation-presets').append(button);
      }
      render();
    };
    $$('[data-perturbation-category]').forEach(button => button.addEventListener('click', () => selectCategory(button.dataset.perturbationCategory)));
    selectCategory('lighting');
  } catch (error) {
    $('#perturbation-grid').innerHTML = '<p>Comparisons could not be loaded. Please refresh to try again.</p>';
    console.error(error);
  }
}
loadPerturbations();
