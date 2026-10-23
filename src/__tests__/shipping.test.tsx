import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FREE_SHIPPING_THRESHOLD,
  ShippingProgress,
  shippingProgress,
} from "../components/ShippingProgress";
import { CartDrawer } from "../components/CartDrawer";
import { products } from "../data/products";
import App from "../App";

describe("free shipping", () => {
  it("uses the canonical threshold and clamps progress", () => {
    expect(FREE_SHIPPING_THRESHOLD).toBe(200);
    expect(shippingProgress(-10)).toBe(0);
    expect(shippingProgress(0)).toBe(0);
    expect(shippingProgress(64)).toBeCloseTo((64 / 200) * 100);
    expect(shippingProgress(100)).toBe(50);
    expect(shippingProgress(200)).toBe(100);
    expect(shippingProgress(250)).toBe(100);
  });

  it.each([
    [-10, "$210.00 away"],
    [0, "$200.00 away"],
    [32, "$168.00 away"],
    [199.99, "$0.01 away"],
  ])("shows the remaining amount for subtotal %s", (subtotal, message) => {
    render(<ShippingProgress subtotal={subtotal} />);
    expect(screen.getByRole("status")).toHaveTextContent(message);
  });

  it("qualifies exactly at the threshold and remains unlocked above it", () => {
    const view = render(<ShippingProgress subtotal={200} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You unlocked free shipping",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");

    view.rerender(<ShippingProgress subtotal={250} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You unlocked free shipping",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");
  });

  it("integrates with the actual cart subtotal", () => {
    render(
      <CartDrawer
        items={[
          {
            product: products[0],
            size: "M",
            color: products[0].colors[0],
            quantity: 2,
          },
        ]}
        onClose={() => {}}
        onQuantity={() => {}}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "$136.00 away from free shipping.",
    );
    expect(screen.getAllByText("$64.00")).toHaveLength(2);
  });

  it("uses the shared threshold in customer-facing offer copy", () => {
    render(<App />);

    expect(
      screen.getByText(/Free shipping on orders \$200\+/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Free shipping over \$200/)).toBeInTheDocument();
    expect(
      screen.queryByText(/Free shipping on orders \$190\+/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Free shipping over \$190/),
    ).not.toBeInTheDocument();
  });
});

it("returns to the full remaining amount after an unlocked subtotal becomes empty", () => {
  const view = render(<ShippingProgress subtotal={200} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "You unlocked free shipping!",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");

  view.rerender(<ShippingProgress subtotal={0} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "You're $200.00 away from free shipping.",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  expect(
    screen.queryByText("You unlocked free shipping!"),
  ).not.toBeInTheDocument();
});
