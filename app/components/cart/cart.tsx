import { TrashIcon } from "@phosphor-icons/react";
import {
  CartForm,
  Money,
  type OptimisticCart,
  OptimisticInput,
  useOptimisticCart,
  useOptimisticData,
} from "@shopify/hydrogen";
import type {
  CartLineUpdateInput,
  Cart as CartType,
} from "@shopify/hydrogen/storefront-api-types";
import clsx from "clsx";
import { useRef } from "react";
import useScroll from "react-use/esm/useScroll";
import type { CartApiQueryFragment } from "storefront-api.generated";
import { Button } from "~/components/button";
import { Image } from "~/components/image";
import { Link } from "~/components/link";
import { ScrollArea } from "~/components/scroll-area";
import { RevealUnderline } from "~/reveal-underline";
import { getImageAspectRatio } from "~/utils/image";
import { toggleCartDrawer } from "../layout/cart-drawer";
import { CartBestSellers } from "./cart-best-sellers";

type CartLine = OptimisticCart<CartApiQueryFragment>["lines"]["nodes"][0];
type Layouts = "page" | "drawer";

export function Cart({
  layout,
  onClose,
  cart,
}: {
  layout: Layouts;
  onClose?: () => void;
  cart: CartApiQueryFragment;
}) {
  const optimisticCart = useOptimisticCart<CartApiQueryFragment>(cart);
  const linesCount = Boolean(optimisticCart?.lines?.nodes?.length || 0);
  const cartHasItems = !!cart && cart.totalQuantity > 0;

  if (cartHasItems) {
    return <CartDetails cart={optimisticCart} layout={layout} />;
  }
  return <CartEmpty hidden={linesCount} onClose={onClose} layout={layout} />;
}

function CartDetails({
  layout,
  cart,
}: {
  layout: Layouts;
  cart: OptimisticCart<CartApiQueryFragment>;
}) {
  return (
    <div
      className={clsx(
        layout === "drawer" &&
          "grid grid-cols-1 h-screen-dynamic grid-rows-[1fr_auto] px-4",
        layout === "page" && [
          "pb-12 w-full max-w-(--page-width) mx-auto",
          "grid md:grid-cols-2 lg:grid-cols-3 md:items-start",
          "gap-8 md:gap-8 lg:gap-12",
        ],
      )}
    >
      <CartLines lines={cart?.lines?.nodes} layout={layout} />
      <CartSummary cost={cart.cost} layout={layout}>
        <CartDiscounts discountCodes={cart.discountCodes} />
        <CartCheckoutActions checkoutUrl={cart.checkoutUrl} layout={layout} />
      </CartSummary>
    </div>
  );
}

/**
 * Temporary discount UI
 * @param discountCodes the current discount codes applied to the cart
 * @todo rework when a design is ready
 */
function CartDiscounts({
  discountCodes,
}: {
  discountCodes: CartType["discountCodes"];
}) {
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({ code }) => code) || [];

  return (
    <>
      {/* Have existing discount, display it with a remove option */}
      <dl className={codes && codes.length !== 0 ? "grid" : "hidden"}>
        <div className="flex items-center justify-between font-medium">
          <dt>Discount(s)</dt>
          <div className="flex items-center justify-between">
            <UpdateDiscountForm>
              <button type="button">
                <TrashIcon
                  aria-hidden="true"
                  className="h-[18px] w-[18px] mr-1"
                />
              </button>
            </UpdateDiscountForm>
            <dd>{codes?.join(", ")}</dd>
          </div>
        </div>
      </dl>

      {/* Show an input to apply a discount */}
      <UpdateDiscountForm discountCodes={codes}>
        <div className="flex items-center gap-3">
          <input
            className="p-3 border border-line rounded-none leading-tight! grow"
            type="text"
            name="discountCode"
            placeholder="Discount code"
          />
          <Button variant="outline" className="leading-tight!">
            Apply
          </Button>
        </div>
      </UpdateDiscountForm>
    </>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {children}
    </CartForm>
  );
}

function CartLines({
  layout = "drawer",
  lines: cartLines,
}: {
  layout: Layouts;
  lines: CartLine[];
}) {
  const currentLines = cartLines;
  const scrollRef = useRef(null);
  const { y } = useScroll(scrollRef);

  return (
    <div
      ref={scrollRef}
      className={clsx([
        "-mx-4 pb-4",
        y > 0 ? "border-t border-line-subtle" : "",
        layout === "page" && "grow md:translate-y-4 lg:col-span-2",
        layout === "drawer" && "transition",
      ])}
    >
      <ScrollArea
        className={clsx(layout === "drawer" && "max-h-[calc(100vh-312px)]")}
        size="sm"
      >
        <ul
          className={clsx(
            "px-4 grid",
            layout === "page" && "gap-9",
            layout === "drawer" && "gap-5",
          )}
        >
          {currentLines.map((line) => (
            <CartLineItem key={line.id} line={line} layout={layout} />
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}

function CartCheckoutActions({
  checkoutUrl,
  layout,
}: {
  checkoutUrl: string;
  layout: Layouts;
}) {
  if (!checkoutUrl) return null;

  return (
    <div className="flex flex-col gap-3">
      <a href={checkoutUrl} target="_self">
        <Button className="w-full">Continue to Checkout</Button>
      </a>
      {/* @todo: <CartShopPayButton cart={cart} /> */}
      {layout === "drawer" && (
        <Link variant="underline" to="/cart" className="w-fit mx-auto">
          View cart
        </Link>
      )}
    </div>
  );
}

function CartSummary({
  cost,
  layout,
  children = null,
}: {
  children?: React.ReactNode;
  cost: CartApiQueryFragment["cost"];
  layout: Layouts;
}) {
  return (
    <div
      className={clsx(
        layout === "drawer" && "grid gap-4 border-t border-line-subtle pt-4",
        layout === "page" &&
          "sticky top-(--height-nav) grid gap-6 p-4 md:px-6 md:translate-y-4 rounded-sm w-full",
      )}
    >
      <h2 id="summary-heading" className="sr-only">
        Order summary
      </h2>
      <dl className="grid">
        <div className="flex items-center justify-between font-medium">
          <dt>Subtotal</dt>
          <dd>
            {cost?.subtotalAmount?.amount ? (
              <Money data={cost?.subtotalAmount} />
            ) : (
              "-"
            )}
          </dd>
        </div>
      </dl>
      {children}
    </div>
  );
}

type OptimisticData = {
  action?: string;
  quantity?: number;
};

function CartLineItem({ line, layout }: { line: CartLine; layout: Layouts }) {
  const optimisticData = useOptimisticData<OptimisticData>(line?.id);

  if (!line?.id) return null;

  const { id, quantity, merchandise } = line;

  if (typeof quantity === "undefined" || !merchandise?.product) {
    return null;
  }

  let { image, title, product, selectedOptions } = merchandise;
  let url = `/products/${product.handle}`;
  if (selectedOptions?.length) {
    let params = new URLSearchParams();
    for (const option of selectedOptions) {
      params.append(option.name, option.value);
    }
    url += `?${params.toString()}`;
  }

  return (
    <li
      className="flex gap-4"
      style={{
        // Hide the line item if the optimistic data action is remove
        // Do not remove the form from the DOM
        display: optimisticData?.action === "remove" ? "none" : "flex",
      }}
    >
      <div className="shrink-0">
        {image && (
          <Image
            width={250}
            height={250}
            data={image}
            className="w-24 h-auto"
            alt={title}
            aspectRatio={getImageAspectRatio(image, "adapt")}
          />
        )}
      </div>
      <div className="flex flex-col gap-3 grow">
        <div className="flex justify-between gap-4">
          <div className="space-y-1">
            <div>
              {product?.handle ? (
                <Link to={url} onClick={() => toggleCartDrawer(false)}>
                  <RevealUnderline>{product?.title || ""}</RevealUnderline>
                </Link>
              ) : (
                <p>{product?.title || ""}</p>
              )}
            </div>
            <div className="text-sm text-gray-500 space-y-0.5">{title}</div>
          </div>
          {layout === "drawer" && (
            <ItemRemoveButton lineId={id} className="-mt-1.5 -mr-2" />
          )}
        </div>
        <div
          className={clsx(
            "flex items-center gap-2",
            layout === "drawer" && "justify-between",
          )}
        >
          <CartLineQuantityAdjust line={line} />
          {layout === "page" && <ItemRemoveButton lineId={id} />}
          <CartLinePrice line={line} as="span" />
        </div>
      </div>
    </li>
  );
}

function ItemRemoveButton({
  lineId,
  className,
}: {
  lineId: CartLine["id"];
  className?: string;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{ lineIds: [lineId] }}
    >
      <button
        className={clsx(
          "flex items-center justify-center w-8 h-8 border-none",
          className,
        )}
        type="submit"
      >
        <span className="sr-only">Remove</span>
        <TrashIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      <OptimisticInput id={lineId} data={{ action: "remove" }} />
    </CartForm>
  );
}

function CartLineQuantityAdjust({ line }: { line: CartLine }) {
  const optimisticId = line?.id;
  const optimisticData = useOptimisticData<OptimisticData>(optimisticId);

  if (!line || typeof line?.quantity === "undefined") {
    return null;
  }

  const optimisticQuantity = optimisticData?.quantity || line.quantity;

  const { id: lineId, isOptimistic } = line;
  const prevQuantity = Number(Math.max(0, optimisticQuantity - 1).toFixed(0));
  const nextQuantity = Number((optimisticQuantity + 1).toFixed(0));

  return (
    <>
      <label htmlFor={`quantity-${lineId}`} className="sr-only">
        Quantity, {optimisticQuantity}
      </label>
      <div className="flex items-center border border-line-subtle">
        <UpdateCartButton lines={[{ id: lineId, quantity: prevQuantity }]}>
          <button
            type="submit"
            name="decrease-quantity"
            aria-label="Decrease quantity"
            className="w-9 h-9 transition disabled:text-body-subtle disabled:cursor-not-allowed"
            value={prevQuantity}
            disabled={optimisticQuantity <= 1 || isOptimistic}
          >
            <span>&#8722;</span>
            <OptimisticInput
              id={optimisticId}
              data={{ quantity: prevQuantity }}
            />
          </button>
        </UpdateCartButton>

        <div className="px-2 text-center" data-test="item-quantity">
          {optimisticQuantity}
        </div>

        <UpdateCartButton lines={[{ id: lineId, quantity: nextQuantity }]}>
          <button
            type="submit"
            className="w-9 h-9 transition disabled:text-body-subtle disabled:cursor-not-allowed"
            name="increase-quantity"
            value={nextQuantity}
            aria-label="Increase quantity"
            disabled={isOptimistic}
          >
            <span>&#43;</span>
            <OptimisticInput
              id={optimisticId}
              data={{ quantity: nextQuantity }}
            />
          </button>
        </UpdateCartButton>
      </div>
    </>
  );
}

function UpdateCartButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{
        lines,
      }}
    >
      {children}
    </CartForm>
  );
}

function CartLinePrice({
  line,
  priceType = "regular",
  ...passthroughProps
}: {
  line: CartLine;
  priceType?: "regular" | "compareAt";
  [key: string]: any;
}) {
  if (!line?.cost?.amountPerQuantity || !line?.cost?.totalAmount) return null;

  const moneyV2 =
    priceType === "regular"
      ? line.cost.totalAmount
      : line.cost.compareAtAmountPerQuantity;

  if (moneyV2 == null) {
    return null;
  }

  return (
    <Money
      withoutTrailingZeros
      {...passthroughProps}
      data={moneyV2}
      className="text-sm ml-auto"
    />
  );
}

function CartEmpty({
  hidden = false,
  layout = "drawer",
  onClose,
}: {
  hidden: boolean;
  layout?: Layouts;
  onClose?: () => void;
}) {
  const scrollRef = useRef(null);
  const { y } = useScroll(scrollRef);
  return (
    <div
      ref={scrollRef}
      className={clsx(
        layout === "drawer" && [
          "content-start space-y-12 px-5 pb-5 transition overflow-y-scroll h-screen-dynamic w-[400px]",
          y > 0 ? "border-t" : "",
        ],
        layout === "page" && [
          hidden ? "" : "grid",
          "pb-12 w-full md:items-start gap-4 md:gap-8 lg:gap-12",
        ],
      )}
      hidden={hidden}
    >
      <div className={clsx(layout === "page" && "text-center")}>
        <p className="mb-4">
          Looks like you haven&rsquo;t added anything yet, let&rsquo;s get you
          started!
        </p>
        <Link
          to={layout === "page" ? "/products" : ""}
          className={clsx(layout === "drawer" ? "w-full" : "min-w-48")}
          onClick={onClose}
        >
          Start Shopping
        </Link>
      </div>
      <div className="grid gap-4">
        <CartBestSellers
          count={4}
          heading="Shop Best Sellers"
          layout={layout}
          sortKey="BEST_SELLING"
        />
      </div>
    </div>
  );
}
