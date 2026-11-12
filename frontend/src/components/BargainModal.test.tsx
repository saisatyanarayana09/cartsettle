import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import BargainModal from "./BargainModal";
import api from "../services/api";

vi.mock("../services/api", () => ({
  default: {
    post: vi.fn(),
  },
}));

afterEach(cleanup);

describe("BargainModal (Minimal UI)", () => {
  const sampleProduct = {
    id: 1,
    name: "Fresh Whole Milk",
    price: 60,
  };

  it("renders ultra-minimalist header, product row, and offer selector with no robotic text", () => {
    render(<BargainModal isOpen={true} onClose={vi.fn()} product={sampleProduct} />);

    expect(screen.getByText("Make an Offer")).toBeDefined();
    expect(screen.getByText("Fresh Whole Milk")).toBeDefined();
    expect(screen.getByText("₹60.00")).toBeDefined();
    expect(screen.getByText("Your Offer")).toBeDefined();
    // Default 10% off on 60 = 54
    expect(screen.getByText("₹54")).toBeDefined();
    expect(screen.getByRole("button", { name: "-10%" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Send Offer" })).toBeDefined();

    // Verify ZERO robotic fluff / AI jargon
    expect(screen.queryByText(/Autonomous Margin Guard/i)).toBeNull();
    expect(screen.queryByText(/safety floor/i)).toBeNull();
    expect(screen.queryByText(/Agentic Commerce/i)).toBeNull();
    expect(screen.queryByText(/algorithmically defending/i)).toBeNull();
  });

  it("updates offer amount when tapping discount pills", () => {
    render(<BargainModal isOpen={true} onClose={vi.fn()} product={sampleProduct} />);

    fireEvent.click(screen.getByRole("button", { name: "-20%" }));
    // 20% off on 60 = 48
    expect(screen.getByText("₹48")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "-5%" }));
    // 5% off on 60 = 57
    expect(screen.getByText("₹57")).toBeDefined();
  });

  it("evaluates offer and shows clean accepted badge and accept button", async () => {
    const onDiscountApplied = vi.fn();
    api.post.mockResolvedValueOnce({
      data: {
        result: {
          status: "APPROVED",
          final_price: 54,
          savings: 6,
          deal_token: "mock-deal-token",
        },
      },
    });

    render(
      <BargainModal
        isOpen={true}
        onClose={vi.fn()}
        product={sampleProduct}
        onDiscountApplied={onDiscountApplied}
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send Offer" }));
    });

    expect(screen.getByText("Offer Accepted")).toBeDefined();
    expect(screen.getByText("Save ₹6.00")).toBeDefined();
    expect(screen.getByRole("button", { name: /Accept ₹54.00/i })).toBeDefined();
  });

  it("updates offer amount when typing a custom discount percentage", () => {
    render(<BargainModal isOpen={true} onClose={vi.fn()} product={sampleProduct} />);

    const customInput = screen.getByPlaceholderText("e.g. 12");
    fireEvent.change(customInput, { target: { value: "25" } });
    // 25% off 60 = 45
    expect(screen.getByText("₹45")).toBeDefined();

    fireEvent.change(customInput, { target: { value: "15" } });
    // 15% off 60 = 51
    expect(screen.getByText("₹51")).toBeDefined();
  });
});
