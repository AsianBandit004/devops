import './styles.css';
import { buildTrackRankHistory, type TrackHistorySeries } from './track-history';

type Item = { title: string; detail: string; image?: string; change?: string; spotifyId?: string };
type Dashboard = { connected: boolean; profile?: { name: string; image?: string }; summary: { likedTracks: number; followedShows: number; snapshots: number }; topTracks: Item[]; topArtists: Item[]; trending: Item[] };
type ArchiveEntry = { savedAt: string; likedTracks: number; followedShows: number; topTrack: string | null; topArtist: string | null; topTrackImage?: string | null; topArtistImage?: string | null; topTracks?: Array<{ title: string; image: string | null; spotifyId?: string | null }>; topArtists?: Array<{ title: string; image: string | null }> };
type ListeningTrack = { title: string; artist: string; image: string | null; plays: number };
type ListeningDiary = { totalPlays: number; days: Array<{ date: string; plays: number; topTrack: ListeningTrack | null }>; topTracks: ListeningTrack[] };

const app = document.querySelector<HTMLElement>('#app')!;
const escape = (value = '') => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]!));
const demo: Dashboard = { connected: false, summary: { likedTracks: 0, followedShows: 0, snapshots: 0 }, topTracks: [{ title: 'Your top tracks', detail: 'Will appear after Spotify is connected.', spotifyId: '4uLU6hMCjMI75M1A2tKUQC' }], topArtists: [{ title: 'Your top artists', detail: 'Your listening story starts here.' }], trending: [{ title: 'The signal is quiet', detail: 'Snapshots will reveal what is rising for you.' }] };
let historyTracks: TrackHistorySeries[] = [];

function itemCard(item: Item, number: number, playable = false) {
  const play = playable && item.spotifyId ? `<button class="track-play" type="button" data-track-id="${escape(item.spotifyId)}" data-track-title="${escape(item.title)}" aria-label="Play ${escape(item.title)} on Spotify"><span aria-hidden="true">▶</span> Play</button>` : '';
  return `<li class="ranked-item"><span class="rank">${String(number).padStart(2, '0')}</span>${item.image ? `<img src="${escape(item.image)}" alt=""/>` : '<span class="art-placeholder"></span>'}<span><strong>${escape(item.title)}</strong><small>${escape(item.detail)}</small>${play}</span>${item.change ? `<em>${escape(item.change)}</em>` : ''}</li>`;
}

function listeningStrength(archive: ArchiveEntry[]) {
  const tracks = archive[0]?.topTracks?.slice(0, 5) || [];
  if (!tracks.length) return `<section class="strength-map" aria-label="Daily listening strength"><div class="strength-empty"><span>♫</span><strong>Waiting for your first daily signal.</strong></div></section>`;
  const bars = tracks.map((track, index) => {
    const strength = 100 - index * 15;
    return `<li><div class="strength-bar-wrap"><div class="strength-bar" style="height:${strength}%"><span class="strength-value">${strength}</span>${track.image ? `<img src="${escape(track.image)}" alt="Album cover for ${escape(track.title)}"/>` : '<span>♫</span>'}</div></div><b>${escape(track.title)}</b><small>Listening strength</small></li>`;
  }).join('');
  return `<section class="strength-map" aria-label="Daily listening strength for your top five tracks"><ol>${bars}</ol></section>`;
}

function listeningDiary(diary: ListeningDiary) {
  if (!diary.totalPlays) return `<section class="listening-diary" aria-label="Listening diary"><div><p class="kicker">LISTENING DIARY</p><h2>The next song<br><i>starts the story.</i></h2><p>New plays are collected privately every two hours. Your first daily record will appear after reconnecting Spotify.</p></div><div class="diary-empty"><span>♫</span><strong>Waiting for a first play</strong></div></section>`;
  const formatDate = (date: string) => new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
  const days = diary.days.slice(0, 7).reverse().map((day) => `<li><time datetime="${escape(day.date)}">${escape(formatDate(day.date))}</time><strong>${day.plays}</strong><span>${day.plays === 1 ? 'play' : 'plays'}</span>${day.topTrack ? `<small>${escape(day.topTrack.title)}</small>` : ''}</li>`).join('');
  const tracks = diary.topTracks.map((track, index) => `<li><span class="diary-rank">${String(index + 1).padStart(2, '0')}</span>${track.image ? `<img src="${escape(track.image)}" alt="Album cover for ${escape(track.title)}"/>` : '<span class="diary-art">♫</span>'}<span><b>${escape(track.title)}</b><small>${escape(track.artist)}</small></span><em>${track.plays}×</em></li>`).join('');
  return `<section class="listening-diary" aria-label="Listening diary"><div class="diary-copy"><p class="kicker">LISTENING DIARY</p><h2>What stayed<br><i>on repeat.</i></h2><p>${diary.totalPlays} recorded ${diary.totalPlays === 1 ? 'play' : 'plays'} across the last seven days. Private event times stay on the server.</p><ol class="diary-days">${days}</ol></div><div class="diary-replays"><div><p class="kicker">MOST REPLAYED</p><span>LAST 7 DAYS</span></div><ol>${tracks}</ol></div></section>`;
}

function trackHistoryDetail(track: TrackHistorySeries) {
  const recorded = track.points.filter((point) => point.rank !== null);
  const latest = [...recorded].reverse()[0];
  const latestRank = latest?.rank ? `Latest recorded rank: #${latest.rank}` : 'Not in the latest saved Top 5';
  return `<div class="history-detail-cover">${track.image ? `<img src="${escape(track.image)}" alt="Album cover for ${escape(track.title)}"/>` : '<span>♫</span>'}</div><div><p class="kicker">TRACK HISTORY</p><h2>${escape(track.title)}</h2><p><b>${recorded.length}</b> ${recorded.length === 1 ? 'saved day' : 'saved days'} in the Top 5</p><small>${escape(latestRank)}</small></div>`;
}

function historyHits(archive: ArchiveEntry[]) {
  const history = buildTrackRankHistory(archive);
  historyTracks = history.series;
  if (!history.dates.length || !historyTracks.length) return `<section class="history-hits"><div class="history-intro"><p class="kicker">HISTORY HITS</p><h1>Your ranks,<br><i>still forming.</i></h1><p>Daily Top 5 rank lines appear as your listening record grows.</p></div><div class="history-empty"><span>✦</span><strong>First track history pending</strong></div></section>`;
  const colors = ['#f28a76', '#70e5bd', '#77a8ff', '#c48cf2', '#f6c35d'];
  const x = (index: number) => history.dates.length === 1 ? 50 : 8 + (84 * index) / (history.dates.length - 1);
  const y = (rank: number) => 17 + (rank - 1) * 16;
  const path = (track: TrackHistorySeries) => track.points.reduce((value, point, index) => point.rank ? `${value}${value ? ' L ' : 'M '}${x(index)} ${y(point.rank)}` : value, '');
  const lines = historyTracks.map((track, index) => `<path d="${path(track)}" class="track-rank-line${index === 0 ? ' is-featured' : ''}" style="stroke:${colors[index]}"/>`).join('');
  const labels = history.dates.map((date, index) => `<span style="left:${x(index)}%">${escape(date.slice(5))}</span>`).join('');
  const cards = historyTracks.map((track, index) => `<li><button class="history-track${index === 0 ? ' is-selected' : ''}" type="button" data-history-track="${index}" aria-label="Show rank history for ${escape(track.title)}"><i style="background:${colors[index]}"></i>${track.image ? `<img src="${escape(track.image)}" alt="Album cover for ${escape(track.title)}"/>` : '<span class="history-track-art">♫</span>'}<span><b>${escape(track.title)}</b><small>${track.points.filter((point) => point.rank !== null).length} saved days</small></span></button></li>`).join('');
  return `<section class="history-hits rank-history"><div class="history-intro"><p class="kicker">HISTORY HITS</p><h1>The tracks<br><i>that moved.</i></h1><p>A rank-history chart of your daily Spotify Top 5. Higher lines mean a stronger position.</p><small>Every line is a track. Select an album card to bring its movement into focus.</small></div><div class="history-visual"><div class="rank-chart" aria-label="Top five track rank history"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M 8 17 H 92 M 8 33 H 92 M 8 49 H 92 M 8 65 H 92 M 8 81 H 92" class="history-grid"/>${lines}</svg><div class="rank-axis" aria-hidden="true"><span>#1</span><span>#2</span><span>#3</span><span>#4</span><span>#5</span></div><div class="history-labels">${labels}</div></div><ol class="history-track-list">${cards}</ol><div class="history-detail" id="history-detail">${trackHistoryDetail(historyTracks[0])}</div></div></section>`;
}

function statusIndicator(connected: boolean) {
  const label = connected ? 'Connected' : 'Not connected';
  return `<span class="connection ${connected ? 'is-connected' : 'is-disconnected'}" role="status" aria-label="Spotify connection ${label}"><i></i><span><b>Spotify Connection Status</b>${label}</span></span>`;
}

function chrome(connected: boolean, listener: string, active: 'dashboard' | 'history' | 'about') {
  return {
    header: `<header><a class="wordmark" href="/">Skyrider</a><div class="header-right"><nav class="site-nav" aria-label="Primary navigation"><a href="/"${active === 'dashboard' ? ' aria-current="page"' : ''}>Weekly Hits</a><a href="/history"${active === 'history' ? ' aria-current="page"' : ''}>History Hits</a><a href="/about"${active === 'about' ? ' aria-current="page"' : ''}>About</a></nav>${statusIndicator(connected)}</div></header>`,
    footer: `<footer><span>Skyrider</span><span>${escape(listener)}</span></footer>`,
  };
}

function aboutPage(data: Dashboard) {
  const listener = data.profile?.name || 'AsianBandit004';
  const layout = chrome(data.connected, listener, 'about');
  app.innerHTML = `${layout.header}<main><section class="about-hero"><p class="kicker">ABOUT SKYRIDER</p><h1>${escape(listener)}</h1><p>Skyrider is a small personal record of the music that stays with me.</p></section><section class="about-lede"><p>It is not about what is playing right this second. It is about the songs that return, the artists that keep finding their way back, and the little shifts in taste that build over time.</p><p>This space follows my listening through weekly hits, top tracks, favorite artists, and a daily listening-strength snapshot.</p></section><section class="about-grid"><article><p class="kicker">THE SOUNDTRACK</p><h2>I listen across<br><i>whatever catches me.</i></h2><p>Late-night electronic, hip-hop, pop, throwbacks, and everything in between.</p><p>Some songs are a moment. Some become part of the routine. The ones that stay are what Skyrider keeps track of.</p></article><article class="about-card"><p class="kicker">HOW IT WORKS</p><p>Skyrider connects to Spotify with read-only access.</p><ul><li>Liked tracks</li><li>Followed shows</li><li>Top tracks</li><li>Top artists</li><li>Listening strength</li></ul><small>Nothing here can play music, edit Spotify, change playlists, or modify the account.</small></article></section><section class="about-archive"><p class="kicker">A PERSONAL ARCHIVE</p><h2>More than a dashboard.</h2><p>Over time, Skyrider becomes a listening diary—a way to look back at what defined a week, a season, or a phase.</p><a class="about-return" href="/">Back to Weekly Hits <span>↗</span></a></section></main>${layout.footer}`;
}

function dashboardPage(data: Dashboard, archive: ArchiveEntry[], diary: ListeningDiary) {
  const listener = data.profile?.name || 'AsianBandit004';
  const layout = chrome(data.connected, listener, 'dashboard');
  app.innerHTML = `${layout.header}<main><section class="masthead"><p class="kicker">WEEKLY LISTENING EDITION</p><h1>${escape(listener)}<br><i>Weekly Hits</i></h1><p class="intro">The music that makes you, you.</p></section><section class="signal-panel"><article class="feature"><div class="feature-heading"><p class="kicker">ON THE RISE</p><span class="rise-mark" aria-hidden="true">↗</span></div><h2>${escape(data.trending[0]?.title || 'Still collecting notes')}</h2><p>${escape(data.trending[0]?.detail || 'Your first comparison will appear after the next snapshot.')}</p><small>Measured against your last saved listening snapshot</small></article><aside class="library"><div class="library-heading"><p class="kicker">THE LIBRARY</p><span>YOUR COLLECTION</span></div><dl><div><dt>${data.summary.likedTracks.toLocaleString()}</dt><dd>liked tracks</dd></div><div><dt>${data.summary.followedShows.toLocaleString()}</dt><dd>followed shows</dd></div><div><dt>${data.summary.snapshots.toLocaleString()}</dt><dd>saved moments</dd></div></dl></aside></section><section class="columns"><article><div class="section-title"><p class="kicker">THE SOUND OF YOU</p><h2>Top tracks</h2><span>Last 4 weeks</span></div><ol>${data.topTracks.slice(0, 5).map((item, index) => itemCard(item, index, true)).join('')}</ol><div class="spotify-player-dock" id="spotify-player-dock" hidden></div></article><article><div class="section-title"><p class="kicker">THE COMPANY YOU KEEP</p><h2>Top artists</h2><span>Last 4 weeks</span></div><ol>${data.topArtists.slice(0, 5).map((item, index) => itemCard(item, index)).join('')}</ol></article></section>${listeningStrength(archive)}${listeningDiary(diary)}</main>${layout.footer}`;
}

function historyPage(data: Dashboard, archive: ArchiveEntry[]) {
  const listener = data.profile?.name || 'AsianBandit004';
  const layout = chrome(data.connected, listener, 'history');
  app.innerHTML = `${layout.header}<main>${historyHits(archive)}</main>${layout.footer}`;
}

function render(data: Dashboard, archive: ArchiveEntry[] = [], diary: ListeningDiary = { totalPlays: 0, days: [], topTracks: [] }) {
  if (location.pathname === '/about' || location.pathname === '/about/') aboutPage(data);
  else if (location.pathname === '/history' || location.pathname === '/history/') historyPage(data, archive);
  else dashboardPage(data, archive, diary);
}

const dashboardRequest = fetch('/api/dashboard').then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<Dashboard>; });
const archiveRequest = fetch('/api/archive').then(async (response) => response.ok ? response.json() as Promise<{ archive: ArchiveEntry[] }> : { archive: [] }).catch(() => ({ archive: [] }));
const diaryRequest = fetch('/api/listening-diary').then(async (response) => response.ok ? response.json() as Promise<ListeningDiary> : { totalPlays: 0, days: [], topTracks: [] }).catch(() => ({ totalPlays: 0, days: [], topTracks: [] }));
Promise.all([dashboardRequest, archiveRequest, diaryRequest]).then(([data, archive, diary]) => render(data, archive.archive, diary)).catch(() => render(demo));

app.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('.track-play, .spotify-player-close, .history-track') : null;
  if (!target) return;
  if (target.classList.contains('history-track')) {
    const track = historyTracks[Number(target.dataset.historyTrack)];
    const detail = app.querySelector<HTMLElement>('#history-detail');
    if (!track || !detail) return;
    app.querySelectorAll('.history-track').forEach((card) => card.classList.toggle('is-selected', card === target));
    detail.innerHTML = trackHistoryDetail(track);
    return;
  }
  const dock = app.querySelector<HTMLElement>('#spotify-player-dock');
  if (!dock) return;
  if (target.classList.contains('spotify-player-close')) { dock.hidden = true; dock.replaceChildren(); return; }
  const trackId = target.dataset.trackId;
  if (!trackId) return;
  app.querySelectorAll('.track-play').forEach((button) => button.classList.toggle('is-playing', button === target));
  dock.hidden = false;
  dock.innerHTML = `<div class="spotify-player-heading"><span>Now selected: ${escape(target.dataset.trackTitle || 'Spotify track')}</span><button class="spotify-player-close" type="button" aria-label="Close Spotify player">×</button></div><iframe title="Spotify player for ${escape(target.dataset.trackTitle || 'selected track')}" src="https://open.spotify.com/embed/track/${escape(trackId)}?utm_source=generator" width="100%" height="152" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`;
});
