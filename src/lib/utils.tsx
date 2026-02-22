 // src/lib/utils.ts

export const formatMoney = (amount: number) => {
  // Ensures format like 1,000.00 or 10,000.00
  return amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};