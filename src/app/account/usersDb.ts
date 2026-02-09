// Bază de date temporară în memorie pentru utilizatori și comenzi
export type User = {
  id: number;
  email: string;
  password: string;
  name: string;
  orders: Order[];
  blocked?: boolean;
};
export function getAllUsers() {
  return users;
}

export function setUserBlocked(userId: number, blocked: boolean) {
  const user = users.find(u => u.id === userId);
  if (user) user.blocked = blocked;
  return user;
}

export function resetUserPassword(userId: number, newPassword: string) {
  const user = users.find(u => u.id === userId);
  if (user) user.password = newPassword;
  return user;
}

export type Order = {
  id: number;
  date: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  total: number;
  invoiceUrl?: string;
};

let users: User[] = [];

export function findUserByEmail(email: string) {
  return users.find(u => u.email === email);
}

export function addUser(user: Omit<User, "id" | "orders">) {
  const newUser: User = { ...user, id: Date.now(), orders: [] };
  users.push(newUser);
  return newUser;
}

export function validateUser(email: string, password: string) {
  const user = users.find(u => u.email === email && u.password === password);
  return user || null;
}

export function addOrderToUser(userId: number, order: Omit<Order, "id">) {
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  const newOrder: Order = { ...order, id: Date.now() };
  user.orders.push(newOrder);
  return newOrder;
}

export function getUserOrders(userId: number) {
  const user = users.find(u => u.id === userId);
  return user ? user.orders : [];
}

export function getAllOrders() {
  return users.flatMap(u => u.orders.map(o => ({ ...o, user: { id: u.id, name: u.name, email: u.email } })));
}
