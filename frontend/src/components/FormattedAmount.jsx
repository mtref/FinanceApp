import React from "react";

// Component to format numbers with different styles for integer and decimal parts.
const FormattedAmount = ({
  value,
  mainSize = "text-lg",
  decimalSize = "text-base",
}) => {
  const num = Number(value) || 0;
  const isNegative = num < 0;
  const absValue = Math.abs(num);

  const [integerPart, decimalPart] = absValue.toFixed(3).split(".");

  return (
    <span className="inline-flex items-baseline leading-none" dir="ltr">
      {isNegative && <span className={mainSize}>-</span>}
      <span className={mainSize}>{integerPart}</span>
      <span className={`${decimalSize} opacity-70`}>.{decimalPart}</span>
    </span>
  );
};

export default FormattedAmount;
