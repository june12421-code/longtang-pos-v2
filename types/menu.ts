export interface MenuItem {
  id: number;
  name: string;
  price: number;

  imageUrl?: string;
  category?: string;
  available?: boolean;
  sortOrder?: number;

  allowedOrderTypes?: {
    shabu: boolean;
    dry: boolean;
    fried: boolean;
  };
}