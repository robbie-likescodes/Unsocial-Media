import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('home focuses on searchable collections without horizontal overflow', async ({
  page,
}) => {
  await expect(
    page.getByRole('heading', { name: 'Your collections' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Rabbit Hole home' }),
  ).toBeVisible()
  await page
    .getByRole('searchbox', { name: 'Search collections' })
    .fill('Coffee')
  await expect(
    page.getByRole('button', { name: /Coffee rituals/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Bluegrass evenings/ }),
  ).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})

test('a new private collection persists after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'New collection' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Collection name').fill('Weekend rabbit holes')
  await dialog.getByRole('button', { name: 'Create collection' }).click()
  await expect(
    page.getByRole('button', { name: /Weekend rabbit holes/ }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', { name: /Weekend rabbit holes/ }),
  ).toBeVisible()
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('rabbit-hole.library.v1') ?? '{}'),
  )
  expect(
    saved.collections.find(
      (collection: { name: string }) =>
        collection.name === 'Weekend rabbit holes',
    ).visibility,
  ).toBe('private')
})

test('create a note in the current collection and return to it after reload', async ({
  page,
}) => {
  await page.getByRole('button', { name: /Coffee rituals/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Coffee rituals' }),
  ).toBeVisible()
  await page.getByRole('tab', { name: 'Create' }).click()
  for (const type of [
    'Note',
    'Link',
    'Photo',
    'Video',
    'Person',
    'Place',
    'Event',
  ]) {
    await expect(
      page.getByRole('button', { name: new RegExp(`^${type}\\b`) }),
    ).toBeVisible()
  }
  await page.getByRole('button', { name: /^Note\b/ }).click()
  await page
    .getByLabel('Title', { exact: true })
    .fill('My next coffee experiment')
  await page
    .getByLabel('Notes', { exact: true })
    .fill('Try a coarser grind tomorrow morning.')
  await page.getByRole('button', { name: 'Save item', exact: true }).click()
  await expect(
    page.getByText('My next coffee experiment', { exact: true }),
  ).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: /Coffee rituals/ }).click()
  await expect(
    page.getByText('My next coffee experiment', { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('article').first()).toContainText(
    'My next coffee experiment',
  )
  await page
    .getByRole('button', {
      name: 'Open My next coffee experiment',
      exact: true,
    })
    .click()
  const detail = page.getByRole('dialog', { name: 'My next coffee experiment' })
  await expect(
    detail.getByRole('heading', { name: 'My next coffee experiment' }),
  ).toBeVisible()
  await expect(detail).toContainText('Try a coarser grind tomorrow morning.')
})

test('saving requires a collection and discoveries exclude only this collection’s saved items', async ({
  page,
}) => {
  await page.getByRole('button', { name: /Coffee rituals/ }).click()
  await page.getByRole('tab', { name: 'Discover' }).click()
  await page
    .getByRole('button', { name: 'Save Where your coffee begins', exact: true })
    .click()
  let dialog = page.getByRole('dialog')
  await dialog
    .getByRole('checkbox', { name: 'Coffee rituals', exact: true })
    .uncheck()
  await expect(
    dialog.getByRole('button', { name: 'Save item', exact: true }),
  ).toBeDisabled()
  await dialog
    .getByRole('checkbox', { name: 'Alaska, someday', exact: true })
    .check()
  await dialog.getByRole('button', { name: 'Save item', exact: true }).click()
  await page.getByRole('tab', { name: 'Discover' }).click()
  await expect(
    page.getByRole('button', {
      name: 'Save Where your coffee begins',
      exact: true,
    }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Save Where your coffee begins', exact: true })
    .click()
  dialog = page.getByRole('dialog')
  await dialog
    .getByRole('checkbox', { name: 'Artists to remember', exact: true })
    .check()
  await dialog
    .getByRole('button', { name: 'Save item to 2 collections', exact: true })
    .click()
  await page.getByRole('tab', { name: 'Discover' }).click()
  await expect(
    page.getByRole('button', {
      name: 'Save Where your coffee begins',
      exact: true,
    }),
  ).toHaveCount(0)
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('rabbit-hole.library.v1') ?? '{}'),
  )
  expect(
    saved.items.filter((item: { id: string }) => item.id === 'discover-coffee'),
  ).toHaveLength(1)
  expect(
    saved.saved.filter(
      (membership: { itemId: string }) =>
        membership.itemId === 'discover-coffee',
    ),
  ).toHaveLength(3)
})

test('not relevant and dislike are distinct feedback scoped to the current collection', async ({
  page,
}) => {
  await page.getByRole('button', { name: /Coffee rituals/ }).click()
  await page.getByRole('tab', { name: 'Discover' }).click()
  await page
    .getByRole('button', {
      name: 'Not relevant: Where your coffee begins',
      exact: true,
    })
    .click()
  await page
    .getByRole('button', { name: 'Dislike: A cup worth keeping', exact: true })
    .click()
  await expect(
    page.getByRole('button', {
      name: 'Save Where your coffee begins',
      exact: true,
    }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Save A cup worth keeping', exact: true }),
  ).toHaveCount(0)
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('rabbit-hole.library.v1') ?? '{}'),
  )
  expect(saved.feedback).toEqual([
    { collectionId: 'coffee', itemId: 'discover-coffee', kind: 'irrelevant' },
    { collectionId: 'coffee', itemId: 'discover-ceramics', kind: 'dislike' },
  ])
  await page
    .getByRole('button', { name: 'Rabbit Hole home', exact: true })
    .click()
  await page.getByRole('button', { name: /Alaska, someday/ }).click()
  await page.getByRole('tab', { name: 'Discover' }).click()
  await expect(
    page.getByRole('button', { name: 'Save The long way around', exact: true }),
  ).toBeVisible()
})

test('location and calendar views appear when a collection contains relevant items', async ({
  page,
}) => {
  await page.getByRole('button', { name: /Coffee rituals/ }).click()
  await page.getByRole('button', { name: 'Map view', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Your places, gathered' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /A coffee stop in Anchorage/ }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Rabbit Hole home', exact: true })
    .click()
  await page.getByRole('button', { name: /Artists to remember/ }).click()
  await expect(
    page.getByRole('button', { name: 'Map view', exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Calendar view', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('tab', { name: 'Create' }).click()
  await page.getByRole('button', { name: /^Event\b/ }).click()
  await page.getByLabel('Title', { exact: true }).fill('Museum opening')
  await page.getByLabel(/^Date/).fill('2027-03-05')
  await page.getByRole('button', { name: 'Save item', exact: true }).click()
  await page.getByRole('button', { name: 'Calendar view', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Museum opening' }),
  ).toBeVisible()
  await expect(page.getByText('March 5, 2027', { exact: true })).toBeVisible()
})
