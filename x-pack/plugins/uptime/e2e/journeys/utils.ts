/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Page } from '@elastic/synthetics';

export async function waitForLoadingToFinish({ page }: { page: Page }) {
  while (true) {
    if ((await page.$(byTestId('kbnLoadingMessage'))) === null) break;
    await page.waitForTimeout(5 * 1000);
  }
}

export async function loginToKibana({ page }: { page: Page }) {
  await page.fill('[data-test-subj=loginUsername]', 'elastic', {
    timeout: 60 * 1000,
  });
  await page.fill('[data-test-subj=loginPassword]', 'changeme');

  await page.click('[data-test-subj=loginSubmit]');

  await waitForLoadingToFinish({ page });
}

export const byTestId = (testId: string) => {
  return `[data-test-subj=${testId}]`;
};

export const assertText = async ({ page, text }: { page: Page; text: string }) => {
  await page.waitForSelector(`text=${text}`);
  expect(await page.$(`text=${text}`)).toBeTruthy();
};
