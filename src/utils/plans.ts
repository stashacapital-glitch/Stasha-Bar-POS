 export type PlanType = 'free' | 'pro' | 'enterprise';

export interface PlanFeatures {
  name: string;
  price: number;
  limits: {
    tables: number;
    staff: number;
  };
}

export const getPlanConfig = (plan: PlanType): PlanFeatures => {
  switch (plan) {
    case 'pro':
      return {
        name: 'Pro',
        price: 20,
        limits: { tables: 20, staff: 10 }
      };
    case 'enterprise':
      return {
        name: 'Enterprise',
        price: 100,
        limits: { tables: 100, staff: 50 }
      };
    default:
      return {
        name: 'Free',
        price: 0,
        limits: { tables: 5, staff: 2 }
      };
  }
};