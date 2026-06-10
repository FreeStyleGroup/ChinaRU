export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  image?: string;
}

const CART_KEY = 'cart';

export const cartHelper = {
  getCart: (): CartItem[] => {
    if (typeof window === 'undefined') return [];
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
  },

  addItem: (item: CartItem) => {
    const cart = cartHelper.getCart();
    const existing = cart.find(i => i.productId === item.productId);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      cart.push(item);
    }

    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  },

  updateQuantity: (productId: string, quantity: number) => {
    const cart = cartHelper.getCart();
    const item = cart.find(i => i.productId === productId);

    if (item) {
      item.quantity = Math.max(1, quantity);
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    }
  },

  removeItem: (productId: string) => {
    const cart = cartHelper.getCart().filter(i => i.productId !== productId);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  },

  clear: () => {
    localStorage.removeItem(CART_KEY);
  },

  getTotal: () => {
    return cartHelper.getCart().reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getCount: () => {
    return cartHelper.getCart().reduce((sum, item) => sum + item.quantity, 0);
  },
};
