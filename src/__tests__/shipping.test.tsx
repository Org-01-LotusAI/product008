import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  FREE_SHIPPING_THRESHOLD,
  ShippingProgress,
  shippingProgress,
} from "../components/ShippingProgress";
import { CartDrawer } from "../components/CartDrawer";
import { products } from "../data/products";

describe("free shipping", () => {
  it("uses the canonical threshold and clamps progress", () => {
    expect(FREE_SHIPPING_THRESHOLD).toBe(391);
    expect(shippingProgress(-10)).toBe(0);
    expect(shippingProgress(0)).toBe(0);
    expect(shippingProgress(64)).toBeCloseTo((64 / 391) * 100);
    expect(shippingProgress(195.5)).toBeCloseTo(50);
    expect(shippingProgress(391)).toBe(100);
    expect(shippingProgress(500)).toBe(100);
  });

  it.each([
    [0, "$391.00 away"],
    [64, "$327.00 away"],
    [390.99, "$0.01 away"],
  ])("shows the remaining amount for subtotal %s", (subtotal, message) => {
    render(<ShippingProgress subtotal={subtotal} />);
    expect(screen.getByRole("status")).toHaveTextContent(message);
  });

  it("qualifies exactly at the threshold and remains unlocked above it", () => {
    const view = render(<ShippingProgress subtotal={391} />);
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
      "$327.00 away from free shipping.",
    );
    expect(screen.getAllByText("$64.00")).toHaveLength(2);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "value",
      String((64 / 391) * 100),
    );
  });
});

it("returns to the full remaining amount after an unlocked subtotal becomes empty", () => {
  const view = render(<ShippingProgress subtotal={391} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "You unlocked free shipping!",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");

  view.rerender(<ShippingProgress subtotal={0} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "You're $391.00 away from free shipping.",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  expect(
    screen.queryByText("You unlocked free shipping!"),
  ).not.toBeInTheDocument();
});
