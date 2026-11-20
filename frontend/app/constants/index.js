export { default as countries } from './countries';
export { default as alertConditions } from './alertConditions';
export { default as alertMetrics } from './alertMetrics';
export { default as platformOptions } from './platformOptions';
export { default } from './filterOptions';
export const ENTERPRISE_REQUEIRED = (t) =>
  t('This feature requires an enterprise license.');
export const PASSWORD_POLICY = (t) =>
  t(
    'The password should have a minimum length of 8 characters and include at least one uppercase letter, one lowercase letter, one digit, and one special character.',
  );
