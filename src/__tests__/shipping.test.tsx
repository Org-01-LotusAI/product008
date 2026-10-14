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
    expect(FREE_SHIPPING_THRESHOLD).toBe(399);
    expect(shippingProgress(-10)).toBe(0);
    expect(shippingProgress(0)).toBe(0);
    expect(shippingProgress(64)).toBeCloseTo((64 / 399) * 100);
    expect(shippingProgress(97)).toBeCloseTo((97 / 399) * 100);
    expect(shippingProgress(199.5)).toBeCloseTo(50);
    expect(shippingProgress(399)).toBe(100);
    expect(shippingProgress(500)).toBe(100);
  });

  it.each([
    [0, "$399.00 away"],
    [32, "$367.00 away"],
    [398.99, "$0.01 away"],
  ])("shows the remaining amount for subtotal %s", (subtotal, message) => {
    render(<ShippingProgress subtotal={subtotal} />);
    expect(screen.getByRole("status")).toHaveTextContent(message);
  });

  it("qualifies exactly at the threshold and remains unlocked above it", () => {
    const view = render(<ShippingProgress subtotal={399} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You unlocked free shipping",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");

    view.rerender(<ShippingProgress subtotal={500} />);
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
      "$335.00 away from free shipping.",
    );
    expect(screen.getAllByText("$64.00")).toHaveLength(2);
  });

  it("keeps customer-facing shipping copy consistent with the shared threshold", () => {
    render(<App />);
    expect(
      screen.getByText("Free shipping on orders $399+", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText("Free shipping over $399")).toBeInTheDocument();
    expect(screen.queryByText(/\$194/)).not.toBeInTheDocument();
  });
});

it("returns to the full remaining amount after an unlocked subtotal becomes empty", () => {
  const view = render(<ShippingProgress subtotal={399} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "You unlocked free shipping!",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");

  view.rerender(<ShippingProgress subtotal={0} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "You're $399.00 away from free shipping.",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  expect(
    screen.queryByText("You unlocked free shipping!"),
  ).not.toBeInTheDocument();
});
