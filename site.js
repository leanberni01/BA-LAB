'use strict';
const modal = document.querySelector('#modal');
const dialog = document.querySelector('#dialog');
const pimg = document.querySelector('#profileImage');
const pvideo = document.querySelector('#profileVideo');
const videoToggle = document.querySelector('#videoToggle');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const background = [...document.querySelectorAll('[data-background]'), document.querySelector('.skip-link')];
let lastFocus = null;
let currentIndex = 0;
let soundEnabled = false;
let audioContext;
let mediaGeneration = 0;

function playSound() {
  if (!soundEnabled) return;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  try {
    audioContext ??= new AudioCtx();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(240, now);
    oscillator.frequency.exponentialRampToValueAtTime(1100, now + .35);
    oscillator.frequency.exponentialRampToValueAtTime(520, now + .55);
    gain.gain.setValueAtTime(.001, now);
    gain.gain.exponentialRampToValueAtTime(.06, now + .03);
    gain.gain.exponentialRampToValueAtTime(.001, now + .6);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start();
    oscillator.stop(now + .6);
  } catch { /* Audio is optional; profiles remain available. */ }
}

function updateVideoButton() {
  videoToggle.textContent = pvideo.paused ? 'Play animation' : 'Pause animation';
}
function showStill() {
  pvideo.hidden = true;
  pimg.hidden = false;
  updateVideoButton();
}
function playAnimation() {
  const generation = mediaGeneration;
  pvideo.play().then(() => {
    if (generation !== mediaGeneration || modal.hidden) return;
    pvideo.hidden = false;
    pimg.hidden = true;
    updateVideoButton();
  }).catch(() => {
    if (generation === mediaGeneration) showStill();
  });
}
function renderProfile() {
  const profile = profiles[currentIndex];
  mediaGeneration++;
  pvideo.pause();
  pvideo.removeAttribute('src');
  pvideo.load();
  showStill();
  dialog.style.setProperty('--accent', profile.color);
  pimg.src = images[profile.id];
  pimg.alt = `Full LEGO-style laboratory avatar for ${profile.name}`;
  pvideo.poster = images[profile.id];
  pvideo.setAttribute('aria-label', `Animated laboratory avatar for ${profile.name}`);
  document.querySelector('#profileName').textContent = profile.name;
  document.querySelector('#profileRole').textContent = profile.role;
  for (const field of ['superpower', 'project', 'fact']) {
    document.querySelector(`[data-field="${field}"]`).textContent = profile[field] || 'More to come';
  }
  document.querySelector('#profileCount').textContent = `${currentIndex + 1} of ${profiles.length}`;
  document.querySelector('#profileBody').scrollTop = 0;
  videoToggle.hidden = !profile.video;
  if (profile.video) {
    pvideo.src = profile.video;
    if (!motionPreference.matches) playAnimation();
  }
}
function openProfile(id) {
  const index = profiles.findIndex(profile => profile.id === id);
  if (index < 0) return;
  if (modal.hidden) lastFocus = document.activeElement;
  currentIndex = index;
  modal.hidden = false;
  background.forEach(element => { element.inert = true; });
  document.body.style.overflow = 'hidden';
  renderProfile();
  document.querySelector('.close').focus();
  playSound();
}
function closeProfile() {
  if (modal.hidden) return;
  mediaGeneration++;
  pvideo.pause();
  pvideo.removeAttribute('src');
  pvideo.load();
  modal.hidden = true;
  background.forEach(element => { element.inert = false; });
  document.body.style.overflow = '';
  lastFocus?.focus();
}
function moveProfile(step) {
  currentIndex = (currentIndex + step + profiles.length) % profiles.length;
  renderProfile();
  playSound();
}
document.querySelectorAll('.card').forEach(card => card.addEventListener('click', () => openProfile(card.dataset.id)));
document.querySelectorAll('[data-profile]').forEach(button => button.addEventListener('click', () => openProfile(button.dataset.profile)));
document.querySelector('.close').addEventListener('click', closeProfile);
document.querySelector('#previous').addEventListener('click', () => moveProfile(-1));
document.querySelector('#next').addEventListener('click', () => moveProfile(1));
modal.addEventListener('click', event => { if (event.target === modal) closeProfile(); });
videoToggle.addEventListener('click', () => {
  if (pvideo.paused) playAnimation();
  else pvideo.pause();
});
pvideo.addEventListener('play', updateVideoButton);
pvideo.addEventListener('pause', updateVideoButton);
pvideo.addEventListener('ended', updateVideoButton);
pvideo.addEventListener('error', () => {
  if (!pvideo.getAttribute('src')) return;
  showStill();
  videoToggle.hidden = true;
});
motionPreference.addEventListener('change', event => {
  if (event.matches) pvideo.pause();
});
document.addEventListener('keydown', event => {
  if (modal.hidden) return;
  if (event.key === 'Escape') { event.preventDefault(); closeProfile(); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); moveProfile(-1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); moveProfile(1); }
  if (event.key === 'Tab') {
    const controls = [...modal.querySelectorAll('button:not([hidden])')].filter(button => !button.disabled);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
document.querySelector('#sound').addEventListener('click', event => {
  soundEnabled = !soundEnabled;
  event.currentTarget.textContent = `Sound: ${soundEnabled ? 'On' : 'Off'}`;
  event.currentTarget.setAttribute('aria-pressed', String(soundEnabled));
  playSound();
});
