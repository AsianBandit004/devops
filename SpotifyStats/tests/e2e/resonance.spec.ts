import { expect, test } from '@playwright/test';

test('shows the read-only listening dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('banner').getByRole('link', { name: /skyrider/i })).toBeVisible();
  await expect(page.getByRole('status', { name: /spotify connection not connected/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /asianbandit004 weekly hits/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /top tracks/i })).toBeVisible();
  await expect(page.getByLabel(/daily listening strength/i)).toBeVisible();
  await expect(page.getByLabel(/listening diary/i)).toBeVisible();
  await page.getByRole('button', { name: /play your top tracks on spotify/i }).click();
  await expect(page.locator('#spotify-player-dock')).toBeVisible();
  await expect(page.locator('#spotify-player-dock iframe')).toHaveAttribute('src', /open\.spotify\.com\/embed\/track/);
  await expect(page.getByRole('link', { name: /connect spotify/i })).toHaveCount(0);
  await expect(page.getByText(/create your profile|join the board|post message/i)).toHaveCount(0);
});

test('shows aggregate listening-diary data without raw play timestamps', async ({ page }) => {
  await page.route('**/api/dashboard', async (route) => route.fulfill({ json: {
    connected: true, profile: { name: 'AsianBandit004' }, summary: { likedTracks: 1, followedShows: 1, snapshots: 1 }, topTracks: [], topArtists: [], trending: [],
  } }));
  await page.route('**/api/archive', async (route) => route.fulfill({ json: { archive: [] } }));
  await page.route('**/api/listening-diary', async (route) => route.fulfill({ json: {
    totalPlays: 3,
    days: [{ date: '2026-08-29', plays: 3, topTrack: { title: 'Track A', artist: 'Artist A', image: 'https://example.test/a.jpg', plays: 2 } }],
    topTracks: [{ title: 'Track A', artist: 'Artist A', image: 'https://example.test/a.jpg', plays: 2 }, { title: 'Track B', artist: 'Artist B', image: null, plays: 1 }],
  } }));
  await page.goto('/');
  await expect(page.getByLabel(/listening diary/i)).toBeVisible();
  await expect(page.getByText(/3 recorded plays across the last seven days/i)).toBeVisible();
  await expect(page.getByText('Track A').last()).toBeVisible();
  await expect(page.getByText('2×')).toBeVisible();
});

test('shows the Skyrider about page', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('link', { name: /weekly hits/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /about/i }).first()).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: /asianbandit004/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /more than a dashboard/i })).toBeVisible();
  await expect(page.getByText(/read-only access/i)).toBeVisible();
});

test('shows the History Hits page', async ({ page }) => {
  await page.route('**/api/dashboard', async (route) => route.fulfill({ json: {
    connected: true,
    profile: { name: 'AsianBandit004' },
    summary: { likedTracks: 1, followedShows: 1, snapshots: 3 },
    topTracks: [], topArtists: [], trending: [],
  } }));
  await page.route('**/api/archive', async (route) => route.fulfill({ json: { archive: [
    { savedAt: '2026-08-03T03:15:00.000Z', likedTracks: 2, followedShows: 1, topTrack: 'Morning track', topArtist: 'Artist B', topTrackImage: 'https://example.test/morning.jpg', topTracks: [{ title: 'Morning track', image: 'https://example.test/morning.jpg', spotifyId: 'morning' }, { title: 'Second track', image: 'https://example.test/second.jpg', spotifyId: 'second' }] },
    { savedAt: '2026-08-04T03:15:00.000Z', likedTracks: 3, followedShows: 1, topTrack: 'Second track', topArtist: 'Artist C', topTrackImage: 'https://example.test/second.jpg', topTracks: [{ title: 'Second track', image: 'https://example.test/second.jpg', spotifyId: 'second' }, { title: 'Morning track', image: 'https://example.test/morning.jpg', spotifyId: 'morning' }] },
  ] } }));
  await page.goto('/history');
  await expect(page.getByRole('link', { name: /history hits/i }).first()).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('heading', { name: /the tracks that moved/i })).toBeVisible();
  await expect(page.getByLabel(/top five track rank history/i)).toBeVisible();
  await expect(page.locator('.track-rank-line')).toHaveCount(2);
  await expect(page.locator('.history-track')).toHaveCount(2);
  await page.getByRole('button', { name: /show rank history for second track/i }).click();
  await expect(page.locator('#history-detail').getByText('Second track')).toBeVisible();
});
