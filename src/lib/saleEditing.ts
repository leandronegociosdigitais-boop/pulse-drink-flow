export function availableSaleStock(stock: number, reserved: number) {
  return stock + reserved;
}

export function originalSaleProduct<T extends { sale_price: number }>(product: T, unitPrice: number): T {
  return { ...product, sale_price: unitPrice };
}
