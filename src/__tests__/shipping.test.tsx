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
    expect(FREE_SHIPPING_THRESHOLD).toBe(1099);
    expect(shippingProgress(-10)).toBe(0);
    expect(shippingProgress(0)).toBe(0);
    expect(shippingProgress(64)).toBeCloseTo((64 / 1099) * 100);
    expect(shippingProgress(549.5)).toBeCloseTo(50);
    expect(shippingProgress(1099)).toBe(100);
    expect(shippingProgress(1500)).toBe(100);
  });

  it.each([
    [32, "$1067.00 away"],
    [64, "$1035.00 away"],
    [1098.99, "$0.01 away"],
  ])("shows the remaining amount for subtotal %s", (subtotal, message) => {
    render(<ShippingProgress subtotal={subtotal} />);
    expect(screen.getByRole("status")).toHaveTextContent(message);
  });

  it("reports zero progress for an empty subtotal", () => {
    render(<ShippingProgress subtotal={0} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You're $1099.00 away from free shipping.",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  });

  it("qualifies exactly at the threshold and remains unlocked above it", () => {
    const view = render(<ShippingProgress subtotal={1099} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "You unlocked free shipping",
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");

    view.rerender(<ShippingProgress subtotal={1500} />);
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
      "$1035.00 away from free shipping.",
    );
    expect(screen.getAllByText("$64.00")).toHaveLength(2);
  });
});

it("returns to the full remaining amount after an unlocked subtotal becomes empty", () => {
  const view = render(<ShippingProgress subtotal={1099} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "You unlocked free shipping!",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "100");

  view.rerender(<ShippingProgress subtotal={0} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "You're $1099.00 away from free shipping.",
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  expect(
    screen.queryByText("You unlocked free shipping!"),
  ).not.toBeInTheDocument();
});
