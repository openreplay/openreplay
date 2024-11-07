import { gcd } from "mathjs";

export const convertRatioToFraction = (decimalRatio: number) => {
  const denominator = 100;
  const numerator = decimalRatio * denominator;
  const gcdValue = gcd(Math.round(numerator), denominator);
  const simplifiedNumerator = Math.round(numerator) / gcdValue;
  const simplifiedDenominator = denominator / gcdValue;

  return `${simplifiedNumerator}:${simplifiedDenominator}`;
};
