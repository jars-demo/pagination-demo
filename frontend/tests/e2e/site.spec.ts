import { expect, test } from '@playwright/test'

test('home shows the index and opens chapter 01', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Every row, exactly once.')
  const index = page.locator('section', { has: page.locator('#chapters') })
  await expect(index.locator('ol > li')).toHaveCount(8)
  await expect(index).toContainText('The cursor that forgot the question')
  await expect(page.getByRole('figure').first()).toContainText('never shown:  3')

  await page.getByRole('link', { name: 'Start chapter 01' }).click()
  await expect(page).toHaveURL(/\/workshop\/01-pages-and-offsets$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pages and offsets')
})

test('the feed repeats and misses rows by offset, and not by cursor', async ({ page }) => {
  await page.goto('/#feed')
  const feed = page.locator('#feed')
  const play = feed.getByRole('button', { name: 'Play the busy pattern' })

  await play.click()
  await expect(feed.getByTestId('Shown twice')).toHaveText('2')
  await expect(feed.getByTestId('Missed')).toHaveText('2')
  await expect(feed.getByText('seen twice', { exact: true })).toHaveCount(2)
  await expect(feed.getByText('missed', { exact: true })).toHaveCount(2)

  await feed.getByRole('button', { name: 'Cursor' }).click()
  await expect(feed.getByTestId('Pages read')).toHaveText('0')
  await play.click()
  await expect(feed.getByTestId('Shown twice')).toHaveText('0')
  await expect(feed.getByTestId('Missed')).toHaveText('0')
  await expect(feed.getByRole('status')).toContainText('That is the end of the feed.')

  await feed.getByRole('button', { name: 'Start over' }).click()
  await feed.getByRole('button', { name: 'Next page' }).click()
  await expect(feed.getByRole('status')).toContainText('Page 1: #12, #11, #10, #9.')
  await feed.getByRole('button', { name: 'A record arrives' }).click()
  await expect(feed.getByRole('status')).toContainText('#13 arrives')
})

test('Bram quizzes you, and closes with Escape', async ({ page }) => {
  await page.goto('/workshop/03-stable-order')
  await page.getByRole('button', { name: 'Ask Bram' }).click()
  const panel = page.getByRole('region', { name: "Bram's notes" })
  await expect(panel).toContainText('ORDER BY price says nothing')

  await panel.getByRole('button', { name: 'ORDER BY price, title' }).click()
  const verdict = panel.getByRole('status').first()
  await expect(verdict).toContainText('Not quite.')
  await expect(panel.getByRole('button', { name: 'ORDER BY price, id' })).toBeDisabled()
  // The explanation is dark text on the white card, never light on light.
  const colours = await verdict.evaluate((node) => ({
    text: getComputedStyle(node).color,
    card: getComputedStyle(node.closest('section') as Element).backgroundColor,
  }))
  expect(colours).toEqual({ text: 'rgb(58, 57, 54)', card: 'rgb(255, 255, 255)' })

  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page.getByRole('button', { name: 'Ask Bram' })).toBeFocused()
})

test('chapters render and page through in order', async ({ page }) => {
  await page.goto('/workshop')
  await expect(page.locator('main ol > li')).toHaveCount(8)

  await page.locator('main ol > li').nth(4).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cursors on a sort with ties')
  await expect(page.locator('main')).toContainText('records shown:  70 of 100')
  await expect(page.locator('main pre').first()).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: /Fix the case/ })).toBeVisible()
  await page.getByRole('link', { name: /Next/ }).click()
  await expect(page).toHaveURL(/06-opaque-cursors$/)
})

test('nothing scrolls sideways, and code scrolls inside itself', async ({ page }) => {
  for (const path of ['/', '/workshop', '/workshop/04-cursors', '/workshop/05-keyset-ties']) {
    await page.goto(path)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, path).toBeLessThanOrEqual(0)
  }
  const scrolls = await page
    .locator('.code-block pre')
    .evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).overflowX === 'auto'))
  expect(scrolls).toBe(true)
})

test('buttons are big enough to tap', async ({ page }) => {
  await page.goto('/')
  const small = await page
    .locator('main button:visible, header a:visible, .fixed button:visible')
    .evaluateAll((nodes) =>
      nodes
        .map((node) => ({ text: node.textContent?.trim(), box: node.getBoundingClientRect() }))
        .filter(({ box }) => box.height < 40 || box.width < 40)
        .map(({ text }) => text),
    )
  expect(small).toEqual([])
})

test('back to top returns to the top', async ({ page }) => {
  await page.goto('/workshop/08-syncing-changes')
  await page.evaluate(() => window.scrollTo(0, 3000))
  const button = page.getByRole('button', { name: 'Back to top' })

  await expect(button).toBeVisible()
  await button.click()
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
})
