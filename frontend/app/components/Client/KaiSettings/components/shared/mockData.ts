import { RunData, TestCase } from './types';

export const MOCK_TEST_CASES: TestCase[] = [
  {
    key: 'tc-1',
    title: 'Login Flow',
    status: 'approved',
    steps: [
      'Navigate to the login page',
      'Enter the provided credentials',
      'Click the submit button',
      'Verify redirect to dashboard',
      'Check that user avatar and name are displayed in the top-right corner',
      'Ensure no console errors are thrown',
    ],
  },
  {
    key: 'tc-2',
    title: 'Checkout Flow',
    status: 'pending',
    steps: [
      'Add a sample product to cart from the product listing page',
      'Navigate to the cart',
      'Verify item count and total price are correct',
      'Click proceed to checkout',
      'Fill in shipping details',
      'Submit the order',
      'Verify order confirmation page loads with correct summary',
    ],
  },
  {
    key: 'tc-3',
    title: 'Search & Filter',
    status: 'paused',
    steps: [
      'Open the main search bar',
      'Type a product keyword',
      'Verify autocomplete suggestions appear within 500ms',
      'Select a suggestion from the dropdown',
      'Verify results page shows relevant items',
      'Apply a price filter',
      'Confirm results update correctly',
    ],
  },
];

export const MOCK_RUNS: RunData[] = [
  {
    key: '1',
    testName: 'Login Flow',
    date: 1738935120000,
    duration: 2100,
    result: 'passed',
    steps: [
      { step: 'Navigate to the login page', status: 'passed' },
      { step: 'Enter the provided credentials', status: 'passed' },
      { step: 'Click the submit button', status: 'passed' },
      { step: 'Verify redirect to dashboard', status: 'passed' },
      {
        step: 'Check that user avatar and name are displayed',
        status: 'passed',
      },
      { step: 'Ensure no console errors are thrown', status: 'passed' },
    ],
  },
  {
    key: '2',
    testName: 'Checkout Flow',
    date: 1738829700000,
    duration: 5430,
    result: 'failed',
    failedStep: 3,
    steps: [
      {
        step: 'Add a sample product to cart from the product listing page',
        status: 'passed',
      },
      { step: 'Navigate to the cart', status: 'passed' },
      { step: 'Verify item count and total price are correct', status: 'passed' },
      { step: 'Click proceed to checkout', status: 'failed' },
      { step: 'Fill in shipping details', status: 'skipped' },
      { step: 'Submit the order', status: 'skipped' },
      {
        step: 'Verify order confirmation page loads with correct summary',
        status: 'skipped',
      },
    ],
  },
  {
    key: '3',
    testName: 'Search & Filter',
    date: 1738694640000,
    duration: 1800,
    result: 'passed',
    steps: [
      { step: 'Open the main search bar', status: 'passed' },
      { step: 'Type a product keyword', status: 'passed' },
      {
        step: 'Verify autocomplete suggestions appear within 500ms',
        status: 'passed',
      },
      { step: 'Select a suggestion from the dropdown', status: 'passed' },
      { step: 'Verify results page shows relevant items', status: 'passed' },
      { step: 'Apply a price filter', status: 'passed' },
      { step: 'Confirm results update correctly', status: 'passed' },
    ],
  },
  {
    key: '4',
    testName: 'Login Flow',
    date: 1738608240000,
    duration: 3200,
    result: 'failed',
    failedStep: 1,
    steps: [
      { step: 'Navigate to the login page', status: 'passed' },
      { step: 'Enter the provided credentials', status: 'failed' },
      { step: 'Click the submit button', status: 'skipped' },
      { step: 'Verify redirect to dashboard', status: 'skipped' },
      {
        step: 'Check that user avatar and name are displayed',
        status: 'skipped',
      },
      { step: 'Ensure no console errors are thrown', status: 'skipped' },
    ],
  },
];
