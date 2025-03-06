import React, { useEffect, useState } from 'react';

interface ValidationRule {
  custom?: (value: string | boolean | number) => string | undefined;
  length?: [min: number, max: number];
  format?: [regexPattern: string, errorMsg: string];
  required?: boolean;
}
type FormValue = string | boolean | number;
function useForm<T extends { [K in keyof T]: FormValue }>(
  initialValues: T,
  validationRules?: Partial<Record<keyof T, ValidationRule>>,
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    const hasErrors = Object.values(errors).some((error) => !!error);
    setHasErrors(hasErrors);
  }, [errors]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target as unknown as {
      name: keyof T;
      value: FormValue;
    };

    setValues((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));

    if (validationRules?.[name]) {
      validateField(name, value);
    }
  };

  const validateField = (
    fieldName: keyof T,
    value: string | boolean | number,
  ) => {
    const rules = validationRules![fieldName];
    let error = '';
    if (typeof value !== 'string') return;
    if (rules) {
      if (rules.required) {
        if (!value) {
          error = 'Required';
        }
      }
      if (rules.length) {
        const [min, max] = rules.length;
        if (value.length < min || value.length > max) {
          error = `Must be between ${min} and ${max} characters`;
        }
      }

      if (!error && rules.format) {
        const [pattern, errorMsg] = rules.format;
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          error = errorMsg || 'Invalid format';
        }
      }

      if (!error && typeof rules.custom === 'function') {
        const customError = rules.custom(value);
        if (customError) {
          error = customError;
        }
      }
    }

    setErrors((prevErrors) => ({
      ...prevErrors,
      [fieldName]: error,
    }));
    return Boolean(error);
  };

  const checkErrors = () => {
    const errSignals: boolean[] = [];
    Object.keys(values).forEach((key) => {
      // @ts-ignore
      errSignals.push(validateField(key, values[key]));
    });

    return errSignals.some((signal) => signal);
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
  };

  return {
    values,
    errors,
    handleChange,
    resetForm,
    hasErrors,
    checkErrors,
  };
}

export default useForm;
