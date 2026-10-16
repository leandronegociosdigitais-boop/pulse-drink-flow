import { describe, expect, it } from "vitest";
import { availableSaleStock, originalSaleProduct } from "@/lib/saleEditing";

describe("edição de venda pendente", () => {
  it("permite reduzir uma venda de 8 para 7 e aumentar para 10 com 2 unidades livres", () => {
    const max = availableSaleStock(2, 8);
    expect(7 <= max).toBe(true);
    expect(10 <= max).toBe(true);
    expect(11 <= max).toBe(false);
  });
  it("preserva o preço negociado sem modificar o cadastro do produto", () => {
    const product = { id: "produto", sale_price: 15 };
    expect(originalSaleProduct(product, 10).sale_price).toBe(10);
    expect(product.sale_price).toBe(15);
  });
});
