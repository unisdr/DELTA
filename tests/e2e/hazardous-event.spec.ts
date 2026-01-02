// import { test, expect } from '@playwright/test';
// import { countryAccounts, userCountryAccounts, userTable } from '~/drizzle/schema';
// import { dr, initDB } from '~/db.server';
// import bcrypt from 'bcryptjs';

// test.beforeAll(async () => {
//     initDB();

//     const passwordHash = bcrypt.hashSync('Password123!', 10);

//     const [user] = await dr
//         .insert(userTable)
//         .values({
//             email: 'e2e2@test.com',
//             password: passwordHash,
//             emailVerified: true,
//         })
//         .returning({ id: userTable.id });

//     const [InsertedcountryAccounts] = await dr
//         .insert(countryAccounts)
//         .values({
//             shortDescription: 'description',
//             countryId: 'e34ef71f-0a72-40c4-a6e0-dd19fb26f391',
//             status: 1,
//             type: 'Training',
//         })
//         .returning({ id: countryAccounts.id });

//     await dr.insert(userCountryAccounts).values({
//         userId: user.id,
//         countryAccountsId: InsertedcountryAccounts.id,
//         role: 'admin',
//         isPrimaryAdmin: true,
//     });
// });
// test.afterAll(async () => {
//     await dr.delete(userCountryAccounts);
//     await dr.delete(countryAccounts);
//     await dr.delete(userTable);
// });

// // test.describe('Hazardous event page', () => {
// //     test('should add new hazardous event when filling all required fields', async ({ page }) => {
// //         await page.goto('/login');

// //         await page.fill('input[name="email"]', 'e2e2@test.com');
// //         await page.fill('input[name="password"]', 'Password123!');

// //         // ✅ LOGIN (correctly awaited)
// //         await Promise.all([
// //             page.waitForURL((url) => url.pathname === '/en/hazardous-event'),
// //             page.click('#login-button'),
// //         ]);
// //         console.log('After login URL:', page.url()); // <-- debug

// //         // ✅ Navigate to NEW page
// //         await page.goto('/en/hazardous-event/new', { waitUntil: 'networkidle' });

// //         // ✅ Wait for form to render
// //         console.log('After goto new:', page.url()); // <-- debug
// //         const hipTypeSelect = page.locator('select[name="hipTypeId"]');
// //         await expect(hipTypeSelect).toBeVisible({ timeout: 10000 });
// //         await expect(hipTypeSelect).toBeVisible();
// //         await hipTypeSelect.selectOption('1037');

// //         await page.fill('#startDate', '2025-01-15');
// //         await page.fill('input[name="recordOriginator"]', '1');

// //         // ✅ Submit
// //         await Promise.all([
// //             page.waitForURL(/\/en\/hazardous-event$/),
// //             page.click('#form-default-submit-button'),
// //         ]);

// //         // ✅ Assert record exists
// //         await expect(page.getByText('Biological')).toBeVisible();
// //     });
// // });
// test('should add new hazardous event when filling all required fields', async ({ page }) => {
//     await page.goto('/login');

//     await page.fill('input[name="email"]', 'e2e2@test.com');
//     await page.fill('input[name="password"]', 'Password123!');

//     await Promise.all([
//         page.waitForURL((url) => url.pathname === '/en/hazardous-event'),
//         page.click('#login-button'),
//     ]);

//     console.log('After login URL:', page.url());

//     // Navigate and check for errors
//     await page.click('text=Add new event');
//     await page.waitForURL(/\/en\/hazardous-event\/new$/);

//     // Take screenshot for debugging
//     await page.screenshot({ path: 'debug-new-page.png' });

//     // Check for error messages on page
//     const pageContent = await page.content();
//     console.log('Page has error div:', pageContent.includes('Error'));

//     // Wait for the form element specifically
//     await page.waitForSelector('select[name="hipTypeId"]', {
//         state: 'visible',
//         timeout: 10000,
//     });

//     const hipTypeSelect = page.locator('select[name="hipTypeId"]');
//     await hipTypeSelect.selectOption('1037');

//     await page.fill('#startDate', '2025-01-15');
//     await page.fill('input[name="recordOriginator"]', '1');

//     await Promise.all([
//         page.waitForURL(/\/en\/hazardous-event$/),
//         page.click('#form-default-submit-button'),
//     ]);

//     await expect(page.getByText('Biological')).toBeVisible();
// });
