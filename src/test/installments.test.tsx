import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { buildInstallments } from "@/lib/installments";
import { InstallmentFields } from "@/components/InstallmentFields";

describe("parcelas mensais", () => {
  it("divide centavos sem alterar o total", () => {
    const plan = buildInstallments(100, 3, "2027-01-31");
    expect(plan.map(p => p.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(plan.reduce((sum, p) => sum + Math.round(p.amount * 100), 0)).toBe(10000);
  });
  it("mantém o dia original após fevereiro e na virada de ano", () => {
    expect(buildInstallments(100, 3, "2027-01-31").map(p => p.due_date))
      .toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
    expect(buildInstallments(20, 2, "2027-12-15")[1].due_date).toBe("2028-01-15");
    expect(buildInstallments(20, 2, "2028-01-31")[1].due_date).toBe("2028-02-29");
  });
  it.each([0, -1, 1.5, 121, NaN])("recusa quantidade inválida %s", count => {
    expect(() => buildInstallments(100, count, "2027-01-10")).toThrow();
  });
  it("recusa datas inexistentes, valores inválidos e parcelas zeradas", () => {
    expect(() => buildInstallments(100, 2, "2027-02-30")).toThrow();
    expect(() => buildInstallments(NaN, 2, "2027-01-10")).toThrow();
    expect(() => buildInstallments(0.01, 2, "2027-01-10")).toThrow();
  });
  it("mostra vencimentos e valores antes de salvar", () => {
    render(<InstallmentFields total={100} count="3" firstDue="2027-01-31"
      onCountChange={() => {}} onFirstDueChange={() => {}} />);
    expect(screen.getByText("1/3 · 31/01/2027")).toBeInTheDocument();
    expect(screen.getByText("2/3 · 28/02/2027")).toBeInTheDocument();
    expect(screen.getByText("3/3 · 31/03/2027")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantidade de parcelas")).toHaveValue(3);
  });
});
